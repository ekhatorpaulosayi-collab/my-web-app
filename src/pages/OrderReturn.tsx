/**
 * Order Return Page
 *
 * Paystack sends the customer here after a hosted checkout. The query
 * string is not proof of payment. This page asks the server to verify
 * the reference with Paystack before it says the payment was received.
 * The webhook still marks the order paid.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertCircle, ArrowLeft } from 'lucide-react';

type PayStatus = 'checking' | 'success' | 'failed' | 'abandoned' | 'reversed' | 'pending' | 'cancelled' | 'missing' | 'unconfigured' | 'unavailable';

export default function OrderReturn() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const reference = searchParams.get('reference') || searchParams.get('trxref') || '';
  const queryStatus = (searchParams.get('status') || '').toLowerCase();
  const [payStatus, setPayStatus] = useState<PayStatus>('checking');

  useEffect(() => {
    const cancelled = queryStatus === 'cancelled' || queryStatus === 'cancel';
    if (!reference) {
      setPayStatus(cancelled ? 'cancelled' : 'missing');
      return;
    }
    let live = true;
    setPayStatus('checking');
    fetch(`/api/verify-order-return?reference=${encodeURIComponent(reference)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        return (body && body.status) || 'unavailable';
      })
      .then((status) => {
        if (!live) return;
        if (status === 'success') setPayStatus('success');
        else if (cancelled && status !== 'success') setPayStatus('cancelled');
        else setPayStatus(status as PayStatus);
      })
      .catch(() => {
        if (live) setPayStatus(cancelled ? 'cancelled' : 'unavailable');
      });
    return () => {
      live = false;
    };
  }, [reference, queryStatus]);

  const storeHref = slug ? `/store/${slug}` : '/';
  const received = payStatus === 'success';
  const checking = payStatus === 'checking';

  const heading = received
    ? 'Payment received'
    : checking
      ? 'Confirming your payment'
      : payStatus === 'pending'
        ? 'Payment still processing'
        : payStatus === 'cancelled'
          ? 'Payment cancelled'
          : 'Payment not confirmed';

  const body = received
    ? 'Paystack confirmed this payment. The merchant is confirming your order and will be in touch shortly.'
    : checking
      ? 'We are checking this payment with Paystack before we mark it received.'
      : payStatus === 'pending'
        ? 'Paystack has not marked this payment as successful yet. We have not treated it as received.'
        : payStatus === 'cancelled'
          ? 'Your card was not charged and no order was placed. Your cart is still there if you would like to try again.'
          : 'We could not confirm this payment with Paystack, so it is not marked as received. If you were charged, contact the store with your reference.';

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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: received ? '#ECFDF5' : '#FEF2F2',
          margin: '0 auto 16px',
        }}>
          {received ? <Check size={28} color="#00894F" /> : <AlertCircle size={28} color="#991B1B" />}
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: '#111827',
          textAlign: 'center',
          margin: '0 0 8px',
        }}>
          {heading}
        </h1>
        <p style={{
          fontSize: 15,
          color: '#374151',
          textAlign: 'center',
          lineHeight: 1.6,
          margin: '0 0 12px',
        }}>
          {body}
        </p>
        {reference && (
          <p style={{
            fontSize: 12,
            color: '#475569',
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
          {received ? 'Back to store' : 'Back to cart'}
        </button>
      </div>
    </div>
  );
}
