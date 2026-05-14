/**
 * SubaccountWizard
 *
 * 5-step wizard for setting up a vendor's Paystack subaccount:
 *   Step 1 — Business name
 *   Step 2 — Bank
 *   Step 3 — Account number + auto-resolve confirmation
 *   Step 4 — Review
 *   Step 4.5 — "Coming soon" terminal (shown when submit returns 503)
 *   Step 5 — Success confirmation
 *
 * State lives in component-local useState. No URL params, no
 * sessionStorage. Refresh restarts the wizard — acceptable for v1.
 *
 * ────────────────────────────────────────────────────────────────
 * ERROR ROUTING TABLE (reference for anyone debugging error paths)
 *
 *  Where                 | What                       | UI
 *  ----------------------|----------------------------|-----------------------------------
 *  Any step input        | Validation (length/format) | Inline under field, no toast
 *  Step 3 resolve        | Could not resolve / 4xx    | Inline error card with Try again
 *  Step 3 resolve        | Network failure            | Inline error card with Try again
 *  Step 3 resolve        | 503 (flag off)             | Inline error card with Back-to-settings
 *  Step 4 submit         | 503                        | Dedicated Step 4.5 screen, clears state
 *  Step 4 submit         | Network / 500 / 4xx other  | Toast + stay on Step 4 with data intact
 *  Step 4 submit         | Success                    | Advance to Step 5 with subaccount ref
 * ────────────────────────────────────────────────────────────────
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { supabase } from '../../lib/supabase';
import {
  NIGERIAN_BANKS_WITH_CODES,
  BankWithCode,
  formatAccountNumber,
} from '../../utils/nigerianBanks';

const FLAG_ON = import.meta.env.VITE_ENABLE_PAYSTACK_SUBACCOUNTS === 'true';

type ResolveState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'resolved'; accountName: string }
  | { kind: 'not_found' }
  | { kind: 'network_error' }
  | { kind: 'flag_off' };

type WizardStep = 1 | 2 | 3 | 4 | 4.5 | 5;

function interp(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function SubaccountWizard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const strings = useStrings() as any;
  const t = strings.paystackSetup.wizard;

  // Outer flag gate — if flag is off, bounce back to the landing.
  // The landing renders the "Coming soon" placeholder.
  useEffect(() => {
    if (!FLAG_ON) {
      navigate('/settings/payments', { replace: true });
    }
  }, [navigate]);

  const [step, setStep] = useState<WizardStep>(1);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [bank, setBank] = useState<BankWithCode | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolve, setResolve] = useState<ResolveState>({ kind: 'idle' });

  // Submit state (Step 4)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitToast, setSubmitToast] = useState<string | null>(null);
  const [subaccountRef, setSubaccountRef] = useState<string | null>(null);

  // Store lookup — fetch stores.id by user_id so callers don't have
  // to assume currentUser.uid === stores.id (works for multi-store
  // futures and matches the existing useStore() pattern).
  const [storeId, setStoreId] = useState<string | null>(null);
  const [storeLoadError, setStoreLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStore() {
      if (!currentUser?.uid) return;
      const { data, error } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', currentUser.uid)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setStoreLoadError(error?.message || 'store_not_found');
        return;
      }
      setStoreId(data.id);
    }
    loadStore();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // ───────── Resolve auto-fire when account number reaches 10 digits ─────────
  useEffect(() => {
    if (accountNumber.length !== 10 || !bank || !storeId) {
      // Reset any prior resolve state once the user edits below 10 digits.
      if (resolve.kind !== 'idle' && accountNumber.length < 10) {
        setResolve({ kind: 'idle' });
      }
      return;
    }
    if (resolve.kind === 'resolved' || resolve.kind === 'loading') return;

    let cancelled = false;
    setResolve({ kind: 'loading' });

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('resolve-bank-account', {
          body: {
            store_id: storeId,
            bank_code: bank.code,
            account_number: accountNumber,
          },
        });
        if (cancelled) return;

        // supabase.functions.invoke returns { data, error } where
        // a non-2xx response shows up as a FunctionsHttpError. The
        // edge function's 503 flag-off response lands here as an
        // error with context.response carrying the status.
        if (error) {
          // Try to detect 503 specifically. The Supabase client
          // exposes the underlying Response on error.context.
          const status = (error as any)?.context?.status;
          if (status === 503) {
            setResolve({ kind: 'flag_off' });
            return;
          }
          // 4xx including invalid_account_number / store_not_found
          // / forbidden — bucket as "not found" from the user's
          // perspective. They can't tell the difference and the
          // remediation (re-check the number/bank) is the same.
          if (status && status >= 400 && status < 500) {
            setResolve({ kind: 'not_found' });
            return;
          }
          setResolve({ kind: 'network_error' });
          return;
        }

        if (data?.account_name) {
          setResolve({ kind: 'resolved', accountName: data.account_name });
        } else {
          setResolve({ kind: 'not_found' });
        }
      } catch {
        if (cancelled) return;
        setResolve({ kind: 'network_error' });
      }
    })();

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountNumber, bank, storeId]);

  // ───────── Submit (Step 4) ─────────
  const handleSubmit = async () => {
    if (!storeId || !bank || resolve.kind !== 'resolved') return;
    setIsSubmitting(true);
    setSubmitToast(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-paystack-subaccount', {
        body: {
          store_id: storeId,
          business_name: businessName.trim(),
          settlement_bank: bank.code,
          account_number: accountNumber,
        },
      });

      if (error) {
        const status = (error as any)?.context?.status;
        if (status === 503) {
          // Dedicated terminal screen, not a toast.
          setStep(4.5);
          return;
        }
        if (status === 0 || !status) {
          setSubmitToast(t.step4.toastNetwork);
        } else {
          setSubmitToast(t.step4.toastGeneric);
        }
        console.warn('[SubaccountWizard] submit failed', { status, error });
        return;
      }

      // Future success path (when Paystack is wired in Session 3 proper).
      const code = data?.subaccount?.subaccount_code || data?.subaccount?.mock_code || null;
      setSubaccountRef(code);
      setStep(5);
    } catch (e) {
      setSubmitToast(t.step4.toastNetwork);
      console.warn('[SubaccountWizard] submit threw', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ───────── Render ─────────
  if (!FLAG_ON) return null; // useEffect redirect handles the navigate
  if (storeLoadError) {
    return (
      <Shell>
        <ErrorCard
          heading="Couldn't load your store"
          body="Refresh the page and try again. If this keeps happening, contact support."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Toast at top of viewport for non-503 submit errors */}
      {submitToast && (
        <Toast message={submitToast} onClose={() => setSubmitToast(null)} />
      )}

      {step !== 4.5 && step !== 5 && (
        <ProgressStrip step={step as 1 | 2 | 3 | 4} total={5} label={interp(t.stepLabel, { n: step as number })} />
      )}

      {step === 1 && (
        <Step1
          value={businessName}
          onChange={setBusinessName}
          onContinue={() => setStep(2)}
          strings={t.step1}
          backLabel={t.back}
          onBack={() => navigate('/settings/payments')}
        />
      )}

      {step === 2 && (
        <Step2
          value={bank}
          onChange={(b) => {
            setBank(b);
            // Clear resolve state if user changes bank after step 3.
            setResolve({ kind: 'idle' });
          }}
          onContinue={() => setStep(3)}
          onBack={() => setStep(1)}
          strings={t.step2}
          backLabel={t.back}
        />
      )}

      {step === 3 && bank && (
        <Step3
          bank={bank}
          accountNumber={accountNumber}
          onAccountNumberChange={(n) => setAccountNumber(formatAccountNumber(n))}
          resolve={resolve}
          onRetryResolve={() => {
            // Briefly clear the account number, then restore so the
            // resolve effect re-fires from idle. Without this round-trip
            // the effect's guards would short-circuit on the same value.
            const current = accountNumber;
            setResolve({ kind: 'idle' });
            setAccountNumber('');
            setTimeout(() => setAccountNumber(current), 0);
          }}
          onYesContinue={() => setStep(4)}
          onEditAccount={() => {
            setAccountNumber('');
            setResolve({ kind: 'idle' });
          }}
          onBack={() => setStep(2)}
          onBackToSettings={() => navigate('/settings/payments')}
          strings={t.step3}
          backLabel={t.back}
        />
      )}

      {step === 4 && bank && resolve.kind === 'resolved' && (
        <Step4
          businessName={businessName}
          bank={bank}
          accountNumber={accountNumber}
          accountName={resolve.accountName}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onEditField={(field) => {
            if (field === 'businessName') setStep(1);
            if (field === 'bank') setStep(2);
            if (field === 'accountNumber') {
              setAccountNumber('');
              setResolve({ kind: 'idle' });
              setStep(3);
            }
          }}
          onBack={() => setStep(3)}
          strings={t.step4}
          backLabel={t.back}
        />
      )}

      {step === 4.5 && (
        <Step4_5
          strings={t.step4_5}
          onBackToSettings={() => navigate('/settings/payments')}
        />
      )}

      {step === 5 && bank && (
        <Step5
          bank={bank}
          accountNumber={accountNumber}
          accountName={resolve.kind === 'resolved' ? resolve.accountName : ''}
          subaccountRef={subaccountRef}
          strings={t.step5}
          onBackToSettings={() => navigate('/settings/payments')}
        />
      )}
    </Shell>
  );
}

