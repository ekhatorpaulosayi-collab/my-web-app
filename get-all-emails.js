/**
 * Quick Email List Fetcher
 * Gets all user emails from the database
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getAllEmails() {
  console.log('📧 FETCHING ALL USER EMAILS FROM STOREHOUSE DATABASE\n');

  try {
    // Get all users with their details
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        store_name,
        store_type,
        created_at
      `)
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    console.log(`✅ Found ${users.length} users with email addresses\n`);

    // Get subscription info
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier_name');

    // Create a map of user subscriptions
    const subMap = {};
    subscriptions?.forEach(sub => {
      subMap[sub.user_id] = sub.tier_name;
    });

    // Display results
    console.log('USER EMAIL LIST:');
    console.log('================\n');

    const emailList = [];
    const detailedList = [];

    users.forEach((user, index) => {
      const tier = subMap[user.id] || 'Free';
      const name = user.full_name || 'No name';
      const storeName = user.store_name || 'No store name';

      emailList.push(user.email);

      detailedList.push({
        email: user.email,
        name: name,
        store: storeName,
        tier: tier,
        type: user.store_type || 'Unknown',
        joined: new Date(user.created_at).toLocaleDateString()
      });

      // Print first 20 for preview
      if (index < 20) {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${name}`);
        console.log(`   Store: ${storeName}`);
        console.log(`   Tier: ${tier}`);
        console.log(`   Type: ${user.store_type || 'Not specified'}`);
        console.log(`   Joined: ${new Date(user.created_at).toLocaleDateString()}\n`);
      }
    });

    if (users.length > 20) {
      console.log(`... and ${users.length - 20} more\n`);
    }

    // Statistics
    const stats = {
      total: users.length,
      byTier: {},
      byType: {}
    };

    detailedList.forEach(user => {
      stats.byTier[user.tier] = (stats.byTier[user.tier] || 0) + 1;
      if (user.type && user.type !== 'Unknown') {
        stats.byType[user.type] = (stats.byType[user.type] || 0) + 1;
      }
    });

    console.log('\n📊 STATISTICS:');
    console.log('==============');
    console.log(`Total Users: ${stats.total}`);

    console.log('\nBy Subscription Tier:');
    Object.entries(stats.byTier)
      .sort((a, b) => b[1] - a[1])
      .forEach(([tier, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${tier}: ${count} (${percentage}%)`);
      });

    console.log('\nBy Business Type:');
    Object.entries(stats.byType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([type, count]) => {
        const percentage = ((count / stats.total) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
      });

    // Save to files
    const fs = (await import('fs')).default;
    const timestamp = new Date().toISOString().split('T')[0];

    // Save email-only list
    const emailFile = `emails_${timestamp}.txt`;
    fs.writeFileSync(emailFile, emailList.join('\n'));
    console.log(`\n📝 Email list saved to: ${emailFile}`);

    // Save detailed CSV
    const csvContent = [
      'Email,Name,Store,Tier,Business Type,Joined',
      ...detailedList.map(u =>
        `"${u.email}","${u.name}","${u.store}","${u.tier}","${u.type}","${u.joined}"`
      )
    ].join('\n');

    const csvFile = `users_detailed_${timestamp}.csv`;
    fs.writeFileSync(csvFile, csvContent);
    console.log(`📊 Detailed CSV saved to: ${csvFile}`);

    // Calculate potential revenue
    const paidTiers = { 'Starter': 5000, 'Pro': 10000, 'Business': 15000 };
    const currentRevenue = Object.entries(stats.byTier)
      .reduce((total, [tier, count]) => {
        return total + ((paidTiers[tier] || 0) * count);
      }, 0);

    const potentialRevenue = stats.byTier['Free'] * 5000; // If all free users upgraded to Starter

    console.log('\n💰 REVENUE ANALYSIS:');
    console.log('====================');
    console.log(`Current Monthly Revenue: ₦${currentRevenue.toLocaleString()}`);
    console.log(`Potential if Free Users Upgrade: ₦${potentialRevenue.toLocaleString()}`);
    console.log(`Total Potential: ₦${(currentRevenue + potentialRevenue).toLocaleString()}`);

    console.log('\n✅ Export complete!');
    console.log('\n📌 USE THESE FILES FOR:');
    console.log('• Import to email marketing tools (Mailchimp, SendGrid, ConvertKit)');
    console.log('• WhatsApp broadcast lists');
    console.log('• SMS marketing campaigns');
    console.log('• Customer relationship management (CRM)');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the export
getAllEmails();