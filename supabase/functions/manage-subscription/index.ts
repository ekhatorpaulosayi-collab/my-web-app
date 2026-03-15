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
    const { action, subscriptionCode, planCode } = await req.json();

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

    console.log(`[ManageSubscription] ${action} for user:`, user.id);

    let result;

    switch (action) {
      case 'cancel':
        // Cancel subscription on Paystack
        result = await cancelPaystackSubscription(paystackSecretKey, subscriptionCode);

        // Update database
        await supabase
          .from('user_subscriptions')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('payment_reference', subscriptionCode);

        break;

      case 'change_plan':
        // Change subscription plan on Paystack
        result = await changePaystackPlan(paystackSecretKey, subscriptionCode, planCode);
        break;

      case 'get_subscription':
        // Get subscription details from Paystack
        result = await getPaystackSubscription(paystackSecretKey, subscriptionCode);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[ManageSubscription] Error:', error);
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

async function cancelPaystackSubscription(secretKey: string, subscriptionCode: string) {
  console.log('[Paystack] Cancelling subscription:', subscriptionCode);

  // First, get the subscription to get the email token
  const getResponse = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const getData = await getResponse.json();

  if (!getResponse.ok || !getData.status) {
    console.error('[Paystack] Failed to get subscription:', getData);
    throw new Error(getData.message || 'Subscription not found');
  }

  const emailToken = getData.data.email_token;
  console.log('[Paystack] Got email token:', emailToken);

  // Now disable the subscription using the email token
  const response = await fetch(`https://api.paystack.co/subscription/disable`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      code: subscriptionCode,
      token: emailToken
    })
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.error('[Paystack] Cancel failed:', data);
    throw new Error(data.message || 'Failed to cancel subscription');
  }

  console.log('[Paystack] Subscription cancelled successfully');
  return data.data;
}

async function changePaystackPlan(secretKey: string, subscriptionCode: string, newPlanCode: string) {
  console.log('[Paystack] Changing plan:', subscriptionCode, 'to', newPlanCode);

  // First, get the subscription to get the subscription ID
  const subscription = await getPaystackSubscription(secretKey, subscriptionCode);

  // Paystack doesn't have a direct "change plan" endpoint
  // We need to cancel the old subscription and create a new one
  // Or use the management link to let user change plan themselves

  return {
    message: 'Plan change initiated',
    subscription_code: subscriptionCode,
    new_plan_code: newPlanCode,
    management_link: `https://paystack.com/manage/subscription/${subscriptionCode}`
  };
}

async function getPaystackSubscription(secretKey: string, subscriptionCode: string) {
  console.log('[Paystack] Fetching subscription:', subscriptionCode);

  const response = await fetch(`https://api.paystack.co/subscription/${subscriptionCode}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();

  if (!response.ok || !data.status) {
    console.error('[Paystack] Fetch failed:', data);
    throw new Error(data.message || 'Failed to fetch subscription');
  }

  return data.data;
}
