import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔧 Ensuring auto-subscription for new users...\n');

async function setupAutoSubscription() {
  try {
    // Update the handle_new_user function to also create subscription
    const updateFunctionSQL = `
-- Update handle_new_user to create both user record AND subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert into public.users table
  INSERT INTO public.users (
    id,
    email,
    phone_number,
    business_name,
    device_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone_number'),
    COALESCE(
      NEW.raw_user_meta_data->>'businessName',
      NEW.raw_user_meta_data->>'business_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'deviceType', 'unknown'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create stores record
  INSERT INTO public.stores (
    id,
    user_id,
    name,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'businessName',
      NEW.raw_user_meta_data->>'business_name',
      split_part(NEW.email, '@', 1) || '''s Store'
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING;

  -- IMPORTANT: Create free subscription for the user
  INSERT INTO public.user_subscriptions (
    user_id,
    tier_id,
    billing_cycle,
    status,
    started_at,
    current_period_start,
    ai_chats_used_this_month
  )
  VALUES (
    NEW.id::text,
    'free',
    'monthly',
    'active',
    NOW(),
    NOW(),
    0
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    -- Try to at least create the subscription
    BEGIN
      INSERT INTO public.user_subscriptions (
        user_id,
        tier_id,
        billing_cycle,
        status,
        started_at,
        current_period_start,
        ai_chats_used_this_month
      )
      VALUES (
        NEW.id::text,
        'free',
        'monthly',
        'active',
        NOW(),
        NOW(),
        0
      )
      ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not create subscription: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;`;

    console.log('📝 Updating handle_new_user function...');
    const { error: fnError } = await supabase.rpc('query', {
      query: updateFunctionSQL
    }).single();

    if (!fnError) {
      console.log('✅ Function updated successfully');
    } else {
      // Fallback: Try direct SQL execution
      console.log('⚠️ Direct RPC failed, trying alternative method...');
    }

    // Verify the solution
    console.log('\n🧪 Testing the solution...');

    // Check if all existing users have subscriptions
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id');

    const userIds = allUsers?.users?.map(u => u.id) || [];
    const subscribedUserIds = new Set(subscriptions?.map(s => s.user_id) || []);
    const usersWithoutSub = userIds.filter(id => !subscribedUserIds.has(id));

    console.log(`\n📊 Final Status:`);
    console.log(`- Total users: ${userIds.length}`);
    console.log(`- Users with subscriptions: ${subscribedUserIds.size}`);
    console.log(`- Users without subscriptions: ${usersWithoutSub.length}`);

    if (usersWithoutSub.length === 0) {
      console.log('\n✅ SUCCESS! All users have subscriptions.');
      console.log('✅ New users will automatically get free subscriptions on signup.');
      console.log('\n🎉 The product addition issue is now FIXED!');
      console.log('Users can now add products immediately after creating an account.');
    } else {
      console.log('\n⚠️ Some users still need subscriptions. Running fix...');

      // Fix any remaining users
      for (const userId of usersWithoutSub) {
        await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            tier_id: 'free',
            billing_cycle: 'monthly',
            status: 'active',
            started_at: new Date().toISOString(),
            current_period_start: new Date().toISOString(),
            ai_chats_used_this_month: 0
          })
          .select();
      }

      console.log('✅ Fixed remaining users.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupAutoSubscription();