/**
 * More Menu Component
 * Hidden features accessible via "More" button
 */

import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Package, AlertTriangle, DollarSign, FileText, Users, Receipt, Share2, HelpCircle, Send, Download, UserCircle2, UserCog, LogOut, Gift, BarChart3, BarChart2, Star, TrendingUp, CreditCard, MessageCircle, Bell, BookOpen, FileSpreadsheet, Sparkles, Lock } from 'lucide-react';
import { useStaff } from '../contexts/StaffContext';
import { canViewInvoices } from '../utils/staffPermissions';
import { useAuth } from '../contexts/AuthContext';
import { getUserTier } from '../services/subscriptionService';
import { NotificationBadge } from './dashboard/OwnerNotificationManager';
import './MoreMenu.css';

interface MoreMenuProps {
  onClose: () => void;
  onViewInventory?: () => void;
  onViewLowStock?: () => void;
  onViewMoney?: () => void;
  onViewReports?: () => void;
  onViewCustomers?: () => void;
  onViewExpenses?: () => void;
  onViewSettings?: () => void;
  onShowOnlineStore?: () => void;
  onSendDailySummary?: () => void;
  onExportData?: () => void;
  onStaffModeToggle?: () => void;
  onViewChannelAnalytics?: () => void;
  onViewHistory?: () => void;
  storeUrl?: string;
  storeName?: string;
}

