/**
 * Vanilla JS fallback for CurrentDate component
 *
 * Automatically populates any element with [data-current-date] attribute
 * with the formatted current date.
 *
 * Usage:
 * <span data-current-date></span>
 *
 * Include in HTML:
 * <script src="/date-fallback.js"></script>
 */

(function() {
  'use strict';

  /**
   * Format date to "Tuesday, October 28, 2025"
   */
  function formatLongDate(date) {
    try {
      // Use Intl.DateTimeFormat for proper formatting
      const formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      return formatter.format(date);
    } catch (error) {
      console.error('[date-fallback] Error formatting date:', error);
      // Fallback to basic format
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  }

  /**
   * Get ISO date string (YYYY-MM-DD)
   */
  function getISODateString(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calculate ms until next midnight
   */
  function msUntilMidnight(now) {
    const tomorrow = new Date(now);
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.getTime() - now.getTime();
  }

  /**
   * Update all elements with [data-current-date] attribute
   */
  function updateDateElements() {
    const now = new Date();
    const dateString = formatLongDate(now);
    const isoDate = getISODateString(now);

    // Find all elements with data-current-date attribute
    const elements = document.querySelectorAll('[data-current-date]');

    elements.forEach(function(element) {
      // Create or update time element
      if (element.tagName.toLowerCase() === 'time') {
        element.textContent = dateString;
        element.setAttribute('datetime', isoDate);
        element.setAttribute('aria-label', "Today's date");
      } else {
        // Wrap in time element for semantics
        const timeEl = document.createElement('time');
        timeEl.setAttribute('datetime', isoDate);
        timeEl.setAttribute('aria-label', "Today's date");
        timeEl.textContent = dateString;

        // Copy classes from parent
        const className = element.getAttribute('data-date-class') || element.className;
        if (className) {
          timeEl.className = className;
        }

        // Replace content
        element.innerHTML = '';
        element.appendChild(timeEl);
      }
    });

    // Schedule next update at midnight
    const msUntilNext = msUntilMidnight(now);
    setTimeout(updateDateElements, msUntilNext);
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateDateElements);
  } else {
    // DOM already loaded
    updateDateElements();
  }

  // Also update when page becomes visible (handles device sleep)
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      updateDateElements();
    }
  });
})();
