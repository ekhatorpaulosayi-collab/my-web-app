/**
 * Preferences Context
 * Manages dashboard widget preferences, business type, and owner access
 * Persists to localStorage for fast, privacy-focused client-side storage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BusinessType, WidgetId, BUSINESS_PRESETS, DEFAULT_WIDGETS } from '../constants/widgets';
import { CollapsedState } from '../types';

interface OwnerAccess {
  isAuthenticated: boolean;
  expiresAt: number | null;
}

interface PreferencesContextType {
  // Business type
  businessType: BusinessType | null;
  setBusinessType: (type: BusinessType) => void;

  // Active widgets
  activeWidgets: WidgetId[];
  setActiveWidgets: (widgets: WidgetId[]) => void;
  toggleWidget: (widgetId: WidgetId) => void;

  // Widget order
  reorderWidgets: (startIndex: number, endIndex: number) => void;

  // Owner access
  ownerAccess: OwnerAccess;
  ownerPIN: string | null;
  setOwnerPIN: (pin: string) => void;
  authenticateOwner: (pin: string) => boolean;
  logoutOwner: () => void;

  // First-time setup
  isFirstTimeSetup: boolean;
  completeSetup: () => void;

  // Calm Mode & Collapsed state
  calmMode: boolean;
  setCalmMode: (calmMode: boolean) => void;
  collapsed: CollapsedState;
  setCollapsed: (id: string, collapsed: boolean) => void;

  // Reset
  resetToDefaults: () => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEYS = {
  businessType: 'storehouse_business_type',
  activeWidgets: 'storehouse_active_widgets',
  ownerPIN: 'storehouse_owner_pin',
  isFirstTimeSetup: 'storehouse_first_time_setup',
  calmMode: 'storehouse_calm_mode',
  collapsed: 'storehouse_collapsed'
};

const OWNER_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

export function PreferencesProvider({ children }: { children: ReactNode }) {
  // Load saved preferences
  const [businessType, setBusinessTypeState] = useState<BusinessType | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.businessType);
    return saved ? (saved as BusinessType) : null;
  });

  const [activeWidgets, setActiveWidgetsState] = useState<WidgetId[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.activeWidgets);
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  const [ownerPIN, setOwnerPINState] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ownerPIN);
  });

  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.isFirstTimeSetup);
    return saved !== 'false'; // Default to true if not set
  });

  const [ownerAccess, setOwnerAccess] = useState<OwnerAccess>({
    isAuthenticated: false,
    expiresAt: null
  });

  // Calm Mode - default to true on mobile
  const [calmMode, setCalmModeState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.calmMode);
    if (saved !== null) return JSON.parse(saved);
    // Default to true on mobile (< 768px)
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  // Collapsed state for widgets
  const [collapsed, setCollapsedState] = useState<CollapsedState>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.collapsed);
    return saved ? JSON.parse(saved) : {};
  });

  // Auto-logout when session expires
  useEffect(() => {
    if (!ownerAccess.isAuthenticated || !ownerAccess.expiresAt) return;

    const now = Date.now();
    const timeRemaining = ownerAccess.expiresAt - now;

    if (timeRemaining <= 0) {
      logoutOwner();
      return;
    }

    const timeout = setTimeout(() => {
      logoutOwner();
    }, timeRemaining);

    return () => clearTimeout(timeout);
  }, [ownerAccess]);

  // Setters with localStorage persistence
  const setBusinessType = (type: BusinessType) => {
    setBusinessTypeState(type);
    localStorage.setItem(STORAGE_KEYS.businessType, type);

    // Auto-apply business type preset
    const preset = BUSINESS_PRESETS[type];
    if (preset) {
      setActiveWidgets(preset.widgets);
    }
  };

  const setActiveWidgets = (widgets: WidgetId[]) => {
    setActiveWidgetsState(widgets);
    localStorage.setItem(STORAGE_KEYS.activeWidgets, JSON.stringify(widgets));
  };

  const toggleWidget = (widgetId: WidgetId) => {
    setActiveWidgets(
      activeWidgets.includes(widgetId)
        ? activeWidgets.filter(id => id !== widgetId)
        : [...activeWidgets, widgetId]
    );
  };

  const reorderWidgets = (startIndex: number, endIndex: number) => {
    const result = Array.from(activeWidgets);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setActiveWidgets(result);
  };

  const setOwnerPIN = (pin: string) => {
    setOwnerPINState(pin);
    if (pin) {
      localStorage.setItem(STORAGE_KEYS.ownerPIN, pin);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ownerPIN);
    }
  };

  const authenticateOwner = (pin: string): boolean => {
    if (!ownerPIN || pin !== ownerPIN) {
      return false;
    }

    setOwnerAccess({
      isAuthenticated: true,
      expiresAt: Date.now() + OWNER_SESSION_DURATION
    });

    return true;
  };

  const logoutOwner = () => {
    setOwnerAccess({
      isAuthenticated: false,
      expiresAt: null
    });
  };

  const completeSetup = () => {
    setIsFirstTimeSetup(false);
    localStorage.setItem(STORAGE_KEYS.isFirstTimeSetup, 'false');
  };

  const setCalmMode = (mode: boolean) => {
    setCalmModeState(mode);
    localStorage.setItem(STORAGE_KEYS.calmMode, JSON.stringify(mode));
  };

  const setCollapsed = (id: string, isCollapsed: boolean) => {
    const newCollapsed = { ...collapsed, [id]: isCollapsed };
    setCollapsedState(newCollapsed);
    localStorage.setItem(STORAGE_KEYS.collapsed, JSON.stringify(newCollapsed));
  };

  const resetToDefaults = () => {
    setBusinessTypeState(null);
    setActiveWidgetsState(DEFAULT_WIDGETS);
    setOwnerPINState(null);
    setIsFirstTimeSetup(true);
    setCalmModeState(typeof window !== 'undefined' && window.innerWidth < 768);
    setCollapsedState({});

    localStorage.removeItem(STORAGE_KEYS.businessType);
    localStorage.removeItem(STORAGE_KEYS.activeWidgets);
    localStorage.removeItem(STORAGE_KEYS.ownerPIN);
    localStorage.removeItem(STORAGE_KEYS.isFirstTimeSetup);
    localStorage.removeItem(STORAGE_KEYS.calmMode);
    localStorage.removeItem(STORAGE_KEYS.collapsed);

    logoutOwner();
  };

  const value: PreferencesContextType = {
    businessType,
    setBusinessType,
    activeWidgets,
    setActiveWidgets,
    toggleWidget,
    reorderWidgets,
    ownerAccess,
    ownerPIN,
    setOwnerPIN,
    authenticateOwner,
    logoutOwner,
    isFirstTimeSetup,
    completeSetup,
    calmMode,
    setCalmMode,
    collapsed,
    setCollapsed,
    resetToDefaults
  };

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