// ─────────────────────────────────────────────────────────────────
// Shared layout
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

function ProgressStrip({ step, total, label }: { step: 1 | 2 | 3 | 4; total: number; label: string }) {
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
      ← {label}
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

// ─────────────────────────────────────────────────────────────────
// Step 1 — Business name
// ─────────────────────────────────────────────────────────────────

function Step1({
  value,
  onChange,
  onContinue,
  onBack,
  strings: s,
  backLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
  strings: any;
  backLabel: string;
}) {
  const canContinue = value.trim().length > 0;
  return (
    <>
      <BackLink label={backLabel} onClick={onBack} />
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={s.placeholder}
        autoFocus
        style={inputStyle}
      />
      <PrimaryButton onClick={onContinue} disabled={!canContinue}>
        {s.cta}
      </PrimaryButton>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 2 — Bank
// ─────────────────────────────────────────────────────────────────

function Step2({
  value,
  onChange,
  onContinue,
  onBack,
  strings: s,
  backLabel,
}: {
  value: BankWithCode | null;
  onChange: (b: BankWithCode | null) => void;
  onContinue: () => void;
  onBack: () => void;
  strings: any;
  backLabel: string;
}) {
  return (
    <>
      <BackLink label={backLabel} onClick={onBack} />
      <Heading>{s.heading}</Heading>
      <input
        type="text"
        list="nigerian-banks"
        value={value?.name || ''}
        onChange={(e) => {
          const typed = e.target.value;
          const match = NIGERIAN_BANKS_WITH_CODES.find(
            (b) => b.name.toLowerCase() === typed.toLowerCase()
          );
          onChange(match || null);
        }}
        placeholder={s.placeholder}
        autoComplete="off"
        style={inputStyle}
      />
      <datalist id="nigerian-banks">
        {NIGERIAN_BANKS_WITH_CODES.map((b) => (
          <option key={b.code} value={b.name} />
        ))}
      </datalist>
      <PrimaryButton onClick={onContinue} disabled={!value}>
        {s.cta}
      </PrimaryButton>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 3 — Account number + resolve
// ─────────────────────────────────────────────────────────────────

function Step3({
  bank,
  accountNumber,
  onAccountNumberChange,
  resolve,
  onRetryResolve,
  onYesContinue,
  onEditAccount,
  onBack,
  onBackToSettings,
  strings: s,
  backLabel,
}: {
  bank: BankWithCode;
  accountNumber: string;
  onAccountNumberChange: (v: string) => void;
  resolve: ResolveState;
  onRetryResolve: () => void;
  onYesContinue: () => void;
  onEditAccount: () => void;
  onBack: () => void;
  onBackToSettings: () => void;
  strings: any;
  backLabel: string;
}) {
  const len = accountNumber.length;
  const showTooShortError = len > 0 && len < 10 && resolve.kind === 'idle';

  return (
    <>
      <BackLink label={backLabel} onClick={onBack} />
      <Heading>{s.heading}</Heading>
      <HelpText>{interp(s.helpWithBank, { bank: bank.name })}</HelpText>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={accountNumber}
          maxLength={10}
          onChange={(e) => onAccountNumberChange(e.target.value)}
          placeholder="0123456789"
          style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          autoFocus
          disabled={resolve.kind === 'resolved'}
        />
        {resolve.kind === 'resolved' && (
          <button
            onClick={onEditAccount}
            style={{
              minHeight: 48,
              padding: '12px 16px',
              background: '#FFFFFF',
              color: '#00894F',
              border: '1.5px solid #00894F',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Edit
          </button>
        )}
      </div>

      {/* Digit counter / inline validation */}
      {resolve.kind !== 'resolved' && (
        <div style={{ marginTop: 6, fontSize: 14, color: showTooShortError ? '#DC2626' : '#6B7280' }}>
          {showTooShortError ? interp(s.tooShort, { n: len }) : interp(s.digitCount, { n: len })}
        </div>
      )}

      {/* Resolve state cards */}
      {resolve.kind === 'loading' && (
        <InlineCard kind="info">
          <span style={{ fontSize: 16 }}>⏳ {interp(s.looking, { bank: bank.name })}</span>
        </InlineCard>
      )}

      {resolve.kind === 'resolved' && (
        <InlineCard kind="success">
          <div style={{ fontSize: 14, color: '#065F46', marginBottom: 4 }}>✓ {s.foundHeading}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{resolve.accountName}</div>
          <div style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
            {bank.name} • {accountNumber}
          </div>
          <div style={{ fontSize: 15, color: '#374151', margin: '16px 0 12px' }}>{s.foundIsItYou}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <SecondaryButton onClick={onEditAccount}>{s.noFix}</SecondaryButton>
            <div style={{ flex: 1, minWidth: 200 }}>
              <PrimaryButton onClick={onYesContinue}>{s.yesContinue} →</PrimaryButton>
            </div>
          </div>
        </InlineCard>
      )}

      {resolve.kind === 'not_found' && (
        <InlineCard kind="error">
          <div style={{ fontSize: 16, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
            ✕ {s.notFoundHeading}
          </div>
          <div style={{ fontSize: 15, color: '#374151', marginBottom: 12 }}>
            {interp(s.notFoundBody, { bank: bank.name, last4: accountNumber.slice(-4) })}
          </div>
          <SecondaryButton onClick={onRetryResolve}>{s.tryAgain}</SecondaryButton>
        </InlineCard>
      )}

      {resolve.kind === 'network_error' && (
        <InlineCard kind="error">
          <div style={{ fontSize: 16, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>
            ⚠ {s.networkHeading}
          </div>
          <div style={{ fontSize: 15, color: '#374151', marginBottom: 12 }}>{s.networkBody}</div>
          <SecondaryButton onClick={onRetryResolve}>{s.tryAgain}</SecondaryButton>
        </InlineCard>
      )}

      {resolve.kind === 'flag_off' && (
        <InlineCard kind="warn">
          <div style={{ fontSize: 16, fontWeight: 600, color: '#92400E', marginBottom: 6 }}>
            ⚠ {s.comingSoonHeading}
          </div>
          <div style={{ fontSize: 15, color: '#374151', marginBottom: 12 }}>{s.comingSoonBody}</div>
          <SecondaryButton onClick={onBackToSettings}>← Back to settings</SecondaryButton>
        </InlineCard>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4 — Review
// ─────────────────────────────────────────────────────────────────

function Step4({
  businessName,
  bank,
  accountNumber,
  accountName,
  isSubmitting,
  onSubmit,
  onEditField,
  onBack,
  strings: s,
  backLabel,
}: {
  businessName: string;
  bank: BankWithCode;
  accountNumber: string;
  accountName: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  onEditField: (f: 'businessName' | 'bank' | 'accountNumber') => void;
  onBack: () => void;
  strings: any;
  backLabel: string;
}) {
  return (
    <>
      <BackLink label={backLabel} onClick={onBack} />
      <Heading>{s.heading}</Heading>

      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <ReviewRow label={s.labelBusinessName} value={businessName} onEdit={() => onEditField('businessName')} editLabel={s.edit} />
        <ReviewRow label={s.labelBank} value={bank.name} onEdit={() => onEditField('bank')} editLabel={s.edit} />
        <ReviewRow label={s.labelAccountNumber} value={accountNumber} onEdit={() => onEditField('accountNumber')} editLabel={s.edit} />
        <ReviewRow label={s.labelAccountName} value={accountName} muted />
      </div>

      <p style={{ fontSize: 15, color: '#374151', margin: '0 0 24px 0' }}>
        {interp(s.summary, { bank: bank.name, account: accountNumber, name: accountName })}
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <SecondaryButton onClick={onBack}>{s.back}</SecondaryButton>
        <div style={{ flex: 1, minWidth: 220 }}>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            style={{
              width: '100%',
              minHeight: 48,
              padding: '12px 20px',
              background: isSubmitting ? '#E5E7EB' : '#00894F',
              color: isSubmitting ? '#6B7280' : '#FFFFFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? `⏳ ${s.submitting}` : s.submit}
          </button>
        </div>
      </div>
    </>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  editLabel,
  muted,
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  editLabel?: string;
  muted?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: '1px solid #F3F4F6',
      }}
    >
      <div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: muted ? '#6B7280' : '#111827' }}>
          {value || '—'}
        </div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#00894F',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 12px',
            minHeight: 48,
          }}
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 4.5 — Coming soon terminal
// ─────────────────────────────────────────────────────────────────

function Step4_5({
  strings: s,
  onBackToSettings,
}: {
  strings: any;
  onBackToSettings: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }} aria-hidden>
        ⏳
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
        {s.heading}
      </h1>
      <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.5, marginBottom: 32 }}>
        {s.body}
      </p>
      <div style={{ maxWidth: 320, margin: '0 auto' }}>
        <PrimaryButton onClick={onBackToSettings}>{s.cta}</PrimaryButton>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Step 5 — Success
// ─────────────────────────────────────────────────────────────────

function Step5({
  bank,
  accountNumber,
  accountName,
  subaccountRef,
  strings: s,
  onBackToSettings,
}: {
  bank: BankWithCode;
  accountNumber: string;
  accountName: string;
  subaccountRef: string | null;
  strings: any;
  onBackToSettings: () => void;
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16, color: '#00894F' }} aria-hidden>
        ✓
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
        {s.heading}
      </h1>
      <p style={{ fontSize: 16, color: '#374151', lineHeight: 1.5, marginBottom: 8 }}>
        {interp(s.body, { bank: bank.name, account: accountNumber, name: accountName })}
      </p>
      <p style={{ fontSize: 15, color: '#6B7280', marginBottom: 32 }}>{s.next}</p>
      <div style={{ maxWidth: 320, margin: '0 auto' }}>
        <PrimaryButton onClick={onBackToSettings}>{s.cta}</PrimaryButton>
      </div>
      {subaccountRef && (
        <div style={{ marginTop: 32, fontSize: 12, color: '#9CA3AF' }}>
          {s.referencePrefix} {subaccountRef}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Small bits
// ─────────────────────────────────────────────────────────────────

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
      <div style={{ fontSize: 16, fontWeight: 600, color: '#991B1B', marginBottom: 6 }}>{heading}</div>
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

const inputStyle: React.CSSProperties = {
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
};
