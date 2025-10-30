// src/components/IconButton.tsx
import React from 'react';

type Props = {
  ariaLabel: string;
  title?: string;
  onClick?: () => void;
  children: React.ReactNode; // SVG goes here
  className?: string;
};

export default function IconButton({ ariaLabel, title, onClick, children, className }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      onClick={onClick}
      className={`sh-iconbtn ${className ?? ''}`}
    >
      <span className="sh-iconbtn__inner">{children}</span>
    </button>
  );
}
