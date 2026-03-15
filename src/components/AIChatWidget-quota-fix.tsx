// ADD THIS TO AIChatWidget.tsx in the error handling section (around line 606)

    } catch (error: any) {
      console.error('Chat error:', error);

      // INCREMENT FAILED ATTEMPTS
      setFailedAttempts(prev => prev + 1);

      // CHECK IF IT'S A QUOTA ERROR (429 status)
      // The Edge Function returns quota info in the error response
      let errorMessage = 'Sorry, something went wrong. Please try again.';

      // Parse the error to check for quota exceeded
      if (error.message && error.message.includes('429')) {
        // It's a quota error
        errorMessage = '📊 Monthly chat limit reached!';

        // Try to get quota details from the response
        try {
          // The error might contain JSON data about the quota
          const errorData = JSON.parse(error.message);
          if (errorData.chatLimit && errorData.chatsUsed) {
            errorMessage = `📊 You've used ${errorData.chatsUsed}/${errorData.chatLimit} AI chats this month.\n\n🚀 Upgrade your plan for more chats!`;
          }
        } catch (e) {
          // Fallback message if parsing fails
          errorMessage = '📊 Monthly AI chat limit reached!\n\n🚀 Upgrade your plan for unlimited conversations.';
        }
      }

      // Show the appropriate error message
      const errorMsg: Message = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
        // Add upgrade button if it's a quota error
        quickActions: error.message?.includes('429') ? [{
          label: '🚀 Upgrade Plan',
          action: () => window.location.href = '/subscription-plans'
        }] : undefined,
      };
      setMessages(prev => [...prev, errorMsg]);

// ALSO ADD A QUOTA DISPLAY IN THE HEADER (around line 692)

<div style={{ fontSize: '0.75rem', opacity: 0.9 }}>
  {userType === 'visitor' ? 'Your Business Growth Partner' :
   userType === 'shopper' ? `Shopping at ${storeInfo?.businessName || 'Store'}` :
   'AI-Powered Help'}
  {/* ADD THIS: Show quota if available */}
  {quotaInfo && quotaInfo.chat_limit > 0 && (
    <div style={{ marginTop: '4px', fontSize: '0.7rem', opacity: 0.8 }}>
      💬 {quotaInfo.remaining || 0} chats remaining this month
    </div>
  )}
</div>