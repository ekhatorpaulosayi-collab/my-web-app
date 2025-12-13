import React, { useState, useEffect, useMemo, useRef } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import './styles/dashboard.css';
import { useStrings } from './hooks/useStrings';
import { Settings, Calculator, Lock, Eye, EyeOff, DollarSign, Camera, X, Share2 } from 'lucide-react';
import TestPayment from './pages/TestPayment';
import { usePreferences } from './contexts/PreferencesContext.tsx';
import { useStaff } from './contexts/StaffContext.tsx';
import { BusinessTypeSelector } from './components/BusinessTypeSelector.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { DashboardCustomize } from './components/DashboardCustomize.tsx';
import AIChatWidget from './components/AIChatWidget.tsx';
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
import RecordSaleModalV2 from './components/RecordSaleModalV2.tsx';
import BusinessSettings from './components/BusinessSettings.tsx';
import CalculatorModal from './components/CalculatorModal.tsx';
import { OfflineBanner } from './components/OfflineBanner.tsx';
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
import { calculateTax, getCurrentMonth, shareViaWhatsApp, downloadTaxSummary } from './utils/taxCalculations.ts';
import { shareProductToWhatsApp } from './utils/shareToWhatsApp';
import ExpenseModal from './components/ExpenseModal.tsx';
import { saveExpense, getCurrentMonthExpenses, calculateTotalExpenses } from './lib/expenses.ts';
import ExpensesPage from './pages/ExpensesPage.tsx';
import TaxPanel from './components/TaxPanel.tsx';
import MoneyPage from './pages/MoneyPage.jsx';
import { hasPinSet, verifyPin, isUnlocked, unlock, lock } from './lib/pinService.ts';
import ShareStoreCard from './components/ShareStoreCard.jsx';
import { useAuth } from './contexts/AuthContext';
import { useUser } from './lib/supabase-hooks';
import {
  getProducts,
  subscribeToProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  productExists
} from './services/supabaseProducts';
// import { migrateUserData } from './services/dataMigration'; // Disabled - migration not needed
import { CSVImport } from './components/CSVImport.tsx';
import { uploadProductImage } from './lib/supabase-storage';
import { ContextualPromptToast } from './components/ContextualPromptToast.tsx';
import { useContextualPrompts } from './hooks/useContextualPrompts.ts';
import { getCategoryAttributes, formatAttributeValue, getAttributeIcon } from './config/categoryAttributes.ts';
import { VariantManager } from './components/VariantManager.tsx';
import { createVariants, getProductVariants } from './lib/supabase-variants.ts';
import MultiImageUpload from './components/MultiImageUpload.tsx';
import UpgradeModal from './components/UpgradeModal.tsx';
import { exportAllDataCSV } from './utils/csvExport.ts';

