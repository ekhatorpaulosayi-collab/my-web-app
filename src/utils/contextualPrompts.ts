/**
 * Contextual Prompts System
 *
 * Tracks user behavior and suggests relevant settings at the right time
 */

export interface Prompt {
  id: string;
  title: string;
  message: string;
  icon: string;
  action: string; // Route to navigate to
  trigger: PromptTrigger;
}

export interface PromptTrigger {
  type: 'sales' | 'products' | 'messages' | 'days';
  threshold: number;
  settingKey: keyof PromptSettings;
}

export interface PromptSettings {
  deliveryInfo: boolean;
  bankDetails: boolean;
  businessHours: boolean;
  logo: boolean;
}

export interface UsageStats {
  salesCount: number;
  productCount: number;
  messageCount: number;
  daysActive: number;
}

const DISMISSED_PROMPTS_KEY = 'storehouse:dismissed-prompts';
const PROMPT_COOLDOWN_KEY = 'storehouse:prompt-cooldown';

/**
 * All available contextual prompts
 */
export const CONTEXTUAL_PROMPTS: Prompt[] = [
  {
    id: 'delivery-info',
    title: 'Add Delivery Information',
    message: 'Help customers know where you deliver and how much it costs',
    icon: '🚚',
    action: '/settings#delivery',
    trigger: {
      type: 'products',
      threshold: 1,
      settingKey: 'deliveryInfo',
    },
  },
  {
    id: 'bank-details',
    title: 'Add Payment Details',
    message: 'Make it easier for customers to pay you',
    icon: '💳',
    action: '/settings#payment',
    trigger: {
      type: 'sales',
      threshold: 5,
      settingKey: 'bankDetails',
    },
  },
  {
    id: 'business-hours',
    title: 'Set Business Hours',
    message: 'Let customers know when you\'re available',
    icon: '⏰',
    action: '/settings#hours',
    trigger: {
      type: 'sales',
      threshold: 10,
      settingKey: 'businessHours',
    },
  },
  {
    id: 'store-logo',
    title: 'Add a Logo',
    message: 'Look more professional and build trust with customers',
    icon: '📸',
    action: '/settings#logo',
    trigger: {
      type: 'sales',
      threshold: 20,
      settingKey: 'logo',
    },
  },
  // Additional prompts for edge cases
  {
    id: 'about-business',
    title: 'Tell Your Story',
    message: 'Add an "About Us" section to build customer trust',
    icon: '📝',
    action: '/settings#about',
    trigger: {
      type: 'days',
      threshold: 3,
      settingKey: 'deliveryInfo', // Reusing key as proxy for completeness
    },
  },
  {
    id: 'social-media',
    title: 'Connect Social Media',
    message: 'Link your Instagram or Facebook to grow your audience',
    icon: '📱',
    action: '/settings#social',
    trigger: {
      type: 'sales',
      threshold: 15,
      settingKey: 'deliveryInfo', // Reusing key as proxy
    },
  },
];

/**
 * Get dismissed prompts from localStorage
 */
export function getDismissedPrompts(): string[] {
  try {
    const dismissed = localStorage.getItem(DISMISSED_PROMPTS_KEY);
    return dismissed ? JSON.parse(dismissed) : [];
  } catch {
    return [];
  }
}

/**
 * Dismiss a prompt (user clicked "Later")
 */
export function dismissPrompt(promptId: string): void {
  try {
    const dismissed = getDismissedPrompts();
    if (!dismissed.includes(promptId)) {
      dismissed.push(promptId);
      localStorage.setItem(DISMISSED_PROMPTS_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error('Error dismissing prompt:', error);
  }
}

/**
 * Check if prompt was dismissed
 */
export function isPromptDismissed(promptId: string): boolean {
  return getDismissedPrompts().includes(promptId);
}

/**
 * Get cooldown timestamp for prompts
 * Prevents showing prompts too frequently
 */
export function getPromptCooldown(): number {
  try {
    const cooldown = localStorage.getItem(PROMPT_COOLDOWN_KEY);
    return cooldown ? parseInt(cooldown, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Set cooldown period (24 hours) before showing next prompt
 */
export function setPromptCooldown(): void {
  try {
    const tomorrow = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem(PROMPT_COOLDOWN_KEY, tomorrow.toString());
  } catch (error) {
    console.error('Error setting cooldown:', error);
  }
}

/**
 * Check if we're in cooldown period
 */
export function isInCooldown(): boolean {
  const cooldown = getPromptCooldown();
  return Date.now() < cooldown;
}

/**
 * Get the next prompt to show based on usage stats and settings
 */
export function getNextPrompt(
  stats: UsageStats,
  settings: PromptSettings
): Prompt | null {
  // Don't show prompts if in cooldown
  if (isInCooldown()) {
    return null;
  }

  // Find first eligible prompt
  for (const prompt of CONTEXTUAL_PROMPTS) {
    // Skip if already dismissed
    if (isPromptDismissed(prompt.id)) {
      continue;
    }

    // Skip if setting is already configured
    if (settings[prompt.trigger.settingKey]) {
      continue;
    }

    // Check if threshold is met
    let currentValue = 0;
    switch (prompt.trigger.type) {
      case 'sales':
        currentValue = stats.salesCount;
        break;
      case 'products':
        currentValue = stats.productCount;
        break;
      case 'messages':
        currentValue = stats.messageCount;
        break;
      case 'days':
        currentValue = stats.daysActive;
        break;
    }

    // Return prompt if threshold met
    if (currentValue >= prompt.trigger.threshold) {
      return prompt;
    }
  }

  return null;
}

/**
 * Mark a prompt as completed (setting was configured)
 */
export function markPromptCompleted(promptId: string): void {
  // Remove from dismissed list since it's now completed
  try {
    const dismissed = getDismissedPrompts();
    const filtered = dismissed.filter(id => id !== promptId);
    localStorage.setItem(DISMISSED_PROMPTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error marking prompt completed:', error);
  }
}

/**
 * Reset all prompts (for testing)
 */
export function resetAllPrompts(): void {
  try {
    localStorage.removeItem(DISMISSED_PROMPTS_KEY);
    localStorage.removeItem(PROMPT_COOLDOWN_KEY);
  } catch (error) {
    console.error('Error resetting prompts:', error);
  }
}
