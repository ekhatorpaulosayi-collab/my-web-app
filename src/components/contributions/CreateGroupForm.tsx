import React, { useState, useEffect } from 'react';

interface CreateGroupFormProps {
  onSubmit: (groupData: {
    name: string;
    amount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    collectionDay: string;
    members: { name: string; phone: string }[];
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', icon: '📅', description: 'Every week' },
  { value: 'biweekly', label: 'Biweekly', icon: '📆', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', icon: '🗓️', description: 'Once a month' }
];

export const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onSubmit, onCancel, isLoading = false }) => {
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [collectionDay, setCollectionDay] = useState('Monday');
  const [members, setMembers] = useState<{ name: string; phone: string }[]>([
    { name: '', phone: '' }
  ]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddMember = () => {
    setMembers([...members, { name: '', phone: '' }]);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const handleMemberChange = (index: number, field: 'name' | 'phone', value: string) => {
    const newMembers = [...members];
    newMembers[index][field] = value;
    setMembers(newMembers);
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Group name is required';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Contribution amount must be greater than 0';
    }

    const validMembers = members.filter(m => m.name.trim());
    if (validMembers.length < 2) {
      newErrors.members = 'At least 2 members are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling on mobile

    console.log('Submit clicked - validating form...');
    console.log('Current form data:', { name, amount, members: members.length });

    if (!validateForm()) {
      console.log('Form validation failed');
      // Get current validation errors
      const currentErrors: string[] = [];
      if (!name.trim()) currentErrors.push('Group name is required');
      if (!amount || parseFloat(amount) <= 0) currentErrors.push('Amount must be greater than 0');
      const validMembersCount = members.filter(m => m.name.trim()).length;
      if (validMembersCount < 2) currentErrors.push('At least 2 members are required');

      // Show validation errors more prominently on mobile
      if (currentErrors.length > 0) {
        alert(`Please fix:\n${currentErrors.join('\n')}`);
      }
      return;
    }
    console.log('Form validation passed');

    const validMembers = members.filter(m => m.name.trim());

    onSubmit({
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      collectionDay,
      members: validMembers.map(m => ({
        name: m.name.trim(),
        phone: m.phone.trim()
      }))
    });
  };

  return (
    <>
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes shimmer {
          0% { background-position: -100% 0; }
          100% { background-position: 100% 0; }
        }

        .premium-input {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .premium-input:focus {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(16, 185, 129, 0.15);
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001s !important;
            transition-duration: 0.001s !important;
          }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.8) 100%)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          padding: '20px',
          paddingTop: '80px',
          opacity: mounted ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}
        onClick={onCancel}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'linear-gradient(to bottom, #ffffff, #fefefe)',
            borderRadius: '24px',
            padding: '32px',
            paddingBottom: '100px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: 'calc(90vh - 80px)',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)',
            position: 'relative',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            animation: mounted ? 'slideUp 0.5s ease' : 'none'
          }}
        >
          {/* Premium Header */}
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            margin: '-32px -32px 28px',
            padding: '28px 32px',
            borderRadius: '24px 24px 0 0',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Decorative Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.1,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)'
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative'
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  color: 'white',
                  marginBottom: '4px',
                  letterSpacing: '-0.02em'
                }}>
                  Create New Group
                </h2>
                <p style={{
                  fontSize: '14px',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 500
                }}>
                  Start your ajo, esusu or contribution circle
                </p>
              </div>
              <button
                onClick={onCancel}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'rotate(0)';
                }}
              >
                ×
              </button>
            </div>
          </div>

        <form onSubmit={handleSubmit}>
          {/* Progress Indicators */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            justifyContent: 'center'
          }}>
            {[1, 2, 3].map(step => (
              <div
                key={step}
                style={{
                  width: step === 1 ? '40%' : '30%',
                  height: '4px',
                  borderRadius: '2px',
                  background: step === 1 ? 'linear-gradient(90deg, #10b981, #059669)' : '#e5e7eb',
                  transition: 'all 0.3s ease'
                }}
              />
            ))}
          </div>

          {/* Group Name - Premium Input */}
          <div style={{
            marginBottom: '28px',
            opacity: mounted ? 1 : 0,
            animation: 'fadeIn 0.5s ease 0.1s forwards'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                👥
              </span>
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Office Savings Group"
              className="premium-input"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: errors.name ? '2px solid #ef4444' : '2px solid transparent',
                borderRadius: '12px',
                fontSize: '15px',
                background: errors.name ? '#fef2f2' : '#f9fafb',
                color: '#1f2937',
                outline: 'none',
                fontWeight: 500,
                boxShadow: errors.name ? '0 0 0 4px rgba(239, 68, 68, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}
              onFocus={e => {
                if (!errors.name) {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.border = '2px solid #10b981';
                  e.currentTarget.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.1)';
                }
              }}
              onBlur={e => {
                if (!errors.name) {
                  e.currentTarget.style.background = '#f9fafb';
                  e.currentTarget.style.border = '2px solid transparent';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                }
              }}
            />
            {errors.name && (
              <p style={{
                color: '#ef4444',
                fontSize: '13px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500
              }}>
                ⚠️ {errors.name}
              </p>
            )}
          </div>

          {/* Amount - Premium Input */}
          <div style={{
            marginBottom: '28px',
            opacity: mounted ? 1 : 0,
            animation: 'fadeIn 0.5s ease 0.2s forwards'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                💰
              </span>
              Contribution Amount
            </label>
            <div style={{
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                fontWeight: 700,
                color: '#6b7280'
              }}>
                ₦
              </span>
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="5,000"
                className="premium-input"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 40px',
                  border: errors.amount ? '2px solid #ef4444' : '2px solid transparent',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: 600,
                  background: errors.amount ? '#fef2f2' : '#f9fafb',
                  color: '#1f2937',
                  outline: 'none',
                  boxShadow: errors.amount ? '0 0 0 4px rgba(239, 68, 68, 0.1)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={e => {
                  if (!errors.amount) {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.border = '2px solid #fbbf24';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(251, 191, 36, 0.1)';
                  }
                }}
                onBlur={e => {
                  if (!errors.amount) {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.border = '2px solid transparent';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                  }
                }}
              />
            </div>
            {errors.amount && (
              <p style={{
                color: '#ef4444',
                fontSize: '13px',
                marginTop: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500
              }}>
                ⚠️ {errors.amount}
              </p>
            )}
          </div>

          {/* Frequency - Premium Selection */}
          <div style={{
            marginBottom: '28px',
            opacity: mounted ? 1 : 0,
            animation: 'fadeIn 0.5s ease 0.3s forwards'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                📅
              </span>
              Collection Frequency
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '10px'
            }}>
              {FREQUENCIES.map((freq, index) => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => setFrequency(freq.value as any)}
                  style={{
                    padding: '12px',
                    border: frequency === freq.value ? '2px solid #10b981' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    background: frequency === freq.value
                      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))'
                      : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: frequency === freq.value
                      ? '0 4px 12px rgba(16, 185, 129, 0.2)'
                      : '0 2px 4px rgba(0, 0, 0, 0.05)',
                    transform: frequency === freq.value ? 'scale(1.02)' : 'scale(1)',
                    opacity: mounted ? 1 : 0,
                    animation: `fadeIn 0.4s ease ${0.4 + index * 0.1}s forwards`
                  }}
                  onMouseEnter={e => {
                    if (frequency !== freq.value) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.1)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (frequency !== freq.value) {
                      e.currentTarget.style.transform = 'scale(1)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{freq.icon}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: frequency === freq.value ? 700 : 600,
                    color: frequency === freq.value ? '#059669' : '#374151'
                  }}>
                    {freq.label}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    {freq.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Collection Day - Premium Select */}
          <div style={{
            marginBottom: '28px',
            opacity: mounted ? 1 : 0,
            animation: 'fadeIn 0.5s ease 0.4s forwards'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '10px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                📆
              </span>
              Collection Day
            </label>
            <select
              value={collectionDay}
              onChange={e => setCollectionDay(e.target.value)}
              className="premium-input"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: '2px solid transparent',
                borderRadius: '12px',
                fontSize: '15px',
                background: '#f9fafb',
                color: '#1f2937',
                cursor: 'pointer',
                outline: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 16px center',
                backgroundSize: '20px',
                paddingRight: '48px'
              }}
              onFocus={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.border = '2px solid #8b5cf6';
                e.currentTarget.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.1)';
              }}
              onBlur={e => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.border = '2px solid transparent';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }}
            >
              {DAYS_OF_WEEK.map(day => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Members - Premium List */}
          <div style={{
            marginBottom: '28px',
            opacity: mounted ? 1 : 0,
            animation: 'fadeIn 0.5s ease 0.5s forwards'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #ec4899, #db2777)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px'
              }}>
                👤
              </span>
              Group Members
              <span style={{
                padding: '2px 8px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                marginLeft: 'auto'
              }}>
                {members.filter(m => m.name.trim()).length} members
              </span>
            </label>

            {errors.members && (
              <div style={{
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '14px' }}>⚠️</span>
                <span style={{
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: 500
                }}>
                  {errors.members}
                </span>
              </div>
            )}

            <div style={{
              maxHeight: '240px',
              overflowY: 'auto',
              padding: '4px',
              borderRadius: '12px',
              background: '#fafafa'
            }}>
              {members.map((member, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    gap: '10px',
                    marginBottom: '10px',
                    padding: '12px',
                    background: 'white',
                    borderRadius: '10px',
                    border: '1px solid #e5e7eb',
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    opacity: mounted ? 1 : 0,
                    animation: `fadeIn 0.3s ease ${0.6 + index * 0.05}s forwards`
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'][index % 5]}, ${['#059669', '#2563eb', '#7c3aed', '#db2777', '#ea580c'][index % 5]})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={member.name}
                    onChange={e => handleMemberChange(index, 'name', e.target.value)}
                    placeholder="Member name"
                    className="premium-input"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#1f2937',
                      outline: 'none',
                      fontWeight: 500,
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.border = '1px solid #10b981';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.border = '1px solid #e5e7eb';
                    }}
                  />
                  <input
                    type="tel"
                    value={member.phone}
                    onChange={e => handleMemberChange(index, 'phone', e.target.value)}
                    placeholder="Phone (optional)"
                    className="premium-input"
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      background: '#f9fafb',
                      color: '#1f2937',
                      outline: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onFocus={e => {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.border = '1px solid #10b981';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.border = '1px solid #e5e7eb';
                    }}
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#fecaca';
                        e.currentTarget.style.transform = 'rotate(90deg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.transform = 'rotate(0)';
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddMember}
              style={{
                marginTop: '12px',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
                border: '2px dashed #10b981',
                borderRadius: '12px',
                color: '#059669',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.15))';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              Add Another Member
            </button>
          </div>

          {/* Form Actions - Premium Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '14px',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                color: '#6b7280',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                flex: 2,
                padding: '14px',
                minHeight: '52px',
                background: isLoading
                  ? 'linear-gradient(135deg, #9ca3af, #6b7280)'
                  : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                userSelect: 'none',
                transition: 'all 0.3s ease',
                boxShadow: isLoading
                  ? '0 4px 12px rgba(107, 114, 128, 0.3)'
                  : '0 4px 12px rgba(16, 185, 129, 0.3)',
                transform: 'translateY(0)'
              }}
              onMouseEnter={e => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                }
              }}
              onMouseLeave={e => {
                if (!isLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }
              }}
            >
              {isLoading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '18px',
                    height: '18px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid white',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Creating Your Group...
                </>
              ) : (
                <>
                  <span style={{ fontSize: '18px' }}>🎉</span>
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
};

export default CreateGroupForm;