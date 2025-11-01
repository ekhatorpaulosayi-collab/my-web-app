import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/calculator.css';

// ═══════════════════════════════════════
// DATA STRUCTURES
// ═══════════════════════════════════════

interface CalculatorItem {
  id: string;
  name: string;
  sku?: string;
  stock: number;
  priceKobo: number;
  lastSellKobo?: number;
}

interface CartLine {
  itemId: string;
  name: string;
  qty: number;
  priceNaira: number;
  lineTotal: number;
}

interface POSState {
  searchQuery: string;
  selectedItem: CalculatorItem | null;
  qty: number;
  priceNaira: number;
  lines: CartLine[];
  subtotal: number;
  allowStockOverride: boolean;
}

interface CalcState {
  expression: string;
  result: number | null;
  memory: number;
  error: string | null;
}

interface PersistedState {
  lastTab: 'pos' | 'calc';
  posLines: CartLine[];
  calcExpression: string;
  calcMemory: number;
  lastUpdated: string;
}

interface AddToSaleEvent {
  lines: CartLine[];
  subtotal: number;
  source: 'calculator';
  timestamp: string;
}

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ═══════════════════════════════════════
// STORAGE KEY
// ═══════════════════════════════════════

const STORAGE_KEY = 'storehouse:calculator:v1';

// ═══════════════════════════════════════
// CALCULATOR EVALUATION (SHUNTING-YARD)
// ═══════════════════════════════════════

function tokenize(expr: string): (number | string)[] {
  const tokens: (number | string)[] = [];
  let numBuffer = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if ((c >= '0' && c <= '9') || c === '.') {
      numBuffer += c;
    } else {
      if (numBuffer) {
        tokens.push(parseFloat(numBuffer));
        numBuffer = '';
      }
      tokens.push(c);
    }
  }
  if (numBuffer) tokens.push(parseFloat(numBuffer));
  return tokens;
}

function toRPN(tokens: (number | string)[]): (number | string)[] {
  const output: (number | string)[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '(': 0 };

  for (const token of tokens) {
    if (typeof token === 'number') {
      output.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!);
      }
      operators.pop();
    } else {
      while (operators.length && precedence[operators[operators.length - 1]] >= precedence[token as string]) {
        output.push(operators.pop()!);
      }
      operators.push(token as string);
    }
  }
  while (operators.length) output.push(operators.pop()!);
  return output;
}

function evaluateRPN(rpn: (number | string)[]): number {
  const stack: number[] = [];
  for (const token of rpn) {
    if (typeof token === 'number') {
      stack.push(token);
    } else {
      const b = stack.pop()!;
      const a = stack.pop()!;
      switch (token) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
        case '%': stack.push(a * (b / 100)); break;
      }
    }
  }
  return stack[0];
}

function safeEvaluate(expr: string): number | string {
  expr = expr.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[0-9+\-*/().%]+$/.test(expr)) return "Invalid expression";

  // Check balanced parens
  let depth = 0;
  for (const c of expr) {
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (depth < 0) return "Invalid expression";
  }
  if (depth !== 0) return "Invalid expression";

  try {
    const tokens = tokenize(expr);
    const rpn = toRPN(tokens);
    const result = evaluateRPN(rpn);

    if (!isFinite(result)) return "Cannot divide by zero";
    if (isNaN(result)) return "Invalid calculation";
    if (Math.abs(result) > 1e15) return "Number too large";

    return result;
  } catch (e: any) {
    return "Error: " + e.message;
  }
}

// ═══════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════

