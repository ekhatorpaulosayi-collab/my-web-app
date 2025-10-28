import React, { useState, useEffect, useRef } from 'react';
import { getSettings, saveSettings, validatePhoneNG, type Settings } from '../utils/settings';
import { useBusinessProfile } from '../contexts/BusinessProfile.jsx';
import '../styles/BusinessSettings.css';

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
  const [form, setForm] = useState<Settings>(getSettings());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const initialFormRef = useRef<Settings>(getSettings());
  const initialProfileRef = useRef(profile);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Load settings and profile when opened
  useEffect(() => {
    if (isOpen) {
      const current = getSettings();
      setForm(current);
      initialFormRef.current = current;
      initialProfileRef.current = profile;
      setIsDirty(false);
      setShowAdvanced(false);
    }
  }, [isOpen, profile]);

  // Track dirty state (both form and profile)
  useEffect(() => {
    if (!isOpen) return;
    const formChanged = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
    const profileChanged = JSON.stringify(profile) !== JSON.stringify(initialProfileRef.current);
    setIsDirty(formChanged || profileChanged);
  }, [form, profile, isOpen]);

  // Focus trap and keyboard handlers
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
      if (e.key === 'Enter' && e.metaKey && isValid && isDirty) {
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, form]);

  // Validation
  const phoneValid = validatePhoneNG(profile.phone);
  const isValid =
    profile.businessName.trim() !== '' &&
    phoneValid &&
    (form.receiptMessage?.length || 0) <= 120;

  // Handlers
  const handleChange = (field: keyof Settings, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!isValid || !isDirty) return;

    try {
      // Save profile to context (handles localStorage and title update)
      setProfile({
        businessName: profile.businessName,
        ownerName: profile.ownerName,
        phone: profile.phone
      });

      // Save other settings
      saveSettings(form);

      onToast?.('Settings saved successfully!');
      onClose();
    } catch (error) {
      console.error('[BusinessSettings] Save error:', error);
      onToast?.('Failed to save settings. Please try again.');
    }
  };

  const handleCancel = () => {
    setForm(initialFormRef.current);
    setIsDirty(false);
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
    setForm(defaults);
    initialFormRef.current = defaults;
    setIsDirty(false);
    onToast?.('Settings cache cleared');
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
                aria-invalid={!phoneValid}
              />
              {profile.phone && !phoneValid ? (
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
          <section className="bs-section">
            <h3 className="bs-section-title">Preferences</h3>

            {/* Quick-Sell Toggle */}
            <div className="bs-field">
              <div className="bs-toggle-row">
                <div>
                  <div className="bs-toggle-label">⚡ Quick-Sell from Table</div>
                  <div className="bs-toggle-desc">
                    {form.quickSellEnabled
                      ? 'Tap any item to quickly open Record Sale'
                      : 'Disabled - Click expand arrow to view details'}
                  </div>
                </div>
                <button
                  type="button"
                  className="bs-switch"
                  role="switch"
                  aria-checked={form.quickSellEnabled}
                  onClick={() => handleChange('quickSellEnabled', !form.quickSellEnabled)}
                >
                  <span className={`bs-switch-track ${form.quickSellEnabled ? 'on' : ''}`}>
                    <span className="bs-switch-thumb" />
                  </span>
                </button>
              </div>
            </div>

            {/* Receipt Message */}
            <div className="bs-field">
              <label htmlFor="bs-receipt-msg" className="bs-label">
                Receipt Message
              </label>
              <textarea
                id="bs-receipt-msg"
                className="bs-input bs-textarea"
                value={form.receiptMessage || ''}
                onChange={e => handleChange('receiptMessage', e.target.value)}
                placeholder="e.g., Thank you for your patronage!"
                maxLength={120}
                rows={2}
              />
              <small className="bs-char-count">
                {(form.receiptMessage?.length || 0)}/120
              </small>
            </div>
          </section>

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

          {/* Section 5: Advanced (Collapsed by default) */}
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
            className="bs-btn-primary"
            onClick={handleSave}
            disabled={!isDirty || !isValid}
          >
            Save Settings
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
