/**
 * Dashboard Customization Page
 * Allows users to customize their dashboard widgets
 */

import React, { useState } from 'react';
import { usePreferences } from '../contexts/PreferencesContext';
import { WIDGETS, WIDGET_CATEGORIES, BUSINESS_PRESETS, WidgetId } from '../constants/widgets';
import './DashboardCustomize.css';

interface DashboardCustomizeProps {
  onClose: () => void;
}

export function DashboardCustomize({ onClose }: DashboardCustomizeProps) {
  const {
    activeWidgets,
    toggleWidget,
    businessType,
    setBusinessType,
    ownerPIN,
    setOwnerPIN,
    logoutOwner,
    resetToDefaults
  } = usePreferences();

  const [showPINSetup, setShowPINSetup] = useState(false);
  const [newPIN, setNewPIN] = useState('');
  const [confirmPIN, setConfirmPIN] = useState('');
  const [pinError, setPinError] = useState('');

  const handleToggleWidget = (widgetId: WidgetId) => {
    toggleWidget(widgetId);
  };

  const handleBusinessTypeChange = (type: string) => {
    setBusinessType(type as any);
  };

  const handleSavePIN = () => {
    if (newPIN.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    if (newPIN !== confirmPIN) {
      setPinError('PINs do not match');
      return;
    }

    setOwnerPIN(newPIN);
    setShowPINSetup(false);
    setNewPIN('');
    setConfirmPIN('');
    setPinError('');
  };

  const handleRemovePIN = () => {
    if (confirm('Remove Owner PIN? Sensitive widgets will be visible to everyone.')) {
      setOwnerPIN('');
      logoutOwner();
    }
  };

  const handleReset = () => {
    if (confirm('Reset all dashboard settings to default? This cannot be undone.')) {
      resetToDefaults();
      onClose();
    }
  };

  // Group widgets by category
  const widgetsByCategory = Object.values(WIDGETS).reduce((acc, widget) => {
    if (!acc[widget.category]) {
      acc[widget.category] = [];
    }
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, typeof WIDGETS[keyof typeof WIDGETS][]>);

  return (
    <div className="customize-overlay" onClick={onClose}>
      <div className="customize-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="customize-header">
          <h2>⚙️ Customize Dashboard</h2>
          <button
            type="button"
            className="customize-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="customize-body">
          {/* Business Type */}
          <section className="customize-section">
            <h3 className="customize-section-title">Business Type</h3>
            <p className="customize-section-desc">
              Choose a preset to auto-configure relevant widgets
            </p>
            <div className="business-type-grid">
              {Object.entries(BUSINESS_PRESETS).map(([type, preset]) => (
                <button
                  key={type}
                  type="button"
                  className={`business-type-card ${businessType === type ? 'business-type-card-active' : ''}`}
                  onClick={() => handleBusinessTypeChange(type)}
                >
                  <span className="business-type-icon">{preset.icon}</span>
                  <span className="business-type-name">{preset.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Widgets */}
          <section className="customize-section">
            <h3 className="customize-section-title">Active Widgets</h3>
            <p className="customize-section-desc">
              Select which widgets to display on your dashboard
            </p>

            {Object.entries(widgetsByCategory).map(([category, widgets]) => (
              <div key={category} className="widget-category">
                <div className="widget-category-header">
                  <span className="widget-category-icon">
                    {WIDGET_CATEGORIES[category as keyof typeof WIDGET_CATEGORIES]?.icon}
                  </span>
                  <span className="widget-category-name">
                    {WIDGET_CATEGORIES[category as keyof typeof WIDGET_CATEGORIES]?.name}
                  </span>
                </div>

                <div className="widget-toggles">
                  {widgets.map(widget => (
                    <label key={widget.id} className="widget-toggle">
                      <input
                        type="checkbox"
                        checked={activeWidgets.includes(widget.id)}
                        onChange={() => handleToggleWidget(widget.id)}
                      />
                      <span className="widget-toggle-label">
                        <span className="widget-toggle-icon">{widget.icon}</span>
                        <span className="widget-toggle-text">
                          <span className="widget-toggle-name">{widget.name}</span>
                          {widget.requiresOwnerAccess && (
                            <span className="widget-toggle-badge">🔒 Owner</span>
                          )}
                        </span>
                      </span>
                      <span className="widget-toggle-switch"></span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Owner PIN */}
          <section className="customize-section">
            <h3 className="customize-section-title">Owner PIN</h3>
            <p className="customize-section-desc">
              Protect sensitive business data with a PIN
            </p>

            {ownerPIN ? (
              <div className="pin-status">
                <div className="pin-status-active">
                  <span>🔒 PIN is set</span>
                  <button
                    type="button"
                    className="customize-btn customize-btn-danger-outline"
                    onClick={handleRemovePIN}
                  >
                    Remove PIN
                  </button>
                </div>
              </div>
            ) : (
              <div className="pin-status">
                {showPINSetup ? (
                  <div className="pin-setup">
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={newPIN}
                      onChange={(e) => {
                        setNewPIN(e.target.value.replace(/\D/g, ''));
                        setPinError('');
                      }}
                      placeholder="Enter PIN (4-6 digits)"
                      className="pin-setup-input"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={confirmPIN}
                      onChange={(e) => {
                        setConfirmPIN(e.target.value.replace(/\D/g, ''));
                        setPinError('');
                      }}
                      placeholder="Confirm PIN"
                      className="pin-setup-input"
                    />
                    {pinError && <div className="pin-setup-error">{pinError}</div>}
                    <div className="pin-setup-actions">
                      <button
                        type="button"
                        className="customize-btn customize-btn-secondary"
                        onClick={() => {
                          setShowPINSetup(false);
                          setNewPIN('');
                          setConfirmPIN('');
                          setPinError('');
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="customize-btn customize-btn-primary"
                        onClick={handleSavePIN}
                        disabled={!newPIN || !confirmPIN}
                      >
                        Save PIN
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="customize-btn customize-btn-secondary"
                    onClick={() => setShowPINSetup(true)}
                  >
                    Set Owner PIN
                  </button>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="customize-footer">
          <button
            type="button"
            className="customize-btn customize-btn-danger"
            onClick={handleReset}
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            className="customize-btn customize-btn-primary customize-btn-large"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
