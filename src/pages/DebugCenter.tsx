import React from 'react';
import MasterDebugger from '../components/debug/MasterDebugger';

export default function DebugCenter() {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#ffffff'
    }}>
      <h1 style={{
        marginBottom: '20px',
        color: '#00ff00',
        fontFamily: 'monospace'
      }}>
        🔧 Chat System Debug Center
      </h1>

      <div style={{
        padding: '20px',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #333'
      }}>
        <h2 style={{ color: '#ff9900', marginBottom: '10px' }}>
          ⚠️ Known Issue: Agent Messages Not Visible to Customers
        </h2>
        <p style={{ color: '#cccccc' }}>
          When agent takes over chat, customers cannot see agent messages.
          Running diagnostics to identify and fix the issue...
        </p>
      </div>

      <MasterDebugger />
    </div>
  );
}