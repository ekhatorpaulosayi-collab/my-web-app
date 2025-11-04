import React, { useState, useEffect, useRef } from 'react';
import { getSettings, saveSettings, type Settings } from '../utils/settings';
import { useBusinessProfile } from '../contexts/BusinessProfile.jsx';
import { RECEIPT_SETTINGS_ENABLED } from '../config';
import '../styles/BusinessSettings.css';
import PaymentSettings from './PaymentSettings';

// TEMP: Always enable save button for debugging
const TEMP_ALWAYS_ENABLE_SAVE = true; // turn off later

// Helper functions
const trimAll = (o: any) => {
  const c: any = { ...o };
  Object.keys(c).forEach(k => { if (typeof c[k] === "string") c[k] = c[k].trim(); });
  return c;
};

const isNGPhone = (p?: string) => {
  if (!p) return true; // optional
  const s = p.replace(/\s|-/g, "");
  return /^0\d{10}$/.test(s); // simple: 11 digits, starts with 0
};

const equalJSON = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);

type BusinessSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  onExportCSV?: () => void;
  onSendEOD?: () => void;
  onViewPlans?: () => void;
  isBetaTester?: boolean;
  onToggleBeta?: (value: boolean) => void;
  currentPlan?: string;
  itemCount?: number;
  onToast?: (message: string) => void;
};

