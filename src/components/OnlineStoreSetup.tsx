import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUser, useStore, useStoreActions } from '../lib/supabase-hooks';
import { supabase } from '../lib/supabase';
import { formatWhatsAppNumber, formatPhoneDisplay } from '../utils/whatsapp';
import { NIGERIAN_BANKS, validateAccountNumber } from '../utils/nigerianBanks';
import { ABOUT_TEMPLATES } from '../utils/aboutTemplates';
import { generateStoreQRCode, downloadQRCode } from '../utils/qrCode';
import { shareStoreToWhatsApp } from '../utils/shareToWhatsApp';
import { PromoCodesManager } from './PromoCodesManager';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface StoreProfile {
  businessName: string;
  whatsappNumber: string;
  storeSlug: string;
  logoUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  deliveryAreas?: string;
  deliveryFee?: string;
  minimumOrder?: string;
  businessHours?: string;
  daysOfOperation?: string[];
  aboutUs?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  paystackEnabled?: boolean;
  paystackPublicKey?: string;
  paystackTestMode?: boolean;
}

export default function OnlineStoreSetup() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Get Supabase user (converts Firebase UID to Supabase UUID)
  const { user: supabaseUser, loading: userLoading, error: userError } = useUser(currentUser);

  // Load store from Supabase using the REAL Supabase auth UID (not users table ID)
  const { store, loading: storeLoading } = useStore(currentUser?.uid);
  const { createStore, updateStore, saving } = useStoreActions(currentUser?.uid);

  // Main setup fields - MUST declare ALL hooks before any conditional returns
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugSuggestion, setSugSuggestion] = useState('');

  // Setup state
  const [mainSetupComplete, setMainSetupComplete] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isEditingMain, setIsEditingMain] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  // Optional fields
  const [logoUrl, setLogoUrl] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [daysOfOperation, setDaysOfOperation] = useState<string[]>([]);
  const [aboutUs, setAboutUs] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');

  // Paystack fields
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackTestMode, setPaystackTestMode] = useState(true);

  // Accordion state
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Load existing profile from Supabase store data
  useEffect(() => {
    if (!store) return;

    // Populate form fields from Supabase store data
    setBusinessName(store.business_name || '');
    setWhatsappNumber(store.whatsapp_number || '');
    setStoreSlug(store.store_slug || '');
    setLogoUrl(store.logo_url || '');
    setBankName(store.bank_name || '');
    setAccountNumber(store.account_number || '');
    setAccountName(store.account_name || '');
    setDeliveryAreas(store.delivery_areas || '');
    setDeliveryFee(store.delivery_fee || '');
    setMinimumOrder(store.minimum_order || '');
    setBusinessHours(store.business_hours || '');
    setDaysOfOperation(store.days_of_operation || []);
    setAboutUs(store.about_us || '');
    setInstagramUrl(store.instagram_url || '');
    setFacebookUrl(store.facebook_url || '');
    setPaystackEnabled(store.paystack_enabled || false);
    setPaystackPublicKey(store.paystack_public_key || '');
    setPaystackTestMode(store.paystack_test_mode !== false);

    // If main fields are filled, consider setup complete
    if (store.business_name && store.whatsapp_number && store.store_slug) {
      setMainSetupComplete(true);
    }
  }, [store]);

  // Slug availability check (Supabase)
  useEffect(() => {
    if (!storeSlug || storeSlug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    console.log('[OnlineStoreSetup] Starting slug check for:', storeSlug);
    setSlugStatus('checking');
    const timeoutId = setTimeout(async () => {
      try {
        console.log('[OnlineStoreSetup] Checking Supabase for slug:', storeSlug);
        const { data, error } = await supabase
          .from('stores')
          .select('user_id')
          .eq('store_slug', storeSlug)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        console.log('[OnlineStoreSetup] Slug check result:', data);

        if (!data || data.user_id === currentUser?.uid) {
          console.log('[OnlineStoreSetup] Slug is available!');
          setSlugStatus('available');
        } else {
          console.log('[OnlineStoreSetup] Slug is taken');
          setSlugStatus('taken');
          const timestamp = Date.now().toString().slice(-4);
          setSugSuggestion(`${storeSlug}-${timestamp}`);
        }
      } catch (error) {
        console.error('[OnlineStoreSetup] Error checking slug:', error);
        // Default to available to allow user to proceed
        console.warn('[OnlineStoreSetup] Defaulting to available due to error');
        setSlugStatus('available');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [storeSlug, supabaseUser]);

  // Show loading state while user is being fetched/created
  if (userLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: '#6B7280' }}>Setting up your account...</p>
        </div>
      </div>
    );
  }

  // Show error if user creation failed
  if (userError) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          maxWidth: '500px',
          padding: '32px',
          background: '#FEE2E2',
          border: '2px solid #DC2626',
          borderRadius: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#991B1B' }}>
            Account Setup Failed
          </h2>
          <p style={{ color: '#991B1B', marginBottom: '16px' }}>
            {userError.message || 'Unable to set up your account. Please try refreshing the page.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Handle main setup save (Supabase)
  const handleSaveMainSetup = async () => {
    console.log('[OnlineStoreSetup] Save button clicked');
    console.log('[OnlineStoreSetup] Auth UID (currentUser):', currentUser?.uid);
    console.log('[OnlineStoreSetup] Users table ID (supabaseUser):', supabaseUser?.id);
    console.log('[OnlineStoreSetup] Form data:', { businessName, whatsappNumber, storeSlug, slugStatus });

    if (!currentUser || !supabaseUser) {
      console.error('[OnlineStoreSetup] No user - cannot save');
      alert('❌ You must be logged in to create a store. Please refresh and try again.');
      return;
    }

    setSaveStatus('saving');

    try {
      console.log('[OnlineStoreSetup] Saving store to Supabase...');

      const storeData = {
        business_name: businessName,
        whatsapp_number: whatsappNumber,
        store_slug: storeSlug,
        is_public: true,
      };

      // Create or update store
      if (store?.id) {
        await updateStore(store.id, storeData);
      } else {
        await createStore(storeData);
      }

      console.log('[OnlineStoreSetup] Save successful!');
      setSaveStatus('saved');
      setMainSetupComplete(true);
      setShowSuccessMessage(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error('[OnlineStoreSetup] Error saving setup:', error);
      if (error instanceof Error && (error.message.includes('offline') || error.message.includes('timed out'))) {
        setIsOffline(true);
      }
      setSaveStatus('error');
      alert(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}. Please click "Try Reconnecting" button above.`);
    }
  };

  // Handle optional section save (Supabase)
  const handleSaveSection = async (section: string) => {
    console.log('[OnlineStoreSetup] Saving section:', section);
    console.log('[OnlineStoreSetup] Firebase user:', currentUser?.uid);
    console.log('[OnlineStoreSetup] Supabase user:', supabaseUser?.id);
    console.log('[OnlineStoreSetup] Store ID:', store?.id);

    if (!currentUser || !supabaseUser) {
      console.error('[OnlineStoreSetup] No user');
      alert('❌ You must be logged in to save. Please refresh and try again.');
      return;
    }

    if (!store?.id) {
      console.warn('[OnlineStoreSetup] No store ID - main setup not complete');
      alert('⚠️ Please complete the main setup first (Business Name, WhatsApp, Store URL) before adding optional sections.');
      return;
    }

    try {
      const updateData: any = {};

      switch (section) {
        case 'logo':
          updateData.logo_url = logoUrl;
          break;
        case 'payment':
          updateData.bank_name = bankName;
          updateData.account_number = accountNumber;
          updateData.account_name = accountName;
          updateData.paystack_enabled = paystackEnabled;
          updateData.paystack_public_key = paystackPublicKey;
          updateData.paystack_test_mode = paystackTestMode;
          break;
        case 'delivery':
          updateData.delivery_areas = deliveryAreas;
          updateData.delivery_fee = deliveryFee;
          updateData.minimum_order = minimumOrder;
          break;
        case 'hours':
          updateData.business_hours = businessHours;
          updateData.days_of_operation = daysOfOperation;
          break;
        case 'about':
          updateData.about_us = aboutUs;
          break;
        case 'social':
          updateData.instagram_url = instagramUrl;
          updateData.facebook_url = facebookUrl;
          break;
      }

      await updateStore(store.id, updateData);

      console.log('[OnlineStoreSetup] Section saved successfully:', section);

      // Show success message
      alert(`✅ ${section.charAt(0).toUpperCase() + section.slice(1)} section saved successfully!`);

      // Close the section after saving
      setOpenSection(null);
    } catch (error) {
      console.error('[OnlineStoreSetup] Error saving section:', error);
      if (error instanceof Error && error.message.includes('offline')) {
        setIsOffline(true);
      }
      alert(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle reconnection (Supabase)
  const handleReconnect = async () => {
    setReconnecting(true);
    try {
      console.log('[OnlineStoreSetup] Testing Supabase connection...');

      // Test connection with a simple query
      const { error } = await supabase
        .from('stores')
        .select('count')
        .limit(1);

      if (error) throw error;

      setIsOffline(false);
      console.log('[OnlineStoreSetup] Reconnected successfully!');
      alert('✅ Connection restored! You can now save your store.');
    } catch (error) {
      console.error('[OnlineStoreSetup] Reconnection failed:', error);
      alert('❌ Still unable to connect. Please check your internet connection and try again.');
    } finally {
      setReconnecting(false);
    }
  };

  // Calculate completion
  const sections = [
    { id: 'logo', completed: !!logoUrl },
    { id: 'payment', completed: (!!bankName && !!accountNumber) || (paystackEnabled && !!paystackPublicKey) },
    { id: 'delivery', completed: !!deliveryAreas },
    { id: 'hours', completed: daysOfOperation.length > 0 },
    { id: 'about', completed: !!aboutUs },
    { id: 'social', completed: !!instagramUrl || !!facebookUrl },
  ];
  const completedCount = sections.filter(s => s.completed).length;
  const completionPercentage = Math.round((completedCount / sections.length) * 100);

  // Check if main setup is valid
  const isMainSetupValid =
    businessName.trim().length > 0 &&
    whatsappNumber.trim().length > 0 &&
    storeSlug.trim().length >= 3 &&
    slugStatus === 'available' &&
    !userLoading &&
    !!supabaseUser;

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  const toggleDay = (day: string) => {
    setDaysOfOperation(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const applyTemplate = (content: string) => {
    setAboutUs(content);
  };

  const handleDownloadQR = async () => {
    if (!storeSlug) return;
    try {
      await downloadQRCode(`${window.location.origin}/store/${storeSlug}`, `${storeSlug}-qr.png`);
    } catch (error) {
      console.error('Error downloading QR:', error);
    }
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          🛍️ Online Store Setup
        </h1>
        <p style={{ color: '#6B7280', fontSize: '14px' }}>
          {mainSetupComplete
            ? 'Customize your store with additional settings below'
            : 'Create your online store in 3 simple steps'
          }
        </p>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          animation: 'slideIn 0.3s ease-out',
        }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
            Store Created Successfully!
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            Your store is live at: {window.location.origin}/store/{storeSlug}
          </div>
        </div>
      )}

      {/* Offline Warning */}
      {isOffline && (
        <div style={{
          background: '#FEF2F2',
          border: '2px solid #DC2626',
          color: '#991B1B',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '14px',
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '16px' }}>
            ⚠️ Connection Issue Detected
          </div>
          <div style={{ marginBottom: '12px' }}>
            Database is offline. Please check your internet connection.
          </div>
          <button
            type="button"
            onClick={handleReconnect}
            disabled={reconnecting}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              color: 'white',
              background: reconnecting ? '#9CA3AF' : '#DC2626',
              border: 'none',
              borderRadius: '6px',
              cursor: reconnecting ? 'not-allowed' : 'pointer',
            }}
          >
            {reconnecting ? '⏳ Reconnecting...' : '🔄 Try Reconnecting'}
          </button>
        </div>
      )}

      {/* Main Setup Card */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          marginBottom: '20px',
          color: '#1F2937',
        }}>
          Essential Information
        </h2>

        {/* Business Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
          }}>
            Business Name <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="text"
            name="business-name"
            inputMode="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g., Ola's Fashion Boutique"
            disabled={mainSetupComplete && !isEditingMain}
            autoComplete="organization"
            autoCorrect="off"
            spellCheck="false"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: mainSetupComplete && !isEditingMain ? '#F3F4F6' : 'white',
              color: '#1F2937',
              WebkitTextFillColor: '#1F2937',
              WebkitTextSecurity: 'none',
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* WhatsApp Number */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
          }}>
            WhatsApp Number <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <input
            type="tel"
            name="whatsapp-number"
            inputMode="tel"
            value={formatPhoneDisplay(whatsappNumber)}
            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\s/g, ''))}
            placeholder="0801 234 5678"
            disabled={mainSetupComplete && !isEditingMain}
            autoComplete="tel"
            autoCorrect="off"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #E5E7EB',
              borderRadius: '8px',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: mainSetupComplete && !isEditingMain ? '#F3F4F6' : 'white',
              color: '#1F2937',
              WebkitTextFillColor: '#1F2937',
              WebkitTextSecurity: 'none',
              WebkitAppearance: 'none',
            }}
          />
        </div>

        {/* Store URL */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '8px',
          }}>
            Store URL <span style={{ color: '#DC2626' }}>*</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#6B7280', fontSize: '14px' }}>
              {window.location.origin}/store/
            </span>
            <input
              type="text"
              name="store-url"
              inputMode="text"
              value={storeSlug}
              onChange={(e) => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="your-store"
              disabled={mainSetupComplete && !isEditingMain}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '16px',
                border: '2px solid #E5E7EB',
                borderRadius: '8px',
                outline: 'none',
                backgroundColor: mainSetupComplete && !isEditingMain ? '#F3F4F6' : 'white',
                color: '#1F2937',
                WebkitTextFillColor: '#1F2937',
                WebkitTextSecurity: 'none',
                WebkitAppearance: 'none',
              }}
            />
            {slugStatus === 'checking' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⏳</span>
                <button
                  type="button"
                  onClick={() => setSlugStatus('available')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Use Anyway
                </button>
              </div>
            )}
            {slugStatus === 'available' && <span style={{ color: '#10B981' }}>✅</span>}
            {slugStatus === 'taken' && <span style={{ color: '#DC2626' }}>❌</span>}
          </div>
          {slugStatus === 'taken' && (
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#DC2626' }}>
              Already taken. Try: <button
                onClick={() => setStoreSlug(slugSuggestion)}
                style={{
                  color: '#667eea',
                  textDecoration: 'underline',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {slugSuggestion}
              </button>
            </div>
          )}
        </div>

        {/* Warning for URL changes */}
        {isEditingMain && mainSetupComplete && (
          <div style={{
            marginTop: '12px',
            padding: '12px',
            background: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#92400E',
          }}>
            ⚠️ <strong>Warning:</strong> Changing your Store URL will break any links you've already shared with customers.
          </div>
        )}

        {/* Save Button or Action Buttons */}
        {!mainSetupComplete ? (
          <>
            <button
              onClick={handleSaveMainSetup}
              disabled={!isMainSetupValid || saveStatus === 'saving'}
              style={{
                width: '100%',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                color: 'white',
                background: isMainSetupValid
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#D1D5DB',
                border: 'none',
                borderRadius: '8px',
                cursor: isMainSetupValid ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
              }}
            >
              {saveStatus === 'saving' ? '⏳ Creating Your Store...' : '🚀 Create Your Store'}
            </button>

            {/* Debug validation status */}
            {!isMainSetupValid && (
              <div style={{
                marginTop: '12px',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#1F2937',
                background: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
              }}>
                {userLoading && <div style={{ marginBottom: '4px' }}>• Setting up your account...</div>}
                {!supabaseUser && !userLoading && <div style={{ marginBottom: '4px', color: '#DC2626' }}>• Account setup required. Please refresh the page.</div>}
                {!businessName.trim() && <div style={{ marginBottom: '4px' }}>• Business name is required</div>}
                {!whatsappNumber.trim() && <div style={{ marginBottom: '4px' }}>• WhatsApp number is required</div>}
                {storeSlug.trim().length < 3 && <div style={{ marginBottom: '4px' }}>• Store URL must be at least 3 characters</div>}
                {storeSlug.trim().length >= 3 && slugStatus === 'checking' && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ marginRight: '8px', color: '#667eea' }}>• Checking URL availability...</span>
                    <button
                      type="button"
                      onClick={() => setSlugStatus('available')}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Skip Check
                    </button>
                  </div>
                )}
                {storeSlug.trim().length >= 3 && slugStatus === 'taken' && <div style={{ marginBottom: '4px', color: '#DC2626', fontWeight: '600' }}>• This URL is already taken</div>}
                {storeSlug.trim().length >= 3 && slugStatus === 'idle' && (
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ marginRight: '8px' }}>• Waiting for URL check...</span>
                    <button
                      type="button"
                      onClick={() => setSlugStatus('available')}
                      style={{
                        padding: '4px 12px',
                        fontSize: '12px',
                        background: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Skip Check
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            {!isEditingMain ? (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => {
                    const storeUrl = `${window.location.origin}/store/${storeSlug}`;
                    navigator.clipboard.writeText(storeUrl);
                    alert('✅ Store link copied to clipboard!');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#667eea',
                    background: 'white',
                    border: '2px solid #667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#F3F4F6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  📋 Copy Link
                </button>
                <button
                  onClick={() => window.open(`/store/${storeSlug}`, '_blank')}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🌐 Visit Store
                </button>
                <button
                  onClick={async () => {
                    // Get total product count for the store
                    const { count } = await supabase
                      .from('products')
                      .select('*', { count: 'exact', head: true })
                      .eq('user_id', currentUser?.uid)
                      .eq('is_public', true);

                    const storeUrl = `${window.location.origin}/store/${storeSlug}`;
                    shareStoreToWhatsApp(businessName, storeUrl, count || 0);
                  }}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: '#25D366',
                    border: '2px solid #25D366',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#20BA5A';
                    e.currentTarget.style.borderColor = '#20BA5A';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#25D366';
                    e.currentTarget.style.borderColor = '#25D366';
                  }}
                >
                  📱 Share Store
                </button>
                <button
                  onClick={() => setIsEditingMain(true)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    background: 'white',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.color = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#6B7280';
                  }}
                >
                  ✏️ Edit
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={async () => {
                    // Save updated main fields (Supabase)
                    if (!store?.id) return;
                    setSaveStatus('saving');
                    try {
                      await updateStore(store.id, {
                        business_name: businessName,
                        whatsapp_number: whatsappNumber,
                        store_slug: storeSlug,
                      });

                      setSaveStatus('saved');
                      setIsEditingMain(false);
                      alert('✅ Details updated successfully!');

                      setTimeout(() => setSaveStatus('idle'), 2000);
                    } catch (error) {
                      console.error('Error updating details:', error);
                      setSaveStatus('error');
                      alert(`❌ Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
                    }
                  }}
                  disabled={saveStatus === 'saving'}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'white',
                    background: saveStatus === 'saving' ? '#D1D5DB' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {saveStatus === 'saving' ? '⏳ Saving...' : '✅ Save Changes'}
                </button>
                <button
                  onClick={() => setIsEditingMain(false)}
                  style={{
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6B7280',
                    background: 'white',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  ✖️ Cancel
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Optional Sections Accordion */}
      {mainSetupComplete && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}>
          {/* Progress Header */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1F2937',
                margin: 0,
              }}>
                Additional Settings
              </h2>
              <span style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#667eea',
              }}>
                {completedCount} of {sections.length} completed
              </span>
            </div>
            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              background: '#E5E7EB',
              borderRadius: '4px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${completionPercentage}%`,
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Accordion Sections */}
          {/* Logo Section */}
          <AccordionSection
            id="logo"
            icon="📸"
            title="Store Logo"
            description="Add a professional logo to build trust"
            completed={!!logoUrl}
            isOpen={openSection === 'logo'}
            onToggle={() => toggleSection('logo')}
          >
            <div style={{ padding: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px',
              }}>
                Logo URL
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  backgroundColor: 'white',
                  color: '#1F2937',
                  WebkitTextFillColor: '#1F2937',
                  WebkitAppearance: 'none',
                }}
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  style={{
                    width: '100px',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '50%',
                    marginBottom: '12px',
                  }}
                />
              )}
              <button
                onClick={() => handleSaveSection('logo')}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Save Logo
              </button>
            </div>
          </AccordionSection>

          {/* Payment Section */}
          <AccordionSection
            id="payment"
            icon="💳"
            title="Payment Details"
            description="Make it easy for customers to pay you"
            completed={!!bankName && !!accountNumber}
            isOpen={openSection === 'payment'}
            onToggle={() => toggleSection('payment')}
          >
            <div style={{ padding: '20px' }}>
              {/* Manual Bank Transfer Section */}
              <h4 style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '12px',
              }}>
                🏦 Manual Bank Transfer
              </h4>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                >
                  <option value="">Select your bank</option>
                  {NIGERIAN_BANKS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Account Number
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="0123456789"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
                {accountNumber && !validateAccountNumber(accountNumber) && (
                  <div style={{ marginTop: '4px', fontSize: '13px', color: '#DC2626' }}>
                    Account number must be 10 digits
                  </div>
                )}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>

              {/* Divider */}
              <div style={{
                borderTop: '1px solid #E5E7EB',
                margin: '24px 0',
              }} />

              {/* Paystack Online Payment Section */}
              <h4 style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '12px',
              }}>
                💳 Online Payment (Paystack)
              </h4>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                }}>
                  <div
                    onClick={() => setPaystackEnabled(!paystackEnabled)}
                    style={{
                      width: '48px',
                      height: '24px',
                      background: paystackEnabled ? '#667eea' : '#D1D5DB',
                      borderRadius: '12px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      marginRight: '12px',
                    }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: paystackEnabled ? '26px' : '2px',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  Enable Paystack
                </label>
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', marginLeft: '60px' }}>
                  Accept card payments directly on your store
                </div>
              </div>

              {paystackEnabled && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                      marginBottom: '8px',
                    }}>
                      Paystack Public Key
                    </label>
                    <input
                      type="text"
                      value={paystackPublicKey}
                      onChange={(e) => setPaystackPublicKey(e.target.value)}
                      placeholder="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '2px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                    />
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                      Get your key from{' '}
                      <a
                        href="https://dashboard.paystack.com/#/settings/developer"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'underline' }}
                      >
                        Paystack Dashboard
                      </a>
                    </div>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#374151',
                    }}>
                      <div
                        onClick={() => setPaystackTestMode(!paystackTestMode)}
                        style={{
                          width: '48px',
                          height: '24px',
                          background: paystackTestMode ? '#F59E0B' : '#D1D5DB',
                          borderRadius: '12px',
                          position: 'relative',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          marginRight: '12px',
                        }}
                      >
                        <div style={{
                          width: '20px',
                          height: '20px',
                          background: 'white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '2px',
                          left: paystackTestMode ? '26px' : '2px',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }} />
                      </div>
                      Test Mode
                    </label>
                    <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', marginLeft: '60px' }}>
                      {paystackTestMode
                        ? '⚠️ Using test mode - no real charges will be made'
                        : '✅ Live mode - real payments will be processed'
                      }
                    </div>
                  </div>
                </>
              )}

              <button
                onClick={() => handleSaveSection('payment')}
                disabled={(!bankName || !validateAccountNumber(accountNumber)) && (!paystackEnabled || !paystackPublicKey)}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  background: ((bankName && validateAccountNumber(accountNumber)) || (paystackEnabled && paystackPublicKey)) ? '#667eea' : '#D1D5DB',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: ((bankName && validateAccountNumber(accountNumber)) || (paystackEnabled && paystackPublicKey)) ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                💾 Save Payment Details
              </button>
            </div>
          </AccordionSection>

          {/* Delivery Section */}
          <AccordionSection
            id="delivery"
            icon="🚚"
            title="Delivery Information"
            description="Let customers know your delivery options"
            completed={!!deliveryAreas}
            isOpen={openSection === 'delivery'}
            onToggle={() => toggleSection('delivery')}
          >
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Delivery Areas
                </label>
                <input
                  type="text"
                  value={deliveryAreas}
                  onChange={(e) => setDeliveryAreas(e.target.value)}
                  placeholder="e.g., Lekki, Victoria Island, Ikeja"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Delivery Fee
                </label>
                <input
                  type="text"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  placeholder="e.g., ₦2,000 - ₦5,000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Free Delivery Minimum (Optional)
                </label>
                <input
                  type="text"
                  value={minimumOrder}
                  onChange={(e) => setMinimumOrder(e.target.value)}
                  placeholder="e.g., ₦50,000"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <button
                onClick={() => handleSaveSection('delivery')}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Save Delivery Info
              </button>
            </div>
          </AccordionSection>

          {/* Business Hours Section */}
          <AccordionSection
            id="hours"
            icon="⏰"
            title="Business Hours"
            description="Show when you're available"
            completed={daysOfOperation.length > 0}
            isOpen={openSection === 'hours'}
            onToggle={() => toggleSection('hours')}
          >
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Operating Hours
                </label>
                <input
                  type="text"
                  value={businessHours}
                  onChange={(e) => setBusinessHours(e.target.value)}
                  placeholder="e.g., 9:00 AM - 6:00 PM"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px',
                }}>
                  Days of Operation
                </label>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                  <label key={day} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid #E5E7EB',
                  }}>
                    <span style={{ fontSize: '14px', color: '#374151' }}>{day}</span>
                    <div
                      onClick={() => toggleDay(day)}
                      style={{
                        width: '48px',
                        height: '24px',
                        background: daysOfOperation.includes(day) ? '#667eea' : '#D1D5DB',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: daysOfOperation.includes(day) ? '26px' : '2px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </label>
                ))}
              </div>
              <button
                onClick={() => handleSaveSection('hours')}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Save Business Hours
              </button>
            </div>
          </AccordionSection>

          {/* About Section */}
          <AccordionSection
            id="about"
            icon="📝"
            title="About Your Business"
            description="Tell customers your story"
            completed={!!aboutUs}
            isOpen={openSection === 'about'}
            onToggle={() => toggleSection('about')}
          >
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Quick Templates
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ABOUT_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => applyTemplate(template.content)}
                      style={{
                        padding: '8px 16px',
                        background: '#F3F4F6',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {template.icon} {template.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  About Your Business
                </label>
                <textarea
                  value={aboutUs}
                  onChange={(e) => setAboutUs(e.target.value.slice(0, 500))}
                  placeholder="Tell customers about your business..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    resize: 'vertical',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
                <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>
                  {aboutUs.length}/500 characters
                </div>
              </div>
              <button
                onClick={() => handleSaveSection('about')}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Save About Info
              </button>
            </div>
          </AccordionSection>

          {/* Social Media Section */}
          <AccordionSection
            id="social"
            icon="📱"
            title="Social Media"
            description="Connect your social profiles"
            completed={!!instagramUrl || !!facebookUrl}
            isOpen={openSection === 'social'}
            onToggle={() => toggleSection('social')}
          >
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Instagram Handle
                </label>
                <input
                  type="text"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="@yourhandle or instagram.com/yourhandle"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px',
                }}>
                  Facebook Page
                </label>
                <input
                  type="text"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  placeholder="facebook.com/yourpage"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '2px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#1F2937',
                    WebkitTextFillColor: '#1F2937',
                    WebkitAppearance: 'none',
                  }}
                />
              </div>
              <button
                onClick={() => handleSaveSection('social')}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Save Social Media
              </button>
            </div>
          </AccordionSection>

          {/* Promo Codes Section */}
          {currentUser && supabaseUser && (
            <AccordionSection
              id="promo"
              icon="🎁"
              title="Promo Codes"
              description="Create discount codes for your customers"
              isOpen={openSection === 'promo'}
              onToggle={() => toggleSection('promo')}
              completed={false}
            >
              <PromoCodesManager userId={supabaseUser.id} />
            </AccordionSection>
          )}

          {/* QR Code Section */}
          {storeSlug && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              background: '#F9FAFB',
              borderRadius: '12px',
              textAlign: 'center',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                📱 Share Your Store
              </h3>
              <img
                src={generateStoreQRCode(storeSlug, 200)}
                alt="Store QR Code"
                style={{
                  width: '200px',
                  height: '200px',
                  margin: '0 auto 12px',
                }}
              />
              <button
                onClick={handleDownloadQR}
                style={{
                  padding: '10px 20px',
                  background: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'block',
                  margin: '0 auto',
                }}
              >
                Download QR Code
              </button>
              <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '12px', textAlign: 'center' }}>
                Customers can scan this QR code to visit your store
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Accordion Section Component
interface AccordionSectionProps {
  id: string;
  icon: string;
  title: string;
  description: string;
  completed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({
  icon,
  title,
  description,
  completed,
  isOpen,
  onToggle,
  children,
}: AccordionSectionProps) {
  return (
    <div style={{
      border: '1px solid #E5E7EB',
      borderRadius: '12px',
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        onClick={onToggle}
        style={{
          padding: '16px 20px',
          background: isOpen ? '#F9FAFB' : 'white',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <span style={{ fontSize: '24px' }}>{icon}</span>
          <div>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '2px',
            }}>
              {title}
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>
              {description}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {completed && (
            <span style={{
              background: '#10B981',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
            }}>
              ✓ Done
            </span>
          )}
          <span style={{
            fontSize: '20px',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>
            ▼
          </span>
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div style={{
          borderTop: '1px solid #E5E7EB',
          background: 'white',
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
