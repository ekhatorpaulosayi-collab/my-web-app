import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { generateStoreSlug, checkSlugAvailability } from '../utils/storeSlug';
import { isValidNigerianPhone, formatPhoneDisplay, formatPhoneForWhatsApp } from '../utils/whatsapp';
import { useUser, useStoreActions } from '../lib/supabase-hooks';
import type { StoreProfile } from '../types';

/**
 * StoreQuickSetup - Minimal 3-field store creation
 *
 * Get stores live in 30 seconds with just:
 * 1. Business Name
 * 2. WhatsApp Number
 * 3. Store URL (auto-generated with validation)
 */
export default function StoreQuickSetup() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Get Supabase user (converts Firebase UID to Supabase UUID)
  const { user: supabaseUser, loading: userLoading } = useUser(currentUser);
  const { createStore } = useStoreActions(supabaseUser?.id);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [storeSlug, setStoreSlug] = useState('');

  // Validation state
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugSuggestion, setSugSuggestion] = useState('');
  const [whatsappError, setWhatsappError] = useState('');

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Auto-generate slug from business name
  useEffect(() => {
    if (businessName.trim()) {
      const generated = generateStoreSlug(businessName);
      setStoreSlug(generated);
    } else {
      setStoreSlug('');
      setSlugStatus('idle');
    }
  }, [businessName]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!storeSlug || storeSlug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');

    const timeoutId = setTimeout(async () => {
      try {
        const isAvailable = await checkSlugAvailability(storeSlug);

        if (isAvailable) {
          setSlugStatus('available');
          setSugSuggestion('');
        } else {
          setSlugStatus('taken');
          // Generate suggestions
          const timestamp = Date.now().toString().slice(-4);
          setSugSuggestion(`${storeSlug}-${timestamp}`);
        }
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugStatus('idle');
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [storeSlug]);

  // Handle WhatsApp number input with auto-formatting
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Remove all non-digits
    const digits = input.replace(/\D/g, '');

    // Limit to 11 digits
    const limited = digits.slice(0, 11);

    // Format for display
    const formatted = formatPhoneDisplay(limited);
    setWhatsappNumber(formatted);

    // Validate
    if (limited.length > 0 && !isValidNigerianPhone(limited)) {
      setWhatsappError('Invalid Nigerian phone number');
    } else {
      setWhatsappError('');
    }
  };

  // Check if form is valid
  const isFormValid =
    businessName.trim().length > 0 &&
    slugStatus === 'available' &&
    isValidNigerianPhone(whatsappNumber) &&
    !isSubmitting &&
    !userLoading &&
    !!supabaseUser;

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !currentUser || !supabaseUser) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      // Create store with Supabase (snake_case fields)
      await createStore({
        business_name: businessName.trim(),
        store_slug: storeSlug,
        whatsapp_number: formatPhoneForWhatsApp(whatsappNumber),
        is_public: false, // Default to private, user can make public later
      });

      // Navigate to setup complete page
      navigate('/setup-complete', { replace: true });
    } catch (error) {
      console.error('Error creating store:', error);
      setSubmitError('Failed to create store. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '500px',
      }}>
        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '40px',
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px',
          }}>
            Create Your Store in 30 Seconds
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6B7280',
          }}>
            Just the essentials. Everything else is optional.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: '#ffffff',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          {/* Business Name */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              Business Name <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name"
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                outline: 'none',
                transition: 'all 0.2s',
                minHeight: '44px',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* WhatsApp Number */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              WhatsApp Number <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '20px',
              }}>
                💬
              </span>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={handleWhatsAppChange}
                placeholder="0801 234 5678"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 48px',
                  fontSize: '16px',
                  border: `1px solid ${whatsappError ? '#DC2626' : '#D1D5DB'}`,
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  minHeight: '44px',
                }}
                onFocus={(e) => {
                  if (!whatsappError) {
                    e.target.style.borderColor = '#25D366';
                    e.target.style.boxShadow = '0 0 0 3px rgba(37, 211, 102, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = whatsappError ? '#DC2626' : '#D1D5DB';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {whatsappError && (
              <p style={{
                fontSize: '13px',
                color: '#DC2626',
                marginTop: '6px',
              }}>
                {whatsappError}
              </p>
            )}
          </div>

          {/* Store URL */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '8px',
            }}>
              Store URL <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: `1px solid ${slugStatus === 'taken' ? '#DC2626' : '#D1D5DB'}`,
              borderRadius: '8px',
              padding: '12px 16px',
              background: '#F9FAFB',
              minHeight: '44px',
            }}>
              <span style={{
                fontSize: '16px',
                color: '#6B7280',
                whiteSpace: 'nowrap',
              }}>
                storehouse.app/
              </span>
              <input
                type="text"
                value={storeSlug}
                onChange={(e) => setStoreSlug(generateStoreSlug(e.target.value))}
                placeholder="your-store"
                required
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '16px',
                  color: '#111827',
                  padding: '0 0 0 4px',
                }}
              />
            </div>

            {/* Slug Status */}
            <div style={{ marginTop: '8px', minHeight: '20px' }}>
              {slugStatus === 'checking' && (
                <p style={{ fontSize: '13px', color: '#6B7280', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                  Checking availability...
                </p>
              )}
              {slugStatus === 'available' && (
                <p style={{ fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  ✅ Available!
                </p>
              )}
              {slugStatus === 'taken' && (
                <p style={{ fontSize: '13px', color: '#DC2626' }}>
                  ❌ Already taken. Try:{' '}
                  <button
                    type="button"
                    onClick={() => setStoreSlug(slugSuggestion)}
                    style={{
                      color: '#667eea',
                      textDecoration: 'underline',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    {slugSuggestion}
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div style={{
              padding: '12px 16px',
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              marginBottom: '24px',
            }}>
              <p style={{ fontSize: '14px', color: '#991B1B', margin: 0 }}>
                {submitError}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!isFormValid}
            style={{
              width: '100%',
              padding: '14px 24px',
              fontSize: '16px',
              fontWeight: '600',
              color: '#ffffff',
              background: isFormValid ? '#667eea' : '#D1D5DB',
              border: 'none',
              borderRadius: '8px',
              cursor: isFormValid ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              minHeight: '44px',
            }}
            onMouseEnter={(e) => {
              if (isFormValid) {
                e.currentTarget.style.background = '#5568d3';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (isFormValid) {
                e.currentTarget.style.background = '#667eea';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {isSubmitting ? 'Creating Store...' : 'Create Store'}
          </button>

          <p style={{
            textAlign: 'center',
            fontSize: '14px',
            color: '#6B7280',
            marginTop: '16px',
            marginBottom: 0,
          }}>
            Everything else is optional
          </p>
        </form>
      </div>

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
