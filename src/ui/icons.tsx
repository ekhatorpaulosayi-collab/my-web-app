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
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" {...props}>
      {/* Classic 8-tooth gear matching reference */}
      <path d="M10.8 2h2.4l.5 2.4 2-.9 1.7 1.7-.9 2 2.4.5v2.4l-2.4.5.9 2-1.7 1.7-2-.9-.5 2.4h-2.4l-.5-2.4-2 .9-1.7-1.7.9-2-2.4-.5V10.8l2.4-.5-.9-2 1.7-1.7 2 .9.5-2.4z" />
      {/* Center hole */}
      <circle cx="12" cy="12" r="3" fill="#ffffff20" />
      <circle cx="12" cy="12" r="2.5" fill="white" />
    </svg>
  );
}
