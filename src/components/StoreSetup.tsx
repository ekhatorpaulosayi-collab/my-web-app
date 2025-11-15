import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { checkSlugAvailability, saveStoreSlug } from '../utils/storeSlug';
import '../styles/StoreSetup.css';

interface StoreSetupProps {
  onComplete?: () => void;
}

export default function StoreSetup({ onComplete }: StoreSetupProps) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Form state
  const [logo, setLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // Validation state
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [slugSuggestion, setSlugSuggestion] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const slugCheckTimeout = useRef<NodeJS.Timeout>();

  // Auto-suggest slug based on business name
  useEffect(() => {
    if (businessName && !storeSlug) {
      const suggested = generateSlug(businessName);
      setStoreSlug(suggested);
    }
  }, [businessName]);

  // Check slug availability with debounce
  useEffect(() => {
    if (!storeSlug || storeSlug.length < 3) {
      setSlugStatus('idle');
      return;
    }

    // Clear previous timeout
    if (slugCheckTimeout.current) {
      clearTimeout(slugCheckTimeout.current);
    }

    setSlugStatus('checking');

    // Debounce 500ms
    slugCheckTimeout.current = setTimeout(async () => {
      try {
        const isAvailable = await checkSlugAvailability(storeSlug);
        if (isAvailable) {
          setSlugStatus('available');
          setSlugSuggestion('');
        } else {
          setSlugStatus('taken');
          // Generate alternative suggestions
          const alt1 = `${storeSlug}-${Math.floor(Math.random() * 99) + 1}`;
          const alt2 = `${storeSlug}-shop`;
          setSlugSuggestion(alt1);
        }
      } catch (error) {
        console.error('Error checking slug:', error);
        setSlugStatus('idle');
      }
    }, 500);

    return () => {
      if (slugCheckTimeout.current) {
        clearTimeout(slugCheckTimeout.current);
      }
    };
  }, [storeSlug]);

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, logo: 'Please select an image file' });
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setErrors({ ...errors, logo: 'Image must be less than 2MB' });
      return;
    }

    // Preview the image
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogo(reader.result as string);
      setLogoFile(file);
      setErrors({ ...errors, logo: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cleaned = generateSlug(value);
    setStoreSlug(cleaned);
  };

  const formatWhatsAppNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');

    // Format as: 0801 234 5678
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatWhatsAppNumber(e.target.value);
    setWhatsappNumber(formatted);

    // Validate Nigerian number
    const digits = formatted.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 11) {
      setErrors({ ...errors, whatsapp: 'Please enter a valid 11-digit number' });
    } else if (digits.length === 11 && !digits.startsWith('0')) {
      setErrors({ ...errors, whatsapp: 'Number must start with 0' });
    } else {
      setErrors({ ...errors, whatsapp: '' });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!storeSlug || storeSlug.length < 3) {
      newErrors.storeSlug = 'Store URL must be at least 3 characters';
    } else if (slugStatus === 'taken') {
      newErrors.storeSlug = `This store name is taken. Try: ${slugSuggestion}`;
    }

    const whatsappDigits = whatsappNumber.replace(/\D/g, '');
    if (!whatsappDigits) {
      newErrors.whatsapp = 'WhatsApp number is required';
    } else if (whatsappDigits.length !== 11) {
      newErrors.whatsapp = 'Please enter a valid 11-digit number';
    } else if (!whatsappDigits.startsWith('0')) {
      newErrors.whatsapp = 'Number must start with 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || slugStatus !== 'available') {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert WhatsApp to international format
      const whatsappDigits = whatsappNumber.replace(/\D/g, '');
      const internationalNumber = '+234' + whatsappDigits.substring(1);

      // Save to Firebase (you'll need to implement this)
      const storeData = {
        businessName,
        storeSlug,
        whatsappNumber: internationalNumber,
        logo: logo || null,
        userId: currentUser?.uid,
        createdAt: new Date().toISOString()
      };

      // Save slug
      await saveStoreSlug(storeSlug, currentUser?.uid || '');

      console.log('Store data to save:', storeData);

      // TODO: Save to your Firebase/database here
      // await saveStoreSettings(storeData);

      // Navigate to next step or complete
      if (onComplete) {
        onComplete();
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error saving store:', error);
      setErrors({ submit: 'Failed to save store. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    businessName.trim() &&
    slugStatus === 'available' &&
    whatsappNumber.replace(/\D/g, '').length === 11 &&
    !errors.businessName &&
    !errors.storeSlug &&
    !errors.whatsapp;

  return (
    <div className="store-setup-container">
      <div className="store-setup-card">
        {/* Header */}
        <div className="setup-header">
          <h1 className="setup-title">Create Your Store</h1>
          <p className="setup-subtitle">Step 1 of 2</p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {/* Logo Upload */}
          <div className="form-group">
            <label className="logo-label">Add Logo (Optional)</label>
            <div
              className="logo-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              {logo ? (
                <img src={logo} alt="Store logo" className="logo-preview" />
              ) : (
                <div className="logo-placeholder">
                  <svg className="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="upload-text">Add Photo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden-input"
            />
            {errors.logo && <p className="error-text">{errors.logo}</p>}
          </div>

          {/* Business Name */}
          <div className="form-group">
            <label htmlFor="businessName" className="form-label">Business Name</label>
            <input
              id="businessName"
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your Business Name"
              className="form-input"
              required
            />
            {errors.businessName && <p className="error-text">{errors.businessName}</p>}
          </div>

          {/* Store URL */}
          <div className="form-group">
            <label htmlFor="storeSlug" className="form-label">Choose your store link</label>
            <div className="slug-input-wrapper">
              <span className="slug-prefix">storehouse.app/</span>
              <input
                id="storeSlug"
                type="text"
                value={storeSlug}
                onChange={handleSlugChange}
                placeholder="your-store"
                className="slug-input"
                required
              />
              {storeSlug.length >= 3 && (
                <span className="slug-status">
                  {slugStatus === 'checking' && (
                    <span className="status-checking">⏳</span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="status-available">✅</span>
                  )}
                  {slugStatus === 'taken' && (
                    <span className="status-taken">❌</span>
                  )}
                </span>
              )}
            </div>
            {slugStatus === 'checking' && (
              <p className="info-text">Checking availability...</p>
            )}
            {slugStatus === 'available' && (
              <p className="success-text">Available!</p>
            )}
            {slugStatus === 'taken' && slugSuggestion && (
              <p className="error-text">
                This store name is taken. Try: <button type="button" className="suggestion-btn" onClick={() => setStoreSlug(slugSuggestion)}>{slugSuggestion}</button>
              </p>
            )}
            {errors.storeSlug && <p className="error-text">{errors.storeSlug}</p>}
          </div>

          {/* WhatsApp Number */}
          <div className="form-group">
            <label htmlFor="whatsapp" className="form-label">WhatsApp Number</label>
            <div className="whatsapp-input-wrapper">
              <svg className="whatsapp-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <input
                id="whatsapp"
                type="tel"
                value={whatsappNumber}
                onChange={handleWhatsAppChange}
                placeholder="0801 234 5678"
                className="whatsapp-input"
                maxLength={13}
                required
              />
            </div>
            {errors.whatsapp && <p className="error-text">{errors.whatsapp}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="continue-btn"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <span className="btn-loading">
                <svg className="spinner" viewBox="0 0 24 24">
                  <circle className="spinner-circle" cx="12" cy="12" r="10" fill="none" strokeWidth="3" />
                </svg>
                Saving...
              </span>
            ) : (
              'Continue'
            )}
          </button>

          <p className="helper-text">You can add more details later</p>

          {errors.submit && <p className="error-text center">{errors.submit}</p>}
        </form>
      </div>
    </div>
  );
}
