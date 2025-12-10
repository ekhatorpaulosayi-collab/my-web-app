/**
 * Client-side Rate Limiter for Signup Prevention
 * Prevents spam signups by limiting attempts per IP/browser
 *
 * Strategy:
 * - Store attempt timestamps in localStorage
 * - Limit: 5 signups per hour per browser
 * - Clean old attempts automatically
 *
 * Note: This is client-side protection. For production, add server-side
 * rate limiting via Supabase Edge Functions or Cloudflare
 */

interface RateLimitAttempt {
  timestamp: number;
  email: string;
}

const RATE_LIMIT_KEY = 'storehouse_signup_attempts';
const MAX_ATTEMPTS = 5;
const TIME_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if signup is allowed based on rate limit
 * @returns Object with allowed status and remaining attempts
 */
export function checkSignupRateLimit(): { allowed: boolean; remaining: number; resetTime: number } {
  try {
    // Get existing attempts from localStorage
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const attempts: RateLimitAttempt[] = stored ? JSON.parse(stored) : [];

    // Remove expired attempts (older than 1 hour)
    const now = Date.now();
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < TIME_WINDOW_MS
    );

    // Calculate remaining attempts
    const remaining = Math.max(0, MAX_ATTEMPTS - validAttempts.length);
    const allowed = remaining > 0;

    // Calculate when rate limit resets
    const oldestAttempt = validAttempts[0];
    const resetTime = oldestAttempt
      ? oldestAttempt.timestamp + TIME_WINDOW_MS
      : now;

    return {
      allowed,
      remaining,
      resetTime
    };
  } catch (error) {
    // If localStorage fails, allow signup (fail open)
    console.warn('[RateLimit] Failed to check rate limit:', error);
    return {
      allowed: true,
      remaining: MAX_ATTEMPTS,
      resetTime: Date.now()
    };
  }
}

/**
 * Record a signup attempt
 * @param email Email used for signup
 */
export function recordSignupAttempt(email: string): void {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const attempts: RateLimitAttempt[] = stored ? JSON.parse(stored) : [];

    // Add new attempt
    attempts.push({
      timestamp: Date.now(),
      email
    });

    // Clean old attempts and save
    const now = Date.now();
    const validAttempts = attempts.filter(
      attempt => now - attempt.timestamp < TIME_WINDOW_MS
    );

    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(validAttempts));
  } catch (error) {
    console.warn('[RateLimit] Failed to record attempt:', error);
  }
}

/**
 * Get user-friendly error message for rate limit
 * @param resetTime Timestamp when rate limit resets
 * @returns Formatted error message
 */
export function getRateLimitMessage(resetTime: number): string {
  const minutesUntilReset = Math.ceil((resetTime - Date.now()) / (60 * 1000));

  if (minutesUntilReset < 1) {
    return 'Too many signup attempts. Please try again in a moment.';
  } else if (minutesUntilReset < 60) {
    return `Too many signup attempts. Please try again in ${minutesUntilReset} minute${minutesUntilReset > 1 ? 's' : ''}.`;
  } else {
    const hours = Math.ceil(minutesUntilReset / 60);
    return `Too many signup attempts. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
  }
}

/**
 * Clear rate limit data (for testing/debugging only)
 */
export function clearRateLimitData(): void {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
    console.log('[RateLimit] Rate limit data cleared');
  } catch (error) {
    console.warn('[RateLimit] Failed to clear rate limit data:', error);
  }
}
