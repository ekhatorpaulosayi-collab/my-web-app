import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSettings, saveSettings, savePartial, saveAll, type Settings } from '../utils/settings';
import { useBusinessProfile } from '../contexts/BusinessProfile.jsx';
import { useAuth } from '../contexts/AuthContext';
import '../styles/BusinessSettings.css';
import PaymentSettings from './PaymentSettings';
import PaymentMethodsManager from './PaymentMethodsManager';
import { hasPinSet, setPin, clearPin } from '../lib/pinService';
import { generateStoreSlug, saveStoreSlug, checkSlugChange } from '../utils/storeSlug';
import PaymentsSection from './settings/sections/PaymentsSection';
import { StatusPill } from './common/StatusPill';
import { useDirty } from '../hooks/useDirty';
// MIGRATION: Using Supabase auth
import { logOut } from '../lib/authService-supabase';
import { StoreSettings } from './StoreSettings';
import TaxRateSelector from './TaxRateSelector';

type BusinessSettingsProps = {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
  onSendEOD?: () => void;
  onExportCSV?: () => void;
  onViewPlans?: () => void;
  isBetaTester?: boolean;
  onToggleBeta?: (value: boolean) => void;
  currentPlan?: string;
  itemCount?: number;
};

const ACCORDION_STORAGE_KEY = 'storehouse:settings:accordion:v1';
const MOBILE_BREAKPOINT = 768;

// Phase 2B: Skeleton Loader Component
function SkeletonLoader() {
  return (
    <div className="settings-skeleton" role="status" aria-live="polite" aria-label="Loading settings">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-section">
          <div className="skeleton-header">
            <div className="skeleton-line" style={{width: '40%'}} />
            <div className="skeleton-line" style={{width: '25%'}} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Phase 2B: Error Banner Component
function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="settings-error" role="alert" aria-live="assertive">
      <div className="error-content">
        <span className="error-icon">⚠️</span>
        <div className="error-text">
          <strong>Failed to load settings</strong>
          <p>{message}</p>
        </div>
      </div>
      <button
        onClick={onRetry}
        className="error-retry-btn"
        type="button"
      >
        Retry
      </button>
    </div>
  );
}

// Phase 2B: Spinner Component
function Spinner() {
  return (
    <svg className="spinner" width="16" height="16" viewBox="0 0 16 16">
      <circle
        cx="8"
        cy="8"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="31.4"
        strokeDashoffset="10"
      />
    </svg>
  );
}

