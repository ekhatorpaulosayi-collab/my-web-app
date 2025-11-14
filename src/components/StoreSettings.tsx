import React, { useState, useEffect } from 'react';
import { doc, getDoc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { uploadStoreLogo } from '../utils/imageUpload';
import { makeAllItemsPublic } from '../utils/makeItemsPublic';
import { Share2, Camera, Link, Loader, Check, X, Eye } from 'lucide-react';
import type { StoreProfile } from '../types';
import '../styles/store-settings.css';

export const StoreSettings: React.FC = () => {
  const { currentUser: user } = useAuth();
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

  // Load existing store profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const docRef = doc(db, 'stores', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as StoreProfile;
        setStoreProfile(data);
        setStoreSlug(data.storeSlug || '');
        setBusinessName(data.businessName || '');
        setWhatsappNumber(data.whatsappNumber || '');
        setAddress(data.address || '');
        if (data.logoUrl) setLogoPreview(data.logoUrl);

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
      }
    };

    loadProfile();
  }, [user]);

  // Check slug availability
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
      const slugDoc = await getDoc(doc(db, 'slugs', normalized));
      const available = !slugDoc.exists() || slugDoc.data()?.ownerId === user?.uid;
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

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Save store settings with transaction
  const handleSave = async () => {
    if (!user) return;

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

      // Transaction to atomically claim slug and update store
      await runTransaction(db, async (transaction) => {
        const slugRef = doc(db, 'slugs', normalizedSlug);
        const storeRef = doc(db, 'stores', user.uid);

        // Check slug ownership
        const slugSnap = await transaction.get(slugRef);
        if (slugSnap.exists() && slugSnap.data().ownerId !== user.uid) {
          throw new Error('This store URL is already taken');
        }

        // Claim/update slug ownership
        transaction.set(slugRef, {
          ownerId: user.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update store profile
        const profileData = {
          businessName: businessName.trim(),
          storeSlug: normalizedSlug,
          logoUrl: logoUrl || '',
          whatsappNumber: whatsappNumber.trim(),
          address: address.trim(),
          ownerId: user.uid,
          isPublic: true,
          updatedAt: serverTimestamp(),
          createdAt: storeProfile?.createdAt || serverTimestamp(),
          // Payment details
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
          acceptedPaymentMethods: paymentMethods,
          paymentInstructions: paymentInstructions.trim(),
          // Paystack integration
          paystackEnabled: paystackEnabled,
          paystackPublicKey: paystackPublicKey.trim(),
          paystackTestMode: paystackTestMode,
          // Delivery information
          deliveryAreas: deliveryAreas,
          deliveryFee: deliveryFee.trim(),
          deliveryTime: deliveryTime.trim(),
          minimumOrder: minimumOrder.trim(),
          // Business hours
          businessHours: businessHours.trim(),
          daysOfOperation: daysOfOperation,
          // Social media
          instagramUrl: instagramUrl.trim(),
          facebookUrl: facebookUrl.trim(),
          tiktokUrl: tiktokUrl.trim(),
          twitterUrl: twitterUrl.trim(),
          // About & Policies
          aboutUs: aboutUs.trim(),
          returnPolicy: returnPolicy.trim()
        };

        transaction.set(storeRef, profileData, { merge: true });
      });

      alert('Store settings saved successfully!');

      // Reload profile to get server timestamps
      const updatedDoc = await getDoc(doc(db, 'stores', user.uid));
      if (updatedDoc.exists()) {
        setStoreProfile(updatedDoc.data() as StoreProfile);
      }

    } catch (error: any) {
      console.error('Error saving:', error);

      // Provide helpful error messages
      let errorMessage = 'Failed to save settings';

      if (error.message?.includes('permission')) {
        errorMessage = '⚠️ Permission Error\n\nPlease make sure you are logged in and have access to save settings.\n\nTry logging out and back in if the problem persists.';
      } else if (error.message?.includes('taken')) {
        errorMessage = '❌ This store URL is already taken.\n\nPlease choose a different URL.';
      } else if (error.message) {
        errorMessage = `❌ Error:\n\n${error.message}`;
      }

      alert(errorMessage);
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
      alert('Failed to update items. Please try again.');
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

        {/* Bank Name */}
        <div className="form-group">
          <label>Bank Name</label>
          <input
            type="text"
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="e.g., GTBank, Access Bank, Zenith Bank"
          />
        </div>

        {/* Account Number */}
        <div className="form-group">
          <label>Account Number</label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder="0123456789"
            maxLength={10}
          />
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

        {/* Days of Operation */}
        <div className="form-group">
          <label>Days of Operation</label>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.75rem' }}>
            Select the days you're open:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label
                key={day}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: daysOfOperation.includes(day) ? '#8b5cf6' : 'white',
                  color: daysOfOperation.includes(day) ? 'white' : '#1e293b',
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
                  checked={daysOfOperation.includes(day)}
                  onChange={() => toggleDay(day)}
                  style={{ margin: 0, cursor: 'pointer' }}
                />
                {day}
              </label>
            ))}
          </div>
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

        <div className="form-group">
          <label>Instagram URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourbusiness"
          />
        </div>

        <div className="form-group">
          <label>Facebook URL</label>
          <input
            type="url"
            value={facebookUrl}
            onChange={(e) => setFacebookUrl(e.target.value)}
            placeholder="https://facebook.com/yourbusiness"
          />
        </div>

        <div className="form-group">
          <label>TikTok URL (Optional)</label>
          <input
            type="url"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@yourbusiness"
          />
        </div>

        <div className="form-group">
          <label>Twitter/X URL (Optional)</label>
          <input
            type="url"
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://twitter.com/yourbusiness"
          />
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

        <div className="form-group">
          <label>About Us</label>
          <textarea
            value={aboutUs}
            onChange={(e) => setAboutUs(e.target.value)}
            placeholder="Tell customers about your business, your experience, what makes you special..."
            rows={5}
          />
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

      {/* Logo Upload */}
      <div className="form-group">
        <label>Store Logo</label>
        <div className="logo-upload-container">
          <div className="logo-preview">
            {logoPreview ? (
              <img src={logoPreview} alt="Store logo" />
            ) : (
              <div className="logo-placeholder">
                <Camera size={40} />
                <span>Add Logo</span>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleLogoChange}
            id="logo-input"
            hidden
          />
          <label htmlFor="logo-input" className="btn btn-secondary">
            Choose Image
          </label>
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
