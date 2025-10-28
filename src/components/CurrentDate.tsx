import React, { useState, useEffect, useRef } from 'react';
import { formatLongDate, getISODateString, msUntilMidnight } from '../utils/formatDate';

export interface CurrentDateProps {
  locale?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * CurrentDate Component
 *
 * Displays the current date in "Tuesday, October 28, 2025" format
 *
 * Features:
 * - SSR-safe (no hydration warnings)
 * - Auto-refreshes at midnight
 * - Respects user's locale and timezone
 * - Accessible with semantic HTML
 *
 * @example
 * ```tsx
 * <CurrentDate className="text-sm text-gray-600" />
 * ```
 */
export default function CurrentDate({ locale, className = '', style }: CurrentDateProps) {
  const [dateString, setDateString] = useState<string>('');
  const [isoDate, setIsoDate] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const midnightTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update date and schedule next update
  const updateDate = () => {
    const now = new Date();
    setDateString(formatLongDate(now, { locale }));
    setIsoDate(getISODateString(now));

    // Clear any existing timer
    if (midnightTimerRef.current) {
      clearTimeout(midnightTimerRef.current);
    }

    // Schedule update at next midnight
    const msUntilNext = msUntilMidnight(now);
    midnightTimerRef.current = setTimeout(() => {
      updateDate(); // Recursive call for next day
    }, msUntilNext);
  };

  // Initialize on mount (client-side only)
  useEffect(() => {
    setIsMounted(true);
    updateDate();

    // Cleanup timer on unmount
    return () => {
      if (midnightTimerRef.current) {
        clearTimeout(midnightTimerRef.current);
        midnightTimerRef.current = null;
      }
    };
  }, [locale]);

  // SSR: Render placeholder to avoid hydration mismatch
  if (!isMounted || !dateString) {
    return (
      <span
        className={className}
        style={style}
        aria-hidden="true"
      >
        {/* Empty placeholder for SSR */}
      </span>
    );
  }

  // Client: Render actual date
  return (
    <time
      dateTime={isoDate}
      aria-label="Today's date"
      className={className}
      style={style}
    >
      {dateString}
    </time>
  );
}
