/**
 * Sentry Error Monitoring Configuration
 *
 * Provides production-grade error tracking with:
 * - Automatic error grouping
 * - Source maps for debugging
 * - Release tracking
 * - Performance monitoring
 * - User session tracking
 */

import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry error monitoring
 * Only runs in production to avoid noise in development
 */
export function initializeSentry() {
  const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
  const ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;

  // Only initialize if DSN is provided
  if (!SENTRY_DSN) {
    if (import.meta.env.DEV) {
      console.log('[Sentry] No DSN provided, skipping initialization');
    }
    return;
  }

  // Only enable in production by default (can override with VITE_SENTRY_ENABLED=true)
  const shouldEnable = import.meta.env.VITE_SENTRY_ENABLED === 'true' || import.meta.env.PROD;

  if (!shouldEnable) {
    console.log('[Sentry] Disabled in development mode');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Integrations
    integrations: [
      // Browser profiling
      Sentry.browserTracingIntegration(),

      // Replay user sessions when errors occur
      Sentry.replayIntegration({
        maskAllText: true, // Hide sensitive text
        blockAllMedia: true, // Hide images/videos for privacy
      }),

      // Capture console errors
      Sentry.captureConsoleIntegration({
        levels: ['error']
      }),
    ],

    // Performance Monitoring
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session Replay - only for errors
    replaysSessionSampleRate: 0, // Don't record normal sessions
    replaysOnErrorSampleRate: 1.0, // Record 100% of sessions with errors

    // Release tracking (uses git commit hash if available)
    release: import.meta.env.VITE_SENTRY_RELEASE || 'storehouse@1.0.0',

    // Ignore common non-critical errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors that users can't control
      'NetworkError',
      'Network request failed',
      'Failed to fetch',

      // ResizeObserver errors (benign)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',

      // Non-critical errors
      'Non-Error promise rejection captured',
    ],

    // Sanitize data before sending to Sentry
    beforeSend(event, hint) {
      // Don't send errors in development (unless explicitly enabled)
      if (import.meta.env.DEV && import.meta.env.VITE_SENTRY_ENABLED !== 'true') {
        console.log('[Sentry] Event suppressed in development:', event);
        return null;
      }

      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;

        // Sanitize headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
      }

      // Remove sensitive context data
      if (event.contexts?.user) {
        delete event.contexts.user.ip_address;
      }

      return event;
    },

    // Customize breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't send console.log breadcrumbs in production
      if (breadcrumb.category === 'console' && breadcrumb.level !== 'error') {
        return null;
      }

      return breadcrumb;
    },
  });

  console.log('[Sentry] Initialized successfully in', ENVIRONMENT, 'environment');
}

/**
 * Manually capture an error to Sentry
 * Use this for caught errors that you want to track
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context for error tracking
 * Call this after user logs in
 */
export function setUserContext(user: { id: string; email?: string; name?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
}

/**
 * Clear user context
 * Call this when user logs out
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add custom tags to errors
 * Useful for filtering errors in Sentry dashboard
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Add breadcrumb (user action before error)
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'user-action',
    level: 'info',
    data,
  });
}

/**
 * Wrap async function with Sentry error boundary
 */
export function withSentry<T extends (...args: any[]) => any>(fn: T): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);

      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureError(error);
          throw error;
        });
      }

      return result;
    } catch (error) {
      captureError(error as Error);
      throw error;
    }
  }) as T;
}
