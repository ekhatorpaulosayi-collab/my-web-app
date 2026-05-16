/**
 * KycWizard.tsx
 *
 * Vendor KYC v1 wizard at /settings/payments/identity-verification.
 * Sibling of SubaccountWizard.tsx — same Shell/ProgressStrip/BackLink/
 * PrimaryButton/Heading/HelpText/Toast primitives, defined inline.
 *
 * Per docs/KYC_V1_FOCUS_RULES.md and docs/KYC_V1_FRONTEND_PATTERNS.md
 * Rule 2: "inline-duplicate, don't refactor" — this is the second
 * instance, not the time to extract shared module.
 *
 * SCAFFOLD STATE (5.3): empty shell with stubbed screens. Subsequent
 * commits fill in form content (5.4), photo upload (5.5), submit RPC
 * + resubmission pre-fill (5.6).
 *
 * Reload restarts at intro screen — explicitly accepted (same pattern
 * as SubaccountWizard, per patterns doc §4).
 *
 * Screen ordering:
 *   intro    — Why we need this (no progress bar)
 *   1        — Personal identity (BVN+NIN+phone)     [Step 1 of 4]
 *   2        — Business details (category+CAC+addr)  [Step 2 of 4]
 *   3        — ID photo (selfie capture)             [Step 3 of 4]
 *   4        — Review and submit                     [Step 4 of 4]
 *   success  — Submitted (no progress bar)
 */

import { CSSProperties, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { supabase } from '../../lib/supabase';

type WizardStep = 'intro' | 1 | 2 | 3 | 4 | 'success';

type KycFormData = {
  bvn: string;
  nin: string;
  phone: string;
  business_category: string;
  cac_rc_number: string;
  business_address: string;
  selfie_url: string;
  confirmation_accepted: boolean;
};

function interp(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function KycWizard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const strings = useStrings() as any;
  const t = strings.paystackSetup.kyc.wizard;

  const [step, setStep] = useState<WizardStep>('intro');

  // Form data lives at wizard level so values survive step transitions.
  // 5.4 fills step 1 + step 2; 5.5 + 5.6 fill the rest.
  const [formData, setFormData] = useState<KycFormData>({
    bvn: '',
    nin: '',
    phone: '+234',
    business_category: '',
    cac_rc_number: '',
    business_address: '',
    selfie_url: '',
    confirmation_accepted: false,
  });

  const handleFormChange = (patch: Partial<KycFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
  };

  // Store lookup — fetch stores.id by user_id (same pattern as
  // SubaccountWizard so callers don't have to assume
  // currentUser.uid === stores.id).
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeLoadError, setStoreLoadError] = useState<string | null>(null);
  void storeId;

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', currentUser.uid)
          .single();
        if (cancelled) return;
        if (error || !data) {
          setStoreLoadError(t.errors.storeLoadFailed);
          return;
        }
        setStoreId(data.id);
      } catch (err) {
        if (cancelled) return;
        console.warn('[KycWizard] store lookup failed', err);
        setStoreLoadError(t.errors.storeLoadFailed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, t.errors.storeLoadFailed]);

  // Top-level error fallback.
  if (storeLoadError) {
    return (
      <Shell>
        <BackLink label={t.backToPayments} onClick={() => navigate('/settings/payments')} />
        <ErrorCard heading={t.errors.heading} body={storeLoadError} />
      </Shell>
    );
  }

  const showProgress = step !== 'intro' && step !== 'success';
  const progressStep = typeof step === 'number' ? (step as 1 | 2 | 3 | 4) : 1;

  return (
    <Shell>
      {step === 'intro' && (
        <BackLink label={t.backToPayments} onClick={() => navigate('/settings/payments')} />
      )}
      {step !== 'intro' && step !== 'success' && (
        <BackLink
          label={t.back}
          onClick={() => {
            if (step === 1) setStep('intro');
            else if (typeof step === 'number') setStep((step - 1) as WizardStep);
          }}
        />
      )}

      {showProgress && (
        <ProgressStrip
          step={progressStep}
          total={4}
          label={interp(t.stepLabel, { n: progressStep, total: 4 })}
        />
      )}

      {step === 'intro' && <IntroScreen onContinue={() => setStep(1)} />}
      {step === 1 && (
        <Step1PersonalIdentity
          formData={formData}
          onChange={handleFormChange}
          onContinue={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2BusinessDetails
          formData={formData}
          onChange={handleFormChange}
          onContinue={() => setStep(3)}
        />
      )}
      {step === 3 && <Step3IdPhoto onContinue={() => setStep(4)} />}
      {step === 4 && <Step4Review onSubmit={() => setStep('success')} />}
      {step === 'success' && <SuccessScreen onDone={() => navigate('/settings/payments')} />}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────
// Screens
// ─────────────────────────────────────────────────────────────────

function IntroScreen({ onContinue }: { onContinue: () => void }) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.intro;
  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>
      <PrimaryButton onClick={onContinue}>{s.cta}</PrimaryButton>
    </>
  );
}

