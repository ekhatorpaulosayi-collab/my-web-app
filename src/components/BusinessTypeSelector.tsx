/**
 * Business Type Selector
 * First-time setup screen for choosing business type
 */

import React, { useState } from 'react';
import { BusinessType, BUSINESS_PRESETS } from '../constants/widgets';
import { usePreferences } from '../contexts/PreferencesContext';
import './BusinessTypeSelector.css';

interface BusinessTypeSelectorProps {
  onComplete: () => void;
}

export function BusinessTypeSelector({ onComplete }: BusinessTypeSelectorProps) {
  const { setBusinessType, setOwnerPIN } = usePreferences();
  const [selectedType, setSelectedType] = useState<BusinessType | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'type' | 'pin'>('type');
  const [error, setError] = useState('');

  const handleSelectType = (type: BusinessType) => {
    setSelectedType(type);
    setError('');
  };

  const handleContinue = () => {
    if (!selectedType) {
      setError('Please select a business type');
      return;
    }
    setBusinessType(selectedType);
    setStep('pin');
  };

  const handleSkipPIN = () => {
    onComplete();
  };

  const handleSetPIN = () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setOwnerPIN(pin);
    onComplete();
  };

  if (step === 'pin') {
    return (
      <div className="business-selector-overlay">
        <div className="business-selector-modal">
          <div className="bts-header">
            <h2>🔐 Set Owner PIN</h2>
            <p className="bts-subtitle">
              Protect sensitive data like costs and profits
            </p>
          </div>

          <div className="bts-pin-section">
            <div className="bts-form-group">
              <label htmlFor="pin">Enter 4-digit PIN</label>
              <input
                type="password"
                id="pin"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="bts-pin-input"
                autoFocus
              />
            </div>

            <div className="bts-form-group">
              <label htmlFor="confirmPin">Confirm PIN</label>
              <input
                type="password"
                id="confirmPin"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value.replace(/\D/g, ''));
                  setError('');
                }}
                placeholder="••••"
                className="bts-pin-input"
              />
            </div>

            {error && <div className="bts-error">{error}</div>}

            <div className="bts-pin-info">
              💡 With a PIN, only you can view:
              <ul>
                <li>Cost prices & profit margins</li>
                <li>Inventory value</li>
                <li>Business expenses</li>
              </ul>
            </div>
          </div>

          <div className="bts-actions">
            <button
              type="button"
              className="bts-btn bts-btn-secondary"
              onClick={handleSkipPIN}
            >
              Skip for Now
            </button>
            <button
              type="button"
              className="bts-btn bts-btn-primary"
              onClick={handleSetPIN}
              disabled={!pin || !confirmPin}
            >
              Set PIN & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="business-selector-overlay">
      <div className="business-selector-modal">
        <div className="bts-header">
          <h1>🏪 Welcome to Storehouse</h1>
          <p className="bts-subtitle">
            Nigeria's #1 Inventory Management App
          </p>
        </div>

        <div className="bts-content">
          <h3>What type of business do you run?</h3>
          <p className="bts-description">
            We'll customize your dashboard with the most relevant widgets
          </p>

          <div className="bts-grid">
            {(Object.entries(BUSINESS_PRESETS) as [BusinessType, typeof BUSINESS_PRESETS[BusinessType]][]).map(([type, preset]) => (
              <button
                key={type}
                type="button"
                className={`bts-card ${selectedType === type ? 'bts-card-selected' : ''}`}
                onClick={() => handleSelectType(type)}
              >
                <div className="bts-card-icon">{preset.icon}</div>
                <div className="bts-card-title">{preset.name}</div>
                <div className="bts-card-desc">{preset.description}</div>
                {selectedType === type && (
                  <div className="bts-card-check">✓</div>
                )}
              </button>
            ))}
          </div>

          {error && <div className="bts-error">{error}</div>}
        </div>

        <div className="bts-actions">
          <button
            type="button"
            className="bts-btn bts-btn-primary bts-btn-large"
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
