// WhatsApp AI API Endpoints
// This file contains all the backend API routes for WhatsApp AI

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Debug logger
const debugLog = (event, data, storeId = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    data,
    storeId
  };

  console.log(`[WhatsApp API] ${event}:`, data);

  // Also log to database for persistent debugging
  if (storeId) {
    supabase
      .from('whatsapp_debug_log')
      .insert({
        store_id: storeId,
        event_type: event,
        details: data
      })
      .then(() => {})
      .catch(err => console.error('Debug log error:', err));
  }
};

// Green API Pool Management
class GreenAPIPool {
  constructor() {
    this.instances = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      const { data } = await supabase
        .from('green_api_pool')
        .select('*')
        .eq('status', 'available')
        .order('last_used_at', { ascending: true });

      this.instances = data || [];
      this.initialized = true;
      debugLog('Green API Pool initialized', { count: this.instances.length });
    } catch (error) {
      debugLog('Green API Pool init error', error);
      throw error;
    }
  }

  async getAvailableInstance() {
    await this.initialize();

    if (this.instances.length === 0) {
      throw new Error('No Green API instances available');
    }

    const instance = this.instances[0];

    // Mark as in use
    await supabase
      .from('green_api_pool')
      .update({
        status: 'in_use',
        last_used_at: new Date().toISOString()
      })
      .eq('id', instance.id);

    debugLog('Green API instance allocated', { instanceId: instance.instance_id });
    return instance;
  }

  async releaseInstance(instanceId) {
    await supabase
      .from('green_api_pool')
      .update({
        status: 'available',
        current_store_id: null
      })
      .eq('instance_id', instanceId);

    debugLog('Green API instance released', { instanceId });
  }
}

const greenPool = new GreenAPIPool();

