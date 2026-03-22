import { supabase } from '../lib/supabase';

export interface WhatsAppCustomer {
  id: string;
  store_id: string;
  phone_number: string;
  customer_name?: string;
  customer_email?: string;
  customer_id?: string;
  conversation_ids: string[];
  first_contact: string;
  last_contact: string;
  total_messages: number;
  metadata: Record<string, any>;
}

export interface WhatsAppMessage {
  from: string; // Phone number
  to: string;
  body: string;
  timestamp: string;
  message_id: string;
  profile_name?: string;
}

export class WhatsAppIntegrationService {
  private storeId: string;

  constructor(storeId: string) {
    this.storeId = storeId;
  }

  /**
   * Identify a customer from WhatsApp phone number
   */
  async identifyCustomer(phoneNumber: string, profileName?: string): Promise<WhatsAppCustomer | null> {
    try {
      // Normalize phone number
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Check if customer exists
      const { data: existingCustomer, error: fetchError } = await supabase
        .from('whatsapp_customers')
        .select('*')
        .eq('store_id', this.storeId)
        .eq('phone_number', normalizedPhone)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingCustomer) {
        // Update last contact
        await supabase
          .from('whatsapp_customers')
          .update({
            last_contact: new Date().toISOString(),
            customer_name: profileName || existingCustomer.customer_name
          })
          .eq('id', existingCustomer.id);

        return existingCustomer;
      }

      // Create new WhatsApp customer
      const { data: newCustomer, error: createError } = await supabase
        .from('whatsapp_customers')
        .insert({
          store_id: this.storeId,
          phone_number: normalizedPhone,
          customer_name: profileName,
          metadata: {
            source: 'whatsapp',
            identified_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (createError) throw createError;

      // Try to match with existing customer by phone
      await this.linkToExistingCustomer(normalizedPhone, newCustomer.id);

      return newCustomer;
    } catch (error) {
      console.error('Error identifying WhatsApp customer:', error);
      return null;
    }
  }

  /**
   * Link WhatsApp customer to existing customer record
   */
  async linkToExistingCustomer(phoneNumber: string, whatsappCustomerId: string): Promise<boolean> {
    try {
      // Search for existing customer with this phone number
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('phone', phoneNumber)
        .single();

      if (error || !customers) return false;

      // Update WhatsApp customer with customer ID
      await supabase
        .from('whatsapp_customers')
        .update({
          customer_id: customers.id,
          customer_name: customers.name,
          customer_email: customers.email
        })
        .eq('id', whatsappCustomerId);

      return true;
    } catch (error) {
      console.error('Error linking to existing customer:', error);
      return false;
    }
  }

  /**
   * Create or continue conversation for WhatsApp customer
   */
  async createOrContinueConversation(
    phoneNumber: string,
    message: string,
    profileName?: string
  ): Promise<{ conversationId: string; customer: WhatsAppCustomer }> {
    try {
      // Identify customer
      const customer = await this.identifyCustomer(phoneNumber, profileName);
      if (!customer) throw new Error('Failed to identify customer');

      // Check for active conversation
      let conversationId: string;

      if (customer.conversation_ids && customer.conversation_ids.length > 0) {
        // Check if the last conversation is recent (within 24 hours)
        const lastConvId = customer.conversation_ids[customer.conversation_ids.length - 1];
        const { data: lastConv } = await supabase
          .from('ai_chat_conversations')
          .select('created_at')
          .eq('id', lastConvId)
          .single();

        const isRecent = lastConv &&
          (Date.now() - new Date(lastConv.created_at).getTime()) < 24 * 60 * 60 * 1000;

        if (isRecent) {
          conversationId = lastConvId;
        } else {
          // Create new conversation
          conversationId = await this.createNewConversation(customer);
        }
      } else {
        // Create first conversation
        conversationId = await this.createNewConversation(customer);
      }

      // Save the message
      await supabase
        .from('ai_chat_messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content: message,
          message_metadata: {
            source: 'whatsapp',
            phone_number: phoneNumber,
            profile_name: profileName
          }
        });

      // Update message count
      await supabase
        .from('whatsapp_customers')
        .update({
          total_messages: (customer.total_messages || 0) + 1,
          last_contact: new Date().toISOString()
        })
        .eq('id', customer.id);

      return { conversationId, customer };
    } catch (error) {
      console.error('Error creating/continuing conversation:', error);
      throw error;
    }
  }

  /**
   * Create new conversation for WhatsApp customer
   */
  private async createNewConversation(customer: WhatsAppCustomer): Promise<string> {
    const sessionId = `whatsapp_${customer.phone_number}_${Date.now()}`;

    const { data: conversation, error } = await supabase
      .from('ai_chat_conversations')
      .insert({
        store_id: this.storeId,
        session_id: sessionId,
        context_type: 'whatsapp',
        visitor_phone: customer.phone_number,
        visitor_name: customer.customer_name,
        visitor_email: customer.customer_email,
        visitor_identified: true,
        visitor_whatsapp: customer.phone_number,
        source_page: 'whatsapp'
      })
      .select()
      .single();

    if (error) throw error;

    // Add conversation to customer's list
    const updatedConvIds = [...(customer.conversation_ids || []), conversation.id];
    await supabase
      .from('whatsapp_customers')
      .update({
        conversation_ids: updatedConvIds
      })
      .eq('id', customer.id);

    return conversation.id;
  }

  /**
   * Get customer conversation history
   */
  async getCustomerHistory(phoneNumber: string): Promise<{
    customer: WhatsAppCustomer;
    conversations: any[];
    totalMessages: number;
  } | null> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Get customer
      const { data: customer, error: customerError } = await supabase
        .from('whatsapp_customers')
        .select('*')
        .eq('store_id', this.storeId)
        .eq('phone_number', normalizedPhone)
        .single();

      if (customerError || !customer) return null;

      // Get conversations
      const { data: conversations, error: convError } = await supabase
        .from('ai_chat_conversations')
        .select(`
          *,
          ai_chat_messages (
            id,
            role,
            content,
            created_at
          )
        `)
        .in('id', customer.conversation_ids || [])
        .order('created_at', { ascending: false });

      if (convError) throw convError;

      // Count total messages
      const totalMessages = conversations?.reduce(
        (sum, conv) => sum + (conv.ai_chat_messages?.length || 0),
        0
      ) || 0;

      return {
        customer,
        conversations: conversations || [],
        totalMessages
      };
    } catch (error) {
      console.error('Error getting customer history:', error);
      return null;
    }
  }

  /**
   * Get all WhatsApp customers for the store
   */
  async getAllCustomers(): Promise<WhatsAppCustomer[]> {
    try {
      const { data, error } = await supabase
        .from('whatsapp_customers')
        .select('*')
        .eq('store_id', this.storeId)
        .order('last_contact', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting WhatsApp customers:', error);
      return [];
    }
  }

  /**
   * Update customer information
   */
  async updateCustomerInfo(
    phoneNumber: string,
    updates: {
      name?: string;
      email?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      const { error } = await supabase
        .from('whatsapp_customers')
        .update({
          customer_name: updates.name,
          customer_email: updates.email,
          metadata: updates.metadata
        })
        .eq('store_id', this.storeId)
        .eq('phone_number', normalizedPhone);

      return !error;
    } catch (error) {
      console.error('Error updating customer info:', error);
      return false;
    }
  }

  /**
   * Normalize phone number to consistent format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Add country code if missing (assuming US for now)
    if (cleaned.length === 10) {
      cleaned = '1' + cleaned;
    }

    // Add + prefix
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Get customer insights
   */
  async getCustomerInsights(phoneNumber: string): Promise<{
    firstContact: Date;
    lastContact: Date;
    totalConversations: number;
    totalMessages: number;
    averageResponseTime?: number;
    commonTopics?: string[];
    purchaseHistory?: any[];
  } | null> {
    try {
      const history = await this.getCustomerHistory(phoneNumber);
      if (!history) return null;

      const { customer, conversations, totalMessages } = history;

      // Calculate average response time
      let responseTimeSum = 0;
      let responseCount = 0;

      conversations.forEach(conv => {
        const messages = conv.ai_chat_messages || [];
        for (let i = 1; i < messages.length; i++) {
          if (messages[i].role === 'assistant' && messages[i - 1].role === 'user') {
            const timeDiff = new Date(messages[i].created_at).getTime() -
                           new Date(messages[i - 1].created_at).getTime();
            responseTimeSum += timeDiff;
            responseCount++;
          }
        }
      });

      const averageResponseTime = responseCount > 0
        ? responseTimeSum / responseCount / 1000 // Convert to seconds
        : undefined;

      // Extract common topics (simplified version)
      const topics = new Set<string>();
      conversations.forEach(conv => {
        conv.ai_chat_messages?.forEach((msg: any) => {
          if (msg.role === 'user') {
            // Simple keyword extraction (can be improved with NLP)
            const keywords = msg.content.toLowerCase()
              .match(/\b(product|price|delivery|order|payment|return|refund|stock|available)\b/g);
            if (keywords) {
              keywords.forEach((k: string) => topics.add(k));
            }
          }
        });
      });

      return {
        firstContact: new Date(customer.first_contact),
        lastContact: new Date(customer.last_contact),
        totalConversations: customer.conversation_ids?.length || 0,
        totalMessages,
        averageResponseTime,
        commonTopics: Array.from(topics)
      };
    } catch (error) {
      console.error('Error getting customer insights:', error);
      return null;
    }
  }
}

// Export a factory function to create service instances
export const createWhatsAppService = (storeId: string) => {
  return new WhatsAppIntegrationService(storeId);
};