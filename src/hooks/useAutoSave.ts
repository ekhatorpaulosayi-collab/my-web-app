import { useState, useEffect, useCallback, useRef } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  delay?: number; // Delay in ms before saving (default: 1000ms)
}

/**
 * Auto-save hook with debouncing and status tracking
 *
 * Automatically saves data after user stops editing for a specified delay
 * Shows visual feedback: Saving... → Saved ✓
 */
export function useAutoSave<T>({ data, onSave, delay = 1000 }: UseAutoSaveOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);

  // Save function with error handling
  const save = useCallback(async () => {
    setSaveStatus('saving');
    setError(null);

    try {
      await onSave(data);
      setSaveStatus('saved');

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to save');

      // Reset to idle after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setError(null);
      }, 3000);
    }
  }, [data, onSave]);

  // Debounced auto-save effect
  useEffect(() => {
    // Skip if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout to save after delay
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Update previous data ref
    previousDataRef.current = data;

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save]);

  return {
    saveStatus,
    error,
    forceSave: save, // Allow manual save trigger
  };
}

/**
 * Get status message for display
 */
export function getSaveStatusMessage(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return 'Saving...';
    case 'saved':
      return 'Saved ✓';
    case 'error':
      return 'Failed to save';
    default:
      return '';
  }
}

/**
 * Get status color for display
 */
export function getSaveStatusColor(status: SaveStatus): string {
  switch (status) {
    case 'saving':
      return '#667eea';
    case 'saved':
      return '#10B981';
    case 'error':
      return '#DC2626';
    default:
      return '#6B7280';
  }
}