export const MoreMenu: React.FC<MoreMenuProps> = ({
  onClose,
  onViewInventory,
  onViewLowStock,
  onViewMoney,
  onViewReports,
  onViewCustomers,
  onViewExpenses,
  onViewSettings,
  onShowOnlineStore,
  onSendDailySummary,
  onExportData,
  onStaffModeToggle,
  onViewChannelAnalytics,
  onViewHistory,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);
  const [showScrollCue, setShowScrollCue] = useState(false);
  const navigate = useNavigate();
  const { isStaffMode, currentStaff, exitStaffMode, canManageStaff, canViewReports, canManageCustomers, currentRole } = useStaff();
  const { currentUser } = useAuth();
  const [userTier, setUserTier] = useState<string>('Free');
  const [isOwner, setIsOwner] = useState(false);

  // Check if current user is the store owner and fetch tier
  useEffect(() => {
    const checkOwnerAndTier = async () => {
      if (currentUser) {
        // Check if user is in owner mode (not staff mode)
        const ownerCheck = currentRole === 'owner';
        setIsOwner(ownerCheck);

        // Fetch user tier
        const tierData = await getUserTier(currentUser.uid);
        if (tierData) {
          setUserTier(tierData.tier_name || 'Free');
        }
      }
    };

    checkOwnerAndTier();
  }, [currentUser, currentRole]);

  useEffect(() => {
    dialogRef.current?.showModal();
    const previousModal = document.body.getAttribute('data-modal-open');
    document.body.setAttribute('data-modal-open', 'true');

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dialogRef.current?.close();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (previousModal) document.body.setAttribute('data-modal-open', previousModal);
      else document.body.removeAttribute('data-modal-open');
      // Clean up dialog on unmount
      if (dialogRef.current?.open) {
        dialogRef.current?.close();
      }
    };
  }, [onClose]);

  useLayoutEffect(() => {
    const el = sectionsRef.current;
    if (!el) return;
    const update = () => {
      setShowScrollCue(el.scrollHeight - el.scrollTop - el.clientHeight > 12);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [isOwner, userTier, isStaffMode, currentRole]);

  // Organize menu items into sections with premium color themes
  const sections = [
    {
      title: 'SELL',
      theme: 'teal',
      items: [
        {
          icon: Share2,
          label: 'Share your store',
          description: 'WhatsApp, a link, or QR — customers browse anytime',
          action: onShowOnlineStore
        },
        ...(canViewReports() ? [{
          icon: BarChart2,
          label: 'Sales History',
          description: 'View and search all your sales',
          action: onViewHistory
        }] : []),
      ]
    },
    {
      title: 'MANAGE',
      theme: 'purple',
      items: [
        ...(canManageCustomers() ? [{
          icon: BookOpen,
          label: 'Money Book',
          description: 'Credit sales and ajo/contribution groups',
          action: onViewCustomers // Fixed: This opens CustomerDebtDrawer (Money Book with Credit Sales + Contributions tabs)
        }] : []),
        {
          icon: MessageCircle,
          label: 'Customer Chats',
          description: 'Conversations from your online store',
          action: () => navigate('/conversations')
        },
        ...(canViewInvoices(currentRole) ? [{
          icon: Receipt,
          label: 'Professional Invoices',
          description: 'Send invoices in 30 seconds',
          action: () => navigate('/invoices')
        }] : []),
        // Staff Management (owner only)
        ...(canManageStaff() && !isStaffMode ? [{
          icon: UserCog,
          label: 'Staff Management',
          description: 'Add and manage team members',
          action: () => navigate('/staff')
        }] : []),
        ...(canViewReports() ? [{
          icon: FileSpreadsheet,
          label: 'Export Data',
          description: 'Download for Excel or Google Sheets',
          action: onExportData
        }] : [])
      ]
    },
    {
      title: 'TRACK',
      theme: 'amber',
      items: [
        // Business Insights - Only show to owners, not staff
        ...(isOwner ? [{
          icon: Sparkles,
          label: 'Business Insights',
          description: 'AI-powered daily summary of your business',
          action: () => {
            const isPro = ['Pro', 'Business'].includes(userTier);
            if (isPro) {
              navigate('/dashboard/insights');
            } else {
              // Show upgrade prompt
              alert(`Business Insights is available for Pro and Business tiers. You're currently on ${userTier} tier. Upgrade to unlock AI-powered insights!`);
              navigate('/upgrade');
            }
          },
          badge: ['Pro', 'Business'].includes(userTier) ? undefined : 'PRO',
          locked: !['Pro', 'Business'].includes(userTier)
        }] : []),
        ...(canViewReports() ? [
          {
            icon: TrendingUp,
            label: 'Money & Profits',
            description: 'Item costs, prices, and margins',
            action: onViewMoney
          },
          {
            icon: Send,
            label: 'Daily Sales Summary',
            description: 'Daily digest via email or WhatsApp',
            action: onSendDailySummary
          },
          {
            icon: BarChart3,
            label: 'Sales by Channel',
            description: 'Instagram, WhatsApp, Walk-in',
            action: onViewChannelAnalytics
          },
        ] : []),
        ...(canManageCustomers() ? [{
          icon: UserCircle2,
          label: 'Customers',
          description: 'Purchases, loyalty, outstanding payments',
          action: () => navigate('/customers')
        }] : [])
      ]
    },
    {
      title: 'GROWTH',
      theme: 'green',
      items: [
        {
          icon: Star,
          label: 'Customer Reviews',
          description: 'Collect and display testimonials',
          action: () => navigate('/reviews')
        },
        {
          icon: Gift,
          label: 'Partner Program',
          description: '30% recurring commission on referrals',
          action: () => navigate('/affiliate/signup'),
          badge: 'EARN MONEY'
        }
      ]
    },
    {
      title: 'ACCOUNT',
      theme: 'grey',
      items: [
        {
          icon: CreditCard,
          label: 'Subscription & Billing',
          description: 'Upgrade plan, manage billing',
          action: () => navigate('/upgrade')
        },
        // Staff Mode Login (show if owner and not in staff mode)
        ...(!isStaffMode && canManageStaff() ? [{
          icon: Users,
          label: 'Staff Mode',
          description: 'Login as staff member',
          action: onStaffModeToggle
        }] : []),
        // Staff Mode Toggle (show if in staff mode)
        ...(isStaffMode ? [{
          icon: LogOut,
          label: 'Exit Staff Mode',
          description: `Logged in as ${currentStaff?.name}`,
          action: async () => {
            const pw = window.prompt('Owner password required to exit staff mode');
            if (pw === null) return;
            const res = await exitStaffMode(pw);
            alert(res.ok ? 'Exited staff mode' : res.error);
          }
        }] : []),
        {
          icon: HelpCircle,
          label: 'Getting Started Guide',
          description: 'Set up your online store step by step',
          // M3: the 'show-getting-started' event had no listener (checklist is
          // commented out in Dashboard.tsx), so the button did nothing.
          action: () => navigate('/online-store')
        }
      ]
    }
  ];

  const handleItemClick = (action?: () => void) => {
    // Close dialog first
    dialogRef.current?.close();
    onClose();
    // Execute action immediately
    action?.();
  };

  return (
    <dialog ref={dialogRef} className="more-menu">
      <div className="more-menu-content">
        <div className="more-menu-header">
          <h3>More Features</h3>
          <button
            onClick={() => {
              dialogRef.current?.close();
              onClose();
            }}
            className="more-menu-close"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="more-menu-scroll">
        <div className={`more-menu-sections${showScrollCue ? ' has-more' : ''}`} ref={sectionsRef}>
          {sections.map((section) => (
            <div key={section.title} className="more-menu-section">
              <h4 className={`more-menu-section-title more-menu-section-title--${section.theme}`}>
                {section.title}
              </h4>
              <div className={`more-menu-card more-menu-card--${section.theme}`}>
                {section.items.map((item, index) => {
                  const Icon = item.icon;
                  const isCustomerChats = item.label === 'Customer Chats';
                  const isLocked = (item as any).locked;

                  return (
                    <button
                      key={item.label}
                      className={`more-menu-item ${index > 0 ? 'more-menu-item--bordered' : ''} ${isLocked ? 'more-menu-item--locked' : ''}`}
                      onClick={() => handleItemClick(item.action)}
                      disabled={!item.action}
                      style={{ position: 'relative' }}
                    >
                      <div className="more-menu-item-content">
                        <div className={`more-menu-icon-wrapper more-menu-icon-wrapper--${section.theme}`}>
                          {isLocked ? (
                            <Lock size={18} className="more-menu-icon" />
                          ) : (
                            <>
                              <Icon size={18} className="more-menu-icon" />
                              {isCustomerChats && <NotificationBadge />}
                            </>
                          )}
                        </div>
                        <div className="more-menu-text">
                          <div className="more-menu-label">
                            {item.label}
                            {(item as any).badge && (
                              <span className={`more-menu-badge ${(item as any).badge === 'EARN MONEY' ? 'more-menu-badge--earn' : (item as any).badge === 'PRO' ? 'more-menu-badge--pro' : ''}`}>
                                {(item as any).badge}
                              </span>
                            )}
                          </div>
                          <div className="more-menu-description">{item.description}</div>
                        </div>
                        <div className="more-menu-chevron">›</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <p className="more-menu-powered">Powered by Storehouse</p>
        </div>
        <div className={`more-menu-fade${showScrollCue ? ' is-on' : ''}`} aria-hidden="true" />
        </div>
      </div>
    </dialog>
  );
};