function Step1PersonalIdentity({
  formData,
  onChange,
  onContinue,
}: {
  formData: KycFormData;
  onChange: (patch: Partial<KycFormData>) => void;
  onContinue: () => void;
}) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step1;

  // Errors only surface AFTER a field is blurred (industry-standard
  // pattern: don't shout at the user mid-type).
  const [touched, setTouched] = useState<{
    bvn?: boolean;
    nin?: boolean;
    phone?: boolean;
  }>({});

  const validateBvn = (v: string): string | null => {
    if (!v) return s.errors.bvnRequired;
    if (!/^\d+$/.test(v)) return s.errors.bvnDigitsOnly;
    if (v.length !== 11) return s.errors.bvnLength;
    if (!v.startsWith('2')) return s.errors.bvnStartsWithTwo;
    return null;
  };

  const validateNin = (v: string): string | null => {
    if (!v) return s.errors.ninRequired;
    if (!/^\d+$/.test(v)) return s.errors.ninDigitsOnly;
    if (v.length !== 11) return s.errors.ninLength;
    return null;
  };

  // Input collects 10 trailing digits; formData.phone stores the full
  // +234XXXXXXXXXX string that the RPC expects.
  const phoneTrailing = formData.phone.startsWith('+234')
    ? formData.phone.slice(4)
    : '';

  const validatePhone = (trailing: string): string | null => {
    if (!trailing) return s.errors.phoneRequired;
    if (!/^\d+$/.test(trailing)) return s.errors.phoneDigitsOnly;
    if (trailing.length !== 10) return s.errors.phoneLength;
    if (!/^[789]/.test(trailing)) return s.errors.phoneStartsWith789;
    return null;
  };

  const bvnError = validateBvn(formData.bvn);
  const ninError = validateNin(formData.nin);
  const phoneError = validatePhone(phoneTrailing);

  const canContinue = !bvnError && !ninError && !phoneError;

  const handleNumericInput = (raw: string, max: number): string =>
    raw.replace(/\D/g, '').slice(0, max);

  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>

      {/* BVN */}
      <div style={{ marginTop: 24 }}>
        <label style={labelStyle}>{s.bvn.label}</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formData.bvn}
          placeholder={s.bvn.placeholder}
          onChange={(e) => onChange({ bvn: handleNumericInput(e.target.value, 11) })}
          onBlur={() => setTouched((prev) => ({ ...prev, bvn: true }))}
          style={{
            ...inputStyle,
            borderColor: touched.bvn && bvnError ? '#DC2626' : '#D1D5DB',
          }}
        />
        {touched.bvn && bvnError && <div style={errorTextStyle}>{bvnError}</div>}
      </div>

      {/* NIN */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{s.nin.label}</label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={formData.nin}
          placeholder={s.nin.placeholder}
          onChange={(e) => onChange({ nin: handleNumericInput(e.target.value, 11) })}
          onBlur={() => setTouched((prev) => ({ ...prev, nin: true }))}
          style={{
            ...inputStyle,
            borderColor: touched.nin && ninError ? '#DC2626' : '#D1D5DB',
          }}
        />
        {touched.nin && ninError && <div style={errorTextStyle}>{ninError}</div>}
      </div>

      {/* Phone — locked +234 prefix span + 10-digit input */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{s.phone.label}</label>
        <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 12px',
              fontSize: 16,
              lineHeight: 1.5,
              border: '1px solid #D1D5DB',
              borderRight: 'none',
              borderRadius: '10px 0 0 10px',
              background: '#F3F4F6',
              color: '#374151',
              userSelect: 'none',
            }}
          >
            +234
          </span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phoneTrailing}
            placeholder={s.phone.placeholder}
            onChange={(e) => {
              const trailing = handleNumericInput(e.target.value, 10);
              onChange({ phone: '+234' + trailing });
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
            style={{
              ...inputStyle,
              marginTop: 0,
              borderRadius: '0 10px 10px 0',
              flex: 1,
              borderColor: touched.phone && phoneError ? '#DC2626' : '#D1D5DB',
            }}
          />
        </div>
        {touched.phone && phoneError && <div style={errorTextStyle}>{phoneError}</div>}
      </div>

      <PrimaryButton onClick={onContinue} disabled={!canContinue}>
        {s.cta}
      </PrimaryButton>
    </>
  );
}

