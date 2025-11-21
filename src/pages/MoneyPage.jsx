import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getItems } from '../db/idb';
import TaxPanel from '../components/TaxPanel';
import '../styles/MoneyPage.css';

export default function MoneyPage({ isOpen, onClose }) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Load items when page opens
  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen]);

  const loadItems = async () => {
    try {
      const allItems = await getItems();
      setItems(allItems);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  // Filter items based on search
  const getFilteredItems = () => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item =>
      item.name?.toLowerCase().includes(query)
    );
  };

  // Format number with commas, no spaces
  const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  if (!isOpen) return null;

  return (
    <div className="money-page-overlay" onClick={onClose}>
      <div className="money-page-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="money-page-header">
          <h2>💰 Money & Profits</h2>
          <button className="money-page-close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="money-page-content">
          {/* Tax Panel - Shows monthly profit and tax */}
          <TaxPanel />

          {/* Items with Costs & Profits */}
          <div className="money-items-section">
            <h3>Items with Costs & Profits</h3>

            {/* Search Bar */}
            <div className="money-search-bar">
              <input
                type="text"
                className="money-search-input"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Items Table */}
            <div className="money-table-container">
              <table className="money-items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Cost</th>
                    <th>Price</th>
                    <th>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredItems().length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>
                        No items found
                      </td>
                    </tr>
                  ) : (
                    getFilteredItems().map(item => {
                      const purchaseNaira = Math.round((item.purchaseKobo ?? 0) / 100);
                      const sellNaira = Math.round((item.sellKobo ?? item.sellingPrice ?? 0) / 100);
                      const profitNaira = sellNaira - purchaseNaira;

                      return (
                        <tr key={item.id}>
                          <td className="cell-item">{item.name}</td>
                          <td className="cell-qty">{formatNumber(item.qty ?? 0)}</td>
                          <td className="cell-cost">₦{formatNumber(purchaseNaira)}</td>
                          <td className="cell-price">₦{formatNumber(sellNaira)}</td>
                          <td
                            className="cell-profit"
                            style={{ color: profitNaira > 0 ? '#16a34a' : '#dc2626', fontWeight: '600' }}
                          >
                            ₦{formatNumber(profitNaira)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
