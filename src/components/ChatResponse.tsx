import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, X, Mail, Phone, User, Clock, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface ChatResponseProps {
  conversation: {
    session_id: string;
    store_id: string;
    visitor_name?: string;
    visitor_email?: string;
    visitor_phone?: string;
    messages: Array<{
      role: 'user' | 'assistant' | 'owner';
      content: string;
      created_at: string;
    }>;
    last_message_at: string;
  };
  onClose: () => void;
  onMessageSent?: () => void;
}

export const ChatResponse: React.FC<ChatResponseProps> = ({
  conversation,
  onClose,
  onMessageSent
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState(conversation.messages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showNotificationOptions, setShowNotificationOptions] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    const subscription = supabase
      .channel(`chat-${conversation.session_id}`)
      .on('postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_messages',
          filter: `session_id=eq.${conversation.session_id}`
        },
        (payload) => {
          // Add new message to the conversation
          const newMessage = {
            role: payload.new.role as 'user' | 'assistant' | 'owner',
            content: payload.new.content,
            created_at: payload.new.created_at
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversation.session_id]);

  // Send message as store owner
  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      // Save owner's message to database
      const { error } = await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: conversation.session_id,
          store_id: conversation.store_id,
          user_id: user?.id,
          role: 'owner', // Special role for store owner responses
          content: message.trim(),
          context_type: 'owner_response',
          metadata: {
            sender_name: 'Store Owner',
            response_to: conversation.visitor_name || 'Customer'
          }
        });

      if (error) throw error;

      // Add message to local state immediately
      setMessages(prev => [...prev, {
        role: 'owner',
        content: message.trim(),
        created_at: new Date().toISOString()
      }]);

      // Clear input
      setMessage('');

      // Notify parent component
      if (onMessageSent) {
        onMessageSent();
      }

      // Send notification if customer provided contact info
      if (showNotificationOptions) {
        await sendNotification();
      }

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Send notification via email/SMS
  const sendNotification = async () => {
    if (conversation.visitor_email) {
      // Send email notification
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            to: conversation.visitor_email,
            subject: 'New message from store owner',
            html: `
              <h3>You have a new message!</h3>
              <p><strong>From:</strong> Store Owner</p>
              <p><strong>Message:</strong> ${message}</p>
              <p>Visit the store to continue the conversation.</p>
            `
          }
        });
      } catch (error) {
        console.error('Email notification failed:', error);
      }
    }

    if (conversation.visitor_phone) {
      // Send SMS notification (if SMS service is configured)
      console.log('SMS notification to:', conversation.visitor_phone);
    }
  };

  // Format message time
  const formatMessageTime = (dateStr: string) => {
    return format(new Date(dateStr), 'HH:mm');
  };

  // Handle Enter key to send
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Chat with {conversation.visitor_name || 'Customer'}
            </h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-green-100">
              {conversation.visitor_email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {conversation.visitor_email}
                </span>
              )}
              {conversation.visitor_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {conversation.visitor_phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Session: {conversation.session_id.substring(0, 8)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 bg-gray-50">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === 'user' ? 'justify-start' : 'justify-end'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : msg.role === 'owner'
                    ? 'bg-blue-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                <div className="flex items-start gap-2">
                  {msg.role === 'user' && (
                    <User className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-xs mt-1 ${
                      msg.role === 'user' ? 'text-gray-500' : 'text-opacity-80'
                    }`}>
                      {formatMessageTime(msg.created_at)}
                      {msg.role === 'owner' && ' • You'}
                      {msg.role === 'assistant' && ' • AI Assistant'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-white rounded-b-lg">
          {/* Notification Options */}
          {(conversation.visitor_email || conversation.visitor_phone) && (
            <div className="mb-3 flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showNotificationOptions}
                  onChange={(e) => setShowNotificationOptions(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Send notification to customer
                {conversation.visitor_email && ' (Email)'}
                {conversation.visitor_phone && ' (SMS)'}
              </label>
            </div>
          )}

          {/* Message Input */}
          <div className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 px-4 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              rows={2}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                !message.trim() || sending
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send
                </>
              )}
            </button>
          </div>

          {/* Quick Replies */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setMessage('Thank you for contacting us! How can I help you today?')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              Greeting
            </button>
            <button
              onClick={() => setMessage('I\'ll check on that for you right away.')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              Checking
            </button>
            <button
              onClick={() => setMessage('Is there anything else I can help you with?')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              Follow-up
            </button>
            <button
              onClick={() => setMessage('Please feel free to reach out if you need any assistance!')}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full"
            >
              Closing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};