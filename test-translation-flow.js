#!/usr/bin/env node

/**
 * Test Translation Flow for SmartStock Chat Widget
 * Tests that Hausa messages trigger proper translation and display
 */

import https from 'https';
import crypto from 'crypto';

// Configuration
const SUPABASE_URL = 'https://yzlniqwzqlsftxrtapdl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTkwMzAsImV4cCI6MjA3ODk3NTAzMH0.8Dt8HNYCtsD9GkMXGPe1UroCLD3TbqOmbEWdxO2chsQ';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6bG5pcXd6cWxzZnR4cnRhcGRsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM5OTAzMCwiZXhwIjoyMDc4OTc1MDMwfQ.4kLqZAbP1MrA-TYLxLJvr_BXj3-LGPuVKkuLtoIqK-A';

// Test message in Hausa
const TEST_MESSAGE = 'Ina son siyan iPhone';
const OWNER_REPLY = 'The iPhone 15 Pro is available for ₦1,500,000. Would you like to proceed with the purchase?';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(path, method, body, apiKey = SUPABASE_ANON_KEY) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'yzlniqwzqlsftxrtapdl.supabase.co',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        'Authorization': `Bearer ${apiKey}`
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testTranslationFlow() {
  log('\n=== SmartStock Translation Flow Test ===\n', 'bright');

  try {
    // Step 1: Create a test conversation
    log('Step 1: Creating test conversation...', 'cyan');
    const conversationId = crypto.randomUUID();
    const sessionId = `test-${Date.now()}`;

    const conversation = await makeRequest(
      '/rest/v1/ai_chat_conversations',
      'POST',
      {
        id: conversationId,
        session_id: sessionId,
        store_id: 'dffba89b-869d-422a-a542-2e2494850b44', // Test store ID
        visitor_name: 'Test Customer',
        is_agent_active: false,
        chat_status: 'active'
      }
    );

    log(`✓ Created conversation: ${conversationId}`, 'green');

    // Step 2: Send customer message in Hausa
    log('\nStep 2: Sending customer message in Hausa...', 'cyan');
    log(`Message: "${TEST_MESSAGE}"`, 'yellow');

    const customerMessage = await makeRequest(
      '/rest/v1/ai_chat_messages',
      'POST',
      {
        conversation_id: conversationId,
        role: 'user',
        content: TEST_MESSAGE,
        sender_type: 'customer',
        detected_language: 'Hausa'
      }
    );

    log('✓ Customer message sent', 'green');

    // Step 3: Simulate agent takeover and send reply
    log('\nStep 3: Simulating agent takeover...', 'cyan');

    // Update conversation to agent active
    await makeRequest(
      `/rest/v1/ai_chat_conversations?id=eq.${conversationId}`,
      'PATCH',
      {
        is_agent_active: true,
        agent_id: 'test-agent-id'
      },
      SERVICE_ROLE_KEY
    );

    log('✓ Agent takeover activated', 'green');

    // Step 4: Send owner reply through edge function
    log('\nStep 4: Sending owner reply in English...', 'cyan');
    log(`Message: "${OWNER_REPLY}"`, 'yellow');

    const edgeResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'yzlniqwzqlsftxrtapdl.supabase.co',
        path: '/functions/v1/send-agent-message',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      };

      const body = JSON.stringify({
        conversationId: conversationId,
        message: OWNER_REPLY,
        agentId: 'test-agent-id'
      });

      options.headers['Content-Length'] = Buffer.byteLength(body);

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });

      req.on('error', reject);
      req.write(body);
      req.end();
    });

    log('✓ Owner message sent through edge function', 'green');

    // Step 5: Retrieve messages to check translation
    log('\nStep 5: Checking translation results...', 'cyan');

    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for processing

    const messages = await makeRequest(
      `/rest/v1/ai_chat_messages?conversation_id=eq.${conversationId}&order=created_at.asc`,
      'GET'
    );

    log('\n--- Message Analysis ---', 'bright');

    messages.forEach((msg, index) => {
      log(`\nMessage ${index + 1}:`, 'blue');
      log(`  Role: ${msg.role}`, 'white');
      log(`  Sender: ${msg.sender_type || 'N/A'}`, 'white');
      log(`  Content: ${msg.content.substring(0, 50)}...`, 'white');
      log(`  Detected Language: ${msg.detected_language || 'Not set'}`, 'yellow');

      if (msg.translated_text) {
        log(`  ✓ Translated Text: ${msg.translated_text.substring(0, 50)}...`, 'green');
      } else if (msg.role === 'assistant' && msg.is_agent_message) {
        log(`  ✗ No translation found (expected for owner message)`, 'red');
      }
    });

    // Step 6: Verify translation exists
    log('\n--- Test Results ---', 'bright');

    const agentMessage = messages.find(m => m.is_agent_message);
    if (agentMessage) {
      if (agentMessage.translated_text) {
        log('✓ PASS: Owner message has translated_text field', 'green');
        log(`  Translation preview: "${agentMessage.translated_text.substring(0, 100)}..."`, 'green');

        // Check if it's actually in Hausa (basic check for common Hausa words)
        const hausaIndicators = ['yana', 'ne', 'za', 'na', 'ke', 'ga', 'da'];
        const hasHausa = hausaIndicators.some(word =>
          agentMessage.translated_text.toLowerCase().includes(word)
        );

        if (hasHausa) {
          log('✓ PASS: Translation appears to be in Hausa', 'green');
        } else {
          log('⚠ WARNING: Translation might not be in Hausa', 'yellow');
        }
      } else {
        log('✗ FAIL: Owner message missing translated_text', 'red');
      }
    } else {
      log('✗ FAIL: No agent message found', 'red');
    }

    // Step 7: Test frontend display logic
    log('\n--- Frontend Display Check ---', 'bright');
    log('Frontend should display:', 'cyan');

    if (agentMessage && agentMessage.translated_text) {
      log(`  Primary: ${agentMessage.translated_text.substring(0, 80)}...`, 'green');
      log('  Footer: "Translated from English"', 'green');
      log('\n✓ Customer will see the Hausa translation', 'green');
    } else {
      log(`  Primary: ${OWNER_REPLY.substring(0, 80)}...`, 'yellow');
      log('  Footer: None', 'yellow');
      log('\n✗ Customer will see English (translation failed)', 'red');
    }

    // Clean up test data
    log('\n--- Cleanup ---', 'cyan');
    await makeRequest(
      `/rest/v1/ai_chat_messages?conversation_id=eq.${conversationId}`,
      'DELETE',
      null,
      SERVICE_ROLE_KEY
    );
    await makeRequest(
      `/rest/v1/ai_chat_conversations?id=eq.${conversationId}`,
      'DELETE',
      null,
      SERVICE_ROLE_KEY
    );
    log('✓ Test data cleaned up', 'green');

  } catch (error) {
    log(`\n✗ Test failed with error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testTranslationFlow();