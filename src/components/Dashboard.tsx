/**
 * Dashboard Component - Ultra Minimal Version
 * Only 5 visible elements: Share banner, Actions, Today's Sales, Quick Sell, Search
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, MoreHorizontal, Eye, EyeOff, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { getTodayRange, filterSalesByTimestamp } from '../lib/dateUtils';
import { ShareStoreBanner } from './ShareStoreBanner';
import { loadSettings, saveSettings } from '../state/settingsSchema';
import { MoreMenu } from './MoreMenu';
import { currencyNGN } from '../utils/format';
import '../styles/dashboard-minimal.css';

interface DashboardProps {
  sales: any[];
  items: any[];
  credits: any[];
  customers: any[];
  onRecordSale: () => void;
  onAddItem: () => void;
  onViewHistory: () => void;
  onManageCredits: () => void;
  onViewLowStock?: () => void;
  onViewMoney?: () => void;
  onViewExpenses?: () => void;
  onViewSettings?: () => void;
  onDeleteItem?: (itemId: string | number) => void;
  hasOpenModal?: boolean;
  userId?: string;
}

export function Dashboard({
  sales,
  items,
  onRecordSale,
  onAddItem,
  onViewHistory,
  onManageCredits,
  onViewLowStock,
  onViewMoney,
  onViewExpenses,
  onViewSettings,
  onDeleteItem,
  userId,
}: DashboardProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
            itemName: itemName || 'Unknown'
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

  // Filtered items for search
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

    return filtered.slice(0, 20);
  }, [items, searchQuery]);

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

  return (
    <div className="dashboard-minimal">
      {/* 1. Share Store Banner */}
      {!heroDismissed && (
        <ShareStoreBanner onDismiss={handleDismissHero} />
      )}

      {/* 2. Core Action Buttons */}
      <div className="action-buttons">
        <button className="btn-primary" onClick={onRecordSale}>
          💰 Record Sale
        </button>
        <button className="btn-secondary" onClick={onAddItem}>
          + Add Item
        </button>
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
                <span className="sale-time">{sale.time}</span>
                <span className="sale-item">{sale.itemName}</span>
                <span className="sale-amount">{showSalesData ? currencyNGN(sale.amount) : '***'}</span>
              </div>
            ))}
          </div>
        )}

        {todaySales.count === 0 && (
          <div className="empty-state">No sales yet today</div>
        )}
      </div>

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
              <div className="items-grid">
                {quickSellItems.map(item => (
                  <button
                    key={item.id}
                    className="quick-item"
                    onClick={() => handleQuickSell(item)}
                  >
                    <div className="quick-item-name">{item.name}</div>
                    <div className="quick-item-price">{currencyNGN(item.price)}</div>
                    <div className="quick-item-qty">{item.quantity} in stock</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">No items available</div>
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
        </div>

        {filteredItems.length > 0 ? (
          <div className="items-table-wrapper">
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
                {filteredItems.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className="item-row"
                  >
                    <td className="item-name">{item.name}</td>
                    <td className="text-right">{item.qty || 0}</td>
                    <td className="text-right">{currencyNGN(getItemPrice(item))}</td>
                    <td className="text-center">
                      <button
                        className="delete-item-btn"
                        onClick={(e) => handleDeleteItem(item, e)}
                        aria-label={`Delete ${item.name}`}
                        title="Delete item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        />
      )}
    </div>
  );
}