export default function BusinessSettings({
  isOpen,
  onClose,
  onExportCSV,
  onSendEOD,
  onViewPlans,
  isBetaTester = false,
  onToggleBeta,
  currentPlan = 'FREE',
  itemCount = 0,
  onToast
}: BusinessSettingsProps) {
  const { profile, setProfile } = useBusinessProfile();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // New state management
  const persisted = getSettings();
  const persistedProfile = useRef(profile);
  const [draft, setDraft] = useState<Settings>(persisted);
  const [saving, setSaving] = useState(false);

  // Load settings when opened
  useEffect(() => {
    if (isOpen) {
      const current = getSettings();
      setDraft(current);
      persistedProfile.current = profile;
      setShowAdvanced(false);
      setShowPayment(false);
    }
  }, [isOpen]);

  // Compute base objects for comparison (trim and remove ignored fields)
  const basePersisted: any = trimAll({ ...persisted, quickSellFromTable: false });
  const baseDraft: any = trimAll({ ...draft, quickSellFromTable: false });

  // If receipt options are hidden, ignore them in compare
  delete basePersisted.receiptMessage;
  delete basePersisted.offerReceiptAfterSale;
  delete basePersisted.autoSendReceiptToSaved;
  delete baseDraft.receiptMessage;
  delete baseDraft.offerReceiptAfterSale;
  delete baseDraft.autoSendReceiptToSaved;

  // Compute dirty and valid states
  const profileChanged = JSON.stringify(profile) !== JSON.stringify(persistedProfile.current);
  const isDirty = !equalJSON(baseDraft, basePersisted) || profileChanged;
  const isValid =
    (draft.businessName?.trim().length ?? 0) > 0 &&
    isNGPhone(draft.businessPhone);

  // DEBUG: Log why save would be disabled
  useEffect(() => {
    console.debug("[Settings] isDirty:", isDirty, "isValid:", isValid, "saving:", saving, {
      phone: draft.businessPhone,
      ngPhone: isNGPhone(draft.businessPhone),
      profileChanged,
      draft: baseDraft,
      persisted: basePersisted
    });
  }, [isDirty, isValid, saving, draft.businessPhone, profileChanged]);

  const update = (k: keyof Settings, v: any) => setDraft(d => ({ ...d, [k]: v }));

  // Save handler with validation on click
  const onSave = async () => {
    if (!TEMP_ALWAYS_ENABLE_SAVE && (!isDirty || !isValid || saving)) return;
    if (!isValid) {
      alert("Please enter a valid Nigerian phone (11 digits, starts with 0) and a business name.");
      return;
    }
    try {
      setSaving(true);
      // Save profile to context (handles localStorage and title update)
      setProfile({
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        phone: profile.phone
      });

      // Merge and save settings
      const toSave = { ...persisted, ...trimAll(draft) };
      saveSettings(toSave);
      window.dispatchEvent(new CustomEvent("settings:updated"));
      onToast?.('Settings saved successfully!');
      onClose();
    } catch (e) {
      console.error("Save settings failed", e);
      alert("Could not save settings. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  // Focus trap and keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
      if (e.key === 'Enter' && e.metaKey) {
        onSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, draft]);

  const handleCancel = () => {
    setDraft(persisted);
    onClose();
  };

  const handleResetDemo = () => {
    if (!confirm('Reset all demo data? This will clear your inventory, sales, and debts.')) return;
    // TODO: Wire to actual reset function
    onToast?.('Demo reset not yet implemented');
  };

  const handleClearCache = () => {
    if (!confirm('Clear cached settings? You will need to re-enter your preferences.')) return;
    localStorage.removeItem('storehouse-settings');
    const defaults = getSettings();
    setDraft(defaults);
    onToast?.('Settings cache cleared');
  };

  // Tax Calculator Toggle Handler (Phase 1)
  const handleTaxCalculatorToggle = (isEnabled: boolean) => {
    try {
      // Update draft with new toggle state
      const updatedDraft = {
        ...draft,
        enableTaxCalculator: isEnabled,
        // Only add defaults if enabling for FIRST time
        ...(isEnabled && !draft.hasOwnProperty('enableTaxCalculator') ? {
          vatRate: 0.075, // 7.5% Nigerian VAT
          taxMode: 'EOD' as const,
          priceMode: 'VAT_INCLUSIVE' as const,
          claimInputVatFromPurchases: true,
          claimInputVatFromExpenses: false,
        } : {})
      };

      setDraft(updatedDraft);

      console.log(`✅ Tax Calculator ${isEnabled ? 'enabled' : 'disabled'}`);

    } catch (error) {
      console.error('❌ Error updating tax calculator setting:', error);
      onToast?.('Failed to update tax calculator setting');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="bs-overlay" onClick={handleCancel} />
      <div ref={sheetRef} className="bs-sheet" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bs-header">
          <h2 className="bs-title">Business Settings</h2>
          <button
            className="bs-close"
            onClick={handleCancel}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="bs-body">
          {/* Section 1: Profile */}
          <section className="bs-section">
            <h3 className="bs-section-title">Profile</h3>

            <div className="bs-field">
              <label htmlFor="bs-business-name" className="bs-label">
                Business Name *
              </label>
              <input
                id="bs-business-name"
                type="text"
                className="bs-input"
                value={profile.businessName}
                onChange={e => setProfile({ businessName: e.target.value })}
                placeholder="Enter your business name"
                maxLength={50}
                aria-invalid={profile.businessName.trim() === ''}
              />
              <small className="bs-char-count">{profile.businessName.length}/50</small>
            </div>

            <div className="bs-field">
              <label htmlFor="bs-owner-name" className="bs-label">
                Owner Name
              </label>
              <input
                id="bs-owner-name"
                type="text"
                className="bs-input"
                value={profile.ownerName}
                onChange={e => setProfile({ ownerName: e.target.value })}
                placeholder="Enter owner's name"
                maxLength={30}
              />
              <small className="bs-char-count">{profile.ownerName.length}/30</small>
            </div>

            <div className="bs-field">
              <label htmlFor="bs-phone" className="bs-label">
                Business Phone
              </label>
              <input
                id="bs-phone"
                type="tel"
                inputMode="tel"
                className="bs-input"
                value={profile.phone}
                onChange={e => setProfile({ phone: e.target.value })}
                placeholder="08012345678"
                maxLength={15}
                aria-invalid={!/^0\d{10}$/.test((profile.phone || "").replace(/\s|-/g, ""))}
              />
              {profile.phone && !/^0\d{10}$/.test((profile.phone || "").replace(/\s|-/g, "")) ? (
                <small className="bs-error">
                  Enter a valid 11-digit Nigerian number (e.g., 08012345678).
                </small>
              ) : (
                <small className="bs-help">
                  Nigerian format: 080, 081, 090, 070, etc.
                </small>
              )}
            </div>
          </section>

          {/* Section 2: Preferences */}
          {RECEIPT_SETTINGS_ENABLED && (
            <section className="bs-section">
              <h3 className="bs-section-title">Preferences</h3>

              {/* Receipt Message */}
              <div className="bs-field">
                <label htmlFor="bs-receipt-msg" className="bs-label">
                  Receipt Message
                </label>
                <textarea
                  id="bs-receipt-msg"
                  className="bs-input bs-textarea"
                  value={draft.receiptMessage || ''}
                  onChange={e => update('receiptMessage', e.target.value)}
                  placeholder="e.g., Thank you for your patronage!"
                  maxLength={120}
                  rows={2}
                />
                <small className="bs-char-count">
                  {(draft.receiptMessage?.length || 0)}/120
                </small>
              </div>
            </section>
          )}

          {/* Section 3: Data & Reports */}
          <section className="bs-section">
            <h3 className="bs-section-title">Data & Reports</h3>

            <div className="bs-action-buttons">
              <button
                type="button"
                className="bs-action-btn"
                onClick={() => {
                  onClose();
                  onSendEOD?.();
                }}
              >
                📤 Send EOD Report
              </button>

              <button
                type="button"
                className="bs-action-btn"
                onClick={onExportCSV}
              >
                📊 Export Data (CSV)
              </button>
            </div>
          </section>

          {/* Section 4: Plan & Beta */}
          <section className="bs-section">
            <h3 className="bs-section-title">Plan & Beta</h3>

            <div className="bs-plan-badges">
              {isBetaTester && (
                <span className="bs-badge bs-badge-beta">🧪 BETA MODE</span>
              )}
              <span className="bs-badge">
                Current Plan: <strong>{currentPlan}</strong>
              </span>
              {!isBetaTester && currentPlan === 'FREE' && (
                <span className="bs-badge bs-badge-warn">
                  {itemCount}/10 products
                </span>
              )}
              {!isBetaTester && currentPlan === 'STARTER' && (
                <span className="bs-badge bs-badge-warn">
                  {itemCount}/500 products
                </span>
              )}
              {isBetaTester && (
                <span className="bs-badge bs-badge-success">
                  {itemCount} products (Unlimited)
                </span>
              )}
            </div>

            {/* Beta Tester Toggle */}
            <div className="bs-field">
              <div className="bs-toggle-row">
                <div>
                  <div className="bs-toggle-label">🧪 Beta Tester Mode</div>
                  <div className="bs-toggle-desc">
                    {isBetaTester
                      ? 'Testing all premium features: Unlimited products, WhatsApp EOD, CSV export'
                      : 'Enable to test all premium features during beta period'}
                  </div>
                </div>
                <button
                  type="button"
                  className="bs-switch"
                  role="switch"
                  aria-checked={isBetaTester}
                  onClick={() => onToggleBeta?.(!isBetaTester)}
                >
                  <span className={`bs-switch-track ${isBetaTester ? 'on' : ''}`}>
                    <span className="bs-switch-thumb" />
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              className="bs-action-btn bs-view-plans"
              onClick={() => {
                onClose();
                onViewPlans?.();
              }}
            >
              View Plans
            </button>
          </section>

          {/* Section 5: Payment Integration (Collapsed by default) */}
          <section className="bs-section">
            <button
              type="button"
              className="bs-section-toggle"
              onClick={() => setShowPayment(!showPayment)}
              aria-expanded={showPayment}
            >
              <h3 className="bs-section-title">💳 Payment Integration</h3>
              <span className="bs-chevron">{showPayment ? '▼' : '▶'}</span>
            </button>

            {showPayment && (
              <div className="bs-advanced-content" style={{ paddingTop: '16px' }}>
                <PaymentSettings onToast={onToast} />
              </div>
            )}
          </section>

          {/* Section 6: Advanced (Collapsed by default) */}
          <section className="bs-section">
            <button
              type="button"
              className="bs-section-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
              aria-expanded={showAdvanced}
            >
              <h3 className="bs-section-title">Advanced</h3>
              <span className="bs-chevron">{showAdvanced ? '▼' : '▶'}</span>
            </button>

            {showAdvanced && (
              <div className="bs-advanced-content">
                {/* ═══════ TAX CALCULATOR TOGGLE (Phase 1) ═══════ */}
                <div className="tax-calculator-section">
                  <h4>📊 Simple Tax Calculator (Beta)</h4>

                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={draft?.enableTaxCalculator || false}
                      onChange={(e) => handleTaxCalculatorToggle(e.target.checked)}
                    />
                    <span>Enable Tax Calculator</span>
                  </label>

                  <p className="description">
                    Track monthly sales, expenses, and estimate VAT (7.5%).
                    Automatically configured for Nigerian shops.
                  </p>

                  {draft?.enableTaxCalculator && (
                    <div className="tax-info-box">
                      <p className="info-title">✅ What you'll see when enabled:</p>
                      <ul className="feature-list">
                        <li>Monthly sales and expenses totals</li>
                        <li>Your profit (Sales - Expenses)</li>
                        <li>Estimated VAT to remit (7.5%)</li>
                      </ul>

                      <div className="default-config-notice">
                        <p><strong>Pre-configured for:</strong></p>
                        <ul className="config-list">
                          <li>✓ VAT-inclusive pricing (Nigerian standard)</li>
                          <li>✓ Simple monthly summaries</li>
                          <li>✓ Input VAT from purchases</li>
                        </ul>
                      </div>

                      <div className="example-box">
                        <p className="example-title"><strong>Example:</strong></p>
                        <p>Sales: ₦225,000 | Expenses: ₦155,000</p>
                        <p className="highlight">Profit: ₦70,000 | VAT owed: ~₦7,875</p>
                      </div>

                      <p className="disclaimer">
                        💡 <em>Simple estimate only. For official tax filing, consult FIRS or a tax professional.</em>
                      </p>

                      <p className="phase-notice">
                        ⚠️ <strong>Beta:</strong> Dashboard widget coming soon. Toggle now to enable when ready.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="bs-action-btn bs-danger"
                  onClick={handleResetDemo}
                >
                  Reset Demo Data
                </button>
                <button
                  type="button"
                  className="bs-action-btn"
                  onClick={handleClearCache}
                >
                  Clear Cached Settings
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="bs-footer">
          <button
            type="button"
            className="bs-btn-primary save-settings"
            onClick={onSave}
            disabled={TEMP_ALWAYS_ENABLE_SAVE ? false : (!isDirty || !isValid || saving)}
            data-testid="save-settings"
          >
            {saving ? "Saving…" : "Save Settings"}
          </button>
          <button
            type="button"
            className="bs-btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
