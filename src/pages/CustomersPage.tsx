/**
 * Customers Page
 * View all customers with purchase history and stats
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowLeft, Phone, Mail, Calendar, ShoppingBag, DollarSign, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSales } from '../lib/supabase-hooks';
import { getDebts } from '../state/debts';
import { openWhatsApp } from '../utils/wa';

interface Customer {
  name: string;
  phone?: string;
  email?: string;
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: Date;
  purchaseCount: number;
  purchases: any[];
  debtBalance?: number;
  debtDueDate?: string;
  hasOverdueDebt?: boolean;
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Use the sales hook to fetch data
  const { sales, loading } = useSales(currentUser?.uid, undefined, undefined);

  // Load business settings for WhatsApp messages
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('storehouse-settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setBusinessName(settings.businessName || 'Your Store');
      } catch (e) {
        console.error('Error loading business settings:', e);
        setBusinessName('Your Store');
      }
    } else {
      setBusinessName('Your Store');
    }
  }, []);

  // Aggregate customer data from sales and debts
  const customers = useMemo(() => {
    const customerMap: Record<string, Customer> = {};

    // First, aggregate from sales
    sales.forEach(sale => {
      const customerName = sale.customerName || 'Walk-in Customer';
      const customerKey = customerName.toLowerCase();

      if (!customerMap[customerKey]) {
        customerMap[customerKey] = {
          name: customerName,
          phone: sale.phone,
          email: sale.email,
          totalPurchases: 0,
          totalSpent: 0,
          lastPurchase: new Date(sale.createdAt || sale.date),
          purchaseCount: 0,
          purchases: [],
          debtBalance: 0
        };
      }

      const customer = customerMap[customerKey];
      const saleAmount = (sale.sellKobo || 0) * (sale.qty || 0) / 100;

      customer.totalSpent += saleAmount;
      customer.purchaseCount += 1;
      customer.purchases.push(sale);
      customer.totalPurchases += sale.qty || 0;

      // Update last purchase date
      const saleDate = new Date(sale.createdAt || sale.date);
      if (saleDate > customer.lastPurchase) {
        customer.lastPurchase = saleDate;
      }

      // Update contact info if available
      if (sale.phone && !customer.phone) {
        customer.phone = sale.phone;
      }
      if (sale.email && !customer.email) {
        customer.email = sale.email;
      }
    });

    // Second, merge in debt data
    const debts = getDebts();
    const today = new Date().toISOString().slice(0, 10);

    debts.forEach(debt => {
      const customerKey = debt.customerName.toLowerCase();

      // Match debt to existing customer or create new entry
      if (customerMap[customerKey]) {
        const customer = customerMap[customerKey];
        // Only count unpaid debts
        if (debt.status !== 'paid') {
          customer.debtBalance = (customer.debtBalance || 0) + debt.amountRemaining;

          // Update phone if debt has one but customer doesn't
          if (debt.phone && !customer.phone) {
            customer.phone = debt.phone;
          }

          // Track earliest due date and overdue status
          if (debt.dueDate) {
            if (!customer.debtDueDate || debt.dueDate < customer.debtDueDate) {
              customer.debtDueDate = debt.dueDate;
              customer.hasOverdueDebt = debt.dueDate < today;
            }
          }
        }
      } else if (debt.status !== 'paid') {
        // Customer has debt but no purchase history yet
        customerMap[customerKey] = {
          name: debt.customerName,
          phone: debt.phone,
          email: undefined,
          totalPurchases: 0,
          totalSpent: 0,
          lastPurchase: new Date(debt.createdAt),
          purchaseCount: 0,
          purchases: [],
          debtBalance: debt.amountRemaining,
          debtDueDate: debt.dueDate,
          hasOverdueDebt: debt.dueDate ? debt.dueDate < today : false
        };
      }
    });

    // Convert to array and sort: overdue debts first, then by total spent
    return Object.values(customerMap)
      .sort((a, b) => {
        // Prioritize customers with overdue debt
        if (a.hasOverdueDebt && !b.hasOverdueDebt) return -1;
        if (!a.hasOverdueDebt && b.hasOverdueDebt) return 1;

        // Then by debt balance
        const aDebt = a.debtBalance || 0;
        const bDebt = b.debtBalance || 0;
        if (aDebt !== bDebt) return bDebt - aDebt;

        // Finally by total spent
        return b.totalSpent - a.totalSpent;
      });
  }, [sales]);

  // Filter customers by search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;

    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  // Send WhatsApp debt reminder
  const handleSendDebtReminder = (customer: Customer) => {
    if (!customer.phone) {
      alert('No phone number available for this customer');
      return;
    }

    if (!customer.debtBalance || customer.debtBalance <= 0) {
      alert('This customer has no outstanding debt');
      return;
    }

    const dueDateStr = customer.debtDueDate
      ? new Date(customer.debtDueDate).toLocaleDateString('en-NG', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : 'as soon as possible';

    const isOverdue = customer.hasOverdueDebt;
    const urgency = isOverdue ? '⚠️ OVERDUE - ' : '';

    const message = `Hello ${customer.name},

${urgency}This is a friendly reminder about your outstanding balance:

💰 Amount Due: ${formatCurrency(customer.debtBalance)}
📅 Due Date: ${dueDateStr}

Please make payment at your earliest convenience.

Thank you for your business! 🙏

— ${businessName || 'Your Store'}`;

    openWhatsApp(customer.phone, message);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F6F6F7'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid #E5E7EB',
            borderTopColor: '#00894F',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 12px'
          }}></div>
          <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
            Loading customers...
          </p>
        </div>
      </div>
    );
  }

  // Customer detail view
  if (selectedCustomer) {
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
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <button
            onClick={() => setSelectedCustomer(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              color: '#374151'
            }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#1f2937',
            margin: 0
          }}>
            {selectedCustomer.name}
          </h1>
        </div>

        {/* Customer Stats */}
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
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Total Spent
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#00894F' }}>
              {formatCurrency(selectedCustomer.totalSpent)}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Total Purchases
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
              {selectedCustomer.purchaseCount}
            </div>
          </div>

          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
              Debt Balance
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: selectedCustomer.debtBalance && selectedCustomer.debtBalance > 0 ? '#dc2626' : '#9ca3af' }}>
              {selectedCustomer.debtBalance && selectedCustomer.debtBalance > 0
                ? formatCurrency(selectedCustomer.debtBalance)
                : '₦0'}
            </div>
            {selectedCustomer.hasOverdueDebt && (
              <div style={{
                marginTop: '6px',
                fontSize: '11px',
                color: '#dc2626',
                fontWeight: 600,
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                ⚠️ Overdue
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Reminder Button */}
        {selectedCustomer.debtBalance && selectedCustomer.debtBalance > 0 && selectedCustomer.phone && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '4px' }}>
                  Outstanding Debt
                </h3>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                  Send a friendly payment reminder via WhatsApp
                  {selectedCustomer.debtDueDate && (
                    <span style={{ display: 'block', marginTop: '4px', color: selectedCustomer.hasOverdueDebt ? '#dc2626' : '#6b7280', fontWeight: 500 }}>
                      Due: {formatDate(new Date(selectedCustomer.debtDueDate))}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleSendDebtReminder(selectedCustomer)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  background: selectedCustomer.hasOverdueDebt ? '#dc2626' : '#25D366',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }}
              >
                <MessageCircle size={18} />
                Send Reminder
              </button>
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(selectedCustomer.phone || selectedCustomer.email) && (
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', marginBottom: '12px' }}>
              Contact Information
            </h3>
            {selectedCustomer.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Phone size={16} color="#6b7280" />
                <span style={{ color: '#374151' }}>{selectedCustomer.phone}</span>
              </div>
            )}
            {selectedCustomer.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="#6b7280" />
                <span style={{ color: '#374151' }}>{selectedCustomer.email}</span>
              </div>
            )}
          </div>
        )}

        {/* Purchase History */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              Purchase History ({selectedCustomer.purchases.length})
            </h3>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    DATE
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    ITEM
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    QTY
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    AMOUNT
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    PAYMENT
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedCustomer.purchases
                  .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
                  .map((purchase, index) => {
                    const amount = (purchase.sellKobo || 0) * (purchase.qty || 0) / 100;
                    return (
                      <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#374151' }}>
                          {formatDate(new Date(purchase.createdAt || purchase.date))}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                          {purchase.itemName}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#374151', textAlign: 'right' }}>
                          {purchase.qty}
                        </td>
                        <td style={{ padding: '12px', fontSize: '14px', color: '#00894F', textAlign: 'right', fontWeight: 600 }}>
                          {formatCurrency(amount)}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: purchase.paymentMethod === 'credit' ? '#fef3c7' : '#dcfce7',
                            color: purchase.paymentMethod === 'credit' ? '#92400e' : '#166534',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {purchase.paymentMethod || 'cash'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Customer list view
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
            color: '#1f2937',
            marginBottom: '4px'
          }}>
            Customers
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '10px 20px',
            background: '#f3f4f6',
            border: '1px solid #d1d5db',
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

      {/* Search */}
      <div style={{
        position: 'relative',
        marginBottom: '24px'
      }}>
        <Search
          size={20}
          style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
          }}
        />
        <input
          type="text"
          placeholder="Search customers by name, phone, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 12px 12px 44px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontFamily: 'inherit'
          }}
        />
      </div>

      {/* Customer Stats Summary */}
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
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Total Customers
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1f2937' }}>
            {customers.length}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Total Revenue
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#00894F' }}>
            {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0))}
          </div>
        </div>

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
            Avg. Customer Value
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#3b82f6' }}>
            {formatCurrency(customers.reduce((sum, c) => sum + c.totalSpent, 0) / Math.max(customers.length, 1))}
          </div>
        </div>
      </div>

      {/* Customer List */}
      {filteredCustomers.length > 0 ? (
        <div style={{
          background: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    CUSTOMER
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    CONTACT
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    PURCHASES
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    TOTAL SPENT
                  </th>
                  <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    DEBT BALANCE
                  </th>
                  <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => {
                  const hasDebt = customer.debtBalance && customer.debtBalance > 0;
                  const hasPhone = !!customer.phone;

                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background 0.2s',
                        background: customer.hasOverdueDebt ? '#fef2f2' : 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = customer.hasOverdueDebt ? '#fee2e2' : '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = customer.hasOverdueDebt ? '#fef2f2' : 'transparent'}
                    >
                      <td
                        style={{ padding: '16px', cursor: 'pointer' }}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '14px' }}>
                            {customer.name}
                          </div>
                          {customer.hasOverdueDebt && (
                            <span style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              background: '#dc2626',
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: 600,
                              textTransform: 'uppercase'
                            }}>
                              OVERDUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td
                        style={{ padding: '16px', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {customer.phone || customer.email || '—'}
                      </td>
                      <td
                        style={{ padding: '16px', fontSize: '14px', color: '#374151', textAlign: 'right', cursor: 'pointer' }}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {customer.purchaseCount}
                      </td>
                      <td
                        style={{ padding: '16px', fontSize: '14px', color: '#00894F', textAlign: 'right', fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          fontSize: '14px',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: hasDebt ? '#dc2626' : '#9ca3af',
                          cursor: 'pointer'
                        }}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        {hasDebt ? formatCurrency(customer.debtBalance!) : '—'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        {hasDebt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendDebtReminder(customer);
                            }}
                            disabled={!hasPhone}
                            title={hasPhone ? 'Send WhatsApp reminder' : 'No phone number'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              background: hasPhone ? (customer.hasOverdueDebt ? '#dc2626' : '#25D366') : '#e5e7eb',
                              color: hasPhone ? 'white' : '#9ca3af',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: hasPhone ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s',
                              boxShadow: hasPhone ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (hasPhone) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (hasPhone) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                              }
                            }}
                          >
                            <MessageCircle size={14} />
                            Remind
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'white',
          padding: '60px 20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '8px' }}>
            No customers found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            {searchQuery ? 'Try a different search term' : 'Start recording sales to see your customers here'}
          </p>
        </div>
      )}
    </div>
  );
}
