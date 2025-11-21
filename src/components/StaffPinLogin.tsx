/**
 * Staff PIN Login Modal
 * Clean PIN pad interface for staff authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import { X, Delete, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useStaff } from '../contexts/StaffContext';
import { authenticateStaffWithPin } from '../services/staffService';

interface StaffPinLoginProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StaffPinLogin({ isOpen, onClose }: StaffPinLoginProps) {
  const { currentUser } = useAuth();
  const { setStaffMode } = useStaff();
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setPin('');
      setError('');
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + num);
      setError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleLogin = async () => {
    if (!currentUser?.uid) {
      setError('Please log in as owner first');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const staff = await authenticateStaffWithPin(currentUser.uid, pin);

      if (staff) {
        setStaffMode(staff);
        setPin('');
        onClose();
      } else {
        setError('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (error) {
      console.error('[StaffPinLogin] Error:', error);
      setError('Login failed. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleNumberClick(e.key);
    } else if (e.key === 'Backspace') {
      handleDelete();
    } else if (e.key === 'Enter' && pin.length >= 4) {
      handleLogin();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onKeyDown={handleKeyPress}
      style={{
        padding: 0,
        border: 'none',
        borderRadius: '20px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        background: 'white'
      }}
    >
      <div style={{
        padding: '32px',
        background: 'linear-gradient(135deg, #00894F 0%, #006B3E 100%)',
        color: 'white',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px'
          }}>
            👤
          </div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700 }}>
            Staff Login
          </h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>
            Enter your PIN to continue
          </p>
        </div>
      </div>

      <div style={{ padding: '32px' }}>
        {/* PIN Display */}
        <div style={{
          marginBottom: '24px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '8px'
          }}>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  background: i < pin.length ? '#00894F' : '#E5E7EB',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
          {error && (
            <p style={{
              color: '#DC2626',
              fontSize: '13px',
              margin: '8px 0 0 0'
            }}>
              {error}
            </p>
          )}
        </div>

        {/* Number Pad */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              disabled={isLoading || pin.length >= 6}
              style={{
                padding: '20px',
                fontSize: '24px',
                fontWeight: 600,
                background: '#F9FAFB',
                border: '2px solid #E5E7EB',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                color: '#1F2937'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#F3F4F6';
                e.currentTarget.style.borderColor = '#00894F';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              {num}
            </button>
          ))}

          {/* Clear Button */}
          <button
            onClick={handleClear}
            disabled={isLoading || pin.length === 0}
            style={{
              padding: '20px',
              fontSize: '14px',
              fontWeight: 600,
              background: '#FEF2F2',
              border: '2px solid #FEE2E2',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Clear
          </button>

          {/* Zero Button */}
          <button
            onClick={() => handleNumberClick('0')}
            disabled={isLoading || pin.length >= 6}
            style={{
              padding: '20px',
              fontSize: '24px',
              fontWeight: 600,
              background: '#F9FAFB',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              cursor: 'pointer',
              color: '#1F2937'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#F3F4F6';
              e.currentTarget.style.borderColor = '#00894F';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#F9FAFB';
              e.currentTarget.style.borderColor = '#E5E7EB';
            }}
          >
            0
          </button>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            disabled={isLoading || pin.length === 0}
            style={{
              padding: '20px',
              background: '#F9FAFB',
              border: '2px solid #E5E7EB',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6B7280'
            }}
          >
            <Delete size={24} />
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={pin.length < 4 || isLoading}
          style={{
            width: '100%',
            padding: '16px',
            background: pin.length >= 4 ? '#00894F' : '#E5E7EB',
            color: pin.length >= 4 ? 'white' : '#9CA3AF',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: pin.length >= 4 ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              Authenticating...
            </>
          ) : (
            <>
              <LogIn size={20} />
              Login
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        dialog::backdrop {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
      `}</style>
    </dialog>
  );
}
