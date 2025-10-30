import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import { useStrings } from './hooks/useStrings';
import {
  initDB,
  seedDemoItems,
  removeDemoItems,
  getItems,
  addItem,
  updateItem,
  checkItemExists,
  getCredits,
  getCreditsByStatus,
  getCustomer,
  addPayment,
  getDB,
  formatNGN,
  toKobo,
  parseQty,
  localDayKey,
  todayPlusDaysISO,
  isValidNG,
  toWhatsAppTarget,
  buildCreditReceipt,
  findCustomerByLowerName,
  updateCustomer,
  addCustomer
} from './db/idb';
import { buildWhatsAppSummary } from './lib/share.js';
import { computeTotals } from './lib/salesTotals.js';
import ReceiptPreview from './components/ReceiptPreview.jsx';
import Chip from './components/ui/Chip.jsx';
import CustomerDebtDrawer from './components/CustomerDebtDrawer.tsx';
import RecordSaleModal from './components/RecordSaleModal.tsx';
import BusinessSettings from './components/BusinessSettings.tsx';
import {
  getDebts,
  addDebtNotify,
  markDebtPaidNotify,
  totalOpenDebt,
  openCount,
  isOverdue,
  countsByStatus,
  searchDebts,
  subscribeDebts
} from './state/debts.ts';
import { logStockMovement } from './lib/stockMovements.ts';
import { createDebtReminderLink, isValidNigerianPhone } from './utils/whatsapp.ts';
import { loadSales, saveSales, loadDebts, saveDebts, formatNGN as formatCurrency, uid } from './lib/store.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { safeParse, saveJson } from './utils/safeJson.ts';
import { openWhatsApp } from './utils/wa.ts';
import { formatNaira, safeMoney } from './utils/money.ts';
import { useBusinessProfile } from './contexts/BusinessProfile.jsx';
import CurrentDate from './components/CurrentDate.tsx';

