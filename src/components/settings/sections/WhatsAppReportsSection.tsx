import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { StatusPill } from '../../common/StatusPill';

interface ReportSettings {
  enabled: boolean;
  deliveryTime: string;
  includeProfit: boolean;
  includeStockAlerts: boolean;
  includeDebts: boolean;
  recipients: string[];
}

interface WhatsAppReportsSectionProps {
  onToast?: (message: string) => void;
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function WhatsAppReportsSection({ onToast }: WhatsAppReportsSectionProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReportSettings>({
    enabled: false,
    deliveryTime: '18:00',
    includeProfit: true,
    includeStockAlerts: true,
    includeDebts: true,
    recipients: []
  });
  const [recipientInput, setRecipientInput] = useState('');

  useEffect(() => {
    loadSettings();
  }, [currentUser]);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Get current user from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[WhatsApp Reports] Loading settings for user:', user?.id);

      if (!user?.id) {
        console.warn('[WhatsApp Reports] No user found in session');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('report_settings')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data?.report_settings) {
        setSettings({
          enabled: data.report_settings.enabled || false,
          deliveryTime: data.report_settings.deliveryTime || '18:00',
          includeProfit: data.report_settings.includeProfit !== false,
          includeStockAlerts: data.report_settings.includeStockAlerts !== false,
          includeDebts: data.report_settings.includeDebts !== false,
          recipients: Array.isArray(data.report_settings.recipients)
            ? data.report_settings.recipients
            : []
        });
      }
    } catch (error) {
      console.error('Error loading report settings:', error);
      onToast?.('Failed to load WhatsApp report settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    console.log('[WhatsApp Reports] Save button clicked!', { settings });

    try {
      setSaving(true);

      // Get current user from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[WhatsApp Reports] User from session:', user?.id);

      if (!user?.id) {
        console.error('[WhatsApp Reports] No user ID in session!');
        alert('Error: Not logged in. Please log in to Storehouse first.');
        return;
      }

      console.log('[WhatsApp Reports] Saving to Supabase for user:', user.id);

      const { data, error } = await supabase
        .from('users')
        .update({
          report_settings: {
            enabled: settings.enabled,
            deliveryTime: settings.deliveryTime,
            includeProfit: settings.includeProfit,
            includeStockAlerts: settings.includeStockAlerts,
            includeDebts: settings.includeDebts,
            recipients: settings.recipients
          }
        })
        .eq('id', user.id)
        .select();

      console.log('[WhatsApp Reports] Supabase response:', { data, error });

      if (error) throw error;

      alert('✅ WhatsApp report settings saved successfully!');
      onToast?.('WhatsApp report settings saved successfully!');
    } catch (error) {
      console.error('[WhatsApp Reports] Save error:', error);
      alert('❌ Failed to save: ' + error.message);
      onToast?.('Failed to save WhatsApp report settings');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
    // Auto-save when toggling on/off
    try {
      if (!currentUser?.id) return;
      await supabase
        .from('users')
        .update({
          report_settings: { ...settings, enabled }
        })
        .eq('id', currentUser.id);
      onToast?.(enabled ? 'Daily reports enabled!' : 'Daily reports disabled');
    } catch (error) {
      console.error('Error toggling reports:', error);
    }
  };

  const handleAddRecipient = () => {
    const cleaned = recipientInput.trim();
    if (!cleaned) return;

    // Basic phone number validation
    if (!/^\+?[\d\s-()]+$/.test(cleaned)) {
      onToast?.('Please enter a valid phone number');
      return;
    }

    if (settings.recipients.includes(cleaned)) {
      onToast?.('This number is already added');
      return;
    }

    setSettings(prev => ({
      ...prev,
      recipients: [...prev.recipients, cleaned]
    }));
    setRecipientInput('');
  };

  const handleRemoveRecipient = (number: string) => {
    setSettings(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r !== number)
    }));
  };

  console.log('[WhatsApp Reports] Component loaded', { loading, currentUser, settings });

  if (loading) {
    return (
      <div className="bs-section-content" style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading WhatsApp settings...
      </div>
    );
  }

  return (
    <div className="bs-section-content">
      <div style={{ padding: '12px', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>
        <strong>Debug Info:</strong> Component loaded successfully. User ID: {currentUser?.id || 'Not logged in'}
      </div>

      <p className="bs-help" style={{ marginBottom: '20px' }}>
        Get automated daily business reports sent to WhatsApp at your chosen time.
        Perfect for tracking performance without logging in!
      </p>

      {/* Enable Toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        background: settings.enabled ? '#ecfdf5' : '#f9fafb',
        borderRadius: '8px',
        marginBottom: '20px',
        border: `2px solid ${settings.enabled ? '#10b981' : '#e5e7eb'}`,
        cursor: 'pointer'
      }}
      onClick={() => handleToggleEnabled(!settings.enabled)}
      >
        <div style={{ flex: 1, pointerEvents: 'none' }}>
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
            {settings.enabled ? '✓ Daily Reports Enabled' : 'Enable Daily Reports'}
          </h4>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
            {settings.enabled
              ? `Reports will be sent at ${settings.deliveryTime} (Nigerian time)`
              : 'Click here to enable automated WhatsApp reports'}
          </p>
        </div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          marginLeft: '16px',
          pointerEvents: 'none'
        }}>
          <input
            type="checkbox"
            checked={settings.enabled}
            readOnly
            style={{
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            }}
          />
        </label>
      </div>

      {settings.enabled && (
        <>
          {/* Delivery Time */}
          <div className="bs-field">
            <label htmlFor="delivery-time" className="bs-label">📅 Delivery Time</label>
            <select
              id="delivery-time"
              className="bs-input"
              value={settings.deliveryTime}
              onChange={(e) => setSettings(prev => ({ ...prev, deliveryTime: e.target.value }))}
              style={{ fontFamily: 'monospace' }}
            >
              {TIME_OPTIONS.map(time => (
                <option key={time} value={time}>
                  {time} ({parseInt(time) === 0 ? '12 AM' :
                    parseInt(time) < 12 ? `${parseInt(time)} AM` :
                    parseInt(time) === 12 ? '12 PM' :
                    `${parseInt(time) - 12} PM`})
                </option>
              ))}
            </select>
            <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Choose when you want to receive your daily report (Nigerian time)
            </small>
          </div>

          {/* Recipients */}
          <div className="bs-field" style={{ marginTop: '20px' }}>
            <label htmlFor="recipient-number" className="bs-label" style={{ marginBottom: '8px', display: 'block' }}>
              WhatsApp Numbers
            </label>
            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
              <input
                id="recipient-number"
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
                placeholder="+447459044300 or +2348012345678"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '100%',
                  minWidth: '200px',
                  backgroundColor: '#ffffff'
                }}
              />
              <button
                type="button"
                onClick={handleAddRecipient}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  whiteSpace: 'nowrap'
                }}
              >
                Add
              </button>
            </div>
            <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px', display: 'block' }}>
              UK numbers (+44), Nigerian numbers (+234), or any country code work!
            </small>

            {/* Recipients List */}
            {settings.recipients.length > 0 && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {settings.recipients.map((number, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <span style={{ fontFamily: 'monospace' }}>📞 {number}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(number)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '4px 8px'
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Report Content Options */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
              Include in Report
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '4px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings.includeProfit}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeProfit: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  Profit margins & breakdown
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings.includeStockAlerts}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeStockAlerts: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  Low stock alerts
                </span>
              </label>

              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={settings.includeDebts}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeDebts: e.target.checked }))}
                  style={{
                    width: '18px',
                    height: '18px',
                    cursor: 'pointer',
                    marginTop: '2px',
                    flexShrink: 0
                  }}
                />
                <span style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  Debt collections
                </span>
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={saveSettings}
            disabled={saving || settings.recipients.length === 0}
            className="bs-save-btn"
            style={{
              marginTop: '24px',
              width: '100%',
              opacity: settings.recipients.length === 0 ? 0.5 : 1
            }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          {settings.recipients.length === 0 && (
            <p style={{
              fontSize: '13px',
              color: '#ef4444',
              marginTop: '8px',
              textAlign: 'center'
            }}>
              ⚠️ Please add at least one WhatsApp number
            </p>
          )}
        </>
      )}
    </div>
  );
}
