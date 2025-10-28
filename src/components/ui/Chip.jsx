import React from 'react';

/**
 * Chip - A tappable filter chip component
 * @param {boolean} active - Whether the chip is currently selected
 * @param {string} className - Additional CSS classes
 * @param {object} rest - Other button props
 */
export default function Chip({ active, className = '', ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      className={'chip' + (active ? ' chip--active' : '') + (className ? ' ' + className : '')}
      role="radio"
      aria-checked={!!active}
    />
  );
}
