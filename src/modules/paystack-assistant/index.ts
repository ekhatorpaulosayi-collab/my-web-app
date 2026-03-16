/**
 * Paystack Assistant Module
 *
 * Intelligent Q&A system for Paystack integration support
 * Provides contextual help without impacting existing functionality
 */

import paystackKnowledge from '../../data/paystack-knowledge.json';

interface KnowledgeEntry {
  id: string;
  category: string;
  priority: number;
  questions: string[];
  answer: string;
  followUp?: string;
  actionLinks?: string[];
  visualAid?: string;
  tags: string[];
}

interface MatchResult {
  entry: KnowledgeEntry;
  score: number;
  matchedKeywords: string[];
}

export class PaystackAssistant {
  private knowledge: KnowledgeEntry[];
  private enabled: boolean = false;
  private userContext: Map<string, any> = new Map();

  constructor() {
    this.knowledge = paystackKnowledge.knowledge as KnowledgeEntry[];
    this.enabled = this.checkFeatureFlag();
    this.initializeUserContext();
  }

  /**
   * Check if Paystack Assistant is enabled
   */
  private checkFeatureFlag(): boolean {
    // Check multiple sources for feature flag
    const localStorage = typeof window !== 'undefined' ? window.localStorage : null;

    // Check environment variable
    if (import.meta.env.VITE_PAYSTACK_ASSISTANT_ENABLED === 'true') {
      return true;
    }

    // Check localStorage flag
    if (localStorage?.getItem('paystack_assistant_enabled') === 'true') {
      return true;
    }

    // Check if user has Paystack configured
    if (localStorage?.getItem('paystack_keys_configured') === 'true') {
      return true;
    }

    return false;
  }

  /**
   * Initialize user context for personalized responses
   */
  private initializeUserContext(): void {
    if (typeof window === 'undefined') return;

    const localStorage = window.localStorage;

    // Check Paystack setup status
    const hasPaystackKeys = localStorage.getItem('paystack_public_key') !== null;
    const isTestMode = localStorage.getItem('paystack_test_mode') === 'true';
    const hasCompletedSetup = localStorage.getItem('paystack_setup_complete') === 'true';

    this.userContext.set('hasPaystackKeys', hasPaystackKeys);
    this.userContext.set('isTestMode', isTestMode);
    this.userContext.set('setupComplete', hasCompletedSetup);
    this.userContext.set('userStage', this.determineUserStage());
  }

  /**
   * Determine user's current stage in Paystack journey
   */
  private determineUserStage(): string {
    const hasKeys = this.userContext.get('hasPaystackKeys');
    const isTestMode = this.userContext.get('isTestMode');
    const setupComplete = this.userContext.get('setupComplete');

    if (!hasKeys) return 'newUser';
    if (hasKeys && isTestMode && !setupComplete) return 'setupInProgress';
    if (hasKeys && isTestMode && setupComplete) return 'testMode';
    if (hasKeys && !isTestMode && setupComplete) return 'liveMode';
    return 'unknown';
  }

  /**
   * Main method to answer user queries
   */
  async answer(query: string): Promise<{
    answer: string;
    followUp?: string;
    actionLinks?: string[];
    confidence: number;
  } | null> {
    if (!this.enabled) return null;

    // Check if query is Paystack-related
    if (!this.isPaystackRelated(query)) {
      return null;
    }

    // Find best matching knowledge entry
    const matches = this.findMatches(query);

    if (matches.length === 0) {
      return this.getDefaultResponse(query);
    }

    // Get the best match
    const bestMatch = matches[0];

    // If confidence is too low, provide general help
    if (bestMatch.score < 0.3) {
      return this.getDefaultResponse(query);
    }

    // Personalize the response based on user context
    const personalizedAnswer = this.personalizeResponse(
      bestMatch.entry.answer,
      bestMatch.entry
    );

    return {
      answer: personalizedAnswer,
      followUp: bestMatch.entry.followUp,
      actionLinks: bestMatch.entry.actionLinks,
      confidence: bestMatch.score
    };
  }

