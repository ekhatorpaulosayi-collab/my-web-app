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
    const { reference, planCode } = await req.json();

    if (!reference) {
      throw new Error('Transaction reference is required');
    }

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

    console.log('[VerifyTransaction] Verifying transaction:', reference, 'for user:', user.id);

    // Step 1: Verify the transaction with Paystack
    const verifyResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok || !verifyData.status) {
      console.error('[VerifyTransaction] Failed to verify transaction:', verifyData);
      throw new Error(verifyData.message || 'Failed to verify transaction');
    }

    const transaction = verifyData.data;
    console.log('[VerifyTransaction] Transaction status:', transaction.status);
    console.log('[VerifyTransaction] Transaction amount:', transaction.amount);
    console.log('[VerifyTransaction] Transaction email:', transaction.customer.email);

    // Check if transaction is successful
    if (transaction.status !== 'success') {
      console.log('[VerifyTransaction] Transaction not successful, status:', transaction.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transaction not successful. Please try again.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Check if transaction is recent (within last 10 minutes)
    const transactionDate = new Date(transaction.paid_at || transaction.created_at);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    if (transactionDate < tenMinutesAgo) {
      console.log('[VerifyTransaction] Transaction is too old:', transactionDate);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Transaction is too old. Please make a new payment.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Step 2: Get the subscription details if it exists
    let subscriptionCode = null;
    let subscription = null;

    // Check if transaction has subscription data
    if (transaction.metadata && transaction.metadata.custom_fields) {
      const customFields = transaction.metadata.custom_fields;
      if (Array.isArray(customFields)) {
        const subField = customFields.find((field: any) =>
          field.variable_name === 'subscription_code' ||
          field.display_name === 'Subscription Code'
        );
        if (subField) {
          subscriptionCode = subField.value;
        }
      }
    }

    // If no subscription code in metadata, try to find subscription by customer email
    if (!subscriptionCode) {
      console.log('[VerifyTransaction] No subscription code in transaction, searching by email...');

      const subsResponse = await fetch(`https://api.paystack.co/subscription?perPage=100`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const subsData = await subsResponse.json();

      if (subsResponse.ok && subsData.status) {
        // Find the most recent subscription for this customer and plan
        const customerEmail = transaction.customer.email;
        const recentSubs = subsData.data
          .filter((sub: any) =>
            sub.customer.email.toLowerCase() === customerEmail.toLowerCase() &&
            (planCode ? sub.plan.plan_code === planCode : true)
          )
          .sort((a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

        if (recentSubs.length > 0) {
          subscription = recentSubs[0];
          subscriptionCode = subscription.subscription_code;
          console.log('[VerifyTransaction] Found subscription:', subscriptionCode);
        }
      }
    } else {
      // Fetch the specific subscription
      const subResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (subResponse.ok) {
        const subData = await subResponse.json();
        if (subData.status) {
          subscription = subData.data;
        }
      }
    }

    // Step 3: Create or update subscription in database
    const planCodeToUse = subscription ? subscription.plan.plan_code : (planCode || transaction.metadata?.plan_code);

    if (!planCodeToUse) {
      throw new Error('Could not determine plan code from transaction');
    }

    // Get tier by plan code
    const { data: tierData, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id, name')
      .or(`paystack_plan_code_monthly.eq.${planCodeToUse},paystack_plan_code_annual.eq.${planCodeToUse}`)
      .single();

    if (tierError || !tierData) {
      console.error('[VerifyTransaction] Tier not found for plan code:', planCodeToUse);
      throw new Error('Subscription tier not found');
    }

    // Determine billing cycle
    const billingCycle = subscription
      ? (subscription.plan.interval === 'annually' ? 'annual' : 'monthly')
      : 'monthly';

    // Calculate period end (30 days for monthly, 365 for annual)
    const periodStart = new Date();
    const periodEnd = new Date();
    if (billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Delete any existing subscriptions
    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', user.id);

    // Create new subscription
    const { data: newSub, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: user.id,
        tier_id: tierData.id,
        status: 'active',
        billing_cycle: billingCycle,
        payment_provider: 'paystack',
        payment_reference: subscriptionCode || reference, // Use subscription code if available, else transaction ref
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('[VerifyTransaction] Failed to create subscription:', insertError);
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    console.log('[VerifyTransaction] ✅ Subscription created from verified transaction:', newSub.id);
    console.log('[VerifyTransaction] Transaction reference:', reference);
    console.log('[VerifyTransaction] Tier:', tierData.name);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          subscription: newSub,
          tier_name: tierData.name,
          transaction_reference: reference,
          subscription_code: subscriptionCode
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[VerifyTransaction] Error:', error);
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