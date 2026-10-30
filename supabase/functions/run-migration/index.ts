import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminCallAllowed } from '../_shared/adminGate.ts';

serve(async (req) => {
  if (!adminCallAllowed(Deno.env.get('STOREHOUSE_ADMIN_SECRET'), req.headers.get('x-storehouse-admin-secret'))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = (Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running Phase 2A migration: Adding specifications column...');

    // Execute migration using raw SQL
    // Note: We'll use a workaround since direct DDL isn't available via REST API

    // First, check if column already exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('products')
      .select('specifications')
      .limit(1);

    if (testError) {
      // Column doesn't exist - this is expected
      console.log('Column does not exist yet - attempting to create...');

      return new Response(JSON.stringify({
        success: false,
        message: 'This function cannot change the database.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Column exists!
      return new Response(JSON.stringify({
        success: true,
        message: 'Specifications column already exists!',
        data: testData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
