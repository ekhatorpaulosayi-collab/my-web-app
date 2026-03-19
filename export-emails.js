/**
 * Email List Export Tool
 * Exports user emails from your database with filtering and segmentation
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'json2csv';

const supabaseUrl = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Export options
const EXPORT_OPTIONS = {
  ALL: 'all',
  ACTIVE: 'active',
  PAYING: 'paying',
  FREE: 'free',
  AT_RISK: 'at_risk',
  CHURNED: 'churned'
};

async function exportEmails(exportType = EXPORT_OPTIONS.ALL) {
  console.log('📧 EMAIL EXPORT TOOL FOR STOREHOUSE');
  console.log('=====================================\n');

  try {
    // First, get current stats
    console.log('📊 Getting current statistics...\n');

    const { data: stats, error: statsError } = await supabase
      .from('email_statistics')
      .select('*')
      .single();

    if (!statsError && stats) {
      console.log('📈 DATABASE STATISTICS:');
      console.log(`  Total Emails: ${stats.total_emails}`);
      console.log(`  Verified: ${stats.verified_emails}`);
      console.log(`  Paying Customers: ${stats.paying_customers}`);
      console.log(`  Active Users: ${stats.active_users}`);
      console.log(`  At Risk: ${stats.at_risk_users}`);
      console.log(`  Churned: ${stats.churned_users}`);
      console.log(`  Champions: ${stats.champion_users}\n`);

      console.log('💰 TIER BREAKDOWN:');
      console.log(`  Free: ${stats.free_tier}`);
      console.log(`  Starter: ${stats.starter_tier}`);
      console.log(`  Pro: ${stats.pro_tier}`);
      console.log(`  Business: ${stats.business_tier}\n`);
    }

    // Build query based on export type
    let query = supabase.from('email_list').select(`
      email,
      full_name,
      phone,
      store_name,
      subscription_tier,
      is_paying_customer,
      user_segment,
      business_type,
      total_sales,
      total_revenue_kobo,
      ai_chats_used,
      last_login,
      created_at,
      city,
      state,
      tags
    `);

    // Add filters based on export type
    switch(exportType) {
      case EXPORT_OPTIONS.ACTIVE:
        query = query.eq('user_segment', 'active');
        console.log('🎯 Exporting ACTIVE users only...\n');
        break;
      case EXPORT_OPTIONS.PAYING:
        query = query.eq('is_paying_customer', true);
        console.log('💳 Exporting PAYING customers only...\n');
        break;
      case EXPORT_OPTIONS.FREE:
        query = query.eq('subscription_tier', 'Free');
        console.log('🆓 Exporting FREE tier users only...\n');
        break;
      case EXPORT_OPTIONS.AT_RISK:
        query = query.eq('user_segment', 'at_risk');
        console.log('⚠️ Exporting AT-RISK users only...\n');
        break;
      case EXPORT_OPTIONS.CHURNED:
        query = query.eq('user_segment', 'churned');
        console.log('🚪 Exporting CHURNED users only...\n');
        break;
      default:
        console.log('📋 Exporting ALL users...\n');
    }

    // Always exclude unsubscribed
    query = query
      .eq('email_consent', true)
      .eq('unsubscribed', false)
      .order('created_at', { ascending: false });

    const { data: emails, error } = await query;

    if (error) {
      console.error('❌ Error fetching emails:', error);
      return;
    }

    if (!emails || emails.length === 0) {
      console.log('⚠️ No emails found for the selected criteria.');
      return;
    }

    console.log(`✅ Found ${emails.length} emails\n`);

    // Transform data for better readability
    const transformedEmails = emails.map(user => ({
      Email: user.email,
      'Full Name': user.full_name || '',
      'Store Name': user.store_name || '',
      Phone: user.phone || '',
      'Subscription Tier': user.subscription_tier,
      'Customer Type': user.is_paying_customer ? 'Paid' : 'Free',
      Segment: user.user_segment || 'Unknown',
      'Business Type': user.business_type || '',
      'Total Sales': user.total_sales || 0,
      'Total Revenue (₦)': user.total_revenue_kobo ? (user.total_revenue_kobo / 100).toFixed(2) : '0.00',
      'AI Chats Used': user.ai_chats_used || 0,
      'Last Active': user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never',
      'Signup Date': new Date(user.created_at).toLocaleDateString(),
      City: user.city || '',
      State: user.state || '',
      Tags: Array.isArray(user.tags) ? user.tags.join(', ') : ''
    }));

    // Generate CSV
    const csv = parse(transformedEmails);

    // Save to file
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `email_export_${exportType}_${timestamp}.csv`;

    fs.writeFileSync(filename, csv);
    console.log(`💾 Exported to: ${filename}\n`);

    // Show sample data
    console.log('📧 SAMPLE DATA (First 5 records):');
    console.log('===================================');
    transformedEmails.slice(0, 5).forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.Email}`);
      console.log(`   Name: ${user['Full Name'] || 'Not provided'}`);
      console.log(`   Store: ${user['Store Name'] || 'Not provided'}`);
      console.log(`   Tier: ${user['Subscription Tier']}`);
      console.log(`   Segment: ${user.Segment}`);
      console.log(`   Sales: ${user['Total Sales']} (₦${user['Total Revenue (₦)']})`);
    });

    // Create summary report
    const summary = {
      totalEmails: emails.length,
      byTier: {},
      bySegment: {},
      byBusinessType: {}
    };

    emails.forEach(user => {
      // Count by tier
      summary.byTier[user.subscription_tier] = (summary.byTier[user.subscription_tier] || 0) + 1;

      // Count by segment
      if (user.user_segment) {
        summary.bySegment[user.user_segment] = (summary.bySegment[user.user_segment] || 0) + 1;
      }

      // Count by business type
      if (user.business_type) {
        summary.byBusinessType[user.business_type] = (summary.byBusinessType[user.business_type] || 0) + 1;
      }
    });

    console.log('\n\n📊 EXPORT SUMMARY:');
    console.log('==================');
    console.log(`Total Emails Exported: ${summary.totalEmails}`);

    console.log('\nBy Tier:');
    Object.entries(summary.byTier).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });

    console.log('\nBy Segment:');
    Object.entries(summary.bySegment).forEach(([segment, count]) => {
      console.log(`  ${segment}: ${count}`);
    });

    console.log('\nTop Business Types:');
    Object.entries(summary.byBusinessType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
      });

    // Also create a JSON export for advanced use
    const jsonFilename = `email_export_${exportType}_${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(transformedEmails, null, 2));
    console.log(`\n📄 Also exported as JSON: ${jsonFilename}`);

    // Create email-only list for quick import to email services
    const emailOnlyFilename = `email_list_${exportType}_${timestamp}.txt`;
    const emailOnlyList = emails.map(u => u.email).join('\n');
    fs.writeFileSync(emailOnlyFilename, emailOnlyList);
    console.log(`📝 Email-only list saved: ${emailOnlyFilename}`);

    console.log('\n✨ Export complete!');
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Import the CSV file to your email marketing tool (Mailchimp, SendGrid, etc.)');
    console.log('2. Use segments to create targeted campaigns');
    console.log('3. Focus on re-engaging at-risk and churned users');
    console.log('4. Reward your champion users with exclusive offers');

  } catch (error) {
    console.error('❌ Error during export:', error);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const exportType = args[0] || EXPORT_OPTIONS.ALL;

// Show usage if help is requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('📧 Email Export Tool - Usage:');
  console.log('==============================\n');
  console.log('node export-emails.js [type]\n');
  console.log('Available export types:');
  console.log('  all      - Export all consenting users (default)');
  console.log('  active   - Export only active users (logged in within 7 days)');
  console.log('  paying   - Export only paying customers');
  console.log('  free     - Export only free tier users');
  console.log('  at_risk  - Export users who haven\'t logged in for 14-30 days');
  console.log('  churned  - Export users who haven\'t logged in for 30+ days\n');
  console.log('Examples:');
  console.log('  node export-emails.js          # Export all emails');
  console.log('  node export-emails.js paying   # Export paying customers only');
  console.log('  node export-emails.js at_risk  # Export at-risk users for re-engagement');
  process.exit(0);
}

// Run the export
exportEmails(exportType);