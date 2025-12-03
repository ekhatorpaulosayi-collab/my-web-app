/**
 * Auth Confirmation Handler
 * Handles email confirmations, password resets, and magic links
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Processing...');

  useEffect(() => {
    handleAuthConfirmation();
  }, []);

  const handleAuthConfirmation = async () => {
    try {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type');
      const next = searchParams.get('next') || '/';

      console.log('[AuthConfirm] Type:', type, 'TokenHash:', tokenHash ? 'present' : 'missing');

      if (!tokenHash) {
        setStatus('error');
        setMessage('Invalid confirmation link. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Handle different auth types
      if (type === 'signup') {
        // Email confirmation for new signups
        setMessage('Confirming your email...');

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'signup',
        });

        if (error) {
          console.error('[AuthConfirm] Signup verification error:', error);
          setStatus('error');
          setMessage(`Verification failed: ${error.message}`);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          console.log('[AuthConfirm] Email verified successfully');
          setStatus('success');
          setMessage('Email verified! Redirecting to your dashboard...');
          setTimeout(() => navigate(next), 2000);
        }
      } else if (type === 'recovery') {
        // Password reset
        setMessage('Verifying password reset link...');

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });

        if (error) {
          console.error('[AuthConfirm] Recovery verification error:', error);
          setStatus('error');
          setMessage(`Password reset failed: ${error.message}`);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          console.log('[AuthConfirm] Password reset verified');
          setStatus('success');
          setMessage('Verification successful! You can now set a new password.');
          // Redirect to password update page
          setTimeout(() => navigate('/update-password'), 2000);
        }
      } else if (type === 'magiclink') {
        // Magic link login
        setMessage('Logging you in...');

        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });

        if (error) {
          console.error('[AuthConfirm] Magic link error:', error);
          setStatus('error');
          setMessage(`Login failed: ${error.message}`);
          setTimeout(() => navigate('/login'), 3000);
        } else {
          console.log('[AuthConfirm] Magic link login successful');
          setStatus('success');
          setMessage('Logged in successfully! Redirecting...');
          setTimeout(() => navigate(next), 2000);
        }
      } else {
        setStatus('error');
        setMessage('Unknown confirmation type.');
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      console.error('[AuthConfirm] Unexpected error:', err);
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
      }}>
        {status === 'loading' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            <h2 style={{ margin: '0 0 10px', color: '#1f2937', fontSize: '20px' }}>
              Processing
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px'
            }}>
              ✓
            </div>
            <h2 style={{ margin: '0 0 10px', color: '#1f2937', fontSize: '20px' }}>
              Success!
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {message}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '50px',
              height: '50px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '30px',
              color: '#fff'
            }}>
              ✕
            </div>
            <h2 style={{ margin: '0 0 10px', color: '#1f2937', fontSize: '20px' }}>
              Error
            </h2>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              {message}
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
