import type { ButtonHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function FilterPill({ selected = false, children, className = '', ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`ds-chip${selected ? ' is-selected' : ''} ${className}`.trim()}
      aria-pressed={selected}
    >
      {selected && <Check size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export const Chip = FilterPill;
