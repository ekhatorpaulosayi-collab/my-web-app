/**
 * Modern Tab Navigation Component for Online Store Settings
 * World-class UX pattern used by Shopify, Stripe, Vercel
 */

import React from 'react';
import './TabNav.css';

export type TabId = 'branding' | 'payments' | 'social';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
  description?: string;
}

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
  tabs: Tab[];
}

export const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div className="tab-nav">
      <div className="tab-nav-list">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-nav-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const STORE_TABS: Tab[] = [
  {
    id: 'branding',
    label: 'Branding',
    icon: '🎨',
    description: 'Logo, about, and business hours'
  },
  {
    id: 'payments',
    label: 'Payments & Delivery',
    icon: '💳',
    description: 'Payment methods and shipping'
  },
  {
    id: 'social',
    label: 'Social & Marketing',
    icon: '📱',
    description: 'Social media and promo codes'
  }
];
