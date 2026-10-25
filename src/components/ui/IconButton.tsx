import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, className = '', ...rest }: Props) {
  return (
    <button {...rest} className={`ds-icon-btn ${className}`.trim()} aria-label={label} title={label}>
      {icon}
    </button>
  );
}
