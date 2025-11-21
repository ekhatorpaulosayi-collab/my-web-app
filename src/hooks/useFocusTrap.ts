/**
 * Focus trap hook for modal accessibility
 * Keeps focus within the modal while open
 */

import { useEffect, useRef } from 'react';

export const useFocusTrap = (active: boolean) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !ref.current) return;

    const element = ref.current;
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when modal opens
    setTimeout(() => firstElement?.focus(), 100);

    element.addEventListener('keydown', trapFocus);

    return () => {
      element.removeEventListener('keydown', trapFocus);
    };
  }, [active]);

  return ref;
};
