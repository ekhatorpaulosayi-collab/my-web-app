import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { customerEmail, planCode, subscriptionCode } = await req.json();

    // Get Paystack secret key from environment
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecretKey) {
      throw new Error('PAYSTACK_SECRET_KEY not configured');
    }

    // Get authorization token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from JWT
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    console.log('[VerifySubscription] Checking for user:', user.id, 'email:', customerEmail);

    let subscription;

    // If subscription code is provided, fetch that specific subscription
    if (subscriptionCode) {
      console.log('[VerifySubscription] Fetching specific subscription:', subscriptionCode);

      const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error('[VerifySubscription] Failed to fetch subscription:', data);
        throw new Error(data.message || `Subscription ${subscriptionCode} not found`);
      }

      subscription = data.data;
      console.log('[VerifySubscription] Found subscription:', subscription.subscription_code, 'Status:', subscription.status);

    } else {
      // Fallback: Search for subscription by email and plan code (with pagination)
      console.log('[VerifySubscription] No subscription code provided, searching by email and plan...');

      const response = await fetch(`https://api.paystack.co/subscription?perPage=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok || !data.status) {
        console.error('[VerifySubscription] Failed to fetch subscriptions:', data);
        throw new Error(data.message || 'Failed to fetch subscriptions from Paystack');
      }

      console.log('[VerifySubscription] Found', data.data.length, 'total subscriptions in Paystack');

      // Find ALL subscriptions for this customer and plan (including all statuses)
      const allCustomerSubs = data.data.filter((sub: any) =>
        sub.customer.email.toLowerCase() === customerEmail.toLowerCase() &&
        sub.plan.plan_code === planCode
      );

      console.log('[VerifySubscription] Found', allCustomerSubs.length, 'total subscriptions for this plan (all statuses)');

      // First try to find active/non-renewing subscriptions
      let customerSubs = allCustomerSubs.filter((sub: any) =>
        sub.status === 'active' || sub.status === 'non-renewing'
      );

      console.log('[VerifySubscription] Found', customerSubs.length, 'active/non-renewing subscriptions');

      // Filter for subscriptions that were recently created or updated (within last 5 minutes)
      // This prevents reactivating old subscriptions without new payment
      const recentCutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const recentSubs = customerSubs.filter((sub: any) => {
        const createdAt = new Date(sub.createdAt);
        const updatedAt = sub.updatedAt ? new Date(sub.updatedAt) : createdAt;
        const mostRecent = updatedAt > createdAt ? updatedAt : createdAt;
        return mostRecent > recentCutoff;
      });

      console.log('[VerifySubscription] Found', recentSubs.length, 'recently created/updated subscriptions (last 5 min)');

      // Use recent subscriptions if available, otherwise fall back to all active ones
      if (recentSubs.length > 0) {
        customerSubs = recentSubs;
        console.log('[VerifySubscription] Using recent subscriptions only');
      } else {
        console.log('[VerifySubscription] No recent subscriptions, checking if we should use older ones...');

        // Don't use old subscriptions - they need fresh payment
        customerSubs = [];
      }

      // In test mode, if payment just happened but no active subscription exists,
      // DO NOT automatically reuse old subscriptions - this could give free access!
      if (customerSubs.length === 0 && allCustomerSubs.length > 0) {
        console.log('[VerifySubscription] No active subscriptions, but found existing ones');
        console.log('[VerifySubscription] Existing subscription statuses:', allCustomerSubs.map((s: any) => `${s.subscription_code}: ${s.status}`));

        // DO NOT automatically reactivate - payment verification is required
        console.log('[VerifySubscription] Cannot reactivate old subscriptions without payment verification');

        // Return error to trigger proper payment flow
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Subscription exists but is not active. Please complete payment to reactivate.'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      if (customerSubs.length === 0) {
        // No subscriptions found at all
        console.log('[VerifySubscription] No matching subscriptions found at all');
        console.log('[VerifySubscription] Looking for email:', customerEmail);
        console.log('[VerifySubscription] Looking for plan code:', planCode);
        console.log('[VerifySubscription] Total subscriptions checked:', data.data.length);

        return new Response(
          JSON.stringify({
            success: false,
            error: `No subscription found in Paystack for ${customerEmail} with plan ${planCode}. The payment may still be processing. Please wait a moment and try again.`
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        );
      }

      // Get the most recent one
      subscription = customerSubs.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      console.log('[VerifySubscription] Latest subscription:', subscription.subscription_code);
    }

    // Get tier by plan code
    const { data: tierData, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id, name')
      .or(`paystack_plan_code_monthly.eq.${subscription.plan.plan_code},paystack_plan_code_annual.eq.${subscription.plan.plan_code}`)
      .single();

    if (tierError || !tierData) {
      console.error('[VerifySubscription] Tier not found for plan code:', subscription.plan.plan_code);
      throw new Error('Subscription tier not found');
    }

    const billingCycle = subscription.plan.interval === 'annually' ? 'annual' : 'monthly';

    // Check if subscription already exists with this payment reference
    const { data: existingSub } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('payment_reference', subscription.subscription_code)
      .single();

    let newSub;

    if (existingSub) {
      // Subscription exists - just update it to active
      console.log('[VerifySubscription] Subscription already exists, updating to active');

      const { data: updatedSub, error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
          tier_id: tierData.id,
          status: 'active',
          billing_cycle: billingCycle,
          current_period_start: new Date(subscription.createdAt).toISOString(),
          current_period_end: new Date(subscription.next_payment_date).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSub.id)
        .select()
        .single();

      if (updateError) {
        console.error('[VerifySubscription] Failed to update subscription:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      newSub = updatedSub;
    } else {
      // Delete any old subscriptions first
      await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', user.id);

      console.log('[VerifySubscription] Deleted old subscriptions');

      // Create new subscription
      const { data: createdSub, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: user.id,
          tier_id: tierData.id,
          status: 'active',
          billing_cycle: billingCycle,
          payment_provider: 'paystack',
          payment_reference: subscription.subscription_code,
          current_period_start: new Date(subscription.createdAt).toISOString(),
          current_period_end: new Date(subscription.next_payment_date).toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('[VerifySubscription] Failed to create subscription:', insertError);
        console.error('[VerifySubscription] Insert error details:', JSON.stringify(insertError));
        throw new Error(`Database insert failed: ${insertError.message} (${insertError.code})`);
      }

      newSub = createdSub;
    }

    console.log('[VerifySubscription] ✅ Subscription created:', newSub.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          subscription: newSub,
          paystack_subscription_code: subscription.subscription_code,
          tier_name: tierData.name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[VerifySubscription] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
