import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
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
        message: 'Cannot execute DDL via REST API. Please run the SQL manually in Supabase Dashboard.',
        instructions: `
1. Go to: https://supabase.com/dashboard/project/yzlniqwzqlsftxrtapdl/sql/new
2. Paste this SQL:

ALTER TABLE products
ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_products_specifications
ON products USING gin(specifications);

3. Click "RUN"
        `,
        error: testError.message
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