// API Route: Activate WhatsApp
export async function activateWhatsApp(req, res) {
  const { storeId, tier, phoneNumber } = req.body;

  try {
    debugLog('Activation request', { storeId, tier }, storeId);

    // Check if already configured
    const { data: existing } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (existing && existing.status === 'active') {
      return res.json({
        success: false,
        error: 'WhatsApp already activated for this store'
      });
    }

    let result;

    if (tier === 'trial') {
      // Use Baileys for free trial
      result = await activateBaileys(storeId, phoneNumber);
    } else {
      // Use Green API for paid tiers
      result = await activateGreenAPI(storeId, tier, phoneNumber);
    }

    // Create or update config
    const configData = {
      store_id: storeId,
      provider: tier === 'trial' ? 'baileys' : 'green_api',
      subscription_tier: tier,
      status: 'pending_scan',
      phone_number: phoneNumber,
      activation_date: new Date().toISOString(),
      settings: {
        ai_mode: 'auto_all',
        greeting: 'Welcome! How can I help you today?',
        language: 'en',
        max_messages_per_day: tier === 'trial' ? 100 : tier === 'basic' ? 1000 : 5000
      }
    };

    if (existing) {
      await supabase
        .from('whatsapp_config')
        .update(configData)
        .eq('store_id', storeId);
    } else {
      await supabase
        .from('whatsapp_config')
        .insert(configData);
    }

    debugLog('Activation successful', result, storeId);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    debugLog('Activation error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Activate via Baileys (Free tier)
async function activateBaileys(storeId, phoneNumber) {
  // In production, this would initiate a Baileys connection
  // For now, return mock data
  return {
    provider: 'baileys',
    message: 'Free trial activated (7 days)',
    qrCode: null // Would be actual QR in production
  };
}

// Activate via Green API (Paid tiers)
async function activateGreenAPI(storeId, tier, phoneNumber) {
  try {
    const instance = await greenPool.getAvailableInstance();

    // Generate QR code
    const response = await axios.get(
      `https://api.green-api.com/waInstance${instance.instance_id}/qr/${instance.api_token}`
    );

    // Schedule instance release after 5 minutes
    setTimeout(() => {
      greenPool.releaseInstance(instance.instance_id);
    }, 5 * 60 * 1000);

    return {
      provider: 'green_api',
      instanceId: instance.instance_id,
      qrCode: response.data.message
    };
  } catch (error) {
    throw new Error(`Green API activation failed: ${error.message}`);
  }
}

// API Route: Webhook for incoming messages
export async function webhookHandler(req, res) {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      return res.sendStatus(200);
    }

    for (const message of messages) {
      await processIncomingMessage(message);
    }

    res.sendStatus(200);
  } catch (error) {
    debugLog('Webhook error', error);
    res.sendStatus(200); // Always return 200 to prevent retries
  }
}

// Process incoming WhatsApp message
async function processIncomingMessage(message) {
  const { from, to, body: text, timestamp } = message;

  try {
    debugLog('Processing message', { from, to, text });

    // Find store by phone number
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*, stores(*)')
      .eq('phone_number', to)
      .single();

    if (!config) {
      debugLog('No store found for number', { phoneNumber: to });
      return;
    }

    const storeId = config.store_id;

    // Check if AI should handle
    if (config.settings.ai_mode === 'manual') {
      // Just log, don't auto-respond
      await logMessage(storeId, from, text, null, 'pending');
      return;
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(text, config.stores);

    // Send response
    await sendWhatsAppMessage(from, aiResponse, config);

    // Log conversation
    await logMessage(storeId, from, text, aiResponse, 'ai');

    // Update analytics
    await updateAnalytics(storeId);

  } catch (error) {
    debugLog('Message processing error', error);
  }
}

// Generate AI response
async function generateAIResponse(message, store) {
  try {
    // Get store products
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', store.id)
      .eq('is_active', true);

    // Simple response logic (replace with OpenAI in production)
    const msg = message.toLowerCase();

    if (msg.includes('hi') || msg.includes('hello')) {
      return `Welcome to ${store.name}! How can I help you today?`;
    }

    if (msg.includes('price') || msg.includes('cost')) {
      if (products && products.length > 0) {
        let response = `Our current prices:\n\n`;
        products.slice(0, 5).forEach(p => {
          response += `• ${p.name}: ₦${p.price}\n`;
        });
        return response;
      }
      return 'Please visit our store for current prices.';
    }

    if (msg.includes('product') || msg.includes('available')) {
      if (products && products.length > 0) {
        let response = `Available products:\n\n`;
        products.slice(0, 5).forEach(p => {
          response += `• ${p.name} (${p.quantity} in stock)\n`;
        });
        return response;
      }
      return 'Please visit our store to see available products.';
    }

    if (msg.includes('location') || msg.includes('address')) {
      return `Visit us at: ${store.address || 'Contact us for location details'}`;
    }

    // Default response
    return `Thanks for your message! You can ask about:\n• Products\n• Prices\n• Location\n• Stock availability`;

  } catch (error) {
    debugLog('AI response error', error);
    return 'Thank you for your message. Our team will respond shortly.';
  }
}

// Send WhatsApp message
async function sendWhatsAppMessage(to, text, config) {
  try {
    if (config.provider === 'green_api') {
      await axios.post(
        `https://api.green-api.com/waInstance${config.green_api_instance}/sendMessage/${config.green_api_token}`,
        {
          chatId: to + '@c.us',
          message: text
        }
      );
    }
    // Add other providers as needed

    debugLog('Message sent', { to, text });
  } catch (error) {
    debugLog('Send message error', error);
    throw error;
  }
}

// Log message to database
async function logMessage(storeId, customerPhone, messageText, aiResponse, handledBy) {
  try {
    await supabase
      .from('whatsapp_messages')
      .insert({
        store_id: storeId,
        customer_phone: customerPhone,
        message_type: 'incoming',
        message_text: messageText,
        ai_response: aiResponse,
        handled_by: handledBy
      });
  } catch (error) {
    debugLog('Log message error', error);
  }
}

// Update analytics
async function updateAnalytics(storeId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase
      .rpc('increment_whatsapp_analytics', {
        p_store_id: storeId,
        p_date: today
      });

    if (error) throw error;
  } catch (error) {
    debugLog('Analytics update error', error);
  }
}

// API Route: Get WhatsApp config
export async function getConfig(req, res) {
  const { storeId } = req.params;

  try {
    const { data, error } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ success: true, data });
  } catch (error) {
    debugLog('Get config error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API Route: Update settings
export async function updateSettings(req, res) {
  const { storeId } = req.params;
  const { settings } = req.body;

  try {
    debugLog('Updating settings', { storeId, settings }, storeId);

    const { error } = await supabase
      .from('whatsapp_config')
      .update({
        settings,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', storeId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    debugLog('Update settings error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API Route: Get analytics
export async function getAnalytics(req, res) {
  const { storeId } = req.params;
  const { days = 7 } = req.query;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await supabase
      .from('whatsapp_analytics')
      .select('*')
      .eq('store_id', storeId)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    debugLog('Get analytics error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// API Route: Manual message send
export async function sendMessage(req, res) {
  const { storeId, to, message } = req.body;

  try {
    debugLog('Manual message request', { storeId, to, message }, storeId);

    // Get store config
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (!config || config.status !== 'active') {
      throw new Error('WhatsApp not configured or inactive');
    }

    // Send message
    await sendWhatsAppMessage(to, message, config);

    // Log as owner-handled
    await logMessage(storeId, to, null, message, 'owner');

    res.json({ success: true });
  } catch (error) {
    debugLog('Send message error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Debug Route: Test connection
export async function testConnection(req, res) {
  const { storeId } = req.params;

  try {
    debugLog('Test connection request', { storeId }, storeId);

    // Check database connection
    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('*')
      .eq('store_id', storeId)
      .single();

    // Check Green API status if applicable
    let apiStatus = null;
    if (config && config.provider === 'green_api' && config.green_api_instance) {
      try {
        const response = await axios.get(
          `https://api.green-api.com/waInstance${config.green_api_instance}/getStateInstance/${config.green_api_token}`
        );
        apiStatus = response.data;
      } catch (err) {
        apiStatus = { error: err.message };
      }
    }

    res.json({
      success: true,
      database: 'connected',
      config: config ? 'found' : 'not found',
      apiStatus
    });
  } catch (error) {
    debugLog('Test connection error', error, storeId);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// Export all routes
export default {
  activateWhatsApp,
  webhookHandler,
  getConfig,
  updateSettings,
  getAnalytics,
  sendMessage,
  testConnection
};