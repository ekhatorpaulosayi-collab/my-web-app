/**
 * One-time migration utility
 * Syncs business type from localStorage to database for existing users
 */

import { supabase } from '../lib/supabase';

export async function migrateStoreTypeToDatabase(userId) {
  try {
    console.log('[Migration] Starting store_type migration for user:', userId);

    // Get business type from localStorage
    const localBusinessType = localStorage.getItem('storehouse_business_type');

    if (!localBusinessType) {
      console.log('[Migration] No business type found in localStorage');
      return { success: false, reason: 'no_local_type' };
    }

    console.log('[Migration] Found business type in localStorage:', localBusinessType);

    // Update users table with store_type
    const { data, error } = await supabase
      .from('users')
      .update({ store_type: localBusinessType })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('[Migration] Error updating store_type:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      return { success: false, error: error.message };
    }

    console.log('[Migration] Successfully migrated store_type to database:', data);
    return { success: true, storeType: localBusinessType };
  } catch (error) {
    console.error('[Migration] Exception during migration:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      fullError: error
    });
    return { success: false, error: error.message };
  }
}

/**
 * Check if migration is needed for current user
 */
export async function needsStoreTypeMigration(userId) {
  try {
    // Check if user has store_type in database
    const { data, error } = await supabase
      .from('users')
      .select('store_type')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[Migration] Error checking store_type:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        fullError: error
      });
      return true; // Assume migration needed if error
    }

    // If no store_type in database but exists in localStorage, migration needed
    const hasLocalType = !!localStorage.getItem('storehouse_business_type');
    const hasDbType = !!data?.store_type;

    return hasLocalType && !hasDbType;
  } catch (error) {
    console.error('[Migration] Exception checking migration status:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      fullError: error
    });
    return true;
  }
}
