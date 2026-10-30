import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { adminCallAllowed } from '../_shared/adminGate.ts';

function refused() {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (!adminCallAllowed(Deno.env.get('STOREHOUSE_ADMIN_SECRET'), req.headers.get('x-storehouse-admin-secret'))) {
    return refused();
  }
  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = (Deno.env.get('EDGE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Execute migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        -- Add specifications column
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

        -- Add index
        CREATE INDEX IF NOT EXISTS idx_products_specifications
        ON products USING gin(specifications);
      `
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Specifications column added successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
