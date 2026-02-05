import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

Deno.serve(async (req) => {
  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking current tier limits...');

    // Get all tiers
    const { data: tiers, error: tiersError } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('display_order', { ascending: true });

    if (tiersError) {
      console.error('Error fetching tiers:', tiersError);
      return new Response(JSON.stringify({ error: tiersError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get count of users on each tier
    const { data: userCounts, error: countsError } = await supabase
      .from('user_subscriptions')
      .select('tier_id');

    if (countsError) {
      console.error('Error fetching user counts:', countsError);
    }

    // Count users per tier
    const tierCounts = userCounts?.reduce((acc, sub) => {
      acc[sub.tier_id] = (acc[sub.tier_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const tiersWithCounts = tiers?.map(tier => ({
      id: tier.id,
      name: tier.name,
      max_products: tier.max_products === null ? 'UNLIMITED' : tier.max_products,
      max_images_per_product: tier.max_images_per_product,
      max_users: tier.max_users,
      max_ai_chats_monthly: tier.max_ai_chats_monthly,
      has_product_variants: tier.has_product_variants,
      has_debt_tracking: tier.has_debt_tracking,
      has_invoicing: tier.has_invoicing,
      has_whatsapp_ai: tier.has_whatsapp_ai,
      has_export_data: tier.has_export_data,
      is_active: tier.is_active,
      total_users_on_tier: tierCounts[tier.id] || 0,
      updated_at: tier.updated_at
    }));

    return new Response(
      JSON.stringify({
        success: true,
        tiers: tiersWithCounts,
        total_users: userCounts?.length || 0
      }, null, 2),
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
