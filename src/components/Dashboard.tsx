/**
 * Dashboard Component - Ultra Minimal Version
 * Only 5 visible elements: Share banner, Actions, Today's Sales, Quick Sell, Search
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, MoreHorizontal, Eye, EyeOff, ChevronDown, ChevronUp, Trash2, Edit2 } from 'lucide-react';
import { getTodayRange, filterSalesByTimestamp } from '../lib/dateUtils';
import { ShareStoreBanner } from './ShareStoreBanner';
import { loadSettings, saveSettings } from '../state/settingsSchema';
import { MoreMenu } from './MoreMenu';
import { GettingStartedChecklist } from './GettingStartedChecklist';
import { StaffPinLogin } from './StaffPinLogin';
import { StaffPerformanceWidget } from './StaffPerformanceWidget';
import { ReferralRewardsWidget } from './ReferralRewardsWidget';
import { useStaff } from '../contexts/StaffContext';
import { currencyNGN } from '../utils/format';
import { useStore } from '../lib/supabase-hooks';
import { SalesChart } from './SalesChart';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard-minimal.css';

interface DashboardProps {
  sales: any[];
  items: any[];
  credits: any[];
  customers: any[];
  productVariantsMap?: Record<string, any[]>;
  onRecordSale: () => void;
  onAddItem: () => void;
  onViewHistory: () => void;
  onManageCredits: () => void;
  onViewLowStock?: () => void;
  onViewMoney?: () => void;
  onViewExpenses?: () => void;
  onViewSettings?: () => void;
  onDeleteItem?: (itemId: string | number) => void;
  onEditItem?: (item: any) => void;
  onShowCSVImport?: () => void;
  onSendDailySummary?: () => void;
  onExportData?: () => void;
  hasOpenModal?: boolean;
  userId?: string;
}

export function Dashboard({
  sales,
  items,
  productVariantsMap = {},
  onRecordSale,
  onAddItem,
  onViewHistory,
  onManageCredits,
  onViewLowStock,
  onViewMoney,
  onViewExpenses,
  onViewSettings,
  onDeleteItem,
  onEditItem,
  onShowCSVImport,
  onSendDailySummary,
  onExportData,
  userId,
}: DashboardProps) {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Staff permissions
  const { canEditProducts, canDeleteProducts, canAddProducts } = useStaff();

  // Load store from Supabase
  const { store, loading: storeLoading } = useStore(userId);
  const storeSlug = store?.store_slug || '';
  const businessName = store?.business_name || 'My Store';

  // Load showSalesData from localStorage (default to true if not set)
  const [showSalesData, setShowSalesData] = useState(() => {
    const saved = localStorage.getItem('storehouse-show-sales-data');
    return saved === null ? true : saved === 'true';
  });

  // Load quickSellExpanded from localStorage (default to true if not set)
  const [quickSellExpanded, setQuickSellExpanded] = useState(() => {
    const saved = localStorage.getItem('storehouse-quick-sell-expanded');
    return saved === null ? true : saved === 'true';
  });

  // Infinite scroll state
  const [displayedItemsCount, setDisplayedItemsCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Save showSalesData to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('storehouse-show-sales-data', String(showSalesData));
  }, [showSalesData]);

  // Save quickSellExpanded to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('storehouse-quick-sell-expanded', String(quickSellExpanded));
  }, [quickSellExpanded]);

  // Check if hero is dismissed
  const heroKey = userId
    ? `storehouse:${userId}:hero:online-store:dismissed`
    : 'storehouse:hero:online-store:dismissed';

  const [heroDismissed, setHeroDismissed] = useState(() => {
    const settings = loadSettings();
    const dismissed = localStorage.getItem(heroKey) === 'true';
    return dismissed || !settings.showOnlineStoreHero;
  });

  const handleDismissHero = () => {
    localStorage.setItem(heroKey, 'true');
    const settings = loadSettings();
    saveSettings({ ...settings, showOnlineStoreHero: false });
    setHeroDismissed(true);
  };

  const handleShowHero = () => {
    setHeroDismissed(false);
  };

  // Listen for hero re-enable from settings
  useEffect(() => {
    const handler = () => setHeroDismissed(false);
    window.addEventListener('show-online-store-hero', handler);
    return () => window.removeEventListener('show-online-store-hero', handler);
  }, []);

  // Today's sales
  const todaySales = useMemo(() => {
    const todayRange = getTodayRange();
    const filtered = filterSalesByTimestamp(sales, todayRange);
    // Calculate total from sellKobo * qty (sales don't have pre-calculated totalKobo)
    const total = filtered.reduce((sum, s) => {
      const saleTotal = (s.sellKobo || 0) * (s.qty || 0);
      return sum + saleTotal;
    }, 0);

    return {
      total,
      count: filtered.length,
      recent: [...filtered]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5)
        .map(s => {
          // Look up item name from items array if not in sale
          let itemName = s.itemName;
          if (!itemName && s.itemId) {
            const item = items.find(i => String(i.id) === String(s.itemId));
            itemName = item?.name || 'Unknown';
          }

          return {
            time: new Date(s.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            amount: (s.sellKobo || 0) * (s.qty || 0),
            itemName: itemName || 'Unknown',
            staffName: s.recorded_by_staff_name || null,
            staffRole: s.recorded_by_staff_role || null
          };
        })
    };
  }, [sales, items]);

  // Top 6 items for quick sell
  const quickSellItems = useMemo(() => {
    return items
      .filter(item => (item.qty || 0) > 0 && item.name) // Must have quantity and name
      .sort((a, b) => (b.qty || 0) - (a.qty || 0))
      .slice(0, 6)
      .map(item => ({
        id: item.id,
        name: item.name,
        price: item.sellKobo || item.sellingPriceKobo || item.sellingPrice || 0,
        quantity: item.qty || 0
      }));
  }, [items]);

  // Filtered items for search (all items, no slice)
  const filteredItems = useMemo(() => {
    // Remove duplicates by both ID and name (in case same item has multiple IDs)
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const uniqueItems = items.filter(item => {
      // Skip if no name
      if (!item.name) return false;

      // Skip if we've seen this ID or name already
      const idKey = String(item.id);
      const nameKey = item.name.toLowerCase().trim();

      if (seenIds.has(idKey) || seenNames.has(nameKey)) {
        return false;
      }

      seenIds.add(idKey);
      seenNames.add(nameKey);
      return true;
    });

    let filtered = uniqueItems;

    // Apply search filter if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = uniqueItems.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.barcode?.toLowerCase().includes(query)
      );
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return filtered; // Return all filtered items
  }, [items, searchQuery]);

  // Items to display (with infinite scroll limit)
  const displayedItems = useMemo(() => {
    return filteredItems.slice(0, displayedItemsCount);
  }, [filteredItems, displayedItemsCount]);

  // Reset displayed count when search query changes
  useEffect(() => {
    setDisplayedItemsCount(20);
  }, [searchQuery]);

  // Load more items for infinite scroll
  const loadMoreItems = () => {
    if (isLoadingMore || displayedItemsCount >= filteredItems.length) return;

    setIsLoadingMore(true);
    // Simulate slight delay for smooth UX
    setTimeout(() => {
      setDisplayedItemsCount(prev => prev + 20);
      setIsLoadingMore(false);
    }, 300);
  };

  // Handle scroll in table wrapper
  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Load more when within 150px of bottom
    if (scrollHeight - scrollTop <= clientHeight + 150 && !isLoadingMore) {
      loadMoreItems();
    }
  };

  const handleQuickSell = (item: typeof quickSellItems[0]) => {
    // Trigger the open-record-sale event to open modal with pre-selected item
    window.dispatchEvent(new CustomEvent('open-record-sale', {
      detail: { itemId: item.id }
    }));
  };

  const handleSelectItem = (item: any) => {
    console.log('[Dashboard] Item clicked:', item.id, item.name);
    // Trigger the open-record-sale event to open modal with pre-selected item
    const event = new CustomEvent('open-record-sale', {
      detail: { itemId: item.id }
    });
    window.dispatchEvent(event);
    console.log('[Dashboard] Event dispatched for item:', item.id);
  };

  // Helper function to get price from various possible field names
  const getItemPrice = (item: any): number => {
    return item.sellKobo || item.sellingPriceKobo || item.sellingPrice || 0;
  };

  // Handle delete item with confirmation
  const handleDeleteItem = (item: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event

    const confirmMessage = `Delete "${item.name}"?\n\nThis will permanently remove the item from your inventory.`;
    if (window.confirm(confirmMessage)) {
      if (onDeleteItem) {
        onDeleteItem(item.id);
      }
    }
  };

  // Handle edit item
  const handleEditItem = (item: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    console.log('[Dashboard] Edit item clicked:', item.name);
    if (onEditItem) {
      onEditItem(item);
    }
  };

  // Construct full store URL
  const storeUrl = storeSlug
    ? `${window.location.origin}/store/${storeSlug}`
    : window.location.origin;

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="dashboard-minimal">
      {/* Date Display */}
      <div className="dashboard-date">{dateString}</div>

      {/* Getting Started Checklist */}
      <GettingStartedChecklist
        hasItems={items.length > 0}
        hasSales={sales.length > 0}
        hasStoreUrl={!!storeSlug}
        onAddItem={onAddItem}
        onRecordSale={onRecordSale}
        onSetupStore={onViewSettings || (() => {})}
      />

      {/* 1. Share Store Banner */}
      {!heroDismissed && (
        <ShareStoreBanner
          storeUrl={storeUrl}
          storeName={businessName}
          onDismiss={handleDismissHero}
        />
      )}

      {/* 2. Core Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={onRecordSale}>
          💰 Record Sale
        </button>
        {canAddProducts() && (
          <button className="btn-secondary" onClick={onAddItem}>
            + Add Item
          </button>
        )}
        <button className="btn-more" onClick={() => setShowMoreMenu(true)}>
          <MoreHorizontal size={20} />
          More
        </button>
      </div>

      {/* 3. Today's Sales */}
      <div className="sales-card">
        <div className="sales-header">
          <h3>Today's Sales</h3>
          <button
            className="toggle-visibility-btn"
            onClick={() => setShowSalesData(!showSalesData)}
            aria-label={showSalesData ? "Hide sales data" : "Show sales data"}
            title={showSalesData ? "Hide amounts" : "Show amounts"}
          >
            {showSalesData ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        <div className="sales-total">{showSalesData ? currencyNGN(todaySales.total) : '******'}</div>
        <div className="sales-count">{todaySales.count} sale{todaySales.count !== 1 ? 's' : ''}</div>

        {todaySales.recent.length > 0 && (
          <div className="recent-sales">
            <div className="recent-sales-header">Recent</div>
            {todaySales.recent.map((sale, index) => (
              <div key={index} className="sale-row">
                <div className="sale-row-main">
                  <span className="sale-time">{sale.time}</span>
                  <span className="sale-item">{sale.itemName}</span>
                  <span className="sale-amount">{showSalesData ? currencyNGN(sale.amount) : '***'}</span>
                </div>
                {sale.staffName && (
                  <div className="sale-staff-info">
                    👤 by {sale.staffName} {sale.staffRole && `(${sale.staffRole})`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {todaySales.count === 0 && (
          <div className="empty-state">No sales yet today</div>
        )}
      </div>

      {/* Staff Performance Widget - Only shows if staff recorded sales today */}
      <StaffPerformanceWidget
        sales={todaySales.recent.length > 0 ? sales.filter(s => {
          const todayRange = getTodayRange();
          return s.createdAt >= todayRange.start && s.createdAt < todayRange.end;
        }) : []}
        showSalesData={showSalesData}
      />

      {/* Referral Rewards Widget - Shows if user has referrals */}
      <ReferralRewardsWidget
        userId={userId}
        onOpenFullDashboard={() => navigate('/referrals')}
      />

      {/* Sales Trend Chart - Last 7 days */}
      {sales.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          <SalesChart sales={sales} days={7} />
        </div>
      )}

      {/* 4. Quick Sell Grid */}
      <div className="quick-sell-card">
        <div
          className="quick-sell-header"
          onClick={() => setQuickSellExpanded(!quickSellExpanded)}
        >
          <h3>Quick Sell</h3>
          <button
            className="collapse-toggle-btn"
            aria-label={quickSellExpanded ? "Collapse Quick Sell" : "Expand Quick Sell"}
            title={quickSellExpanded ? "Collapse" : "Expand"}
          >
            {quickSellExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {quickSellExpanded && (
          <>
            {quickSellItems.length > 0 ? (
              <>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  👇 Tap any item to record a sale
                </p>
                <div className="items-grid">
                  {quickSellItems.map(item => (
                    <button
                      key={item.id}
                      className="quick-item"
                      onClick={() => handleQuickSell(item)}
                    >
                      <div className="quick-item-name">{item.name}</div>
                      <div className="quick-item-price">{currencyNGN(item.price)}</div>
                      <div className="quick-item-qty">📦 {item.quantity} in stock</div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '32px 20px',
                background: '#f9fafb',
                borderRadius: '12px',
                border: '2px dashed #d1d5db'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#374151' }}>
                  No Items Yet
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
                  Add products to your inventory first.<br />
                  They'll appear here for quick selling!
                </p>
                <button
                  onClick={onAddItem}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  + Add Your First Item
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 5. Search Items Table */}
      <div className="search-card">
        <div className="search-header">
          <Search size={20} className="search-icon" />
          <input
            type="search"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {onShowCSVImport && (
            <button
              onClick={onShowCSVImport}
              style={{
                padding: '8px 12px',
                background: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginLeft: '8px'
              }}
            >
              📥 Import
            </button>
          )}
        </div>

        {filteredItems.length > 0 ? (
          <>
            <div className="items-table-wrapper" onScroll={handleTableScroll}>
              <table className="items-table">
                <thead>
                  <tr>
                    <th>ITEM</th>
                    <th className="text-right">QTY</th>
                    <th className="text-right">PRICE</th>
                    <th className="text-center" style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedItems.map(item => {
                    const variants = productVariantsMap[item.id] || [];
                    const hasVariants = variants.length > 0;

                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="item-row"
                      >
                        <td className="item-name">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {item.name}
                            {hasVariants && (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px',
                                background: '#3b82f6',
                                color: 'white',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 600
                              }}>
                                {variants.length} variant{variants.length !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right">{item.qty || 0}</td>
                        <td className="text-right">{currencyNGN(getItemPrice(item))}</td>
                        <td className="text-center">
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {canEditProducts() && (
                              <button
                                className="edit-item-btn"
                                onClick={(e) => handleEditItem(item, e)}
                                aria-label={`Edit ${item.name}`}
                                title="Edit item"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#3b82f6',
                                  transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#3b82f6'}
                              >
                                <Edit2 size={16} />
                              </button>
                            )}
                            {canDeleteProducts() && (
                              <button
                                className="delete-item-btn"
                                onClick={(e) => handleDeleteItem(item, e)}
                                aria-label={`Delete ${item.name}`}
                                title="Delete item"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {isLoadingMore && (
                <div className="items-loading">
                  <div className="items-loading-spinner"></div>
                  <span style={{ marginLeft: '8px' }}>Loading more items...</span>
                </div>
              )}
              {displayedItems.length < filteredItems.length && !isLoadingMore && (
                <div className="items-loading" style={{ color: 'var(--text-subtle)' }}>
                  Showing {displayedItems.length} of {filteredItems.length} items
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">No items found</div>
        )}
      </div>

      {/* More Menu */}
      {showMoreMenu && (
        <MoreMenu
          onClose={() => setShowMoreMenu(false)}
          onViewInventory={() => {
            setShowMoreMenu(false);
            // Inventory is visible on main dashboard via search
          }}
          onViewLowStock={onViewLowStock}
          onViewMoney={onViewMoney}
          onViewReports={onViewHistory}
          onViewCustomers={onManageCredits}
          onViewExpenses={onViewExpenses}
          onViewSettings={onViewSettings}
          onShowOnlineStore={heroDismissed ? handleShowHero : undefined}
          onSendDailySummary={onSendDailySummary}
          onExportData={onExportData}
          onStaffModeToggle={() => {
            setShowMoreMenu(false);
            setShowStaffLogin(true);
          }}
        />
      )}

      {/* Staff PIN Login Modal */}
      <StaffPinLogin
        isOpen={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
      />
    </div>
  );
}
