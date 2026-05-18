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

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useStrings } from '../../hooks/useStrings';
import { supabase } from '../../lib/supabase';
import { getUserTier } from '../../services/subscriptionService';

type WizardStep = 'intro' | 1 | 2 | 3 | 4 | 'success';

type KycFormData = {
  bvn: string;
  nin: string;
  phone: string;
  business_category: string;
  cac_rc_number: string;
  business_address: string;
  selfie_url: string; // Storage path stored on success: {user_id}/{kyc_client_id}/selfie.{ext}
  kyc_client_id: string; // Pre-generated UUID used as the storage folder name (NOT the vendor_kyc row id)
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
    // Pre-generated UUID used as the storage folder name. NOT the
    // vendor_kyc.id (which the RPC generates separately). Reviewer
    // reads selfie_url directly so this mismatch is invisible.
    kyc_client_id: crypto.randomUUID(),
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

  useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        // 1. Tier check. Free users → /upgrade with replace so Back
        //    doesn't loop them back into the wizard. Fail-open on null
        //    (transient network blip): let submit_kyc_v1 enforce
        //    server-side — cost of brief entry is zero since no data
        //    persists until submit. Three-way contract per
        //    docs/SESSION_4_LESSONS_CAPTURED.md item 1.
        const tier = await getUserTier(currentUser.uid);
        if (cancelled) return;
        if (tier !== null && !['starter', 'pro', 'business'].includes(tier.tier_id)) {
          navigate('/upgrade', { replace: true });
          return;
        }

        // 2. Store lookup.
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', currentUser.uid)
          .single();
        if (cancelled) return;
        if (storeError || !store) {
          setStoreLoadError(t.errors.storeLoadFailed);
          return;
        }
        setStoreId(store.id);

        // 3. Resubmission pre-fill — only when prior submission was
        //    rejected (resubmittable). BVN/NIN intentionally NOT
        //    pre-filled (encrypted at rest, no decrypt-for-merchant
        //    flow). Selfie URL also not pre-filled — reviewer rejected
        //    the photo, so re-take is the correct UX.
        const { data: priorKyc } = await supabase
          .from('vendor_kyc')
          .select('status, phone, business_category, cac_rc_number, business_address')
          .eq('store_id', store.id)
          .maybeSingle();
        if (cancelled) return;
        if (priorKyc?.status === 'rejected') {
          setFormData((prev) => ({
            ...prev,
            phone: priorKyc.phone || prev.phone,
            business_category: priorKyc.business_category || prev.business_category,
            cac_rc_number: priorKyc.cac_rc_number || prev.cac_rc_number,
            business_address: priorKyc.business_address || prev.business_address,
          }));
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[KycWizard] mount error', err);
        setStoreLoadError(t.errors.storeLoadFailed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, t.errors.storeLoadFailed, navigate]);

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
      {step === 3 && (
        <Step3IdPhoto
          formData={formData}
          onChange={handleFormChange}
          onContinue={() => setStep(4)}
          storeId={storeId}
          userId={currentUser?.uid}
        />
      )}
      {step === 4 && (
        <Step4Review
          formData={formData}
          storeId={storeId}
          onEdit={(targetStep) => setStep(targetStep)}
          onSuccess={() => setStep('success')}
        />
      )}
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

type PhotoState =
  | { kind: 'empty' }
  | { kind: 'preview'; file: File; previewUrl: string }
  | { kind: 'uploading'; file: File; previewUrl: string }
  | { kind: 'error'; file: File; previewUrl: string; message: string };

/**
 * Resize an image client-side only if needed. Returns the original
 * file when within size + dimension thresholds; otherwise returns a
 * Blob of the resized image preserving the original mime type.
 *
 * Thresholds: only resizes if file > 4MB OR longest edge > 2000px.
 * Target: 2000px long edge, quality 0.85, mime type preserved.
 */
async function resizeImageIfNeeded(file: File): Promise<Blob> {
  const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
  const MAX_DIMENSION = 2000; // longest edge
  const QUALITY = 0.85;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Could not read image'));
    i.src = URL.createObjectURL(file);
  });

  const longest = Math.max(img.width, img.height);
  if (file.size <= MAX_BYTES && longest <= MAX_DIMENSION) {
    URL.revokeObjectURL(img.src);
    return file;
  }

  const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
  const newW = Math.round(img.width * scale);
  const newH = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(img.src);
    throw new Error('Canvas context unavailable');
  }
  ctx.drawImage(img, 0, 0, newW, newH);
  URL.revokeObjectURL(img.src);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, file.type, QUALITY);
  });
  if (!blob) throw new Error('Resize failed');
  return blob;
}