function Step2BusinessDetails({
  formData,
  onChange,
  onContinue,
}: {
  formData: KycFormData;
  onChange: (patch: Partial<KycFormData>) => void;
  onContinue: () => void;
}) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step2;

  const [touched, setTouched] = useState<{ category?: boolean }>({});

  const categoryError = !formData.business_category ? s.errors.categoryRequired : null;
  const canContinue = !categoryError;

  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>

      {/* Business category — native <select> with custom chevron */}
      <div style={{ marginTop: 24 }}>
        <label style={labelStyle}>{s.category.label}</label>
        <select
          value={formData.business_category}
          onChange={(e) => onChange({ business_category: e.target.value })}
          onBlur={() => setTouched((prev) => ({ ...prev, category: true }))}
          style={{
            ...inputStyle,
            appearance: 'none',
            backgroundImage:
              'url("data:image/svg+xml;charset=US-ASCII,%3Csvg width=\'12\' height=\'7\' viewBox=\'0 0 12 7\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236B7280\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 16px center',
            paddingRight: 40,
            borderColor: touched.category && categoryError ? '#DC2626' : '#D1D5DB',
          }}
        >
          <option value="" disabled>
            {s.category.placeholder}
          </option>
          <option value="retail">{s.category.options.retail}</option>
          <option value="food">{s.category.options.food}</option>
          <option value="provision">{s.category.options.provision}</option>
          <option value="services">{s.category.options.services}</option>
          <option value="online">{s.category.options.online}</option>
          <option value="other">{s.category.options.other}</option>
        </select>
        {touched.category && categoryError && (
          <div style={errorTextStyle}>{categoryError}</div>
        )}
      </div>

      {/* CAC RC Number (optional) */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{s.cac.label}</label>
        <input
          type="text"
          autoComplete="off"
          value={formData.cac_rc_number}
          placeholder={s.cac.placeholder}
          onChange={(e) => onChange({ cac_rc_number: e.target.value })}
          style={inputStyle}
        />
      </div>

      {/* Business address (optional) */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{s.address.label}</label>
        <input
          type="text"
          autoComplete="street-address"
          value={formData.business_address}
          placeholder={s.address.placeholder}
          onChange={(e) => onChange({ business_address: e.target.value })}
          style={inputStyle}
        />
      </div>

      <PrimaryButton onClick={onContinue} disabled={!canContinue}>
        {s.cta}
      </PrimaryButton>
    </>
  );
}

function Step3IdPhoto({ onContinue }: { onContinue: () => void }) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step3;
  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>
      {/* TODO(5.5): camera capture input + preview + retake + upload to kyc-photos bucket */}
      <StubBlock>Photo capture will be added in step 5.5.</StubBlock>
      <PrimaryButton onClick={onContinue}>{s.cta}</PrimaryButton>
    </>
  );
}

function Step4Review({ onSubmit }: { onSubmit: () => void }) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step4;
  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>
      {/* TODO(5.6): ReviewRow per field + photo thumbnail + confirmation checkbox + submit_kyc_v1 RPC */}
      <StubBlock>Review rows, confirmation checkbox, and submit RPC will be added in step 5.6.</StubBlock>
      <PrimaryButton onClick={onSubmit}>{s.cta}</PrimaryButton>
    </>
  );
}