export default function BusinessSettings({
  isOpen,
  onClose,
  onToast,
  onSendEOD,
  onExportCSV,
  onViewPlans,
  isBetaTester,
  onToggleBeta,
  currentPlan,
  itemCount
}: BusinessSettingsProps) {
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const { profile, setProfile } = useBusinessProfile();
  const { dirty, markDirty, markClean } = useDirty(false);

  // Prevent rapid multiple closes
  const isClosingRef = React.useRef(false);
  const closeButtonRef = React.useRef<HTMLButtonElement>(null);


  // Accordion state - Phase 2A: Array-based for persistence & deep linking
  const [expandedSections, setExpandedSections] = useState<string[]>(['profile']);
  const [isMobile, setIsMobile] = useState(window.innerWidth < MOBILE_BREAKPOINT);

  // Modals
  const [showPaystackSetup, setShowPaystackSetup] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Phase 2B: Loading and error states
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'success' | 'error' | null>(null);

  // PIN state
  const [hasPinEnabled, setHasPinEnabled] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinAction, setPinAction] = useState<'none' | 'set' | 'remove' | 'change'>('none');

  // Form state
  const [formData, setFormData] = useState({
    businessName: profile.businessName || '',
    ownerName: profile.ownerName || '',
    phone: profile.phone || '',
    whatsappNumber: profile.whatsappNumber || '',
    instagramHandle: profile.instagramHandle || '',
    facebookPage: profile.facebookPage || '',
    tiktokHandle: profile.tiktokHandle || '',
    storeUrl: profile.storeUrl || ''
  });

  // Tax settings state
  const [enableTaxEstimator, setEnableTaxEstimator] = useState(false);
  const [taxRatePct, setTaxRatePct] = useState(2);

  // Phase 2A: Responsive mobile detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      console.debug('[Settings] Mobile mode:', mobile);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Phase 2A: Deep linking & persistence on mount
  useEffect(() => {
    if (!isOpen) return;

    // Deep linking on mount
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      console.debug('[Settings] Deep link opened:', hash);
      setExpandedSections([hash]);

      // Scroll to section after render
      setTimeout(() => {
        const element = document.getElementById(`section-${hash}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }, 100);
    } else {
      // Restore from localStorage
      try {
        const saved = localStorage.getItem(ACCORDION_STORAGE_KEY);
        if (saved) {
          const sections = JSON.parse(saved);
          console.debug('[Settings] Restored accordion state:', sections);
          setExpandedSections(sections);
        }
      } catch (error) {
        console.error('[Settings] Failed to restore accordion state:', error);
      }
    }
  }, [isOpen]);

  // Phase 2A: Persist accordion state (debounced)
  useEffect(() => {
    if (!isOpen) return;

    // Update hash when sections change
    if (expandedSections.length > 0) {
      window.location.hash = expandedSections[0];
    } else {
      window.location.hash = '';
    }

    // Debounced localStorage save
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(expandedSections));
        console.debug('[Settings] Accordion persisted:', expandedSections);
      } catch (error) {
        console.error('[Settings] Failed to persist accordion:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [expandedSections, isOpen]);

  // Phase 2B: Load settings with skeleton and error handling
  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('settings-open');
      return;
    }

    // Reset closing flag and button state when opening
    isClosingRef.current = false;
    if (closeButtonRef.current) {
      closeButtonRef.current.disabled = false;
      closeButtonRef.current.style.opacity = '1';
      closeButtonRef.current.style.pointerEvents = 'auto';
    }

    async function loadSettings() {
      try {
        console.debug('[Settings] Load start');
        setIsLoading(true);
        setLoadError(null);

        // Simulate minimum loading time for smooth UX (300ms)
        const [_] = await Promise.all([
          new Promise(resolve => setTimeout(resolve, 300)),
          // Settings are already in profile, but we simulate async load
          Promise.resolve()
        ]);

        setHasPinEnabled(hasPinSet());
        setFormData({
          businessName: profile.businessName || '',
          ownerName: profile.ownerName || '',
          phone: profile.phone || '',
          whatsappNumber: profile.whatsappNumber || '',
          instagramHandle: profile.instagramHandle || '',
          facebookPage: profile.facebookPage || '',
          tiktokHandle: profile.tiktokHandle || '',
          storeUrl: profile.storeUrl || ''
        });

        // Load tax settings
        const settings = getSettings();
        setEnableTaxEstimator(settings.enableTaxEstimator ?? false);
        setTaxRatePct(settings.taxRatePct ?? 2);

        setNewPin('');
        setConfirmPin('');
        setPinError('');
        setPinAction('none');
        markClean();

        setIsLoading(false);
        console.debug('[Settings] Loaded successfully');

        // Hide mobile bottom nav when settings is open
        document.body.classList.add('settings-open');
      } catch (err) {
        console.debug('[Settings] Load error:', err);
        setLoadError((err as Error).message || 'Failed to load settings');
        setIsLoading(false);
      }
    }

    loadSettings();

    return () => {
      document.body.classList.remove('settings-open');
    };
  }, [isOpen, profile]);

  // Phase 2B: Retry loading settings
  const handleRetry = () => {
    console.debug('[Settings] Retry attempt');
    setLoadError(null);
    setIsLoading(true);
    // Trigger reload by toggling isOpen state internally
    const event = new CustomEvent('settings:reload');
    window.dispatchEvent(event);
  };

  // Handle input changes (marks dirty)
  const handleInputChange = (field: string, value: string) => {
    console.log('[Settings] Input changed:', field, '=', value);
    setFormData(prev => ({ ...prev, [field]: value }));
    markDirty();
    console.log('[Settings] Dirty state should now be true');
  };

  // Phase 2B: Toast notification system
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Handle save with Phase 2B states
  const handleSave = async () => {
    // Validate
    if (!formData.businessName.trim()) {
      showToast('Business name is required', 'error');
      return;
    }

    // Validate PIN if setting or changing
    if (pinAction === 'set' || pinAction === 'change') {
      if (!newPin || newPin.length < 4) {
        setPinError('PIN must be at least 4 digits');
        return;
      }
      if (newPin !== confirmPin) {
        setPinError('PINs do not match');
        return;
      }
    }

    // Check slug change
    const slugChange = checkSlugChange(formData.businessName);
    if (slugChange.willChange) {
      const confirmed = window.confirm(
        `⚠️ Your store link will change!\n\n` +
        `Old: /store/${slugChange.oldSlug}\n` +
        `New: /store/${slugChange.newSlug}\n\n` +
        `Continue?`
      );
      if (!confirmed) return;
    }

    try {
      console.debug('[Settings] Save start');
      setIsSaving(true);
      setSaveStatus('saving');

      // Generate and save store slug
      const storeSlug = generateStoreSlug(formData.businessName);
      saveStoreSlug(storeSlug);

      // Save profile (all fields)
      setProfile({
        businessName: formData.businessName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        whatsappNumber: formData.whatsappNumber,
        instagramHandle: formData.instagramHandle,
        facebookPage: formData.facebookPage,
        tiktokHandle: formData.tiktokHandle,
        storeUrl: formData.storeUrl
      });

      // Handle PIN changes
      if (pinAction === 'set' || pinAction === 'change') {
        await setPin(newPin);
        setHasPinEnabled(true);
        setNewPin('');
        setConfirmPin('');
        setPinAction('none');
        window.dispatchEvent(new CustomEvent('pin:locked'));
      } else if (pinAction === 'remove') {
        await clearPin();
        setHasPinEnabled(false);
        setPinAction('none');
        window.dispatchEvent(new CustomEvent('pin:unlocked'));
      }

      // Save tax settings
      saveSettings({
        enableTaxEstimator,
        taxRatePct
      });

      // Dispatch refresh event
      window.dispatchEvent(new Event('storehouse:refresh-dashboard'));

      setSaveStatus('success');
      setIsSaving(false);
      markClean();

      console.debug('[Settings] Saved successfully');
      showToast('Settings saved successfully!', 'success');

      // Reset success state after 2 seconds
      setTimeout(() => {
        setSaveStatus(null);
      }, 2000);
    } catch (error) {
      console.debug('[Settings] Save error:', error);
      setSaveStatus('error');
      setIsSaving(false);
      showToast('Failed to save settings. Please try again.', 'error');
    }
  };

  // Phase 2B: Handle close with save check
  const handleClose = () => {
    if (isSaving) {
      showToast('Please wait, saving in progress...', 'info');
      return;
    }

    if (dirty) {
      console.debug('[Settings] close blocked: unsaved changes');
      setShowDiscardDialog(true);
      return;
    }
    onClose();
  };

  // Direct close without dirty check (for X button)
  const handleDirectClose = (e?: React.MouseEvent | React.PointerEvent) => {
    // Immediate guard - if already closing, ignore completely
    if (isClosingRef.current) return;

    // Set flag IMMEDIATELY to block any subsequent calls
    isClosingRef.current = true;

    // Disable the button immediately to prevent any further clicks
    if (closeButtonRef.current) {
      closeButtonRef.current.disabled = true;
      closeButtonRef.current.style.opacity = '0.5';
      closeButtonRef.current.style.pointerEvents = 'none';
    }

    // Prevent any event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSaving) {
      showToast('Please wait, saving in progress...', 'info');
      // Reset flag if blocked
      isClosingRef.current = false;
      if (closeButtonRef.current) {
        closeButtonRef.current.disabled = false;
        closeButtonRef.current.style.opacity = '1';
        closeButtonRef.current.style.pointerEvents = 'auto';
      }
      return;
    }

    // Close immediately, no confirmation
    markClean();
    onClose();
  };

  const handleDiscard = () => {
    setFormData({
      businessName: profile.businessName || '',
      ownerName: profile.ownerName || '',
      phone: profile.phone || ''
    });
    markClean();
    setShowDiscardDialog(false);
    onClose();
  };

  // PIN handlers (now just mark dirty, actual save happens in handleSave)
  const handlePinInputChange = (field: 'new' | 'confirm', value: string) => {
    // Clear error when typing
    setPinError('');

    // Update the appropriate field FIRST
    if (field === 'new') {
      setNewPin(value);
    } else {
      setConfirmPin(value);
    }

    // Calculate what the values will be after this update
    const updatedNewPin = field === 'new' ? value : newPin;
    const updatedConfirmPin = field === 'confirm' ? value : confirmPin;

    // CRITICAL: Only mark dirty when BOTH fields have at least 4 digits
    // Check the FUTURE state, not current state
    if (updatedNewPin.length >= 4 && updatedConfirmPin.length >= 4) {
      // Both fields complete - mark dirty
      if (pinAction === 'none') {
        setPinAction('set');
      } else if (pinAction === 'change') {
        // Already in change mode, keep it
      }
      markDirty();
    } else {
      // Fields incomplete - do NOT mark dirty
      // Only clean up if user fully clears both fields
      if (updatedNewPin.length === 0 && updatedConfirmPin.length === 0) {
        if (pinAction === 'set') {
          setPinAction('none');
        } else if (pinAction === 'change') {
          // Keep in change mode even if fields are cleared
        }
      }
    }
  };

  const handleRemovePin = () => {
    if (!confirm('Remove PIN protection? This change will be saved when you click "Save Settings".')) return;
    setPinAction('remove');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
    markDirty();
  };

  const handleChangePin = () => {
    setPinAction('change');
    setNewPin('');
    setConfirmPin('');
    setPinError('');
  };

  // Logout handler
  const handleLogout = async () => {
    if (dirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to sign out?'
      );
      if (!confirmed) return;
    }

    try {
      console.debug('[Settings] Logging out user');
      await logOut();
      console.debug('[Settings] Logout successful');
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      console.error('[Settings] Logout error:', error);
      showToast('Failed to sign out. Please try again.', 'error');
    }
  };

  // Phase 2A: Accordion toggle handler
  const handleToggleSection = (sectionId: string) => {
    if (isMobile) {
      // Mobile: single-expand (close others)
      // But if section is already open, just toggle it (don't close)
      setExpandedSections(prev =>
        prev.includes(sectionId) ? [] : [sectionId]
      );
    } else {
      // Desktop: multi-expand (toggle)
      setExpandedSections(prev =>
        prev.includes(sectionId)
          ? prev.filter(id => id !== sectionId)
          : [...prev, sectionId]
      );
    }
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.includes(sectionId);

  if (!isOpen) return null;

  return (
    <>
      {/* Main Settings Sheet */}
      <div className="bs-overlay" onClick={handleClose}>
        <div className="bs-sheet" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bs-header">
            <h2 className="bs-title">Settings</h2>
            <button
              ref={closeButtonRef}
              type="button"
              className="bs-close"
              onClick={handleDirectClose}
              style={{
                padding: '12px',
                minWidth: '48px',
                minHeight: '48px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent'
              }}
              aria-label="Close settings"
            >×</button>
          </div>

          {/* Body */}
          <div className="bs-body">
            {/* Phase 2B: Loading State */}
            {isLoading && <SkeletonLoader />}

            {/* Phase 2B: Error State */}
            {!isLoading && loadError && (
              <ErrorBanner message={loadError} onRetry={handleRetry} />
            )}

            {/* Phase 2B: Content (only show when loaded and no error) */}
            {!isLoading && !loadError && (
              <>
                {/* Section 1: Profile */}
                <div className="bs-section" id="section-profile">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('profile')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">👤 Profile</h3>
                  <StatusPill
                    state={formData.businessName.trim() ? 'connected' : 'not_connected'}
                    label={formData.businessName.trim() ? 'Complete' : 'Incomplete'}
                  />
                </div>
                <span className={`bs-chevron ${isSectionExpanded('profile') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('profile') && (
                <div className="bs-section-content">
                  <div className="bs-field">
                    <label htmlFor="business-name" className="bs-label">Business Name *</label>
                    <input
                      id="business-name"
                      type="text"
                      className="bs-input"
                      value={formData.businessName}
                      onChange={e => handleInputChange('businessName', e.target.value)}
                      placeholder="Enter your business name"
                      maxLength={50}
                    />
                    <small className="bs-char-count">{formData.businessName.length}/50</small>
                  </div>

                  <div className="bs-field">
                    <label htmlFor="owner-name" className="bs-label">Owner Name</label>
                    <input
                      id="owner-name"
                      type="text"
                      className="bs-input"
                      value={formData.ownerName}
                      onChange={e => handleInputChange('ownerName', e.target.value)}
                      placeholder="Enter owner's name"
                      maxLength={30}
                    />
                    <small className="bs-char-count">{formData.ownerName.length}/30</small>
                  </div>

                  <div className="bs-field">
                    <label htmlFor="phone" className="bs-label">Business Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      className="bs-input"
                      value={formData.phone}
                      onChange={e => handleInputChange('phone', e.target.value)}
                      placeholder="08012345678"
                      maxLength={15}
                    />
                  </div>

                  {/* Social Media Handles */}
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                      📱 Social Media & Contact
                    </h4>

                    <div className="bs-field">
                      <label htmlFor="whatsapp" className="bs-label">WhatsApp Number</label>
                      <input
                        id="whatsapp"
                        type="tel"
                        inputMode="tel"
                        className="bs-input"
                        value={formData.whatsappNumber}
                        onChange={e => handleInputChange('whatsappNumber', e.target.value)}
                        placeholder="08012345678"
                        maxLength={15}
                      />
                      <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        For sharing products via WhatsApp
                      </small>
                    </div>

                    <div className="bs-field">
                      <label htmlFor="instagram" className="bs-label">Instagram Handle</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6b7280',
                          fontSize: '15px'
                        }}>@</span>
                        <input
                          id="instagram"
                          type="text"
                          className="bs-input"
                          value={formData.instagramHandle}
                          onChange={e => handleInputChange('instagramHandle', e.target.value)}
                          placeholder="yourbusiness"
                          maxLength={30}
                          style={{ paddingLeft: '32px' }}
                        />
                      </div>
                      <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        Your Instagram username (without @)
                      </small>
                    </div>

                    <div className="bs-field">
                      <label htmlFor="facebook" className="bs-label">Facebook Page</label>
                      <input
                        id="facebook"
                        type="text"
                        className="bs-input"
                        value={formData.facebookPage}
                        onChange={e => handleInputChange('facebookPage', e.target.value)}
                        placeholder="Your Business Page"
                        maxLength={50}
                      />
                      <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        Facebook page or profile name
                      </small>
                    </div>

                    <div className="bs-field">
                      <label htmlFor="tiktok" className="bs-label">TikTok Handle</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#6b7280',
                          fontSize: '15px'
                        }}>@</span>
                        <input
                          id="tiktok"
                          type="text"
                          className="bs-input"
                          value={formData.tiktokHandle}
                          onChange={e => handleInputChange('tiktokHandle', e.target.value)}
                          placeholder="yourbusiness"
                          maxLength={30}
                          style={{ paddingLeft: '32px' }}
                        />
                      </div>
                      <small style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                        Your TikTok username (without @)
                      </small>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Online Store Payment Methods */}
            <div className="bs-section" id="section-payment-methods">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('payment-methods')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">💳 Online Store Payment Methods</h3>
                </div>
                <span className={`bs-chevron ${isSectionExpanded('payment-methods') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('payment-methods') && (
                <div className="bs-section-content">
                  <p style={{
                    fontSize: '14px',
                    color: '#64748b',
                    marginBottom: '0.75rem',
                    lineHeight: 1.6
                  }}>
                    Payment options customers see when buying from your online store.
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#3b82f6',
                    marginBottom: '1.5rem',
                    lineHeight: 1.5,
                    padding: '12px',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    border: '1px solid #bfdbfe'
                  }}>
                    💡 <strong>For online store only.</strong> If you only use Storehouse for record-keeping (no online store), you can skip this.
                  </p>
                  <PaymentMethodsManager onToast={onToast} />
                </div>
              )}
            </div>

            {/* Section 3: Paystack (Card Payments) */}
            <div className="bs-section" id="section-payments">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('payments')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">💳 Paystack (Card Payments)</h3>
                </div>
                <span className={`bs-chevron ${isSectionExpanded('payments') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('payments') && (
                <PaymentsSection
                  onToast={onToast}
                  onOpenPaystackSetup={() => setShowPaystackSetup(true)}
                />
              )}
            </div>

            {/* Section 4: Online Store */}
            <div className="bs-section" id="section-store">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => navigate('/online-store')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">🏪 Online Store</h3>
                  <span style={{ fontSize: '14px', color: '#667eea', fontWeight: '500' }}>
                    Setup →
                  </span>
                </div>
              </button>
            </div>

            {/* Section 6: Security & Privacy */}
            <div className="bs-section" id="section-security">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('security')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">🔒 Security & Privacy</h3>
                  <StatusPill
                    state={hasPinEnabled ? 'connected' : 'not_connected'}
                    label={hasPinEnabled ? 'PIN Protected' : 'Not Protected'}
                  />
                </div>
                <span className={`bs-chevron ${isSectionExpanded('security') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('security') && (
                <div className="bs-section-content">
                  <p className="bs-help">Protect sensitive data (costs, profits) with a PIN.</p>

                  {hasPinEnabled && pinAction !== 'remove' && pinAction !== 'change' ? (
                    <div>
                      <p style={{ color: '#059669', fontSize: '14px', marginBottom: '12px' }}>
                        ✓ PIN protection is enabled
                      </p>
                      <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                        <button
                          type="button"
                          className="bs-action-btn"
                          onClick={handleChangePin}
                        >
                          Change PIN
                        </button>
                        <button
                          type="button"
                          className="bs-btn-danger"
                          onClick={handleRemovePin}
                        >
                          Remove PIN
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {pinAction === 'remove' && (
                        <p style={{ color: '#DC2626', fontSize: '14px', marginBottom: '12px' }}>
                          ⚠️ PIN will be removed when you click "Save Settings"
                        </p>
                      )}

                      <div className="bs-field">
                        <label htmlFor="new-pin" className="bs-label">New PIN (4+ digits)</label>
                        <input
                          id="new-pin"
                          type="password"
                          inputMode="numeric"
                          className="bs-input"
                          value={newPin}
                          onChange={e => handlePinInputChange('new', e.target.value)}
                          placeholder="Enter PIN"
                          maxLength={6}
                        />
                      </div>

                      <div className="bs-field">
                        <label htmlFor="confirm-pin" className="bs-label">Confirm PIN</label>
                        <input
                          id="confirm-pin"
                          type="password"
                          inputMode="numeric"
                          className="bs-input"
                          value={confirmPin}
                          onChange={e => handlePinInputChange('confirm', e.target.value)}
                          placeholder="Confirm PIN"
                          maxLength={6}
                        />
                      </div>

                      {pinError && (
                        <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '8px' }}>
                          {pinError}
                        </p>
                      )}

                      <p className="bs-help" style={{ marginTop: '8px' }}>
                        💡 Click "Save Settings" below to apply your PIN
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 7: Advanced (Tax Estimator) */}
            <div className="bs-section" id="section-advanced">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('advanced')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">⚙️ Advanced</h3>
                  <StatusPill
                    state={enableTaxEstimator ? 'connected' : 'not_connected'}
                    label={enableTaxEstimator ? 'Tax Enabled' : 'Disabled'}
                  />
                </div>
                <span className={`bs-chevron ${isSectionExpanded('advanced') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('advanced') && (
                <div className="bs-section-content">
                  {/* Tax Estimator Toggle */}
                  <div className="bs-field">
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                      padding: '16px',
                      background: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}>
                      <div style={{ flex: 1 }}>
                        <label style={{
                          fontSize: '15px',
                          fontWeight: '600',
                          color: '#111827',
                          display: 'block',
                          marginBottom: '4px'
                        }}>
                          💰 Profit & Tax Estimator
                        </label>
                        <p className="bs-help" style={{ marginTop: '4px', marginBottom: 0 }}>
                          Shows monthly profit breakdown and estimated tax on your Money & Profits page
                        </p>
                      </div>
                      <label className="toggle-switch" style={{ flexShrink: 0 }}>
                        <input
                          type="checkbox"
                          checked={enableTaxEstimator}
                          onChange={(e) => {
                            setEnableTaxEstimator(e.target.checked);
                            markDirty();
                          }}
                        />
                        <span className="toggle-slider"></span>
                      </label>
                    </div>

                    {/* Tax Rate Selector - Only show when enabled */}
                    {enableTaxEstimator && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}>
                        <label className="bs-label" style={{ marginBottom: '8px', display: 'block' }}>
                          Tax Rate
                        </label>
                        <TaxRateSelector
                          value={taxRatePct}
                          onChange={(value) => {
                            setTaxRatePct(value);
                            markDirty();
                          }}
                        />
                      </div>
                    )}

                    {/* Important Disclaimer */}
                    {enableTaxEstimator && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '20px' }}>⚠️</span>
                          <div>
                            <p style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#92400E',
                              margin: '0 0 8px 0'
                            }}>
                              Important: This is an estimate only
                            </p>
                            <p style={{
                              fontSize: '13px',
                              color: '#78350F',
                              lineHeight: '1.5',
                              margin: 0
                            }}>
                              The tax calculation is a simplified estimate and should NOT be used for actual tax filing.
                              Always consult a qualified tax professional or accountant for accurate tax advice and compliance with Nigerian tax laws.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Access Instructions */}
                  {enableTaxEstimator && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '8px'
                    }}>
                      <p style={{
                        fontSize: '13px',
                        color: '#1E40AF',
                        margin: 0,
                        lineHeight: '1.5'
                      }}>
                        💡 <strong>How to access:</strong> Go to Dashboard → More → "💰 Money & Profits" to view your profit breakdown and tax estimate
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 8: Account */}
            <div className="bs-section" id="section-account">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('account')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">👤 Account</h3>
                </div>
                <span className={`bs-chevron ${isSectionExpanded('account') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('account') && (
                <div className="bs-section-content">
                  <div style={{ marginBottom: '16px' }}>
                    <p className="bs-help" style={{ marginBottom: '8px' }}>
                      <strong>Email:</strong> {currentUser?.email}
                    </p>
                    <p className="bs-help">
                      <strong>Store:</strong> {userProfile?.storeName || profile.businessName}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="bs-btn-danger"
                    onClick={handleLogout}
                    style={{ width: '100%' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Section 9: Help & Support */}
            <div className="bs-section" id="section-help">
              <button
                type="button"
                className="bs-section-header"
                onClick={() => handleToggleSection('help')}
              >
                <div className="bs-section-title-row">
                  <h3 className="bs-section-title">💬 Help & Support</h3>
                </div>
                <span className={`bs-chevron ${isSectionExpanded('help') ? 'open' : ''}`}>›</span>
              </button>

              {isSectionExpanded('help') && (
                <div className="bs-section-content">
                  {/* WhatsApp Support Button */}
                  <a
                    href="https://wa.me/message/WNLG4H3IKAG3K1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bs-btn-secondary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none',
                      background: '#25D366',
                      color: 'white',
                      border: 'none'
                    }}
                  >
                    <span>💬</span>
                    <span>Get Help on WhatsApp</span>
                  </a>

                  <p className="bs-help" style={{ marginTop: '12px', fontSize: '12px', color: '#6B7280' }}>
                    Need help? Contact support via WhatsApp for quick assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Sign Out Button - Always Visible */}
            <div className="bs-signout-section" style={{
              padding: '1.5rem 1.5rem 0.5rem',
              borderTop: '2px solid #f3f4f6',
              marginTop: '2rem'
            }}>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #ef4444',
                  borderRadius: '10px',
                  background: 'white',
                  color: '#ef4444',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                  WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.1)', // Mobile tap feedback
                  touchAction: 'manipulation', // Disable double-tap zoom on mobile
                  minHeight: '48px' // Ensure minimum touch target size (iOS/Android standard)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.borderColor = '#ef4444';
                }}
                onTouchStart={(e) => {
                  // Mobile touch feedback
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onTouchEnd={(e) => {
                  // Reset after touch
                  setTimeout(() => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#ef4444';
                  }, 150);
                }}
              >
                <span style={{ fontSize: '18px' }}>🚪</span>
                <span>Sign Out</span>
              </button>
              <p style={{
                fontSize: '12px',
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: '8px',
                marginBottom: '0'
              }}>
                You'll be signed out of your account
              </p>
            </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bs-footer">
            <button type="button" className="bs-btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`bs-btn-primary ${saveStatus || ''}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Settings] Save button clicked - dirty:', dirty, 'businessName:', formData.businessName);
                handleSave();
              }}
              onTouchStart={(e) => {
                console.log('[Settings] Save button touched - dirty:', dirty);
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = 'scale(0.98)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)';
                }
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = '';
              }}
              disabled={!dirty || !formData.businessName.trim() || isSaving}
              aria-busy={isSaving}
              aria-disabled={!dirty || !formData.businessName.trim() || isSaving}
              style={{
                WebkitTapHighlightColor: 'rgba(79, 70, 229, 0.3)',
                touchAction: 'manipulation',
                minHeight: '48px',
                cursor: (!dirty || !formData.businessName.trim() || isSaving) ? 'not-allowed' : 'pointer'
              }}
            >
              {isSaving && <Spinner />}
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'success' && '✓ Saved'}
              {saveStatus === 'error' && 'Try Again'}
              {!saveStatus && (dirty ? 'Save Settings' : 'No Changes')}
            </button>
          </div>
        </div>
      </div>

      {/* Paystack Setup Modal */}
      {showPaystackSetup && (
        <div className="bs-overlay" onClick={() => setShowPaystackSetup(false)}>
          <div className="bs-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="bs-header">
              <h2 className="bs-title">Paystack Setup</h2>
              <button
                type="button"
                className="bs-close"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowPaystackSetup(false);
                }}
                aria-label="Close Paystack setup"
              >×</button>
            </div>
            <div className="bs-body">
              <PaymentSettings onToast={onToast} />
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Dialog */}
      {showDiscardDialog && (
        <div className="bs-overlay" onClick={() => setShowDiscardDialog(false)}>
          <div className="bs-dialog" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600' }}>
              Discard changes?
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#6B7280' }}>
              You have unsaved edits. Keep editing or discard?
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="bs-btn-secondary"
                onClick={() => setShowDiscardDialog(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="bs-btn-danger"
                onClick={handleDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
