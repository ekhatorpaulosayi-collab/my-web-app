import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface WhatsAppSettings {
  is_enabled: boolean;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_whatsapp_number?: string;
  business_phone?: string;
  greeting_message: string;
  out_of_stock_message: string;
  business_hours_message: string;
}

interface SubscriptionTier {
  tier: 'free' | 'starter' | 'pro' | 'business';
  monthly_chat_limit: number;
  chats_used_this_month: number;
}

const TIER_INFO = {
  free: { name: 'Free Trial', price: '₦0', limit: 10, color: '#9ca3af' },
  starter: { name: 'AI Starter', price: '₦10,000', limit: 100, color: '#10b981' },
  pro: { name: 'AI Pro', price: '₦15,000', limit: 500, color: '#6366f1' },
  business: { name: 'AI Business', price: '₦25,000', limit: 2000, color: '#f59e0b' },
};

export default function WhatsAppAISettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupMode, setSetupMode] = useState<'choose' | 'self-setup' | 'new-number' | 'migrate'>('choose');
  const [settings, setSettings] = useState<WhatsAppSettings>({
    is_enabled: false,
    greeting_message: "Hello! 👋 I'm your 24/7 AI assistant. Ask me about product prices and availability!",
    out_of_stock_message: "Sorry, this item is currently out of stock. 😔 Would you like to be notified when it's back?",
    business_hours_message: "We're currently closed. But I can still help you with product information! 🌙",
  });
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadTier();
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading WhatsApp settings:', error);
        return;
      }

      if (data) {
        setSettings(data);
        if (data.is_enabled) {
          if (data.twilio_account_sid) {
            setSetupMode('self-setup');
          } else if (data.business_phone) {
            setSetupMode('new-number');
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTier = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_tiers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading tier:', error);
        return;
      }

      if (data) {
        setTier(data);
      } else {
        // Create default free tier
        const { data: newTier } = await supabase
          .from('subscription_tiers')
          .insert({
            user_id: user?.id,
            tier: 'free',
            monthly_chat_limit: 10,
            chats_used_this_month: 0,
          })
          .select()
          .single();

        if (newTier) setTier(newTier);
      }
    } catch (error) {
      console.error('Error loading tier:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          user_id: user?.id,
          ...settings,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      alert('✅ WhatsApp AI settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    try {
      // Test Twilio connection
      const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + settings.twilio_account_sid + '.json', {
        headers: {
          'Authorization': 'Basic ' + btoa(settings.twilio_account_sid + ':' + settings.twilio_auth_token),
        },
      });

      if (response.ok) {
        alert('✅ Connection successful! Your Twilio account is properly configured.');
      } else {
        alert('❌ Connection failed. Please check your Twilio credentials.');
      }
    } catch (error) {
      alert('❌ Connection failed: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleActivateNewNumber = async () => {
    setSaving(true);
    try {
      // For now, just save as enabled - actual provisioning will be added later
      const { error } = await supabase
        .from('whatsapp_settings')
        .upsert({
          user_id: user?.id,
          is_enabled: true,
          business_phone: '+234_PENDING', // Placeholder - will be replaced by actual provisioning
          greeting_message: settings.greeting_message,
          out_of_stock_message: settings.out_of_stock_message,
          business_hours_message: settings.business_hours_message,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      alert('✅ WhatsApp AI activated! Your number will be provisioned shortly.\n\n📞 Contact support for number assignment.');
      setSetupMode('new-number');
      loadSettings();
    } catch (error) {
      console.error('Error activating:', error);
      alert('Failed to activate. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p>Loading WhatsApp AI settings...</p>
      </div>
    );
  }

  const tierInfo = tier ? TIER_INFO[tier.tier] : TIER_INFO.free;
  const usagePercent = tier ? (tier.chats_used_this_month / tier.monthly_chat_limit) * 100 : 0;

  return (
    <div style={{
      background: 'white',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
            🤖 WhatsApp AI Assistant
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            24/7 automated price responses for your customers
          </p>
        </div>
        <div style={{
          padding: '0.5rem 1rem',
          background: settings.is_enabled ? '#ecfdf5' : '#fef3c7',
          color: settings.is_enabled ? '#065f46' : '#92400e',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}>
          {settings.is_enabled ? '✅ Active' : '⚠️ Inactive'}
        </div>
      </div>

      {/* Current Plan & Usage */}
      {tier && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Current Plan</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{tierInfo.name}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Monthly Price</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{tierInfo.price}</div>
            </div>
          </div>

          {/* Usage Bar */}
          <div>
            <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', opacity: 0.9 }}>
              AI Chats Used: {tier.chats_used_this_month} / {tier.monthly_chat_limit}
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              height: '8px',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                background: 'white',
                height: '100%',
                width: `${Math.min(usagePercent, 100)}%`,
                transition: 'width 0.3s',
              }} />
            </div>
          </div>

          {tier.tier === 'free' && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}>
              💡 Upgrade to <strong>AI Starter (₦10,000/mo)</strong> for 100 chats/month
            </div>
          )}
        </div>
      )}

      {/* Setup Mode Chooser */}
      {setupMode === 'choose' && !settings.is_enabled && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            Choose WhatsApp AI Setup
          </h4>

          {/* Option 1: Get New Number (Recommended) */}
          <div style={{
            border: '2px solid #667eea',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            background: '#f5f7ff',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => handleActivateNewNumber()}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '2rem', marginRight: '1rem' }}>⭐</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Get New AI Number (Recommended)
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  We provide you with a dedicated WhatsApp number for AI automation.
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#059669' }}>
                  ✅ Keep your existing WhatsApp<br />
                  ✅ Separate AI number for price inquiries<br />
                  ✅ No disruption to current operations
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Self-Setup (Bring Your Own Twilio) */}
          <div style={{
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '1.25rem',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          onClick={() => setSetupMode('self-setup')}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '2rem', marginRight: '1rem' }}>🔧</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Self-Setup (Advanced)
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Connect your own Twilio or 360dialog account.
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
                  ⚠️ Requires technical setup<br />
                  ⚠️ You manage your own API keys
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Self-Setup Mode */}
      {setupMode === 'self-setup' && (
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.875rem',
          }}>
            <strong>📚 Setup Instructions:</strong><br />
            1. Sign up for Twilio or 360dialog<br />
            2. Get your WhatsApp-enabled number<br />
            3. Copy your API credentials<br />
            4. Paste them below and test connection
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Twilio Account SID */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                Twilio Account SID
              </label>
              <input
                type="text"
                value={settings.twilio_account_sid || ''}
                onChange={(e) => setSettings({ ...settings, twilio_account_sid: e.target.value })}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Twilio Auth Token */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                Twilio Auth Token
              </label>
              <input
                type="password"
                value={settings.twilio_auth_token || ''}
                onChange={(e) => setSettings({ ...settings, twilio_auth_token: e.target.value })}
                placeholder="********************************"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* WhatsApp Number */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                WhatsApp Number (with whatsapp: prefix)
              </label>
              <input
                type="text"
                value={settings.twilio_whatsapp_number || ''}
                onChange={(e) => setSettings({ ...settings, twilio_whatsapp_number: e.target.value })}
                placeholder="whatsapp:+14155238886"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                }}
              />
            </div>

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={!settings.twilio_account_sid || !settings.twilio_auth_token || testingConnection}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: (!settings.twilio_account_sid || !settings.twilio_auth_token || testingConnection) ? 0.5 : 1,
              }}>
              {testingConnection ? 'Testing...' : '🔌 Test Connection'}
            </button>
          </div>
        </div>
      )}

      {/* Customization Settings (Always show if enabled) */}
      {settings.is_enabled && (
        <div style={{ marginTop: '1.5rem' }}>
          <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
            ⚙️ AI Response Customization
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Greeting Message */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                Greeting Message
              </label>
              <textarea
                value={settings.greeting_message}
                onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Out of Stock Message */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151',
              }}>
                Out of Stock Message
              </label>
              <textarea
                value={settings.out_of_stock_message}
                onChange={(e) => setSettings({ ...settings, out_of_stock_message: e.target.value })}
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {(setupMode === 'self-setup' || settings.is_enabled) && (
        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'flex-end',
        }}>
          {settings.is_enabled && (
            <button
              onClick={async () => {
                if (confirm('Are you sure you want to disable WhatsApp AI?')) {
                  setSaving(true);
                  await supabase
                    .from('whatsapp_settings')
                    .update({ is_enabled: false })
                    .eq('user_id', user?.id);
                  setSettings({ ...settings, is_enabled: false });
                  setSaving(false);
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'white',
                color: '#dc2626',
                border: '2px solid #dc2626',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
              Disable AI
            </button>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={saving}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.5 : 1,
            }}>
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
