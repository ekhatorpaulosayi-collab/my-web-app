import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Clock, MessageCircle } from 'lucide-react';

interface HealthCheckItem {
  name: string;
  status: 'checking' | 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

export default function WhatsAppFallbackHealthCheck() {
  const [checks, setChecks] = useState<HealthCheckItem[]>([
    { name: 'Database Schema', status: 'checking', message: 'Checking database columns...' },
    { name: 'Store Settings', status: 'checking', message: 'Checking store configurations...' },
    { name: 'Component Load', status: 'checking', message: 'Verifying components...' },
    { name: 'Real-time Status', status: 'checking', message: 'Checking real-time subscriptions...' },
    { name: 'WhatsApp Transfers', status: 'checking', message: 'Checking transfer history...' }
  ]);
  const [isChecking, setIsChecking] = useState(false);
  const [overallHealth, setOverallHealth] = useState<'healthy' | 'warning' | 'error'>('healthy');

  const runHealthChecks = async () => {
    setIsChecking(true);
    const newChecks: HealthCheckItem[] = [];

    // 1. Check Database Schema
    try {
      const { data: storeColumns } = await supabase
        .from('stores')
        .select('wa_fallback_minutes')
        .limit(1);

      const { data: convColumns } = await supabase
        .from('ai_chat_conversations')
        .select('moved_to_whatsapp_at')
        .limit(1);

      if (storeColumns !== null && convColumns !== null) {
        newChecks.push({
          name: 'Database Schema',
          status: 'success',
          message: 'All required columns exist',
          details: 'wa_fallback_minutes & moved_to_whatsapp_at found'
        });
      } else {
        newChecks.push({
          name: 'Database Schema',
          status: 'error',
          message: 'Missing database columns',
          details: 'Run migration: 20260323_add_whatsapp_fallback_timer.sql'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Database Schema',
        status: 'error',
        message: 'Failed to check database',
        details: String(error)
      });
    }

    // 2. Check Store Settings
    try {
      const { data: stores, error } = await supabase
        .from('stores')
        .select('name, whatsapp_number, wa_fallback_minutes')
        .not('whatsapp_number', 'is', null)
        .limit(5);

      if (!error && stores) {
        const configuredCount = stores.filter(s => s.wa_fallback_minutes).length;
        const withWhatsApp = stores.length;

        if (withWhatsApp > 0) {
          newChecks.push({
            name: 'Store Settings',
            status: configuredCount > 0 ? 'success' : 'warning',
            message: `${configuredCount}/${withWhatsApp} stores have timer configured`,
            details: `Default: 5 minutes for unconfigured stores`
          });
        } else {
          newChecks.push({
            name: 'Store Settings',
            status: 'warning',
            message: 'No stores have WhatsApp numbers',
            details: 'Add WhatsApp numbers in Business Settings'
          });
        }
      }
    } catch (error) {
      newChecks.push({
        name: 'Store Settings',
        status: 'error',
        message: 'Failed to check store settings',
        details: String(error)
      });
    }

    // 3. Check Component Files
    try {
      // Check if components are imported correctly
      const timerComponent = await import('../chat/WhatsAppFallbackTimer');
      const settingsComponent = await import('../settings/WhatsAppFallbackSettings');

      if (timerComponent && settingsComponent) {
        newChecks.push({
          name: 'Component Load',
          status: 'success',
          message: 'All components loaded successfully',
          details: 'Timer & Settings components ready'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'Component Load',
        status: 'error',
        message: 'Component loading failed',
        details: 'Check if all files are properly imported'
      });
    }

    // 4. Check Real-time Subscriptions
    try {
      const channel = supabase.channel('health-check-test');
      const subscribed = await new Promise((resolve) => {
        channel
          .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_chat_conversations' }, () => {})
          .subscribe((status) => {
            resolve(status === 'SUBSCRIBED');
            channel.unsubscribe();
          });

        // Timeout after 3 seconds
        setTimeout(() => resolve(false), 3000);
      });

      newChecks.push({
        name: 'Real-time Status',
        status: subscribed ? 'success' : 'warning',
        message: subscribed ? 'Real-time subscriptions working' : 'Real-time may be slow',
        details: subscribed ? 'WebSocket connected' : 'Check network connection'
      });
    } catch (error) {
      newChecks.push({
        name: 'Real-time Status',
        status: 'error',
        message: 'Real-time subscription failed',
        details: String(error)
      });
    }

    // 5. Check WhatsApp Transfer History
    try {
      const { data: transfers, error } = await supabase
        .from('ai_chat_conversations')
        .select('id, moved_to_whatsapp_at, created_at')
        .not('moved_to_whatsapp_at', 'is', null)
        .order('moved_to_whatsapp_at', { ascending: false })
        .limit(10);

      if (!error) {
        const transferCount = transfers?.length || 0;
        newChecks.push({
          name: 'WhatsApp Transfers',
          status: transferCount > 0 ? 'success' : 'warning',
          message: `${transferCount} transfers found`,
          details: transferCount > 0
            ? `Latest: ${new Date(transfers![0].moved_to_whatsapp_at!).toLocaleString()}`
            : 'No transfers yet - feature may be new'
        });
      }
    } catch (error) {
      newChecks.push({
        name: 'WhatsApp Transfers',
        status: 'error',
        message: 'Failed to check transfer history',
        details: String(error)
      });
    }

    // Determine overall health
    const hasError = newChecks.some(c => c.status === 'error');
    const hasWarning = newChecks.some(c => c.status === 'warning');
    setOverallHealth(hasError ? 'error' : hasWarning ? 'warning' : 'healthy');

    setChecks(newChecks);
    setIsChecking(false);
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getOverallStatus = () => {
    switch (overallHealth) {
      case 'healthy':
        return { color: 'bg-green-100 text-green-800 border-green-300', text: '✅ All Systems Operational' };
      case 'warning':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: '⚠️ Minor Issues Detected' };
      case 'error':
        return { color: 'bg-red-100 text-red-800 border-red-300', text: '❌ Critical Issues Found' };
    }
  };

  const overall = getOverallStatus();

  return (
    <div style={{
      padding: '24px',
      maxWidth: '800px',
      margin: '0 auto',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        borderRadius: '12px',
        border: '2px solid',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white'
      }} className={overall.color}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <MessageCircle className="w-6 h-6" />
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
              WhatsApp Fallback Timer Health Check
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', opacity: 0.8 }}>
              {overall.text}
            </p>
          </div>
        </div>
        <button
          onClick={runHealthChecks}
          disabled={isChecking}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            backgroundColor: 'white',
            cursor: isChecking ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Recheck'}
        </button>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {checks.map((check, index) => (
          <div
            key={check.name}
            style={{
              padding: '16px',
              borderBottom: index < checks.length - 1 ? '1px solid #f3f4f6' : 'none',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}
          >
            {getStatusIcon(check.status)}
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: '500',
                fontSize: '14px',
                marginBottom: '4px',
                color: '#1f2937'
              }}>
                {check.name}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6b7280',
                marginBottom: check.details ? '4px' : 0
              }}>
                {check.message}
              </div>
              {check.details && (
                <div style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  fontFamily: 'monospace',
                  backgroundColor: '#f9fafb',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  {check.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#f0fdf4',
        borderRadius: '12px',
        border: '1px solid #bbf7d0'
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: '#166534',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Clock className="w-4 h-4" />
          Quick Test Instructions
        </h3>
        <ol style={{
          margin: 0,
          paddingLeft: '20px',
          fontSize: '13px',
          color: '#15803d',
          lineHeight: '1.6'
        }}>
          <li>Go to a store's public page with WhatsApp configured</li>
          <li>Open the chat widget and type: "I need human help"</li>
          <li>Watch for the yellow timer to appear</li>
          <li>Wait for it to expire or have owner take over</li>
          <li>Verify the modal shows correct options</li>
        </ol>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        Last checked: {new Date().toLocaleString()} | Auto-refresh on component mount
      </div>
    </div>
  );
}