// initiate-marketplace-payment
//
// SESSION 1 STUB ONLY. The marketplace flow (multi-vendor cart, single
// Paystack transaction split across N subaccounts) is NOT implemented in
// Session 1. This function exists so the route is reserved and any premature
// frontend code hitting this endpoint gets a clear 503.
//
// Behavior in later sessions: build the multi-subaccount split using
// Paystack's Subaccount Splits feature. Same fee math as storefront, applied
// per (order, store) line.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ENABLE = Deno.env.get('ENABLE_MARKETPLACE') === 'true';
  if (!ENABLE) {
    return new Response(JSON.stringify({
      error: 'feature_disabled',
      detail: 'ENABLE_MARKETPLACE is off; marketplace flow not yet implemented.',
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Even with the flag on, Session 1 has no implementation.
  return new Response(JSON.stringify({
    error: 'not_implemented',
    detail: 'Marketplace flow is planned for a later session.',
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
