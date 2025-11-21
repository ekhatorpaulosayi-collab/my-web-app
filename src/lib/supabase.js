import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Validate Supabase config
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Missing configuration! Check environment variables.');
  console.error('[Supabase] Config:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceRoleKey,
  });
}

// Create Supabase client with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Auto-refresh tokens
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session from URL (for email confirmation links)
    detectSessionInUrl: true,
  },
  // Real-time subscriptions settings
  realtime: {
    // Enable real-time for inventory updates
    params: {
      eventsPerSecond: 10,
    },
  },
  // Global fetch options for performance
  global: {
    headers: {
      'x-client-info': 'storehouse-app',
    },
  },
  db: {
    // Schema to use (public is default)
    schema: 'public',
  },
});

// Log successful initialization
console.log('[Supabase] Client initialized successfully');
console.log('[Supabase] Project URL:', supabaseUrl);

// Helper function to check connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1);
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = table doesn't exist, which is fine for test
      throw error;
    }
    console.log('[Supabase] ✅ Connection test PASSED');
    return true;
  } catch (error) {
    console.error('[Supabase] ❌ Connection test FAILED:', error);
    return false;
  }
}

// Export for use in other files
export default supabase;
