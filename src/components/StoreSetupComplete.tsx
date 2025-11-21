import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUser, useStore } from '../lib/supabase-hooks';
import type { StoreProfile } from '../types';

interface OptionalSection {
  id: string;
  icon: string;
  title: string;
  benefit: string;
  completed: boolean;
}

/**
 * StoreSetupComplete - Post-creation dashboard
 *
 * Shows success message and optional sections to complete
 * All sections are optional - user can skip and start selling
 */
export default function StoreSetupComplete() {
  const { currentUser } = useAuth();

  // Get Supabase user (converts Firebase UID to Supabase UUID)
  const { user: supabaseUser } = useUser(currentUser);
  const { store } = useStore(supabaseUser?.id);
  const [copied, setCopied] = useState(false);

  // Convert snake_case from Supabase to camelCase for StoreProfile compatibility
  const storeProfile: StoreProfile | null = store ? {
    id: store.id,
    storeSlug: store.store_slug,
    logoUrl: store.logo_url,
    bankName: store.bank_name,
    accountNumber: store.account_number,
    deliveryAreas: store.delivery_areas,
    businessHours: store.business_hours,
    aboutUs: store.about_us,
    instagramUrl: store.instagram_url,
    facebookUrl: store.facebook_url,
    tiktokUrl: store.tiktok_url,
  } as StoreProfile : null;

  const storeUrl = storeProfile
    ? `${window.location.origin}/store/${storeProfile.storeSlug}`
    : '';

  // Calculate completion percentage
  const optionalSections: OptionalSection[] = [
    {
      id: 'logo',
      icon: '📸',
      title: 'Add Store Logo',
      benefit: 'Builds brand recognition',
      completed: !!storeProfile?.logoUrl,
    },
    {
      id: 'payment',
      icon: '💳',
      title: 'Add Payment Details',
      benefit: 'Get paid faster',
      completed: !!storeProfile?.bankName && !!storeProfile?.accountNumber,
    },
    {
      id: 'delivery',
      icon: '🚚',
      title: 'Set Delivery Areas & Fees',
      benefit: 'Reduce customer questions',
      completed: !!storeProfile?.deliveryAreas && storeProfile.deliveryAreas.length > 0,
    },
    {
      id: 'hours',
      icon: '⏰',
      title: 'Add Business Hours',
      benefit: 'Set expectations',
      completed: !!storeProfile?.businessHours,
    },
    {
      id: 'about',
      icon: '📝',
      title: 'Write About Your Business',
      benefit: 'Build trust',
      completed: !!storeProfile?.aboutUs,
    },
    {
      id: 'social',
      icon: '🔗',
      title: 'Connect Social Media',
      benefit: 'Grow audience',
      completed: !!(
        storeProfile?.instagramUrl ||
        storeProfile?.facebookUrl ||
        storeProfile?.tiktokUrl
      ),
    },
  ];

  const completedCount = optionalSections.filter((s) => s.completed).length;
  const completionPercentage = Math.round((completedCount / optionalSections.length) * 100);

  // Copy store link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Navigate to section
  const handleAddSection = (sectionId: string) => {
    // Navigate to settings with section hash
    window.location.href = `/settings#${sectionId}`;
  };

  if (!storeProfile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          textAlign: 'center',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: '#6B7280' }}>Loading your store...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9FAFB',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Success Message */}
        <div style={{
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          color: '#ffffff',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>
            🎉
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '8px',
            margin: 0,
          }}>
            Your store is live!
          </h1>
          <p style={{
            fontSize: '16px',
            marginBottom: '24px',
            opacity: 0.9,
          }}>
            {storeProfile.businessName} is now online and ready to receive orders
          </p>

          {/* Store Link */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(10px)',
          }}>
            <p style={{
              fontSize: '14px',
              marginBottom: '8px',
              opacity: 0.9,
            }}>
              Your Store Link:
            </p>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              <code style={{
                flex: 1,
                minWidth: '200px',
                background: 'rgba(255, 255, 255, 0.3)',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {storeUrl}
              </code>
              <button
                onClick={handleCopyLink}
                style={{
                  padding: '10px 20px',
                  background: '#ffffff',
                  color: '#059669',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Visit Store →
              </a>
            </div>
          </div>
        </div>

        {/* Profile Completion */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#111827',
              margin: 0,
            }}>
              Profile Completion
            </h2>
            <span style={{
              fontSize: '24px',
              fontWeight: '700',
              color: completionPercentage === 100 ? '#10B981' : '#667eea',
            }}>
              {completionPercentage}%
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '100%',
            height: '12px',
            background: '#E5E7EB',
            borderRadius: '9999px',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${completionPercentage}%`,
              height: '100%',
              background: completionPercentage === 100
                ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
              transition: 'width 0.5s ease',
            }}></div>
          </div>
        </div>

        {/* Optional Sections */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#111827',
            marginBottom: '8px',
          }}>
            Complete Your Store
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#6B7280',
            marginBottom: '24px',
          }}>
            All optional - add these when you're ready
          </p>

          {/* Sections Grid */}
          <div style={{
            display: 'grid',
            gap: '16px',
          }}>
            {optionalSections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleAddSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '20px',
                  background: section.completed ? '#F0FDF4' : '#F9FAFB',
                  border: `1px solid ${section.completed ? '#86EFAC' : '#E5E7EB'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  fontSize: '32px',
                  flexShrink: 0,
                }}>
                  {section.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}>
                    <h3 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0,
                    }}>
                      {section.title}
                    </h3>
                    {section.completed && (
                      <span style={{ color: '#10B981', fontSize: '16px' }}>✓</span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    margin: 0,
                  }}>
                    {section.benefit}
                  </p>
                </div>
                <div style={{
                  fontSize: '20px',
                  color: '#9CA3AF',
                  flexShrink: 0,
                }}>
                  →
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginTop: '32px',
            flexWrap: 'wrap',
          }}>
            <a
              href="/settings"
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '14px 24px',
                background: '#667eea',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#5568d3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#667eea';
              }}
            >
              Complete All
            </a>
            <a
              href="/"
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '14px 24px',
                background: '#ffffff',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              Skip & Start Selling
            </a>
          </div>
        </div>
      </div>

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
