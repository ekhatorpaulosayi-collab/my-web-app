/**
 * Variant Manager Component
 * Allows merchants to create and manage product variants
 * For Add/Edit Product forms
 */

import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import type { ProductVariant } from '../types/variants';

interface VariantOption {
  name: string; // e.g., "Size", "Color"
  values: string[]; // e.g., ["Small", "Medium", "Large"]
}

interface VariantManagerProps {
  productId?: string;
  existingVariants?: ProductVariant[];
  onVariantsChange: (variants: Omit<ProductVariant, 'id' | 'product_id' | 'user_id' | 'created_at' | 'updated_at'>[]) => void;
}

export function VariantManager({ productId, existingVariants = [], onVariantsChange }: VariantManagerProps) {
  const [hasVariants, setHasVariants] = useState(existingVariants.length > 0);
  const [options, setOptions] = useState<VariantOption[]>([]);
  const [variants, setVariants] = useState<Omit<ProductVariant, 'id' | 'product_id' | 'user_id' | 'created_at' | 'updated_at'>[]>([]);

  // Load existing variants on mount
  useEffect(() => {
    if (existingVariants.length > 0) {
      setHasVariants(true);

      // Extract options from existing variants
      const optionsMap = new Map<string, Set<string>>();
      existingVariants.forEach(variant => {
        Object.entries(variant.attributes || {}).forEach(([key, value]) => {
          if (!optionsMap.has(key)) {
            optionsMap.set(key, new Set());
          }
          optionsMap.get(key)!.add(value);
        });
      });

      const extractedOptions: VariantOption[] = Array.from(optionsMap.entries()).map(([name, values]) => ({
        name,
        values: Array.from(values)
      }));

      setOptions(extractedOptions);
      setVariants(existingVariants.map(v => ({
        variant_name: v.variant_name,
        sku: v.sku,
        barcode: v.barcode,
        attributes: v.attributes,
        price_override: v.price_override,
        quantity: v.quantity,
        low_stock_threshold: v.low_stock_threshold,
        image_url: v.image_url,
        is_active: v.is_active !== false
      })));
    }
  }, [existingVariants]);

  // Notify parent when variants change
  useEffect(() => {
    if (hasVariants) {
      onVariantsChange(variants);
    } else {
      onVariantsChange([]);
    }
  }, [variants, hasVariants, onVariantsChange]);

  // Generate variant combinations from options
  const generateVariants = () => {
    if (options.length === 0) {
      setVariants([]);
      return;
    }

    // Generate all combinations using cartesian product
    const combinations: Record<string, string>[] = [{}];

    options.forEach(option => {
      const newCombinations: Record<string, string>[] = [];
      combinations.forEach(combo => {
        option.values.forEach(value => {
          newCombinations.push({
            ...combo,
            [option.name]: value
          });
        });
      });
      combinations.length = 0;
      combinations.push(...newCombinations);
    });

    // Create variant objects
    const newVariants = combinations.map(attributes => {
      // Build variant name (e.g., "Red - Large")
      const variantName = Object.values(attributes).join(' - ');

      // Check if variant already exists (preserve user input)
      const existing = variants.find(v => v.variant_name === variantName);

      return existing || {
        variant_name: variantName,
        attributes,
        quantity: 0,
        is_active: true
      };
    });

    setVariants(newVariants);
  };

  // Add new option
  const addOption = () => {
    setOptions([...options, { name: '', values: [] }]);
  };

  // Update option name
  const updateOptionName = (index: number, name: string) => {
    const newOptions = [...options];
    newOptions[index].name = name;
    setOptions(newOptions);
  };

  // Add value to option
  const addValue = (optionIndex: number, value: string) => {
    if (!value.trim()) return;

    const newOptions = [...options];
    if (!newOptions[optionIndex].values.includes(value.trim())) {
      newOptions[optionIndex].values.push(value.trim());
      setOptions(newOptions);
      generateVariants();
    }
  };

  // Remove value from option
  const removeValue = (optionIndex: number, valueIndex: number) => {
    const newOptions = [...options];
    newOptions[optionIndex].values.splice(valueIndex, 1);
    setOptions(newOptions);
    generateVariants();
  };

  // Remove option
  const removeOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);

    // Regenerate variants without this option
    if (newOptions.length === 0) {
      setVariants([]);
    } else {
      // Re-generate with remaining options
      setTimeout(generateVariants, 0);
    }
  };

  // Update variant field
  const updateVariant = (index: number, field: keyof typeof variants[0], value: any) => {
    const newVariants = [...variants];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setVariants(newVariants);
  };

  // Delete variant
  const deleteVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  // Bulk set all quantities
  const bulkSetQuantity = () => {
    const qty = prompt('Set quantity for all variants:');
    if (qty && !isNaN(Number(qty))) {
      const newVariants = variants.map(v => ({ ...v, quantity: Number(qty) }));
      setVariants(newVariants);
    }
  };

  // Bulk set all price overrides
  const bulkSetPrice = () => {
    const price = prompt('Set price override for all variants (leave empty to clear):');
    if (price === null) return; // Cancelled

    const priceValue = price.trim() === '' ? undefined : Number(price) * 100; // Convert to kobo
    if (price.trim() !== '' && isNaN(Number(price))) {
      alert('Please enter a valid number');
      return;
    }

    const newVariants = variants.map(v => ({ ...v, price_override: priceValue }));
    setVariants(newVariants);
  };

  return (
    <div style={{ marginTop: '24px', marginBottom: '24px' }}>
      {/* Toggle */}
      <label style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 600,
        marginBottom: '16px'
      }}>
        <input
          type="checkbox"
          checked={hasVariants}
          onChange={(e) => {
            setHasVariants(e.target.checked);
            if (!e.target.checked) {
              setOptions([]);
              setVariants([]);
            }
          }}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        This product has variants (size, color, etc.)
      </label>

      {hasVariants && (
        <>
          {/* Option Builder */}
          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            marginBottom: '16px'
          }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: '#1f2937' }}>
              Variant Options
            </h4>

            {options.map((option, optionIndex) => (
              <div key={optionIndex} style={{ marginBottom: '16px', padding: '12px', background: 'white', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    placeholder="Option name (e.g., Size, Color)"
                    value={option.name}
                    onChange={(e) => updateOptionName(optionIndex, e.target.value)}
                    onBlur={generateVariants}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                  <button
                    onClick={() => removeOption(optionIndex)}
                    style={{
                      padding: '8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    title="Remove option"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Values */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {option.values.map((value, valueIndex) => (
                    <span
                      key={valueIndex}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        background: '#dbeafe',
                        color: '#1e40af',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 500
                      }}
                    >
                      {value}
                      <button
                        onClick={() => removeValue(optionIndex, valueIndex)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1e40af',
                          cursor: 'pointer',
                          padding: '0',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add Value Input */}
                <input
                  type="text"
                  placeholder="Add value (e.g., Small, Red) and press Enter"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue(optionIndex, e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                />
              </div>
            ))}

            <button
              onClick={addOption}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600
              }}
            >
              <Plus size={16} />
              Add Option
            </button>
          </div>

          {/* Variants Table */}
          {variants.length > 0 && (
            <div style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
                  Generated Variants ({variants.length})
                </h4>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={bulkSetQuantity}
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Set All Quantities
                  </button>
                  <button
                    onClick={bulkSetPrice}
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Set All Prices
                  </button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Variant</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>SKU</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Quantity</th>
                      <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: 700, color: '#6b7280' }}>Price (₦)</th>
                      <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#6b7280', width: '60px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((variant, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '10px', fontSize: '13px', fontWeight: 600 }}>
                          {variant.variant_name}
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="text"
                            value={variant.sku || ''}
                            onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                            placeholder="Optional"
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="number"
                            value={variant.quantity}
                            onChange={(e) => updateVariant(index, 'quantity', Number(e.target.value))}
                            min="0"
                            style={{
                              width: '80px',
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px' }}>
                          <input
                            type="number"
                            value={variant.price_override ? variant.price_override / 100 : ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) * 100 : undefined;
                              updateVariant(index, 'price_override', value);
                            }}
                            placeholder="Use base price"
                            min="0"
                            step="0.01"
                            style={{
                              width: '100px',
                              padding: '6px 8px',
                              border: '1px solid #d1d5db',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => deleteVariant(index)}
                            style={{
                              padding: '6px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                            title="Delete variant"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {variants.length === 0 && options.length > 0 && (
            <div style={{
              padding: '20px',
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#92400e',
              textAlign: 'center'
            }}>
              Add values to your options to generate variants
            </div>
          )}
        </>
      )}
    </div>
  );
}
