/**
 * Test Page for VariantManager Component
 * Standalone page to test variant creation before integrating into main app
 */

import React, { useState } from 'react';
import { VariantManager } from '../components/VariantManager';
import { createVariants } from '../lib/supabase-variants';
import { useAuth } from '../contexts/AuthContext';
import type { ProductVariant } from '../types/variants';

export default function TestVariants() {
  const { currentUser } = useAuth();
  const [productName, setProductName] = useState('Test T-Shirt');
  const [productPrice, setProductPrice] = useState('5000');
  const [variants, setVariants] = useState<Omit<ProductVariant, 'id' | 'product_id' | 'user_id' | 'created_at' | 'updated_at'>[]>([]);
  const [saving, setSaving] = useState(false);
  const [lastSavedProductId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!currentUser) {
      alert('Please log in first!');
      return;
    }

    if (variants.length === 0) {
      alert('Please add some variants first!');
      return;
    }

    setSaving(true);
    try {
      // For testing, we'll create a temporary product ID
      // In the real app, this would come from the product that was just created
      const testProductId = `test-${Date.now()}`;

      console.log('Saving variants:', variants);
      console.log('Product ID:', testProductId);
      console.log('User ID:', currentUser.uid);

      // In production, you'd save these to Supabase
      // For now, just show what would be saved
      alert(`Would save ${variants.length} variants:\n\n${JSON.stringify(variants, null, 2)}`);

      // Uncomment to actually save to database:
      // const savedVariants = await createVariants(testProductId, currentUser.uid, variants);
      // alert(`✅ Saved ${savedVariants.length} variants successfully!`);

    } catch (error) {
      console.error('Error saving variants:', error);
      alert('Failed to save variants: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '8px'
        }}>
          🧪 Variant Manager Test Page
        </h1>
        <p style={{ color: '#6b7280', fontSize: '15px' }}>
          Test the variant creation interface before integrating into your main app
        </p>
      </div>

      {/* Mock Product Form */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Basic Product Info
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Product Name
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '6px'
            }}>
              Base Price (₦)
            </label>
            <input
              type="number"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      {/* Variant Manager */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Product Variants
        </h2>

        <VariantManager
          onVariantsChange={setVariants}
        />
      </div>

      {/* Current Variants Display */}
      {variants.length > 0 && (
        <div style={{
          background: '#f9fafb',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#1f2937',
            marginBottom: '12px'
          }}>
            📊 Preview: {variants.length} variants will be created
          </h3>

          <div style={{
            background: 'white',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflowX: 'auto'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700 }}>Variant Name</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700 }}>Attributes</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>Quantity</th>
                  <th style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'left', fontWeight: 700 }}>SKU</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((variant, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{variant.variant_name}</td>
                    <td style={{ padding: '8px', color: '#6b7280' }}>
                      {JSON.stringify(variant.attributes)}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{variant.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {variant.price_override
                        ? `₦${(variant.price_override / 100).toLocaleString()}`
                        : `₦${productPrice} (base)`}
                    </td>
                    <td style={{ padding: '8px', color: '#6b7280' }}>{variant.sku || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* JSON Output */}
          <details style={{ marginTop: '16px' }}>
            <summary style={{
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              color: '#3b82f6',
              padding: '8px 0'
            }}>
              📋 View JSON (for developers)
            </summary>
            <pre style={{
              background: '#1f2937',
              color: '#f9fafb',
              padding: '16px',
              borderRadius: '8px',
              fontSize: '12px',
              overflow: 'auto',
              marginTop: '8px',
              fontFamily: 'Monaco, Consolas, monospace'
            }}>
              {JSON.stringify(variants, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={() => {
            setVariants([]);
            setProductName('Test T-Shirt');
            setProductPrice('5000');
          }}
          style={{
            padding: '12px 24px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            color: '#374151'
          }}
        >
          Reset
        </button>

        <button
          onClick={handleSave}
          disabled={variants.length === 0 || saving}
          style={{
            padding: '12px 24px',
            background: variants.length > 0 && !saving ? '#3b82f6' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: variants.length > 0 && !saving ? 'pointer' : 'not-allowed',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}
        >
          {saving ? 'Saving...' : `Save ${variants.length} Variants`}
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#1e40af',
          marginBottom: '12px'
        }}>
          💡 How to Use
        </h3>
        <ol style={{ color: '#1e40af', fontSize: '14px', lineHeight: '1.8', paddingLeft: '20px' }}>
          <li>Check the "This product has variants" checkbox</li>
          <li>Add options (e.g., "Size", "Color") and their values</li>
          <li>Variants are auto-generated from all combinations</li>
          <li>Set quantities and optional price overrides for each variant</li>
          <li>Use "Set All" buttons for bulk updates</li>
          <li>Click "Save" to see the JSON that would be sent to the database</li>
        </ol>

        <p style={{
          marginTop: '16px',
          padding: '12px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          <strong>Note:</strong> This is a test page. Click "Save" to see what would be saved to the database.
          Uncomment the createVariants() call in the code to actually save to Supabase.
        </p>
      </div>

      {/* Back Link */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <a
          href="/"
          style={{
            color: '#3b82f6',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600
          }}
        >
          ← Back to Dashboard
        </a>
      </div>

      {/* Last Saved Info */}
      {lastSavedProductId && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#dcfce7',
          border: '1px solid #86efac',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#166534'
        }}>
          ✅ Last saved product ID: {lastSavedProductId}
        </div>
      )}
    </div>
  );
}
