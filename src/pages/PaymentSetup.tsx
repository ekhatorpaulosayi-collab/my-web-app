/**
 * Payment Setup landing page
 *
 * Two-card layout for the merchant's payment setup hub.
 *   Card 1: Set up your bank account → opens the subaccount wizard.
 *   Card 2: Verify your identity → placeholder, Coming soon.
 *
 * Outer feature flag (VITE_ENABLE_PAYSTACK_SUBACCOUNTS): when off,
 * BOTH cards render in their disabled "Coming soon" state and the
 * wizard route is unreachable from this page. This honors the
 * Session 3-prep instruction to "redirect to dashboard or show
 * coming soon placeholder" when the flag is not enabled.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStrings } from '../hooks/useStrings';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getBankNameByCode, maskAccountNumber } from '../utils/nigerianBanks';

const FLAG_ON = import.meta.env.VITE_ENABLE_PAYSTACK_SUBACCOUNTS === 'true';

type SubaccountStatus =
  | { kind: 'loading' }
  | { kind: 'not_started' }
  | { kind: 'pending' }
  | { kind: 'verified'; settlement_bank: string; account_number: string }
  // TODO(reviewer-reject): State D — paystack_subaccounts has no
  // rejection column yet. When the reviewer reject flow lands,
  // extend this union with { kind: 'rejected'; reason?: string }
  // and render a "We need more information" card with a link back
  // to the wizard.
  ;

export default function PaymentSetup() {
  const navigate = useNavigate();
  const strings = useStrings() as any;
  const t = strings.paystackSetup;
  const { currentUser } = useAuth();

  const [status, setStatus] = useState<SubaccountStatus>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    async function loadStatus() {
      if (!currentUser?.uid) return;
      try {
        // Look up the user's store, then the subaccount row.
        // RLS policy paystack_subaccounts_vendor_select guarantees
        // we only see rows for stores owned by auth.uid().
        const { data: store, error: storeErr } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', currentUser.uid)
          .single();
        if (cancelled) return;
        if (storeErr || !store) {
          console.warn('[PaymentSetup] store lookup failed; falling back to not_started', storeErr);
          setStatus({ kind: 'not_started' });
          return;
        }
        const { data: sub, error: subErr } = await supabase
          .from('paystack_subaccounts')
          .select('settlement_bank, account_number, active')
          .eq('store_id', store.id)
          .maybeSingle();
        if (cancelled) return;
        if (subErr) {
          console.warn('[PaymentSetup] subaccount lookup failed; falling back to not_started', subErr);
          setStatus({ kind: 'not_started' });
          return;
        }
        if (!sub) {
          setStatus({ kind: 'not_started' });
          return;
        }
        if (sub.active === true) {
          setStatus({
            kind: 'verified',
            settlement_bank: sub.settlement_bank,
            account_number: sub.account_number,
          });
        } else {
          setStatus({ kind: 'pending' });
        }
      } catch (e) {
        if (cancelled) return;
        console.warn('[PaymentSetup] subaccount status threw; falling back to not_started', e);
        setStatus({ kind: 'not_started' });
      }
    }
    loadStatus();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F6F6F7',
        padding: '1.5rem 1rem 3rem',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <button
          onClick={() => navigate('/settings')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#374151',
            fontSize: 16,
            padding: '8px 4px 16px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 48,
          }}
        >
          ← {t.page.back}
        </button>

        <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700, color: '#111827' }}>
          {t.page.title}
        </h1>
        <p style={{ margin: '0 0 24px 0', fontSize: 16, color: '#6B7280' }}>
          {t.page.subtitle}
        </p>

        {/* Card 1 — bank setup. Renders one of four states based on
            the paystack_subaccounts row for this user's store. State A
            falls back to the original "Set up bank account" CTA. */}
        {!FLAG_ON ? (
          <PaymentCard
            icon="💳"
            title={t.card.bank.title}
            subtitle={t.card.bank.subtitle}
            cta={t.page.comingSoon}
            disabled={true}
            onClick={() => {}}
          />
        ) : status.kind === 'loading' ? (
          <BankStatusSkeleton title={t.card.bank.title} />
        ) : status.kind === 'verified' ? (
          <BankStatusCard
            icon="💳"
            title="Bank account verified ✓"
            primaryLine={getBankNameByCode(status.settlement_bank)}
            secondaryLine={maskAccountNumber(status.account_number)}
            tone="success"
          />
        ) : status.kind === 'pending' ? (
          <BankStatusCard
            icon="💳"
            title="Bank account submitted — awaiting review"
            primaryLine="We'll let you know when it's verified."
            tone="pending"
          />
        ) : (
          <PaymentCard
            icon="💳"
            title={t.card.bank.title}
            subtitle={t.card.bank.subtitle}
            cta={t.card.bank.cta}
            disabled={false}
            onClick={() => navigate('/settings/payments/bank-setup')}
          />
        )}

        <div style={{ height: 16 }} />

        <PaymentCard
          icon="🪪"
          title={t.card.kyc.title}
          subtitle={t.card.kyc.subtitle}
          cta={t.page.comingSoon}
          disabled={true}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}

interface PaymentCardProps {
  icon: string;
  title: string;
  subtitle: string;
  cta: string;
  disabled: boolean;
  onClick: () => void;
}

function PaymentCard({ icon, title, subtitle, cta, disabled, onClick }: PaymentCardProps) {
  return (
    <div
      style={{
        background: disabled ? '#F3F4F6' : '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        opacity: disabled ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ fontSize: 15, color: '#6B7280' }}>{subtitle}</div>
        </div>
      </div>

      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 20px',
          background: disabled ? '#E5E7EB' : '#00894F',
          color: disabled ? '#6B7280' : '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          fontSize: 16,
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {cta} {!disabled && '→'}
      </button>
    </div>
  );
}

interface BankStatusCardProps {
  icon: string;
  title: string;
  primaryLine: string;
  secondaryLine?: string;
  tone: 'success' | 'pending';
}

function BankStatusCard({ icon, title, primaryLine, secondaryLine, tone }: BankStatusCardProps) {
  const palette =
    tone === 'success'
      ? { background: '#FFFFFF', border: '#A7F3D0', titleColor: '#065F46', textColor: '#111827' }
      : { background: '#F3F4F6', border: '#E5E7EB', titleColor: '#374151', textColor: '#6B7280' };
  return (
    <div
      style={{
        background: palette.background,
        borderRadius: 12,
        border: `1px solid ${palette.border}`,
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        opacity: tone === 'pending' ? 0.85 : 1,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: palette.titleColor, marginBottom: 6 }}>
          {title}
        </div>
        <div style={{ fontSize: 15, color: palette.textColor }}>{primaryLine}</div>
        {secondaryLine && (
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 2, fontFamily: 'monospace' }}>
            {secondaryLine}
          </div>
        )}
      </div>
    </div>
  );
}

function BankStatusSkeleton({ title }: { title: string }) {
  return (
    <div
      role="status"
      aria-label="Loading bank status"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        padding: '20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>
        💳
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
          {title}
        </div>
        <div
          style={{
            height: 14,
            width: '70%',
            background: '#F3F4F6',
            borderRadius: 4,
            marginBottom: 6,
          }}
        />
        <div style={{ height: 12, width: '40%', background: '#F3F4F6', borderRadius: 4 }} />
      </div>
    </div>
  );
}
