/**
 * Staff Management Page
 * Owner dashboard to manage staff accounts
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit2, Trash2, Key, UserCheck, UserX, Activity, TrendingUp } from 'lucide-react';
import {
  StaffMember,
  fetchStaffMembers,
  createStaffMember,
  updateStaffMember,
  resetStaffPin,
  toggleStaffActive,
  getStaffSalesStats
} from '../services/staffService';

export default function StaffManagement() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showResetPinModal, setShowResetPinModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    pin: '',
    role: 'cashier' as 'manager' | 'cashier'
  });

  useEffect(() => {
    loadStaff();
  }, [currentUser?.uid]);

  const loadStaff = async () => {
    if (!currentUser?.uid) return;

    try {
      setLoading(true);
      const data = await fetchStaffMembers(currentUser.uid);
      setStaff(data);
    } catch (error) {
      console.error('[StaffManagement] Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser?.uid) return;

    try {
      await createStaffMember(currentUser.uid, formData);
      setShowAddModal(false);
      setFormData({
        name: '',
        phone: '',
        email: '',
        pin: '',
        role: 'cashier'
      });
      loadStaff();
    } catch (error: any) {
      console.error('[StaffManagement] Error adding staff:', error);
      alert(error.message || 'Failed to add staff member');
    }
  };

  const handleToggleActive = async (staffMember: StaffMember) => {
    if (!currentUser?.uid) return;

    const confirm = window.confirm(
      `Are you sure you want to ${staffMember.is_active ? 'deactivate' : 'activate'} ${staffMember.name}?`
    );

    if (!confirm) return;

    try {
      await toggleStaffActive(currentUser.uid, staffMember.id, !staffMember.is_active);
      loadStaff();
    } catch (error) {
      console.error('[StaffManagement] Error toggling staff:', error);
      alert('Failed to update staff member');
    }
  };

  const handleResetPin = async (newPin: string) => {
    if (!currentUser?.uid || !selectedStaff) return;

    try {
      await resetStaffPin(currentUser.uid, selectedStaff.id, newPin);
      setShowResetPinModal(false);
      setSelectedStaff(null);
      alert('PIN reset successfully');
    } catch (error) {
      console.error('[StaffManagement] Error resetting PIN:', error);
      alert('Failed to reset PIN');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    return role === 'manager'
      ? { bg: '#DBEAFE', color: '#1E40AF' }
      : { bg: '#D1FAE5', color: '#065F46' };
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F6F6F7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#00894F',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#6B7280' }}>Loading staff...</p>
        </div>
      </div>
    );
  }

  const activeStaff = staff.filter(s => s.is_active);
  const inactiveStaff = staff.filter(s => !s.is_active);

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#1F2937',
            marginBottom: '4px'
          }}>
            <Users size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Staff Management
          </h1>
          <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
            {activeStaff.length} active • {inactiveStaff.length} inactive
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              padding: '12px 20px',
              background: '#00894F',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} />
            Add Staff
          </button>

          <button
            onClick={() => navigate('/dashboard')}
            style={{
              padding: '12px 20px',
              background: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
            Total Staff
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1F2937' }}>
            {staff.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
            Managers
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#3B82F6' }}>
            {staff.filter(s => s.role === 'manager' && s.is_active).length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
            Cashiers
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>
            {staff.filter(s => s.role === 'cashier' && s.is_active).length}
          </div>
        </div>
      </div>

      {/* Active Staff List */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1F2937' }}>
            Active Staff
          </h3>
        </div>

        {activeStaff.length === 0 ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <p>No active staff members yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                background: '#00894F',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Add Your First Staff Member
            </button>
          </div>
        ) : (
          <div style={{ padding: '12px' }}>
            {activeStaff.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                onToggleActive={handleToggleActive}
                onResetPin={() => {
                  setSelectedStaff(member);
                  setShowResetPinModal(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Staff */}
      {inactiveStaff.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #E5E7EB'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#6B7280' }}>
              Inactive Staff
            </h3>
          </div>

          <div style={{ padding: '12px' }}>
            {inactiveStaff.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                onToggleActive={handleToggleActive}
                onResetPin={() => {
                  setSelectedStaff(member);
                  setShowResetPinModal(true);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          formData={formData}
          onChange={setFormData}
          onSubmit={handleAddStaff}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Reset PIN Modal */}
      {showResetPinModal && selectedStaff && (
        <ResetPinModal
          staffName={selectedStaff.name}
          onReset={handleResetPin}
          onClose={() => {
            setShowResetPinModal(false);
            setSelectedStaff(null);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Staff Card Component
function StaffCard({
  member,
  onToggleActive,
  onResetPin
}: {
  member: StaffMember;
  onToggleActive: (member: StaffMember) => void;
  onResetPin: () => void;
}) {
  const roleColors = member.role === 'manager'
    ? { bg: '#DBEAFE', color: '#1E40AF' }
    : { bg: '#D1FAE5', color: '#065F46' };

  return (
    <div style={{
      padding: '16px',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      marginBottom: '8px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      opacity: member.is_active ? 1 : 0.6
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1F2937' }}>
            {member.name}
          </h4>
          <span style={{
            padding: '4px 12px',
            background: roleColors.bg,
            color: roleColors.color,
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'capitalize'
          }}>
            {member.role}
          </span>
          {!member.is_active && (
            <span style={{
              padding: '4px 12px',
              background: '#FEE2E2',
              color: '#991B1B',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              Inactive
            </span>
          )}
        </div>

        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          {member.phone && <span>📱 {member.phone}</span>}
          {member.phone && member.email && <span> • </span>}
          {member.email && <span>📧 {member.email}</span>}
        </div>

        {member.last_login_at && (
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            Last login: {new Date(member.last_login_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onResetPin}
          style={{
            padding: '8px 12px',
            background: '#F3F4F6',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#374151'
          }}
          title="Reset PIN"
        >
          <Key size={16} />
          Reset PIN
        </button>

        <button
          onClick={() => onToggleActive(member)}
          style={{
            padding: '8px 12px',
            background: member.is_active ? '#FEF2F2' : '#ECFDF5',
            border: `1px solid ${member.is_active ? '#FEE2E2' : '#D1FAE5'}`,
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: member.is_active ? '#991B1B' : '#065F46'
          }}
        >
          {member.is_active ? (
            <>
              <UserX size={16} />
              Deactivate
            </>
          ) : (
            <>
              <UserCheck size={16} />
              Activate
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// Add Staff Modal
function AddStaffModal({
  formData,
  onChange,
  onSubmit,
  onClose
}: {
  formData: any;
  onChange: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
            Add Staff Member
          </h3>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => onChange({ ...formData, name: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => onChange({ ...formData, phone: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => onChange({ ...formData, email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                PIN Code (4-6 digits) *
              </label>
              <input
                type="text"
                required
                pattern="[0-9]{4,6}"
                value={formData.pin}
                onChange={(e) => onChange({ ...formData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                placeholder="1234"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  letterSpacing: '4px',
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
                Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => onChange({ ...formData, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="cashier">Cashier (Sales only)</option>
                <option value="manager">Manager (Sales + Add products)</option>
              </select>
            </div>
          </div>

          <div style={{
            padding: '24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                background: '#00894F',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Reset PIN Modal
function ResetPinModal({
  staffName,
  onReset,
  onClose
}: {
  staffName: string;
  onReset: (pin: string) => void;
  onClose: () => void;
}) {
  const [newPin, setNewPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length >= 4 && newPin.length <= 6) {
      onReset(newPin);
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        maxWidth: '400px',
        width: '90%'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
            Reset PIN for {staffName}
          </h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
              New PIN (4-6 digits)
            </label>
            <input
              type="text"
              required
              pattern="[0-9]{4,6}"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="1234"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '18px',
                letterSpacing: '8px',
                fontWeight: 600,
                textAlign: 'center'
              }}
            />
          </div>

          <div style={{
            padding: '24px',
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={newPin.length < 4}
              style={{
                padding: '10px 20px',
                background: newPin.length >= 4 ? '#00894F' : '#E5E7EB',
                color: newPin.length >= 4 ? 'white' : '#9CA3AF',
                border: 'none',
                borderRadius: '8px',
                cursor: newPin.length >= 4 ? 'pointer' : 'not-allowed',
                fontWeight: 600
              }}
            >
              Reset PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