export default function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  // ═══════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════

  const [activeTab, setActiveTab] = useState<'pos' | 'calc'>('pos');
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // POS State
  const [posState, setPosState] = useState<POSState>({
    searchQuery: '',
    selectedItem: null,
    qty: 1,
    priceNaira: 0,
    lines: [],
    subtotal: 0,
    allowStockOverride: false
  });

  // Calculator State
  const [calcState, setCalcState] = useState<CalcState>({
    expression: '',
    result: null,
    memory: 0,
    error: null
  });

  // Item database (loaded from IndexedDB or import)
  const [items, setItems] = useState<CalculatorItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<CalculatorItem[]>([]);

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // ═══════════════════════════════════════
  // TOAST HELPER
  // ═══════════════════════════════════════

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ═══════════════════════════════════════
  // LOAD ITEMS (from IndexedDB or fallback)
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

    const loadItems = async () => {
      try {
        // Try IndexedDB first
        const db = await openIndexedDB();
        const transaction = db.transaction(['items'], 'readonly');
        const store = transaction.objectStore('items');
        const request = store.getAll();

        request.onsuccess = () => {
          const dbItems = request.result || [];
          const mapped = dbItems.map((item: any) => ({
            id: item.id || item.sku || String(item.name),
            name: item.name,
            sku: item.sku,
            stock: item.qty || item.quantity || item.stock || 0,
            priceKobo: item.priceKobo || item.price * 100 || 0,
            lastSellKobo: item.lastSellKobo || item.priceKobo || item.price * 100 || 0
          }));
          setItems(mapped);
          console.debug('[Calculator] Loaded items from IndexedDB:', mapped.length);
        };

        request.onerror = () => {
          console.warn('[Calculator] IndexedDB read failed, using empty items');
          setItems([]);
        };
      } catch (e) {
        console.warn('[Calculator] Failed to load items:', e);
        setItems([]);
      }
    };

    loadItems();
  }, [isOpen]);

  function openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('storehouse', 5);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // ═══════════════════════════════════════
  // LOAD PERSISTED STATE
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY) || (window as any).__calculatorState;
      if (!stored) {
        console.debug('[Calculator] No saved state found');
        return;
      }

      const parsed: PersistedState = typeof stored === 'string' ? JSON.parse(stored) : stored;

      setActiveTab(parsed.lastTab || 'pos');
      setPosState(prev => ({
        ...prev,
        lines: parsed.posLines || [],
        subtotal: (parsed.posLines || []).reduce((sum, line) => sum + line.lineTotal, 0)
      }));
      setCalcState(prev => ({
        ...prev,
        expression: parsed.calcExpression || '',
        memory: parsed.calcMemory || 0
      }));
      setLastUpdated(parsed.lastUpdated || new Date().toISOString());

      console.debug('[Calculator] Loaded state:', {
        lines: parsed.posLines?.length || 0,
        tab: parsed.lastTab,
        lastUpdated: parsed.lastUpdated
      });
    } catch (e) {
      console.warn('[Calculator] Failed to load state:', e);
    }
  }, [isOpen]);

  // ═══════════════════════════════════════
  // SAVE STATE (debounced)
  // ═══════════════════════════════════════

  const saveState = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      const state: PersistedState = {
        lastTab: activeTab,
        posLines: posState.lines,
        calcExpression: calcState.expression,
        calcMemory: calcState.memory,
        lastUpdated: new Date().toISOString()
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        setLastUpdated(state.lastUpdated);
        console.debug('[Calculator] Saved state');
      } catch (e) {
        console.warn('[Calculator] localStorage failed:', e);
        (window as any).__calculatorState = state;
        showToast('Calculator state not saved; session-only', 'warning');
      }
    }, 500);
  }, [activeTab, posState.lines, calcState.expression, calcState.memory, showToast]);

  useEffect(() => {
    if (isOpen) saveState();
  }, [posState.lines, calcState.expression, calcState.memory, activeTab, isOpen, saveState]);

  // ═══════════════════════════════════════
  // MULTI-TAB SYNC
  // ═══════════════════════════════════════

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;

      try {
        const newState: PersistedState = JSON.parse(e.newValue);
        if (new Date(newState.lastUpdated) > new Date(lastUpdated)) {
          setActiveTab(newState.lastTab);
          setPosState(prev => ({
            ...prev,
            lines: newState.posLines,
            subtotal: newState.posLines.reduce((sum, line) => sum + line.lineTotal, 0)
          }));
          setCalcState(prev => ({
            ...prev,
            expression: newState.calcExpression,
            memory: newState.calcMemory
          }));
          setLastUpdated(newState.lastUpdated);
          console.debug('[Calculator] Synced from other tab');
          showToast('Calculator updated from another tab', 'info');
        }
      } catch (e) {
        console.warn('[Calculator] Failed to sync:', e);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [lastUpdated, showToast]);

  // ═══════════════════════════════════════
  // LISTEN FOR OPEN EVENT
  // ═══════════════════════════════════════

  useEffect(() => {
    const handleOpenEvent = () => {
      if (!isOpen) {
        // Trigger parent's state if prop-based, or assume already handled
        console.debug('[Calculator] Open event received');
      }
    };

    window.addEventListener('storehouse:open-calculator', handleOpenEvent);
    return () => window.removeEventListener('storehouse:open-calculator', handleOpenEvent);
  }, [isOpen]);

  // ═══════════════════════════════════════
  // MOUNTED LOG
  // ═══════════════════════════════════════

  useEffect(() => {
    if (isOpen) {
      console.debug('[Calculator] Mounted');
    }
  }, [isOpen]);

  // ═══════════════════════════════════════
  // POS TAB: SEARCH
  // ═══════════════════════════════════════

  const handleSearchChange = (query: string) => {
    setPosState(prev => ({ ...prev, searchQuery: query }));

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(() => {
      if (!query.trim()) {
        setFilteredItems([]);
        return;
      }

      const lower = query.toLowerCase();
      const matches = items
        .filter(item =>
          item.name.toLowerCase().includes(lower) ||
          (item.sku && item.sku.toLowerCase().includes(lower))
        )
        .slice(0, 6);

      setFilteredItems(matches);
    }, 300);
  };

  const handleSelectItem = (item: CalculatorItem) => {
    const price = (item.lastSellKobo || item.priceKobo) / 100;
    setPosState(prev => ({
      ...prev,
      selectedItem: item,
      priceNaira: price,
      qty: 1,
      searchQuery: '',
      allowStockOverride: false
    }));
    setFilteredItems([]);
    console.debug('[Calculator POS] Selected item:', item.name);
  };

  const handleClearSelectedItem = () => {
    setPosState(prev => ({
      ...prev,
      selectedItem: null,
      qty: 1,
      priceNaira: 0,
      allowStockOverride: false
    }));
  };

  // ═══════════════════════════════════════
  // POS TAB: QTY/PRICE CONTROLS
  // ═══════════════════════════════════════

  const handleQtyChange = (delta: number) => {
    setPosState(prev => {
      const newQty = Math.max(1, prev.qty + delta);
      return { ...prev, qty: newQty };
    });
  };

  const handlePriceChange = (price: number) => {
    setPosState(prev => ({ ...prev, priceNaira: Math.max(0.01, price) }));
  };

  // ═══════════════════════════════════════
  // POS TAB: ADD LINE
  // ═══════════════════════════════════════

  const handleAddLine = () => {
    const { selectedItem, qty, priceNaira, lines, allowStockOverride } = posState;
    if (!selectedItem) return;

    // Validation
    if (qty < 1 || priceNaira < 0.01) return;
    if (qty > selectedItem.stock && !allowStockOverride) return;

    const lineTotal = qty * priceNaira;
    const newLine: CartLine = {
      itemId: selectedItem.id,
      name: selectedItem.name,
      qty,
      priceNaira,
      lineTotal
    };

    // Merge if exists
    const existingIndex = lines.findIndex(l => l.itemId === selectedItem.id);
    let updatedLines: CartLine[];

    if (existingIndex >= 0) {
      const existing = lines[existingIndex];
      updatedLines = [...lines];
      updatedLines[existingIndex] = {
        ...existing,
        qty: existing.qty + qty,
        lineTotal: (existing.qty + qty) * priceNaira
      };
    } else {
      if (lines.length >= 100) {
        showToast('Cart full (max 100 items)', 'warning');
        return;
      }
      updatedLines = [...lines, newLine];
    }

    const newSubtotal = updatedLines.reduce((sum, line) => sum + line.lineTotal, 0);

    setPosState(prev => ({
      ...prev,
      lines: updatedLines,
      subtotal: newSubtotal,
      selectedItem: null,
      qty: 1,
      priceNaira: 0,
      searchQuery: '',
      allowStockOverride: false
    }));

    console.debug('[Calculator POS] Added line:', { name: selectedItem.name, qty, total: lineTotal });
  };

  const handleAddLineZeroStock = () => {
    const { selectedItem } = posState;
    if (!selectedItem || selectedItem.stock !== 0) return;

    const confirmed = window.confirm('Add item with 0 stock? Creates negative inventory.');
    if (!confirmed) return;

    console.warn('[Calculator] Added zero-stock item:', selectedItem.name);
    handleAddLine();
  };

  // ═══════════════════════════════════════
  // POS TAB: CART MANAGEMENT
  // ═══════════════════════════════════════

  const handleRemoveLine = (itemId: string) => {
    setPosState(prev => {
      const updatedLines = prev.lines.filter(line => line.itemId !== itemId);
      const newSubtotal = updatedLines.reduce((sum, line) => sum + line.lineTotal, 0);
      console.debug('[Calculator POS] Removed line:', itemId);
      return { ...prev, lines: updatedLines, subtotal: newSubtotal };
    });
  };

  const handleClearCart = () => {
    const confirmed = window.confirm('Remove all items?');
    if (!confirmed) return;

    setPosState(prev => ({ ...prev, lines: [], subtotal: 0 }));
    console.debug('[Calculator POS] Cleared cart');
  };

  // ═══════════════════════════════════════
  // POS TAB: ADD TO SALE (Integration)
  // ═══════════════════════════════════════

  const handleAddToSale = async () => {
    const { lines, subtotal } = posState;
    if (lines.length === 0) return;

    const event: AddToSaleEvent = {
      lines,
      subtotal,
      source: 'calculator',
      timestamp: new Date().toISOString()
    };

    let method = 'none';
    let success = false;

    // Try integration methods in order
    try {
      // Method 1-4: Try imports (would be resolved at build time, skip for now)
      // Method 5: Check global function
      if (typeof (window as any).__STOREHOUSE__?.recordSale === 'function') {
        const result = await (window as any).__STOREHOUSE__.recordSale(event);
        if (result !== false) {
          method = 'window.__STOREHOUSE__.recordSale';
          success = true;
        }
      }
    } catch (e) {
      console.warn('[Calculator] Integration method failed:', e);
    }

    // Method 6: Fallback to custom event
    if (!success) {
      window.dispatchEvent(new CustomEvent('storehouse:add-to-sale', { detail: event }));
      method = 'CustomEvent(storehouse:add-to-sale)';
      success = true;
    }

    console.debug('[Calculator POS] Add to sale:', { lines: lines.length, subtotal, method });

    if (success) {
      showToast(`Added ${lines.length} items to sale`, 'success');
      setPosState(prev => ({ ...prev, lines: [], subtotal: 0 }));
    } else {
      showToast('Failed to add to sale', 'error');
    }
  };

  // ═══════════════════════════════════════
  // CALC TAB: BUTTON HANDLERS
  // ═══════════════════════════════════════

  const handleCalcButton = (value: string) => {
    setCalcState(prev => {
      let newExpression = prev.expression;

      switch (value) {
        case 'C':
          return { ...prev, expression: '', result: null, error: null };

        case '=':
          const result = safeEvaluate(prev.expression);
          console.debug('[Calculator Math] Evaluated:', { expr: prev.expression, result });
          if (typeof result === 'number') {
            return { ...prev, result, error: null };
          } else {
            return { ...prev, result: null, error: result };
          }

        case 'MC':
          showToast('Memory cleared', 'info');
          return { ...prev, memory: 0 };

        case 'M+':
          showToast('Added to memory', 'info');
          return { ...prev, memory: prev.memory + (prev.result || 0) };

        case 'M-':
          showToast('Subtracted from memory', 'info');
          return { ...prev, memory: prev.memory - (prev.result || 0) };

        case 'MR':
          showToast(`Recalled: ₦${prev.memory}`, 'info');
          return { ...prev, expression: prev.memory.toString() };

        case '.':
          // Only add decimal if last number doesn't have one
          const tokens = newExpression.split(/[\+\-\×\÷\(\)]/);
          const lastToken = tokens[tokens.length - 1];
          if (!lastToken.includes('.')) {
            newExpression += '.';
          }
          return { ...prev, expression: newExpression };

        case '+':
        case '-':
        case '×':
        case '÷':
        case '%':
          newExpression += ` ${value} `;
          return { ...prev, expression: newExpression };

        case '(':
        case ')':
          newExpression += value;
          return { ...prev, expression: newExpression };

        default:
          // Numbers
          newExpression += value;
          return { ...prev, expression: newExpression };
      }
    });
  };

  // ═══════════════════════════════════════
  // CALC TAB: USE RESULT
  // ═══════════════════════════════════════

  const handleUseResultAsPrice = () => {
    const { result } = calcState;
    if (typeof result !== 'number' || activeTab !== 'calc') return;

    setActiveTab('pos');
    setPosState(prev => ({ ...prev, priceNaira: result }));
    showToast('Set price from calculator', 'success');
    console.debug('[Calculator] Used result:', result, 'as', 'price');
  };

  const handleUseResultAsQty = () => {
    const { result } = calcState;
    if (typeof result !== 'number' || activeTab !== 'calc') return;

    setActiveTab('pos');
    setPosState(prev => ({ ...prev, qty: Math.floor(Math.max(1, result)) }));
    showToast('Set quantity from calculator', 'success');
    console.debug('[Calculator] Used result:', result, 'as', 'quantity');
  };

  // ═══════════════════════════════════════
  // KEYBOARD SHORTCUTS (CALC TAB)
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isOpen || activeTab !== 'calc') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCalcButton('C');
        e.preventDefault();
      } else if (e.key === 'Enter') {
        handleCalcButton('=');
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setCalcState(prev => ({ ...prev, expression: prev.expression.slice(0, -1) }));
        e.preventDefault();
      } else if (/^[0-9+\-*/().%]$/.test(e.key)) {
        handleCalcButton(e.key);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab]);

  // ═══════════════════════════════════════
  // FOCUS TRAP
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    setTimeout(() => firstFocusableRef.current?.focus(), 100);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // ═══════════════════════════════════════
  // STOCK HELPERS
  // ═══════════════════════════════════════

  const getStockIndicator = (stock: number) => {
    if (stock >= 20) return '🟢';
    if (stock >= 5) return '🟡';
    if (stock >= 1) return '🔴';
    return '⚫';
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  if (!isOpen) return null;

  const { selectedItem, qty, priceNaira, lines, subtotal, allowStockOverride, searchQuery } = posState;
  const { expression, result, error } = calcState;

  const isAddLineDisabled =
    !selectedItem ||
    qty < 1 ||
    priceNaira < 0.01 ||
    (qty > selectedItem.stock && !allowStockOverride);

  const isUseResultDisabled = typeof result !== 'number' || activeTab === 'pos';

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`calculator-toast calculator-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Overlay */}
      <div className="calculator-modal-overlay" onClick={onClose}>
        {/* Modal */}
        <div
          ref={modalRef}
          className="calculator-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="calculator-title"
        >
          {/* Header */}
          <div className="calculator-header">
            <h2 id="calculator-title">Calculator</h2>
            <button
              ref={firstFocusableRef}
              className="calculator-close"
              onClick={onClose}
              aria-label="Close calculator"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="calculator-tabs" role="tablist">
            <button
              className={`calculator-tab ${activeTab === 'pos' ? 'active' : ''}`}
              onClick={() => setActiveTab('pos')}
              role="tab"
              aria-selected={activeTab === 'pos'}
              aria-controls="pos-panel"
            >
              🛒 POS
            </button>
            <button
              className={`calculator-tab ${activeTab === 'calc' ? 'active' : ''}`}
              onClick={() => setActiveTab('calc')}
              role="tab"
              aria-selected={activeTab === 'calc'}
              aria-controls="calc-panel"
            >
              🧮 Math
            </button>
          </div>

          {/* Content */}
          <div className="calculator-content">
            {/* POS TAB */}
            {activeTab === 'pos' && (
              <div id="pos-panel" role="tabpanel" aria-labelledby="pos-tab">
                {/* Search */}
                <div className="pos-search">
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search items by name or SKU..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    aria-label="Search items"
                  />

                  {filteredItems.length > 0 && (
                    <ul className="suggestions-list">
                      {filteredItems.map((item) => (
                        <li
                          key={item.id}
                          className="suggestion-item"
                          onClick={() => handleSelectItem(item)}
                        >
                          <div className="suggestion-name">{item.name}</div>
                          {item.sku && <div className="suggestion-sku">{item.sku}</div>}
                          <div className="suggestion-stock">
                            {getStockIndicator(item.stock)} {item.stock} units
                          </div>
                          <div className="suggestion-price">
                            Last: ₦{((item.lastSellKobo || item.priceKobo) / 100).toLocaleString()}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Selected Item Form */}
                {selectedItem && (
                  <div className="selected-item">
                    <div className="selected-item-header">
                      <strong>{selectedItem.name}</strong>
                      <button
                        className="clear-button"
                        onClick={handleClearSelectedItem}
                        aria-label="Clear selected item"
                      >
                        ×
                      </button>
                    </div>

                    {/* Price */}
                    <div className="form-field">
                      <label htmlFor="pos-price">Price (₦)</label>
                      <input
                        id="pos-price"
                        type="number"
                        className="price-input"
                        min={0.01}
                        max={999999999}
                        value={priceNaira}
                        onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0.01)}
                        aria-label="Price"
                      />
                      {priceNaira !== (selectedItem.lastSellKobo || selectedItem.priceKobo) / 100 && (
                        <span className="custom-price-badge">Custom price</span>
                      )}
                      <small className="price-hint">
                        Last sold: ₦{((selectedItem.lastSellKobo || selectedItem.priceKobo) / 100).toLocaleString()}
                      </small>
                      {priceNaira < 0.01 && (
                        <small className="price-error">Price must be at least ₦0.01</small>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="form-field">
                      <label>Quantity</label>
                      <div className="qty-controls">
                        <button
                          className="qty-button"
                          onClick={() => handleQtyChange(-1)}
                          disabled={qty <= 1}
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="qty-display">{qty}</span>
                        <button
                          className="qty-button"
                          onClick={() => handleQtyChange(1)}
                          disabled={qty >= selectedItem.stock && !allowStockOverride}
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Stock Info */}
                    <div className="stock-info">
                      Stock available: {selectedItem.stock} units
                      {qty === selectedItem.stock && selectedItem.stock > 0 && (
                        <div className="stock-warning">⚠️ Using all available stock</div>
                      )}
                      {qty > selectedItem.stock && selectedItem.stock > 0 && (
                        <>
                          <div className="stock-warning">
                            ⚠️ Exceeds stock by {qty - selectedItem.stock}
                          </div>
                          <label className="stock-override-checkbox">
                            <input
                              type="checkbox"
                              checked={allowStockOverride}
                              onChange={(e) =>
                                setPosState((prev) => ({ ...prev, allowStockOverride: e.target.checked }))
                              }
                            />
                            Allow stock override
                          </label>
                        </>
                      )}
                    </div>

                    {/* Line Total */}
                    <div className="line-total">
                      Line total: ₦{(qty * priceNaira).toLocaleString()}
                    </div>

                    {/* Zero Stock Handling */}
                    {selectedItem.stock === 0 && (
                      <>
                        <div className="zero-stock-banner">⚠️ Out of stock</div>
                        <button
                          className="btn-warning-secondary"
                          onClick={handleAddLineZeroStock}
                          aria-label="Override and add zero stock item"
                        >
                          Override & Add Anyway
                        </button>
                      </>
                    )}

                    {/* Add Line Button */}
                    {selectedItem.stock > 0 && (
                      <button
                        className="btn-primary"
                        onClick={handleAddLine}
                        disabled={isAddLineDisabled}
                        aria-label="Add line to cart"
                      >
                        Add Line
                      </button>
                    )}
                  </div>
                )}

                {/* Cart */}
                <div className="cart-section">
                  <div className="cart-header">
                    {lines.length === 0 ? 'Cart is empty' : `Cart (${lines.length} items)`}
                  </div>

                  {lines.length > 0 && (
                    <>
                      <ul className="cart-list">
                        {lines.map((line) => (
                          <li key={line.itemId} className="cart-item">
                            <div className="cart-item-info">
                              {line.name} × {line.qty} = ₦{line.lineTotal.toLocaleString()}
                            </div>
                            <button
                              className="cart-item-remove"
                              onClick={() => handleRemoveLine(line.itemId)}
                              aria-label={`Remove ${line.name}`}
                            >
                              🗑️
                            </button>
                          </li>
                        ))}
                      </ul>

                      <div className="cart-subtotal">Subtotal: ₦{subtotal.toLocaleString()}</div>

                      <button className="btn-secondary" onClick={handleClearCart} aria-label="Clear cart">
                        Clear Cart
                      </button>

                      <button
                        className="btn-primary btn-large"
                        onClick={handleAddToSale}
                        disabled={lines.length === 0}
                        aria-label={`Add ${lines.length} items to sale`}
                      >
                        Add {lines.length} items to Sale
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* CALC TAB */}
            {activeTab === 'calc' && (
              <div id="calc-panel" role="tabpanel" aria-labelledby="calc-tab">
                {/* Display */}
                <div className="calc-display">
                  <div className="calc-expression">{expression || '0'}</div>
                  <div className="calc-result">
                    {error ? (
                      <span className="calc-error">{error}</span>
                    ) : result !== null ? (
                      `= ${result.toLocaleString()}`
                    ) : (
                      ''
                    )}
                  </div>
                </div>

                {/* Keypad */}
                <div className="calc-keypad">
                  {/* Row 1 */}
                  <button className="calc-button memory" onClick={() => handleCalcButton('MC')}>
                    MC
                  </button>
                  <button className="calc-button memory" onClick={() => handleCalcButton('M+')}>
                    M+
                  </button>
                  <button className="calc-button memory" onClick={() => handleCalcButton('M-')}>
                    M-
                  </button>
                  <button className="calc-button memory" onClick={() => handleCalcButton('MR')}>
                    MR
                  </button>

                  {/* Row 2 */}
                  <button className="calc-button" onClick={() => handleCalcButton('7')}>
                    7
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('8')}>
                    8
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('9')}>
                    9
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('÷')}>
                    ÷
                  </button>

                  {/* Row 3 */}
                  <button className="calc-button" onClick={() => handleCalcButton('4')}>
                    4
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('5')}>
                    5
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('6')}>
                    6
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('×')}>
                    ×
                  </button>

                  {/* Row 4 */}
                  <button className="calc-button" onClick={() => handleCalcButton('1')}>
                    1
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('2')}>
                    2
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('3')}>
                    3
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('-')}>
                    −
                  </button>

                  {/* Row 5 */}
                  <button className="calc-button" onClick={() => handleCalcButton('0')}>
                    0
                  </button>
                  <button className="calc-button" onClick={() => handleCalcButton('.')}>
                    .
                  </button>
                  <button className="calc-button equals" onClick={() => handleCalcButton('=')}>
                    =
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('+')}>
                    +
                  </button>

                  {/* Row 6 */}
                  <button className="calc-button clear" onClick={() => handleCalcButton('C')}>
                    C
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('%')}>
                    %
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton('(')}>
                    (
                  </button>
                  <button className="calc-button operator" onClick={() => handleCalcButton(')')}>
                    )
                  </button>
                </div>

                {/* Use Result */}
                <div className="use-result-section">
                  <button
                    className="use-result-button"
                    onClick={handleUseResultAsPrice}
                    disabled={isUseResultDisabled || !posState.selectedItem}
                    aria-label="Use result as price"
                  >
                    Use as Price
                  </button>
                  <button
                    className="use-result-button"
                    onClick={handleUseResultAsQty}
                    disabled={isUseResultDisabled || !posState.selectedItem}
                    aria-label="Use result as quantity"
                  >
                    Use as Quantity
                  </button>
                  {isUseResultDisabled && <small>Calculate a result first</small>}
                  {!posState.selectedItem && !isUseResultDisabled && (
                    <small>Select an item in POS tab first</small>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
