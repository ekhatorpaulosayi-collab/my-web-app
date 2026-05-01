import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStore, useStoreActions } from '../lib/supabase-hooks';
import { supabase } from '../lib/supabase';
import { uploadStoreLogo } from '../lib/supabase-storage';
import { makeAllItemsPublic } from '../utils/makeItemsPublic';
import { Share2, Camera, Link, Loader, Check, X, Eye } from 'lucide-react';
import type { StoreProfile } from '../types';
import { NIGERIAN_BANKS, validateAccountNumber, formatAccountNumber } from '../utils/nigerianBanks';
import { ABOUT_TEMPLATES, countCharacters } from '../utils/aboutTemplates';
import { generateStoreQRCode, downloadQRCode } from '../utils/qrCode';
import { useAutoSave, getSaveStatusMessage, getSaveStatusColor } from '../hooks/useAutoSave';
import { showFriendlyError } from '../utils/friendlyErrors';
import { validateTikTokUrl, normalizeTikTokUrl } from '../utils/socialShare';
import '../styles/store-settings.css';

export const StoreSettings: React.FC = () => {
  const { currentUser: user } = useAuth();

  // Load store from Supabase
  const { store, loading: storeLoading } = useStore(user?.uid);
  const { updateStore, saving } = useStoreActions(user?.uid);

  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [storeSlug, setStoreSlug] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [slugError, setSlugError] = useState('');
  const [showQRCode, setShowQRCode] = useState(false);

  // Custom domain state
  const [customDomain, setCustomDomain] = useState('');
  const [customDomainVerified, setCustomDomainVerified] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  // Payment details state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [paymentInstructions, setPaymentInstructions] = useState('');

  // Paystack integration state
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [paystackPublicKey, setPaystackPublicKey] = useState('');
  const [paystackTestMode, setPaystackTestMode] = useState(true);

  // Delivery information state
  const [deliveryAreas, setDeliveryAreas] = useState<string[]>([]);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [minimumOrder, setMinimumOrder] = useState('');
  const [newArea, setNewArea] = useState('');

  // Business hours state
  const [businessHours, setBusinessHours] = useState('');
  const [daysOfOperation, setDaysOfOperation] = useState<string[]>([]);

  // Social media state
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  // About & Policies state
  const [aboutUs, setAboutUs] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  // Slug normalization function
  const normalizeSlug = (s: string): string => {
    return s.toLowerCase().trim()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Slug validation
  const validateSlug = (slug: string): string | null => {
    if (!slug || slug.length < 3) return 'Store URL must be at least 3 characters';
    if (slug.length > 30) return 'Store URL must be less than 30 characters';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug)) {
      return 'Store URL must start and end with letter or number';
    }
    return null;
  };

  // Load existing store profile from Supabase hook
  useEffect(() => {
    if (!store) return;

    // Map Supabase data to local state
    const data: any = {
      storeSlug: store.store_slug,
      businessName: store.business_name,
      whatsappNumber: store.whatsapp_number,
      address: store.address,
      logoUrl: store.logo_url,
      subdomain: store.subdomain,
      customDomain: store.custom_domain,
      customDomainVerified: store.custom_domain_verified,
      bankName: store.bank_name,
      accountNumber: store.account_number,
      accountName: store.account_name,
      acceptedPaymentMethods: store.accepted_payment_methods,
      paymentInstructions: store.payment_instructions,
      paystackEnabled: store.paystack_enabled,
      paystackPublicKey: store.paystack_public_key,
      paystackTestMode: store.paystack_test_mode,
      deliveryAreas: store.delivery_areas,
      deliveryFee: store.delivery_fee,
      deliveryTime: store.delivery_time,
      minimumOrder: store.minimum_order,
      businessHours: store.business_hours,
      daysOfOperation: store.days_of_operation,
      instagramUrl: store.instagram_url,
      facebookUrl: store.facebook_url,
      tiktokUrl: store.tiktok_url,
      twitterUrl: store.twitter_url,
      aboutUs: store.about_us,
      returnPolicy: store.return_policy,
    };

    setStoreProfile(data as StoreProfile);
    setStoreSlug(data.storeSlug || '');
    setBusinessName(data.businessName || '');
    setWhatsappNumber(data.whatsappNumber || '');
    setAddress(data.address || '');
    if (data.logoUrl) setLogoPreview(data.logoUrl);

    // Load domain settings
    setSubdomain(data.subdomain || '');
    setCustomDomain(data.customDomain || '');
    setCustomDomainVerified(data.customDomainVerified || false);

    // Load payment details
    setBankName(data.bankName || '');
    setAccountNumber(data.accountNumber || '');
    setAccountName(data.accountName || '');
    setPaymentMethods(data.acceptedPaymentMethods || []);
    setPaymentInstructions(data.paymentInstructions || '');

    // Load Paystack settings
    setPaystackEnabled(data.paystackEnabled || false);
    setPaystackPublicKey(data.paystackPublicKey || '');
    setPaystackTestMode(data.paystackTestMode ?? true);

    // Load delivery information
    setDeliveryAreas(data.deliveryAreas || []);
    setDeliveryFee(data.deliveryFee || '');
    setDeliveryTime(data.deliveryTime || '');
    setMinimumOrder(data.minimumOrder || '');

    // Load business hours
    setBusinessHours(data.businessHours || '');
    setDaysOfOperation(data.daysOfOperation || []);

    // Load social media
    setInstagramUrl(data.instagramUrl || '');
    setFacebookUrl(data.facebookUrl || '');
    setTiktokUrl(data.tiktokUrl || '');
    setTwitterUrl(data.twitterUrl || '');

    // Load about & policies
    setAboutUs(data.aboutUs || '');
    setReturnPolicy(data.returnPolicy || '');
  }, [store]);

  // Check slug availability (Supabase)
  const checkSlugAvailability = async (slug: string) => {
    const normalized = normalizeSlug(slug);
    const error = validateSlug(normalized);

    if (error) {
      setSlugError(error);
      setSlugAvailable(false);
      return;
    }

    setSlugError('');

    try {
      const { data, error: queryError } = await supabase
        .from('stores')
        .select('user_id')
        .eq('store_slug', normalized)
        .maybeSingle();

      if (queryError && queryError.code !== 'PGRST116') {
        throw queryError;
      }

      const available = !data || data.user_id === user?.uid;
      setSlugAvailable(available);
    } catch (error) {
      console.error('Error checking slug:', error);
      setSlugAvailable(null);
    }
  };

  // Debounced slug check
  useEffect(() => {
    if (!storeSlug) {
      setSlugAvailable(null);
      return;
    }

    const timer = setTimeout(() => checkSlugAvailability(storeSlug), 500);
    return () => clearTimeout(timer);
  }, [storeSlug]);

  // Handle logo file selection with 2MB limit
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('⚠️ Image must be less than 2MB\n\nPlease use a smaller image or compress it before uploading.');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Save store settings (Supabase)
  const handleSave = async () => {
    if (!user || !store?.id) return;

    // Validate required fields
    const missingFields: string[] = [];

    if (!businessName.trim()) missingFields.push('Business Name');
    if (!storeSlug.trim()) missingFields.push('Store URL');

    if (missingFields.length > 0) {
      alert(`❌ Please fill in the following required fields:\n\n${missingFields.map(f => `• ${f}`).join('\n')}`);
      return;
    }

    const normalizedSlug = normalizeSlug(storeSlug);
    const validationError = validateSlug(normalizedSlug);

    if (validationError) {
      alert(`❌ Store URL Error:\n\n${validationError}`);
      return;
    }

    setLoading(true);

    try {
      let logoUrl = storeProfile?.logoUrl;

      // Upload logo if changed
      if (logoFile) {
        logoUrl = await uploadStoreLogo(logoFile, user.uid, storeProfile?.logoUrl);
      }

      // Update store profile in Supabase
      const profileData = {
        business_name: businessName.trim(),
        store_slug: normalizedSlug,
        subdomain: normalizedSlug, // Auto-sync subdomain with slug
        custom_domain: customDomain.trim() || null,
        logo_url: logoUrl || '',
        whatsapp_number: whatsappNumber.trim(),
        address: address.trim(),
        is_public: true,
        // Payment details
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_name: accountName.trim(),
        accepted_payment_methods: paymentMethods,
        payment_instructions: paymentInstructions.trim(),
        // Paystack integration
        paystack_enabled: paystackEnabled,
        paystack_public_key: paystackPublicKey.trim(),
        paystack_test_mode: paystackTestMode,
        // Delivery information
        delivery_areas: deliveryAreas,
        delivery_fee: deliveryFee.trim(),
        delivery_time: deliveryTime.trim(),
        minimum_order: minimumOrder.trim(),
        // Business hours
        business_hours: businessHours.trim(),
        days_of_operation: daysOfOperation,
        // Social media
        instagram_url: instagramUrl.trim(),
        facebook_url: facebookUrl.trim(),
        tiktok_url: normalizeTikTokUrl(tiktokUrl), // Normalize to full URL format
        twitter_url: twitterUrl.trim(),
        // About & Policies
        about_us: aboutUs.trim(),
        return_policy: returnPolicy.trim()
      };

      await updateStore(store.id, profileData);

      alert('Store settings saved successfully!');

    } catch (error: any) {
      console.error('Error saving:', error);

      // Show friendly error message
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        alert('❌ This store URL is already taken.\n\nPlease choose a different URL.');
      } else {
        showFriendlyError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Make all items public
  const handleMakeItemsPublic = async () => {
    if (!user) return;

    if (!confirm('Make all your items visible on the public storefront?')) return;

    setLoading(true);
    try {
      const result = await makeAllItemsPublic(user.uid);
      alert(`✅ Success! ${result.updated} items are now public and visible on your storefront.`);
    } catch (error: any) {
      console.error('Error making items public:', error);
      showFriendlyError(error);
    } finally {
      setLoading(false);
    }
  };

  // Payment method toggle
  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  // Delivery area management
  const addDeliveryArea = () => {
    const trimmed = newArea.trim();
    if (trimmed && !deliveryAreas.includes(trimmed)) {
      setDeliveryAreas([...deliveryAreas, trimmed]);
      setNewArea('');
    }
  };

  const removeDeliveryArea = (area: string) => {
    setDeliveryAreas(deliveryAreas.filter(a => a !== area));
  };

  // Days of operation toggle
  const toggleDay = (day: string) => {
    setDaysOfOperation(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  // Use current domain (localhost in dev, production domain when deployed)
  const storeUrl = `${window.location.origin}/store/${normalizeSlug(storeSlug) || 'your-store'}`;

  // Clean card style matching Screenshot 015
  const cleanCardStyle = {
    margin: '2rem 0',
    padding: '1.5rem',
    background: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
  };

  return (
    <div className="store-settings">
      <h2>Store Settings</h2>

      {/* Store URL - Clean white card */}
      <div className="form-group" style={{
        ...cleanCardStyle,
        marginBottom: '2rem'
      }}>
        <label style={{ fontSize: '1rem', fontWeight: 600, color: '#202223' }}>
          🏪 Your Store URL <span style={{ color: '#dc2626' }}>*</span>
        </label>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.5rem 0 1rem' }}>
          This is the link customers will use to visit your online store (required)
        </p>
        <div className="url-input-container">
          <span className="url-prefix">storehouse.app/store/</span>
          <input
            type="text"
            value={storeSlug}
            onChange={(e) => setStoreSlug(e.target.value)}
            placeholder="your-store-name"
          />
          {slugAvailable !== null && storeSlug && (
            <span className={`availability-icon ${slugAvailable ? 'available' : 'taken'}`}>
              {slugAvailable ? <Check size={20} /> : <X size={20} />}
            </span>
          )}
        </div>
        {slugError && <span className="error-text">{slugError}</span>}
        {slugAvailable === false && !slugError && (
          <span className="error-text">This URL is already taken</span>
        )}

        {/* Share Preview */}
        <div className="share-preview" style={{ marginTop: '1rem' }}>
          <Link size={16} />
          <code>{storeUrl}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(storeUrl).then(() => {
                alert(`✅ Copied to clipboard!\n\n${storeUrl}\n\nShare this link with your customers!`);
              }).catch(err => {
                console.error('Failed to copy:', err);
                alert('Failed to copy URL');
              });
            }}
            className="btn btn-sm"
          >
            Copy Link
          </button>
        </div>

        {/* QR Code Section */}
        {storeSlug && slugAvailable && (
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              onClick={() => setShowQRCode(!showQRCode)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '8px',
                color: '#667eea',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5F7FF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <span style={{ fontSize: '20px' }}>📱</span>
              <span>{showQRCode ? 'Hide QR Code' : 'Show QR Code'}</span>
            </button>

            {showQRCode && (
              <div style={{
                marginTop: '16px',
                padding: '20px',
                background: '#F9FAFB',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}>
                <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, textAlign: 'center' }}>
                  Customers can scan this QR code to visit your store
                </p>
                <img
                  src={generateStoreQRCode(normalizeSlug(storeSlug), 300)}
                  alt="Store QR Code"
                  style={{
                    width: '200px',
                    height: '200px',
                    borderRadius: '8px',
                    border: '2px solid #E5E7EB',
                    background: 'white',
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await downloadQRCode(storeUrl, `${normalizeSlug(storeSlug)}-qr-code.png`);
                      alert('✅ QR Code downloaded successfully!');
                    } catch (error) {
                      alert('Failed to download QR code. Please try again.');
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#5568d3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#667eea';
                  }}
                >
                  Download QR Code
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Custom Domain Section */}
      <div className="form-group" style={{
        background: '#ffffff',
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        marginBottom: '2rem'
      }}>
        <label style={{ fontSize: '1rem', fontWeight: 600, color: '#202223', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🌐 Custom Domain
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            background: '#F3F4F6',
            color: '#6B7280',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Optional
          </span>
        </label>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: '0.5rem 0 1rem' }}>
          Connect your own domain name (e.g., mybusiness.com) for a professional online presence
        </p>

        {/* Show subdomain as default option */}
        <div style={{
          padding: '16px',
          background: '#F0FDF4',
          border: '2px solid #86EFAC',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px', flexShrink: 0 }}>✅</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>
                Your free subdomain is ready!
              </div>
              <code style={{
                fontSize: '13px',
                background: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                color: '#059669',
                fontWeight: 600,
                display: 'inline-block',
                marginTop: '4px'
              }}>
                {subdomain || storeSlug}.storehouse.app
              </code>
              <div style={{ fontSize: '12px', color: '#16803D', marginTop: '8px' }}>
                This works immediately - no setup required!
              </div>
            </div>
          </div>
        </div>

        {/* Custom domain input */}
        <div>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px', display: 'block' }}>
            Custom Domain (Optional)
          </label>
          <input
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value.toLowerCase().trim())}
            placeholder="www.mybusiness.com"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '14px',
              border: customDomainVerified ? '2px solid #10b981' : '1px solid #D1D5DB',
              borderRadius: '8px',
              outline: 'none',
              fontFamily: 'monospace'
            }}
          />

          {customDomainVerified && (
            <div style={{
              marginTop: '8px',
              fontSize: '13px',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={16} />
              Domain verified and active
            </div>
          )}

          {customDomain && !customDomainVerified && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#92400E'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>
                ⚠️ DNS Setup Required
              </div>
              <div style={{ marginBottom: '8px' }}>
                Add this CNAME record in your domain settings:
              </div>
              <div style={{
                background: 'white',
                padding: '8px',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '12px',
                marginBottom: '8px'
              }}>
                <div><strong>Type:</strong> CNAME</div>
                <div><strong>Name:</strong> www (or @)</div>
                <div><strong>Value:</strong> {subdomain || storeSlug}.storehouse.app</div>
              </div>
              <div style={{ fontSize: '12px', color: '#78350F' }}>
                After adding the DNS record, save your settings. Verification can take up to 24 hours.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Business Name */}
      <div className="form-group">
        <label>Business Name <span style={{ color: '#dc2626' }}>*</span></label>
        <input
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Paul Osayi Enterprise"
          required
        />
      </div>

      {/* WhatsApp Number */}
      <div className="form-group">
        <label>WhatsApp Number</label>
        <input
          type="tel"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="2348012345678"
        />
      </div>

      {/* Address */}
      <div className="form-group">
        <label>Store Address</label>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Shop 24, Main Market, Lagos"
        />
      </div>

      {/* Payment Details Section */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          💳 Payment Details
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Add your bank account details so customers know where to send payment. This will be displayed on your storefront.
        </p>

        {/* Bank Name - Enhanced with Dropdown */}
        <div className="form-group">
          <label>Bank Name</label>
          <select
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            <option value="">Select your bank</option>
            {NIGERIAN_BANKS.map(bank => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </select>
        </div>

        {/* Account Number - Enhanced with Validation */}
        <div className="form-group">
          <label>Account Number</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => {
              const formatted = formatAccountNumber(e.target.value);
              setAccountNumber(formatted);
            }}
            placeholder="0123456789"
            maxLength={10}
            style={{
              borderColor: accountNumber && !validateAccountNumber(accountNumber) ? '#DC2626' : '#D1D5DB',
            }}
          />
          {accountNumber && !validateAccountNumber(accountNumber) && (
            <p style={{ fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>
              Account number must be exactly 10 digits
            </p>
          )}
          {accountNumber && validateAccountNumber(accountNumber) && (
            <p style={{ fontSize: '13px', color: '#059669', marginTop: '6px' }}>
              ✓ Valid account number
            </p>
          )}
        </div>

        {/* Account Name */}
        <div className="form-group">
          <label>Account Name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Paul Osayi Enterprise"
          />
        </div>

        {/* Payment Details Preview */}
        {bankName && accountNumber && accountName && validateAccountNumber(accountNumber) && (
          <div style={{
            marginTop: '1.5rem',
            padding: '16px',
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            borderRadius: '8px',
          }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
              ✓ Customer Preview
            </p>
            <div style={{ fontSize: '14px', color: '#166534', lineHeight: 1.6 }}>
              <div><strong>Bank:</strong> {bankName}</div>
              <div><strong>Account:</strong> {accountNumber}</div>
              <div><strong>Name:</strong> {accountName}</div>
            </div>
          </div>
        )}

        {/* Payment Methods */}
        <div className="form-group">
          <label>Accepted Payment Methods</label>
          <p style={{
            fontSize: '0.875rem',
            color: '#64748b',
            marginBottom: '0.75rem'
          }}>
            Select all methods you accept:
          </p>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {['Bank Transfer', 'POS', 'Cash', 'USSD', 'Mobile Money'].map(method => (
              <label
                key={method}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: paymentMethods.includes(method) ? '#3b82f6' : 'white',
                  color: paymentMethods.includes(method) ? 'white' : '#1e293b',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}
              >
                <input
                  type="checkbox"
                  checked={paymentMethods.includes(method)}
                  onChange={() => togglePaymentMethod(method)}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                {method}
              </label>
            ))}
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="form-group">
          <label>Payment Instructions (Optional)</label>
          <textarea
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
            placeholder="e.g., Please send payment and WhatsApp the receipt. Delivery after payment confirmation."
            rows={3}
          />
        </div>

        {/* ========== PAYSTACK INTEGRATION SECTION ========== */}
        <div style={{
          margin: '2rem 0',
          padding: '1.5rem',
          background: '#F9FAFB',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: '#202223',
            marginBottom: '0.75rem'
          }}>
            💳 Online Payments (Paystack)
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#6B7280',
            marginBottom: '1.5rem',
            lineHeight: 1.6
          }}>
            Enable customers to pay instantly with cards, bank transfer, or USSD directly on your storefront.
          </p>

          {/* How It Works - Helpful Info Box */}
          <div style={{
            padding: '16px 18px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '1px solid #93C5FD',
            borderRadius: '12px',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#1E40AF',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              How Paystack Works
            </div>
            <div style={{
              fontSize: '13px',
              color: '#1E40AF',
              lineHeight: 1.6,
              marginBottom: '10px'
            }}>
              Your customers pay you directly through Paystack (just like Shopify or WooCommerce).
            </div>
            <div style={{
              fontSize: '13px',
              color: '#1E40AF',
              lineHeight: 1.7
            }}>
              <strong>Benefits:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                <li>Money goes straight to your Paystack account</li>
                <li>You control refunds and customer service</li>
                <li>No middleman holding your funds</li>
                <li>Instant payment notifications</li>
              </ul>
            </div>
          </div>

          {/* Enable Paystack Toggle */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: 'white',
              border: '2px solid #e0e7ff',
              borderRadius: '8px',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                checked={paystackEnabled}
                onChange={(e) => setPaystackEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#1e293b' }}>
                Enable Paystack Payments
              </span>
            </label>
          </div>

          {paystackEnabled && (
            <>
              {/* Test/Live Mode Toggle */}
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                  Mode
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: paystackTestMode ? '#fef3c7' : 'white',
                    border: `2px solid ${paystackTestMode ? '#fbbf24' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}>
                    <input
                      type="radio"
                      checked={paystackTestMode}
                      onChange={() => setPaystackTestMode(true)}
                      style={{ cursor: 'pointer' }}
                    />
                    🧪 Test Mode
                  </label>
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px',
                    background: !paystackTestMode ? '#dcfce7' : 'white',
                    border: `2px solid ${!paystackTestMode ? '#22c55e' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}>
                    <input
                      type="radio"
                      checked={!paystackTestMode}
                      onChange={() => setPaystackTestMode(false)}
                      style={{ cursor: 'pointer' }}
                    />
                    ✅ Live Mode
                  </label>
                </div>
                {paystackTestMode && (
                  <p style={{ fontSize: '0.8125rem', color: '#d97706', marginTop: '8px' }}>
                    ⚠️ Test mode uses test keys. No real money will be charged.
                  </p>
                )}
              </div>

              {/* Paystack Public Key */}
              <div className="form-group">
                <label>
                  Paystack Public Key {paystackTestMode ? '(Test)' : '(Live)'}
                </label>
                <input
                  type="text"
                  value={paystackPublicKey}
                  onChange={(e) => setPaystackPublicKey(e.target.value)}
                  placeholder={paystackTestMode ? 'pk_test_...' : 'pk_live_...'}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem'
                  }}
                />
                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '8px' }}>
                  Get your public key from{' '}
                  <a
                    href="https://dashboard.paystack.com/#/settings/developer"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                  >
                    Paystack Dashboard → Settings → API Keys
                  </a>
                </p>
              </div>

              {/* Info Box */}
              <div style={{
                marginTop: '1rem',
                padding: '12px 16px',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: '8px',
                fontSize: '0.8125rem',
                color: '#115e59'
              }}>
                <strong>💡 How it works:</strong>
                <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
                  <li>Customers can pay instantly on your storefront</li>
                  <li>Payments go directly to your Paystack account</li>
                  <li>You'll receive email notifications for each payment</li>
                  <li>Test mode lets you test without real money</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========== DELIVERY INFORMATION SECTION ========== */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🚚 Delivery Information
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Help customers know where you deliver and how much it costs.
        </p>

        {/* Delivery Areas */}
        <div className="form-group">
          <label>Delivery Areas</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDeliveryArea())}
              placeholder="e.g., Lekki, Victoria Island, Ikeja"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={addDeliveryArea}
              className="btn btn-secondary"
              style={{ padding: '10px 20px' }}
            >
              Add
            </button>
          </div>
          {deliveryAreas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              {deliveryAreas.map(area => (
                <span
                  key={area}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '20px',
                    fontSize: '0.875rem'
                  }}
                >
                  {area}
                  <button
                    type="button"
                    onClick={() => removeDeliveryArea(area)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '1rem'
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Delivery Fee */}
        <div className="form-group">
          <label>Delivery Fee</label>
          <input
            type="text"
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(e.target.value)}
            placeholder="e.g., ₦2,000 within Lagos, ₦3,500 outside Lagos"
          />
        </div>

        {/* Delivery Time */}
        <div className="form-group">
          <label>Estimated Delivery Time</label>
          <input
            type="text"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            placeholder="e.g., Same day delivery, 24-48 hours"
          />
        </div>

        {/* Minimum Order */}
        <div className="form-group">
          <label>Minimum Order Amount (Optional)</label>
          <input
            type="text"
            value={minimumOrder}
            onChange={(e) => setMinimumOrder(e.target.value)}
            placeholder="e.g., ₦5,000"
          />
        </div>
      </div>

      {/* ========== BUSINESS HOURS SECTION ========== */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⏰ Business Hours
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Let customers know when you're open for business.
        </p>

        {/* Operating Hours */}
        <div className="form-group">
          <label>Operating Hours</label>
          <input
            type="text"
            value={businessHours}
            onChange={(e) => setBusinessHours(e.target.value)}
            placeholder="e.g., 9:00 AM - 6:00 PM"
          />
        </div>

        {/* Days of Operation - Enhanced with Toggle Switches */}
        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <label style={{ margin: 0 }}>Days of Operation</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => {
                  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                  setDaysOfOperation(weekdays);
                }}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#667eea',
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
                Weekdays Only
              </button>
              <button
                type="button"
                onClick={() => {
                  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  setDaysOfOperation(allDays);
                }}
                style={{
                  padding: '6px 12px',
                  background: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#667eea',
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
                Select All Days
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label
                key={day}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: daysOfOperation.includes(day) ? '#F5F7FF' : 'white',
                  border: `2px solid ${daysOfOperation.includes(day) ? '#667eea' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}
              >
                <span style={{ color: daysOfOperation.includes(day) ? '#667eea' : '#1e293b' }}>
                  {day}
                </span>
                {/* Toggle Switch */}
                <div
                  onClick={() => toggleDay(day)}
                  style={{
                    width: '48px',
                    height: '24px',
                    background: daysOfOperation.includes(day) ? '#667eea' : '#D1D5DB',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'all 0.2s',
                    cursor: 'pointer',
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
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  }}></div>
                </div>
              </label>
            ))}
          </div>

          {/* Preview */}
          {daysOfOperation.length > 0 && businessHours && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#166534',
            }}>
              <strong>Preview:</strong> {daysOfOperation.join(', ')} | {businessHours}
            </div>
          )}
        </div>
      </div>

      {/* ========== SOCIAL MEDIA SECTION ========== */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📱 Social Media Links
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Connect your social media accounts to build trust and reach more customers.
        </p>

        {/* Instagram */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📸</span>
            Instagram URL (Optional)
          </label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourbusiness"
            style={{
              borderColor: instagramUrl && !instagramUrl.includes('instagram.com') ? '#FFA500' : '#D1D5DB',
            }}
          />
          {instagramUrl && !instagramUrl.includes('instagram.com') && (
            <p style={{ fontSize: '13px', color: '#EA580C', marginTop: '6px' }}>
              ⚠️ Make sure this is a valid Instagram URL
            </p>
          )}
        </div>

        {/* Facebook */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>👥</span>
            Facebook URL (Optional)
          </label>
          <input
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/yourbusiness"
            style={{
              borderColor: facebookUrl && !facebookUrl.includes('facebook.com') ? '#FFA500' : '#D1D5DB',
            }}
          />
          {facebookUrl && !facebookUrl.includes('facebook.com') && (
            <p style={{ fontSize: '13px', color: '#EA580C', marginTop: '6px' }}>
              ⚠️ Make sure this is a valid Facebook URL
            </p>
          )}
        </div>

        {/* TikTok */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🎵</span>
            TikTok URL (Optional)
          </label>
          <input
            type="text"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="@yourbusiness or https://tiktok.com/@yourbusiness"
            style={{
              borderColor: (() => {
                if (!tiktokUrl) return '#D1D5DB';
                const validation = validateTikTokUrl(tiktokUrl);
                return validation.valid ? '#10B981' : '#EF4444';
              })(),
            }}
          />
          {tiktokUrl && (() => {
            const validation = validateTikTokUrl(tiktokUrl);
            if (validation.valid && validation.normalized) {
              return (
                <p style={{ fontSize: '13px', color: '#10B981', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Will be saved as: {validation.normalized}
                </p>
              );
            } else if (!validation.valid) {
              return (
                <p style={{ fontSize: '13px', color: '#EF4444', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <X size={14} /> {validation.error}
                </p>
              );
            }
            return null;
          })()}
          <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
            Enter your TikTok username (@yourname) or full profile URL
          </p>
        </div>

        {/* Twitter/X */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🐦</span>
            Twitter/X URL (Optional)
          </label>
          <input
            type="url"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://twitter.com/yourbusiness"
            style={{
              borderColor: twitterUrl && !(twitterUrl.includes('twitter.com') || twitterUrl.includes('x.com')) ? '#FFA500' : '#D1D5DB',
            }}
          />
          {twitterUrl && !(twitterUrl.includes('twitter.com') || twitterUrl.includes('x.com')) && (
            <p style={{ fontSize: '13px', color: '#EA580C', marginTop: '6px' }}>
              ⚠️ Make sure this is a valid Twitter/X URL
            </p>
          )}
        </div>
      </div>

      {/* ========== ABOUT US SECTION ========== */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📖 About Your Business
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Tell your story! Why should customers choose you?
        </p>

        {/* Completion Progress Indicator */}
        {!aboutUs && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            border: '2px solid #3B82F6',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '32px',
              flexShrink: 0
            }}>⚡</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#1E40AF',
                marginBottom: '4px'
              }}>
                Complete Your Store Profile
              </div>
              <div style={{
                fontSize: '13px',
                color: '#1E40AF',
                lineHeight: 1.5
              }}>
                Add your business story to unlock smarter AI responses for customers! 🤖
              </div>
            </div>
          </div>
        )}

        {/* Benefits Section - Why Tell Your Story */}
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
          borderRadius: '12px',
          border: '1px solid #10B981'
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '15px',
            fontWeight: 700,
            color: '#065F46',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '20px' }}>💡</span>
            Why Tell Your Story?
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px', marginTop: '2px' }}>✅</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Build Trust</div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                  67% more likely to buy from stores with an "About Us"
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px', marginTop: '2px' }}>🤖</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Smart AI Assistant</div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                  AI can answer customer questions about delivery, hours, policies
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px', marginTop: '2px' }}>🎯</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Stand Out</div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                  Show what makes you different from competitors
                </div>
              </div>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px', marginTop: '2px' }}>❤️</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#065F46' }}>Build Loyalty</div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: 1.4 }}>
                  Emotional connection = repeat customers
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Writing Guide - Collapsible */}
        <details style={{
          marginBottom: '20px',
          border: '2px solid #E5E7EB',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <summary style={{
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: '14px',
            color: '#10B981',
            padding: '14px 16px',
            background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #DCFCE7 0%, #BBF7D0 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)';
          }}>
            <span style={{ fontSize: '18px' }}>📝</span>
            <span>Writing Guide - What Should I Include?</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', opacity: 0.7 }}>(Click to expand)</span>
          </summary>

          <div style={{
            padding: '20px',
            background: '#FAFAFA',
            fontSize: '13px',
            lineHeight: '1.6'
          }}>
            <div style={{
              marginBottom: '16px',
              padding: '12px',
              background: '#EFF6FF',
              borderLeft: '4px solid #3B82F6',
              borderRadius: '6px',
              fontSize: '12px'
            }}>
              <strong style={{ color: '#1E40AF' }}>💡 Pro Tip:</strong> The more details you add, the better your AI assistant can help customers 24/7!
            </div>

            {/* Section 1: Your Story */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>📖</span>
                <span>YOUR STORY</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(30-50 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> How long in business, your mission, expertise
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "Serving Lagos families since 2015 with quality products and excellent service..."
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "How long have you been in business?" "Tell me about your store"</span>
                </div>
              </div>
            </div>

            {/* Section 2: Delivery & Location */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>📍</span>
                <span>DELIVERY & LOCATION</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(20-40 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> Areas you serve, delivery time, shipping info
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "We deliver to Victoria Island, Lekki, Ikoyi. Same-day delivery on orders before 2pm."
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "Do you deliver to Lekki?" "How long is delivery?"</span>
                </div>
              </div>
            </div>

            {/* Section 3: Business Hours */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>⏰</span>
                <span>BUSINESS HOURS</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(10-20 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> Days and times you're open
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "Monday-Saturday 8am-8pm, Sunday by appointment only"
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "Are you open on Sunday?" "What time do you close?"</span>
                </div>
              </div>
            </div>

            {/* Section 4: Payment Options */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>💳</span>
                <span>PAYMENT OPTIONS</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(10-20 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> All payment methods you accept
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "OPay, Moniepoint, Bank Transfer (GTBank, Access), Cash on Delivery"
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "How can I pay?" "Do you accept OPay?"</span>
                </div>
              </div>
            </div>

            {/* Section 5: What Makes You Special */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>🎯</span>
                <span>WHAT MAKES YOU SPECIAL</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(30-50 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> Quality guarantees, unique service, expertise
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "100% genuine products, expert staff with 10+ years experience, 30-day returns"
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "Why should I choose you?" "Are your products genuine?"</span>
                </div>
              </div>
            </div>

            {/* Section 6: Contact Info */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
                fontWeight: 700,
                color: '#1F2937',
                fontSize: '14px'
              }}>
                <span>📱</span>
                <span>CONTACT INFO</span>
                <span style={{ fontSize: '11px', fontWeight: 400, color: '#6B7280' }}>(Optional - 10 words)</span>
              </div>
              <div style={{ paddingLeft: '24px', color: '#4B5563' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>What to write:</strong> WhatsApp, phone, email (if different from settings)
                </div>
                <div style={{ marginBottom: '6px', fontStyle: 'italic', color: '#059669' }}>
                  Example: "WhatsApp: 0803... for urgent orders"
                </div>
                <div style={{ fontSize: '12px', color: '#0284C7', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>🤖</span>
                  <span>AI can answer: "How do I contact you?" "What's your WhatsApp?"</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: 'white',
              border: '2px solid #10B981',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: '4px' }}>
                📊 Target Length: 110-180 words (750-1000 characters)
              </div>
              <div style={{ fontSize: '12px', color: '#047857' }}>
                This gives your AI assistant enough context to help customers 24/7!
              </div>
            </div>
          </div>
        </details>

        {/* Template Buttons */}
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
            Quick Start Templates:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {ABOUT_TEMPLATES.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => setAboutUs(template.content)}
                style={{
                  padding: '8px 14px',
                  background: 'white',
                  border: '2px solid #E5E7EB',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#667eea',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.background = '#F5F7FF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E7EB';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <span>{template.icon}</span>
                <span>{template.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ margin: 0 }}>About Us</label>
            <span style={{
              fontSize: '13px',
              color: countCharacters(aboutUs) > 1000 ? '#DC2626' : '#6B7280',
              fontWeight: 600,
            }}>
              {countCharacters(aboutUs)}/1000
            </span>
          </div>
          <textarea
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
            placeholder="Tell customers about your business, your experience, what makes you special..."
            rows={8}
            maxLength={1000}
            style={{
              borderColor: countCharacters(aboutUs) > 1000 ? '#DC2626' : '#D1D5DB',
            }}
          />
          {countCharacters(aboutUs) > 1000 && (
            <p style={{ fontSize: '13px', color: '#DC2626', marginTop: '6px' }}>
              Please keep your description under 1000 characters (about 150 words) for best results
            </p>
          )}

          {/* Helpful tip about chat widget */}
          <div style={{
            marginTop: '12px',
            padding: '12px 16px',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            display: 'flex',
            gap: '10px'
          }}>
            <span style={{ fontSize: '16px', flexShrink: 0 }}>💡</span>
            <p style={{
              margin: 0,
              fontSize: '0.875rem',
              color: '#1E40AF',
              lineHeight: '1.5'
            }}>
              <strong>Tip:</strong> The more detailed and rich your "About" section is, the better our AI chat widget can assist customers with questions about your business, products, shipping, and policies.
            </p>
          </div>
        </div>
      </div>

      {/* ========== RETURN POLICY SECTION ========== */}
      <div style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔄 Return & Refund Policy
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Set clear expectations about returns and refunds to build customer confidence.
        </p>

        <div className="form-group">
          <label>Return Policy</label>
          <textarea
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            placeholder="e.g., 7-day return policy for unopened items. Exchanges only. No refunds on sale items..."
            rows={4}
          />
        </div>
      </div>

      {/* Logo Upload - Enhanced Circular Design */}
      <div className="form-group" style={cleanCardStyle}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.25rem',
          color: '#202223',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📸 Store Logo
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '0.875rem',
          color: '#6B7280',
          lineHeight: 1.6
        }}>
          Upload a logo to make your store look professional. Max file size: 2MB
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Circular Logo Preview */}
          <div style={{
            width: '150px',
            height: '150px',
            borderRadius: '50%',
            border: '3px solid #E5E7EB',
            overflow: 'hidden',
            background: logoPreview ? 'transparent' : '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {logoPreview ? (
              <img
                src={logoPreview}
                alt="Store logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#9CA3AF',
              }}>
                <Camera size={40} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>No Logo</span>
              </div>
            )}
          </div>

          {/* Upload/Remove Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              id="logo-input"
              hidden
            />
            <label
              htmlFor="logo-input"
              style={{
                padding: '10px 20px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              {logoPreview ? 'Change Logo' : 'Choose Image'}
            </label>

            {logoPreview && (
              <button
                type="button"
                onClick={() => {
                  setLogoPreview('');
                  setLogoFile(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: 'white',
                  color: '#DC2626',
                  border: '2px solid #DC2626',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#FEE2E2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                }}
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Make Items Public Button */}
      <div className="form-group">
        <button
          onClick={handleMakeItemsPublic}
          disabled={loading}
          className="btn btn-secondary"
          style={{ width: '100%', marginBottom: '1rem' }}
        >
          <Eye size={18} />
          {loading ? 'Processing...' : 'Make All Items Public'}
        </button>
        <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
          Click this once to make your existing items visible on the storefront. New items will be private by default.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading || slugAvailable === false || !businessName || !storeSlug}
        className="btn btn-primary"
      >
        {loading ? <><Loader className="spin" /> Saving...</> : 'Save Settings'}
      </button>

      {/* WhatsApp Share */}
      {storeProfile?.storeSlug && (
        <button
          onClick={() => {
            const message = `Check out my store: ${storeUrl}\n\nOrder on WhatsApp: ${whatsappNumber}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
          }}
          className="btn btn-whatsapp"
        >
          <Share2 size={16} />
          Share Store on WhatsApp
        </button>
      )}
    </div>
  );
};
