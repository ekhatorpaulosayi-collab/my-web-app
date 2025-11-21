import React, { useState } from 'react';
import Checkout from './Checkout';

/**
 * Demo page to test the Checkout component
 *
 * Usage: Import this component anywhere in your app to test payments
 */
export default function CheckoutDemo() {
  const [showCheckout, setShowCheckout] = useState(false);

  const handlePaymentSuccess = (paymentData) => {
    console.log('Payment successful!', paymentData);
    alert(
      `Payment successful!\n\n` +
      `Reference: ${paymentData.reference}\n` +
      `Amount: ₦${paymentData.amount}\n` +
      `Email: ${paymentData.email}`
    );
    setShowCheckout(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Checkout Demo
      </h1>

      <p style={{ marginBottom: '1.5rem', color: '#6b7280' }}>
        Test the Paystack payment integration. Make sure you've configured your
        API keys in Business Settings → Payment Integration.
      </p>

      <div style={{
        background: '#f9fafb',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '1.5rem'
      }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Sample Product
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Premium Wireless Headphones
        </p>
        <p style={{ fontSize: '1.25rem', fontWeight: '700', color: '#16a34a' }}>
          ₦25,000
        </p>
      </div>

      <button
        onClick={() => setShowCheckout(true)}
        style={{
          width: '100%',
          padding: '0.875rem 1.5rem',
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 20px rgba(22, 163, 74, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.3)';
        }}
      >
        💳 Buy Now - ₦25,000
      </button>

      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        background: '#eff6ff',
        borderLeft: '4px solid #3b82f6',
        borderRadius: '6px'
      }}>
        <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0 }}>
          <strong>💡 Test Card:</strong> Use card number <code>4084 0840 8408 4081</code>,
          any future expiry date, and CVV <code>408</code>
        </p>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <Checkout
          productName="Premium Wireless Headphones"
          amount={25000}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </div>
  );
}
