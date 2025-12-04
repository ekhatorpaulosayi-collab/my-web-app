import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// MIGRATION: Using Supabase auth
import { signIn } from '../lib/authService-supabase';
import { logLoginAttempt, logError, trackPageView } from '../utils/errorMonitoring';
import '../styles/Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track page view for error monitoring
  useEffect(() => {
    trackPageView('Login');
  }, []);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user types
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }

    if (!formData.password) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      console.debug('[Login] Attempting sign in:', formData.email);

      await signIn(formData.email, formData.password);

      console.debug('[Login] Sign in successful, redirecting to dashboard');

      // Log successful login
      logLoginAttempt(formData.email, true);

      navigate('/');
    } catch (err) {
      console.error('[Login] Sign in failed:', err);

      // Log failed login attempt
      logLoginAttempt(formData.email, false, err);

      // Log error for monitoring
      logError(err, 'auth', 'high', {
        email: formData.email,
        page: 'Login',
        action: 'signIn',
      });

      // User-friendly error messages
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Forgot your password?');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Want to sign up?');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Try again later or reset your password.');
      } else {
        setError(err.message || 'Failed to log in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 10px' }}>
          <img
            src="/storehouse-logo-blue.png"
            alt="Storehouse"
            style={{ height: '128px', width: 'auto', marginBottom: '1rem', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>
        <div className="auth-header">
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your store</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="you@example.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Password
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
              disabled={loading}
            />
          </div>

          <div className="forgot-password-link">
            <Link to="/forgot-password" className="auth-link-small">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/signup" className="auth-link">
              Create one
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