function Step3IdPhoto({
  formData,
  onChange,
  onContinue,
  userId,
}: {
  formData: KycFormData;
  onChange: (patch: Partial<KycFormData>) => void;
  onContinue: () => void;
  storeId: string | null;
  userId: string | undefined;
}) {
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step3;
  const [photoState, setPhotoState] = useState<PhotoState>({ kind: 'empty' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke any preview URL on unmount to release the blob memory.
  useEffect(() => {
    return () => {
      if (photoState.kind !== 'empty') {
        URL.revokeObjectURL(photoState.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // HEIC pre-flight rejection — iPhone gallery picks may produce
    // HEIC even though `capture="user"` defaults to JPEG. Bucket only
    // accepts image/jpeg + image/png.
    if (file.type === 'image/heic' || file.type === 'image/heif') {
      setToastMessage(s.errors.heicNotSupported);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setToastMessage(s.errors.invalidFormat);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (photoState.kind !== 'empty') {
      URL.revokeObjectURL(photoState.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoState({ kind: 'preview', file, previewUrl });
  };

  const handleRetake = () => {
    if (photoState.kind !== 'empty') {
      URL.revokeObjectURL(photoState.previewUrl);
    }
    setPhotoState({ kind: 'empty' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleContinue = async () => {
    if (photoState.kind !== 'preview' && photoState.kind !== 'error') return;
    if (!userId) {
      setToastMessage(s.errors.notSignedIn);
      return;
    }

    const file = photoState.file;
    const previewUrl = photoState.previewUrl;
    setPhotoState({ kind: 'uploading', file, previewUrl });

    try {
      const blob = await resizeImageIfNeeded(file);
      const ext = blob.type === 'image/png' ? 'png' : 'jpg';

      // Path: {user_id}/{kyc_client_id}/selfie.{ext}
      // RLS policy on storage.objects requires (storage.foldername(name))[1]
      // = auth.uid()::text. The kyc_client_id second segment is a
      // pre-generated UUID, NOT the vendor_kyc.id row UUID (which the
      // RPC generates separately). Reviewer reads selfie_url directly
      // so this mismatch is invisible.
      //
      // TODO(Phase 1.5): cleanup cron for orphaned
      //   kyc-photos/{user_id}/*/ folders left behind by abandoned
      //   wizards or multi-tab races.
      const path = `${userId}/${formData.kyc_client_id}/selfie.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-photos')
        .upload(path, blob, {
          contentType: blob.type,
          upsert: true, // Allow retry after a failure with the same path
        });

      if (uploadError) {
        console.warn('[KycWizard] upload failed', uploadError);
        setPhotoState({
          kind: 'error',
          file,
          previewUrl,
          message: s.errors.uploadFailed,
        });
        setToastMessage(s.errors.uploadFailed);
        return;
      }

      onChange({ selfie_url: path });
      onContinue();
    } catch (err) {
      console.warn('[KycWizard] resize or upload error', err);
      setPhotoState({
        kind: 'error',
        file,
        previewUrl,
        message: s.errors.uploadFailed,
      });
      setToastMessage(s.errors.uploadFailed);
    }
  };

  const isUploading = photoState.kind === 'uploading';
  const canContinue =
    (photoState.kind === 'preview' || photoState.kind === 'error') && !isUploading;

  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>

      {/* Hidden file input — opened via the styled tap target below */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="user"
        onChange={handleFileChosen}
        style={{ display: 'none' }}
      />

      {photoState.kind === 'empty' && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            marginTop: 24,
            padding: '40px 20px',
            border: '2px dashed #D1D5DB',
            borderRadius: 12,
            background: '#F9FAFB',
            cursor: 'pointer',
            minHeight: 240,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }} aria-hidden>
            📷
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            {s.takeCta}
          </div>
          <div style={{ fontSize: 14, color: '#6B7280', maxWidth: 280 }}>{s.takeHelp}</div>
        </button>
      )}

      {photoState.kind !== 'empty' && (
        <div style={{ marginTop: 24, position: 'relative' }}>
          <img
            src={photoState.previewUrl}
            alt={s.previewAlt}
            style={{
              display: 'block',
              width: '100%',
              maxHeight: 320,
              objectFit: 'contain',
              borderRadius: 12,
              background: '#000000',
            }}
          />
          {!isUploading && (
            <button
              type="button"
              onClick={handleRetake}
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: '#374151',
                background: '#FFFFFF',
                border: '1.5px solid #D1D5DB',
                borderRadius: 10,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              }}
            >
              {s.retake}
            </button>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 20px',
          marginTop: 24,
          fontSize: 16,
          fontWeight: 600,
          color: canContinue ? '#FFFFFF' : '#6B7280',
          background: canContinue ? '#00894F' : '#E5E7EB',
          border: 'none',
          borderRadius: 10,
          cursor: canContinue ? 'pointer' : 'not-allowed',
        }}
      >
        {isUploading ? s.uploading : s.cta}
      </button>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
    </>
  );
}

function ReviewRow({
  label,
  value,
  onEdit,
  editLabel = 'Edit',
}: {
  label: string;
  value: string;
  onEdit?: () => void;
  editLabel?: string;
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 2 }}>{label}</div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {value || '—'}
        </div>
      </div>
      {onEdit && (
        <button
          type="button"
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
            marginLeft: 8,
          }}
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

type SubmitState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string };

function Step4Review({
  formData,
  storeId,
  onEdit,
  onSuccess,
}: {
  formData: KycFormData;
  storeId: string | null;
  onEdit: (step: 1 | 2 | 3) => void;
  onSuccess: () => void;
}) {
  const navigate = useNavigate();
  const strings = useStrings() as any;
  const s = strings.paystackSetup.kyc.wizard.step4;
  const tCategory = strings.paystackSetup.kyc.wizard.step2.category.options;

  const [confirmed, setConfirmed] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ kind: 'idle' });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [photoSignedUrl, setPhotoSignedUrl] = useState<string | null>(null);

  // Photo thumbnail: signed URL fetched on mount. Decision 3 (5.6
  // pre-audit Task J.1) — works for both fresh-submit and resubmission
  // cases. The Step 3 previewUrl is revoked on Step 3 unmount, so we
  // can't reuse it.
  useEffect(() => {
    if (!formData.selfie_url) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.storage
          .from('kyc-photos')
          .createSignedUrl(formData.selfie_url, 3600);
        if (cancelled) return;
        if (error) {
          console.warn('[Step4Review] photo signed URL error', error);
          setToastMessage(s.errors.photoLoadFailed);
          return;
        }
        setPhotoSignedUrl(data.signedUrl);
      } catch (err) {
        if (cancelled) return;
        console.warn('[Step4Review] photo fetch error', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.selfie_url, s.errors.photoLoadFailed]);

  // RPC error tag → user-facing message. subscription_required and
  // already_pending have special paths in handleSubmit and never reach
  // this mapper.
  const mapErrorToMessage = (rpcMessage: string): string => {
    if (rpcMessage.includes('confirmation_required')) return s.errors.confirmationRequired;
    if (rpcMessage.includes('invalid_bvn_format')) return s.errors.invalidBvnFormat;
    if (rpcMessage.includes('invalid_nin_format')) return s.errors.invalidNinFormat;
    if (rpcMessage.includes('bvn_nin_identical')) return s.errors.bvnNinIdentical;
    if (rpcMessage.includes('invalid_phone_format')) return s.errors.invalidPhoneFormat;
    if (rpcMessage.includes('invalid_business_category')) return s.errors.invalidBusinessCategory;
    if (rpcMessage.includes('account_frozen_contact_support')) return s.errors.accountFrozen;
    if (rpcMessage.includes('max_resubmissions_exceeded')) return s.errors.maxResubmissionsExceeded;
    if (rpcMessage.includes('unauthorized')) return s.errors.unauthorized;
    return s.errors.generic;
  };

  const handleSubmit = async () => {
    if (!storeId) {
      setToastMessage(s.errors.generic);
      return;
    }

    setSubmitState({ kind: 'submitting' });

    try {
      const { data, error } = await supabase.rpc('submit_kyc_v1', {
        p_store_id: storeId,
        p_bvn: formData.bvn,
        p_nin: formData.nin,
        p_phone: formData.phone,
        p_business_category: formData.business_category,
        p_selfie_url: formData.selfie_url,
        p_cac_rc_number: formData.cac_rc_number || null,
        p_business_address: formData.business_address || null,
        p_confirmation_accepted: confirmed,
      });

      if (error) {
        const msg = error.message || '';

        // Decision 2: subscription_required → /upgrade. User downgraded
        // mid-wizard or grace period expired — direct them to billing.
        if (msg.includes('subscription_required')) {
          navigate('/upgrade', { replace: true });
          return;
        }

        // Decision 4: already_pending → silent success. Most likely a
        // double-tap; the user's intent was fulfilled on the first
        // click. Surfacing "we already received this" would confuse
        // them. Log for defensive diagnostics.
        if (msg.includes('already_pending')) {
          console.info('[Step4Review] already_pending → silent success');
          onSuccess();
          return;
        }

        console.warn('[Step4Review] submit_kyc_v1 error', error);
        const userMessage = mapErrorToMessage(msg);
        setSubmitState({ kind: 'error', message: userMessage });
        setToastMessage(userMessage);
        return;
      }

      console.info('[Step4Review] submitted', data);
      onSuccess();
    } catch (err) {
      console.warn('[Step4Review] submit exception', err);
      setSubmitState({ kind: 'error', message: s.errors.generic });
      setToastMessage(s.errors.generic);
    }
  };

  const isSubmitting = submitState.kind === 'submitting';
  const canSubmit = confirmed && !isSubmitting && Boolean(storeId);

  // Mask middle digits for display (e.g. "2********21").
  const maskMiddle = (str: string): string => {
    if (!str || str.length < 4) return str;
    return str.slice(0, 1) + '*'.repeat(str.length - 3) + str.slice(-2);
  };

  // Resolve business category label from step2 strings (decision 7 —
  // single source of truth, no duplication in step4 keys).
  const categoryLabel = formData.business_category
    ? tCategory[formData.business_category as keyof typeof tCategory] ||
      formData.business_category
    : '';

  return (
    <>
      <Heading>{s.heading}</Heading>
      <HelpText>{s.help}</HelpText>

      <div style={{ marginTop: 24 }}>
        <ReviewRow
          label={s.labels.bvn}
          value={maskMiddle(formData.bvn)}
          onEdit={() => onEdit(1)}
          editLabel={s.editLabel}
        />
        <ReviewRow
          label={s.labels.nin}
          value={maskMiddle(formData.nin)}
          onEdit={() => onEdit(1)}
          editLabel={s.editLabel}
        />
        <ReviewRow
          label={s.labels.phone}
          value={formData.phone}
          onEdit={() => onEdit(1)}
          editLabel={s.editLabel}
        />
        <ReviewRow
          label={s.labels.category}
          value={categoryLabel}
          onEdit={() => onEdit(2)}
          editLabel={s.editLabel}
        />
        <ReviewRow
          label={s.labels.cac}
          value={formData.cac_rc_number || s.values.optionalNotProvided}
          onEdit={() => onEdit(2)}
          editLabel={s.editLabel}
        />
        <ReviewRow
          label={s.labels.address}
          value={formData.business_address || s.values.optionalNotProvided}
          onEdit={() => onEdit(2)}
          editLabel={s.editLabel}
        />
      </div>

      {/* Photo thumbnail */}
      <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 13, color: '#6B7280' }}>{s.labels.photo}</div>
          <button
            type="button"
            onClick={() => onEdit(3)}
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
            {s.editLabel}
          </button>
        </div>
        {photoSignedUrl ? (
          <img
            src={photoSignedUrl}
            alt={s.values.photoCapturedAlt}
            style={{
              display: 'block',
              width: '100%',
              maxHeight: 240,
              objectFit: 'contain',
              borderRadius: 12,
              background: '#000000',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 120,
              background: '#F3F4F6',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280',
              fontSize: 14,
            }}
          >
            {s.values.photoLoading}
          </div>
        )}
      </div>

      {/* Confirmation checkbox */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <input
          type="checkbox"
          id="kyc-confirmation"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          style={{
            transform: 'scale(1.25)',
            accentColor: '#00894F',
            cursor: 'pointer',
            marginTop: 2,
          }}
        />
        <label
          htmlFor="kyc-confirmation"
          style={{
            fontSize: 15,
            color: '#374151',
            lineHeight: 1.5,
            cursor: 'pointer',
            flex: 1,
          }}
        >
          {s.confirmation}
        </label>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: '100%',
          minHeight: 48,
          padding: '12px 20px',
          marginTop: 24,
          fontSize: 16,
          fontWeight: 600,
          color: canSubmit ? '#FFFFFF' : '#6B7280',
          background: canSubmit ? '#00894F' : '#E5E7EB',
          border: 'none',
          borderRadius: 10,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {isSubmitting ? s.submitting : s.cta}
      </button>

      {toastMessage && (
        <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      )}
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
