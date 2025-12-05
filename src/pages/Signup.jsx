import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// MIGRATION: Using Supabase auth
import { signUp } from '../lib/authService-supabase';
import { validateReferralCode, claimReferralCode } from '../services/referralService';
import '../styles/Auth.css';

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    storeName: '',
    email: '',
    password: '',
    referralCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [referralCodeValid, setReferralCodeValid] = useState(null);
  const [validatingReferral, setValidatingReferral] = useState(false);

  // Check for referral code in URL on mount
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setFormData(prev => ({ ...prev, referralCode: refCode.toUpperCase() }));
      // Validate the code from URL
      validateReferralCodeAsync(refCode);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  // Validate referral code with debounce
  const validateReferralCodeAsync = async (code) => {
    if (!code || code.trim().length < 3) {
      setReferralCodeValid(null);
      return;
    }

    setValidatingReferral(true);
    try {
      const isValid = await validateReferralCode(code);
      setReferralCodeValid(isValid);
    } catch (error) {
      console.error('Error validating referral code:', error);
      setReferralCodeValid(false);
    } finally {
      setValidatingReferral(false);
    }
  };

  const handleReferralCodeChange = (e) => {
    const value = e.target.value.toUpperCase();
    setFormData(prev => ({ ...prev, referralCode: value }));
    setReferralCodeValid(null);

    // Debounce validation
    if (value.trim().length >= 3) {
      const timer = setTimeout(() => {
        validateReferralCodeAsync(value);
      }, 500);
      return () => clearTimeout(timer);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Trim and normalize inputs
    const storeName = formData.storeName.trim();
    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    // Validation
    if (!storeName) {
      setError('Please enter your store name');
      return;
    }

    if (!email) {
      setError('Please enter your email');
      return;
    }

    // Basic email validation (more lenient than HTML5)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address (e.g., you@example.com)');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      console.debug('[Signup] Attempting signup:', email);

      const result = await signUp(email, password, storeName);

      console.debug('[Signup] Signup successful');

      // If referral code provided, claim it
      if (formData.referralCode && referralCodeValid && result.user) {
        try {
          await claimReferralCode(
            formData.referralCode,
            result.user.uid,
            email,
            storeName
          );
          console.debug('[Signup] Referral code claimed successfully');
        } catch (refError) {
          console.error('[Signup] Failed to claim referral code:', refError);
          // Don't block signup if referral fails
        }
      }

      // Check if email confirmation is needed
      if (result.needsEmailConfirmation) {
        console.debug('[Signup] Email confirmation required');
        setNeedsEmailConfirmation(true);
        setSuccess(true);
      } else {
        console.debug('[Signup] Redirecting to dashboard');
        navigate('/');
      }
    } catch (err) {
      console.error('[Signup] Signup failed:', err);

      // User-friendly error messages
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Want to log in instead?');
      } else if (err.message?.includes('Invalid email')) {
        setError('Please enter a valid email address');
      } else if (err.message?.includes('6 characters')) {
        setError('Password should be at least 6 characters');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show success message if email confirmation is needed
  if (success && needsEmailConfirmation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">Check Your Email</h1>
            <p className="auth-subtitle">We sent you a confirmation link</p>
          </div>

          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '2px solid #60a5fa'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '3rem' }}>📧</span>
            </div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: 600,
              color: '#1e40af',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              Confirm your email address
            </h3>
            <p style={{
              color: '#1e40af',
              lineHeight: 1.6,
              fontSize: '0.95rem',
              textAlign: 'center'
            }}>
              We sent a confirmation email to <strong>{formData.email}</strong>
              <br /><br />
              Click the link in the email to activate your account, then come back here to log in.
            </p>
          </div>

          <div className="auth-footer">
            <p>
              Didn't receive the email?{' '}
              <button
                onClick={() => {
                  setSuccess(false);
                  setNeedsEmailConfirmation(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  font: 'inherit'
                }}
              >
                Try again
              </button>
            </p>
            <p style={{ marginTop: '0.5rem' }}>
              Already confirmed?{' '}
              <Link to="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <footer className="auth-page-footer">
          <p>⚡ Powered by Storehouse</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 10px' }}>
          <img
            src="/storehouse-logo-new.png"
            alt="Storehouse"
            style={{ height: '128px', width: 'auto', marginBottom: '1rem', maxWidth: '100%', objectFit: 'contain', mixBlendMode: 'multiply' }}
          />
        </div>
        <div className="auth-header">
          <h1 className="auth-title">Create Your Store</h1>
          <p className="auth-subtitle">Start managing your inventory today</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="storeName" className="form-label">
              Store Name *
            </label>
            <input
              id="storeName"
              name="storeName"
              type="text"
              value={formData.storeName}
              onChange={handleChange}
              className="form-input"
              placeholder="My Amazing Store"
              required
              maxLength={50}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address *
            </label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="••••••••"
              required
              minLength={6}
              disabled={loading}
            />
            <p className="form-hint">Minimum 6 characters</p>
          </div>

          <div className="form-group">
            <label htmlFor="referralCode" className="form-label">
              Referral Code (Optional)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="referralCode"
                name="referralCode"
                type="text"
                value={formData.referralCode}
                onChange={handleReferralCodeChange}
                className="form-input"
                placeholder="Enter code from a friend"
                disabled={loading}
                maxLength={20}
                style={{
                  paddingRight: '40px',
                  ...(referralCodeValid === true && {
                    borderColor: '#10b981',
                    background: '#f0fdf4'
                  }),
                  ...(referralCodeValid === false && {
                    borderColor: '#ef4444',
                    background: '#fef2f2'
                  })
                }}
              />
              {validatingReferral && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '14px'
                }}>
                  ⏳
                </span>
              )}
              {!validatingReferral && referralCodeValid === true && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#10b981'
                }}>
                  ✓
                </span>
              )}
              {!validatingReferral && referralCodeValid === false && formData.referralCode.length >= 3 && (
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  color: '#ef4444'
                }}>
                  ✗
                </span>
              )}
            </div>
            {referralCodeValid === true && (
              <p className="form-hint" style={{ color: '#10b981', marginTop: '6px' }}>
                ✓ Valid code! You'll both earn rewards
              </p>
            )}
            {referralCodeValid === false && formData.referralCode.length >= 3 && (
              <p className="form-hint" style={{ color: '#ef4444', marginTop: '6px' }}>
                Invalid referral code
              </p>
            )}
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <footer className="auth-page-footer">
        <p>⚡ Powered by Storehouse</p>
      </footer>
    </div>
  );
}
