import React, { useState, useRef, useEffect, useMemo } from 'react';
import { formatNGN } from '../../utils/currency';
import { getStockIndicator } from '../../utils/stockSettings';

export interface ItemOption {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  price: number;
  stock: number;
  thumbnailUrl?: string;
}

interface ItemComboboxProps {
  items: ItemOption[];
  onSelect: (item: ItemOption) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

export const ItemCombobox: React.FC<ItemComboboxProps> = ({
  items,
  onSelect,
  autoFocus = false,
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 50);
    const needle = query.toLowerCase();
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.sku?.toLowerCase().includes(needle) ||
          item.barcode?.toLowerCase().includes(needle)
      )
      .slice(0, 50);
  }, [query, items]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered]);

  const handleSelect = (item: ItemOption) => {
    console.log('[ItemCombobox handleSelect] Item clicked:', item);
    onSelect(item);
    console.log('[ItemCombobox handleSelect] onSelect called');
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && filtered.length > 0 && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      e.preventDefault();
      return;
    }

    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex((i) => Math.min(filtered.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setQuery('');
        break;
    }
  };

  useEffect(() => {
    if (isOpen && listRef.current && highlightIndex >= 0) {
      const highlighted = listRef.current.children[highlightIndex] as HTMLElement;
      highlighted?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);

  return (
    <div className="item-combobox">
      <label htmlFor="item-search" className="sales-label">
        Search or Select Item
      </label>
      <div className="combobox-wrapper">
        <input
          ref={inputRef}
          id="item-search"
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="item-list"
          aria-activedescendant={
            filtered[highlightIndex] ? `item-${filtered[highlightIndex].id}` : undefined
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            // If field is empty, show dropdown immediately
            if (!query.trim()) {
              setIsOpen(true);
            }
          }}
          onClick={() => {
            // Also open on click to ensure dropdown shows
            setIsOpen(true);
          }}
          onBlur={() => {
            // Delay closing to allow click events to fire
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Click to browse or type to search..."
          className="combobox-input"
          disabled={disabled}
          autoComplete="off"
        />
        <span className="combobox-icon">🔍</span>
      </div>

      {isOpen && filtered.length > 0 && (
        <div ref={listRef} id="item-list" role="listbox" className="combobox-list">
          {filtered.map((item, idx) => {
            const indicator = getStockIndicator(item.stock);
            return (
              <button
                key={item.id}
                id={`item-${item.id}`}
                role="option"
                aria-selected={idx === highlightIndex}
                className={`combobox-option ${idx === highlightIndex ? 'highlighted' : ''}`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input from losing focus
                  handleSelect(item);
                }}
                type="button"
              >
                <div className="option-main">
                  <span className="option-name">{item.name}</span>
                  {item.sku && <span className="option-sku">SKU: {item.sku}</span>}
                </div>
                <div className="option-meta">
                  <span className="option-stock">
                    {indicator.emoji} {item.stock}
                  </span>
                  <span className="option-price">{formatNGN(item.price)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && query && filtered.length === 0 && (
        <div className="combobox-empty">No items found for "{query}"</div>
      )}
    </div>
  );
};
