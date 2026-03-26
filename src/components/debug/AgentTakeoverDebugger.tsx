import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, MessageCircle, Database, Wifi, Code } from 'lucide-react';

interface DebugLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  category: string;
  message: string;
  details?: any;
}

interface TestResult {
  name: string;
  status: 'running' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export default function AgentTakeoverDebugger() {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [testMessage, setTestMessage] = useState('Test message from debugger');
  const [sessionId, setSessionId] = useState<string>('');

  const addLog = (level: DebugLog['level'], category: string, message: string, details?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
    setLogs(prev => [...prev, log]);
    console.log(`[${category}] ${message}`, details || '');
  };

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message, details } : t);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runComprehensiveTests = async () => {
    setIsRunning(true);
    setLogs([]);
    setTests([]);

    addLog('info', 'DEBUGGER', 'Starting comprehensive agent takeover debugging', {});

    // Test 1: Database Connection
    updateTest('Database Connection', 'running', 'Testing database connection...');
    try {
      const { data: test, error } = await supabase
        .from('ai_chat_conversations')
        .select('id')
        .limit(1);

      if (error) {
        updateTest('Database Connection', 'error', `Failed: ${error.message}`, error);
        addLog('error', 'DATABASE', 'Connection failed', error);
      } else {
        updateTest('Database Connection', 'success', 'Connected successfully');
        addLog('success', 'DATABASE', 'Connection successful');
      }
    } catch (err) {
      updateTest('Database Connection', 'error', `Exception: ${err}`);
      addLog('error', 'DATABASE', 'Connection exception', err);
    }

    // Test 2: Table Structure
    updateTest('Table Structure', 'running', 'Checking table columns...');
    try {
      const { data: convCols, error: convErr } = await supabase
        .from('ai_chat_conversations')
        .select('id, store_id, session_id, takeover_status, is_agent_active, updated_at')
        .limit(1);

      const { data: msgCols, error: msgErr } = await supabase
        .from('ai_chat_messages')
        .select('id, conversation_id, role, content, is_agent_message, agent_id, created_at')
        .limit(1);

      if (!convErr && !msgErr) {
        updateTest('Table Structure', 'success', 'All required columns exist');
        addLog('success', 'SCHEMA', 'Table structure verified');
      } else {
        updateTest('Table Structure', 'error', 'Missing columns', { convErr, msgErr });
        addLog('error', 'SCHEMA', 'Table structure issues', { convErr, msgErr });
      }
    } catch (err) {
      updateTest('Table Structure', 'error', `Exception: ${err}`);
      addLog('error', 'SCHEMA', 'Structure check failed', err);
    }

    // Test 3: RLS Policies
    updateTest('RLS Policies', 'running', 'Testing Row Level Security...');
    try {
      // Test INSERT
      const testConv = {
        store_id: 'test-store-' + Date.now(),
        session_id: 'test-session-' + Date.now(),
        takeover_status: 'ai'
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('ai_chat_conversations')
        .insert(testConv)
        .select()
        .single();

      if (insertErr) {
        updateTest('RLS Policies', 'warning', 'Insert blocked by RLS', insertErr);
        addLog('warning', 'RLS', 'Insert policy may be restrictive', insertErr);
      } else {
        // Test UPDATE
        const { error: updateErr } = await supabase
          .from('ai_chat_conversations')
          .update({ takeover_status: 'agent' })
          .eq('id', inserted.id);

        // Clean up
        await supabase.from('ai_chat_conversations').delete().eq('id', inserted.id);

        if (updateErr) {
          updateTest('RLS Policies', 'warning', 'Update blocked by RLS', updateErr);
          addLog('warning', 'RLS', 'Update policy may be restrictive', updateErr);
        } else {
          updateTest('RLS Policies', 'success', 'Policies allow operations');
          addLog('success', 'RLS', 'RLS policies are permissive');
        }
      }
    } catch (err) {
      updateTest('RLS Policies', 'error', `Exception: ${err}`);
      addLog('error', 'RLS', 'Policy test failed', err);
    }

    // Test 4: Real-time Connection
    updateTest('Real-time WebSocket', 'running', 'Testing WebSocket connection...');
    try {
      const testChannel = supabase.channel('debug-test-' + Date.now());
      let connected = false;

      await new Promise((resolve) => {
        testChannel
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'ai_chat_messages'
          }, () => {})
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              connected = true;
              updateTest('Real-time WebSocket', 'success', 'WebSocket connected');
              addLog('success', 'REALTIME', 'WebSocket subscription successful');
            } else if (status === 'CHANNEL_ERROR') {
              updateTest('Real-time WebSocket', 'error', `WebSocket failed: ${status}`);
              addLog('error', 'REALTIME', 'WebSocket connection failed', status);
            }
            resolve(null);
          });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!connected) {
            updateTest('Real-time WebSocket', 'error', 'Connection timeout');
            addLog('error', 'REALTIME', 'WebSocket timeout after 5s');
          }
          resolve(null);
        }, 5000);
      });

      testChannel.unsubscribe();
    } catch (err) {
      updateTest('Real-time WebSocket', 'error', `Exception: ${err}`);
      addLog('error', 'REALTIME', 'WebSocket test failed', err);
    }

    // Test 5: Message Flow
    updateTest('Message Flow', 'running', 'Testing message insertion and retrieval...');
    try {
      // Get or create a test conversation
      let conversation;
      const testSessionId = 'debug-session-' + Date.now();

      const { data: existing } = await supabase
        .from('ai_chat_conversations')
        .select('*')
        .limit(1)
        .single();

      if (existing) {
        conversation = existing;
        setSelectedConversation(existing);
        addLog('info', 'MESSAGE_FLOW', 'Using existing conversation', existing.id);
      } else {
        const { data: created, error: createErr } = await supabase
          .from('ai_chat_conversations')
          .insert({
            store_id: 'test-store-' + Date.now(),
            session_id: testSessionId,
            takeover_status: 'agent'
          })
          .select()
          .single();

        if (createErr) {
          updateTest('Message Flow', 'error', 'Cannot create conversation', createErr);
          addLog('error', 'MESSAGE_FLOW', 'Failed to create test conversation', createErr);
          return;
        }
        conversation = created;
        setSelectedConversation(created);
      }

      // Insert test message
      const testMsg = {
        conversation_id: conversation.id,
        role: 'assistant',
        content: 'Debug test message ' + Date.now(),
        is_agent_message: true,
        agent_id: null
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('ai_chat_messages')
        .insert(testMsg)
        .select()
        .single();

      if (insertErr) {
        updateTest('Message Flow', 'error', 'Cannot insert message', insertErr);
        addLog('error', 'MESSAGE_FLOW', 'Message insert failed', insertErr);
      } else {
        addLog('success', 'MESSAGE_FLOW', 'Message inserted', inserted);

        // Try to retrieve it
        const { data: retrieved, error: retrieveErr } = await supabase
          .from('ai_chat_messages')
          .select('*')
          .eq('id', inserted.id)
          .single();

        if (retrieveErr || !retrieved) {
          updateTest('Message Flow', 'error', 'Cannot retrieve message', retrieveErr);
          addLog('error', 'MESSAGE_FLOW', 'Message retrieval failed', retrieveErr);
        } else {
          updateTest('Message Flow', 'success', 'Message flow working');
          addLog('success', 'MESSAGE_FLOW', 'Message retrieved successfully', retrieved);
        }
      }
    } catch (err) {
      updateTest('Message Flow', 'error', `Exception: ${err}`);
      addLog('error', 'MESSAGE_FLOW', 'Message flow test failed', err);
    }

    // Test 6: fetch_conversation_messages_unrestricted Function
    updateTest('Fetch Function', 'running', 'Testing unrestricted fetch function...');
    try {
      if (sessionId || selectedConversation?.session_id) {
        const { data, error } = await supabase
          .rpc('fetch_conversation_messages_unrestricted', {
            p_session_id: sessionId || selectedConversation.session_id
          });

        if (error) {
          updateTest('Fetch Function', 'warning', 'Function not available', error);
          addLog('warning', 'FUNCTION', 'Unrestricted fetch may not exist', error);
        } else {
          updateTest('Fetch Function', 'success', `Retrieved ${data?.length || 0} messages`);
          addLog('success', 'FUNCTION', 'Function working', data);
        }
      } else {
        updateTest('Fetch Function', 'warning', 'No session ID to test with');
        addLog('warning', 'FUNCTION', 'Skipped - no session ID');
      }
    } catch (err) {
      updateTest('Fetch Function', 'error', `Exception: ${err}`);
      addLog('error', 'FUNCTION', 'Function test failed', err);
    }

    // Test 7: Agent Takeover Functions
    updateTest('Takeover Functions', 'running', 'Testing takeover RPC functions...');
    try {
      // Test initiate_agent_takeover
      const { data: initiateData, error: initiateErr } = await supabase
        .rpc('initiate_agent_takeover', {
          p_conversation_id: selectedConversation?.id || '00000000-0000-0000-0000-000000000000',
          p_agent_id: '00000000-0000-0000-0000-000000000000',
          p_agent_name: 'Debug Test'
        });

      if (initiateErr) {
        if (initiateErr.code === '42883') {
          updateTest('Takeover Functions', 'error', 'Functions do not exist');
          addLog('error', 'RPC', 'Takeover functions missing', initiateErr);
        } else {
          updateTest('Takeover Functions', 'warning', 'Functions exist but have errors', initiateErr);
          addLog('warning', 'RPC', 'Function execution issues', initiateErr);
        }
      } else {
        updateTest('Takeover Functions', 'success', 'Functions available');
        addLog('success', 'RPC', 'Takeover functions working', initiateData);
      }
    } catch (err) {
      updateTest('Takeover Functions', 'error', `Exception: ${err}`);
      addLog('error', 'RPC', 'Function test failed', err);
    }

    setIsRunning(false);
    addLog('info', 'DEBUGGER', 'Comprehensive debugging completed');
  };

  const sendTestMessage = async () => {
    if (!selectedConversation) {
      alert('No conversation selected. Run tests first.');
      return;
    }

    addLog('info', 'MANUAL_TEST', 'Sending test message', { conversation_id: selectedConversation.id });

    const { data, error } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: selectedConversation.id,
        role: 'assistant',
        content: testMessage,
        is_agent_message: true,
        agent_id: null,
        created_at: new Date().toISOString()
      })
      .select();

    if (error) {
      addLog('error', 'MANUAL_TEST', 'Failed to send message', error);
    } else {
      addLog('success', 'MANUAL_TEST', 'Message sent successfully', data);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Agent Takeover Comprehensive Debugger
        </h1>
        <p className="text-gray-600 mb-4">
          This tool performs systematic testing of all components required for agent takeover functionality.
        </p>
        <button
          onClick={runComprehensiveTests}
          disabled={isRunning}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Running Tests...' : 'Run Comprehensive Debug'}
        </button>
      </div>

      {/* Test Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Test Results
          </h2>
          <div className="space-y-2">
            {tests.map((test) => (
              <div key={test.name} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <div className="font-medium">{test.name}</div>
                  <div className="text-sm text-gray-600">{test.message}</div>
                  {test.details && (
                    <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(test.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Testing */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code className="w-5 h-5" />
            Manual Message Test
          </h2>
          {selectedConversation ? (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm font-medium">Selected Conversation</div>
                <div className="text-xs text-gray-600">ID: {selectedConversation.id}</div>
                <div className="text-xs text-gray-600">Session: {selectedConversation.session_id}</div>
                <div className="text-xs text-gray-600">Status: {selectedConversation.takeover_status}</div>
              </div>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Enter test message"
              />
              <button
                onClick={sendTestMessage}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 w-full"
              >
                Send Test Message
              </button>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Run tests first to select a conversation
            </div>
          )}

          <div className="mt-6">
            <div className="text-sm font-medium mb-2">Test with specific session ID</div>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter session ID from customer chat"
            />
            <div className="text-xs text-gray-500 mt-1">
              Get this from browser console: sessionStorage.getItem('chat_session_id')
            </div>
          </div>
        </div>
      </div>

      {/* Debug Logs */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5" />
          Debug Logs
        </h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className={`p-2 rounded text-xs font-mono ${getLevelColor(log.level)}`}>
              <span className="font-semibold">[{log.category}]</span> {log.message}
              {log.details && (
                <pre className="mt-1 text-xs opacity-75">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}