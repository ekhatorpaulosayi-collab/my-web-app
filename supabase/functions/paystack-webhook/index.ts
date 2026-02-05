/**
 * Paystack Webhook Handler
 *
 * Receives and processes webhook events from Paystack
 * Events handled:
 * - subscription.create - New subscription created
 * - charge.success - Payment successful
 * - subscription.disable - Subscription cancelled/expired
 * - subscription.not_renew - Subscription set to not renew
 * - charge.failed - Payment failed
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.168.0/crypto/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecretKey) {
      console.error('[Webhook] PAYSTACK_SECRET_KEY not configured')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }

    // 2. Verify Paystack signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('[Webhook] Missing signature')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const body = await req.text()

    // Verify signature using HMAC SHA512
    const hash = await crypto.subtle.digest(
      'SHA-512',
      new TextEncoder().encode(paystackSecretKey + body)
    )
    const computedSignature = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (computedSignature !== signature) {
      console.error('[Webhook] Invalid signature')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // 3. Parse event
    const event = JSON.parse(body)
    console.log('[Webhook] Received event:', event.event)

    // 4. Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 5. Handle different event types
    switch (event.event) {
      case 'subscription.create':
        await handleSubscriptionCreate(supabase, event.data)
        break

      case 'charge.success':
        await handleChargeSuccess(supabase, event.data)
        break

      case 'subscription.disable':
        await handleSubscriptionDisable(supabase, event.data)
        break

      case 'subscription.not_renew':
        await handleSubscriptionNotRenew(supabase, event.data)
        break

      case 'charge.failed':
        await handleChargeFailed(supabase, event.data)
        break

      default:
        console.log('[Webhook] Unhandled event type:', event.event)
    }

    // 6. Return 200 OK to Paystack
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('[Webhook] Error:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

/**
 * Handle subscription creation
 */
async function handleSubscriptionCreate(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.create')

  const { customer, plan, subscription_code, email_token } = data

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .eq('email', customer.email)
    .single()

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email)
    return
  }

  const userId = userData.user_id

  // Get tier by plan code
  const { data: tierData, error: tierError } = await supabase
    .from('subscription_tiers')
    .select('id, name')
    .or(`paystack_plan_code_monthly.eq.${plan.plan_code},paystack_plan_code_annual.eq.${plan.plan_code}`)
    .single()

  if (tierError || !tierData) {
    console.error('[Webhook] Tier not found for plan code:', plan.plan_code)
    return
  }

  const billingCycle = plan.interval === 'annually' ? 'annual' : 'monthly'

  // Update user subscription
  const { data: subData, error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: tierData.id,
      status: 'active',
      billing_cycle: billingCycle,
      payment_provider: 'paystack',
      payment_reference: subscription_code,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(data.next_payment_date).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .select()
    .single()

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', updateError)
    return
  }

  console.log(`[Webhook] Subscription created for user ${userId} - Tier: ${tierData.name}`)

  // Track affiliate sale if user signed up via affiliate link
  await trackAffiliateSale(supabase, userId, customer.email, userData.display_name, subData.id, tierData.name, plan.amount)
}

/**
 * Handle successful charge (payment)
 */
async function handleChargeSuccess(supabase: any, data: any) {
  console.log('[Webhook] Handling charge.success')

  const { customer, amount, reference, authorization, metadata } = data

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single()

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email)
    return
  }

  const userId = userData.user_id

  // Get user's subscription
  const { data: subData } = await supabase
    .from('user_subscriptions')
    .select('id, tier_id, billing_cycle')
    .eq('user_id', userId)
    .single()

  // Record transaction
  const { error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: userId,
      amount: amount / 100, // Convert from kobo to naira
      currency: 'NGN',
      status: 'success',
      payment_provider: 'paystack',
      payment_reference: reference,
      payment_method: authorization.channel,
      authorization_code: authorization.authorization_code,
      subscription_id: subData?.id,
      tier_id: subData?.tier_id,
      billing_cycle: subData?.billing_cycle,
      paystack_response: data,
      customer_email: customer.email,
      customer_code: customer.customer_code,
      completed_at: new Date().toISOString()
    })

  if (txError) {
    console.error('[Webhook] Error recording transaction:', txError)
  }

  // If this is a subscription renewal, extend the period
  if (subData) {
    const periodLength = subData.billing_cycle === 'annual' ? '1 year' : '1 month'

    const { error: renewError } = await supabase
      .from('user_subscriptions')
      .update({
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + (subData.billing_cycle === 'annual' ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000)).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subData.id)

    if (renewError) {
      console.error('[Webhook] Error renewing subscription:', renewError)
    } else {
      console.log(`[Webhook] Subscription renewed for user ${userId}`)
    }
  }

  console.log(`[Webhook] Payment recorded: ₦${amount / 100} for user ${userId}`)
}

/**
 * Handle subscription disable (cancelled or expired)
 */
