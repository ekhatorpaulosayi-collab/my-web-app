import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

Deno.serve(async (req) => {
  try {
    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking existing users and their tiers...');

    // Get all user subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier_id, created_at')
      .order('created_at', { ascending: false });

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return new Response(JSON.stringify({ error: subError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Count users by tier
    const tierBreakdown = subscriptions?.reduce((acc, sub) => {
      acc[sub.tier_id] = (acc[sub.tier_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get users who don't have a subscription record yet
    const { data: allUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('Error fetching users:', usersError);
    }

    const usersWithoutSub = allUsers?.users.filter(user =>
      !subscriptions?.find(sub => sub.user_id === user.id)
    ) || [];

    // Create missing subscriptions
    let createdCount = 0;
    if (usersWithoutSub.length > 0) {
      console.log(`Found ${usersWithoutSub.length} users without subscriptions. Creating them...`);

      for (const user of usersWithoutSub) {
        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: user.id,
            tier_id: 'free',
            billing_cycle: 'monthly',
            status: 'active'
          });

        if (!insertError) {
          createdCount++;
        } else {
          console.error(`Error creating subscription for user ${user.id}:`, insertError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_users: allUsers?.users.length || 0,
        tier_breakdown: tierBreakdown,
        users_without_subscription: usersWithoutSub.length,
        subscriptions_created: createdCount,
        message: createdCount > 0
          ? `Created ${createdCount} FREE tier subscriptions for existing users. They now have unlimited access!`
          : 'All users already have subscriptions with unlimited access.',
        note: 'FREE tier now has: UNLIMITED products, 10 images/product, 10 users, 10K AI chats/month'
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
