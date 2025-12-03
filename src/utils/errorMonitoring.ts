/**
 * Error Monitoring and Tracking System
 * Logs errors to Supabase for monitoring and analysis
 */

import { supabase } from '../lib/supabase';

export interface ErrorLog {
  id?: string;
  error_type: 'auth' | 'network' | 'api' | 'ui' | 'unknown';
  error_code?: string;
  error_message: string;
  error_stack?: string;
  user_id?: string;
  user_email?: string;
  page_url: string;
  user_agent: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
  resolved: boolean;
}

export interface LoginAttempt {
  id?: string;
  email: string;
  success: boolean;
  error_message?: string;
  error_code?: string;
  ip_address?: string;
  user_agent: string;
  timestamp: string;
  attempt_number?: number;
}

/**
 * Log an error to Supabase error_logs table
 */
export async function logError(
  error: Error | any,
  errorType: ErrorLog['error_type'],
  severity: ErrorLog['severity'],
  context?: Record<string, any>
): Promise<void> {
  try {
    // Get current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    const errorLog: Omit<ErrorLog, 'id'> = {
      error_type: errorType,
      error_code: error.code || error.name || 'UNKNOWN',
      error_message: error.message || String(error),
      error_stack: error.stack || new Error().stack,
      user_id: user?.id,
      user_email: user?.email,
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      severity,
      context: context || {},
      resolved: false,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('[ErrorMonitoring]', errorLog);
    }

    // Send to Supabase (non-blocking)
    supabase
      .from('error_logs')
      .insert([errorLog])
      .then(({ error: dbError }) => {
        if (dbError) {
          console.error('[ErrorMonitoring] Failed to log error:', dbError);
        }
      });
  } catch (err) {
    // Silent fail - don't crash the app because of error logging
    console.error('[ErrorMonitoring] Error logging failed:', err);
  }
}

/**
 * Log a login attempt (success or failure)
 */
export async function logLoginAttempt(
  email: string,
  success: boolean,
  error?: Error | any
): Promise<void> {
  try {
    const loginAttempt: Omit<LoginAttempt, 'id'> = {
      email,
      success,
      error_message: error?.message,
      error_code: error?.code,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('[LoginMonitoring]', loginAttempt);
    }

    // Get recent failed attempts for this email (last 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('email', email)
      .eq('success', false)
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false });

    const attemptNumber = (recentAttempts?.length || 0) + 1;

    // Send to Supabase (non-blocking)
    supabase
      .from('login_attempts')
      .insert([{ ...loginAttempt, attempt_number: attemptNumber }])
      .then(({ error: dbError }) => {
        if (dbError) {
          console.error('[LoginMonitoring] Failed to log login attempt:', dbError);
        }
      });

    // Alert if multiple failed attempts (potential brute force)
    if (!success && attemptNumber >= 5) {
      console.warn(`[Security] Multiple failed login attempts for ${email}: ${attemptNumber} attempts in last hour`);

      // Log as critical security event
      logError(
        new Error(`Multiple failed login attempts: ${attemptNumber} attempts`),
        'auth',
        'critical',
        { email, attemptNumber, recentAttempts }
      );
    }
  } catch (err) {
    console.error('[LoginMonitoring] Error logging login attempt:', err);
  }
}

/**
 * Track page view with error context
 */
export function trackPageView(pageName: string): void {
  try {
    if (import.meta.env.DEV) {
      console.log('[PageTracking]', pageName, window.location.href);
    }

    // Store page visit in session for error context
    const pageViews = JSON.parse(sessionStorage.getItem('pageViews') || '[]');
    pageViews.push({
      page: pageName,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 10 pages
    if (pageViews.length > 10) {
      pageViews.shift();
    }

    sessionStorage.setItem('pageViews', JSON.stringify(pageViews));
  } catch (err) {
    console.error('[PageTracking] Error tracking page view:', err);
  }
}

/**
 * Get recent page views for error context
 */
export function getRecentPageViews(): any[] {
  try {
    return JSON.parse(sessionStorage.getItem('pageViews') || '[]');
  } catch {
    return [];
  }
}

/**
 * Monitor network connectivity issues
 */
export function monitorNetworkStatus(): () => void {
  let wasOffline = false;

  const handleOnline = () => {
    if (wasOffline) {
      console.log('[NetworkMonitoring] Connection restored');
      logError(
        new Error('User connection restored after offline period'),
        'network',
        'low',
        { event: 'online', previousState: 'offline' }
      );
    }
    wasOffline = false;
  };

  const handleOffline = () => {
    console.warn('[NetworkMonitoring] Connection lost');
    wasOffline = true;
    logError(
      new Error('User connection lost'),
      'network',
      'medium',
      { event: 'offline' }
    );
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

/**
 * Monitor unhandled promise rejections
 */
export function monitorUnhandledRejections(): () => void {
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error('[UnhandledRejection]', event.reason);

    logError(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      'unknown',
      'high',
      {
        type: 'unhandled_promise_rejection',
        promise: event.promise?.toString(),
      }
    );
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}

/**
 * Monitor global errors
 */
export function monitorGlobalErrors(): () => void {
  const handleError = (event: ErrorEvent) => {
    console.error('[GlobalError]', event.error);

    logError(
      event.error || new Error(event.message),
      'unknown',
      'high',
      {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  };

  window.addEventListener('error', handleError);

  return () => {
    window.removeEventListener('error', handleError);
  };
}

/**
 * Initialize all error monitoring
 */
export function initializeErrorMonitoring(): () => void {
  const cleanupFns = [
    monitorNetworkStatus(),
    monitorUnhandledRejections(),
    monitorGlobalErrors(),
  ];

  console.log('[ErrorMonitoring] Monitoring initialized');

  // Return cleanup function
  return () => {
    cleanupFns.forEach(fn => fn());
    console.log('[ErrorMonitoring] Monitoring stopped');
  };
}

/**
 * Get error statistics for dashboard
 */
export async function getErrorStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: ErrorLog[];
}> {
  try {
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - ranges[timeRange]).toISOString();

    const { data: errors, error } = await supabase
      .from('error_logs')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    errors?.forEach(err => {
      byType[err.error_type] = (byType[err.error_type] || 0) + 1;
      bySeverity[err.severity] = (bySeverity[err.severity] || 0) + 1;
    });

    return {
      total: errors?.length || 0,
      byType,
      bySeverity,
      recentErrors: errors?.slice(0, 10) || [],
    };
  } catch (err) {
    console.error('[ErrorMonitoring] Failed to get error stats:', err);
    return {
      total: 0,
      byType: {},
      bySeverity: {},
      recentErrors: [],
    };
  }
}

/**
 * Get login statistics
 */
export async function getLoginStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
  total: number;
  successful: number;
  failed: number;
  failureRate: number;
  recentFailures: LoginAttempt[];
}> {
  try {
    const ranges = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
    };

    const since = new Date(Date.now() - ranges[timeRange]).toISOString();

    const { data: attempts, error } = await supabase
      .from('login_attempts')
      .select('*')
      .gte('timestamp', since)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    const successful = attempts?.filter(a => a.success).length || 0;
    const failed = attempts?.filter(a => !a.success).length || 0;
    const total = attempts?.length || 0;

    return {
      total,
      successful,
      failed,
      failureRate: total > 0 ? (failed / total) * 100 : 0,
      recentFailures: attempts?.filter(a => !a.success).slice(0, 10) || [],
    };
  } catch (err) {
    console.error('[ErrorMonitoring] Failed to get login stats:', err);
    return {
      total: 0,
      successful: 0,
      failed: 0,
      failureRate: 0,
      recentFailures: [],
    };
  }
}
