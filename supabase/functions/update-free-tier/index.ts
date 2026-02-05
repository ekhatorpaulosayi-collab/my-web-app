import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

Deno.serve(async (req) => {
  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating FREE tier to unlimited...');

    // Update FREE tier to unlimited
    const { data, error } = await supabase
      .from('subscription_tiers')
      .update({
        max_products: null,              // NULL = unlimited products
        max_images_per_product: 10,      // 10 images per product (up from 1)
        max_users: 10,                   // 10 users (up from 1)
        max_ai_chats_monthly: 10000,     // 10,000 AI chats per month (up from 50)
        has_product_variants: true,      // Enable variants
        has_debt_tracking: true,         // Enable debt tracking
        has_invoicing: true,             // Enable invoicing
        has_recurring_invoices: true,    // Enable recurring invoices
        has_profit_analytics: true,      // Enable profit analytics
        has_advanced_analytics: true,    // Enable advanced analytics
        has_whatsapp_ai: true,           // Enable WhatsApp AI
        has_export_data: true,           // Enable data export
        has_store_customization: true,   // Enable store customization
        updated_at: new Date().toISOString()
      })
      .eq('id', 'free')
      .select();

    if (error) {
      console.error('Error updating tier:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('FREE tier updated successfully:', data);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FREE tier updated to unlimited access',
        updated_tier: data
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});
