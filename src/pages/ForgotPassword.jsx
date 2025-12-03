import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import '../styles/Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setMessage('');
      setError('');
      setLoading(true);

      console.debug('[ForgotPassword] Sending reset email to:', email);

      // Use Supabase password reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (resetError) {
        throw resetError;
      }

      console.debug('[ForgotPassword] Reset email sent successfully');

      setMessage('Check your email for password reset link. It may take a few minutes to arrive.');
      setEmail('');
    } catch (error) {
      console.error('[ForgotPassword] Password reset error:', error);

      if (error.message?.includes('User not found')) {
        setError('No account found with this email. Want to sign up instead?');
      } else if (error.message?.includes('Invalid email')) {
        setError('Please enter a valid email address');
      } else if (error.message?.includes('too many')) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Reset Your Password</h1>
          <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="auth-success" role="status">
            <span className="success-icon">✓</span>
            <span>{message}</span>
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="you@example.com"
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <div className="forgot-password-links">
            <Link to="/login" className="auth-link">
              ← Back to Login
            </Link>
            <Link to="/signup" className="auth-link">
              Don't have an account? Sign up
            </Link>
          </div>
        </div>
      </div>

      <footer className="auth-page-footer">
        <p>⚡ Powered by Storehouse</p>
      </footer>
    </div>
  );
}
