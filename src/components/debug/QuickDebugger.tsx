import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, Zap, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function QuickDebugger() {
  const [isVisible, setIsVisible] = useState(false);
  const [health, setHealth] = useState(100);
  const [status, setStatus] = useState<'idle' | 'checking' | 'fixing'>('idle');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [issues, setIssues] = useState<string[]>([]);

  const { currentUser } = useAuth();

  // Show for store owners on conversations page
  const isAdmin = currentUser?.email === 'ekhatorpaul57@gmail.com' ||
                  currentUser?.role === 'admin' ||
                  currentUser?.role === 'super_admin';

  // Show if user is authenticated and on conversations page
  const shouldShow = currentUser && window.location.pathname.includes('conversations');

  // Don't render if not authorized
  if (!shouldShow) {
    return null;
  }

  // Auto-check health every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      const problems = [];

      // Quick database check
      try {
        await supabase.from('ai_chat_conversations').select('id').limit(1);
      } catch (e) {
        problems.push('Database connection issue');
      }

      // Check for duplicate intervals
      const intervals = (window as any).__activeIntervals || new Set();
      if (intervals.size > 1) {
        problems.push(`${intervals.size} duplicate polling intervals detected`);
      }

      // Update health score
      const score = Math.max(0, 100 - (problems.length * 25));
      setHealth(score);
      setIssues(problems);
      setLastCheck(new Date());
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const quickFix = async () => {
    setStatus('fixing');

    // Fix 1: Clear all intervals
    const intervals = (window as any).__activeIntervals || new Set();
    intervals.forEach((id: number) => clearInterval(id));
    (window as any).__activeIntervals = new Set();

    // Fix 2: Reset Supabase channels
    supabase.getChannels().forEach(ch => ch.unsubscribe());

    // Fix 3: Clear problematic localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('duplicate') || key.includes('error')) {
        localStorage.removeItem(key);
      }
    });

    setStatus('idle');
    setIssues([]);
    setHealth(100);

    // Reload page after 1 second
    setTimeout(() => window.location.reload(), 1000);
  };

  const runDiagnostics = async () => {
    setStatus('checking');
    const results = [];

    // Test 1: Database connection
    try {
      const { error } = await supabase.from('ai_chat_conversations').select('id').limit(1);
      results.push({ test: 'Database', success: !error });
    } catch (e) {
      results.push({ test: 'Database', success: false });
    }

    // Test 2: Check required columns
    try {
      const { error } = await supabase
        .from('ai_chat_conversations')
        .select('takeover_status, is_agent_active')
        .limit(1);
      results.push({ test: 'Schema', success: !error });
    } catch (e) {
      results.push({ test: 'Schema', success: false });
    }

    // Test 3: Auth check
    const { data: { user } } = await supabase.auth.getUser();
    results.push({ test: 'Auth', success: !!user });

    // Calculate health
    const passed = results.filter(r => r.success).length;
    const score = Math.round((passed / results.length) * 100);
    setHealth(score);

    // List issues
    const problems = results.filter(r => !r.success).map(r => `${r.test} failed`);
    setIssues(problems);

    setStatus('idle');
    setLastCheck(new Date());

    // Auto-fix if critical
    if (score < 50) {
      setTimeout(quickFix, 500);
    }
  };

  // Health indicator color
  const getHealthColor = () => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Auto-show if health is bad
  useEffect(() => {
    if (health < 50) setIsVisible(true);
  }, [health]);

  // Get background color based on health
  const getBackgroundColor = () => {
    if (health >= 80) return '#10b981'; // green-500
    if (health >= 50) return '#eab308'; // yellow-500
    return '#ef4444'; // red-500
  };

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Floating Health Indicator with inline styles */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 10000
      }}>
        <button
          onClick={() => setIsVisible(!isVisible)}
          style={{
            position: 'relative',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: getBackgroundColor(),
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: 'none',
            cursor: 'pointer',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Activity style={{ width: '20px', height: '20px' }} />
          {health < 80 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '12px',
              height: '12px',
              backgroundColor: '#ef4444',
              borderRadius: '50%',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }} />
          )}
        </button>
      </div>

      {/* Debug Panel with inline styles */}
      {isVisible && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          width: '320px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          zIndex: 10000
        }}>
          {/* Header */}
          <div style={{
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '8px 16px',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: '600' }}>System Health: {health}%</span>
            <button
              onClick={() => setIsVisible(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#d1d5db',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#d1d5db'}
            >
              <X style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Health Bar */}
          <div style={{ padding: '8px 16px', backgroundColor: '#f3f4f6' }}>
            <div style={{
              width: '100%',
              backgroundColor: '#d1d5db',
              borderRadius: '9999px',
              height: '8px'
            }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: '9999px',
                  transition: 'all 0.3s',
                  backgroundColor: getBackgroundColor(),
                  width: `${health}%`
                }}
              />
            </div>
          </div>

          {/* Issues */}
          {issues.length > 0 && (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#fef2f2',
              borderTop: '1px solid #e5e7eb'
            }}>
              <p style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#991b1b',
                marginBottom: '4px'
              }}>Issues Detected:</p>
              {issues.map((issue, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#dc2626'
                }}>
                  <AlertTriangle style={{ width: '12px', height: '12px' }} />
                  {issue}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={runDiagnostics}
              disabled={status !== 'idle'}
              style={{
                flex: 1,
                backgroundColor: status !== 'idle' ? '#9ca3af' : '#3b82f6',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                border: 'none',
                cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                opacity: status !== 'idle' ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (status === 'idle') e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (status === 'idle') e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              {status === 'checking' ? (
                <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Activity style={{ width: '16px', height: '16px' }} />
              )}
              Check
            </button>
            <button
              onClick={quickFix}
              disabled={status !== 'idle'}
              style={{
                flex: 1,
                backgroundColor: status !== 'idle' ? '#9ca3af' : '#a855f7',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                border: 'none',
                cursor: status !== 'idle' ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                opacity: status !== 'idle' ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (status === 'idle') e.currentTarget.style.backgroundColor = '#9333ea';
              }}
              onMouseLeave={(e) => {
                if (status === 'idle') e.currentTarget.style.backgroundColor = '#a855f7';
              }}
            >
              {status === 'fixing' ? (
                <RefreshCw style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }} />
              ) : (
                <Zap style={{ width: '16px', height: '16px' }} />
              )}
              Fix Now
            </button>
          </div>

          {/* Last Check */}
          {lastCheck && (
            <div style={{
              padding: '0 16px 8px',
              fontSize: '12px',
              color: '#6b7280',
              textAlign: 'center'
            }}>
              Last check: {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </>
  );
}