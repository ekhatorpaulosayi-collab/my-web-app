/**
 * Debug Console Component
 * Shows console logs on screen for mobile debugging
 */

import React, { useState, useEffect } from 'react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'log' | 'error' | 'warn';
}

export const DebugConsole: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), message: 'Debug Console Active - Waiting for Instagram share...', type: 'log' }
  ]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Intercept console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.includes('[Instagram Share]') ||
          message.includes('[ShareInstructionsModal]') ||
          message.includes('[downloadProductImage]')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'log'
        }]);
      }
      originalLog.apply(console, args);
    };

    console.error = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.includes('[Instagram Share]') ||
          message.includes('[ShareInstructionsModal]') ||
          message.includes('[downloadProductImage]')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'error'
        }]);
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (message.includes('[Instagram Share]') ||
          message.includes('[ShareInstructionsModal]') ||
          message.includes('[downloadProductImage]')) {
        setLogs(prev => [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          message,
          type: 'warn'
        }]);
      }
      originalWarn.apply(console, args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 999999,
          padding: '10px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
      >
        Show Debug Console
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '0',
      left: '0',
      right: '0',
      maxHeight: '300px',
      background: '#1a1a1a',
      color: '#00ff00',
      fontFamily: 'monospace',
      fontSize: '11px',
      zIndex: 999999,
      borderTop: '2px solid #00ff00',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        padding: '10px',
        background: '#000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #00ff00'
      }}>
        <strong style={{ color: '#00ff00' }}>DEBUG CONSOLE</strong>
        <div>
          <button
            onClick={() => setLogs([])}
            style={{
              padding: '5px 10px',
              background: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              marginRight: '5px',
              fontSize: '11px'
            }}
          >
            Clear
          </button>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              padding: '5px 10px',
              background: '#444',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px'
            }}
          >
            Hide
          </button>
        </div>
      </div>
      <div style={{
        overflowY: 'auto',
        padding: '10px',
        flex: 1
      }}>
        {logs.map((log, index) => (
            <div
              key={index}
              style={{
                marginBottom: '5px',
                padding: '5px',
                background: log.type === 'error' ? '#4a0000' : log.type === 'warn' ? '#4a4a00' : 'transparent',
                borderLeft: `3px solid ${log.type === 'error' ? '#ff0000' : log.type === 'warn' ? '#ffff00' : '#00ff00'}`,
                paddingLeft: '8px'
              }}
            >
              <span style={{ color: '#888' }}>[{log.timestamp}]</span>{' '}
              <span style={{ color: log.type === 'error' ? '#ff6666' : log.type === 'warn' ? '#ffff66' : '#00ff00' }}>
                {log.message}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};
