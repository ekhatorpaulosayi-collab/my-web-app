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

import { useNavigate } from 'react-router-dom';
import { useStrings } from '../hooks/useStrings';

const FLAG_ON = import.meta.env.VITE_ENABLE_PAYSTACK_SUBACCOUNTS === 'true';

export default function PaymentSetup() {
  const navigate = useNavigate();
  const strings = useStrings() as any;
  const t = strings.paystackSetup;

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

        <PaymentCard
          icon="💳"
          title={t.card.bank.title}
          subtitle={t.card.bank.subtitle}
          cta={FLAG_ON ? t.card.bank.cta : t.page.comingSoon}
          disabled={!FLAG_ON}
          onClick={() => navigate('/settings/payments/bank-setup')}
        />

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
