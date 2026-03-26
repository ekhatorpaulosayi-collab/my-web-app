import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import {
  MessageCircle,
  Settings,
  Activity,
  AlertCircle,
  Check,
  X,
  Loader2,
  Phone,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  Zap,
  Shield,
  ChevronRight,
  QrCode,
  Bot
} from 'lucide-react';

// Debug logger
const debugLog = (event, data) => {
  if (process.env.NODE_ENV === 'development' || window.WHATSAPP_DEBUG) {
    console.log(`[WhatsApp AI] ${event}:`, data);
  }
};

const WhatsAppAISetup = ({ storeId }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('setup');
  const [qrCode, setQrCode] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Subscription tiers
  const tiers = [
    {
      id: 'trial',
      name: 'Free Trial',
      price: '₦0',
      duration: '7 days',
      messages: '100/day',
      features: ['Basic AI responses', 'Simple analytics', 'Email support'],
      provider: 'Baileys',
      risk: 'May disconnect'
    },
    {
      id: 'basic',
      name: 'Basic',
      price: '₦5,000',
      duration: '/month',
      messages: '1,000/month',
      features: ['Reliable connection', 'Advanced AI', 'Priority support', 'Message templates'],
      provider: 'Green API',
      recommended: true
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '₦10,000',
      duration: '/month',
      messages: '5,000/month',
      features: ['Dedicated instance', 'Custom AI training', 'API access', 'White-label options'],
      provider: 'Green API'
    }
  ];

  useEffect(() => {
    loadWhatsAppConfig();
    loadAnalytics();
  }, [storeId]);

  const loadWhatsAppConfig = async () => {
    try {
      debugLog('Loading config', { storeId });

      const { data, error } = await supabase
        .from('whatsapp_config')
        .select('*')
        .eq('store_id', storeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setConfig(data);
      debugLog('Config loaded', data);
    } catch (err) {
      debugLog('Error loading config', err);
      setError(err.message);
      toast.error('Failed to load WhatsApp configuration');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_analytics')
        .select('*')
        .eq('store_id', storeId)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('date', { ascending: false });

      if (!error) {
        setAnalytics(data);
        debugLog('Analytics loaded', data);
      }
    } catch (err) {
      debugLog('Error loading analytics', err);
    }
  };

  const activateWhatsApp = async (tier) => {
    try {
      setConnecting(true);
      debugLog('Activating WhatsApp', { tier });

      // Call backend to initiate connection
      const response = await fetch('/api/whatsapp/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          storeId,
          tier,
          phoneNumber: null // Will be set during QR scan
        })
      });

      const result = await response.json();

      if (result.success) {
        if (result.qrCode) {
          setQrCode(result.qrCode);
          toast.success('Scan QR code with your WhatsApp');
        } else {
          toast.success('WhatsApp AI activated!');
          await loadWhatsAppConfig();
        }
      } else {
        throw new Error(result.error || 'Activation failed');
      }
    } catch (err) {
      debugLog('Activation error', err);
      setError(err.message);
      toast.error(`Failed to activate: ${err.message}`);
    } finally {
      setConnecting(false);
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      debugLog('Updating settings', newSettings);

      const { error } = await supabase
        .from('whatsapp_config')
        .update({
          settings: { ...config.settings, ...newSettings },
          updated_at: new Date().toISOString()
        })
        .eq('store_id', storeId);

      if (error) throw error;

      toast.success('Settings updated');
      await loadWhatsAppConfig();
    } catch (err) {
      debugLog('Settings update error', err);
      toast.error('Failed to update settings');
    }
  };

  // Calculate stats
  const calculateStats = () => {
    if (!analytics || analytics.length === 0) {
      return {
        totalMessages: 0,
        aiHandled: 0,
        uniqueCustomers: 0,
        responseRate: 0
      };
    }

    const stats = analytics.reduce((acc, day) => ({
      totalMessages: acc.totalMessages + (day.total_messages || 0),
      aiHandled: acc.aiHandled + (day.ai_handled || 0),
      uniqueCustomers: acc.uniqueCustomers + (day.unique_customers || 0)
    }), { totalMessages: 0, aiHandled: 0, uniqueCustomers: 0 });

    stats.responseRate = stats.totalMessages > 0
      ? Math.round((stats.aiHandled / stats.totalMessages) * 100)
      : 0;

    return stats;
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <MessageCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">WhatsApp AI Assistant</h2>
            <p className="text-sm text-gray-500">Automate customer responses 24/7</p>
          </div>
        </div>

        {config?.status === 'active' && (
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-green-700">Active</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-8">
          {['setup', 'analytics', 'settings', 'debug'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Setup Tab */}
      {activeTab === 'setup' && (
        <div>
          {!config ? (
            // Show subscription tiers
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Your Plan</h3>
              <div className="grid md:grid-cols-3 gap-4">
                {tiers.map(tier => (
                  <div
                    key={tier.id}
                    className={`border rounded-lg p-4 ${
                      tier.recommended ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                    }`}
                  >
                    {tier.recommended && (
                      <div className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">
                        RECOMMENDED
                      </div>
                    )}
                    <h4 className="font-semibold text-lg">{tier.name}</h4>
                    <div className="flex items-baseline my-3">
                      <span className="text-2xl font-bold">{tier.price}</span>
                      <span className="text-gray-500 ml-1">{tier.duration}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{tier.messages} messages</p>
                    <ul className="space-y-2 mb-4">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.risk && (
                      <p className="text-xs text-amber-600 mb-3 flex items-center">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {tier.risk}
                      </p>
                    )}
                    <button
                      onClick={() => activateWhatsApp(tier.id)}
                      disabled={connecting}
                      className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                        tier.recommended
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {connecting ? (
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      ) : (
                        'Get Started'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Show active configuration
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="font-semibold text-green-900">WhatsApp AI is Active</p>
                    <p className="text-sm text-green-700">
                      Your customers can now message: {config.phone_number || 'Setting up...'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Quick Stats (Last 7 Days)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Messages</span>
                      <span className="font-semibold">{stats.totalMessages}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">AI Handled</span>
                      <span className="font-semibold">{stats.aiHandled}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Unique Customers</span>
                      <span className="font-semibold">{stats.uniqueCustomers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Response Rate</span>
                      <span className="font-semibold">{stats.responseRate}%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Current Plan</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold capitalize">{config.subscription_tier} Plan</p>
                    <p className="text-sm text-gray-600 mt-1">Provider: {config.provider}</p>
                    {config.trial_ends_at && (
                      <p className="text-sm text-amber-600 mt-2">
                        Trial ends: {new Date(config.trial_ends_at).toLocaleDateString()}
                      </p>
                    )}
                    <button className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Upgrade Plan →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* QR Code Modal */}
          {qrCode && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md">
                <h3 className="text-lg font-semibold mb-4">Scan QR Code</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <img src={qrCode} alt="QR Code" className="w-full" />
                </div>
                <ol className="text-sm space-y-2 mb-4">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Go to Settings → Linked Devices</li>
                  <li>3. Tap "Link a Device"</li>
                  <li>4. Scan this QR code</li>
                </ol>
                <button
                  onClick={() => setQrCode(null)}
                  className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div>
          {analytics && analytics.length > 0 ? (
            <div>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <MessageCircle className="h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.totalMessages}</p>
                  <p className="text-sm text-gray-600">Total Messages</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <Bot className="h-8 w-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.aiHandled}</p>
                  <p className="text-sm text-gray-600">AI Handled</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
                  <p className="text-sm text-gray-600">Customers</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <TrendingUp className="h-8 w-8 text-yellow-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.responseRate}%</p>
                  <p className="text-sm text-gray-600">Response Rate</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">Daily Activity</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  {analytics.map(day => (
                    <div key={day.date} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString()}
                      </span>
                      <div className="flex space-x-4 text-sm">
                        <span>{day.total_messages} messages</span>
                        <span className="text-green-600">{day.ai_handled} AI</span>
                        <span className="text-blue-600">{day.unique_customers} customers</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No analytics data yet</p>
              <p className="text-sm text-gray-400 mt-1">Start using WhatsApp AI to see analytics</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && config && (
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold mb-3">AI Response Mode</h4>
            <div className="space-y-2">
              {[
                { value: 'auto_all', label: 'Auto-respond to all messages' },
                { value: 'auto_offline', label: 'Auto-respond only when offline' },
                { value: 'notify_all', label: 'Notify me for all messages' },
                { value: 'manual', label: 'Manual mode (no auto-responses)' }
              ].map(mode => (
                <label key={mode.value} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    value={mode.value}
                    checked={config.settings?.ai_mode === mode.value}
                    onChange={(e) => updateSettings({ ai_mode: e.target.value })}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{mode.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Greeting Message</h4>
            <textarea
              value={config.settings?.greeting || ''}
              onChange={(e) => updateSettings({ greeting: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              rows="3"
              placeholder="Welcome! How can I help you today?"
            />
          </div>

          <div>
            <h4 className="font-semibold mb-3">Business Hours</h4>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="time"
                placeholder="Open"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="time"
                placeholder="Close"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            Save Settings
          </button>
        </div>
      )}

      {/* Debug Tab */}
      {activeTab === 'debug' && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Debug Information</h4>
            <div className="space-y-2 text-sm font-mono">
              <div>Store ID: {storeId}</div>
              <div>Status: {config?.status || 'Not configured'}</div>
              <div>Provider: {config?.provider || 'None'}</div>
              <div>Phone: {config?.phone_number || 'Not set'}</div>
              <div>Last Message: {config?.last_message_at || 'Never'}</div>
              <div>Trial Ends: {config?.trial_ends_at || 'N/A'}</div>
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={loadWhatsAppConfig}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Reload Configuration
            </button>
            <button
              onClick={loadAnalytics}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Reload Analytics
            </button>
            <button
              onClick={() => {
                debugLog('Manual test', { config, analytics });
                toast.success('Check console for debug info');
              }}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
            >
              Test Debug Logging
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h5 className="font-semibold text-red-900 mb-2">Last Error:</h5>
              <pre className="text-xs text-red-700 whitespace-pre-wrap">{error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WhatsAppAISetup;