// Comprehensive Test Suite for All Chat Features
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test configuration
const TEST_USER_ID = 'dffba89b-869d-422a-a542-2e2494850b44'; // ekhatorpaulosayi@gmail.com
const TEST_STORE_ID = 'd93cd891-7e0a-47a8-9963-5e2a00a2591f'; // paulglobal

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✅`,
    error: `${colors.red}❌`,
    warning: `${colors.yellow}⚠️`,
    info: `${colors.blue}ℹ️`,
    test: `${colors.cyan}🧪`
  };
  console.log(`${prefix[type] || ''} ${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bright}${'='.repeat(60)}`);
  console.log(`${colors.cyan}${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

// Test Suite
class ChatFeatureTests {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  async runAllTests() {
    logSection('COMPREHENSIVE CHAT FEATURES TEST SUITE');

    // Test 1: Database Tables
    await this.testDatabaseTables();

    // Test 2: Chat Takeover
    await this.testChatTakeover();

    // Test 3: Visitor Identification
    await this.testVisitorIdentification();

    // Test 4: WhatsApp Integration
    await this.testWhatsAppIntegration();

    // Test 5: Analytics
    await this.testAnalytics();

    // Test 6: Real-time Features
    await this.testRealtimeFeatures();

    // Results Summary
    this.printSummary();
  }

  async testDatabaseTables() {
    logSection('TEST 1: Database Tables & Columns');

    try {
      // Check if new tables exist
      const newTables = [
        'whatsapp_customers',
        'conversation_analytics',
        'conversation_topics',
        'agent_takeover_sessions'
      ];

      for (const tableName of newTables) {
        const { error } = await supabase
          .from(tableName)
          .select('id')
          .limit(1);

        if (!error || error.code === 'PGRST116') {
          log(`Table '${tableName}' exists`, 'success');
          this.testResults.passed++;
        } else {
          log(`Table '${tableName}' missing or inaccessible: ${error.message}`, 'error');
          this.testResults.failed++;
        }
      }

      // Check new columns in ai_chat_conversations
      const { data: convSample } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .limit(1)
        .single();

      const requiredColumns = [
        'is_agent_active',
        'agent_id',
        'visitor_identified',
        'visitor_whatsapp'
      ];

      for (const column of requiredColumns) {
        if (convSample && column in convSample) {
          log(`Column '${column}' exists in ai_chat_conversations`, 'success');
          this.testResults.passed++;
        } else {
          log(`Column '${column}' missing in ai_chat_conversations`, 'warning');
          this.testResults.failed++;
        }
      }

    } catch (error) {
      log(`Database test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  async testChatTakeover() {
    logSection('TEST 2: Chat Takeover Feature');

    try {
      // Get a test conversation
      const { data: conversation } = await supabase
        .from('ai_chat_conversations')
        .select('id')
        .eq('store_id', TEST_STORE_ID)
        .limit(1)
        .single();

      if (!conversation) {
        log('No conversation found to test takeover', 'warning');
        return;
      }

      log(`Testing takeover on conversation: ${conversation.id}`, 'test');

      // Test initiate_agent_takeover function
      const { data: sessionId, error: takeoverError } = await supabase
        .rpc('initiate_agent_takeover', {
          p_conversation_id: conversation.id,
          p_agent_id: TEST_USER_ID,
          p_reason: 'Test takeover'
        });

      if (takeoverError) {
        log(`Takeover initiation failed: ${takeoverError.message}`, 'error');
        this.testResults.failed++;
        return;
      }

      log(`Takeover initiated successfully. Session ID: ${sessionId}`, 'success');
      this.testResults.passed++;

      // Verify conversation is marked as agent active
      const { data: updatedConv } = await supabase
        .from('ai_chat_conversations')
        .select('is_agent_active, agent_id')
        .eq('id', conversation.id)
        .single();

      if (updatedConv?.is_agent_active && updatedConv.agent_id === TEST_USER_ID) {
        log('Conversation correctly marked as agent active', 'success');
        this.testResults.passed++;
      } else {
        log('Conversation not properly marked as agent active', 'error');
        this.testResults.failed++;
      }

      // Test end_agent_takeover
      const { error: endError } = await supabase
        .rpc('end_agent_takeover', {
          p_conversation_id: conversation.id,
          p_session_id: sessionId
        });

      if (!endError) {
        log('Takeover ended successfully', 'success');
        this.testResults.passed++;
      } else {
        log(`Failed to end takeover: ${endError.message}`, 'error');
        this.testResults.failed++;
      }

      // Verify takeover session was recorded
      const { data: sessions } = await supabase
        .from('agent_takeover_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessions) {
        log('Takeover session properly recorded', 'success');
        this.testResults.passed++;
      } else {
        log('Takeover session not found', 'error');
        this.testResults.failed++;
      }

    } catch (error) {
      log(`Chat takeover test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  async testVisitorIdentification() {
    logSection('TEST 3: Visitor Identification');

    try {
      // Create a test conversation
      const testSessionId = `test_visitor_${Date.now()}`;
      const { data: newConv, error: createError } = await supabase
        .from('ai_chat_conversations')
        .insert({
          session_id: testSessionId,
          store_id: TEST_STORE_ID,
          context_type: 'test'
        })
        .select()
        .single();

      if (createError) {
        log(`Failed to create test conversation: ${createError.message}`, 'error');
        this.testResults.failed++;
        return;
      }

      log(`Created test conversation: ${newConv.id}`, 'test');

      // Test visitor identification
      const visitorData = {
        visitor_name: 'Test User',
        visitor_email: 'test@example.com',
        visitor_phone: '+1234567890',
        visitor_identified: true
      };

      const { error: updateError } = await supabase
        .from('ai_chat_conversations')
        .update(visitorData)
        .eq('id', newConv.id);

      if (!updateError) {
        log('Visitor information updated successfully', 'success');
        this.testResults.passed++;
      } else {
        log(`Failed to update visitor info: ${updateError.message}`, 'error');
        this.testResults.failed++;
      }

      // Verify visitor data was saved
      const { data: verifyData } = await supabase
        .from('ai_chat_conversations')
        .select('visitor_name, visitor_email, visitor_phone, visitor_identified')
        .eq('id', newConv.id)
        .single();

      if (verifyData?.visitor_identified &&
          verifyData.visitor_name === visitorData.visitor_name &&
          verifyData.visitor_email === visitorData.visitor_email) {
        log('Visitor data correctly saved and retrievable', 'success');
        this.testResults.passed++;
      } else {
        log('Visitor data not properly saved', 'error');
        this.testResults.failed++;
      }

      // Cleanup
      await supabase
        .from('ai_chat_conversations')
        .delete()
        .eq('id', newConv.id);

    } catch (error) {
      log(`Visitor identification test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  async testWhatsAppIntegration() {
    logSection('TEST 4: WhatsApp Integration');

    try {
      const testPhone = '+1234567890';
      const testName = 'WhatsApp Test User';

      // Test creating WhatsApp customer
      const { data: customer, error: createError } = await supabase
        .from('whatsapp_customers')
        .insert({
          store_id: TEST_STORE_ID,
          phone_number: testPhone,
          customer_name: testName,
          metadata: { test: true }
        })
        .select()
        .single();

      if (!createError) {
        log(`WhatsApp customer created: ${customer.id}`, 'success');
        this.testResults.passed++;
      } else if (createError.code === '23505') {
        log('WhatsApp customer already exists (expected)', 'warning');
      } else {
        log(`Failed to create WhatsApp customer: ${createError.message}`, 'error');
        this.testResults.failed++;
      }

      // Test retrieving WhatsApp customer
      const { data: retrievedCustomer } = await supabase
        .from('whatsapp_customers')
        .select('*')
        .eq('store_id', TEST_STORE_ID)
        .eq('phone_number', testPhone)
        .single();

      if (retrievedCustomer) {
        log('WhatsApp customer retrievable', 'success');
        this.testResults.passed++;

        // Test updating customer
        const { error: updateError } = await supabase
          .from('whatsapp_customers')
          .update({
            last_contact: new Date().toISOString(),
            total_messages: (retrievedCustomer.total_messages || 0) + 1
          })
          .eq('id', retrievedCustomer.id);

        if (!updateError) {
          log('WhatsApp customer data updatable', 'success');
          this.testResults.passed++;
        } else {
          log(`Failed to update WhatsApp customer: ${updateError.message}`, 'error');
          this.testResults.failed++;
        }

        // Cleanup (only if test customer)
        if (retrievedCustomer.metadata?.test) {
          await supabase
            .from('whatsapp_customers')
            .delete()
            .eq('id', retrievedCustomer.id);
        }
      }

    } catch (error) {
      log(`WhatsApp integration test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  async testAnalytics() {
    logSection('TEST 5: Analytics Features');

    try {
      // Test analytics data insertion
      const today = new Date().toISOString().split('T')[0];

      const { error: insertError } = await supabase
        .from('conversation_analytics')
        .upsert({
          store_id: TEST_STORE_ID,
          date: today,
          total_conversations: 1,
          total_messages: 5,
          unique_visitors: 1,
          storefront_conversations: 1
        });

      if (!insertError) {
        log('Analytics data insertable', 'success');
        this.testResults.passed++;
      } else {
        log(`Failed to insert analytics: ${insertError.message}`, 'error');
        this.testResults.failed++;
      }

      // Test retrieving analytics
      const { data: analytics } = await supabase
        .from('conversation_analytics')
        .select('*')
        .eq('store_id', TEST_STORE_ID)
        .eq('date', today);

      if (analytics && analytics.length > 0) {
        log(`Analytics data retrievable: ${analytics.length} records found`, 'success');
        this.testResults.passed++;
      } else {
        log('No analytics data found', 'warning');
      }

      // Test conversation topics
      const { error: topicError } = await supabase
        .from('conversation_topics')
        .upsert({
          store_id: TEST_STORE_ID,
          topic: 'Product availability',
          category: 'inquiry',
          frequency: 1,
          sample_questions: ['Do you have this in stock?']
        });

      if (!topicError) {
        log('Conversation topics trackable', 'success');
        this.testResults.passed++;
      } else {
        log(`Failed to track topics: ${topicError.message}`, 'error');
        this.testResults.failed++;
      }

    } catch (error) {
      log(`Analytics test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  async testRealtimeFeatures() {
    logSection('TEST 6: Real-time Features');

    try {
      // Test real-time subscription capability
      const channel = supabase
        .channel('test-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_chat_messages'
          },
          (payload) => {
            log(`Real-time event received: ${payload.eventType}`, 'test');
          }
        );

      const status = await channel.subscribe();

      if (status === 'SUBSCRIBED') {
        log('Real-time subscriptions working', 'success');
        this.testResults.passed++;
      } else {
        log('Real-time subscription failed', 'error');
        this.testResults.failed++;
      }

      // Cleanup
      await supabase.removeChannel(channel);

    } catch (error) {
      log(`Real-time test failed: ${error.message}`, 'error');
      this.testResults.failed++;
    }
  }

  printSummary() {
    logSection('TEST SUMMARY');

    const total = this.testResults.passed + this.testResults.failed;
    const passRate = total > 0 ? ((this.testResults.passed / total) * 100).toFixed(1) : 0;

    console.log(`${colors.green}Passed: ${this.testResults.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${this.testResults.failed}${colors.reset}`);
    console.log(`${colors.cyan}Total: ${total}${colors.reset}`);
    console.log(`${colors.bright}Pass Rate: ${passRate}%${colors.reset}`);

    if (this.testResults.failed === 0) {
      console.log(`\n${colors.green}${colors.bright}🎉 ALL TESTS PASSED! 🎉${colors.reset}`);
    } else {
      console.log(`\n${colors.yellow}⚠️ Some tests failed. Please review the output above.${colors.reset}`);
    }

    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  }
}

// Run all tests
async function main() {
  const tester = new ChatFeatureTests();
  await tester.runAllTests();
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});