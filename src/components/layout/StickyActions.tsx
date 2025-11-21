/**
 * Sticky Actions Bar
 * Bottom (mobile) / top-right (desktop) action buttons
 * Auto-hides when modals are open
 */

import React from 'react';
import './StickyActions.css';

interface StickyActionsProps {
  onRecordSale: () => void;
  onScan?: () => void;
  onAddItem: () => void;
  hidden?: boolean;
}

export function StickyActions({
  onRecordSale,
  onScan,
  onAddItem,
  hidden = false
}: StickyActionsProps) {
  if (hidden) return null;

  return (
    <div className="sticky-actions">
      <button
        type="button"
        className="sticky-action-btn sticky-action-primary"
        onClick={onRecordSale}
        aria-label="Record Sale"
      >
        <span className="sticky-action-icon">₦</span>
        <span className="sticky-action-label">Record Sale</span>
      </button>

      {onScan && (
        <button
          type="button"
          className="sticky-action-btn sticky-action-secondary"
          onClick={onScan}
          aria-label="Scan Item"
        >
          <span className="sticky-action-icon">📷</span>
          <span className="sticky-action-label">Scan</span>
        </button>
      )}

      <button
        type="button"
        className="sticky-action-btn sticky-action-secondary"
        onClick={onAddItem}
        aria-label="Add Item"
      >
        <span className="sticky-action-icon">+</span>
        <span className="sticky-action-label">Add Item</span>
      </button>
    </div>
  );
}
