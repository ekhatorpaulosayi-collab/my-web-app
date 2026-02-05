import { useState } from 'react';
import * as Sentry from '@sentry/react';
import { captureError, addBreadcrumb, setTag } from '../lib/sentry';

/**
 * Sentry Testing Page
 * Use this page to test different types of error reporting
 */
export default function SentryTest() {
  const [testResults, setTestResults] = useState([]);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  // Test 1: Simple error
  const testSimpleError = () => {
    try {
      addBreadcrumb('User clicked "Test Simple Error" button');
      throw new Error('Test Error: This is a simple test error from Storehouse');
    } catch (error) {
      captureError(error, { testType: 'simple-error' });
      addResult('✅ Simple error captured and sent to Sentry', 'success');
    }
  };

  // Test 2: Unhandled error (will be caught by error boundary)
  const testUnhandledError = () => {
    addBreadcrumb('User clicked "Test Unhandled Error" button');
    addResult('⚠️ Triggering unhandled error...', 'warning');

    // This will throw an error that gets caught by React error boundary
    setTimeout(() => {
      throw new Error('Test Error: Unhandled error in async code');
    }, 100);
  };

  // Test 3: Error with context
  const testErrorWithContext = () => {
    try {
      addBreadcrumb('User clicked "Test Error with Context" button');
      setTag('test-type', 'context-error');

      const userData = {
        action: 'testing-sentry',
        feature: 'error-monitoring',
        timestamp: new Date().toISOString()
      };

      throw new Error('Test Error: Error with custom context');
    } catch (error) {
      captureError(error, {
        testType: 'error-with-context',
        userAction: 'sentry-test',
        additionalData: { foo: 'bar', baz: 123 }
      });
      addResult('✅ Error with context captured', 'success');
    }
  };

  // Test 4: Promise rejection
  const testPromiseRejection = async () => {
    try {
      addBreadcrumb('User clicked "Test Promise Rejection" button');

      await new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Test Error: Promise rejection'));
        }, 100);
      });
    } catch (error) {
      captureError(error, { testType: 'promise-rejection' });
      addResult('✅ Promise rejection captured', 'success');
    }
  };

  // Test 5: Manual Sentry capture
  const testManualCapture = () => {
    addBreadcrumb('User clicked "Test Manual Capture" button');

    Sentry.captureMessage('Test Message: Manual Sentry capture from Storehouse', {
      level: 'info',
      tags: {
        'test-type': 'manual-capture',
        'feature': 'sentry-testing'
      },
      extra: {
        timestamp: new Date().toISOString(),
        testData: { foo: 'bar' }
      }
    });

    addResult('✅ Manual message captured', 'success');
  };

  // Test 6: Network error simulation
  const testNetworkError = async () => {
    try {
      addBreadcrumb('User clicked "Test Network Error" button');
      setTag('error-type', 'network');

      // Simulate a failed API call
      const response = await fetch('https://api.example.com/nonexistent-endpoint');
      if (!response.ok) {
        throw new Error(`Network Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      captureError(error, {
        testType: 'network-error',
        endpoint: 'https://api.example.com/nonexistent-endpoint'
      });
      addResult('✅ Network error captured', 'success');
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1rem' }}>🔍 Sentry Testing Dashboard</h1>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        border: '1px solid #0ea5e9',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>ℹ️ How to use:</p>
        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Click any test button below to trigger an error</li>
          <li>Check this page for confirmation that the error was captured</li>
          <li>Open your Sentry dashboard: <a href="https://sentry.io" target="_blank" rel="noopener noreferrer">sentry.io</a></li>
          <li>Navigate to Issues to see the captured errors</li>
        </ol>
      </div>

      <div style={{ display: 'grid', gap: '1rem', marginBottom: '2rem' }}>
        <TestButton
          onClick={testSimpleError}
          title="1. Simple Error"
          description="Throws a basic error and captures it"
        />

        <TestButton
          onClick={testUnhandledError}
          title="2. Unhandled Error"
          description="Throws an unhandled error (caught by error boundary)"
          variant="warning"
        />

        <TestButton
          onClick={testErrorWithContext}
          title="3. Error with Context"
          description="Captures error with custom tags and context data"
        />

        <TestButton
          onClick={testPromiseRejection}
          title="4. Promise Rejection"
          description="Tests async error handling"
        />

        <TestButton
          onClick={testManualCapture}
          title="5. Manual Capture"
          description="Manually sends a message to Sentry"
        />

        <TestButton
          onClick={testNetworkError}
          title="6. Network Error"
          description="Simulates a failed API request"
        />
      </div>

      {/* Results Section */}
      {testResults.length > 0 && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0 }}>Test Results</h3>
            <button
              onClick={clearResults}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Clear Results
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {testResults.map((result, index) => (
              <div
                key={index}
                style={{
                  padding: '0.75rem',
                  backgroundColor: result.type === 'success' ? '#d1fae5' :
                                 result.type === 'warning' ? '#fef3c7' : '#e0e7ff',
                  border: `1px solid ${result.type === 'success' ? '#10b981' :
                                      result.type === 'warning' ? '#f59e0b' : '#6366f1'}`,
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <span style={{ fontWeight: '600', marginRight: '0.5rem' }}>
                  [{result.timestamp}]
                </span>
                {result.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#fef3c7',
        border: '1px solid #f59e0b',
        borderRadius: '8px'
      }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600' }}>📊 Sentry Configuration:</p>
        <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem' }}>
          <li>Environment: {import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE}</li>
          <li>DSN: {import.meta.env.VITE_SENTRY_DSN ? '✅ Configured' : '❌ Not configured'}</li>
          <li>Enabled: {import.meta.env.VITE_SENTRY_ENABLED === 'true' || import.meta.env.PROD ? '✅ Yes' : '❌ No'}</li>
        </ul>
      </div>
    </div>
  );
}

// Helper component for test buttons
function TestButton({ onClick, title, description, variant = 'primary' }) {
  const backgroundColor = variant === 'warning' ? '#f59e0b' : '#3b82f6';
  const hoverColor = variant === 'warning' ? '#d97706' : '#2563eb';

  return (
    <button
      onClick={onClick}
      style={{
        padding: '1rem',
        backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 0.2s'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = hoverColor}
      onMouseLeave={(e) => e.target.style.backgroundColor = backgroundColor}
    >
      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{title}</div>
      <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>{description}</div>
    </button>
  );
}
