import React from 'react';
import { Info } from 'lucide-react';

interface WhatsAppFallbackSettingsProps {
  value: number;
  onChange: (value: number) => void;
  whatsappNumber: string;
  disabled?: boolean;
}

export default function WhatsAppFallbackSettings({
  value,
  onChange,
  whatsappNumber,
  disabled = false
}: WhatsAppFallbackSettingsProps) {
  // Default to 5 minutes if no value set
  const fallbackMinutes = value || 5;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  const presetOptions = [
    { label: '1 min', value: 1, description: 'Quick response' },
    { label: '3 min', value: 3, description: 'Short wait' },
    { label: '5 min', value: 5, description: 'Recommended' },
    { label: '10 min', value: 10, description: 'Patient customers' },
    { label: '15 min', value: 15, description: 'Maximum wait' }
  ];

  const isDisabled = disabled || !whatsappNumber;

  return (
    <div style={{
      marginTop: '16px',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1f2937',
          margin: 0
        }}>
          ⏱️ WhatsApp Fallback Timer
        </h4>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Info size={16} color="#6b7280" style={{ cursor: 'help' }} />
          <span style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: 'white',
            fontSize: '12px',
            padding: '4px 8px',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.2s',
            marginBottom: '4px'
          }}
          className="tooltip-text">
            Time to wait before offering WhatsApp option
          </span>
        </div>
      </div>

      {!whatsappNumber && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '6px',
          padding: '8px 12px',
          marginBottom: '12px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          ⚠️ Add your WhatsApp number above to enable this feature
        </div>
      )}

      <div style={{
        opacity: isDisabled ? 0.5 : 1,
        pointerEvents: isDisabled ? 'none' : 'auto'
      }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '8px'
        }}>
          When a customer is waiting for your response, offer WhatsApp after:
        </label>

        {/* Preset Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          {presetOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${fallbackMinutes === option.value ? '#3b82f6' : '#d1d5db'}`,
                backgroundColor: fallbackMinutes === option.value ? '#eff6ff' : 'white',
                color: fallbackMinutes === option.value ? '#2563eb' : '#4b5563',
                fontSize: '13px',
                fontWeight: fallbackMinutes === option.value ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Slider */}
        <div style={{ marginBottom: '12px' }}>
          <input
            type="range"
            min="1"
            max="30"
            value={fallbackMinutes}
            onChange={handleSliderChange}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(fallbackMinutes - 1) / 29 * 100}%, #e5e7eb ${(fallbackMinutes - 1) / 29 * 100}%, #e5e7eb 100%)`,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '4px',
            fontSize: '11px',
            color: '#9ca3af'
          }}>
            <span>1 min</span>
            <span style={{ fontWeight: '600', color: '#1f2937' }}>
              {fallbackMinutes} minute{fallbackMinutes !== 1 ? 's' : ''}
            </span>
            <span>30 min</span>
          </div>
        </div>

        {/* Description */}
        <p style={{
          fontSize: '12px',
          color: '#6b7280',
          margin: '8px 0 0 0',
          lineHeight: '1.5'
        }}>
          {fallbackMinutes <= 2 && '⚡ Very quick - Good for urgent inquiries'}
          {fallbackMinutes > 2 && fallbackMinutes <= 5 && '👍 Balanced - Gives you time to respond'}
          {fallbackMinutes > 5 && fallbackMinutes <= 10 && '⏳ Patient - For less urgent customer service'}
          {fallbackMinutes > 10 && '🐌 Very patient - May lose some customers'}
        </p>
      </div>

      <style>{`
        .tooltip-text:hover {
          opacity: 1 !important;
        }

        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        input[type="range"]:active::-webkit-slider-thumb {
          background: #2563eb;
          transform: scale(1.1);
        }

        input[type="range"]:active::-moz-range-thumb {
          background: #2563eb;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
}