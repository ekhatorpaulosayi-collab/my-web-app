import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getItems, getSales } from '../db/idb';
import {
  getNextPrompt,
  type Prompt,
  type UsageStats,
  type PromptSettings,
} from '../utils/contextualPrompts';
/**
 * Hook to manage contextual prompts
 *
 * Tracks user behavior and suggests relevant settings at the right time
 */
export function useContextualPrompts() {
  const { currentUser } = useAuth();
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const checkPrompts = async () => {
      try {
        // Load usage stats
        const stats = await loadUsageStats();

        // Load prompt settings (what's already configured)
        const settings = await loadPromptSettings(currentUser.uid);

        // Get next prompt to show
        const prompt = getNextPrompt(stats, settings);

        setCurrentPrompt(prompt);
      } catch (error) {
        console.error('Error checking prompts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Check prompts after a delay to not interfere with initial load
    const timer = setTimeout(checkPrompts, 3000);

    return () => clearTimeout(timer);
  }, [currentUser]);

  return {
    prompt: currentPrompt,
    isLoading,
    dismissPrompt: () => setCurrentPrompt(null),
  };
}

/**
 * Load usage statistics from IndexedDB
 */
async function loadUsageStats(): Promise<UsageStats> {
  try {
    const [items, sales] = await Promise.all([
      getItems(),
      getSales(),
    ]);

    return {
      salesCount: sales?.length || 0,
      productCount: items?.length || 0,
      messageCount: 0, // TODO: Track WhatsApp message count if needed
      daysActive: calculateDaysActive(),
    };
  } catch (error) {
    console.error('Error loading usage stats:', error);
    return {
      salesCount: 0,
      productCount: 0,
      messageCount: 0,
      daysActive: 0,
    };
  }
}

/**
 * Calculate days since first use
 */
function calculateDaysActive(): number {
  try {
    const firstUseKey = 'storehouse:first-use';
    let firstUse = localStorage.getItem(firstUseKey);

    if (!firstUse) {
      // Set first use to today
      firstUse = Date.now().toString();
      localStorage.setItem(firstUseKey, firstUse);
      return 0;
    }

    const daysSince = Math.floor((Date.now() - parseInt(firstUse, 10)) / (24 * 60 * 60 * 1000));
    return daysSince;
  } catch {
    return 0;
  }
}

/**
 * Load prompt settings from Supabase
 */
async function loadPromptSettings(userId: string): Promise<PromptSettings> {
  try {
    const { data: storeData, error } = await supabase
      .from('stores')
      .select('id, delivery_areas, business_hours, days_of_operation, logo_url')
      .eq('user_id', userId)
      .single();

    if (error || !storeData) {
      console.debug('[Prompts] No store found, using defaults');
      return {
        deliveryInfo: false,
        bankDetails: false,
        businessHours: false,
        logo: false,
      };
    }

    const { data: bank } = await supabase
      .from('store_bank_details')
      .select('bank_name, account_number')
      .eq('store_id', storeData.id)
      .maybeSingle();

    return {
      deliveryInfo: Array.isArray(storeData.delivery_areas) && storeData.delivery_areas.length > 0,
      bankDetails: !!(bank?.bank_name && bank?.account_number),
      businessHours: !!(storeData.business_hours || (Array.isArray(storeData.days_of_operation) && storeData.days_of_operation.length > 0)),
      logo: !!storeData.logo_url,
    };
  } catch (error) {
    console.error('[Prompts] Error loading prompt settings:', error);
    return {
      deliveryInfo: false,
      bankDetails: false,
      businessHours: false,
      logo: false,
    };
  }
}
