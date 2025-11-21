/**
 * Owner PIN Modal
 * Authentication modal for accessing owner-only widgets
 */

import React, { useState, useEffect, useRef } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import './OwnerPINModal.css';

interface OwnerPINModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function OwnerPINModal({ onClose, onSuccess }: OwnerPINModalProps) {
  const { authenticateOwner, ownerAccess } = usePreferences();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    // Auto-submit when PIN is 4-6 digits
    if (pin.length >= 4 && pin.length <= 6) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsAuthenticating(true);
    setError('');

    // Simulate slight delay for security UX
    await new Promise(resolve => setTimeout(resolve, 300));

    const success = authenticateOwner(pin);

    if (success) {
      onSuccess();
    } else {
      setError('Incorrect PIN. Try again.');
      setPin('');
      setIsAuthenticating(false);
      inputRef.current?.focus();
    }
  };

  const handleChange = (value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '');
    setPin(cleaned);
    setError('');
  };

  // Show time remaining if already authenticated
  if (ownerAccess.isAuthenticated && ownerAccess.expiresAt) {
    const timeRemaining = Math.max(0, ownerAccess.expiresAt - Date.now());
    const minutesRemaining = Math.ceil(timeRemaining / 60000);

    return (
      <div className="owner-pin-overlay" onClick={onClose}>
        <div className="owner-pin-modal" onClick={(e) => e.stopPropagation()}>
          <div className="owner-pin-header">
            <h3>🔓 Owner Access Active</h3>
            <button
              type="button"
              className="owner-pin-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="owner-pin-body">
            <div className="owner-pin-success">
              <div className="success-icon">✓</div>
              <p className="success-text">
                Access granted for {minutesRemaining} minutes
              </p>
            </div>
          </div>
          <div className="owner-pin-footer">
            <button
              type="button"
              className="owner-pin-btn owner-pin-btn-primary"
              onClick={onClose}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="owner-pin-overlay" onClick={onClose}>
      <div className="owner-pin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="owner-pin-header">
          <h3>🔒 Enter Owner PIN</h3>
          <button
            type="button"
            className="owner-pin-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="owner-pin-body">
          <p className="owner-pin-info">
            This widget contains sensitive business information
          </p>

          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="••••"
            className={`owner-pin-input ${error ? 'owner-pin-input-error' : ''}`}
            disabled={isAuthenticating}
          />

          {error && <div className="owner-pin-error">{error}</div>}

          <div className="owner-pin-hint">
            💡 Access granted for 30 minutes
          </div>
        </div>

        <div className="owner-pin-footer">
          <button
            type="button"
            className="owner-pin-btn owner-pin-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="owner-pin-btn owner-pin-btn-primary"
            onClick={handleSubmit}
            disabled={pin.length < 4 || isAuthenticating}
          >
            {isAuthenticating ? 'Verifying...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}