function App() {
  // Get strings for branding
  const strings = useStrings();

  // Business profile context
  const { profile, isProfileComplete } = useBusinessProfile();

  // Utility function to format number with commas
  const formatNumberWithCommas = (value) => {
    // Remove all non-digit characters
    const cleanValue = value.replace(/\D/g, '');
    // Add commas for thousands
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Utility function to parse number from formatted string
  const parseFormattedNumber = (value) => {
    return value.replace(/,/g, '');
  };

  // Settings state - synced with BusinessSettings component
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('storehouse-settings');
    return saved ? JSON.parse(saved) : {
      businessName: '',
      ownerName: '',
      phoneNumber: '',
      quickSellEnabled: true // Tap item to open Record Sale
    };
  });

  // Beta Tester Mode - unlocks all premium features for testing
  const [isBetaTester, setIsBetaTester] = useState(() => {
    const saved = localStorage.getItem('storehouse-beta-mode');
    return saved ? JSON.parse(saved) : true; // Default true for beta testing
  });

  // Listen for settings updates from BusinessSettings component
  useEffect(() => {
    const handleSettingsUpdate = (e) => {
      setSettings(e.detail);
    };
    window.addEventListener('settings:saved', handleSettingsUpdate);
    return () => window.removeEventListener('settings:saved', handleSettingsUpdate);
  }, []);

  // Items from IndexedDB
  const [items, setItems] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showRecordSale, setShowRecordSale] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showSalesData, setShowSalesData] = useState(true); // Renamed for clarity - true = revealed, false = hidden
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null); // For expandable table rows
  const [showCreditsDrawer, setShowCreditsDrawer] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [creditsTab, setCreditsTab] = useState('all'); // 'all' | 'overdue' | 'paid'
  const [debtSearchQuery, setDebtSearchQuery] = useState(''); // DebtDrawer upgrade
  const [creditCustomers, setCreditCustomers] = useState({}); // Map of customerId -> customer data
  const [confirmMarkPaid, setConfirmMarkPaid] = useState(null); // Customer to mark paid
  const [lastReminders, setLastReminders] = useState(() => {
    const saved = localStorage.getItem('whatsapp-reminders');
    return saved ? JSON.parse(saved) : {};
  });

  // Plan management
  const [currentPlan, setCurrentPlan] = useState(() => {
    return localStorage.getItem('storehouse-plan') || 'FREE';
  });
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showFirstSaleModal, setShowFirstSaleModal] = useState(false);
  const [showEODModal, setShowEODModal] = useState(false);
  const [eodFormat, setEodFormat] = useState('readable');

  // Trial management
  const [trialDaysLeft, setTrialDaysLeft] = useState(14);
  const [showTrialBanner, setShowTrialBanner] = useState(false);
  const [trialNudgeMessage, setTrialNudgeMessage] = useState('');

  // PWA & Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSales, setPendingSales] = useState(0);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  // Add Item form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Fashion & Clothing', // Default category
    qty: '',
    purchasePrice: '',
    sellingPrice: '',
    reorderLevel: '10' // Default reorder level
  });

  // State for formatted price displays
  const [formattedPrices, setFormattedPrices] = useState({
    purchasePrice: '',
    sellingPrice: ''
  });

  // Calculate profit and margin when prices change
  const [calculatedProfit, setCalculatedProfit] = useState({ profit: 0, margin: 0 });

  // Stock mode for updating existing items ('add' = increment, 'replace' = set total)
  const [existingItem, setExistingItem] = useState(null);
  const [stockMode, setStockMode] = useState('add'); // 'add' | 'replace'

  // Sales tracking state (now from IndexedDB)
  const [sales, setSales] = useState([]);
  const [salesSearchTerm, setSalesSearchTerm] = useState('');
  const [salesDateFilter, setSalesDateFilter] = useState('all');
  const [salesPaymentFilter, setSalesPaymentFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Record sale form state
  const [saleForm, setSaleForm] = useState({
    itemId: '',
    quantity: '',
    sellPrice: '',
    paymentMethod: 'cash',
    customerName: '',
    // Stage 3: Credit sale fields
    isCreditSale: false,
    phone: '',
    dueDate: todayPlusDaysISO(7), // Default: today + 7 days
    sendWhatsApp: true, // Default ON
    hasConsent: false, // Consent checkbox
    note: '' // Optional message to customer
  });

  // Ref for customer name input to enable autofocus when credit mode activates
  const customerNameInputRef = useRef(null);

  // Toast state for undo
  const [showToast, setShowToast] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // General info toast state
  const [infoToast, setInfoToast] = useState('');

  // Item search for Record Sale
  const [itemSearchTerm, setItemSearchTerm] = useState('');

  // Calculator state
  const [calcForm, setCalcForm] = useState({
    itemId: '',
    itemName: '',
    price: '',
    quantity: '',
    total: 0
  });

  // Low Stock modal state
  const [showLowStock, setShowLowStock] = useState(false);
  const [stockUpdateForm, setStockUpdateForm] = useState({});
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [editingStockId, setEditingStockId] = useState(null); // Track which item is being edited inline

  // Debt/Credit tracking state
  const [showDebts, setShowDebts] = useState(false);
  const [debts, setDebts] = useState(() => getDebts());
  const [filterStatus, setFilterStatus] = useState('all'); // all, unpaid, paid

  // Credits from IndexedDB (v2 schema)
  const [credits, setCredits] = useState([]);

  // Save items to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('storehouse-items', JSON.stringify(items));
  }, [items]);

  // Listen for debts changes to update KPI and drawer instantly
  useEffect(() => {
    const unsubscribe = subscribeDebts(() => {
      setDebts(getDebts());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (formData.purchasePrice && formData.sellingPrice) {
      const purchase = parseFloat(formData.purchasePrice);
      const selling = parseFloat(formData.sellingPrice);

      if (purchase > 0 && selling > 0) {
        const profit = selling - purchase;
        const margin = ((profit / selling) * 100);

        setCalculatedProfit({
          profit: profit,
          margin: margin
        });
      } else {
        setCalculatedProfit({ profit: 0, margin: 0 });
      }
    } else {
      setCalculatedProfit({ profit: 0, margin: 0 });
    }
  }, [formData.purchasePrice, formData.sellingPrice]);

  // Auto-focus customer name input when credit mode is activated
  useEffect(() => {
    if (saleForm.isCreditSale && customerNameInputRef.current) {
      // Use setTimeout to ensure the input is rendered before focusing
      setTimeout(() => {
        customerNameInputRef.current?.focus();
      }, 100);
    }
  }, [saleForm.isCreditSale]);

  // Dev-only: Clear corrupted debts with Ctrl+Shift+D
  useEffect(() => {
    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        localStorage.removeItem('debts');
        localStorage.removeItem('storehouse:debts');
        alert('Cleared debts in localStorage.');
        location.reload();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Calculate today's sales from IndexedDB (STAGE 3: Updated for new schema)
  const getTodaysSales = () => {
    // Safety check: ensure sales is an array
    if (!sales || !Array.isArray(sales)) {
      return {
        total: 0,
        cash: 0,
        credit: 0,
        profit: 0,
        transactions: 0
      };
    }

    // Safety check: ensure credits is an array
    if (!credits || !Array.isArray(credits)) {
      console.warn('[getTodaysSales] Credits not loaded yet');
    }

    // Safety check: ensure items is an array
    if (!items || !Array.isArray(items)) {
      console.warn('[getTodaysSales] Items not loaded yet');
    }

    const todayKey = localDayKey();
    const todaySales = sales.filter(sale => sale.dayKey === todayKey);

    // Total sales in kobo
    const totalKobo = todaySales.reduce((sum, sale) => {
      return sum + (sale.qty * sale.sellKobo);
    }, 0);

    // Count credit sales by checking if saleId exists in credits
    const creditSaleIds = Array.isArray(credits) ? new Set(credits.map(c => c.saleId)) : new Set();
    const creditSalesKobo = todaySales
      .filter(sale => creditSaleIds.has(sale.id))
      .reduce((sum, sale) => sum + (sale.qty * sale.sellKobo), 0);

    const cashSalesKobo = totalKobo - creditSalesKobo;

    // Calculate profit
    const profitKobo = todaySales.reduce((sum, sale) => {
      if (!Array.isArray(items)) return sum;
      const item = items.find(i => i.id === sale.itemId);
      if (item) {
        const profitPerUnit = sale.sellKobo - (item.purchaseKobo || 0);
        return sum + (profitPerUnit * sale.qty);
      }
      return sum;
    }, 0);

    // Convert kobo to naira
    return {
      total: Math.round(totalKobo / 100),
      cash: Math.round(cashSalesKobo / 100),
      credit: Math.round(creditSalesKobo / 100),
      profit: Math.round(profitKobo / 100),
      transactions: todaySales.length
    };
  };

  const todaysSales = getTodaysSales();

  // Trial logic - check on mount
  useEffect(() => {
    const trialStart = localStorage.getItem('trialStart');
    if (!trialStart) {
      // First time user - start trial
      localStorage.setItem('trialStart', Date.now().toString());
      setTrialDaysLeft(14);
      setShowTrialBanner(true);
    } else {
      // Calculate days left
      const startTime = parseInt(trialStart);
      const now = Date.now();
      const daysElapsed = Math.floor((now - startTime) / 86400000);
      const daysLeft = 14 - daysElapsed;

      setTrialDaysLeft(daysLeft);

      if (daysLeft > 0 && daysLeft <= 14) {
        setShowTrialBanner(true);

        // Show nudges
        if (daysLeft === 7) {
          setTrialNudgeMessage('Week left in trial! Upgrade to keep features');
        } else if (daysLeft === 1) {
          setTrialNudgeMessage('Trial ends tomorrow! Upgrade now');
        }
      } else if (daysLeft <= 0) {
        // Trial expired - downgrade to FREE
        if (currentPlan !== 'FREE') {
          setCurrentPlan('FREE');
          localStorage.setItem('storehouse-plan', 'FREE');
          displayToast('Your trial has ended. You have been switched to the FREE plan.');
        }
        setShowTrialBanner(false);
      }
    }
  }, []);

  // Initialize IndexedDB and load data
  useEffect(() => {
    const initializeData = async () => {
      try {
        await initDB();
        await seedDemoItems();

        // Load items
        const loadedItems = await getItems();
        setItems(loadedItems);

        // Load sales from IndexedDB
        const db = await getDB();
        const allSales = await new Promise((resolve, reject) => {
          const tx = db.transaction(['sales'], 'readonly');
          const salesStore = tx.objectStore('sales');
          const getAllRequest = salesStore.getAll();

          getAllRequest.onsuccess = () => {
            resolve(getAllRequest.result);
          };

          getAllRequest.onerror = () => {
            reject(new Error('Failed to fetch sales'));
          };
        });
        setSales(allSales);

        // Load credits
        const allCredits = await getCredits();
        setCredits(allCredits);

        console.log('[App] Data loaded successfully');
      } catch (error) {
        console.error('[App] Failed to initialize data:', error);
      }
    };
    initializeData();
  }, []);

  // Migrate PRO/TEAM users to STARTER (run once on mount)
  useEffect(() => {
    const storedPlan = localStorage.getItem('storehouse-plan');
    if (storedPlan === 'PRO' || storedPlan === 'TEAM') {
      console.log(`[Migration] Converting ${storedPlan} plan to STARTER`);
      setCurrentPlan('STARTER');
      localStorage.setItem('storehouse-plan', 'STARTER');
    }
  }, []);

  // Keyboard shortcuts for calculator
  useEffect(() => {
    const handleKeyPress = (e) => {
      // ESC key closes calculator
      if (e.key === 'Escape' && showCalculator) {
        e.preventDefault();
        setShowCalculator(false);
        return;
      }

      // 'C' key opens calculator (only when not typing in input/textarea)
      if (
        e.key === 'c' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        !showCalculator
      ) {
        e.preventDefault();
        handleCalculator();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showCalculator]);

  // Auto-focus first input when calculator opens
  useEffect(() => {
    if (showCalculator) {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        const firstSelect = document.querySelector('.calculator-sheet select.calc-input');
        if (firstSelect) {
          firstSelect.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showCalculator]);

  // Load customer data for credits
  useEffect(() => {
    // Safety check: ensure credits is an array
    if (!credits || !Array.isArray(credits) || credits.length === 0) {
      return;
    }

    const loadCustomers = async () => {
      const customerMap = {};
      for (const credit of credits) {
        if (credit.customerId && !customerMap[credit.customerId]) {
          try {
            const customer = await getCustomer(credit.customerId);
            if (customer) {
              customerMap[credit.customerId] = customer;
            }
          } catch (error) {
            console.error('[Credits] Failed to load customer:', error);
          }
        }
      }
      setCreditCustomers(customerMap);
    };

    loadCustomers();
  }, [credits]);

  // Calculate customer debt from credits (open + overdue only)
  const receivables = useMemo(() => {
    return {
      total: totalOpenDebt(),
      count: openCount()
    };
  }, [debts]);

  // Group debts by customer for the drawer
  const customerDebts = useMemo(() => {
    try {
      // Defensive: Merge debts from both IndexedDB and localStorage
      const indexDbDebts = Array.isArray(debts) ? debts : [];
      const localStorageDebts = loadDebts() || [];

      // Convert localStorage debts to IndexedDB format for compatibility
      const normalizedLocalDebts = (Array.isArray(localStorageDebts) ? localStorageDebts : [])
        .filter(d => d && typeof d === 'object')
        .map(debt => ({
          ...debt,
          id: debt?.id ?? `debt_${Date.now()}_${Math.random()}`,
          customerName: (typeof debt?.customerName === 'string' && debt.customerName.trim()) ? debt.customerName : 'Unknown',
          amount: Number(debt?.amount) || 0,
          status: debt?.paidAt ? 'paid' : 'open',
          dueDate: typeof debt?.dueDate === 'string' ? debt.dueDate : undefined,
          phone: typeof debt?.phone === 'string' ? debt.phone : undefined
        }));

      // Merge both sources
      const allDebts = [...indexDbDebts, ...normalizedLocalDebts];

      if (allDebts.length === 0) {
        return [];
      }

      // Group debts by customer name
      const grouped = {};
      allDebts.forEach(debt => {
        if (!debt || typeof debt !== 'object') return;
        const name = (typeof debt.customerName === 'string' && debt.customerName.trim()) ? debt.customerName : 'Unknown';
        if (!grouped[name]) {
          grouped[name] = {
            customerName: name,
            phone: debt.phone,
            debts: [],
            credits: [], // For compatibility with existing code
            totalOwed: 0,
            oldestDueDate: null,
            hasOverdue: false
          };
        }

        grouped[name].debts.push(debt);
        grouped[name].credits.push(debt); // For compatibility

        // Only count 'open' status debts in total owed
        if (debt.status === 'open') {
          const amount = Number(debt.amount) || 0;
          grouped[name].totalOwed += amount;

          // Track oldest due date
          if (debt.dueDate) {
            try {
              const dueDate = new Date(debt.dueDate);
              if (dueDate.toString() !== 'Invalid Date') {
                if (!grouped[name].oldestDueDate || dueDate < grouped[name].oldestDueDate) {
                  grouped[name].oldestDueDate = dueDate;
                }

                // Check if overdue
                if (isOverdue(debt)) {
                  grouped[name].hasOverdue = true;
                }
              }
            } catch (e) {
              // Invalid date, skip
            }
          }
        }
      });

      // Convert to array and sort: overdue first, then by amount DESC
      const customersArray = Object.values(grouped);
      customersArray.sort((a, b) => {
        // Overdue customers first
        if (a.hasOverdue && !b.hasOverdue) return -1;
        if (!a.hasOverdue && b.hasOverdue) return 1;
        // Then by amount owed DESC
        return b.totalOwed - a.totalOwed;
      });

      return customersArray;
    } catch (error) {
      console.error('[Customer Debts] Failed to load:', error);
      return [];
    }
  }, [debts]);

  // ========== FUZZY SEARCH UTILITIES ==========

  // Standard Levenshtein distance algorithm
  const levenshteinDistance = (s1, s2) => {
    const m = s1.length, n = s2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = s1[i-1] === s2[j-1]
          ? dp[i-1][j-1]
          : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
      }
    }
    return dp[m][n];
  };

  // Dynamic threshold: longer words = more typos allowed
  const calculateDynamicThreshold = (length) => {
    if (length <= 3) return 0;      // "TV", "HP": no typos
    if (length <= 5) return 1;      // "Rice": 1 typo
    if (length <= 10) return 2;     // "Samsung": 2 typos
    if (length <= 15) return 3;     // "Galaxy Note 20": 3 typos
    return Math.floor(length * 0.25); // Very long: ~25% typos
  };

  // Fuzzy match with priority levels
  const fuzzyMatch = (searchTerm, targetString) => {
    const search = searchTerm.toLowerCase().trim();
    const target = targetString.toLowerCase().trim();

    // Empty search matches everything
    if (!search) return { match: true, priority: 0 };

    // Priority 1: Exact match
    if (search === target) return { match: true, priority: 1, distance: 0 };

    // Priority 2: Substring (user typed part of word)
    if (target.includes(search)) {
      return { match: true, priority: 2, distance: 0 };
    }
    if (search.includes(target)) {
      return { match: true, priority: 2, distance: 0 };
    }

    // Priority 3: Full string fuzzy with dynamic threshold
    const distance = levenshteinDistance(search, target);
    const threshold = calculateDynamicThreshold(Math.max(search.length, target.length));
    if (distance <= threshold) {
      return { match: true, priority: 3, distance };
    }

    // Priority 4: Word-level fuzzy (for multi-word items)
    // "galaxy s23" matches "Samsung Galaxy S23 Ultra"
    const searchWords = search.split(/\s+/).filter(w => w.length > 0);
    const targetWords = target.split(/\s+/).filter(w => w.length > 0);

    if (searchWords.length > 0) {
      const allWordsMatch = searchWords.every(sw =>
        targetWords.some(tw => {
          // Check substring first
          if (tw.includes(sw) || sw.includes(tw)) return true;

          // Then fuzzy match
          const d = levenshteinDistance(sw, tw);
          const t = calculateDynamicThreshold(Math.max(sw.length, tw.length));
          return d <= t;
        })
      );

      if (allWordsMatch) {
        // Calculate average distance for sorting
        let totalDistance = 0;
        searchWords.forEach(sw => {
          const minDist = Math.min(...targetWords.map(tw => levenshteinDistance(sw, tw)));
          totalDistance += minDist;
        });
        return { match: true, priority: 4, distance: totalDistance / searchWords.length };
      }
    }

    return { match: false };
  };

  // Filter and sort items for Record Sale
  const filteredSaleItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    return items
      .map(item => {
        const matchResult = fuzzyMatch(itemSearchTerm, item.name);
        return { ...item, matchResult };
      })
      .filter(item => item.matchResult.match)
      .sort((a, b) => {
        // Sort by priority first (lower = better)
        if (a.matchResult.priority !== b.matchResult.priority) {
          return a.matchResult.priority - b.matchResult.priority;
        }
        // Then by distance (lower = better)
        if (a.matchResult.distance !== undefined && b.matchResult.distance !== undefined) {
          if (a.matchResult.distance !== b.matchResult.distance) {
            return a.matchResult.distance - b.matchResult.distance;
          }
        }
        // Finally alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [items, itemSearchTerm]);

  // Auto-select single item in Record Sale search
  useEffect(() => {
    if (filteredSaleItems.length === 1 && itemSearchTerm) {
      const singleItem = filteredSaleItems[0];
      setSaleForm(prev => ({
        ...prev,
        itemId: singleItem.id.toString(),
        sellPrice: singleItem.sellPrice ? formatNumberWithCommas((singleItem.sellPrice / 100).toString()) : ''
      }));
    }
  }, [filteredSaleItems, itemSearchTerm]);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Sync pending sales when coming online
      syncPendingSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending sales on mount
    checkPendingSales();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker update notification
  useEffect(() => {
    const handleSWUpdate = () => {
      setShowUpdateNotification(true);
    };

    window.addEventListener('sw-update-available', handleSWUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleSWUpdate);
    };
  }, []);

  // Quick-sell from table/search - Listen for open-record-sale event
  useEffect(() => {
    const handler = (e) => {
      if (!settings.quickSellEnabled) return;

      const itemId = e.detail?.itemId;
      if (!itemId) return;

      const item = items.find(i => i.id === parseInt(itemId));
      if (!item) return;

      // Pre-fill Record Sale form
      // Convert kobo to Naira for display
      const sellKobo = item.sellKobo ?? item.sellingPrice ?? item.sellPrice ?? 0;
      const sellNaira = Math.round(sellKobo / 100);

      setSaleForm({
        itemId: item.id.toString(),
        quantity: '1',
        sellPrice: sellNaira > 0 ? formatNumberWithCommas(sellNaira.toString()) : '',
        paymentMethod: 'cash',
        isCreditSale: false,
        customerName: '',
        phone: '',
        dueDate: todayPlusDaysISO(7),
        sendWhatsApp: false,
        hasConsent: false
      });

      // Clear search term
      setItemSearchTerm('');

      // Open modal
      setShowRecordSale(true);
    };

    window.addEventListener('open-record-sale', handler);
    return () => window.removeEventListener('open-record-sale', handler);
  }, [items, settings.quickSellEnabled]);

  // Handle form changes
  const handleInputChange = async (e) => {
    const { name, value } = e.target;

    // Handle price fields with formatting
    if (name === 'purchasePrice' || name === 'sellingPrice') {
      const formattedValue = formatNumberWithCommas(value);
      const rawValue = parseFormattedNumber(formattedValue);

      setFormattedPrices({
        ...formattedPrices,
        [name]: formattedValue
      });

      setFormData({
        ...formData,
        [name]: rawValue
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });

      // Check for existing item when name changes
      if (name === 'name' && value.trim()) {
        try {
          const existing = await checkItemExists(value.trim());
          if (existing) {
            setExistingItem(existing);
            setStockMode('add'); // Default to 'add' mode
          } else {
            setExistingItem(null);
          }
        } catch (err) {
          console.warn('[handleInputChange] Error checking existing item:', err);
        }
      } else if (name === 'name' && !value.trim()) {
        setExistingItem(null);
      }
    }
  };

  // Save new item
  const handleSave = async () => {
    console.log('[handleSave] Called', { formData, formattedPrices, existingItem, stockMode });

    // Check plan limits (bypass for beta testers)
    if (!isBetaTester) {
      if (currentPlan === 'FREE' && items.length >= 10 && !existingItem) {
        console.log('[handleSave] FREE plan limit reached (10 products)');
        setShowModal(false);
        setShowUpgradePrompt(true);
        return;
      }

      if (currentPlan === 'STARTER' && items.length >= 500 && !existingItem) {
        console.log('[handleSave] STARTER plan limit reached (500 products)');
        displayToast('You\'ve reached the limit of 500 products. Upgrade to BUSINESS for unlimited products.');
        return;
      }
    }

    // Validation with detailed logging
    if (!formData.name || !formData.name.trim()) {
      console.log('[handleSave] Validation failed: name missing');
      displayToast('Please enter item name');
      return;
    }

    const qtyInput = parseInt(formData.qty);
    if (!formData.qty || isNaN(qtyInput) || qtyInput <= 0) {
      console.log('[handleSave] Validation failed: qty invalid');
      displayToast('Please enter a valid quantity greater than 0');
      return;
    }

    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) < 0) {
      console.log('[handleSave] Validation failed: purchase price invalid');
      displayToast('Please enter valid purchase price');
      return;
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) < 0) {
      console.log('[handleSave] Validation failed: selling price invalid');
      displayToast('Please enter valid selling price');
      return;
    }

    try {
      console.log('[handleSave] Validation passed, saving...');
      const purchase = parseFloat(formData.purchasePrice);
      const selling = parseFloat(formData.sellingPrice);
      const inputQty = parseInt(formData.qty);

      // FORMAT HELPER for toasts
      const formatCurrency = (kobo) => {
        return new Intl.NumberFormat('en-NG', {
          style: 'currency',
          currency: 'NGN',
          maximumFractionDigits: 0
        }).format(kobo / 100);
      };

      if (existingItem) {
        // UPDATING EXISTING ITEM
        const oldQty = existingItem.qty;
        const oldPurchaseKobo = existingItem.purchaseKobo || 0;

        if (stockMode === 'add') {
          // ADD MODE: Increment stock
          const delta = inputQty;
          const newQty = oldQty + delta;

          // Weighted average cost calculation
          const newPurchaseKobo = Math.round(
            (oldQty * oldPurchaseKobo + delta * Math.round(purchase * 100)) / Math.max(newQty, 1)
          );

          const updatedItem = {
            qty: newQty,
            purchaseKobo: newPurchaseKobo,
            sellKobo: Math.round(selling * 100) // Update selling price if provided
          };

          await updateItem(existingItem.id, updatedItem);
          console.log('[handleSave] ✅ Stock added:', { oldQty, delta, newQty });

          // Log stock movement
          logStockMovement({
            itemId: existingItem.id,
            type: 'in',
            qty: delta,
            unitCost: Math.round(purchase * 100),
            reason: 'purchase',
            at: new Date().toISOString()
          });

          displayToast(`✓ Added ${delta} to ${existingItem.name}: ${oldQty} → ${newQty}`);

        } else {
          // REPLACE MODE: Set total stock
          const newTotal = inputQty;
          const qtyDiff = newTotal - oldQty;

          const updatedItem = {
            qty: newTotal,
            purchaseKobo: Math.round(purchase * 100),
            sellKobo: Math.round(selling * 100)
          };

          await updateItem(existingItem.id, updatedItem);
          console.log('[handleSave] ✅ Stock replaced:', { oldQty, newTotal });

          // Log stock movement
          logStockMovement({
            itemId: existingItem.id,
            type: 'adjust',
            qty: qtyDiff,
            unitCost: Math.round(purchase * 100),
            reason: 'stock_take',
            at: new Date().toISOString()
          });

          displayToast(`✓ Stock set to ${newTotal} for ${existingItem.name}`);
        }

      } else {
        // CREATING NEW ITEM
        const newItem = {
          name: formData.name.trim(),
          category: formData.category || 'General Merchandise',
          qty: inputQty,
          purchaseKobo: Math.round(purchase * 100),
          sellKobo: Math.round(selling * 100),
          reorderLevel: parseInt(formData.reorderLevel) || 10,
          isDemo: false
        };

        console.log('[handleSave] Creating new item:', newItem);
        const addedItem = await addItem(newItem);
        console.log('[handleSave] ✅ Item added to IndexedDB:', addedItem);
        displayToast('✓ Item added successfully!');
      }

      // DEMO CLEANUP: Remove all demo items when user adds first real item
      const demoActive = localStorage.getItem('demoItemsActive');
      if (demoActive === 'true') {
        console.log('[Demo Cleanup] Removing demo items...');
        await removeDemoItems();
        localStorage.setItem('demoItemsActive', 'false');
      }

      // Reload items from IndexedDB
      const loadedItems = await getItems();
      console.log('[handleSave] 📦 Items reloaded from DB. Count:', loadedItems.length);
      console.log('[handleSave] 📦 All items:', loadedItems.map(i => ({ id: i.id, name: i.name, qty: i.qty })));

      // Update state with new items
      setItems(loadedItems);

      // Clear search query to ensure new item is visible
      setSearchQuery('');
      console.log('[handleSave] 🔍 Search query cleared');

      // Close modal and reset form
      setShowModal(false);
      setFormData({
        name: '',
        category: 'Fashion & Clothing',
        qty: '',
        purchasePrice: '',
        sellingPrice: '',
        reorderLevel: '10'
      });
      setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
      setCalculatedProfit({ profit: 0, margin: 0 });
      setExistingItem(null);
      setStockMode('add');
      console.log('[handleSave] ✅ SUCCESS! Item should now be visible in inventory table');
    } catch (error) {
      console.error('[handleSave] Error:', error);
      if (error.message === 'DUPLICATE_NAME') {
        displayToast('An item with this name already exists');
      } else {
        displayToast(`Failed to add item: ${error.message}`);
      }
    }
  };

  // Quick Add from search
  const handleQuickAdd = () => {
    if (searchQuery.trim()) {
      setFormData({ ...formData, name: searchQuery });
      setShowModal(true);
      setSearchQuery('');
    }
  };

  // Calculate stats (with safety checks)
  const totalItems = Array.isArray(items) ? items.reduce((sum, item) => sum + item.qty, 0) : 0;
  const lowStockItems = Array.isArray(items) ? items.filter(item => item.qty < 10).length : 0;
  const totalPotentialProfit = Array.isArray(items) ? items.reduce((sum, item) => sum + (item.profit * item.qty), 0) : 0;

  // Get today's date
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Button handlers
  const handleRecordSale = () => {
    setShowRecordSale(true);
    // Reset form and search when opening (including Stage 3 credit fields)
    setItemSearchTerm('');
    setSaleForm({
      itemId: '',
      quantity: '',
      sellPrice: '',
      paymentMethod: 'cash',
      customerName: '',
      // Stage 3: Credit sale fields
      isCreditSale: false,
      phone: '',
      note: '',
      dueDate: todayPlusDaysISO(7),
      sendWhatsApp: true,
      hasConsent: false
    });
  };

  const handleLowStock = () => {
    setShowLowStock(true);
    // Initialize stock update form for all low stock items
    const initialForm = {};
    items.filter(item => item.qty < 10).forEach(item => {
      initialForm[item.id] = '';
    });
    setStockUpdateForm(initialForm);
    setStockSearchQuery('');
  };

  const handleCalculator = () => {
    setShowCalculator(true);
    // Reset calculator form
    setCalcForm({
      itemId: '',
      itemName: '',
      price: '',
      quantity: '',
      total: 0
    });
  };

  // Calculator handlers
  const handleCalcItemSelect = (e) => {
    const selectedId = e.target.value;
    if (selectedId) {
      const selectedItem = items.find(item => item.id === parseInt(selectedId));
      if (selectedItem) {
        // Get price from sellKobo (or fallback to sellingPrice/sellPrice)
        const sellKobo = selectedItem.sellKobo ?? selectedItem.sellingPrice ?? selectedItem.sellPrice ?? 0;
        const sellNaira = Math.round(sellKobo / 100);

        setCalcForm({
          ...calcForm,
          itemId: selectedId,
          itemName: selectedItem.name,
          price: sellNaira > 0 ? sellNaira.toString() : '',
          quantity: '1' // Auto-fill quantity to 1
        });
      }
    } else {
      setCalcForm({
        ...calcForm,
        itemId: '',
        itemName: '',
        price: '',
        quantity: ''
      });
    }
  };

  const handleCalcChange = (e) => {
    const { name, value } = e.target;
    setCalcForm({
      ...calcForm,
      [name]: value
    });
  };

  // Calculate total whenever price or quantity changes
  useEffect(() => {
    const price = parseFloat(calcForm.price) || 0;
    const quantity = parseFloat(calcForm.quantity) || 0;
    setCalcForm(prev => ({
      ...prev,
      total: price * quantity
    }));
  }, [calcForm.price, calcForm.quantity]);

  const handleUseInSale = () => {
    if (calcForm.itemId && calcForm.quantity && calcForm.price) {
      // Pre-fill the Record Sale form with comma-formatted price
      setSaleForm({
        itemId: calcForm.itemId,
        quantity: calcForm.quantity,
        sellPrice: formatNumberWithCommas(calcForm.price),
        paymentMethod: 'cash',
        customerName: '',
        isCreditSale: false,
        phone: '',
        dueDate: todayPlusDaysISO(7),
        sendWhatsApp: false,
        hasConsent: false
      });

      // Close calculator and open Record Sale
      setShowCalculator(false);
      setShowRecordSale(true);
    }
  };

  // Credit payment collection handlers
  const handleCollectPayment = async (credit, amountNaira) => {
    try {
      const amountKobo = Math.round(amountNaira * 100);
      const balanceKobo = credit.principalKobo - (credit.paidKobo || 0);

      // Validate amount
      if (amountKobo > balanceKobo) {
        displayToast(`Amount exceeds balance. Balance: ₦${(balanceKobo / 100).toLocaleString()}`);
        return;
      }

      // Add payment in single transaction
      await addPayment({
        creditId: credit.id,
        amountKobo
      });

      // Reload credits
      const updatedCredits = await getCredits();
      setCredits(updatedCredits);

      // Show success toast
      displayToast(`Payment recorded - ₦${amountNaira.toLocaleString()}`);
    } catch (error) {
      console.error('[Payment] Failed:', error);
      displayToast('Failed to record payment. Please try again.');
    }
  };

  const handleFullPayment = async (credit) => {
    const balanceKobo = credit.principalKobo - (credit.paidKobo || 0);
    const balanceNaira = balanceKobo / 100;

    const confirm = window.confirm(
      `Collect full payment of ₦${balanceNaira.toLocaleString()} and close this credit?`
    );

    if (confirm) {
      await handleCollectPayment(credit, balanceNaira);
    }
  };

  const handleWhatsAppReminder = (credit) => {
    const customer = creditCustomers[credit.customerId];

    if (!customer) {
      displayToast('Customer information not available');
      return;
    }

    if (!customer.consentAt) {
      displayToast('Customer has not consented to WhatsApp reminders');
      return;
    }

    // Check rate limit (24 hours)
    const lastSent = lastReminders[credit.id];
    if (lastSent) {
      const hoursSince = (Date.now() - lastSent) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        displayToast(`Reminder already sent today. Try again in ${hoursLeft}h`);
        return;
      }
    }

    // Calculate balance
    const balanceKobo = credit.principalKobo - (credit.paidKobo || 0);
    const balanceNaira = balanceKobo / 100;
    const dueDate = new Date(credit.dueDate).toLocaleDateString('en-NG');

    // Create WhatsApp message
    const message = encodeURIComponent(
      `Hello ${customer.name},\n\n` +
      `This is a friendly reminder about your outstanding balance:\n\n` +
      `Amount: ₦${balanceNaira.toLocaleString()}\n` +
      `Due Date: ${dueDate}\n\n` +
      `Please let us know when you can settle this amount.\n\n` +
      `Thank you!\n` +
      `${settings.businessName || 'Storehouse'}`
    );

    // Open WhatsApp
    const phone = customer.phone || '';
    const whatsappUrl = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');

    // Update rate limit
    const updated = { ...lastReminders, [credit.id]: Date.now() };
    setLastReminders(updated);
    localStorage.setItem('whatsapp-reminders', JSON.stringify(updated));

    displayToast('WhatsApp reminder sent');
  };

  // Helper: Calculate days until/since due date
  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper: Show toast with auto-dismiss
  const displayToast = (message, duration = 3000) => {
    setInfoToast(message);
    setTimeout(() => setInfoToast(''), duration);
  };

  // Send reminder for customer (all their open debts)
  const handleSendCustomerReminder = (customerDebt) => {
    if (!customerDebt?.phone) {
      displayToast('No phone number for this customer');
      return;
    }

    const totalOwedNaira = Math.round(customerDebt.totalOwed || 0);
    const dueDateStr = customerDebt.oldestDueDate
      ? customerDebt.oldestDueDate.toLocaleDateString('en-NG', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'soon';

    // Build reminder message
    const msg = `Hello ${customerDebt.customerName || 'valued customer'}, you have an outstanding balance of ₦${totalOwedNaira.toLocaleString()} due ${dueDateStr}. Please make payment at your earliest convenience. Thank you! — ${settings.businessName || 'Storehouse'}`;

    // Use the safe WhatsApp opener
    openWhatsApp(customerDebt.phone, msg);
    displayToast('WhatsApp reminder opened');
  };

  // Mark all customer credits as paid
  const handleMarkCustomerPaid = (customerDebt) => {
    try {
      if (!customerDebt || !Array.isArray(customerDebt.debts)) {
        throw new Error('Invalid customer debt data');
      }

      const paidAt = new Date().toISOString();

      // Mark all open debts for this customer as paid using notify function
      customerDebt.debts.forEach(debt => {
        if (debt && debt.status === 'open') {
          if (debt.id) {
            markDebtPaidNotify(debt.id);
          }

          // Also update new localStorage debt store
          const debts = loadDebts();
          const d = debts.find(x => x.saleId === debt.id || x.customerName === debt.customerName);
          if (d && !d.paidAt) {
            d.paidAt = paidAt;
            saveDebts(debts);

            // Create a sale record for the repayment
            const sales = loadSales();
            sales.unshift({
              id: uid(),
              date: paidAt,
              qty: 1,
              unitPrice: debt.amount || 0,
              amount: debt.amount || 0,
              payment: "credit-paid",
              customerName: debt.customerName || 'Unknown',
              phone: debt.phone,
              relatedDebtId: d.id,
            });
            saveSales(sales);
          }
        }
      });

      // Close confirmation modal
      setConfirmMarkPaid(null);

      // Show success toast
      const totalNaira = Math.round(customerDebt.totalOwed || 0);
      displayToast(`✓ Marked ${formatNaira(totalNaira)} as paid`);
    } catch (error) {
      console.error('[Mark Paid] Failed:', error);
      displayToast('Failed to mark as paid. Please try again.');
      setConfirmMarkPaid(null);
    }
  };

  // Record Sale handlers
  const handleSaleFormChange = (e) => {
    const { name, value } = e.target;

    if (name === 'itemId' && value) {
      // When item is selected, prefill the price from sellKobo
      const selectedItem = items.find(item => item.id === parseInt(value));
      if (selectedItem) {
        // Convert sellKobo to naira for display
        const sellNaira = Math.round((selectedItem.sellKobo || 0) / 100);
        setSaleForm({
          ...saleForm,
          itemId: value,
          sellPrice: sellNaira > 0 ? formatNumberWithCommas(sellNaira.toString()) : ''
        });
      }
    } else if (name === 'sellPrice') {
      // Format price with commas as user types
      const formattedValue = formatNumberWithCommas(value);
      setSaleForm({
        ...saleForm,
        sellPrice: formattedValue
      });
    } else {
      setSaleForm({
        ...saleForm,
        [name]: value
      });
    }
  };

  const handlePaymentMethodChange = (method) => {
    setSaleForm({
      ...saleForm,
      paymentMethod: method,
      customerName: method === 'cash' ? '' : saleForm.customerName
    });
  };

  const handleSaveSale = async (saleData) => {
    // STAGE 3: Atomic transaction for credit sales
    // Support both RecordSaleModal (saleData param) and legacy form (saleForm state)
    const formData = saleData || saleForm;

    const selectedItem = items.find(item => item.id === parseInt(formData.itemId));
    const qty = parseQty(formData.quantity);
    const sellKobo = toKobo(formData.sellPrice);

    // Validation
    if (!selectedItem || !qty || !sellKobo) {
      displayToast('Please fill all required fields');
      return;
    }

    // Stock guardrail
    if (qty > selectedItem.qty) {
      displayToast(`Not enough stock. Only ${selectedItem.qty} available.`);
      return;
    }

    // Credit sale validation
    if (formData.isCreditSale) {
      if (!formData.customerName.trim()) {
        displayToast('Customer name required for credit sales');
        return;
      }

      // Phone validation if provided
      if (formData.phone && !isValidNG(formData.phone)) {
        displayToast('Invalid Nigerian phone number. Use format: 0XXXXXXXXXX or +234XXXXXXXXXX');
        return;
      }

      // Consent required if WhatsApp is ON
      if (formData.sendWhatsApp && !formData.hasConsent) {
        displayToast('Please confirm customer consent to receive WhatsApp messages');
        return;
      }
    }

    // Disable save during submit
    const saveButton = document.querySelector('.btn-save-sale');
    if (saveButton) saveButton.disabled = true;

    try {
      const saleId = crypto.randomUUID();
      const db = await getDB();

      // Wrap the entire transaction in a promise
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['sales', 'items', 'customers', 'credits', 'outbox'], 'readwrite');
        const salesStore = tx.objectStore('sales');
        const itemsStore = tx.objectStore('items');
        const customersStore = tx.objectStore('customers');
        const creditsStore = tx.objectStore('credits');
        const outboxStore = tx.objectStore('outbox');

        // Handle transaction completion
        tx.oncomplete = () => {
          console.log('[Credit Sale] ✅ Transaction completed successfully');
          resolve();
        };

        tx.onerror = () => {
          console.error('[Credit Sale] ❌ Transaction error:', tx.error);
          reject(tx.error);
        };

        tx.onabort = () => {
          console.error('[Credit Sale] ❌ Transaction aborted');
          reject(new Error('Transaction aborted'));
        };

        // 1) Insert sale - use plain data only
        const saleData = {
          id: saleId,
          itemId: selectedItem.id,
          qty,
          sellKobo,
          createdAt: Date.now(),
          dayKey: localDayKey(),
          // v5: Payment method tracking for accurate EOD reports
          isCredit: formData.isCreditSale,
          paymentMethod: formData.isCreditSale ? 'credit' : (formData.paymentMethod || 'cash'),
          // Include customer info if present
          customerName: formData.customerName || null,
          dueDate: formData.dueDate || null
        };
        salesStore.add(saleData);

        // 2) Decrement stock with guard
        const itemRequest = itemsStore.get(selectedItem.id);
        itemRequest.onsuccess = () => {
          const item = itemRequest.result;
          if (!item || item.qty < qty) {
            tx.abort();
            reject(new Error(`Not enough stock. Only ${item?.qty || 0} available.`));
            return;
          }
          // Create plain object for update
          const updatedItem = {
            ...item,
            qty: item.qty - qty,
            lastSellKobo: sellKobo,
            updatedAt: Date.now()
          };
          itemsStore.put(updatedItem);
        };

        itemRequest.onerror = () => {
          reject(new Error('Failed to check item stock'));
        };

        // 3) Upsert customer if credit sale
        if (formData.isCreditSale) {
          const lowerName = formData.customerName.trim().toLowerCase();
          const custIndex = customersStore.index('by_lower_name');
          const custRequest = custIndex.get(lowerName);

          custRequest.onsuccess = () => {
            const existingCust = custRequest.result;

            if (!existingCust) {
              // Create new customer - plain object only
              const newCustomer = {
                name: formData.customerName.trim(),
                lowerName: lowerName,
                phone: formData.phone || null,
                consentAt: formData.hasConsent ? Date.now() : null,
                createdAt: Date.now()
              };
              const addRequest = customersStore.add(newCustomer);
              addRequest.onsuccess = () => {
                const customerId = addRequest.result;

                // 4) Insert credit - plain object only
                const creditData = {
                  id: crypto.randomUUID(),
                  saleId: saleId,
                  customerId: customerId,
                  principalKobo: qty * sellKobo,
                  paidKobo: 0,
                  dueDate: formData.dueDate,
                  status: 'open',
                  createdAt: Date.now()
                };
                creditsStore.add(creditData);
              };
            } else {
              // Update existing customer - plain object only
              const customerId = existingCust.id;
              const updatedCustomer = {
                ...existingCust,
                phone: formData.phone || existingCust.phone,
                consentAt: formData.hasConsent ? Date.now() : existingCust.consentAt
              };
              customersStore.put(updatedCustomer);

              // 4) Insert credit - plain object only
              const creditData = {
                id: crypto.randomUUID(),
                saleId: saleId,
                customerId: customerId,
                principalKobo: qty * sellKobo,
                paidKobo: 0,
                dueDate: formData.dueDate,
                status: 'open',
                createdAt: Date.now()
              };
              creditsStore.add(creditData);
            }
          };

          custRequest.onerror = () => {
            reject(new Error('Failed to lookup customer'));
          };
        }

        // 5) Idempotent outbox - plain object only
        const outboxData = {
          id: saleId,
          kind: 'sale',
          data: { saleId: saleId, itemId: selectedItem.id, qty: qty, sellKobo: sellKobo },
          createdAt: Date.now()
        };
        outboxStore.put(outboxData);
      });

      // Success! Close modal and show toast
      setShowRecordSale(false);

      const totalKobo = qty * sellKobo;
      const unitPrice = sellKobo / 100; // Convert to naira
      const amount = qty * unitPrice;

      // Save to localStorage store (for compatibility)
      const sales = loadSales();
      const saleRow = {
        id: saleId,
        date: new Date().toISOString(),
        itemId: selectedItem.id.toString(),
        itemName: selectedItem.name,
        qty,
        unitPrice,
        amount,
        payment: formData.isCreditSale ? "credit" : (formData.paymentMethod || 'cash'),
        customerName: formData.isCreditSale ? formData.customerName.trim() : undefined,
        phone: formData.isCreditSale && formData.phone ? formData.phone.trim() : undefined,
        note: formData.note.trim() || undefined,
      };
      sales.unshift(saleRow);
      saveSales(sales);

      if (formData.isCreditSale) {
        // Create debt record for KPI tracking (new debt management system)
        const debtId = `debt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const debtAmount = totalKobo / 100; // Convert kobo to naira
        const dueDate = new Date(formData.dueDate);
        const dueDateStr = dueDate.toISOString().split('T')[0]; // yyyy-mm-dd format

        addDebtNotify({
          id: debtId,
          customerName: formData.customerName.trim(),
          phone: formData.phone || undefined,
          amount: debtAmount,
          dueDate: dueDateStr,
          createdAt: new Date().toISOString(),
          status: 'open'
        });

        // Also save to new localStorage debt store
        const debts = loadDebts();
        debts.unshift({
          id: uid(),
          saleId,
          customerName: formData.customerName.trim(),
          phone: formData.phone ? formData.phone.trim() : undefined,
          dueDate: formData.dueDate,
          amount,
          createdAt: new Date().toISOString(),
        });
        saveDebts(debts);

        // Format due date as DD/MM/YYYY
        const formattedDate = `${String(dueDate.getDate()).padStart(2, '0')}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${dueDate.getFullYear()}`;
        displayToast(`Credit sale — ${formatNGN(totalKobo)} due ${formattedDate}`);
      } else {
        displayToast('Sale recorded.');
      }

      // WhatsApp receipt (plan gated, but allowed for beta testers)
      const canSendWhatsApp = isBetaTester || currentPlan !== 'FREE' || trialDaysLeft > 0;
      if (formData.isCreditSale && formData.sendWhatsApp && canSendWhatsApp) {
        const receipt = buildCreditReceipt({
          storeName: settings.businessName || 'Storehouse',
          customer: formData.customerName.trim(),
          itemName: selectedItem.name,
          qty,
          sellKobo,
          dueDateISO: formData.dueDate,
          refCode: 'APP'
        });

        const url = toWhatsAppTarget(formData.phone) + encodeURIComponent(receipt);
        window.open(url, '_blank');
      }

      // Reset form (only if using legacy form, not RecordSaleModal)
      if (!saleData) {
        setSaleForm({
          itemId: '',
          quantity: '',
          sellPrice: '',
          paymentMethod: 'cash',
          customerName: '',
          isCreditSale: false,
          phone: '',
          note: '',
          dueDate: todayPlusDaysISO(7),
          sendWhatsApp: true,
          hasConsent: false
        });
      }

      // Refresh items and sales from DB to update UI
      const updatedItems = await getItems();
      setItems(updatedItems);

      // Refresh sales to update KPIs
      const db2 = await getDB();
      const updatedSales = await new Promise((resolve, reject) => {
        const tx2 = db2.transaction(['sales'], 'readonly');
        const salesStore2 = tx2.objectStore('sales');
        const getAllRequest = salesStore2.getAll();

        getAllRequest.onsuccess = () => {
          resolve(getAllRequest.result);
        };

        getAllRequest.onerror = () => {
          reject(new Error('Failed to fetch sales'));
        };
      });
      setSales(updatedSales);

      // Refresh credits if it was a credit sale
      if (formData.isCreditSale) {
        const updatedCredits = await getCredits();
        setCredits(updatedCredits);
      }

    } catch (error) {
      console.error('[Save Sale Error]', error);
      displayToast(error.message || 'Could not save sale');
    } finally {
      // Re-enable save button
      if (saveButton) saveButton.disabled = false;
    }
  };

  const handleUndoSale = () => {
    if (!lastSale) return;

    // Remove the sale from sales
    const updatedSales = sales.filter(sale => sale.id !== lastSale.id);
    setSales(updatedSales);
    localStorage.setItem('storehouse-sales', JSON.stringify(updatedSales));

    // Remove associated debt if it was a credit sale
    if (lastSale.paymentMethod === 'credit') {
      const updatedDebts = debts.filter(debt => debt.saleId !== lastSale.id);
      setDebts(updatedDebts);
      localStorage.setItem('storehouse-debts', JSON.stringify(updatedDebts));
    }

    // Restore inventory
    const updatedItems = items.map(item =>
      item.id === lastSale.itemId
        ? { ...item, qty: item.qty + lastSale.quantity, status: (item.qty + lastSale.quantity) < 10 ? 'Low Stock' : 'In Stock' }
        : item
    );
    setItems(updatedItems);
    localStorage.setItem('storehouse-items', JSON.stringify(updatedItems));

    setShowToast(false);
    setLastSale(null);
  };

  // Low Stock handlers
  const handleStockUpdateChange = (itemId, value) => {
    // Only allow positive numbers
    const numValue = value.replace(/\D/g, '');
    setStockUpdateForm({
      ...stockUpdateForm,
      [itemId]: numValue
    });
  };

  const handleAddStock = (itemId) => {
    const addAmount = parseInt(stockUpdateForm[itemId]);

    if (!addAmount || addAmount <= 0) {
      displayToast('Please enter a valid quantity to add');
      return;
    }

    // Find the item before updating
    const item = items.find(i => i.id === itemId);
    const oldQty = item.qty;
    const newQty = oldQty + addAmount;

    const updatedItems = items.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          qty: newQty,
          status: newQty < 10 ? 'Low Stock' : 'In Stock'
        };
      }
      return item;
    });

    // Update state and localStorage
    setItems(updatedItems);
    localStorage.setItem('storehouse-items', JSON.stringify(updatedItems));

    // Clear the input for this item and close inline editor
    setStockUpdateForm({
      ...stockUpdateForm,
      [itemId]: ''
    });
    setEditingStockId(null);

    // Show success message with new quantity
    const statusChange = oldQty < 10 && newQty >= 10 ? ' (Now in stock!)' : '';
    displayToast(`✓ Added ${addAmount} units to ${item.name}\nNew quantity: ${newQty}${statusChange}`);
  };

  // Filter low stock items based on search and sort by urgency (with safety check)
  const getLowStockItems = () => {
    // Safety check: ensure items is an array
    if (!items || !Array.isArray(items)) {
      console.warn('[getLowStockItems] Items not loaded yet');
      return [];
    }

    // Debug logging
    console.log('🔍 Debug: All items:', items);
    console.log('🔍 Debug: Checking low stock items...');

    let lowStock = items.filter(item => {
      const reorderLevel = item.reorderLevel || 10;
      const isLowStock = item.qty <= reorderLevel;
      console.log(`  ${item.name}: qty=${item.qty}, reorderLevel=${reorderLevel}, isLowStock=${isLowStock}`);
      return isLowStock;
    });

    console.log('🔍 Debug: Low stock items found:', lowStock.length);

    if (stockSearchQuery) {
      lowStock = lowStock.filter(item =>
        item.name.toLowerCase().includes(stockSearchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(stockSearchQuery.toLowerCase())
      );
    }

    // Sort by urgency: items furthest below reorder level appear first
    lowStock.sort((a, b) => {
      const urgencyA = a.qty / (a.reorderLevel || 10);
      const urgencyB = b.qty / (b.reorderLevel || 10);
      return urgencyA - urgencyB;
    });

    return lowStock;
  };

  // Simple substring search (with safety check)
  const getFilteredItems = () => {
    // Safety check: ensure items is an array
    if (!items || !Array.isArray(items)) {
      return [];
    }

    if (!searchQuery.trim()) {
      return items;
    }

    // Use fuzzy matching from Record Sale search
    return items
      .map(item => {
        const matchResult = fuzzyMatch(searchQuery, item.name);
        // Also check category
        const categoryMatch = item.category ? fuzzyMatch(searchQuery, item.category) : { match: false };

        // Use the better match
        let bestMatch = matchResult;
        if (categoryMatch.match && (!matchResult.match || categoryMatch.priority < matchResult.priority)) {
          bestMatch = categoryMatch;
        }

        return { ...item, matchResult: bestMatch };
      })
      .filter(item => item.matchResult.match)
      .sort((a, b) => {
        // Sort by priority first (lower = better)
        if (a.matchResult.priority !== b.matchResult.priority) {
          return a.matchResult.priority - b.matchResult.priority;
        }
        // Then by distance (lower = better)
        if (a.matchResult.distance !== undefined && b.matchResult.distance !== undefined) {
          if (a.matchResult.distance !== b.matchResult.distance) {
            return a.matchResult.distance - b.matchResult.distance;
          }
        }
        // Finally alphabetically
        return a.name.localeCompare(b.name);
      });
  };

  // Plan management functions
  const handlePlanChange = (plan) => {
    if (plan !== 'FREE') {
      displayToast('Coming Soon: Upgrade functionality will be available soon!');
      return;
    }
    setCurrentPlan(plan);
    localStorage.setItem('storehouse-plan', plan);
    setShowPlansModal(false);
  };

  const canAccessFeature = (feature) => {
    // Beta testers have access to all features
    if (isBetaTester) return true;

    const features = {
      'eod-report': ['STARTER', 'BUSINESS'],
      'credit-debt': ['STARTER', 'BUSINESS'],
      'profit-tracking': ['STARTER', 'BUSINESS']
    };
    return features[feature]?.includes(currentPlan) || false;
  };

  // WhatsApp EOD Report
  const generateEODReport = (format = 'readable') => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-NG');
    const todayStats = getTodaysSales();
    const lowStockItems = getLowStockItems();

    // Find top selling item
    const todaySales = sales.filter(sale => {
      const saleDate = new Date(sale.timestamp).toDateString();
      return saleDate === today.toDateString();
    });

    const itemSales = {};
    todaySales.forEach(sale => {
      if (!itemSales[sale.itemName]) {
        itemSales[sale.itemName] = { qty: 0, profit: 0 };
      }
      itemSales[sale.itemName].qty += sale.qty;
      const item = items.find(i => i.name === sale.itemName);
      if (item) {
        itemSales[sale.itemName].profit += (sale.sellPrice - item.purchasePrice) * sale.qty;
      }
    });

    const topItem = Object.entries(itemSales).sort((a, b) => b[1].profit - a[1].profit)[0];
    const topItemName = topItem ? topItem[0] : 'N/A';
    const topItemQty = topItem ? topItem[1].qty : 0;
    const topItemProfit = topItem ? topItem[1].profit : 0;

    if (format === 'readable') {
      return `📊 Storehouse Daily Report
📅 ${dateStr} | 🏪 ${settings.businessName || 'My Business'}
💰 Sales: ₦${todayStats.total.toLocaleString()} | ✨ Profit: ₦${todayStats.profit.toLocaleString()} (${((todayStats.profit/todayStats.total)*100).toFixed(1)}%)
💵 Cash: ₦${todayStats.cash.toLocaleString()} | 📝 Credit: ₦${todayStats.credit.toLocaleString()}
📦 Transactions: ${todayStats.transactions}
🏆 Top: ${topItemName} - ${topItemQty} units (₦${topItemProfit.toLocaleString()} profit)
⚠️ Low Stock: ${lowStockItems.length} items
Generated by Storehouse 📱`;
    } else {
      return `=== Storehouse EOD ===
Date: ${today.toISOString().split('T')[0]}
Sales: ₦${todayStats.total.toLocaleString()} | Profit: ₦${todayStats.profit.toLocaleString()}
Cash: ₦${todayStats.cash.toLocaleString()} | Credit: ₦${todayStats.credit.toLocaleString()}
Transactions: ${todayStats.transactions} | Top: ${topItemName}
Low Stock: ${lowStockItems.length}
======================`;
    }
  };

  const handleSendEOD = () => {
    if (!canAccessFeature('eod-report')) {
      setShowUpgradePrompt(true);
      setShowEODModal(false);
      return;
    }

    const message = generateEODReport(eodFormat);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    setShowEODModal(false);
  };

  // First Sale Modal check
  const checkFirstSaleToday = () => {
    const today = new Date().toDateString();
    const lastShown = localStorage.getItem('firstSaleShown');

    if (lastShown !== today && sales.length > 0) {
      const todaySales = sales.filter(sale => {
        const saleDate = new Date(sale.timestamp).toDateString();
        return saleDate === today;
      });

      if (todaySales.length === 1) {
        setShowFirstSaleModal(true);
        localStorage.setItem('firstSaleShown', today);
      }
    }
  };

  // Offline Queue Management
  const checkPendingSales = () => {
    try {
      const outbox = JSON.parse(localStorage.getItem('sales-outbox') || '[]');
      setPendingSales(outbox.length);
    } catch (error) {
      console.error('Error checking pending sales:', error);
      setPendingSales(0);
    }
  };

  const syncPendingSales = async () => {
    try {
      const outbox = JSON.parse(localStorage.getItem('sales-outbox') || '[]');
      if (outbox.length === 0) return;

      // Process each pending sale
      outbox.forEach(sale => {
        // Check if sale already exists (UUID de-duplication)
        const exists = sales.some(s => s.id === sale.id);
        if (!exists) {
          const updatedSales = [...sales, sale];
          setSales(updatedSales);
          localStorage.setItem('storehouse-sales', JSON.stringify(updatedSales));
        }
      });

      // Clear outbox after sync
      localStorage.setItem('sales-outbox', '[]');
      setPendingSales(0);
      displayToast(`✓ Synced ${outbox.length} pending sale(s)`);
    } catch (error) {
      console.error('Error syncing pending sales:', error);
    }
  };

  const saveSaleToOutbox = (sale) => {
    try {
      const outbox = JSON.parse(localStorage.getItem('sales-outbox') || '[]');
      outbox.push(sale);
      localStorage.setItem('sales-outbox', JSON.stringify(outbox));
      setPendingSales(outbox.length);
    } catch (error) {
      console.error('Error saving to outbox:', error);
    }
  };

  // CSV Export
  const exportToCSV = () => {
    // Generate Items CSV
    const itemsHeaders = ['Name', 'Category', 'Qty', 'Buy Price', 'Sell Price', 'Profit/Unit', 'Status'];
    const itemsRows = items.map(item => [
      item.name,
      item.category,
      item.qty,
      item.purchasePrice,
      item.sellingPrice,
      item.profit,
      item.status
    ]);

    const itemsCSV = [
      itemsHeaders.join(','),
      ...itemsRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Generate Sales CSV
    const salesHeaders = ['Date', 'Item', 'Qty', 'Price', 'Payment Method', 'Customer', 'Profit'];
    const salesRows = sales.map(sale => {
      const item = items.find(i => i.id === sale.itemId);
      const profit = item ? (sale.sellPrice - item.purchasePrice) * sale.quantity : 0;
      return [
        new Date(sale.timestamp).toLocaleDateString(),
        sale.itemName,
        sale.quantity,
        sale.sellPrice,
        sale.paymentMethod,
        sale.customerName || 'N/A',
        profit
      ];
    });

    const salesCSV = [
      salesHeaders.join(','),
      ...salesRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download Items CSV
    const itemsBlob = new Blob([itemsCSV], { type: 'text/csv' });
    const itemsUrl = URL.createObjectURL(itemsBlob);
    const itemsLink = document.createElement('a');
    itemsLink.href = itemsUrl;
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    itemsLink.download = `items_${dateStr}.csv`;
    itemsLink.click();
    URL.revokeObjectURL(itemsUrl);

    // Download Sales CSV
    setTimeout(() => {
      const salesBlob = new Blob([salesCSV], { type: 'text/csv' });
      const salesUrl = URL.createObjectURL(salesBlob);
      const salesLink = document.createElement('a');
      salesLink.href = salesUrl;
      salesLink.download = `sales_${dateStr}.csv`;
      salesLink.click();
      URL.revokeObjectURL(salesUrl);
    }, 500);

    displayToast('Exported Items and Sales CSV files!');
  };

  // WhatsApp share functions
  const handleShareWhatsApp = () => {
    const lowStockList = getLowStockItems();

    if (lowStockList.length === 0) {
      displayToast('No low stock items to share');
      return;
    }

    const message = generateLowStockMessage(lowStockList);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleShareTop3 = () => {
    const lowStockList = getLowStockItems().slice(0, 3);

    if (lowStockList.length === 0) {
      displayToast('No low stock items to share');
      return;
    }

    const message = generateLowStockMessage(lowStockList, true);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const generateLowStockMessage = (items, isTop3 = false) => {
    const businessName = settings.businessName || 'Storehouse';
    const today = new Date().toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let message = `⚠️ LOW STOCK ALERT\n`;
    message += `${businessName} - ${today}\n\n`;
    message += isTop3 ? `Top 3 most urgent items:\n\n` : `Items below reorder level:\n\n`;

    items.forEach((item, index) => {
      const reorderLevel = item.reorderLevel || 10;
      message += `${index + 1}. ${item.name} - Only ${item.qty} left (Reorder at ${reorderLevel})\n`;
    });

    message += `\nPlease restock soon! 📦`;

    return message;
  };

  // Inline stock editing handlers
  const handleStartEditStock = (itemId) => {
    setEditingStockId(itemId);
    setStockUpdateForm({
      ...stockUpdateForm,
      [itemId]: ''
    });
  };

  const handleCancelEditStock = () => {
    setEditingStockId(null);
  };

  const handleKeyPressStock = (e, itemId) => {
    if (e.key === 'Enter') {
      handleAddStock(itemId);
    } else if (e.key === 'Escape') {
      handleCancelEditStock();
    }
  };

  // Debt/Credit tracking handlers
  const handleShowDebts = () => {
    setShowDebts(true);
    setDebtSearchQuery('');
    setFilterStatus('all');
  };

  const getFilteredDebts = () => {
    let filtered = debts;

    // Filter by status
    if (filterStatus === 'unpaid') {
      filtered = filtered.filter(debt => debt.status === 'unpaid');
    } else if (filterStatus === 'paid') {
      filtered = filtered.filter(debt => debt.status === 'paid');
    }

    // Filter by search query
    if (debtSearchQuery) {
      filtered = filtered.filter(debt =>
        debt.customerName.toLowerCase().includes(debtSearchQuery.toLowerCase()) ||
        debt.itemName.toLowerCase().includes(debtSearchQuery.toLowerCase())
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate));
  };

  const handleMarkAsPaid = (debtId) => {
    // Atomic transaction: update debt status
    const updatedDebts = debts.map(debt => {
      if (debt.id === debtId && debt.status === 'unpaid') {
        return {
          ...debt,
          status: 'paid',
          paidDate: new Date().toISOString(),
          paidAmount: debt.amount
        };
      }
      return debt;
    });

    setDebts(updatedDebts);
    localStorage.setItem('storehouse-debts', JSON.stringify(updatedDebts));
  };

  const handleSendWhatsAppReminder = (debt) => {
    // Show confirmation before sending
    const confirmSend = window.confirm(
      `Send WhatsApp reminder to ${debt.customerName}?\n\n` +
      `Amount: ₦${debt.amount.toLocaleString()}\n` +
      `Item: ${debt.itemName} (x${debt.quantity})\n` +
      `Sale Date: ${new Date(debt.saleDate).toLocaleDateString()}`
    );

    if (!confirmSend) return;

    // Create WhatsApp message
    const message = encodeURIComponent(
      `Hello ${debt.customerName},\n\n` +
      `This is a friendly reminder about your outstanding balance:\n\n` +
      `Item: ${debt.itemName} (x${debt.quantity})\n` +
      `Amount: ₦${debt.amount.toLocaleString()}\n` +
      `Sale Date: ${new Date(debt.saleDate).toLocaleDateString()}\n\n` +
      `Please let us know when you can settle this amount.\n\n` +
      `Thank you!\n` +
      `${settings.businessName || 'Storehouse'}`
    );

    // Open WhatsApp with pre-filled message
    const phone = debt.customerPhone || '';
    const whatsappUrl = phone
      ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`
      : `https://wa.me/?text=${message}`;

    window.open(whatsappUrl, '_blank');
  };

  // Calculate total customer debt (money owed)
  const getTotalReceivables = () => {
    return debts
      .filter(debt => debt.status === 'unpaid')
      .reduce((sum, debt) => sum + debt.amount, 0);
  };

  // Sales History Functions
  const salesWithItems = useMemo(() => {
    return sales.map(sale => {
      const item = items.find(i => i.id === sale.itemId);
      return {
        ...sale,
        itemName: item?.name || 'Deleted Item'
      };
    }).sort((a, b) => b.createdAt - a.createdAt); // Newest first
  }, [sales, items]);

  const filteredSales = useMemo(() => {
    let result = [...salesWithItems];

    // Search filter
    if (salesSearchTerm) {
      const lower = salesSearchTerm.toLowerCase();
      result = result.filter(s =>
        s.itemName?.toLowerCase().includes(lower) ||
        s.customerName?.toLowerCase().includes(lower)
      );
    }

    // Date filter
    if (salesDateFilter !== 'all') {
      const now = Date.now();
      const ranges = {
        today: now - (24 * 60 * 60 * 1000),
        week: now - (7 * 24 * 60 * 60 * 1000),
        month: now - (30 * 24 * 60 * 60 * 1000),
      };
      result = result.filter(s => s.createdAt >= ranges[salesDateFilter]);
    }

    // Payment filter
    if (salesPaymentFilter !== 'all') {
      result = result.filter(s => s.paymentMethod === salesPaymentFilter);
    }

    return result;
  }, [salesWithItems, salesSearchTerm, salesDateFilter, salesPaymentFilter]);

  const salesSummary = useMemo(() => {
    // Use the shared helper for consistent calculations (matches WhatsApp summary)
    const totals = computeTotals(filteredSales);
    // Convert from kobo to Naira for display
    return {
      total: totals.total / 100,
      count: totals.count,
      cash: totals.cash / 100,
      card: totals.card / 100,
      credit: totals.credit / 100,
      units: totals.units
    };
  }, [filteredSales]);

  const exportSalesToCSV = () => {
    if (filteredSales.length === 0) {
      displayToast('No sales to export');
      return;
    }

    const headers = ['Date', 'Time', 'Item', 'Quantity', 'Unit Price', 'Total', 'Payment', 'Customer'];
    const rows = filteredSales.map(s => [
      new Date(s.createdAt).toLocaleDateString(),
      new Date(s.createdAt).toLocaleTimeString(),
      s.itemName,
      s.qty,
      (s.sellKobo / 100).toLocaleString(),
      ((s.sellKobo * s.qty) / 100).toLocaleString(),
      s.paymentMethod || 'Cash',
      s.customerName || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    displayToast('CSV exported successfully');
  };

  const generateWhatsAppSummary = (period) => {
    let periodSales;
    let rangeLabel;

    const now = Date.now();
    if (period === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      periodSales = salesWithItems.filter(s => s.createdAt >= todayStart.getTime());
      rangeLabel = `Today: ${new Date().toLocaleDateString()}`;
    } else if (period === 'week') {
      const weekStart = new Date(now - (7 * 24 * 60 * 60 * 1000));
      periodSales = salesWithItems.filter(s => s.createdAt >= weekStart.getTime());
      rangeLabel = `${weekStart.toLocaleDateString()} - ${new Date().toLocaleDateString()}`;
    } else if (period === 'month') {
      const monthStart = new Date(now - (30 * 24 * 60 * 60 * 1000));
      periodSales = salesWithItems.filter(s => s.createdAt >= monthStart.getTime());
      rangeLabel = `${monthStart.toLocaleDateString()} - ${new Date().toLocaleDateString()}`;
    }

    if (!periodSales || periodSales.length === 0) {
      displayToast('No sales for this period');
      return;
    }

    // Use the shared helper for consistent calculations
    const message = buildWhatsAppSummary(
      periodSales,
      rangeLabel,
      settings.businessName || 'STOREHOUSE'
    );

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const clearSalesFilters = () => {
    setSalesSearchTerm('');
    setSalesDateFilter('all');
    setSalesPaymentFilter('all');
  };

  const hasActiveSalesFilters = salesSearchTerm || salesDateFilter !== 'all' || salesPaymentFilter !== 'all';

  return (
    <div className="app container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="business-name">
            {profile.businessName || strings.app.name}
          </div>
          <CurrentDate className="date-display" />
        </div>
        <div className="header-right">
          <button
            className="calculator-icon-btn calculator-btn-desktop"
            onClick={handleCalculator}
            aria-label="Open calculator"
            title="Calculator (Press C)"
          >
            <span className="calc-emoji">🧮</span>
          </button>
          <button
            className="settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Business Settings"
            title="Business Settings"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* First-Run Setup Banner */}
      {!isProfileComplete && (
        <div style={{
          margin: '8px 0',
          padding: '14px 16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>👋 Welcome to Storehouse!</div>
            <div style={{ fontSize: '13px', opacity: '0.95' }}>
              Complete your business profile to get started
            </div>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.2)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 160ms',
              backdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            Set Up Now →
          </button>
        </div>
      )}

      {/* Beta Mode Badge */}
      {isBetaTester && (
        <div style={{
          margin: '8px 0',
          padding: '10px 12px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          <span>🧪 BETA MODE - Testing Premium Features</span>
          <span style={{ fontSize: '12px', opacity: '0.9' }}>Unlimited Access</span>
        </div>
      )}

      {/* Trial Banner */}
      {showTrialBanner && trialDaysLeft > 0 && (
        <div className="trial-banner">
          <div className="trial-banner-content">
            <span className="trial-info">
              ⏳ Trial: Day {14 - trialDaysLeft}/14
            </span>
            {trialNudgeMessage && (
              <span className="trial-nudge">{trialNudgeMessage}</span>
            )}
            <button
              className="trial-upgrade-btn"
              onClick={() => setShowPlansModal(true)}
            >
              Upgrade Now
            </button>
          </div>
          <button
            className="trial-close-btn"
            onClick={() => setShowTrialBanner(false)}
            aria-label="Close trial banner"
          >
            ×
          </button>
        </div>
      )}

      {/* Pending Sales Badge (shown when offline with pending sales) */}
      {!isOnline && pendingSales > 0 && (
        <div className="offline-badge">
          📡 {pendingSales} sale{pendingSales > 1 ? 's' : ''} pending sync
        </div>
      )}

      {/* Update Notification */}
      {showUpdateNotification && (
        <div className="update-notification">
          <span>🔄 New version available</span>
          <button
            className="update-refresh-btn"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          <button
            className="update-dismiss-btn"
            onClick={() => setShowUpdateNotification(false)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-container kpi-grid">
        <div className="kpi-card kpi sales">
          <div className="kpi-header label">Today's Sales</div>
          <div className="kpi-value value">
            {showSalesData ? `₦${todaysSales.total.toLocaleString()}` : '₦—'}
          </div>
          <div className="kpi-subtext hint">
            from {todaysSales.transactions} sale{todaysSales.transactions !== 1 ? 's' : ''}
          </div>
          <button
            className="kpi-link"
            onClick={() => setShowSalesHistory(true)}
          >
            View sales history
          </button>
        </div>

        <div className="kpi-card kpi stock">
          <div className="kpi-header label">Items in Stock</div>
          <div className="kpi-value value">{totalItems.toLocaleString()}</div>
          <div className="kpi-subtext hint">total units</div>
        </div>

        <div
          className="kpi-card kpi low-stock clickable"
          onClick={handleLowStock}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              handleLowStock();
            }
          }}
        >
          <div className="kpi-header label">Low Stock</div>
          <div className="kpi-value value">{lowStockItems}</div>
          <div className="kpi-subtext hint">need restocking</div>
        </div>

        <div
          className="kpi-card kpi receivables clickable"
          onClick={() => setShowCreditsDrawer(true)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setShowCreditsDrawer(true);
            }
          }}
        >
          <div className="kpi-header label">Customer Debt</div>
          <div className="kpi-value value">
            {showSalesData ? `₦${receivables.total.toLocaleString()}` : '₦—'}
          </div>
          <div className="kpi-subtext hint">
            from {receivables.count} customer{receivables.count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Center column for buttons, search, table */}
      <section className="mainColumn">
        {/* CTA Buttons */}
        <div className="actionsBlock">
          <button
            className="btnPrimary"
            onClick={handleRecordSale}
          >
            ₦ Record Sale
          </button>
          <button
            className="btnSecondary"
            onClick={() => setShowModal(true)}
          >
            + Add Item
          </button>
        </div>

        {/* Search Bar */}
        <div className="searchBar">
          <input
            type="text"
            className="inputSearch"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Items Table */}
        <div className="card">
          <table className="itemsTable">
            <thead>
              <tr>
                <th className="colItem">Item</th>
                <th className="colQty">Qty</th>
                <th className="colPrice">Price</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredItems().length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px' }}>
                    No items found
                  </td>
                </tr>
              ) : (
                getFilteredItems().map(item => {
                  const sellNaira = Math.round((item.sellKobo ?? item.sellingPrice ?? 0) / 100);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (settings.quickSellEnabled) {
                          window.dispatchEvent(new CustomEvent('open-record-sale', {
                            detail: { itemId: item.id }
                          }));
                        }
                      }}
                      style={{ cursor: settings.quickSellEnabled ? 'pointer' : 'default' }}
                    >
                      <td className="cellItem">{item.name}</td>
                      <td className="cellQty">{item.qty ?? 0}</td>
                      <td className="cellPrice">₦{sellNaira.toLocaleString()}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
          setExistingItem(null);
          setStockMode('add');
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Item</h2>
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
                setExistingItem(null);
                setStockMode('add');
              }}>×</button>
            </div>

            <div className="form-group">
              <label>Item Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter item name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="form-input"
              >
                <option value="Fashion & Clothing">Fashion & Clothing</option>
                <option value="Electronics & Accessories">Electronics & Accessories</option>
                <option value="Building Materials">Building Materials</option>
                <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Sports & Recreation">Sports & Recreation</option>
                <option value="Books & Stationery">Books & Stationery</option>
                <option value="Automotive">Automotive</option>
                <option value="Health & Pharmacy">Health & Pharmacy</option>
                <option value="General Merchandise">General Merchandise</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input
                type="number"
                name="qty"
                value={formData.qty}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                className="form-input"
              />

              {/* Stock mode UI - shown only when updating existing item */}
              {existingItem && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#64748B',
                    marginBottom: '8px',
                    fontWeight: '500'
                  }}>
                    Current stock: {existingItem.qty}
                  </div>

                  {/* Mode toggle */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                    padding: '4px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0'
                  }}>
                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: stockMode === 'add' ? '#2063F0' : 'transparent',
                      color: stockMode === 'add' ? '#fff' : '#475569',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="stockMode"
                        value="add"
                        checked={stockMode === 'add'}
                        onChange={(e) => setStockMode(e.target.value)}
                        style={{ marginRight: '6px' }}
                      />
                      Add units
                    </label>
                    <label style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: stockMode === 'replace' ? '#2063F0' : 'transparent',
                      color: stockMode === 'replace' ? '#fff' : '#475569',
                      transition: 'all 0.2s'
                    }}>
                      <input
                        type="radio"
                        name="stockMode"
                        value="replace"
                        checked={stockMode === 'replace'}
                        onChange={(e) => setStockMode(e.target.value)}
                        style={{ marginRight: '6px' }}
                      />
                      Replace total
                    </label>
                  </div>

                  {/* Preview text */}
                  {formData.qty && parseInt(formData.qty) > 0 && (
                    <div style={{
                      fontSize: '12px',
                      color: '#475569',
                      fontStyle: 'italic',
                      paddingLeft: '4px'
                    }}>
                      {stockMode === 'add'
                        ? `Will become: ${existingItem.qty} + ${parseInt(formData.qty)} = ${existingItem.qty + parseInt(formData.qty)}`
                        : `Will set total to: ${parseInt(formData.qty)}`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Purchase Price (₦)</label>
                <input
                  type="text"
                  name="purchasePrice"
                  value={formattedPrices.purchasePrice}
                  onChange={handleInputChange}
                  placeholder="What you paid"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Selling Price (₦)</label>
                <input
                  type="text"
                  name="sellingPrice"
                  value={formattedPrices.sellingPrice}
                  onChange={handleInputChange}
                  placeholder="Customer pays"
                  className="form-input"
                />
              </div>
            </div>

            {/* Profit Calculation Display */}
            {calculatedProfit.profit > 0 && (
              <div className="profit-calculator-display">
                <div className="profit-info">
                  <span className="profit-label">Profit per unit:</span>
                  <span className="profit-value">
                    ₦{calculatedProfit.profit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="profit-percentage">
                      ({calculatedProfit.margin.toFixed(1)}% margin)
                    </span>
                  </span>
                </div>
                {formData.qty && (
                  <div className="total-profit-info">
                    <span className="profit-label">Total potential profit:</span>
                    <span className="profit-value-total">
                      ₦{(calculatedProfit.profit * parseInt(formData.qty || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
            {calculatedProfit.profit < 0 && (
              <div className="profit-calculator-display loss">
                <div className="profit-info">
                  <span className="profit-label">⚠ Loss per unit:</span>
                  <span className="profit-value loss">
                    -₦{Math.abs(calculatedProfit.profit).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn-save" onClick={handleSave}>
                Save Item
              </button>
              <button className="btn-cancel" onClick={() => {
                setShowModal(false);
                setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
                setExistingItem(null);
                setStockMode('add');
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Sale Modal */}
      <RecordSaleModal
        isOpen={showRecordSale}
        onClose={() => setShowRecordSale(false)}
        items={items}
        onSaveSale={handleSaveSale}
        onCreateDebt={(debtData) => {
          try {
            // Create debt in new IndexedDB debt store if available
            if (typeof addDebtNotify === 'function') {
              addDebtNotify({
                id: crypto.randomUUID(),
                ...debtData,
                status: 'open',
                paid: false
              });
            }
          } catch (error) {
            console.error('[Create Debt] Error:', error);
          }
        }}
        showSalesData={showSalesData}
      />

      {/* Calculator Bottom Sheet */}
      {showCalculator && (
        <>
          <div className="calculator-backdrop" onClick={() => setShowCalculator(false)} />
          <div className="calculator-sheet">
            <div className="calculator-header">
              <h2>Quick Calculator</h2>
              <button
                className="calc-close-btn"
                onClick={() => setShowCalculator(false)}
              >
                ×
              </button>
            </div>

            <div className="calculator-body">
              <div className="calc-form-group">
                <label>Search Item</label>
                <select
                  value={calcForm.itemId}
                  onChange={handleCalcItemSelect}
                  onBlur={handleCalcItemSelect}
                  className="calc-input"
                  style={{ minHeight: '44px' }}
                >
                  <option value="">Select an item...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="calc-form-row">
                <div className="calc-form-group">
                  <label>Your Price (₦)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    name="price"
                    value={calcForm.price}
                    onChange={handleCalcChange}
                    placeholder="0"
                    className="calc-input"
                    style={{ minHeight: '44px' }}
                  />
                </div>

                <div className="calc-form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    name="quantity"
                    value={calcForm.quantity}
                    onChange={handleCalcChange}
                    placeholder="1"
                    min="1"
                    className="calc-input"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              <div className="calc-total-section">
                <label>Total Amount</label>
                <div className="calc-total-display">
                  ₦{calcForm.total.toLocaleString()}
                </div>
              </div>

              <div className="calc-buttons">
                <button
                  className="calc-use-btn"
                  onClick={handleUseInSale}
                  disabled={!calcForm.itemId || !calcForm.quantity || !calcForm.price}
                >
                  Use in Sale
                </button>
                <button
                  className="calc-cancel-btn"
                  onClick={() => setShowCalculator(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Business Settings Sheet */}
      <BusinessSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onExportCSV={exportToCSV}
        onSendEOD={() => {
          setShowSettings(false);
          setShowEODModal(true);
        }}
        onViewPlans={() => {
          setShowSettings(false);
          setShowPlansModal(true);
        }}
        isBetaTester={isBetaTester}
        onToggleBeta={(newValue) => {
          setIsBetaTester(newValue);
          localStorage.setItem('storehouse-beta-mode', JSON.stringify(newValue));
          displayToast(newValue ? 'Beta Mode Enabled - All premium features unlocked!' : 'Beta Mode Disabled');
        }}
        currentPlan={currentPlan}
        itemCount={items.length}
        onToast={displayToast}
      />

      {/* Credit & Debts Modal */}
      {showDebts && (
        <div className="debts-overlay" onClick={() => setShowDebts(false)}>
          <div className="debts-modal" onClick={e => e.stopPropagation()}>
            <div className="debts-header">
              <h2>Credit & Debts</h2>
              <button className="debts-close" onClick={() => setShowDebts(false)}>×</button>
            </div>

            <div className="debts-controls">
              <div className="debts-search">
                <input
                  type="text"
                  placeholder="Search by customer or item..."
                  value={debtSearchQuery}
                  onChange={(e) => setDebtSearchQuery(e.target.value)}
                  className="debts-search-input"
                />
              </div>

              <div className="debts-filter">
                <button
                  className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'unpaid' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('unpaid')}
                >
                  Unpaid
                </button>
                <button
                  className={`filter-btn ${filterStatus === 'paid' ? 'active' : ''}`}
                  onClick={() => setFilterStatus('paid')}
                >
                  Paid
                </button>
              </div>
            </div>

            <div className="debts-summary">
              <div className="summary-item">
                <span className="summary-label">Total Owed:</span>
                <span className="summary-value">₦{getTotalReceivables().toLocaleString()}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Unpaid Debts:</span>
                <span className="summary-value">{debts.filter(d => d.status === 'unpaid').length}</span>
              </div>
            </div>

            <div className="debts-list">
              {getFilteredDebts().length === 0 ? (
                <div className="no-debts">
                  {debtSearchQuery ?
                    'No debts match your search' :
                    filterStatus === 'unpaid' ?
                    'No unpaid debts! All customers have paid.' :
                    filterStatus === 'paid' ?
                    'No paid debts yet.' :
                    'No credit sales recorded yet'}
                </div>
              ) : (
                getFilteredDebts().map(debt => (
                  <div key={debt.id} className={`debt-item ${debt.status}`}>
                    <div className="debt-info">
                      <div className="debt-customer-name">{debt.customerName}</div>
                      <div className="debt-details">
                        <span className="debt-item-name">{debt.itemName} (x{debt.quantity})</span>
                        <span className="debt-date">
                          {new Date(debt.saleDate).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="debt-amount">₦{debt.amount.toLocaleString()}</div>
                      {debt.status === 'paid' && (
                        <div className="debt-paid-info">
                          Paid on {new Date(debt.paidDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {debt.status === 'unpaid' && (
                      <div className="debt-actions">
                        <button
                          className="whatsapp-btn"
                          onClick={() => handleSendWhatsAppReminder(debt)}
                          title="Send WhatsApp reminder"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                          </svg>
                          Remind
                        </button>
                        <button
                          className="mark-paid-btn"
                          onClick={() => {
                            if (window.confirm(`Mark ₦${debt.amount.toLocaleString()} from ${debt.customerName} as paid?`)) {
                              handleMarkAsPaid(debt.id);
                            }
                          }}
                        >
                          Mark as Paid
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="debts-footer">
              <button className="close-debts-btn" onClick={() => setShowDebts(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Modal */}
      {showLowStock && (
        <div className="low-stock-overlay" onClick={() => setShowLowStock(false)}>
          <div className="low-stock-modal-new" onClick={e => e.stopPropagation()}>
            <div className="low-stock-header-new">
              <button className="low-stock-close-new" onClick={() => setShowLowStock(false)}>×</button>
            </div>

            {/* WhatsApp Share Buttons */}
            <div className="whatsapp-share-section">
              <button
                className="whatsapp-share-btn"
                onClick={handleShareWhatsApp}
                disabled={getLowStockItems().length === 0}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Share via WhatsApp
              </button>
              <button
                className="whatsapp-top3-btn"
                onClick={handleShareTop3}
                disabled={getLowStockItems().length === 0}
              >
                Share Top 3
              </button>
            </div>

            {/* Low Stock Table */}
            <div className="low-stock-table-container">
              {getLowStockItems().length === 0 ? (
                <div className="no-low-stock-new">
                  ✓ All items are well stocked!
                </div>
              ) : (
                <table className="low-stock-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Reorder</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {getLowStockItems().map(item => {
                      const reorderLevel = item.reorderLevel || 10;
                      const isEditing = editingStockId === item.id;

                      return (
                        <tr key={item.id}>
                          <td className="item-name-col">{item.name}</td>
                          <td className="qty-col">{item.qty}</td>
                          <td className="reorder-col">{reorderLevel}</td>
                          <td className="action-col">
                            {isEditing ? (
                              <div className="inline-edit-section">
                                <input
                                  type="number"
                                  value={stockUpdateForm[item.id] || ''}
                                  onChange={(e) => handleStockUpdateChange(item.id, e.target.value)}
                                  onKeyDown={(e) => handleKeyPressStock(e, item.id)}
                                  onBlur={handleCancelEditStock}
                                  placeholder="Qty"
                                  className="inline-stock-input"
                                  autoFocus
                                  min="1"
                                />
                                <button
                                  className="inline-confirm-btn"
                                  onClick={() => handleAddStock(item.id)}
                                  disabled={!stockUpdateForm[item.id]}
                                >
                                  ✓
                                </button>
                              </div>
                            ) : (
                              <button
                                className="add-stock-btn-new"
                                onClick={() => handleStartEditStock(item.id)}
                              >
                                + Add Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Undo Toast */}
      {displayToast && lastSale && (
        <div className="toast-notification">
          <div className="toast-content">
            <span>
              ✓ Sold {lastSale.quantity} × {lastSale.itemName} for ₦{lastSale.totalAmount.toLocaleString()}
              {lastSale.paymentMethod === 'credit' && ` (Credit: ${lastSale.customerName})`}
            </span>
            <button className="undo-btn" onClick={handleUndoSale}>
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Info Toast */}
      {infoToast && (
        <div className="toast-notification info-toast">
          <div className="toast-content">
            <span>ℹ️ {infoToast}</span>
          </div>
        </div>
      )}

      {/* Plans Modal */}
      {showPlansModal && (
        <div className="modal-overlay" onClick={() => setShowPlansModal(false)}>
          <div className="modal plans-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Choose Your Plan</h2>
              <button className="modal-close" onClick={() => setShowPlansModal(false)}>×</button>
            </div>
            <div className="plans-grid">
              {/* FREE Plan */}
              <div className={`plan-card ${currentPlan === 'FREE' ? 'current-plan' : ''}`}>
                <div className="plan-header">
                  <h3>FREE</h3>
                  <div className="plan-price">₦0<span>/month</span></div>
                </div>
                <ul className="plan-features">
                  <li>✓ Up to 10 products</li>
                  <li>✓ Single user</li>
                  <li>✓ Basic inventory tracking</li>
                  <li>✓ Sales recording</li>
                  <li>✗ Profit tracking</li>
                  <li>✗ Credit & Debt management</li>
                  <li>✗ WhatsApp EOD reports</li>
                </ul>
                {currentPlan === 'FREE' ? (
                  <button className="plan-btn current">Current Plan</button>
                ) : (
                  <button className="plan-btn" onClick={() => handlePlanChange('FREE')}>Downgrade</button>
                )}
              </div>

              {/* STARTER Plan */}
              <div className={`plan-card starter-plan ${currentPlan === 'STARTER' ? 'current-plan' : ''}`}>
                <div className="plan-badge">MOST POPULAR</div>
                <div className="plan-header">
                  <h3>STARTER</h3>
                  <div className="plan-price">₦5,000<span>/month</span></div>
                </div>
                <ul className="plan-features">
                  <li>✓ Up to 500 products</li>
                  <li>✓ Unlimited users</li>
                  <li>✓ Advanced inventory tracking</li>
                  <li>✓ Profit tracking</li>
                  <li>✓ Credit & Debt management</li>
                  <li>✓ WhatsApp EOD reports</li>
                  <li>✓ Low stock alerts</li>
                  <li>✓ Customer management</li>
                </ul>
                {currentPlan === 'STARTER' ? (
                  <button className="plan-btn current">Current Plan</button>
                ) : (
                  <button className="plan-btn upgrade" onClick={() => handlePlanChange('STARTER')}>Upgrade to Starter</button>
                )}
              </div>

              {/* BUSINESS Plan */}
              <div className={`plan-card ${currentPlan === 'BUSINESS' ? 'current-plan' : ''}`}>
                <div className="plan-header">
                  <h3>BUSINESS</h3>
                  <div className="plan-price">₦10,000<span>/month</span></div>
                </div>
                <ul className="plan-features">
                  <li>✓ Unlimited products</li>
                  <li>✓ Everything in STARTER</li>
                  <li>✓ Multi-location support</li>
                  <li>✓ Advanced reporting</li>
                  <li>✓ Priority support</li>
                  <li>✓ Custom integrations</li>
                </ul>
                {currentPlan === 'BUSINESS' ? (
                  <button className="plan-btn current">Current Plan</button>
                ) : (
                  <button className="plan-btn upgrade" onClick={() => handlePlanChange('BUSINESS')}>Upgrade to Business</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && (
        <div className="modal-overlay" onClick={() => setShowUpgradePrompt(false)}>
          <div className="modal upgrade-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upgrade Required</h2>
              <button className="modal-close" onClick={() => setShowUpgradePrompt(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="upgrade-message">
                You've reached the limit of <strong>10 products</strong> on the FREE plan.
              </p>
              <p>Upgrade to STARTER for:</p>
              <ul className="upgrade-benefits">
                <li>✓ Up to 500 products</li>
                <li>✓ Profit tracking</li>
                <li>✓ Credit & Debt management</li>
                <li>✓ WhatsApp EOD reports</li>
              </ul>
              <p className="upgrade-price">Only ₦5,000/month</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowUpgradePrompt(false)}>
                Maybe Later
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowUpgradePrompt(false);
                  setShowPlansModal(true);
                }}
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First Sale Modal */}
      {showFirstSaleModal && (
        <div className="modal-overlay first-sale-overlay" onClick={() => setShowFirstSaleModal(false)}>
          <div className="modal first-sale-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowFirstSaleModal(false)}>×</button>

            <div className="first-sale-header">
              <div className="celebration-icon">🎉</div>
              <h2>Great Start, {settings.businessName || 'there'}!</h2>
              <p className="celebration-text">You've recorded your first sale today!</p>
            </div>

            <div className="first-sale-stats-card">
              <h3>Today's Performance</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Today's Sales</span>
                  <span className="stat-value">
                    {showSalesData ? `₦${getTodaysSales().total.toLocaleString()}` : '₦—'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Profit so far</span>
                  <span className="stat-value">
                    {showSalesData ? `₦${getTodaysSales().profit.toLocaleString()}` : '₦—'}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Transactions</span>
                  <span className="stat-value">{getTodaysSales().transactions}</span>
                </div>
              </div>
            </div>

            <div className="first-sale-tip">
              💡 {(() => {
                const tips = [
                  "Tip: Use the calculator for quick price checks",
                  "Did you know? You can hide sales when customers are watching",
                  "Pro Tip: Track credit sales to know who owes you money",
                  "Reminder: Check your low stock items regularly",
                  "Tip: Export your data anytime with the CSV export feature"
                ];
                return tips[Math.floor(Math.random() * tips.length)];
              })()}
            </div>

            <div className="first-sale-actions">
              <button
                className="btn-continue"
                onClick={() => setShowFirstSaleModal(false)}
              >
                Continue
              </button>
              <button
                className="btn-upgrade-primary"
                onClick={() => {
                  setShowFirstSaleModal(false);
                  setShowPlansModal(true);
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EOD Report Modal */}
      {showEODModal && (
        <div className="modal-overlay" onClick={() => setShowEODModal(false)}>
          <div className="modal eod-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📤 Send EOD Report</h2>
              <button className="modal-close" onClick={() => setShowEODModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Choose report format:</p>
              <div className="format-selector">
                <label className={`format-option ${eodFormat === 'readable' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="eodFormat"
                    value="readable"
                    checked={eodFormat === 'readable'}
                    onChange={(e) => setEodFormat(e.target.value)}
                  />
                  <div className="format-label">
                    <strong>Readable</strong>
                    <span>With emojis and formatting</span>
                  </div>
                </label>
                <label className={`format-option ${eodFormat === 'monospace' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="eodFormat"
                    value="monospace"
                    checked={eodFormat === 'monospace'}
                    onChange={(e) => setEodFormat(e.target.value)}
                  />
                  <div className="format-label">
                    <strong>Monospace</strong>
                    <span>Plain text, compact</span>
                  </div>
                </label>
              </div>

              <div className="report-preview">
                <h4>Preview:</h4>
                <pre className="preview-text">
                  {showSalesData ? generateEODReport(eodFormat) : generateEODReport(eodFormat).replace(/₦[\d,]+/g, '₦—')}
                </pre>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEODModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSendEOD}>
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credits Drawer - Using CustomerDebtDrawer component */}
      <CustomerDebtDrawer
        isOpen={showCreditsDrawer}
        onClose={() => setShowCreditsDrawer(false)}
        businessName={settings.businessName}
        onToast={displayToast}
      />

      {/* Mark Paid Confirmation Modal - DebtDrawer upgrade */}
      {confirmMarkPaid && (
        <div className="modal-overlay" onClick={() => setConfirmMarkPaid(null)}>
          <div className="modal confirm-modal debt-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Mark as paid?</h2>
              <button className="modal-close" onClick={() => setConfirmMarkPaid(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>
                Mark {formatNaira(Math.round(confirmMarkPaid.totalOwed))} from <strong>{confirmMarkPaid.customerName}</strong> as paid?
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmMarkPaid(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={() => handleMarkCustomerPaid(confirmMarkPaid)}
              >
                Mark Paid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales History Page */}
      {showSalesHistory && (
        <div className="sales-history-page">
          <div className="sales-history-container">
            {/* Header */}
            <div className="sales-history-header">
              <button
                className="back-button"
                onClick={() => setShowSalesHistory(false)}
                aria-label="Back to dashboard"
              >
                ←
              </button>
              <h1>📊 Sales History</h1>
              <div className="header-actions">
                <button
                  className="action-btn-small"
                  onClick={exportSalesToCSV}
                  title="Export to CSV"
                >
                  📥 Export
                </button>
                <button
                  className="action-btn-small"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  title="Share summary"
                >
                  📱 Share
                </button>
              </div>
            </div>

            {/* Share Menu */}
            {showShareMenu && (
              <div className="share-menu-dropdown">
                <button onClick={() => { generateWhatsAppSummary('today'); setShowShareMenu(false); }}>
                  📅 Today's Summary
                </button>
                <button onClick={() => { generateWhatsAppSummary('week'); setShowShareMenu(false); }}>
                  📆 This Week
                </button>
                <button onClick={() => { generateWhatsAppSummary('month'); setShowShareMenu(false); }}>
                  📊 This Month
                </button>
              </div>
            )}

            {/* Filters */}
            <div className="sales-filters">
              <input
                type="search"
                className="sales-search"
                placeholder="🔍 Search items, customers..."
                value={salesSearchTerm}
                onChange={(e) => setSalesSearchTerm(e.target.value)}
              />
            </div>

            {/* Chip Filters */}
            <div className="filters">
              <div className="filters__left">
                <div className="chip-row" role="radiogroup" aria-label="Date range">
                  <Chip
                    active={salesDateFilter === 'today'}
                    onClick={() => setSalesDateFilter('today')}
                  >
                    Today
                  </Chip>
                  <Chip
                    active={salesDateFilter === 'week'}
                    onClick={() => setSalesDateFilter('week')}
                  >
                    This Week
                  </Chip>
                  <Chip
                    active={salesDateFilter === 'month'}
                    onClick={() => setSalesDateFilter('month')}
                  >
                    This Month
                  </Chip>
                  <Chip
                    active={salesDateFilter === 'all'}
                    onClick={() => setSalesDateFilter('all')}
                  >
                    All Time
                  </Chip>
                </div>

                <div className="chip-row" role="radiogroup" aria-label="Payment type">
                  <Chip
                    active={salesPaymentFilter === 'all'}
                    onClick={() => setSalesPaymentFilter('all')}
                  >
                    All Payments
                  </Chip>
                  <Chip
                    active={salesPaymentFilter === 'cash'}
                    onClick={() => setSalesPaymentFilter('cash')}
                  >
                    Cash
                  </Chip>
                  <Chip
                    active={salesPaymentFilter === 'transfer'}
                    onClick={() => setSalesPaymentFilter('transfer')}
                  >
                    Transfer
                  </Chip>
                  <Chip
                    active={salesPaymentFilter === 'card'}
                    onClick={() => setSalesPaymentFilter('card')}
                  >
                    Card
                  </Chip>
                  <Chip
                    active={salesPaymentFilter === 'credit'}
                    onClick={() => setSalesPaymentFilter('credit')}
                  >
                    Credit
                  </Chip>
                </div>
              </div>

              {hasActiveSalesFilters && (
                <div className="filters__right">
                  <button className="btn-clear" onClick={clearSalesFilters}>
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Summary Cards */}
            <div className="sales-summary-grid">
              <div className="summary-card total">
                <div className="card-title">Total Sales</div>
                <div className="card-value">₦{salesSummary.total.toLocaleString()}</div>
                <div className="card-subtitle">{salesSummary.count} sale{salesSummary.count !== 1 ? 's' : ''}</div>
              </div>
              <div className="summary-card cash">
                <div className="card-title">Cash</div>
                <div className="card-value">₦{salesSummary.cash.toLocaleString()}</div>
              </div>
              <div className="summary-card card-payment">
                <div className="card-title">Card/Transfer</div>
                <div className="card-value">₦{salesSummary.card.toLocaleString()}</div>
              </div>
              <div className="summary-card credit">
                <div className="card-title">Credit</div>
                <div className="card-value">₦{salesSummary.credit.toLocaleString()}</div>
              </div>
            </div>

            {/* Sales Table - Desktop */}
            {filteredSales.length > 0 ? (
              <>
                <div className="sales-table-container desktop-only">
                  <table className="sales-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Item</th>
                        <th>Qty</th>
                        <th>Amount</th>
                        <th>Payment</th>
                        <th>Customer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSales.map(sale => (
                        <tr
                          key={sale.id}
                          onClick={() => setSelectedSale(sale)}
                          className="clickable-row"
                        >
                          <td>
                            <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                            <div className="time-text">{new Date(sale.createdAt).toLocaleTimeString()}</div>
                          </td>
                          <td>{sale.itemName}</td>
                          <td>{sale.qty}</td>
                          <td>₦{((sale.sellKobo * sale.qty) / 100).toLocaleString()}</td>
                          <td>
                            <span className={`payment-badge ${sale.paymentMethod}`}>
                              {sale.paymentMethod || 'cash'}
                            </span>
                          </td>
                          <td>{sale.customerName || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sales Cards - Mobile */}
                <div className="sales-cards mobile-only">
                  {filteredSales.map(sale => (
                    <div
                      key={sale.id}
                      className="sale-card"
                      onClick={() => setSelectedSale(sale)}
                    >
                      <div className="sale-card-header">
                        <div className="sale-item-name">{sale.itemName}</div>
                        <div className="sale-amount">₦{((sale.sellKobo * sale.qty) / 100).toLocaleString()}</div>
                      </div>
                      <div className="sale-card-details">
                        <span>Qty: {sale.qty}</span>
                        <span>•</span>
                        <span className={`payment-badge ${sale.paymentMethod}`}>
                          {sale.paymentMethod || 'cash'}
                        </span>
                      </div>
                      <div className="sale-card-footer">
                        <span className="sale-date">{new Date(sale.createdAt).toLocaleString()}</span>
                        {sale.customerName && <span className="sale-customer">{sale.customerName}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>{hasActiveSalesFilters ? 'No sales found' : 'No sales yet'}</h3>
                <p>{hasActiveSalesFilters ? 'Try adjusting your filters' : 'Sales you record will appear here'}</p>
                {hasActiveSalesFilters ? (
                  <button className="btn-primary" onClick={clearSalesFilters}>
                    Clear Filters
                  </button>
                ) : (
                  <button className="btn-primary" onClick={() => {
                    setShowSalesHistory(false);
                    setShowRecordSale(true);
                  }}>
                    Record First Sale
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sale Details Modal with Receipt */}
      {selectedSale && (
        <div className="sale-details-overlay" onClick={() => setSelectedSale(null)}>
          <div className="sale-details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Sale Details & Receipt</h3>
              <button className="close-btn" onClick={() => setSelectedSale(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Receipt Preview Component */}
              <ReceiptPreview
                sale={selectedSale}
                business={{
                  name: settings.businessName || 'Storehouse Shop',
                  phone: settings.phoneNumber || '',
                  address: ''
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Footer Spacer - prevents FAB from overlapping content */}
      <div className="footer-spacer"></div>

      {/* Mobile FAB Calculator Button */}
      <button
        className="calculator-fab fab"
        onClick={handleCalculator}
        aria-label="Open calculator"
        title="Calculator (Press C)"
      >
        <span className="calc-emoji">🧮</span>
      </button>

      {/* Footer */}
      <footer className="app-footer powered">
        <p>⚡ Powered by {strings.app.name}</p>
      </footer>
    </div>
  );
}

export default App;
