/**
 * Enhanced AI Chat Widget with Paystack Assistant Integration
 *
 * This is a safe enhancement that adds Paystack support without modifying the original
 * Simply import this instead of AIChatWidget when you want Paystack support
 */

import React from 'react';
import AIChatWidget from './AIChatWidget';
import { paystackAssistant } from '../modules/paystack-assistant';

interface EnhancedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isPaystackResponse?: boolean;
  actionLinks?: string[];
  confidence?: number;
}

/**
 * Enhanced AI Chat Widget that includes Paystack Assistant
 */
export function AIChatWidgetEnhanced(props: any) {
  const originalHandleMessage = props.onMessage;

  /**
   * Enhanced message handler that checks Paystack Assistant first
   */
  const handleMessageWithPaystack = async (message: string) => {
    // First, try Paystack Assistant for relevant queries
    try {
      const paystackResponse = await paystackAssistant.answer(message);

      if (paystackResponse && paystackResponse.confidence > 0.5) {
        // Format the Paystack response for display
        let formattedResponse = paystackResponse.answer;

        // Add follow-up question if available
        if (paystackResponse.followUp) {
          formattedResponse += `\n\n💡 ${paystackResponse.followUp}`;
        }

        // Add action links if available
        if (paystackResponse.actionLinks && paystackResponse.actionLinks.length > 0) {
          formattedResponse += '\n\n🔗 **Helpful Links:**';
          paystackResponse.actionLinks.forEach(link => {
            const linkText = link.includes('dashboard.paystack.com') ? 'Open Paystack Dashboard' : 'Learn More';
            formattedResponse += `\n• [${linkText}](${link})`;
          });
        }

        // Add suggested next questions
        const suggestions = paystackAssistant.getSuggestedQuestions();
        if (suggestions.length > 0) {
          formattedResponse += '\n\n**You might also want to know:**';
          suggestions.slice(0, 3).forEach(q => {
            formattedResponse += `\n• ${q}`;
          });
        }

        // Return the Paystack response
        return {
          role: 'assistant',
          content: formattedResponse,
          timestamp: new Date(),
          isPaystackResponse: true,
          confidence: paystackResponse.confidence
        };
      }
    } catch (error) {
      console.debug('[PaystackAssistant] Error or non-Paystack query:', error);
      // Continue with normal flow if there's an error
    }

    // Fall back to original handler if not a Paystack query
    if (originalHandleMessage) {
      return originalHandleMessage(message);
    }

    // Default response if no handler provided
    return null;
  };

  // Return the original component with enhanced handler
  return (
    <AIChatWidget
      {...props}
      onMessage={handleMessageWithPaystack}
      // Add Paystack-specific quick actions
      additionalQuickActions={[
        {
          label: '💳 Setup Paystack',
          action: () => handleMessageWithPaystack('How do I setup Paystack?')
        },
        {
          label: '🧪 Test Payment',
          action: () => handleMessageWithPaystack('How do I test Paystack payment?')
        },
        {
          label: '💰 Check Fees',
          action: () => handleMessageWithPaystack('What are Paystack fees?')
        }
      ]}
    />
  );
}

// Export as default for easy drop-in replacement
export default AIChatWidgetEnhanced;