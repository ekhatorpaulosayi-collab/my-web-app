// Ultra-simple component - NO external dependencies
import React from 'react';

export function ConversationsUltraSimple() {
  // No hooks, no auth, no database calls - just pure JSX
  return (
    <div style={{ padding: '20px' }}>
      <h2>Customer Conversations - Test Component</h2>
      <p>If you see this message without errors, the issue is with:</p>
      <ul>
        <li>Authentication context</li>
        <li>Database queries</li>
        <li>Or data rendering</li>
      </ul>
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
        <strong>Debug Info:</strong>
        <br />
        Component: ConversationsUltraSimple
        <br />
        Status: Rendered successfully
        <br />
        Time: {new Date().toLocaleString()}
      </div>
    </div>
  );
}