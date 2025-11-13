import React, { useState } from 'react';
import RecordSaleModalV2 from '../components/RecordSaleModalV2.tsx';
import '../App.css';

// Mock data for testing
const mockItems = [
  {
    id: '1',
    name: 'Coca-Cola 50cl',
    sku: 'COK-50',
    barcode: '1234567890123',
    sellKobo: 30000,
    sellingPrice: 30000,
    sellPrice: 30000,
    costKobo: 20000,
    qty: 50,
    quantity: 50
  },
  {
    id: '2',
    name: 'Sprite 50cl',
    sku: 'SPR-50',
    barcode: '1234567890124',
    sellKobo: 30000,
    sellingPrice: 30000,
    sellPrice: 30000,
    costKobo: 20000,
    qty: 30,
    quantity: 30
  },
  {
    id: '3',
    name: 'Fanta 50cl',
    sku: 'FAN-50',
    barcode: '1234567890125',
    sellKobo: 30000,
    sellingPrice: 30000,
    sellPrice: 30000,
    costKobo: 20000,
    qty: 40,
    quantity: 40
  },
  {
    id: '4',
    name: 'Indomie Chicken',
    sku: 'IND-CHK',
    barcode: '1234567890126',
    sellKobo: 15000,
    sellingPrice: 15000,
    sellPrice: 15000,
    costKobo: 10000,
    qty: 100,
    quantity: 100
  },
  {
    id: '5',
    name: 'Gala Sausage Roll',
    sku: 'GAL-SAU',
    barcode: '1234567890127',
    sellKobo: 20000,
    sellingPrice: 20000,
    sellPrice: 20000,
    costKobo: 15000,
    qty: 60,
    quantity: 60
  }
];

export default function DevSaleModal() {
  const [isOpen, setIsOpen] = useState(true);
  const [toast, setToast] = useState<{ message: string; timestamp: number } | null>(null);

  const showToast = (message: string, duration = 3000) => {
    setToast({ message, timestamp: Date.now() });
    setTimeout(() => setToast(null), duration);
  };

  const handleSaveSale = async (saleData: any) => {
    console.log('[DevSaleModal] Sale data:', saleData);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    showToast('✅ Sale saved successfully!');
  };

  const handleCreateDebt = (debtData: any) => {
    console.log('[DevSaleModal] Debt data:', debtData);
    showToast('💳 Debt created successfully!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: 600, color: '#111827' }}>
          Dev Preview: Sale Modal V2
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: '15px', color: '#6b7280' }}>
          Test the new Shopify-style sale modal with barcode scanning, keyboard shortcuts, and modern UI.
        </p>

        <div style={{
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>
            ⌨️ Keyboard Shortcuts
          </h2>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
            <li><code>/</code> - Focus search field</li>
            <li><code>Enter</code> - Select highlighted item</li>
            <li><code>Ctrl/Cmd + Enter</code> - Complete sale</li>
            <li><code>+</code> - Increment last item quantity</li>
          </ul>
        </div>

        <div style={{
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#78350f' }}>
            📱 Barcode Scanner
          </h2>
          <p style={{ margin: 0, color: '#78350f', fontSize: '14px', lineHeight: '1.6' }}>
            Barcode scanning is enabled. Type a barcode quickly (like a scanner would) and press Enter.
            Try: <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '4px' }}>1234567890123</code>
          </p>
        </div>

        <div style={{
          background: '#dbeafe',
          border: '1px solid #60a5fa',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#1e40af' }}>
            ✨ How V2 Works (Different from V1!)
          </h2>
          <ol style={{ margin: 0, paddingLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
            <li><strong>Select item</strong> → Immediately adds to cart (qty: 1)</li>
            <li><strong>Check cart bar at bottom</strong> → Shows item count & total</li>
            <li><strong>Click cart bar</strong> → Opens drawer to edit quantities</li>
            <li><strong>Select more items</strong> → Adds to same cart</li>
            <li><strong>Click "Complete Sale"</strong> → Processes all items</li>
          </ol>
          <p style={{ margin: '12px 0 0 0', color: '#1e40af', fontSize: '13px', fontStyle: 'italic' }}>
            💡 No separate price/qty fields - items go straight to cart!
          </p>
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, color: '#166534' }}>
            🔧 Feature Flag
          </h2>
          <p style={{ margin: '0 0 12px 0', color: '#166534', fontSize: '14px' }}>
            To enable V2 in the main app, run in browser console:
          </p>
          <code style={{
            display: 'block',
            background: '#dcfce7',
            padding: '12px',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#166534',
            overflowX: 'auto'
          }}>
            localStorage.setItem('storehouse:useNewSaleModal', 'true')
          </code>
          <p style={{ margin: '12px 0 0 0', color: '#166534', fontSize: '14px' }}>
            To disable: <code style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>localStorage.removeItem('storehouse:useNewSaleModal')</code>
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          paddingTop: '24px',
          borderTop: '1px solid #e5e7eb'
        }}>
          <button
            onClick={() => setIsOpen(true)}
            style={{
              flex: 1,
              height: '48px',
              background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            Open Sale Modal V2
          </button>

          <button
            onClick={() => window.location.href = '/'}
            style={{
              height: '48px',
              padding: '0 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Back to Dashboard
          </button>
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#6b7280' }}>
            Mock Data (5 items)
          </h3>
          <pre style={{
            margin: 0,
            fontSize: '12px',
            color: '#4b5563',
            overflowX: 'auto',
            fontFamily: 'monospace',
            lineHeight: '1.6'
          }}>
            {mockItems.map(item => `${item.name} (${item.sku}) - ₦${item.sellKobo / 100} - Stock: ${item.qty}`).join('\n')}
          </pre>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#111827',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          zIndex: 9999,
          animation: 'slideUp 0.3s ease-out'
        }}>
          {toast.message}
        </div>
      )}

      {/* Modal */}
      <RecordSaleModalV2
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        items={mockItems}
        calculatorItems={null}
        preselectedItem={null}
        onSaveSale={handleSaveSale}
        onCreateDebt={handleCreateDebt}
        showSalesData={true}
        onShowToast={showToast}
      />

      <style>{`
        @keyframes slideUp {
          from {
            transform: translate(-50%, 20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }

        code {
          font-family: 'Courier New', monospace;
        }
      `}</style>
    </div>
  );
}
