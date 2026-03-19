/**
 * Simple Email List Fetcher for Storehouse
 * Gets all user emails from your database
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getEmails() {
  console.log('📧 FETCHING ALL USER EMAILS FROM STOREHOUSE\n');

  try {
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log(`✅ Found ${users.length} users with emails\n`);

    // Get subscription info
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('user_id, tier_name');

    // Create subscription map
    const subMap = {};
    subscriptions?.forEach(sub => {
      subMap[sub.user_id] = sub.tier_name;
    });

    // Create lists
    const emailList = [];
    const detailedList = [];

    users.forEach((user, index) => {
      const tier = subMap[user.id] || 'Free';
      emailList.push(user.email);

      detailedList.push({
        email: user.email,
        tier: tier,
        joined: new Date(user.created_at).toLocaleDateString()
      });

      // Show first 10
      if (index < 10) {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Tier: ${tier}`);
        console.log(`   Joined: ${new Date(user.created_at).toLocaleDateString()}\n`);
      }
    });

    if (users.length > 10) {
      console.log(`... and ${users.length - 10} more\n`);
    }

    // Statistics
    const stats = {
      total: users.length,
      byTier: {}
    };

    detailedList.forEach(user => {
      stats.byTier[user.tier] = (stats.byTier[user.tier] || 0) + 1;
    });

    console.log('📊 STATISTICS:');
    console.log('==============');
    console.log(`Total Users: ${stats.total}\n`);

    console.log('By Subscription:');
    Object.entries(stats.byTier).forEach(([tier, count]) => {
      const percentage = ((count / stats.total) * 100).toFixed(1);
      console.log(`  ${tier}: ${count} (${percentage}%)`);
    });

    // Save files
    const timestamp = new Date().toISOString().split('T')[0];

    // Email list
    const emailFile = `emails_${timestamp}.txt`;
    fs.writeFileSync(emailFile, emailList.join('\n'));
    console.log(`\n📝 Emails saved to: ${emailFile}`);

    // CSV file
    const csvContent = [
      'Email,Tier,Joined',
      ...detailedList.map(u => `"${u.email}","${u.tier}","${u.joined}"`)
    ].join('\n');

    const csvFile = `users_${timestamp}.csv`;
    fs.writeFileSync(csvFile, csvContent);
    console.log(`📊 CSV saved to: ${csvFile}`);

    // Calculate revenue
    const paidTiers = { 'Starter': 5000, 'Pro': 10000, 'Business': 15000 };
    const currentRevenue = Object.entries(stats.byTier)
      .reduce((total, [tier, count]) => {
        return total + ((paidTiers[tier] || 0) * count);
      }, 0);

    const potentialRevenue = (stats.byTier['Free'] || 0) * 5000;

    console.log('\n💰 REVENUE:');
    console.log('===========');
    console.log(`Current: ₦${currentRevenue.toLocaleString()}/month`);
    console.log(`Potential: ₦${potentialRevenue.toLocaleString()}/month`);
    console.log(`Total Possible: ₦${(currentRevenue + potentialRevenue).toLocaleString()}/month`);

    console.log('\n✅ Done! Use these files for:');
    console.log('• Email marketing (Mailchimp, SendGrid)');
    console.log('• WhatsApp broadcasts');
    console.log('• SMS campaigns');

  } catch (error) {
    console.error('Error:', error);
  }
}

getEmails();