  /**
   * Check if query is related to Paystack
   */
  private isPaystackRelated(query: string): boolean {
    const paystackKeywords = [
      'paystack', 'payment', 'pay', 'card', 'transfer', 'money',
      'settlement', 'transaction', 'checkout', 'api key', 'secret key',
      'public key', 'test mode', 'live mode', 'refund', 'charge',
      'bank', 'account', 'customer', 'receipt', 'invoice', 'billing',
      'subscription', 'recurring', 'deposit', 'withdrawal', 'payout',
      'naira', 'ngn', 'kobo', 'fee', 'charge'
    ];

    const lowerQuery = query.toLowerCase();
    return paystackKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  /**
   * Find matching knowledge entries
   */
  private findMatches(query: string): MatchResult[] {
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/);
    const matches: MatchResult[] = [];

    for (const entry of this.knowledge) {
      let score = 0;
      const matchedKeywords: string[] = [];

      // Check exact question match
      for (const question of entry.questions) {
        if (question.toLowerCase() === lowerQuery) {
          score = 1.0; // Perfect match
          break;
        }

        // Check partial match
        const similarity = this.calculateSimilarity(lowerQuery, question.toLowerCase());
        if (similarity > score) {
          score = similarity;
        }
      }

      // Check keyword matches in tags
      for (const tag of entry.tags) {
        if (queryWords.includes(tag.toLowerCase())) {
          score += 0.2;
          matchedKeywords.push(tag);
        }
      }

      // Check category relevance
      if (lowerQuery.includes(entry.category)) {
        score += 0.1;
      }

      if (score > 0) {
        matches.push({ entry, score: Math.min(score, 1), matchedKeywords });
      }
    }

    // Sort by score (highest first) and priority
    matches.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.1) {
        return a.entry.priority - b.entry.priority;
      }
      return b.score - a.score;
    });

    return matches.slice(0, 3); // Return top 3 matches
  }

  /**
   * Calculate similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);

    let matches = 0;
    for (const word1 of words1) {
      if (words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }

    return matches / Math.max(words1.length, words2.length);
  }

  /**
   * Personalize response based on user context
   */
  private personalizeResponse(answer: string, entry: KnowledgeEntry): string {
    let personalizedAnswer = answer;
    const userStage = this.userContext.get('userStage');

    // Add contextual prefix based on user stage
    const contextPrefix = this.getContextPrefix(userStage, entry.category);
    if (contextPrefix) {
      personalizedAnswer = contextPrefix + '\n\n' + personalizedAnswer;
    }

    // Add contextual suffix for next steps
    const contextSuffix = this.getContextSuffix(userStage, entry.category);
    if (contextSuffix) {
      personalizedAnswer = personalizedAnswer + '\n\n' + contextSuffix;
    }

    return personalizedAnswer;
  }

  /**
   * Get contextual prefix based on user stage
   */
  private getContextPrefix(userStage: string, category: string): string {
    if (userStage === 'newUser' && category === 'getting-started') {
      return "👋 Welcome! I see you're new to Paystack. Let me help you get started:";
    }

    if (userStage === 'setupInProgress') {
      return "📝 I see you're still setting up Paystack. Let's continue:";
    }

    if (userStage === 'testMode') {
      return "🧪 You're in Test Mode - perfect for practice!";
    }

    return '';
  }

  /**
   * Get contextual suffix based on user stage
   */
  private getContextSuffix(userStage: string, category: string): string {
    if (userStage === 'newUser' && category === 'getting-started') {
      return "💡 Ready to start? Type 'create account' and I'll guide you step-by-step!";
    }

    if (userStage === 'setupInProgress' && category === 'account-setup') {
      return "✅ Once you complete this step, let me know and I'll help with the next one!";
    }

    if (userStage === 'testMode' && category === 'accepting-payments') {
      return "🎯 After testing successfully, type 'go live' to start accepting real payments!";
    }

    return '';
  }

  /**
   * Get default response when no good match is found
   */
  private getDefaultResponse(query: string): {
    answer: string;
    followUp?: string;
    actionLinks?: string[];
    confidence: number;
  } {
    const userStage = this.userContext.get('userStage');
    const contextualResponse = paystackKnowledge.contextualResponses[userStage as keyof typeof paystackKnowledge.contextualResponses];

    if (contextualResponse) {
      return {
        answer: contextualResponse,
        confidence: 0.5
      };
    }

    return {
      answer: `I can help you with Paystack payments! Here are some things I can assist with:

📝 **Getting Started**
• What is Paystack and how it works
• Creating your account
• Understanding fees and charges

⚙️ **Setup & Configuration**
• Finding your API keys
• Connecting to your store
• Test mode vs Live mode

💳 **Accepting Payments**
• Payment methods available
• Creating payment links
• Testing payments

💰 **Managing Money**
• Settlement schedules
• Checking transactions
• Processing refunds

🔧 **Troubleshooting**
• Fixing payment errors
• Handling disputes
• Security tips

What would you like to know about?`,
      followUp: 'Type your specific question or choose a topic above!',
      confidence: 0.3
    };
  }

  /**
   * Get suggested questions based on user context
   */
  getSuggestedQuestions(): string[] {
    const userStage = this.userContext.get('userStage');

    const suggestions: Record<string, string[]> = {
      newUser: [
        'What is Paystack?',
        'How much does Paystack charge?',
        'How do I create a Paystack account?'
      ],
      setupInProgress: [
        'Where do I find my API keys?',
        'How do I connect Paystack to my store?',
        'How do I test Paystack payment?'
      ],
      testMode: [
        'How do I go live with Paystack?',
        'What are the test card details?',
        'How do I switch to live mode?'
      ],
      liveMode: [
        'How do I check my transactions?',
        'When will I receive my money?',
        'How do I process refunds?'
      ],
      unknown: [
        'What is Paystack?',
        'How do I get started?',
        'How much are the fees?'
      ]
    };

    return suggestions[userStage as string] || suggestions.unknown;
  }

  /**
   * Track user interactions for improvement
   */
  trackInteraction(query: string, responseId: string, helpful: boolean): void {
    // Store feedback for future improvements
    const feedback = {
      query,
      responseId,
      helpful,
      timestamp: Date.now(),
      userStage: this.userContext.get('userStage')
    };

    // Store in localStorage for now (can be sent to backend later)
    const existingFeedback = JSON.parse(
      localStorage.getItem('paystack_assistant_feedback') || '[]'
    );
    existingFeedback.push(feedback);

    // Keep only last 50 feedback entries
    if (existingFeedback.length > 50) {
      existingFeedback.shift();
    }

    localStorage.setItem('paystack_assistant_feedback', JSON.stringify(existingFeedback));
  }
}

// Export singleton instance
export const paystackAssistant = new PaystackAssistant();