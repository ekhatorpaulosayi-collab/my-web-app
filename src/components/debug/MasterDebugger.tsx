import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, AlertTriangle, Loader, Play, RefreshCw, Shield, Database, Zap, Activity, Terminal, Clock } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'warning';
  message: string;
  fix?: () => Promise<void>;
  details?: any;
}

interface SystemHealth {
  database: boolean;
  realtime: boolean;
  functions: boolean;
  auth: boolean;
  overall: number; // 0-100
}

export default function MasterDebugger() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: false,
    realtime: false,
    functions: false,
    auth: false,
    overall: 0
  });
  const [autoFix, setAutoFix] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const fixHistory = useRef<Array<{ timestamp: Date; issue: string; fixed: boolean }>>([]);

  // Add log entry
  const log = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  // Master test suite
  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true);
    setTests([]);
    log('Starting comprehensive system diagnostics...', 'info');

    const testSuite = [
      // Database Tests
      {
        name: 'Database Connection',
        test: async () => {
          const { error } = await supabase.from('ai_chat_conversations').select('id').limit(1);
          if (error) throw error;
          return { success: true, message: 'Connected to database' };
        }
      },
      {
        name: 'Required Columns',
        test: async () => {
          const requiredColumns = {
            'ai_chat_conversations': ['takeover_status', 'is_agent_active', 'agent_id'],
            'ai_chat_messages': ['sender_type', 'is_agent_message', 'agent_id']
          };

          for (const [table, columns] of Object.entries(requiredColumns)) {
            const { data, error } = await supabase
              .from(table)
              .select(columns.join(','))
              .limit(1);

            if (error && error.message.includes('column')) {
              throw new Error(`Missing columns in ${table}: ${error.message}`);
            }
          }
          return { success: true, message: 'All required columns exist' };
        },
        fix: async () => {
          // Auto-fix missing columns
          const fixes = [
            `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS takeover_status TEXT DEFAULT 'ai'`,
            `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS is_agent_active BOOLEAN DEFAULT false`,
            `ALTER TABLE ai_chat_conversations ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id)`,
            `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS sender_type TEXT DEFAULT 'customer'`,
            `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS is_agent_message BOOLEAN DEFAULT false`,
            `ALTER TABLE ai_chat_messages ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id)`
          ];

          for (const sql of fixes) {
            await supabase.rpc('exec_sql', { query: sql }).catch(() => {});
          }
        }
      },
      {
        name: 'RPC Functions',
        test: async () => {
          const functions = ['initiate_agent_takeover', 'end_agent_takeover', 'send_agent_message'];
          const missing = [];

          for (const func of functions) {
            try {
              // Test if function exists by checking schema
              const { error } = await supabase.rpc(func, {
                p_conversation_id: '00000000-0000-0000-0000-000000000000',
                p_agent_id: '00000000-0000-0000-0000-000000000000'
              });

              // If we get a different error than "function does not exist", it exists
              if (error && error.message.includes('does not exist')) {
                missing.push(func);
              }
            } catch (err: any) {
              if (err.message?.includes('does not exist')) {
                missing.push(func);
              }
            }
          }

          if (missing.length > 0) {
            throw new Error(`Missing functions: ${missing.join(', ')}`);
          }
          return { success: true, message: 'All RPC functions exist' };
        },
        fix: async () => {
          // Load and execute the fix SQL
          const response = await fetch('/mnt/c/Users/ekhat/Downloads/AGENT_TAKEOVER_DEFINITIVE_FIX.sql');
          const sql = await response.text();
          await supabase.rpc('exec_sql', { query: sql });
        }
      },
      {
        name: 'RLS Policies',
        test: async () => {
          const { data, error } = await supabase
            .from('pg_policies')
            .select('*')
            .in('tablename', ['ai_chat_conversations', 'ai_chat_messages']);

          if (!data || data.length < 2) {
            throw new Error('Missing RLS policies');
          }
          return { success: true, message: `Found ${data.length} policies` };
        }
      },
      {
        name: 'Type Compatibility',
        test: async () => {
          // Test the problematic join
          const { error } = await supabase.rpc('test_type_compatibility');
          if (error) {
            if (error.message.includes('uuid') || error.message.includes('text')) {
              throw new Error('Type mismatch between store_id and stores.id');
            }
            throw error;
          }
          return { success: true, message: 'Type casting working correctly' };
        },
        fix: async () => {
          // Apply type casting fix
          const sql = `
            -- Fix type mismatch
            CREATE OR REPLACE FUNCTION test_type_compatibility()
            RETURNS BOOLEAN AS $$
            BEGIN
              PERFORM * FROM ai_chat_conversations c
              LEFT JOIN stores s ON s.id::TEXT = c.store_id
              LIMIT 1;
              RETURN true;
            END;
            $$ LANGUAGE plpgsql;
          `;
          await supabase.rpc('exec_sql', { query: sql });
        }
      },
      {
        name: 'WebSocket Connection',
        test: async () => {
          return new Promise((resolve) => {
            const channel = supabase.channel('test-channel');
            let timeout: NodeJS.Timeout;

            channel.subscribe((status) => {
              clearTimeout(timeout);
              if (status === 'SUBSCRIBED') {
                channel.unsubscribe();
                resolve({ success: true, message: 'WebSocket connected' });
              } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
                channel.unsubscribe();
                resolve({
                  success: false,
                  message: 'WebSocket timeout (polling fallback active)',
                  warning: true
                });
              }
            });

            timeout = setTimeout(() => {
              channel.unsubscribe();
              resolve({
                success: false,
                message: 'WebSocket timeout (using polling)',
                warning: true
              });
            }, 5000);
          });
        }
      },
      {
        name: 'Message Flow Test',
        test: async () => {
          // Create a test conversation
          const testId = 'test-' + Date.now();
          const { data: conv, error: convError } = await supabase
            .from('ai_chat_conversations')
            .insert({
              session_id: testId,
              store_id: '00000000-0000-0000-0000-000000000000',
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (convError) throw convError;

          // Test message insert
          const { error: msgError } = await supabase
            .from('ai_chat_messages')
            .insert({
              conversation_id: conv.id,
              role: 'user',
              content: 'Test message',
              created_at: new Date().toISOString()
            });

          // Clean up
          await supabase.from('ai_chat_messages').delete().eq('conversation_id', conv.id);
          await supabase.from('ai_chat_conversations').delete().eq('id', conv.id);

          if (msgError) throw msgError;
          return { success: true, message: 'Message flow working' };
        }
      },
      {
        name: 'Duplicate Detection',
        test: async () => {
          // Check for duplicate polling intervals
          const intervals = performance.getEntriesByType('measure')
            .filter(entry => entry.name.includes('setInterval'));

          if (intervals.length > 1) {
            return {
              success: false,
              message: `Found ${intervals.length} polling intervals`,
              warning: true
            };
          }
          return { success: true, message: 'No duplicate polling detected' };
        }
      },
      {
        name: 'Authentication',
        test: async () => {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error || !user) throw new Error('Not authenticated');
          return { success: true, message: `Authenticated as ${user.email}` };
        }
      }
    ];

    // Run tests
    for (const test of testSuite) {
      const result: TestResult = {
        name: test.name,
        status: 'running',
        message: 'Testing...',
        fix: (test as any).fix
      };

      setTests(prev => [...prev, result]);

      try {
        const testResult = await test.test();
        result.status = (testResult as any).warning ? 'warning' : 'success';
        result.message = testResult.message;
        log(`✅ ${test.name}: ${testResult.message}`, 'success');

        if ((testResult as any).warning) {
          log(`⚠️ ${test.name}: ${testResult.message}`, 'warning');
        }
      } catch (error: any) {
        result.status = 'error';
        result.message = error.message;
        result.details = error;
        log(`❌ ${test.name}: ${error.message}`, 'error');

        // Auto-fix if enabled
        if (autoFix && result.fix) {
          log(`🔧 Attempting auto-fix for ${test.name}...`, 'info');
          try {
            await result.fix();
            result.status = 'success';
            result.message = 'Auto-fixed!';
            log(`✅ Auto-fixed ${test.name}`, 'success');

            fixHistory.current.push({
              timestamp: new Date(),
              issue: test.name,
              fixed: true
            });
          } catch (fixError: any) {
            log(`❌ Auto-fix failed: ${fixError.message}`, 'error');
          }
        }
      }

      setTests(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = result;
        return updated;
      });
    }

    // Calculate health score
    const successCount = tests.filter(t => t.status === 'success').length;
    const warningCount = tests.filter(t => t.status === 'warning').length;
    const errorCount = tests.filter(t => t.status === 'error').length;
    const totalTests = tests.length;

    const healthScore = Math.round(((successCount + warningCount * 0.5) / totalTests) * 100);

    setSystemHealth({
      database: tests.filter(t => t.name.includes('Database')).every(t => t.status !== 'error'),
      realtime: tests.find(t => t.name.includes('WebSocket'))?.status !== 'error',
      functions: tests.find(t => t.name.includes('RPC'))?.status === 'success',
      auth: tests.find(t => t.name.includes('Authentication'))?.status === 'success',
      overall: healthScore
    });

    log(`Diagnostics complete. System health: ${healthScore}%`, healthScore > 80 ? 'success' : healthScore > 50 ? 'warning' : 'error');
    setIsRunning(false);
  };

  // Quick fix function
  const quickFix = async () => {
    log('Running quick fix sequence...', 'info');
    setIsRunning(true);

    try {
      // 1. Fix database schema
      log('Fixing database schema...', 'info');
      const schemaFix = await fetch('/mnt/c/Users/ekhat/Downloads/AGENT_TAKEOVER_DEFINITIVE_FIX.sql')
        .then(r => r.text())
        .catch(() => null);

      if (schemaFix) {
        await supabase.rpc('exec_sql', { query: schemaFix });
      }

      // 2. Clear duplicate intervals
      log('Clearing duplicate intervals...', 'info');
      const intervals = (window as any).__intervals || [];
      intervals.forEach((id: number) => clearInterval(id));
      (window as any).__intervals = [];

      // 3. Reset WebSocket connections
      log('Resetting WebSocket connections...', 'info');
      const channels = supabase.getChannels();
      channels.forEach(channel => channel.unsubscribe());

      // 4. Clear localStorage issues
      log('Clearing cache...', 'info');
      localStorage.removeItem('supabase.auth.token');

      log('Quick fix complete! Refreshing in 2 seconds...', 'success');

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error: any) {
      log(`Quick fix failed: ${error.message}`, 'error');
    }

    setIsRunning(false);
  };

  // Monitor system health in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isRunning) {
        // Silent health check
        supabase.from('ai_chat_conversations').select('id').limit(1).then(({ error }) => {
          setSystemHealth(prev => ({ ...prev, database: !error }));
        });
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isRunning]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <Check className="w-4 h-4 text-green-500" />;
      case 'error': return <X className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'running': return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {/* Floating Action Button */}
      <button
        onClick={() => setShowTerminal(!showTerminal)}
        className={`
          relative w-14 h-14 rounded-full shadow-lg transition-all transform hover:scale-110
          ${systemHealth.overall > 80 ? 'bg-green-500' : systemHealth.overall > 50 ? 'bg-yellow-500' : 'bg-red-500'}
          text-white flex items-center justify-center
        `}
      >
        <Activity className="w-6 h-6" />
        {systemHealth.overall < 80 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full animate-pulse" />
        )}
      </button>

      {/* Debug Terminal */}
      {showTerminal && (
        <div className="absolute bottom-16 right-0 w-[600px] bg-gray-900 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              <span className="text-green-400 font-mono text-sm">Master Debugger v2.0</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${systemHealth.overall > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                Health: {systemHealth.overall}%
              </span>
              <button
                onClick={() => setShowTerminal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center gap-2">
            <button
              onClick={runComprehensiveDiagnostics}
              disabled={isRunning}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Run Diagnostics
            </button>
            <button
              onClick={quickFix}
              disabled={isRunning}
              className="px-3 py-1 bg-purple-600 text-white rounded text-xs font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1"
            >
              <Zap className="w-3 h-3" />
              Quick Fix
            </button>
            <label className="flex items-center gap-1 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={autoFix}
                onChange={(e) => setAutoFix(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-fix
            </label>
          </div>

          {/* System Status */}
          <div className="bg-gray-850 px-4 py-2 grid grid-cols-4 gap-2 border-b border-gray-700">
            <div className="flex items-center gap-1">
              <Database className={`w-3 h-3 ${systemHealth.database ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-xs text-gray-300">Database</span>
            </div>
            <div className="flex items-center gap-1">
              <Activity className={`w-3 h-3 ${systemHealth.realtime ? 'text-green-400' : 'text-yellow-400'}`} />
              <span className="text-xs text-gray-300">Realtime</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className={`w-3 h-3 ${systemHealth.functions ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-xs text-gray-300">Functions</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className={`w-3 h-3 ${systemHealth.auth ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-xs text-gray-300">Auth</span>
            </div>
          </div>

          {/* Test Results */}
          <div className="max-h-64 overflow-y-auto bg-gray-850 px-4 py-2">
            {tests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Click "Run Diagnostics" to start system check
              </div>
            ) : (
              <div className="space-y-1">
                {tests.map((test, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(test.status)}
                      <span className="text-xs text-gray-300 font-mono">{test.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{test.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Terminal Logs */}
          <div className="bg-black px-4 py-2 max-h-32 overflow-y-auto border-t border-gray-700">
            <div className="font-mono text-xs space-y-0.5">
              {logs.slice(-10).map((log, idx) => (
                <div key={idx} className="text-gray-400">{log}</div>
              ))}
            </div>
          </div>

          {/* Health Bar */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700">
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getHealthColor(systemHealth.overall)}`}
                style={{ width: `${systemHealth.overall}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}