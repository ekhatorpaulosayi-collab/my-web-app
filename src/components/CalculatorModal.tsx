import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/calculator.css';

// ═══════════════════════════════════════
// DATA STRUCTURES
// ═══════════════════════════════════════

interface CalcState {
  expression: string;
  result: number | null;
  memory: number;
  error: string | null;
}

interface PersistedState {
  calcExpression: string;
  calcMemory: number;
  lastUpdated: string;
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

  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  // Calculator State
  const [calcState, setCalcState] = useState<CalcState>({
    expression: '',
    result: null,
    memory: 0,
    error: null
  });

  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // ═══════════════════════════════════════
  // TOAST HELPER
  // ═══════════════════════════════════════

  const showToast = useCallback((message: string, type: string = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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

      setCalcState(prev => ({
        ...prev,
        expression: parsed.calcExpression || '',
        memory: parsed.calcMemory || 0
      }));
      setLastUpdated(parsed.lastUpdated || new Date().toISOString());

      console.debug('[Calculator] Loaded state:', {
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
  }, [calcState.expression, calcState.memory, showToast]);

  useEffect(() => {
    if (isOpen) saveState();
  }, [calcState.expression, calcState.memory, isOpen, saveState]);

  // ═══════════════════════════════════════
  // MULTI-TAB SYNC
  // ═══════════════════════════════════════

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;

      try {
        const newState: PersistedState = JSON.parse(e.newValue);
        if (new Date(newState.lastUpdated) > new Date(lastUpdated)) {
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
  // KEYBOARD SHORTCUTS
  // ═══════════════════════════════════════

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

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
  // RENDER
  // ═══════════════════════════════════════

  if (!isOpen) return null;

  const { expression, result, error } = calcState;

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

          {/* Content */}
          <div className="calculator-content">
            <div id="calc-panel" role="main" aria-labelledby="calculator-title">
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
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
