/**
 * Variant Selector Component
 * Allows customers to select product variants (size, color, etc.)
 * Storehouse Design System - Consistent with app colors
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { ProductVariant } from '../types/variants';

interface VariantSelectorProps {
  variants: ProductVariant[];
  onVariantChange: (variant: ProductVariant | null) => void;
  selectedVariantId?: string;
  primaryColor?: string; // Store's custom brand color
}

export function VariantSelector({ variants, onVariantChange, selectedVariantId, primaryColor = '#3b82f6' }: VariantSelectorProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Extract unique option types and values from variants
  const variantOptions = useMemo(() => {
    if (!variants || variants.length === 0) return [];

    // Get all unique attribute keys (e.g., "size", "color")
    const attributeKeys = new Set<string>();
    variants.forEach(v => {
      Object.keys(v.attributes || {}).forEach(key => attributeKeys.add(key));
    });

    // Build options structure
    return Array.from(attributeKeys).map(key => {
      const values = new Set<string>();
      variants.forEach(v => {
        const value = v.attributes?.[key];
        if (value) values.add(value);
      });

      return {
        name: key,
        label: key.charAt(0).toUpperCase() + key.slice(1), // Capitalize first letter
        values: Array.from(values).sort()
      };
    });
  }, [variants]);

  // Find matching variant based on selected options
  const matchingVariant = useMemo(() => {
    if (Object.keys(selectedOptions).length === 0) return null;

    return variants.find(variant => {
      return Object.entries(selectedOptions).every(([key, value]) => {
        return variant.attributes?.[key] === value;
      });
    });
  }, [variants, selectedOptions]);

  // Notify parent when matching variant changes
  useEffect(() => {
    onVariantChange(matchingVariant || null);
  }, [matchingVariant, onVariantChange]);

  // Pre-select if selectedVariantId is provided
  useEffect(() => {
    if (selectedVariantId && variants) {
      const variant = variants.find(v => v.id === selectedVariantId);
      if (variant?.attributes) {
        setSelectedOptions(variant.attributes);
      }
    }
  }, [selectedVariantId, variants]);

  // Get available values for a specific option (considering other selections)
  const getAvailableValues = (optionName: string) => {
    const option = variantOptions.find(o => o.name === optionName);
    if (!option) return [];

    // Filter to only show values that have matching variants
    return option.values.filter(value => {
      const testOptions = { ...selectedOptions, [optionName]: value };

      return variants.some(variant => {
        return Object.entries(testOptions).every(([key, val]) => {
          return variant.attributes?.[key] === val;
        });
      });
    });
  };

  if (variantOptions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      {variantOptions.map((option) => {
        const availableValues = getAvailableValues(option.name);

        return (
          <div key={option.name} style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '8px'
            }}>
              {option.label}:
            </label>

            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {option.values.map((value) => {
                const isSelected = selectedOptions[option.name] === value;
                const isAvailable = availableValues.includes(value);

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (isAvailable) {
                        setSelectedOptions(prev => ({
                          ...prev,
                          [option.name]: value
                        }));
                      }
                    }}
                    disabled={!isAvailable}
                    style={{
                      padding: '8px 16px',
                      border: `2px solid ${isSelected ? primaryColor : '#e5e7eb'}`,
                      borderRadius: '8px',
                      background: isSelected ? primaryColor : isAvailable ? 'white' : '#f3f4f6',
                      color: isSelected ? 'white' : isAvailable ? '#1f2937' : '#9ca3af',
                      fontSize: '14px',
                      fontWeight: isSelected ? 600 : 500,
                      cursor: isAvailable ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                      opacity: isAvailable ? 1 : 0.5,
                      textDecoration: !isAvailable ? 'line-through' : 'none'
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Show selected variant info */}
      {matchingVariant && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '14px', color: '#16a34a', fontWeight: 600 }}>
            ✓ {matchingVariant.variant_name}
          </div>
          {matchingVariant.quantity > 0 ? (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {matchingVariant.quantity} in stock
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', fontWeight: 600 }}>
              Out of stock
            </div>
          )}
        </div>
      )}

      {/* Show message if no matching variant */}
      {Object.keys(selectedOptions).length > 0 && !matchingVariant && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#dc2626'
        }}>
          This combination is not available
        </div>
      )}
    </div>
  );
}
