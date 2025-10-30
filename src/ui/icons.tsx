// src/ui/icons.tsx
import React from 'react';

export function CalculatorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Minimal frame */}
      <rect x="6" y="4" width="12" height="16" rx="2" />
      {/* Display - single bar */}
      <rect x="8" y="6.5" width="8" height="2" rx="0.5" fill="currentColor" />
      {/* Just 3 button dots - absolute minimum */}
      <circle cx="9" cy="14.5" r="1" fill="currentColor" />
      <circle cx="12" cy="14.5" r="1" fill="currentColor" />
      <circle cx="15" cy="14.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      {/* Outer gear with 8 teeth */}
      <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
