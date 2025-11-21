import React, { useState } from 'react';
import Papa from 'papaparse';
import { addProduct } from '../services/supabaseProducts';
import { useAuth } from '../contexts/AuthContext';

export const CSVImport: React.FC = () => {
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Map CSV columns to Supabase data structure (snake_case)
        const items = results.data
          .filter((row: any) => row['Item Name'] || row['Product'] || row['Name']) // Filter out empty rows
          .map((row: any) => ({
            name: row['Item Name'] || row['Product'] || row['Name'],
            selling_price: parseFloat(row['Price'] || row['Selling Price'] || '0'),
            cost_price: parseFloat(row['Cost'] || row['Cost Price'] || '0'),
            quantity: parseInt(row['Quantity'] || row['Stock'] || '0'),
            category: row['Category'] || 'General',
            barcode: row['Barcode'] || '',
            low_stock_threshold: parseInt(row['Low Stock Alert'] || '5')
          }));
        setPreview(items);
      },
      error: (error) => {
        alert(`Failed to parse CSV: ${error.message}`);
      }
    });
  };

  const importItems = async () => {
    if (!user) {
      alert('You must be logged in to import items');
      return;
    }

    setImporting(true);

    try {
      // Import all items in parallel using Promise.all
      const results = await Promise.allSettled(
        preview.map(item => addProduct(user.uid, item))
      );

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        alert(`⚠️ Imported ${successful} items successfully, ${failed} failed`);
      } else {
        alert(`✓ ${successful} items imported successfully!`);
      }

      setPreview([]);

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`Failed to import items: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="csv-import" style={{
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h3 style={{ marginBottom: '20px' }}>📥 Import Items from CSV/Excel</h3>

      {/* Instructions */}
      <div style={{
        background: '#f0f9ff',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '20px',
        fontSize: '14px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>How to import:</p>
        <ol style={{ margin: '0', paddingLeft: '20px' }}>
          <li>Download the template below</li>
          <li>Fill in your items (Excel or CSV)</li>
          <li>Upload the file</li>
          <li>Review preview and confirm import</li>
        </ol>
      </div>

      {/* Download Template */}
      <div style={{ marginBottom: '20px' }}>
        <a
          href="/template.csv"
          download
          className="btn btn-secondary"
          style={{
            display: 'inline-block',
            padding: '10px 16px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            textDecoration: 'none',
            color: '#374151',
            fontWeight: 600
          }}
        >
          📥 Download Template
        </a>
      </div>

      {/* Upload CSV */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          marginBottom: '8px',
          fontWeight: 500
        }}>
          Upload CSV/Excel File
        </label>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileUpload}
          style={{
            padding: '10px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            width: '100%'
          }}
        />
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '12px 16px',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
            fontWeight: 600
          }}>
            Preview ({preview.length} items)
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Name</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Cost</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Quantity</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Category</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>{item.name}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₦{item.selling_price.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₦{item.cost_price.toLocaleString()}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ padding: '12px' }}>{item.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.length > 10 && (
            <div style={{
              padding: '12px 16px',
              background: '#f9fafb',
              borderTop: '1px solid #e5e7eb',
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Showing first 10 of {preview.length} items
            </div>
          )}

          <div style={{ padding: '16px' }}>
            <button
              onClick={importItems}
              disabled={importing}
              style={{
                padding: '12px 24px',
                background: importing ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: importing ? 'not-allowed' : 'pointer',
                width: '100%'
              }}
            >
              {importing ? '⏳ Importing...' : `✓ Import All ${preview.length} Items`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