async function handleSubscriptionDisable(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.disable')

  const { customer, subscription_code } = data

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single()

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email)
    return
  }

  const userId = userData.user_id

  // Get FREE tier
  const { data: freeTier } = await supabase
    .from('subscription_tiers')
    .select('id')
    .eq('name', 'Free')
    .single()

  if (!freeTier) {
    console.error('[Webhook] Free tier not found')
    return
  }

  // Downgrade to FREE tier
  const { error: downgradeError } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: freeTier.id,
      status: 'cancelled',
      billing_cycle: 'monthly',
      payment_reference: null,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (downgradeError) {
    console.error('[Webhook] Error downgrading subscription:', downgradeError)
    return
  }

  console.log(`[Webhook] User ${userId} downgraded to FREE tier`)
}

/**
 * Handle subscription set to not renew
 */
async function handleSubscriptionNotRenew(supabase: any, data: any) {
  console.log('[Webhook] Handling subscription.not_renew')

  const { customer } = data

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single()

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email)
    return
  }

  const userId = userData.user_id

  // Mark subscription as will not renew (keep active until period ends)
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      status: 'cancelled', // Still active but won't renew
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId)

  if (updateError) {
    console.error('[Webhook] Error updating subscription:', updateError)
    return
  }

  console.log(`[Webhook] Subscription set to not renew for user ${userId}`)
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(supabase: any, data: any) {
  console.log('[Webhook] Handling charge.failed')

  const { customer, amount, reference } = data

  // Get user by email
  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('email', customer.email)
    .single()

  if (userError || !userData) {
    console.error('[Webhook] User not found for email:', customer.email)
    return
  }

  const userId = userData.user_id

  // Get user's subscription
  const { data: subData } = await supabase
    .from('user_subscriptions')
    .select('id, tier_id, billing_cycle')
    .eq('user_id', userId)
    .single()

  // Record failed transaction
  const { error: txError } = await supabase
    .from('payment_transactions')
    .insert({
      user_id: userId,
      amount: amount / 100,
      currency: 'NGN',
      status: 'failed',
      payment_provider: 'paystack',
      payment_reference: reference,
      subscription_id: subData?.id,
      tier_id: subData?.tier_id,
      billing_cycle: subData?.billing_cycle,
      paystack_response: data,
      customer_email: customer.email,
      customer_code: customer.customer_code,
      failed_at: new Date().toISOString()
    })

  if (txError) {
    console.error('[Webhook] Error recording failed transaction:', txError)
  }

  console.log(`[Webhook] Payment failed: ₦${amount / 100} for user ${userId}`)

  // Note: In production, you might want to:
  // 1. Send email notification to user
  // 2. Give grace period before downgrading
  // 3. Retry payment after a few days
}

/**
 * Track affiliate sale (30% commission)
 * Called when user upgrades to paid subscription
 */
async function trackAffiliateSale(
  supabase: any,
  userId: string,
  customerEmail: string,
  customerName: string | null,
  subscriptionId: string,
  planName: string,
  amountKobo: number
) {
  try {
    // Check if this customer signed up via affiliate link
    // Look for most recent click that hasn't been converted yet
    const { data: affiliateClick, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('affiliate_id, affiliate_code')
      .eq('customer_id', userId)
      .eq('converted', false)
      .order('clicked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (clickError) {
      console.error('[Webhook] Error checking affiliate click:', clickError)
      return
    }

    if (!affiliateClick) {
      console.log('[Webhook] No affiliate attribution found for user:', userId)
      return
    }

    // Calculate 30% commission
    const commissionKobo = Math.floor(amountKobo * 0.30)

    // Create affiliate sale record
    const { error: saleError } = await supabase
      .from('affiliate_sales')
      .insert({
        affiliate_id: affiliateClick.affiliate_id,
        customer_id: userId,
        customer_email: customerEmail,
        customer_name: customerName,
        subscription_id: subscriptionId,
        plan_name: planName,
        sale_amount_kobo: amountKobo,
        commission_amount_kobo: commissionKobo,
        status: 'pending' // Will be confirmed after 7 days
      })

    if (saleError) {
      console.error('[Webhook] Error creating affiliate sale:', saleError)
      return
    }

    // Update affiliate stats and check for payout unlock
    const { error: statsError } = await supabase.rpc('increment_affiliate_conversion', {
      p_affiliate_id: affiliateClick.affiliate_id,
      p_commission_kobo: commissionKobo
    })

    if (statsError) {
      console.error('[Webhook] Error updating affiliate stats:', statsError)
    } else {
      console.log(`[Webhook] ✅ Affiliate sale tracked: ${affiliateClick.affiliate_code} - ₦${commissionKobo / 100} commission`)
    }
  } catch (error) {
    console.error('[Webhook] Error in trackAffiliateSale:', error)
    // Don't throw - affiliate tracking shouldn't block subscription creation
  }
}
