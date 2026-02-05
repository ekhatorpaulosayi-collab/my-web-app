/**
 * Standalone Logger - No dependencies, no circular imports
 * This module handles console logging with dev/production awareness
 * and queues error logs for async submission to Supabase
 */

// Queue for error logs that will be sent to Supabase asynchronously
let errorQueue: Array<{
  error: any;
  errorType: string;
  severity: string;
  context?: Record<string, any>;
}> = [];

let isProcessingQueue = false;

/**
 * Log to console (dev only)
 */
export function log(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
}

/**
 * Warn to console (dev only)
 */
export function warn(...args: any[]): void {
  if (import.meta.env.DEV) {
    console.warn(...args);
  }
}

/**
 * Error to console (always logs in production)
 */
export function error(...args: any[]): void {
  console.error(...args);
}

/**
 * Queue an error for async logging to Supabase
 * This doesn't import Supabase directly, avoiding circular dependencies
 */
export function queueError(
  err: any,
  errorType: string,
  severity: string,
  context?: Record<string, any>
): void {
  errorQueue.push({ error: err, errorType, severity, context });

  // Process queue after a short delay (batching)
  if (!isProcessingQueue) {
    setTimeout(processErrorQueue, 1000);
  }
}

/**
 * Process queued errors by dynamically importing errorMonitoring
 * This lazy import breaks the circular dependency
 */
async function processErrorQueue(): Promise<void> {
  if (isProcessingQueue || errorQueue.length === 0) return;

  isProcessingQueue = true;
  const batch = [...errorQueue];
  errorQueue = [];

  try {
    // Lazy import - only loads when actually needed
    const { logError } = await import('./errorMonitoring');

    // Process all queued errors
    for (const item of batch) {
      try {
        await logError(item.error, item.errorType as any, item.severity as any, item.context);
      } catch (err) {
        // Silent fail - don't crash the app
        if (import.meta.env.DEV) {
          console.error('[Logger] Failed to log error:', err);
        }
      }
    }
  } catch (err) {
    // If errorMonitoring fails to load, just log to console
    if (import.meta.env.DEV) {
      console.error('[Logger] Could not load errorMonitoring module:', err);
    }
  } finally {
    isProcessingQueue = false;

    // If more errors queued while processing, schedule another batch
    if (errorQueue.length > 0) {
      setTimeout(processErrorQueue, 1000);
    }
  }
}

/**
 * Force immediate processing of error queue (e.g., before page unload)
 */
export async function flushErrorQueue(): Promise<void> {
  if (errorQueue.length > 0) {
    await processErrorQueue();
  }
}