function SuccessScreen({ onDone }: { onDone: () => void }) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.success;
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16, color: '#00894F' }} aria-hidden>
        ✓
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
        {s.heading}
      </h1>
      <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.5, marginBottom: 32 }}>
        {s.help}
      </p>
      <div style={{ maxWidth: 320, margin: '0 auto' }}>
        <PrimaryButton onClick={onDone}>{s.cta}</PrimaryButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared layout primitives (inline-duplicated from SubaccountWizard
// per docs/KYC_V1_FRONTEND_PATTERNS.md Rule 2)
// ─────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#F6F6F7',
        padding: '1.5rem 1rem 3rem',
      }}
    >
      <div style={{ maxWidth: 560, margin: '0 auto' }}>{children}</div>
    </div>
  );
}

function ProgressStrip({
  step,
  total,
  label,
}: {
  step: 1 | 2 | 3 | 4;
  total: number;
  label: string;
}) {
  const pct = Math.round((step / total) * 100);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 8 }}>{label}</div>
      <div
        style={{
          height: 6,
          background: '#E5E7EB',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: '#00894F',
            transition: 'width 0.25s ease-out',
          }}
        />
      </div>
    </div>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
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
      {label}
    </button>
  );
}

function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
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
        marginTop: 24,
      }}
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        minHeight: 48,
        padding: '12px 20px',
        background: '#FFFFFF',
        color: '#374151',
        border: '1.5px solid #D1D5DB',
        borderRadius: 10,
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
// SecondaryButton referenced here so unused-export lint doesn't flag
// it before step content (5.4/5.5/5.6) consumes it.
void SecondaryButton;

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ margin: '0 0 8px 0', fontSize: 24, fontWeight: 700, color: '#111827' }}>
      {children}
    </h1>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '0 0 20px 0', fontSize: 15, color: '#6B7280' }}>{children}</p>;
}

function InlineCard({
  kind,
  children,
}: {
  kind: 'info' | 'success' | 'warn' | 'error';
  children: React.ReactNode;
}) {
  const palette = {
    info: { bg: '#F3F4F6', border: '#E5E7EB' },
    success: { bg: '#ECFDF5', border: '#A7F3D0' },
    warn: { bg: '#FFFBEB', border: '#FDE68A' },
    error: { bg: '#FEF2F2', border: '#FECACA' },
  }[kind];
  return (
    <div
      style={{
        marginTop: 20,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderRadius: 12,
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}

function ErrorCard({ heading, body }: { heading: string; body: string }) {
  return (
    <InlineCard kind="error">
      <div style={{ fontSize: 16, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
        {heading}
      </div>
      <div style={{ fontSize: 15, color: '#374151' }}>{body}</div>
    </InlineCard>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const id = setTimeout(onClose, 5000);
    return () => clearTimeout(id);
  }, [onClose]);
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#991B1B',
        color: '#FFFFFF',
        padding: '12px 16px',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 500,
        zIndex: 9999,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        maxWidth: 520,
      }}
    >
      <span>✕</span>
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#FFFFFF',
          fontSize: 20,
          cursor: 'pointer',
          marginLeft: 8,
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
// Toast referenced here so unused-export lint doesn't flag it before
// step content (5.5/5.6) consumes it for upload + submit errors.
void Toast;

// Scaffold-only placeholder block; removed when 5.4/5.5/5.6 fill in
// the real form/photo/review content.
function StubBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 20,
        background: '#F3F4F6',
        borderRadius: 10,
        color: '#6B7280',
        fontSize: 15,
        marginTop: 16,
      }}
    >
      {children}
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 48,
  padding: '12px 16px',
  fontSize: 16,
  border: '1.5px solid #D1D5DB',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#111827',
  boxSizing: 'border-box',
  marginBottom: 4,
  marginTop: 8,
};

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 0,
};

const errorTextStyle: CSSProperties = {
  marginTop: 6,
  fontSize: 13,
  color: '#DC2626',
  lineHeight: 1.4,
};
