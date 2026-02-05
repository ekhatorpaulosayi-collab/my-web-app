/**
 * Sentry Test Script
 * Run this to verify Sentry is properly configured and receiving errors
 *
 * Usage: node test-sentry.js
 */

import * as Sentry from '@sentry/node';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const SENTRY_DSN = process.env.VITE_SENTRY_DSN;
const ENVIRONMENT = process.env.VITE_SENTRY_ENVIRONMENT || 'test';

console.log('🔧 Sentry Configuration Test\n');
console.log('DSN:', SENTRY_DSN ? '✅ Found' : '❌ Missing');
console.log('Environment:', ENVIRONMENT);
console.log('\n---\n');

if (!SENTRY_DSN) {
  console.error('❌ ERROR: VITE_SENTRY_DSN not found in .env.local');
  process.exit(1);
}

// Initialize Sentry for Node.js
Sentry.init({
  dsn: SENTRY_DSN,
  environment: ENVIRONMENT,
  tracesSampleRate: 1.0,
  beforeSend(event) {
    console.log('📤 Sending event to Sentry:', event.exception?.values?.[0]?.value || event.message);
    return event;
  }
});

console.log('✅ Sentry initialized successfully\n');

// Test 1: Simple Error
console.log('Test 1: Capturing a simple error...');
try {
  throw new Error('Test Error #1: Simple error from Node.js test script');
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      'test-type': 'simple-error',
      'test-number': '1'
    },
    extra: {
      timestamp: new Date().toISOString(),
      source: 'node-test-script'
    }
  });
  console.log('✅ Error captured\n');
}

// Test 2: Error with Context
console.log('Test 2: Capturing error with custom context...');
Sentry.setTag('test-session', 'active');
Sentry.setContext('custom', {
  testData: {
    foo: 'bar',
    timestamp: Date.now()
  }
});

try {
  throw new Error('Test Error #2: Error with custom context and tags');
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      'test-type': 'context-error',
      'test-number': '2'
    }
  });
  console.log('✅ Error with context captured\n');
}

// Test 3: Manual Message
console.log('Test 3: Sending manual message...');
Sentry.captureMessage('Test Message: Manual Sentry message from Node.js', {
  level: 'info',
  tags: {
    'test-type': 'manual-message',
    'test-number': '3'
  }
});
console.log('✅ Message sent\n');

// Test 4: Warning Level
console.log('Test 4: Sending warning...');
Sentry.captureMessage('Test Warning: This is a warning level message', {
  level: 'warning',
  tags: {
    'test-type': 'warning',
    'test-number': '4'
  }
});
console.log('✅ Warning sent\n');

// Test 5: Error with Breadcrumbs
console.log('Test 5: Error with breadcrumbs...');
Sentry.addBreadcrumb({
  category: 'test',
  message: 'User started test',
  level: 'info'
});

Sentry.addBreadcrumb({
  category: 'test',
  message: 'Preparing to throw error',
  level: 'debug'
});

try {
  throw new Error('Test Error #5: Error with breadcrumbs trail');
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      'test-type': 'breadcrumbs-error',
      'test-number': '5'
    }
  });
  console.log('✅ Error with breadcrumbs captured\n');
}

// Flush events and wait for confirmation
console.log('⏳ Flushing events to Sentry (waiting up to 5 seconds)...\n');

Sentry.close(5000).then(() => {
  console.log('✅ All events sent successfully!\n');
  console.log('🎯 Next Steps:');
  console.log('1. Go to https://sentry.io');
  console.log('2. Navigate to your Storehouse project');
  console.log('3. Click on "Issues" in the sidebar');
  console.log('4. You should see 5 test errors/messages\n');
  console.log('Look for errors with tags:');
  console.log('  - test-type: simple-error, context-error, manual-message, warning, breadcrumbs-error');
  console.log('  - test-number: 1, 2, 3, 4, 5\n');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Error flushing events:', err);
  process.exit(1);
});
