/**
 * Order Return Page
 *
 * Landing page when Paystack redirects the customer back after a hosted-page
 * checkout (the fallback flow used when PaystackPop inline isn't available).
 *
 * Per docs/PAYSTACK-DEBUG.md §9 ("Customer can't read their own order"), we
 * cannot look up the order from an anonymous browser today — RLS gates
 * orders/paystack_split_transactions to vendor or app.access_token GUC, and
 * the customer_access_token pipeline isn't wired. This page is therefore a
 * GENERIC CATCH only: it acknowledges receipt and points the customer back.
 * The webhook is authoritative for actually marking the order paid.
 *
 * Query params we read:
 *   reference / trxref   — Paystack's transaction reference (echoed only)
 *   status               — "cancelled" or "failed" → cancellation screen
 *
 * Future work (NOT in scope, Session 5+): wire app.access_token so this page
 * can fetch the order and show line items + status. Until then, "your order
 * is being confirmed" is the most honest message we can offer.
 */

import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertCircle, ArrowLeft } from 'lucide-react';

export default function OrderReturn() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';
  const status = (searchParams.get('status') || '').toLowerCase();
  const isCancelled = status === 'cancelled' || status === 'cancel' || status === 'failed';

  const storeHref = slug ? `/store/${slug}` : '/';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F6F6F7',
      padding: '1.5rem 1rem 3rem',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
    }}>
      <div style={{
        maxWidth: 560,
        width: '100%',
        background: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '24px 20px',
        marginTop: '32px',
      }}>
        {isCancelled ? (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#FEF2F2',
              margin: '0 auto 16px',
            }}>
              <AlertCircle size={28} color="#991B1B" />
            </div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              margin: '0 0 8px',
            }}>
              Payment cancelled
            </h1>
            <p style={{
              fontSize: 15,
              color: '#374151',
              textAlign: 'center',
              lineHeight: 1.6,
              margin: '0 0 24px',
            }}>
              Your card wasn't charged and no order was placed. Your cart is still
              there if you'd like to try again.
            </p>
            <button
              onClick={() => navigate(storeHref)}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 20px',
                background: '#00894F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowLeft size={18} />
              Back to cart
            </button>
          </>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#ECFDF5',
              margin: '0 auto 16px',
            }}>
              <Check size={28} color="#00894F" />
            </div>
            <h1 style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
              textAlign: 'center',
              margin: '0 0 8px',
            }}>
              Payment received
            </h1>
            <p style={{
              fontSize: 15,
              color: '#374151',
              textAlign: 'center',
              lineHeight: 1.6,
              margin: '0 0 12px',
            }}>
              Thanks — we got your payment. The merchant is confirming your order
              now and will be in touch shortly.
            </p>
            {reference && (
              <p style={{
                fontSize: 12,
                color: '#9CA3AF',
                textAlign: 'center',
                margin: '0 0 24px',
                fontFamily: 'monospace',
              }}>
                Reference: {reference}
              </p>
            )}
            <button
              onClick={() => navigate(storeHref)}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '12px 20px',
                background: '#00894F',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <ArrowLeft size={18} />
              Back to store
            </button>
          </>
        )}
      </div>
    </div>
  );
}
