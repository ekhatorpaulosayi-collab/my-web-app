// KycEditForm.tsx
//
// Limited edit form for approved KYC merchants, at
// /settings/payments/identity-verification/edit.
//
// Scope (per spec §6.4 + locked decision 2):
// - Freely editable: phone, business_category, cac_rc_number, business_address
// - BVN/NIN/photo NOT in this form — separate "Re-do verification →" link
//   routes back to the wizard which handles re-review via submit_kyc_v1.
//
// Single page, no progress strip. Mirrors wizard step 1/2 input patterns.
// Calls update_kyc_after_approval RPC (NOT direct UPDATE).

import { useEffect, useState, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { supabase } from '../../lib/supabase';
import { getUserTier } from '../../services/subscriptionService';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'loaded' }
  | { kind: 'forbidden'; reason: 'not_approved' | 'no_kyc' | 'unauthorized' }
  | { kind: 'error'; message: string };

type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'error'; message: string };

type EditFormData = {
  phone: string;
  business_category: string;
  cac_rc_number: string;
  business_address: string;
};

export default function KycEditForm() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const strings = useStrings() as any;
  const t = strings.paystackSetup.kyc.edit;
  const tCategoryOpts = strings.paystackSetup.kyc.wizard.step2.category.options;

  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const [storeId, setStoreId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [initial, setInitial] = useState<EditFormData | null>(null);
  const [formData, setFormData] = useState<EditFormData>({
    phone: '+234',
    business_category: '',
    cac_rc_number: '',
    business_address: '',
  });

  const [touched, setTouched] = useState<{ phone?: boolean }>({});

  // Load current values on mount.
  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const tier = await getUserTier(currentUser.uid);
        if (cancelled) return;
        if (tier !== null && !['starter', 'pro', 'business'].includes(tier.tier_id)) {
          navigate('/upgrade', { replace: true });
          return;
        }

        const { data: store, error: storeErr } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', currentUser.uid)
          .single();
        if (cancelled) return;
        if (storeErr || !store) {
          setLoadState({ kind: 'error', message: t.errors.loadFailed });
          return;
        }
        setStoreId(store.id);

        const { data: kyc, error: kycErr } = await supabase
          .from('vendor_kyc')
          .select('status, phone, business_category, cac_rc_number, business_address')
          .eq('store_id', store.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (kycErr) {
          setLoadState({ kind: 'error', message: t.errors.loadFailed });
          return;
        }
        if (!kyc) {
          setLoadState({ kind: 'forbidden', reason: 'no_kyc' });
          return;
        }
        if (kyc.status !== 'approved') {
          setLoadState({ kind: 'forbidden', reason: 'not_approved' });
          return;
        }

        const loaded: EditFormData = {
          phone: kyc.phone || '+234',
          business_category: kyc.business_category || '',
          cac_rc_number: kyc.cac_rc_number || '',
          business_address: kyc.business_address || '',
        };
        setInitial(loaded);
        setFormData(loaded);
        setLoadState({ kind: 'loaded' });
      } catch (err) {
        if (cancelled) return;
        console.warn('[KycEditForm] load error', err);
        setLoadState({ kind: 'error', message: t.errors.loadFailed });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, navigate, t.errors.loadFailed]);

  // Phone validation (mirrors wizard Step 1 verbatim).
  const phoneTrailing = formData.phone.startsWith('+234') ? formData.phone.slice(4) : '';

  const validatePhone = (trailing: string): string | null => {
    if (!trailing) return t.errors.phoneRequired;
    if (!/^\d+$/.test(trailing)) return t.errors.phoneDigitsOnly;
    if (trailing.length !== 10) return t.errors.phoneLength;
    if (!/^[789]/.test(trailing)) return t.errors.phoneStartsWith789;
    return null;
  };

  const phoneError = validatePhone(phoneTrailing);
  const categoryError = !formData.business_category ? t.errors.categoryRequired : null;

  // Detect dirty state.
  const isDirty =
    initial !== null &&
    (formData.phone !== initial.phone ||
      formData.business_category !== initial.business_category ||
      formData.cac_rc_number !== initial.cac_rc_number ||
      formData.business_address !== initial.business_address);

  const canSave = isDirty && !phoneError && !categoryError && saveState.kind !== 'saving';

  const handleNumericInput = (raw: string, max: number): string => {
    return raw.replace(/\D/g, '').slice(0, max);
  };

  const mapErrorToMessage = (rpcMessage: string): string => {
    if (rpcMessage.includes('not_approved')) return t.errors.notApproved;
    if (rpcMessage.includes('invalid_phone_format')) return t.errors.invalidPhoneFormat;
    if (rpcMessage.includes('invalid_business_category')) return t.errors.invalidBusinessCategory;
    if (rpcMessage.includes('unauthorized')) return t.errors.unauthorized;
    if (rpcMessage.includes('no_kyc_record')) return t.errors.noKycRecord;
    return t.errors.generic;
  };

  const handleSave = async () => {
    if (!storeId || !canSave) return;
    setSaveState({ kind: 'saving' });

    try {
      const { error } = await supabase.rpc('update_kyc_after_approval', {
        p_store_id: storeId,
        p_phone: formData.phone,
        p_business_category: formData.business_category,
        p_cac_rc_number: formData.cac_rc_number || null,
        p_business_address: formData.business_address || null,
      });

      if (error) {
        console.warn('[KycEditForm] save error', error);
        const msg = mapErrorToMessage(error.message || '');
        setSaveState({ kind: 'error', message: msg });
        setToastMessage(msg);
        return;
      }

      // Success — navigate back to /settings/payments.
      navigate('/settings/payments');
    } catch (err) {
      console.warn('[KycEditForm] save exception', err);
      setSaveState({ kind: 'error', message: t.errors.generic });
      setToastMessage(t.errors.generic);
    }
  };

  // Loading state.
  if (loadState.kind === 'loading') {
    return (
      <Shell>
        <div style={{ padding: 40, textAlign: 'center', color: '#6B7280' }}>{t.loading}</div>
      </Shell>
    );
  }

  // Forbidden / error states.
  if (loadState.kind === 'forbidden') {
    return (
      <Shell>
        <BackLink label={t.backToPayments} onClick={() => navigate('/settings/payments')} />
        <Heading>{t.forbidden.heading}</Heading>
        <HelpText>{t.forbidden[loadState.reason]}</HelpText>
      </Shell>
    );
  }
  if (loadState.kind === 'error') {
    return (
      <Shell>
        <BackLink label={t.backToPayments} onClick={() => navigate('/settings/payments')} />
        <Heading>{t.errors.heading}</Heading>
        <HelpText>{loadState.message}</HelpText>
      </Shell>
    );
  }

  // Loaded — render form.
  const isSaving = saveState.kind === 'saving';

  return (
    <Shell>
      <BackLink label={t.backToPayments} onClick={() => navigate('/settings/payments')} />

      <Heading>{t.heading}</Heading>
      <HelpText>{t.help}</HelpText>
      <HelpText>{t.reReviewWarning}</HelpText>

      {/* Phone */}
      <div style={{ marginTop: 24 }}>
        <label style={labelStyle}>{t.fields.phone.label}</label>
        <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 8 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '14px 12px',
              fontSize: 16,
              lineHeight: 1.5,
              border: '1.5px solid #D1D5DB',
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
            placeholder={t.fields.phone.placeholder}
            onChange={(e) => {
              const trailing = handleNumericInput(e.target.value, 10);
              setFormData((prev) => ({ ...prev, phone: '+234' + trailing }));
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

      {/* Business category */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{t.fields.category.label}</label>
        <select
          value={formData.business_category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, business_category: e.target.value }))
          }
          style={{
            ...inputStyle,
            appearance: 'none',
            backgroundImage:
              'url("data:image/svg+xml;charset=US-ASCII,%3Csvg width=\'12\' height=\'7\' viewBox=\'0 0 12 7\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%236B7280\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 16px center',
            paddingRight: 40,
          }}
        >
          <option value="" disabled>
            {t.fields.category.placeholder}
          </option>
          <option value="retail">{tCategoryOpts.retail}</option>
          <option value="food">{tCategoryOpts.food}</option>
          <option value="provision">{tCategoryOpts.provision}</option>
          <option value="services">{tCategoryOpts.services}</option>
          <option value="online">{tCategoryOpts.online}</option>
          <option value="other">{tCategoryOpts.other}</option>
        </select>
      </div>

      {/* CAC */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{t.fields.cac.label}</label>
        <input
          type="text"
          value={formData.cac_rc_number}
          placeholder={t.fields.cac.placeholder}
          onChange={(e) => setFormData((prev) => ({ ...prev, cac_rc_number: e.target.value }))}
          style={inputStyle}
        />
      </div>

      {/* Business address */}
      <div style={{ marginTop: 20 }}>
        <label style={labelStyle}>{t.fields.address.label}</label>
        <input
          type="text"
          value={formData.business_address}
          placeholder={t.fields.address.placeholder}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, business_address: e.target.value }))
          }
          style={inputStyle}
        />
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={!canSave}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 16px',
          marginTop: 32,
          fontSize: 16,
          fontWeight: 600,
          color: canSave ? '#FFFFFF' : '#6B7280',
          background: canSave ? '#00894F' : '#E5E7EB',
          border: 'none',
          borderRadius: 10,
          cursor: canSave ? 'pointer' : 'not-allowed',
        }}
      >
        {isSaving ? t.saving : isDirty ? t.saveCta : t.noChangesCta}
      </button>

      {/* Re-do verification link (locked decision 4) */}
      <div
        style={{
          marginTop: 32,
          padding: 16,
          background: '#FEF3C7',
          border: '1px solid #FCD34D',
          borderRadius: 10,
        }}
      >
        <div style={{ fontSize: 14, color: '#92400E', marginBottom: 8 }}>
          {t.redoVerification.help}
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings/payments/identity-verification')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#00894F',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {t.redoVerification.cta}
        </button>
      </div>

      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </Shell>
  );
}

// Inline primitives — same pattern as KycWizard / SubaccountWizard.
// Per spec §9.1 + KYC_V1_FOCUS_RULES.md rule 2: inline-duplicate, don't refactor.

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#F6F6F7', minHeight: '100vh' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>
        {children}
      </div>
    </div>
  );
}

function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        color: '#374151',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
        padding: '12px 0',
        minHeight: 48,
      }}
    >
      {label}
    </button>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '8px 0 8px' }}>
      {children}
    </h1>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 15,
        fontWeight: 400,
        color: '#6B7280',
        lineHeight: 1.5,
        margin: '8px 0',
      }}
    >
      {children}
    </p>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        padding: '14px 20px',
        background: '#991B1B',
        color: '#FFFFFF',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: 500,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        maxWidth: 520,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#FFFFFF',
          fontSize: 20,
          cursor: 'pointer',
          padding: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  fontSize: 16,
  lineHeight: 1.5,
  border: '1.5px solid #D1D5DB',
  borderRadius: 10,
  background: '#FFFFFF',
  color: '#111827',
  outline: 'none',
  marginTop: 8,
  boxSizing: 'border-box',
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