function App() {
  const navigate = useNavigate();
  // Get strings for branding
  const strings = useStrings();

  // Business profile context
  const { profile, isProfileComplete } = useBusinessProfile();

  // Auth context - get current user for Firebase operations
  const { currentUser } = useAuth();

  // Get Supabase user (converts Firebase UID to Supabase UUID)
  const { user: supabaseUser } = useUser(currentUser);

  // Preferences context - dashboard widgets and customization
  const { isFirstTimeSetup, completeSetup } = usePreferences();

  // Staff context - track who records sales
  const { currentStaff } = useStaff();

  // Contextual prompts - smart suggestions based on usage
  const { prompt, dismissPrompt: dismissContextualPrompt } = useContextualPrompts();

  // Dashboard customization modal
  const [showDashboardCustomize, setShowDashboardCustomize] = useState(false);

  // Utility function to format number with commas
  const formatNumberWithCommas = (value) => {
    // Handle empty or invalid input
    if (!value && value !== 0) return '';

    // Convert to string and remove all characters except digits and decimal point
    let stringValue = String(value).replace(/[^\d.]/g, '');

    // Handle multiple decimal points - keep only the first one
    const decimalCount = (stringValue.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const firstDecimalIndex = stringValue.indexOf('.');
      stringValue = stringValue.slice(0, firstDecimalIndex + 1) + stringValue.slice(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Split into integer and decimal parts
    const parts = stringValue.split('.');

    // Format integer part with commas (only if there are digits)
    if (parts[0]) {
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Rejoin with decimal point if it exists (limit to 2 decimal places)
    if (parts.length > 1) {
      return `${parts[0] || '0'}.${parts[1].slice(0, 2)}`;
    }

    return parts[0] || '';
  };

  // Utility function to parse number from formatted string
  const parseFormattedNumber = (value) => {
    // Remove commas but keep decimal point
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

  // Test Payment Page toggle
  const [showTestPayment, setShowTestPayment] = useState(() => {
    const saved = localStorage.getItem('storehouse-test-mode');
    return saved ? JSON.parse(saved) : false; // Default false - main app
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
  const [isLoadingData, setIsLoadingData] = useState(false); // Start false for instant UI

  const [showModal, setShowModal] = useState(false);
  const [showRecordSale, setShowRecordSale] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorItems, setCalculatorItems] = useState(null); // Pre-filled items from calculator
  const [preselectedItem, setPreselectedItem] = useState(null); // Pre-selected item from table click
  const [showSalesData, setShowSalesData] = useState(true); // Renamed for clarity - true = revealed, false = hidden

  // PIN Protection state
  const [isPinLocked, setIsPinLocked] = useState(true); // Locked by default
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalContext, setPinModalContext] = useState(null); // 'money' or null
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinPassword, setShowPinPassword] = useState(false);
  const [pinAttempts, setPinAttempts] = useState(3);
  const [pinShake, setPinShake] = useState(false);
  const [rememberPin, setRememberPin] = useState(false);

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

  // Upgrade Modal state for tier limits
  const [upgradeModalState, setUpgradeModalState] = useState({
    isOpen: false,
    limitType: 'products',
    currentTier: 'Free',
    suggestedTier: 'Starter',
    currentCount: 0,
    limit: 0,
    reason: ''
  });
  const [showFirstSaleModal, setShowFirstSaleModal] = useState(false);
  const [showEODModal, setShowEODModal] = useState(false);
  const [eodFormat, setEodFormat] = useState('readable');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showExpensesPage, setShowExpensesPage] = useState(false);
  const [showMoneyPage, setShowMoneyPage] = useState(false);
  const [expensesUpdateCounter, setExpensesUpdateCounter] = useState(0);
  const [showCSVImport, setShowCSVImport] = useState(false);

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
    category: 'Fashion', // Default category
    description: '', // Product description (optional)
    barcode: '', // Barcode/SKU (optional)
    qty: '',
    purchasePrice: '',
    sellingPrice: '',
    reorderLevel: '10', // Default reorder level
    isPublic: true, // Default to public for storefront
    attributes: {} // Category-specific attributes
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

  // Product image upload state
  const [productImageFile, setProductImageFile] = useState(null);
  const [productImagePreview, setProductImagePreview] = useState('');
  const [productImages, setProductImages] = useState([]);
  const [editingProductId, setEditingProductId] = useState(null);

  // Product variants state
  const [productVariants, setProductVariants] = useState([]);

  // Inventory table variants state
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [productVariantsMap, setProductVariantsMap] = useState({});

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

  // Check PIN status on mount
  useEffect(() => {
    const checkPinStatus = async () => {
      const pinExists = await hasPinSet();
      if (!pinExists) {
        // No PIN set, unlock by default
        setIsPinLocked(false);
      } else {
        // PIN exists, check if unlocked in this session
        const unlocked = isUnlocked();
        setIsPinLocked(!unlocked);
      }
    };
    checkPinStatus();
  }, []);

  // Helper: Check if PIN session is still valid (within 5 minutes)
  const isPinSessionValid = () => {
    const sessionData = sessionStorage.getItem('pin-session');
    if (!sessionData) return false;

    try {
      const { timestamp } = JSON.parse(sessionData);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      return (now - timestamp) < fiveMinutes;
    } catch {
      return false;
    }
  };

  // Helper: Store PIN session for 5 minutes
  const storePinSession = () => {
    sessionStorage.setItem('pin-session', JSON.stringify({
      timestamp: Date.now()
    }));
  };

  // Helper: Clear PIN session
  const clearPinSession = () => {
    sessionStorage.removeItem('pin-session');
  };

  // Handle PIN verification
  const handlePinSubmit = async () => {
    if (!pinInput) {
      setPinError('Please enter a PIN');
      return;
    }

    if (pinAttempts <= 0) {
      setPinError('Too many attempts. Please try again later.');
      return;
    }

    const isValid = await verifyPin(pinInput);
    if (isValid) {
      unlock(); // Mark as unlocked in session
      setIsPinLocked(false);

      // If "Remember for 5 minutes" is checked, store session
      if (rememberPin) {
        storePinSession();
      }

      // Clear modal state
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
      setPinAttempts(3); // Reset attempts
      setShowPinPassword(false);
      setRememberPin(false);

      // If opened for Money page, navigate there
      if (pinModalContext === 'money') {
        setShowMoneyPage(true);
        setPinModalContext(null);
      }

      // Dispatch event so other components can react
      window.dispatchEvent(new CustomEvent('pin:unlocked'));
    } else {
      const attemptsLeft = pinAttempts - 1;
      setPinAttempts(attemptsLeft);

      if (attemptsLeft > 0) {
        setPinError(`Incorrect PIN. ${attemptsLeft} attempt${attemptsLeft > 1 ? 's' : ''} remaining.`);
      } else {
        setPinError('Too many attempts. Please try again later.');
      }

      setPinInput('');
      setShowPinPassword(false);

      // Trigger shake animation
      setPinShake(true);
      setTimeout(() => setPinShake(false), 500);
    }
  };

  // Handle PIN lock
  const handlePinLock = () => {
    lock(); // Clear session unlock
    setIsPinLocked(true);
    clearPinSession(); // Clear remember me session
    window.dispatchEvent(new CustomEvent('pin:locked'));
  };

  // Handle unlock button click
  const handleUnlockClick = () => {
    setShowPinModal(true);
    setPinError('');
    setPinAttempts(3); // Reset attempts each time modal opens
    setShowPinPassword(false);
    setRememberPin(false);
  };

  // Handle Money page access (with PIN check)
  const handleMoneyPageAccess = async () => {
    // Check if PIN is set
    const pinExists = await hasPinSet();
    if (!pinExists) {
      alert('Please set a PIN in Settings → Security & Privacy first');
      setShowSettings(true);
      return;
    }

    // Check if we have a valid session (remember for 5 minutes)
    if (isPinSessionValid()) {
      setShowMoneyPage(true);
      return;
    }

    // Show PIN modal
    setPinModalContext('money');
    setShowPinModal(true);
    setPinError('');
    setPinAttempts(3);
    setShowPinPassword(false);
    setRememberPin(false);
  };

  useEffect(() => {
    if (formData.purchasePrice && formData.sellingPrice) {
      const purchase = parseFloat(formData.purchasePrice);
      const selling = parseFloat(formData.sellingPrice);

      if (purchase > 0 && selling > 0) {
        const profit = selling - purchase;
        const markup = ((profit / purchase) * 100); // Markup = (Profit / Cost) × 100

        setCalculatedProfit({
          profit: profit,
          margin: markup // Using 'margin' key for backward compatibility, but now stores markup %
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

  // Repair sales database dates - Ctrl+Shift+R
  useEffect(() => {
    async function repairSalesDates() {
      try {
        const db = await getDB();
        const tx = db.transaction(['sales'], 'readwrite');
        const store = tx.objectStore('sales');
        const allSales = await new Promise((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        console.log('🔧 [Repair] Found', allSales.length, 'sales to check');

        let fixed = 0;
        const updates = [];

        for (const sale of allSales) {
          let needsUpdate = false;
          const updated = { ...sale };

          // Ensure createdAt timestamp exists
          if (!sale.createdAt) {
            // Try to compute from dayKey
            if (sale.dayKey) {
              const [year, month, day] = sale.dayKey.split('-').map(Number);
              updated.createdAt = new Date(year, month - 1, day, 12, 0, 0).getTime();
              needsUpdate = true;
              console.log('  Fixed createdAt for sale', sale.id, 'using dayKey:', sale.dayKey);
            } else {
              // Use current time as fallback
              updated.createdAt = Date.now();
              needsUpdate = true;
              console.log('  Fixed createdAt for sale', sale.id, 'using current time');
            }
          }

          // Ensure dayKey exists and matches createdAt
          const saleDate = new Date(updated.createdAt);
          const correctDayKey = localDayKey(saleDate);
          if (!sale.dayKey || sale.dayKey !== correctDayKey) {
            updated.dayKey = correctDayKey;
            needsUpdate = true;
            console.log('  Fixed dayKey for sale', sale.id, 'from', sale.dayKey, 'to', correctDayKey);
          }

          if (needsUpdate) {
            updates.push(updated);
            fixed++;
          }
        }

        if (fixed > 0) {
          const txUpdate = db.transaction(['sales'], 'readwrite');
          const storeUpdate = txUpdate.objectStore('sales');

          for (const sale of updates) {
            storeUpdate.put(sale);
          }

          await new Promise((resolve, reject) => {
            txUpdate.oncomplete = resolve;
            txUpdate.onerror = () => reject(txUpdate.error);
          });

          console.log('✅ [Repair] Fixed', fixed, 'sales');
          alert(`✅ Repaired ${fixed} sales dates!\n\nReloading page...`);

          // Reload sales
          const txReload = db.transaction(['sales'], 'readonly');
          const storeReload = txReload.objectStore('sales');
          const reloadedSales = await new Promise((resolve, reject) => {
            const req = storeReload.getAll();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          });

          setSales(reloadedSales);
          displayToast(`✅ Repaired ${fixed} sales dates!`, 3000);
        } else {
          console.log('✅ [Repair] All sales dates are correct');
          alert('✅ All sales dates are correct!\n\nNo repairs needed.');
        }
      } catch (error) {
        console.error('❌ [Repair] Error:', error);
        alert('❌ Failed to repair sales: ' + error.message);
      }
    }

    function onKey(e) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        console.log('🔧 [Repair] Starting sales date repair...');
        repairSalesDates();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sales]);

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

    const todayKey = localDayKey();

    // ROBUST FILTERING: Handle old sales that might not have dayKey or have wrong format
    const todaySales = sales.filter(sale => {
      // If sale has dayKey, use it
      if (sale.dayKey) {
        return sale.dayKey === todayKey;
      }

      // FALLBACK: If no dayKey, compute from createdAt timestamp
      if (sale.createdAt) {
        const saleDate = new Date(sale.createdAt);
        const saleDayKey = localDayKey(saleDate);
        return saleDayKey === todayKey;
      }

      // No valid date info, skip this sale
      return false;
    });


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

  // Calculate current month's income tax estimate (SIMPLIFIED - NO COGS)
  const getMonthlyTax = () => {
    // Safety check: ensure sales is an array
    if (!sales || !Array.isArray(sales)) {
      return {
        estimatedTax: 0,
        salesTotal: 0,
        expensesTotal: 0,
        profit: 0,
        salesCount: 0,
        expensesCount: 0
      };
    }

    // Get first and last day of current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0); // Start of first day

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999); // End of last day

    // Filter sales for current month using createdAt field
    const monthSales = sales.filter(sale => {
      if (!sale.createdAt) {
        console.warn('Sale missing createdAt:', sale);
        return false;
      }

      const saleDate = new Date(sale.createdAt);
      const isInRange = saleDate >= firstDay && saleDate <= lastDay;

      return isInRange;
    });

    // Calculate total sales revenue in naira (from kobo)
    const totalKobo = monthSales.reduce((sum, sale) => {
      return sum + (sale.qty * sale.sellKobo);
    }, 0);
    const salesTotal = Math.round(totalKobo / 100);

    // Get current month operating expenses (rent, utilities, etc.)
    const monthExpenses = getCurrentMonthExpenses();
    const expensesTotal = calculateTotalExpenses(monthExpenses);

    // SIMPLE Profit = Sales - Expenses (NO COGS)
    const profit = Math.max(0, salesTotal - expensesTotal);

    // Calculate estimated income tax using configurable rate (default 2%)
    const taxRate = settings?.taxRatePct ?? 2;
    const estimatedTax = (profit * taxRate) / 100;

    // Debug logging
    console.log('📊 Tax Calculation (Simple):', {
      salesTotal,
      expensesTotal,
      profit,
      taxRate,
      estimatedTax,
      salesCount: monthSales.length,
      expensesCount: monthExpenses.length,
      formula: `Profit = Sales (₦${salesTotal}) - Expenses (₦${expensesTotal}) = ₦${profit}`
    });

    return {
      estimatedTax,
      salesTotal,
      expensesTotal,
      profit,
      salesCount: monthSales.length,
      expensesCount: monthExpenses.length
    };
  };

  const monthlyTax = useMemo(() => getMonthlyTax(), [sales, expensesUpdateCounter, settings?.taxRatePct]);

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

  // Listen for expense updates to refresh tax calculation
  useEffect(() => {
    const handleExpenseUpdate = (event) => {
      console.log('🔔 [Dashboard] Expense event received!', event.detail);
      // Increment counter to trigger re-render and recalculate tax
      setExpensesUpdateCounter(prev => {
        console.log('📊 [Dashboard] Incrementing expenses counter from', prev, 'to', prev + 1);
        return prev + 1;
      });
    };

    window.addEventListener('storehouse:expense-updated', handleExpenseUpdate);
    console.log('👂 [Dashboard] Listening for expense updates');

    return () => {
      window.removeEventListener('storehouse:expense-updated', handleExpenseUpdate);
    };
  }, []);

  // Initialize Firebase and load data
  useEffect(() => {
    if (!currentUser) {
      console.log('[App] No user logged in, skipping data load');
      return;
    }

    const initializeData = async () => {
      try {
        console.log('[App] Initializing data for user:', currentUser.uid);

        // Initialize IndexedDB for sales/credits (still using IndexedDB for these)
        await initDB();
        await seedDemoItems();

        // Load products from Supabase FIRST (most critical for UI)
        console.log('[App] Loading products from Supabase...');
        console.log('[App] Firebase UID:', currentUser.uid);
        console.log('[App] Supabase UUID:', supabaseUser?.id);
        const products = await getProducts(currentUser.uid);  // Use Firebase UID during migration
        console.log('[App] Loaded', products.length, 'products from Supabase');
        setItems(products);
        // UI already showing, just update with data

        // Migration check disabled - already using Supabase
        // Keeping this commented out to avoid Firebase permission errors in console
        // If you need to re-enable migration, uncomment the code below:
        /*
        setTimeout(async () => {
          console.log('[App] Checking migration status in background...');
          try {
            const migrationResult = await migrateUserData(currentUser.uid);
            console.log('[App] Migration result:', migrationResult);
          } catch (error) {
            console.error('[App] Migration failed:', error);
          }
        }, 100);
        */

        // Load sales from IndexedDB in background
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

        console.log('[App] Loaded', allSales.length, 'sales from IndexedDB');

        // Skip dayKey migration if already done (check localStorage)
        const migrationDone = localStorage.getItem('storehouse-daykey-migration-done');
        const salesNeedingFix = migrationDone ? [] : allSales.filter(s => !s.dayKey && s.createdAt);

        if (salesNeedingFix.length > 0) {
          console.log('[App] 🔧 Migrating', salesNeedingFix.length, 'sales to add dayKey...');

          try {
            const txFix = db.transaction(['sales'], 'readwrite');
            const salesStoreFix = txFix.objectStore('sales');

            salesNeedingFix.forEach(sale => {
              const saleDate = new Date(sale.createdAt);
              const dayKey = localDayKey(saleDate);
              const updatedSale = { ...sale, dayKey };
              salesStoreFix.put(updatedSale);
            });

            await new Promise((resolve, reject) => {
              txFix.oncomplete = () => {
                console.log('[App] ✅ Migration complete!');
                localStorage.setItem('storehouse-daykey-migration-done', 'true');
                resolve();
              };
              txFix.onerror = () => reject(txFix.error);
            });

            // Reload sales after migration
            const txReload = db.transaction(['sales'], 'readonly');
            const salesStoreReload = txReload.objectStore('sales');
            const getAllAgain = salesStoreReload.getAll();

            const migratedSales = await new Promise((resolve, reject) => {
              getAllAgain.onsuccess = () => resolve(getAllAgain.result);
              getAllAgain.onerror = () => reject(new Error('Failed to reload sales'));
            });

            setSales(migratedSales);
            console.log('[App] Reloaded', migratedSales.length, 'sales after migration');
          } catch (migrationError) {
            console.error('[App] Migration failed:', migrationError);
            setSales(allSales); // Use unmigrated sales as fallback
          }
        } else {
          console.log('[App] No migration needed - all sales have dayKey');
          setSales(allSales);
        }

        // Load credits from IndexedDB (not migrated yet)
        const allCredits = await getCredits();
        setCredits(allCredits);

        console.log('[App] Data loaded successfully');
      } catch (error) {
        console.error('[App] Failed to initialize data:', error);
        // UI already showing, error handling will happen in components
      }
    };

    // Set up real-time subscription to products
    let unsubscribe;
    const setupSubscription = async () => {
      await initializeData();

      console.log('[App] Setting up real-time product subscription...');
      unsubscribe = subscribeToProducts(currentUser.uid, (products, error) => {  // Use Firebase UID
        if (error) {
          console.error('[App] Product subscription error:', error);
          return;
        }

        if (products) {
          console.log('[App] Real-time update:', products.length, 'products');
          setItems(products);
        }
      });
    };

    setupSubscription();

    // Cleanup subscription on unmount or user change
    return () => {
      if (unsubscribe) {
        console.log('[App] Cleaning up product subscription');
        unsubscribe();
      }
    };
  }, [currentUser]);

  // Migrate PRO/TEAM users to STARTER (run once on mount)
  useEffect(() => {
    const storedPlan = localStorage.getItem('storehouse-plan');
    if (storedPlan === 'PRO' || storedPlan === 'TEAM') {
      console.log(`[Migration] Converting ${storedPlan} plan to STARTER`);
      setCurrentPlan('STARTER');
      localStorage.setItem('storehouse-plan', 'STARTER');
    }
  }, []);

  // Fetch variants for all products when items change
  useEffect(() => {
    if (items.length > 0) {
      const fetchAllVariants = async () => {
        console.log('[App] 🔍 Fetching variants for', items.length, 'products...');
        const variantsMap = {};

        for (const item of items) {
          try {
            const variants = await getProductVariants(item.id.toString());
            if (variants.length > 0) {
              console.log(`[App] ✅ Found ${variants.length} variants for product:`, item.name);
              variantsMap[item.id] = variants;
            }
          } catch (error) {
            console.error(`[App] Failed to fetch variants for product ${item.id}:`, error);
          }
        }

        console.log('[App] 📦 Total products with variants:', Object.keys(variantsMap).length);
        setProductVariantsMap(variantsMap);
      };

      fetchAllVariants();
    } else {
      // Clear variants map when no items
      setProductVariantsMap({});
    }
  }, [items]);

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

  // Listen for calculator "Add to Sale" events
  useEffect(() => {
    const handleAddToSale = (e) => {
      const { lines, subtotal, source, timestamp } = e.detail;
      console.log('[App] Calculator Add to Sale:', { lines: lines.length, subtotal, source, timestamp });

      // Store calculator items and open Record Sale modal
      setCalculatorItems({ lines, subtotal });
      setShowCalculator(false); // Close calculator
      setShowRecordSale(true); // Open Record Sale modal

      displayToast(`Added ${lines.length} items from calculator`);
    };

    window.addEventListener('storehouse:add-to-sale', handleAddToSale);
    return () => window.removeEventListener('storehouse:add-to-sale', handleAddToSale);
  }, []);

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
      console.log('[App] open-record-sale event received:', e.detail);
      const itemId = e.detail?.itemId;
      if (!itemId) {
        console.log('[App] No itemId in event');
        return;
      }

      console.log('[App] Looking for item with ID:', itemId, 'Type:', typeof itemId);
      console.log('[App] Total items:', items.length);

      // Try both string and number comparison
      const item = items.find(i => String(i.id) === String(itemId) || i.id === itemId);
      if (!item) {
        console.log('[App] Item not found! Available IDs:', items.slice(0, 5).map(i => ({id: i.id, type: typeof i.id})));
        return;
      }

      console.log('[App] Item found:', item.name, 'Opening modal...');

      // Set preselected item for RecordSaleModal
      setPreselectedItem(item);

      // Open modal
      setShowRecordSale(true);
    };

    window.addEventListener('open-record-sale', handler);
    return () => window.removeEventListener('open-record-sale', handler);
  }, [items]);

  // Quick Sell widget handler - from Dashboard
  useEffect(() => {
    const handler = (e) => {
      const itemId = e.detail?.itemId;
      if (!itemId) return;

      // Find item by ID (handles both string and numeric IDs)
      const item = items.find(i => String(i.id) === String(itemId) || i.id === itemId);
      if (!item) return;

      // Set preselected item and open modal
      setPreselectedItem(item);
      setShowRecordSale(true);
    };

    window.addEventListener('quicksell:item', handler);
    return () => window.removeEventListener('quicksell:item', handler);
  }, [items]);

  // TEST: WhatsApp receipt test button handler
  useEffect(() => {
    const handler = () => {
      console.log('[WhatsApp Test] Building test receipt with multiple items...');

      // Test with multiple items
      const testReceipt = buildReceiptText({
        businessName: settings.businessName || 'Test Store',
        customerName: 'Test Customer',
        items: [
          { name: 'Rice (50kg)', quantity: 2, price: 45000 },
          { name: 'Beans (25kg)', quantity: 3, price: 30000 },
          { name: 'Garri (10kg)', quantity: 5, price: 15000 }
        ],
        totalAmount: 165000,
        date: new Date().toISOString()
      });

      console.log('[WhatsApp Test] Opening WhatsApp with receipt...');
      const success = openWhatsAppReceipt('', testReceipt);

      if (success) {
        displayToast('✅ WhatsApp opened! Check the message.');
      } else {
        displayToast('❌ Failed to open WhatsApp');
      }
    };

    window.addEventListener('test-whatsapp-receipt', handler);
    return () => window.removeEventListener('test-whatsapp-receipt', handler);
  }, [settings.businessName]);

  // ========== WHATSAPP RECEIPT UTILITIES ==========

  /**
   * Build formatted receipt text for WhatsApp
   * @param {Object} params - Receipt parameters
   * @param {string} params.businessName - Business name
   * @param {string} params.customerName - Customer name
   * @param {Array} [params.items] - Array of items (optional, for multiple items)
   * @param {string} [params.itemName] - Single item name (backwards compatible)
   * @param {number} [params.quantity] - Single item quantity (backwards compatible)
   * @param {number} params.totalAmount - Total in Naira
   * @param {string} params.date - Sale date
   * @returns {string} Formatted receipt text
   */
  const buildReceiptText = ({ businessName, customerName, items, itemName, quantity, totalAmount, date }) => {
    try {
      const formattedDate = new Date(date).toLocaleDateString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      let itemsSection = '';

      // GUARDRAIL 1: Try to build items section with multiple items
      try {
        if (Array.isArray(items) && items.length > 0) {
          // Multiple items format
          const itemLines = items.map((item, index) => {
            try {
              const itemNum = items.length > 1 ? `${index + 1}. ` : '';
              const name = item.name || item.itemName || 'Unknown Item';
              const qty = item.quantity || item.qty || 1;
              const price = item.price || item.amount || 0;
              return `${itemNum}${name} × ${qty} = ₦${price.toLocaleString()}`;
            } catch (err) {
              console.warn('[Receipt] Error formatting item:', err);
              return `${index + 1}. Item (error formatting)`;
            }
          }).join('\n');

          itemsSection = `Items:\n${itemLines}`;
        } else if (itemName && quantity) {
          // GUARDRAIL 2: Fallback to single item format (backwards compatible)
          itemsSection = `Item: ${itemName}\nQty: ${quantity}`;
        } else {
          // GUARDRAIL 3: No items provided
          itemsSection = 'Items: No items';
        }
      } catch (err) {
        // GUARDRAIL 4: If items formatting fails completely, try single item fallback
        console.error('[Receipt] Error building items section:', err);
        if (itemName && quantity) {
          itemsSection = `Item: ${itemName}\nQty: ${quantity}`;
        } else {
          itemsSection = 'Items: No items';
        }
      }

      const receipt = `
📱 SALES RECEIPT

From: ${businessName || 'Storehouse'}
To: ${customerName || 'Customer'}

${itemsSection}

Total: ₦${totalAmount.toLocaleString()}
Date: ${formattedDate}

Thank you for your business! 🙏

---
Powered by Storehouse
https://storehouse.ng
      `.trim();

      return receipt;
    } catch (err) {
      // GUARDRAIL 5: Ultimate fallback - return minimal receipt
      console.error('[Receipt] Critical error building receipt:', err);
      return `
📱 SALES RECEIPT

From: ${businessName || 'Storehouse'}
To: ${customerName || 'Customer'}

Amount: ₦${totalAmount?.toLocaleString() || '0'}
Date: ${new Date().toLocaleDateString('en-NG')}

Thank you for your business! 🙏
      `.trim();
    }
  };

  /**
   * Open WhatsApp with pre-filled receipt message
   * @param {string} phoneNumber - Customer phone (optional)
   * @param {string} message - Receipt text
   */
  const openWhatsAppReceipt = (phoneNumber, message) => {
    try {
      let whatsappUrl;

      if (phoneNumber && phoneNumber.trim()) {
        // Clean phone number (remove non-digits)
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        // Format for WhatsApp (Nigeria country code)
        let formattedPhone = cleanPhone;
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '234' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('234')) {
          formattedPhone = '234' + formattedPhone;
        }

        // WhatsApp URL with specific number
        whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
      } else {
        // WhatsApp URL without specific number (opens WhatsApp to choose contact)
        whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      }

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      return true;
    } catch (error) {
      console.error('[WhatsApp] Error opening WhatsApp:', error);
      return false;
    }
  };

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
          // Search in current items array (real-time from Firebase)
          const existing = items.find(item =>
            item.name.toLowerCase() === value.trim().toLowerCase()
          );
          if (existing) {
            setExistingItem(existing);
            setStockMode('add'); // Default to 'add' mode

            // Load existing variants if any
            console.log('[handleInputChange] Loading variants for existing item:', existing.id);
            getProductVariants(existing.id.toString())
              .then(variants => {
                if (variants && variants.length > 0) {
                  console.log('[handleInputChange] ✅ Loaded', variants.length, 'existing variants');
                  // Convert to the format expected by VariantManager
                  const formattedVariants = variants.map(v => ({
                    variant_name: v.variant_name,
                    sku: v.sku,
                    quantity: v.quantity,
                    price_override: v.price_override,
                    attributes: v.attributes,
                    is_active: v.is_active
                  }));
                  setProductVariants(formattedVariants);
                } else {
                  console.log('[handleInputChange] No variants found for this product');
                  setProductVariants([]);
                }
              })
              .catch(err => {
                console.error('[handleInputChange] Error loading variants:', err);
                setProductVariants([]);
              });
          } else {
            setExistingItem(null);
            setProductVariants([]); // Clear variants when no existing item
          }
        } catch (err) {
          console.warn('[handleInputChange] Error checking existing item:', err);
        }
      } else if (name === 'name' && !value.trim()) {
        setExistingItem(null);
        setProductVariants([]); // Clear variants when name is cleared
      }
    }
  };

  // Save new item
  const handleSave = async () => {
    console.log('[handleSave] Called', { formData, formattedPrices, existingItem, stockMode });

    // Validation with detailed logging
    if (!formData.name || !formData.name.trim()) {
      console.log('[handleSave] Validation failed: name missing');
      displayToast('Please enter item name');
      return;
    }

    // Skip quantity validation if product has variants (variants have their own quantities)
    if (productVariants.length === 0) {
      const qtyInput = parseInt(formData.qty);
      if (!formData.qty || isNaN(qtyInput) || qtyInput <= 0) {
        console.log('[handleSave] Validation failed: qty invalid');
        displayToast('Please enter a valid quantity greater than 0');
        return;
      }
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

        // Upload product image if provided (when editing existing products)
        let imageUrl = existingItem.image_url || ''; // Keep existing image URL by default

        if (productImageFile) {
          try {
            console.log('[handleSave] Uploading product image for existing product...');
            displayToast('📤 Uploading image...');

            imageUrl = await uploadProductImage(
              productImageFile,
              currentUser.uid,
              existingItem.id,
              existingItem.image_url // Pass old image URL for deletion
            );

            console.log('[handleSave] ✅ Image uploaded:', imageUrl);
          } catch (error) {
            console.error('[handleSave] Image upload failed:', error);
            displayToast('⚠ Image upload failed, but product will be saved');
            // Continue saving product even if image fails
          }
        }

        // If product has variants, calculate total quantity from variants
        const totalVariantQty = productVariants.length > 0
          ? productVariants.reduce((sum, v) => sum + (v.quantity || 0), 0)
          : inputQty;

        if (stockMode === 'add' && productVariants.length === 0) {
          // ADD MODE: Increment stock (only for non-variant products)
          const delta = inputQty;
          const newQty = oldQty + delta;

          // Weighted average cost calculation
          const newPurchaseKobo = Math.round(
            (oldQty * oldPurchaseKobo + delta * Math.round(purchase * 100)) / Math.max(newQty, 1)
          );

          const updatedItem = {
            quantity: newQty,  // Changed from 'qty'
            cost_price: newPurchaseKobo / 100,  // Changed from 'purchaseKobo', convert to naira
            selling_price: selling,  // Changed from 'sellKobo', service converts to kobo
            image_url: imageUrl  // Include image URL in update
          };

          await updateProduct(currentUser.uid, existingItem.id, updatedItem);
          console.log('[handleSave] ✅ Stock added:', { oldQty, delta, newQty });
          displayToast(`✅ Added ${delta} units to ${existingItem.name}!`);

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
          // REPLACE MODE: Set total stock (or update product with variants)
          const newTotal = totalVariantQty;
          const qtyDiff = newTotal - oldQty;

          const updatedItem = {
            quantity: newTotal,  // Sum of variants or new total
            cost_price: purchase,  // Changed from 'purchaseKobo', service converts to kobo
            selling_price: selling,  // Changed from 'sellKobo', service converts to kobo
            image_url: imageUrl  // Include image URL in update
          };

          await updateProduct(currentUser.uid, existingItem.id, updatedItem);
          console.log('[handleSave] ✅ Stock updated:', { oldQty, newTotal, hasVariants: productVariants.length > 0 });
          displayToast(`✅ ${existingItem.name} updated!`);

          // Log stock movement (only if no variants)
          if (productVariants.length === 0) {
            logStockMovement({
              itemId: existingItem.id,
              type: 'adjust',
              qty: qtyDiff,
              unitCost: Math.round(purchase * 100),
              reason: 'stock_take',
              at: new Date().toISOString()
            });
          }

          // Save variants if any exist
          if (productVariants.length > 0) {
            try {
              console.log('[handleSave] Creating/updating variants...', productVariants);
              console.log('[handleSave] Product ID:', existingItem.id);
              console.log('[handleSave] User ID (supabaseUser):', supabaseUser?.id);
              console.log('[handleSave] User ID (currentUser):', currentUser?.uid);
              displayToast('💾 Saving variants...');

              // Use supabaseUser.id for variants
              if (!supabaseUser?.id) {
                throw new Error('Supabase user ID not available. Please try logging out and back in.');
              }
              await createVariants(existingItem.id, supabaseUser.id, productVariants);

              console.log('[handleSave] ✅ Variants saved successfully');
              displayToast(`✓ ${existingItem.name} updated with ${productVariants.length} variants!`);
            } catch (error) {
              console.error('[handleSave] Failed to save variants:', error);
              displayToast('⚠ Product updated but variants failed. Please try again.');
            }
          }
        }

      } else {
        // CREATING NEW ITEM
        let imageUrl = '';

        // Use first image from MultiImageUpload component if available
        console.log('[handleSave] Checking productImages state:', productImages);
        if (productImages && productImages.length > 0 && productImages[0].url) {
          imageUrl = productImages[0].url;
          console.log('[handleSave] ✅ Using image from MultiImageUpload:', imageUrl);
        }
        // Fallback to old single-image upload if provided
        else if (productImageFile) {
          try {
            console.log('[handleSave] Uploading product image...');
            displayToast('📤 Uploading image...');

            // Generate temporary product ID for image storage
            const tempProductId = `temp-${Date.now()}`;
            imageUrl = await uploadProductImage(
              productImageFile,
              currentUser.uid,
              tempProductId
            );

            console.log('[handleSave] ✅ Image uploaded:', imageUrl);
          } catch (error) {
            console.error('[handleSave] Image upload failed:', error);
            displayToast('⚠ Image upload failed, but item will be saved');
            // Continue saving item even if image fails
          }
        }

        // Filter out empty attribute values
        const cleanAttributes = Object.entries(formData.attributes || {})
          .filter(([_, value]) => value && value.toString().trim() !== '')
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

        // Calculate total quantity from variants if they exist
        const totalVariantQty = productVariants.length > 0
          ? productVariants.reduce((sum, v) => sum + (v.quantity || 0), 0)
          : inputQty;

        console.log('[handleSave] Quantity calculation:', {
          hasVariants: productVariants.length > 0,
          variantCount: productVariants.length,
          variantQuantities: productVariants.map(v => v.quantity),
          totalVariantQty,
          inputQty
        });

        const newItem = {
          name: formData.name.trim(),
          category: formData.category || 'General Merchandise',
          description: formData.description?.trim() || null,  // Product description (optional)
          quantity: totalVariantQty,  // Sum of all variant quantities, or base quantity if no variants
          cost_price: purchase,  // Changed from 'purchaseKobo', service converts to kobo
          selling_price: selling,  // Changed from 'sellKobo', service converts to kobo
          low_stock_threshold: parseInt(formData.reorderLevel) || 10,  // Changed from 'reorderLevel'
          image_url: imageUrl,  // Changed from 'imageUrl' to 'image_url'
          is_public: formData.isPublic !== false,  // Default to true (public) unless explicitly set to false
          is_active: true,  // Add is_active field
          attributes: cleanAttributes,  // Category-specific attributes
          isDemo: false
        };

        console.log('[handleSave] Creating new item:', newItem);
        const addedItem = await addProduct(currentUser.uid, newItem);
        console.log('[handleSave] ✅ Item added to Firebase:', addedItem);

        // Save variants if any exist
        if (productVariants.length > 0) {
          try {
            console.log('[handleSave] Creating variants...', productVariants);
            console.log('[handleSave] Product ID:', addedItem.id);
            console.log('[handleSave] User ID (supabaseUser):', supabaseUser?.id);
            console.log('[handleSave] User ID (currentUser):', currentUser?.uid);
            displayToast('💾 Saving variants...');

            // Use supabaseUser.id for variants (not Firebase UID)
            if (!supabaseUser?.id) {
              throw new Error('Supabase user ID not available. Please try logging out and back in.');
            }
            await createVariants(addedItem.id, supabaseUser.id, productVariants);

            console.log('[handleSave] ✅ Variants saved successfully');
            displayToast(`✓ Item added with ${productVariants.length} variants!`);
          } catch (error) {
            console.error('[handleSave] Failed to save variants:', error);
            displayToast('⚠ Item saved but variants failed. Please edit the item to add variants.');
          }
        } else {
          displayToast('✓ Item added successfully!');
        }

        // Clear image state
        setProductImageFile(null);
        setProductImagePreview('');
        setProductImages([]); // Clear MultiImageUpload state
      }

      // DEMO CLEANUP: Remove all demo items when user adds first real item
      const demoActive = localStorage.getItem('demoItemsActive');
      if (demoActive === 'true') {
        console.log('[Demo Cleanup] Removing demo items...');
        await removeDemoItems();
        localStorage.setItem('demoItemsActive', 'false');
      }

      // IMPORTANT: Manually refetch items to ensure UI updates immediately
      // This is especially important on mobile where real-time subscriptions can be unreliable
      console.log('[handleSave] 📥 Manually refetching items to ensure UI updates...');
      try {
        const updatedItems = await getProducts(currentUser.uid);
        setItems(updatedItems);
        console.log('[handleSave] ✅ Items refetched successfully:', updatedItems.length);
      } catch (error) {
        console.error('[handleSave] ⚠️ Failed to refetch items, relying on real-time subscription:', error);
      }

      // Clear search query to ensure new item is visible
      setSearchQuery('');
      console.log('[handleSave] 🔍 Search query cleared');

      // Close modal and reset form
      setShowModal(false);
      setFormData({
        name: '',
        category: 'Fashion',
        description: '',
        qty: '',
        purchasePrice: '',
        sellingPrice: '',
        reorderLevel: '10',
        isPublic: true,  // Reset to public by default
        attributes: {}  // Reset attributes
      });
      setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
      setCalculatedProfit({ profit: 0, margin: 0 });
      setExistingItem(null);
      setStockMode('add');
      setProductImages([]);
      setEditingProductId(null);
      setProductVariants([]);
      console.log('[handleSave] ✅ SUCCESS! Item should now be visible in inventory table');
    } catch (error) {
      console.error('[handleSave] Error:', error);

      // Handle tier limit exceeded
      if (error.limitExceeded && error.limitInfo) {
        const { tierName, suggestedTier, currentCount, limit, reason } = error.limitInfo;
        setUpgradeModalState({
          isOpen: true,
          limitType: 'products',
          currentTier: tierName || 'Free',
          suggestedTier: suggestedTier || 'Starter',
          currentCount: currentCount || 0,
          limit: limit || 0,
          reason: reason || 'Product limit reached'
        });
        setShowModal(false); // Close the add product modal
        return;
      }

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

  // Handle delete item
  const handleDeleteItem = async (itemId) => {
    try {
      console.log('[App] Deleting item:', itemId);
      await deleteProduct(currentUser.uid, itemId);

      // Update local state immediately
      setItems(prevItems => prevItems.filter(item => item.id !== itemId));

      displayToast('✓ Item deleted successfully');
    } catch (error) {
      console.error('[App] Error deleting item:', error);
      displayToast('❌ Failed to delete item');
    }
  };

  // Handle edit item
  const handleEditItem = async (item) => {
    try {
      console.log('[App] Edit item clicked:', item);

      // Set existing item first
      setExistingItem(item);
      setEditingProductId(item.id);

      // Format prices first
      const costPrice = item.cost_price || item.purchaseKobo / 100 || 0;
      const sellPrice = item.selling_price || item.sellKobo / 100 || 0;

      // Pre-populate form with item data
      setFormData({
        name: item.name || '',
        category: item.category || 'General Merchandise',
        qty: (item.qty || item.quantity || 0).toString(),
        purchasePrice: costPrice.toString(), // Set raw numeric value
        sellingPrice: sellPrice.toString(), // Set raw numeric value
        reorderLevel: (item.low_stock_threshold || item.reorderLevel || 10).toString(),
        description: item.description || '',
        isPublic: item.is_public !== false,
        attributes: item.attributes || {}
      });

      setFormattedPrices({
        purchasePrice: formatNumberWithCommas(costPrice.toString()),
        sellingPrice: formatNumberWithCommas(sellPrice.toString())
      });

      // Load existing variants if any
      console.log('[App] Loading variants for product:', item.id);
      const variants = await getProductVariants(item.id.toString());
      if (variants && variants.length > 0) {
        console.log('[App] ✅ Loaded', variants.length, 'existing variants for editing');
        const formattedVariants = variants.map(v => ({
          variant_name: v.variant_name,
          sku: v.sku,
          quantity: v.quantity,
          price_override: v.price_override,
          attributes: v.attributes,
          is_active: v.is_active
        }));
        setProductVariants(formattedVariants);
        // Set stock mode to 'replace' for products with variants
        setStockMode('replace');
      } else {
        console.log('[App] No variants found for this product');
        setProductVariants([]);
        // Default to 'add' mode for products without variants
        setStockMode('add');
      }

      // Open the modal
      setShowModal(true);

    } catch (error) {
      console.error('[App] Error loading item for edit:', error);
      displayToast('❌ Failed to load item data');
    }
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

    // Handle both numeric IDs (old) and string IDs (Firebase)
    const itemIdToFind = formData.itemId;
    const selectedItem = items.find(item => {
      // Try exact match first (for string IDs)
      if (item.id === itemIdToFind) return true;
      // Try string comparison (both converted to strings)
      if (String(item.id) === String(itemIdToFind)) return true;
      // Try numeric comparison (for old numeric IDs)
      if (typeof itemIdToFind === 'string' && !isNaN(itemIdToFind)) {
        return item.id === parseInt(itemIdToFind);
      }
      return false;
    });

    const qty = parseQty(formData.quantity);
    const sellKobo = toKobo(formData.sellPrice);

    // Validation
    if (!selectedItem || !qty || !sellKobo) {
      console.error('[handleSaveSale] Validation failed - missing required fields');
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

      // Check stock first (using Firebase products)
      if (selectedItem.qty < qty) {
        throw new Error(`Not enough stock. Only ${selectedItem.qty || 0} available.`);
      }

      // Update product quantity in Supabase (non-blocking - don't fail sale if this fails)
      try {
        await updateProduct(currentUser.uid, selectedItem.id, {
          quantity: selectedItem.qty - qty  // Use 'quantity' for Supabase
        });
        console.log('[handleSaveSale] ✅ Product quantity updated in Supabase');

        // INSTANT UI UPDATE: Update local state immediately (optimistic update)
        setItems(prevItems =>
          prevItems.map(item =>
            item.id === selectedItem.id
              ? { ...item, qty: item.qty - qty, quantity: item.quantity - qty }
              : item
          )
        );
        console.log('[handleSaveSale] ✅ Local inventory updated instantly');

        // Log stock movement
        logStockMovement({
          itemId: selectedItem.id,
          type: 'out',
          qty: -qty,
          unitCost: selectedItem.purchaseKobo,
          reason: 'sale',
          at: new Date().toISOString()
        });
      } catch (supabaseError) {
        console.warn('[handleSaveSale] ⚠️ Failed to update product in Supabase, but continuing with sale:', supabaseError);
        // Continue with sale even if Supabase update fails
      }

      // Wrap the sales/customer/credits transaction in a promise
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['sales', 'customers', 'credits', 'outbox'], 'readwrite');
        const salesStore = tx.objectStore('sales');
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
        const todayKey = localDayKey();
        const saleData = {
          id: saleId,
          itemId: selectedItem.id,
          qty,
          sellKobo,
          createdAt: Date.now(),
          dayKey: todayKey,
          // v5: Payment method tracking for accurate EOD reports
          isCredit: formData.isCreditSale,
          paymentMethod: formData.isCreditSale ? 'credit' : (formData.paymentMethod || 'cash'),
          // Include customer info if present
          customerName: formData.customerName || null,
          dueDate: formData.dueDate || null,
          // Staff tracking - who recorded this sale
          recorded_by_staff_id: currentStaff?.id || null,
          recorded_by_staff_name: currentStaff?.name || null,
          recorded_by_staff_role: currentStaff?.role || null,
          // Sales channel tracking
          salesChannel: formData.salesChannel || 'in-store'
        };

        salesStore.add(saleData);

        // 2) Upsert customer if credit sale
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
        cogsKobo: (selectedItem.purchaseKobo || 0) * qty, // Cost of Goods Sold = cost price × quantity
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

      // WhatsApp receipt for CASH sales (using new helper functions)
      if (!formData.isCreditSale && formData.sendWhatsApp && formData.phone) {
        try {
          console.log('[WhatsApp] Sending cash sale receipt...');

          const receipt = buildReceiptText({
            businessName: settings.businessName || profile.businessName || 'Storehouse',
            customerName: formData.customerName || 'Customer',
            itemName: selectedItem.name,
            quantity: qty,
            totalAmount: totalKobo / 100, // Convert kobo to naira
            date: new Date().toISOString()
          });

          const success = openWhatsAppReceipt(formData.phone, receipt);

          if (success) {
            console.log('[WhatsApp] Receipt opened successfully');
          } else {
            console.warn('[WhatsApp] Failed to open WhatsApp');
          }
        } catch (error) {
          // Non-blocking: Don't let WhatsApp errors break the sale
          console.error('[WhatsApp] Error sending receipt:', error);
          // Sale is already saved - just log the error
        }
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

      // Note: Items will update automatically via real-time subscription
      // No need to manually reload - Firebase listener handles it

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

      // Close the Record Sale modal
      setShowRecordSale(false);

      // Show success message
      displayToast('✅ Sale recorded successfully!');

    } catch (error) {
      console.error('[Save Sale Error]', error);

      const errorMsg = error.message || 'Could not save sale';
      displayToast('❌ ' + errorMsg);
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

  // Export CSV handler
  const handleExportCSV = () => {
    console.log('[App] Export CSV triggered from More menu');

    try {
      // Get customers from debts (unique customers who have made purchases)
      const uniqueCustomers = Array.from(
        new Map(
          sales
            .filter(sale => sale.customerName || sale.customer_name)
            .map(sale => {
              const name = sale.customerName || sale.customer_name || '';
              const phone = sale.customerPhone || sale.customer_phone || '';
              return [name, { name, phone }];
            })
        ).values()
      );

      const result = exportAllDataCSV(items, sales, uniqueCustomers);

      console.log('[App] Export complete:', result);

      // Show success message with helpful tips
      const message = `✅ Export successful!\n\n` +
        `Downloaded:\n` +
        `• ${result.inventory} inventory items\n` +
        `• ${result.sales} sales records\n` +
        `• ${result.customers} customers\n\n` +
        `💡 What to do next:\n` +
        `1. Check your Downloads folder for 3 CSV files\n` +
        `2. Open files in Excel, Google Sheets, or Numbers\n` +
        `3. Use for backup, analysis, or importing to other software\n\n` +
        `💾 Tip: Save these files in a safe place as backup!`;

      alert(message);
    } catch (error) {
      console.error('[App] Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
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

  // Show Expenses Page if active
  if (showExpensesPage) {
    return (
      <ExpensesPage
        onBack={() => setShowExpensesPage(false)}
        onAddExpense={() => {
          setShowExpensesPage(false);
          setShowExpenseModal(true);
        }}
      />
    );
  }

  // Show Test Payment page if enabled
  if (showTestPayment) {
    return <TestPayment onBack={() => {
      setShowTestPayment(false);
      localStorage.setItem('storehouse-test-mode', JSON.stringify(false));
    }} />;
  }

  // Removed loading screen - app shows UI immediately and loads data in background

  return (
    <div className="app container">
      {/* Offline Status Banner */}
      <OfflineBanner />

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
            <Calculator size={22} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="settings-btn settings-btn-desktop"
            onClick={() => navigate('/settings')}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label="Business Settings"
            title="Business Settings"
          >
            <Settings size={22} strokeWidth={2} />
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

      {/* Share Your Store Card */}
      <ShareStoreCard onOpenSettings={() => setShowSettings(true)} />

      {/* New Dashboard v2.0 - Widget-based */}
      <Dashboard
        sales={sales}
        items={items}
        credits={credits}
        customers={Object.values(creditCustomers)}
        productVariantsMap={productVariantsMap}
        onRecordSale={handleRecordSale}
        onAddItem={() => setShowModal(true)}
        onViewHistory={() => setShowSalesHistory(true)}
        onManageCredits={() => setShowCreditsDrawer(true)}
        onViewLowStock={() => setShowLowStock(true)}
        onViewMoney={() => setShowMoneyPage(true)}
        onViewExpenses={() => setShowExpensesPage(true)}
        onViewSettings={() => navigate('/settings')}
        onDeleteItem={handleDeleteItem}
        onEditItem={handleEditItem}
        onShowCSVImport={() => setShowCSVImport(true)}
        onSendDailySummary={() => {
          console.log('[Dashboard] Daily Sales Summary triggered');
          setShowEODModal(true);
        }}
        onExportData={handleExportCSV}
        userId={currentUser?.uid}
        hasOpenModal={showRecordSale || showModal || showSettings || showSalesHistory || showCreditsDrawer || showDashboardCustomize || showCSVImport}
      />

      {/* Center column for search, table */}
      <section className="mainColumn">

        {/* Search Bar */}
        <div className="searchBar" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            className="inputSearch"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => setShowCSVImport(true)}
            style={{
              padding: '8px 16px',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            📥 Import CSV
          </button>
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
                getFilteredItems().flatMap(item => {
                  const sellNaira = Math.round((item.sellKobo ?? item.sellingPrice ?? 0) / 100);

                  // Format number with commas, no spaces
                  const formatNumber = (num) => {
                    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                  };

                  // Check if product has variants
                  const variants = productVariantsMap[item.id] || [];
                  const hasVariants = variants.length > 0;
                  const isExpanded = expandedProducts.has(item.id);

                  // Calculate total quantity across all variants
                  const totalVariantQty = hasVariants
                    ? variants.reduce((sum, v) => sum + (v.quantity || 0), 0)
                    : 0;

                  // Toggle expand/collapse
                  const toggleExpand = (e) => {
                    e.stopPropagation();
                    setExpandedProducts(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(item.id)) {
                        newSet.delete(item.id);
                      } else {
                        newSet.add(item.id);
                      }
                      return newSet;
                    });
                  };

                  // Main product row
                  const productRow = (
                    <tr
                      key={item.id}
                      onClick={() => {
                        if (settings.quickSellEnabled && !hasVariants) {
                          window.dispatchEvent(new CustomEvent('open-record-sale', {
                            detail: { itemId: item.id }
                          }));
                        }
                      }}
                      style={{
                        cursor: settings.quickSellEnabled && !hasVariants ? 'pointer' : 'default',
                        background: hasVariants ? '#f9fafb' : 'white'
                      }}
                    >
                      <td className="cellItem" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasVariants && (
                          <span
                            onClick={toggleExpand}
                            style={{
                              cursor: 'pointer',
                              fontSize: '16px',
                              userSelect: 'none',
                              transition: 'transform 0.2s',
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              display: 'inline-block'
                            }}
                          >
                            ▶
                          </span>
                        )}
                        <span>{item.name}</span>
                        {hasVariants && (
                          <span style={{
                            fontSize: '11px',
                            background: '#e0e7ff',
                            color: '#4338ca',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {variants.length} variants
                          </span>
                        )}
                      </td>
                      <td className="cellQty">
                        {hasVariants ? formatNumber(totalVariantQty) : formatNumber(item.qty ?? 0)}
                      </td>
                      <td className="cellPrice">₦{formatNumber(sellNaira)}</td>
                    </tr>
                  );

                  // Variant rows (only shown when expanded)
                  const variantRows = isExpanded && hasVariants
                    ? variants.map((variant) => {
                        const variantPrice = variant.price_override
                          ? Math.round(variant.price_override / 100)
                          : sellNaira;

                        return (
                          <tr
                            key={`${item.id}-${variant.id}`}
                            onClick={() => {
                              if (settings.quickSellEnabled) {
                                window.dispatchEvent(new CustomEvent('open-record-sale', {
                                  detail: { itemId: item.id, variantId: variant.id }
                                }));
                              }
                            }}
                            style={{
                              cursor: settings.quickSellEnabled ? 'pointer' : 'default',
                              background: '#fafafa'
                            }}
                          >
                            <td className="cellItem" style={{ paddingLeft: '40px', fontSize: '13px', color: '#6b7280' }}>
                              ↳ {variant.variant_name}
                            </td>
                            <td className="cellQty" style={{ fontSize: '13px', color: variant.quantity > 0 ? '#059669' : '#dc2626' }}>
                              {formatNumber(variant.quantity)}
                            </td>
                            <td className="cellPrice" style={{ fontSize: '13px' }}>
                              {variantPrice !== sellNaira && (
                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>
                                  ₦{formatNumber(variantPrice)}
                                </span>
                              )}
                              {variantPrice === sellNaira && (
                                <span style={{ color: '#9ca3af' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    : [];

                  return [productRow, ...variantRows];
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
          setFormData({
            name: '',
            category: 'Fashion',
            description: '',
            barcode: '',
            qty: '',
            purchasePrice: '',
            sellingPrice: '',
            reorderLevel: '10',
            isPublic: true,
            attributes: {}
          });
          setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
          setExistingItem(null);
          setStockMode('add');
          setProductImages([]);
          setEditingProductId(null);
          setProductVariants([]);
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{existingItem ? 'Edit Item' : 'Add New Item'}</h2>
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                setFormData({
                  name: '',
                  category: 'Fashion',
                  description: '',
                  barcode: '',
                  qty: '',
                  purchasePrice: '',
                  sellingPrice: '',
                  reorderLevel: '10',
                  isPublic: true,
                  attributes: {}
                });
                setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
                setExistingItem(null);
                setStockMode('add');
                setProductImages([]);
                setEditingProductId(null);
                setProductVariants([]);
              }}>×</button>
            </div>

            {/* 1️⃣ ITEM NAME */}
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

            {/* 2️⃣ SELLING PRICE - PROMINENT (World-Class UX) */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#00894F',
                marginBottom: '8px',
                display: 'block'
              }}>
                💰 Selling Price (Customer Pays)
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#00894F',
                  pointerEvents: 'none'
                }}>₦</span>
                <input
                  type="tel"
                  name="sellingPrice"
                  value={formattedPrices.sellingPrice}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="form-input"
                  autoComplete="off"
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    padding: '16px 16px 16px 48px',
                    border: '2px solid #00894F',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 137, 79, 0.1)',
                    background: '#f0fdf4'
                  }}
                />
              </div>
              <p style={{
                fontSize: '13px',
                color: '#64748b',
                marginTop: '6px',
                marginBottom: 0
              }}>
                The price your customer will pay for this item
              </p>
            </div>

            {/* 3️⃣ QUANTITY - Hidden if product has variants */}
            {productVariants.length === 0 && (
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
            )}

            {/* 4️⃣ PURCHASE PRICE */}
            <div className="form-row">
              <div className="form-group">
                <label>Purchase Price (₦)</label>
                <input
                  type="tel"
                  name="purchasePrice"
                  value={formattedPrices.purchasePrice}
                  onChange={handleInputChange}
                  placeholder="What you paid"
                  className="form-input"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* 5️⃣ PROFIT CALCULATOR - Auto-shown */}
            {calculatedProfit.profit > 0 && (
              <div className="profit-calculator-display">
                <div className="profit-info">
                  <span className="profit-label">Profit per unit:</span>
                  <span className="profit-value">
                    ₦{calculatedProfit.profit.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className="profit-percentage">
                      ({calculatedProfit.margin.toFixed(1)}% markup)
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

            {/* ─────────────────────────────────────────────── */}
            {/* SECONDARY FIELDS (Category, Details, Media) */}
            {/* ─────────────────────────────────────────────── */}

            {/* 6️⃣ CATEGORY */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label>Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={(e) => {
                  // Clear attributes when category changes
                  setFormData({
                    ...formData,
                    category: e.target.value,
                    attributes: {}
                  });
                }}
                className="form-input"
              >
                <option value="Fashion">Fashion</option>
                <option value="Electronics">Electronics</option>
                <option value="Food & Beverages">Food & Beverages</option>
                <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                <option value="Furniture">Furniture</option>
                <option value="Books">Books</option>
                <option value="Phones & Accessories">Phones & Accessories</option>
                <option value="Shoes">Shoes</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* 7️⃣ BARCODE/SKU */}
            <div className="form-group">
              <label>Barcode / SKU (Optional)</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleInputChange}
                placeholder="Scan or enter barcode/SKU"
                className="form-input"
              />
              <p style={{
                fontSize: '12px',
                color: '#64748b',
                marginTop: '6px',
                marginBottom: 0
              }}>
                Product barcode, SKU, or unique identifier for inventory tracking
              </p>
            </div>

            {/* Dynamic Category-Specific Attributes */}
            {(() => {
              const categoryConfig = getCategoryAttributes(formData.category);
              if (!categoryConfig) return null;

              return (
                <div style={{
                  background: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b7280'
                  }}>
                    <span style={{ fontSize: '18px' }}>{categoryConfig.icon}</span>
                    <span>{categoryConfig.name} Details (Optional)</span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px'
                  }}>
                    {categoryConfig.fields.map((field) => (
                      <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          marginBottom: '6px'
                        }}>
                          {field.icon && <span>{field.icon}</span>}
                          <span>{field.label}</span>
                          {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                        </label>

                        {field.type === 'select' ? (
                          <select
                            value={formData.attributes[field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value
                              }
                            })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px',
                              background: 'white'
                            }}
                          >
                            <option value="">{field.placeholder || 'Select...'}</option>
                            {field.options?.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        ) : field.type === 'textarea' ? (
                          <textarea
                            value={formData.attributes[field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value
                              }
                            })}
                            placeholder={field.placeholder}
                            rows={2}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px',
                              resize: 'vertical',
                              fontFamily: 'inherit'
                            }}
                          />
                        ) : field.type === 'number' ? (
                          <input
                            type="number"
                            value={formData.attributes[field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value
                              }
                            })}
                            placeholder={field.placeholder}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={formData.attributes[field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value
                              }
                            })}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData.attributes[field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData,
                              attributes: {
                                ...formData.attributes,
                                [field.key]: e.target.value
                              }
                            })}
                            placeholder={field.placeholder}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              fontSize: '14px'
                            }}
                          />
                        )}

                        {field.helpText && (
                          <p style={{
                            fontSize: '11px',
                            color: '#64748b',
                            margin: '4px 0 0 0'
                          }}>
                            {field.helpText}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Multi-Image Upload */}
            <div className="form-group">
              <label>Product Images</label>
              <MultiImageUpload
                productId={editingProductId}
                onImagesChange={(images) => setProductImages(images)}
              />
            </div>

            {/* Public Visibility Toggle */}
            <div className="form-group" style={{
              background: '#f8fafc',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                margin: 0
              }}>
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
                    📢 Show on Public Storefront
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    When checked, this item will be visible to customers on your store
                  </div>
                </div>
              </label>
            </div>

            {/* 8️⃣ PRODUCT VARIANTS */}
            <VariantManager
              onVariantsChange={setProductVariants}
            />

            {/* Visual Separator */}
            <div style={{
              borderTop: '1px solid #e2e8f0',
              margin: '24px 0 20px 0'
            }}></div>

            {/* 📝 DESCRIPTION - Optional (Bottom Position) */}
            <div className="form-group">
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#64748b',
                marginBottom: '8px',
                display: 'block'
              }}>
                📝 Description <span style={{ fontSize: '12px', color: '#94a3b8' }}>(Optional)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Additional details about this product (e.g., brand, size, color, material, condition...)"
                className="form-input"
                rows={3}
                style={{
                  fontSize: '14px',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
              <p style={{
                fontSize: '12px',
                color: '#94a3b8',
                marginTop: '6px',
                marginBottom: 0
              }}>
                Add any extra details that help identify or describe this product
              </p>
            </div>

            <div className="modal-footer">
              <button className="btn-save" onClick={handleSave}>
                Save Item
              </button>
              <button className="btn-cancel" onClick={() => {
                setShowModal(false);
                setFormattedPrices({ purchasePrice: '', sellingPrice: '' });
                setExistingItem(null);
                setStockMode('add');
                setProductImages([]);
                setEditingProductId(null);
                setProductVariants([]);
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Sale Modal with V2 Feature Flag */}
      {(() => {
        // Check feature flag - V2 is now the default, users can opt-out with 'false'
        const useV2 = localStorage.getItem('storehouse:useNewSaleModal') !== 'false';

        // Common props for both modals
        const modalProps = {
          isOpen: showRecordSale,
          onClose: () => {
            setShowRecordSale(false);
            setCalculatorItems(null);
            setPreselectedItem(null);
          },
          items,
          calculatorItems,
          preselectedItem,
          onSaveSale: handleSaveSale,
          onCreateDebt: (debtData) => {
            try {
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
          },
          showSalesData,
          onShowToast: displayToast
        };

        // Log analytics when modal opens
        if (showRecordSale) {
          try {
            const version = useV2 ? 'v2' : 'v1';
            console.log('[Analytics] sale_modal_used:', { version });
          } catch (err) {
            console.warn('[Analytics] Failed to log modal usage:', err);
          }
        }

        // Render V2 with error boundary fallback to V1
        if (useV2) {
          try {
            return <RecordSaleModalV2 {...modalProps} />;
          } catch (error) {
            console.warn('[RecordSaleModal] V2 failed, falling back to V1:', error);
            return <RecordSaleModal {...modalProps} />;
          }
        }

        // Default to V1
        return <RecordSaleModal {...modalProps} />;
      })()}

      {/* Calculator Bottom Sheet */}
      {/* Production-ready Calculator Modal with POS and Math tabs */}
      <CalculatorModal
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />

      {/* Business Settings Sheet */}
      <BusinessSettings
        isOpen={showSettings}
        onClose={() => {
          console.log('[App] Closing settings and navigating to /dashboard');
          setShowSettings(false);
          navigate('/dashboard');
        }}
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

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowCSVImport(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCSVImport(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                zIndex: 1
              }}
            >
              ×
            </button>
            <CSVImport />
          </div>
        </div>
      )}

      {/* PIN Entry Modal */}
      {showPinModal && (
        <div
          className="modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => {
            setShowPinModal(false);
            setPinInput('');
            setPinError('');
            setShowPinPassword(false);
          }}
        >
          <div
            className={pinShake ? 'pin-modal-shake' : ''}
            style={{
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              padding: '2rem',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Lock size={28} color="#dc2626" strokeWidth={2.5} />
              </div>
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, textAlign: 'center', marginBottom: '0.5rem' }}>
              {pinModalContext === 'money' ? 'PIN Required' : 'Enter PIN to Unlock'}
            </h3>

            <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.75rem', textAlign: 'center' }}>
              {pinModalContext === 'money'
                ? 'Enter your PIN to view financial data'
                : 'Enter your PIN to view costs and profits'}
            </p>

            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input
                type={showPinPassword ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinInput) {
                    handlePinSubmit();
                  }
                }}
                placeholder="••••"
                autoFocus
                disabled={pinAttempts <= 0}
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 1rem',
                  fontSize: '1.25rem',
                  border: pinError ? '2px solid #dc2626' : '2px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontFamily: 'monospace',
                  letterSpacing: '0.5em',
                  textAlign: 'center',
                  transition: 'border-color 0.2s',
                  backgroundColor: pinAttempts <= 0 ? '#f3f4f6' : 'white'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPinPassword(!showPinPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#6b7280'
                }}
              >
                {showPinPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {pinError && (
              <div style={{
                padding: '0.75rem',
                backgroundColor: '#fee2e2',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                animation: 'fadeIn 0.2s'
              }}>
                <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0, fontWeight: '500', textAlign: 'center' }}>
                  {pinError}
                </p>
              </div>
            )}

            {/* Remember for 5 minutes checkbox */}
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '1rem',
              marginBottom: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <input
                type="checkbox"
                checked={rememberPin}
                onChange={(e) => setRememberPin(e.target.checked)}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span>Remember for 5 minutes</span>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button
                onClick={() => {
                  setShowPinModal(false);
                  setPinInput('');
                  setPinError('');
                  setShowPinPassword(false);
                  setRememberPin(false);
                  setPinModalContext(null);
                }}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  background: 'white',
                  color: '#6b7280',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handlePinSubmit}
                disabled={!pinInput || pinAttempts <= 0}
                style={{
                  flex: 2,
                  padding: '1rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  background: (!pinInput || pinAttempts <= 0) ? '#d1d5db' : '#16a34a',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: (!pinInput || pinAttempts <= 0) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: (!pinInput || pinAttempts <= 0) ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (pinInput && pinAttempts > 0) {
                    e.target.style.backgroundColor = '#15803d';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (pinInput && pinAttempts > 0) {
                    e.target.style.backgroundColor = '#16a34a';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                🔓 Unlock
              </button>
            </div>

            <p style={{
              fontSize: '0.75rem',
              color: '#9ca3af',
              marginTop: '1.25rem',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              💡 Set or change your PIN in Business Settings
            </p>
          </div>
        </div>
      )}

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

      {/* OLD Tax Summary Modal - DISABLED (replaced by TaxPanel component) */}
      {/*
      {showTaxModal && (
        <div className="modal-overlay" onClick={() => setShowTaxModal(false)}>
          <div className="modal tax-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📊 Tax Summary - {getCurrentMonth()}</h3>
              <button className="modal-close" onClick={() => setShowTaxModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="tax-detail-row">
                <span>Sales Revenue:</span>
                <span className="tax-amount">
                  {showSalesData ? `₦${monthlyTax.salesTotal.toLocaleString()}` : '₦—'}
                </span>
              </div>

              <div className="tax-detail-row">
                <span>Cost of Goods Sold:</span>
                <span className="tax-amount expense-color">
                  -₦{monthlyTax.cogs.toLocaleString()}
                </span>
              </div>

              <div className="tax-detail-row">
                <span>Operating Expenses:</span>
                <span className="tax-amount expense-color">
                  -₦{monthlyTax.expensesTotal.toLocaleString()}
                </span>
              </div>

              <div className="tax-detail-row separator">
                <span>Net Profit:</span>
                <span className={`tax-amount ${monthlyTax.profit >= 0 ? 'profit-color' : 'loss-color'}`}>
                  {showSalesData ? `₦${Math.abs(monthlyTax.profit).toLocaleString()}` : '₦—'}
                  {monthlyTax.profit < 0 && ' (Loss)'}
                </span>
              </div>

              <div className="vat-breakdown-section">
                <p className="breakdown-title">Tax Calculation:</p>

                <div className="tax-detail-row sub-row">
                  <span>Tax Rate:</span>
                  <span className="tax-amount">
                    {((settings?.taxRate || 0.07) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="tax-detail-row highlight">
                <span><strong>Estimated Income Tax:</strong></span>
                <span className="tax-amount vat-color">
                  <strong>
                    {showSalesData ? `₦${monthlyTax.estimatedTax.toLocaleString()}` : '₦—'}
                  </strong>
                </span>
              </div>

              <div className="vat-info-note">
                <p>
                  💡 Tax is calculated on your <strong>net profit</strong> (what's left after paying for goods and expenses). Both your item costs and operating expenses reduce your tax burden.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  const taxDataForDownload = {
                    success: true,
                    vatPayable: monthlyTax.estimatedTax,
                    profit: monthlyTax.profit,
                    salesTotal: monthlyTax.salesTotal,
                    expensesTotal: monthlyTax.expensesTotal,
                    breakdown: {
                      outputVat: 0,
                      inputVat: 0,
                      fromPurchases: 0,
                      fromExpenses: 0,
                    },
                    notes: [
                      `${monthlyTax.salesCount} sales, ${monthlyTax.expensesCount} expenses`,
                      `Tax rate: ${((settings?.taxRate || 0.07) * 100).toFixed(1)}%`
                    ].filter(Boolean),
                  };
                  downloadTaxSummary(taxDataForDownload, settings.businessName || 'Your Business');
                }}
              >
                📥 Download
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  const taxDataForShare = {
                    success: true,
                    vatPayable: monthlyTax.estimatedTax,
                    profit: monthlyTax.profit,
                    salesTotal: monthlyTax.salesTotal,
                    expensesTotal: monthlyTax.expensesTotal,
                    breakdown: {
                      outputVat: 0,
                      inputVat: 0,
                      fromPurchases: 0,
                      fromExpenses: 0,
                    },
                    notes: [],
                  };
                  shareViaWhatsApp(taxDataForShare, settings.businessName || 'Your Business');
                }}
              >
                💬 Share
              </button>
            </div>
          </div>
        </div>
      )}
      */}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSubmit={(data) => {
          try {
            const expense = saveExpense(data);

            // Show success message
            alert(`✅ Expense saved!\n\nAmount: ₦${(expense.amountKobo / 100).toLocaleString()}\nCategory: ${data.category}\nDate: ${data.date}`);

            // Close modal
            setShowExpenseModal(false);

          } catch (error) {
            console.error('Failed to save expense:', error);
            alert('❌ Failed to save expense. Please try again.');
          }
        }}
      />

      {/* Money Page */}
      <MoneyPage
        isOpen={showMoneyPage}
        onClose={() => setShowMoneyPage(false)}
      />

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

      {/* Business Type Selector - First Time Setup */}
      {isFirstTimeSetup && (
        <BusinessTypeSelector onComplete={completeSetup} />
      )}

      {/* Dashboard Customization Modal */}
      {showDashboardCustomize && (
        <DashboardCustomize onClose={() => setShowDashboardCustomize(false)} />
      )}

      {/* Upgrade Modal - Tier Limits */}
      <UpgradeModal
        isOpen={upgradeModalState.isOpen}
        onClose={() => setUpgradeModalState({ ...upgradeModalState, isOpen: false })}
        limitType={upgradeModalState.limitType}
        currentTier={upgradeModalState.currentTier}
        suggestedTier={upgradeModalState.suggestedTier}
        currentCount={upgradeModalState.currentCount}
        limit={upgradeModalState.limit}
        reason={upgradeModalState.reason}
      />

      {/* AI Chat Widget - Intelligent Onboarding & Help */}
      <AIChatWidget contextType="onboarding" autoOpen={items.length < 5} />

      {/* Footer Spacer - prevents content from being cut off at bottom */}
      <div className="footer-spacer"></div>

      {/* Footer */}
      <footer className="app-footer powered">
        <p>⚡ Powered by {strings.app.name}</p>
      </footer>

      {/* Contextual Prompt Toast - Smart suggestions based on usage */}
      <ContextualPromptToast
        prompt={prompt}
        onDismiss={dismissContextualPrompt}
      />
    </div>
  );
}

export default App;
