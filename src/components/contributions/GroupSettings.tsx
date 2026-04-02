import React, { useState } from 'react';

interface Member {
  id: string;
  name: string;
  phone: string;
  order: number;
}

interface GroupSettingsProps {
  group: {
    id: string;
    name: string;
    amount: number;
    frequency: 'weekly' | 'biweekly' | 'monthly';
    collectionDay: string;
    members: Member[];
    isActive: boolean;
    isShared: boolean;
    shareCode?: string;
  };
  onBack: () => void;
  onSave: (updates: {
    name?: string;
    amount?: number;
    frequency?: 'weekly' | 'biweekly' | 'monthly';
    collectionDay?: string;
    members?: Member[];
    isActive?: boolean;
    isShared?: boolean;
  }) => void;
  onDelete: () => void;
  onGenerateShareCode: () => string;
}

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' }
];

export const GroupSettings: React.FC<GroupSettingsProps> = ({
  group,
  onBack,
  onSave,
  onDelete,
  onGenerateShareCode
}) => {
  const [name, setName] = useState(group.name);
  const [amount, setAmount] = useState(group.amount.toString());
  const [frequency, setFrequency] = useState(group.frequency);
  const [collectionDay, setCollectionDay] = useState(group.collectionDay);
  const [members, setMembers] = useState<Member[]>([...group.members]);
  const [isActive, setIsActive] = useState(group.isActive);
  const [isShared, setIsShared] = useState(group.isShared);
  const [shareCode, setShareCode] = useState(group.shareCode || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleMemberChange = (index: number, field: 'name' | 'phone', value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    setMembers(newMembers);
    setIsDirty(true);
  };

  const handleAddMember = () => {
    const newMember: Member = {
      id: `new-${Date.now()}`,
      name: '',
      phone: '',
      order: members.length
    };
    setMembers([...members, newMember]);
    setIsDirty(true);
  };

  const handleRemoveMember = (index: number) => {
    if (members.length > 2) {
      const newMembers = members.filter((_, i) => i !== index);
      // Reorder members
      newMembers.forEach((member, i) => {
        member.order = i;
      });
      setMembers(newMembers);
      setIsDirty(true);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newMembers = [...members];
      [newMembers[index - 1], newMembers[index]] = [newMembers[index], newMembers[index - 1]];
      // Update order
      newMembers[index - 1].order = index - 1;
      newMembers[index].order = index;
      setMembers(newMembers);
      setIsDirty(true);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < members.length - 1) {
      const newMembers = [...members];
      [newMembers[index], newMembers[index + 1]] = [newMembers[index + 1], newMembers[index]];
      // Update order
      newMembers[index].order = index;
      newMembers[index + 1].order = index + 1;
      setMembers(newMembers);
      setIsDirty(true);
    }
  };

  const handleShareToggle = () => {
    const newIsShared = !isShared;
    setIsShared(newIsShared);

    if (newIsShared && !shareCode) {
      const code = onGenerateShareCode();
      setShareCode(code);
    }

    setIsDirty(true);
  };

  const handleSave = () => {
    const validMembers = members.filter(m => m.name.trim());

    if (validMembers.length < 2) {
      alert('At least 2 members are required');
      return;
    }

    onSave({
      name: name.trim(),
      amount: parseFloat(amount),
      frequency,
      collectionDay,
      members: validMembers,
      isActive,
      isShared
    });
  };

  const shareUrl = shareCode ? `https://storehouse.ng/a/${shareCode}` : '';

  return (
    <div className="group-settings">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ←
          </button>
          <h2 style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937'
          }}>
            Group Settings
          </h2>
        </div>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          style={{
            padding: '8px 16px',
            background: isDirty ? '#10b981' : '#e5e7eb',
            color: isDirty ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: isDirty ? 'pointer' : 'not-allowed'
          }}
        >
          Save Changes
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Basic Settings */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Basic Information
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '13px',
              color: '#6b7280'
            }}>
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setIsDirty(true);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              marginBottom: '4px',
              fontSize: '13px',
              color: '#6b7280'
            }}>
              Contribution Amount (₦)
            </label>
            <input
              type="number"
              value={amount}
              onChange={e => {
                setAmount(e.target.value);
                setIsDirty(true);
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                Frequency
              </label>
              <select
                value={frequency}
                onChange={e => {
                  setFrequency(e.target.value as 'weekly' | 'biweekly' | 'monthly');
                  setIsDirty(true);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                {FREQUENCIES.map(freq => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{
                display: 'block',
                marginBottom: '4px',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                Collection Day
              </label>
              <select
                value={collectionDay}
                onChange={e => {
                  setCollectionDay(e.target.value);
                  setIsDirty(true);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Share Settings */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Sharing
          </h3>

          <div style={{
            padding: '12px',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Enable public sharing
              </span>
              <input
                type="checkbox"
                checked={isShared}
                onChange={handleShareToggle}
                style={{
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer'
                }}
              />
            </label>

            {isShared && shareCode && (
              <div style={{
                marginTop: '12px',
                padding: '8px',
                background: 'white',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  Share this link:
                </p>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      fontSize: '13px',
                      color: '#374151',
                      background: '#f9fafb'
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                      alert('Link copied!');
                    }}
                    style={{
                      padding: '6px 12px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Members Management */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Members ({members.length})
          </h3>

          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '12px'
          }}>
            {members.map((member, index) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px'
                }}
              >
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{
                      padding: '2px 6px',
                      background: index === 0 ? '#f3f4f6' : 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === members.length - 1}
                    style={{
                      padding: '2px 6px',
                      background: index === members.length - 1 ? '#f3f4f6' : 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      cursor: index === members.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    ↓
                  </button>
                </div>

                <span style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  minWidth: '20px'
                }}>
                  {index + 1}.
                </span>

                <input
                  type="text"
                  value={member.name}
                  onChange={e => handleMemberChange(index, 'name', e.target.value)}
                  placeholder="Name"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />

                <input
                  type="tel"
                  value={member.phone}
                  onChange={e => handleMemberChange(index, 'phone', e.target.value)}
                  placeholder="Phone"
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />

                {members.length > 2 && (
                  <button
                    onClick={() => handleRemoveMember(index)}
                    style={{
                      padding: '8px 12px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleAddMember}
            style={{
              width: '100%',
              padding: '10px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            + Add Member
          </button>
        </section>

        {/* Status Settings */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '12px'
          }}>
            Group Status
          </h3>

          <div style={{
            padding: '12px',
            background: isActive ? '#d1fae5' : '#fee2e2',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                color: isActive ? '#065f46' : '#991b1b'
              }}>
                {isActive ? 'Active' : 'Paused'}
              </p>
              <p style={{
                fontSize: '12px',
                color: isActive ? '#047857' : '#dc2626',
                marginTop: '2px'
              }}>
                {isActive
                  ? 'Collections are ongoing'
                  : 'Collections are temporarily stopped'}
              </p>
            </div>
            <button
              onClick={() => {
                setIsActive(!isActive);
                setIsDirty(true);
              }}
              style={{
                padding: '8px 16px',
                background: isActive ? '#fef3c7' : '#10b981',
                color: isActive ? '#92400e' : 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              {isActive ? 'Pause Group' : 'Resume Group'}
            </button>
          </div>
        </section>

        {/* Delete Group */}
        <section>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Delete Group
          </button>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            className="modal"
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}
          >
            <h3 style={{
              fontSize: '18px',
              fontWeight: 600,
              marginBottom: '16px'
            }}>
              Delete Group?
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#6b7280',
              marginBottom: '24px'
            }}>
              Are you sure you want to delete "{name}"? This action cannot be undone and all group data will be lost.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Delete Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettings;