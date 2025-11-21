/**
 * Widget Registry & Business Type Presets
 * Defines all available dashboard widgets and their configurations
 */

export type WidgetId =
  | 'todaySales'
  | 'weekSales'
  | 'monthSales'
  | 'quickSell'
  | 'lowStock'
  | 'topProducts'
  | 'recentSales'
  | 'credits'
  | 'expenses'
  | 'profitMargin'
  | 'inventory'
  | 'customers';

export type WidgetCategory = 'sales' | 'inventory' | 'finance' | 'quick-actions';

export type BusinessType =
  | 'fashion'
  | 'electronics'
  | 'food'
  | 'pharmacy'
  | 'general';

export interface WidgetMetadata {
  id: WidgetId;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultOrder: number;
  requiresOwnerAccess?: boolean;
  badge?: {
    field: 'count' | 'amount' | 'profit' | 'percentage';
    color: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
    prefix?: string;
    suffix?: string;
  };
}

/**
 * All available widgets with metadata
 */
export const WIDGETS: Record<WidgetId, WidgetMetadata> = {
  todaySales: {
    id: 'todaySales',
    name: "Today's Sales",
    description: 'Sales recorded today',
    category: 'sales',
    icon: '📊',
    defaultOrder: 1,
    badge: {
      field: 'amount',
      color: 'green',
      prefix: '₦'
    }
  },
  weekSales: {
    id: 'weekSales',
    name: 'This Week',
    description: 'Sales from the last 7 days',
    category: 'sales',
    icon: '📈',
    defaultOrder: 2,
    badge: {
      field: 'amount',
      color: 'blue',
      prefix: '₦'
    }
  },
  monthSales: {
    id: 'monthSales',
    name: 'This Month',
    description: 'Sales from the last 30 days',
    category: 'sales',
    icon: '📅',
    defaultOrder: 3,
    badge: {
      field: 'amount',
      color: 'blue',
      prefix: '₦'
    }
  },
  quickSell: {
    id: 'quickSell',
    name: 'Quick Sell',
    description: 'Fast access to top-selling items',
    category: 'quick-actions',
    icon: '⚡',
    defaultOrder: 4
  },
  lowStock: {
    id: 'lowStock',
    name: 'Low Stock Alert',
    description: 'Items running low',
    category: 'inventory',
    icon: '⚠️',
    defaultOrder: 5,
    badge: {
      field: 'count',
      color: 'red',
      suffix: ' items'
    }
  },
  topProducts: {
    id: 'topProducts',
    name: 'Top Products',
    description: 'Best-selling items this month',
    category: 'inventory',
    icon: '🏆',
    defaultOrder: 6
  },
  recentSales: {
    id: 'recentSales',
    name: 'Recent Sales',
    description: 'Latest 5 transactions',
    category: 'sales',
    icon: '🕒',
    defaultOrder: 7
  },
  credits: {
    id: 'credits',
    name: 'Credits Owed',
    description: 'Outstanding customer credits',
    category: 'finance',
    icon: '💳',
    defaultOrder: 8,
    badge: {
      field: 'amount',
      color: 'yellow',
      prefix: '₦'
    }
  },
  expenses: {
    id: 'expenses',
    name: 'Expenses',
    description: 'Monthly business expenses',
    category: 'finance',
    icon: '💸',
    defaultOrder: 9,
    requiresOwnerAccess: true,
    badge: {
      field: 'amount',
      color: 'red',
      prefix: '₦'
    }
  },
  profitMargin: {
    id: 'profitMargin',
    name: 'Profit Margin',
    description: 'Cost vs selling price analysis',
    category: 'finance',
    icon: '💰',
    defaultOrder: 10,
    requiresOwnerAccess: true,
    badge: {
      field: 'percentage',
      color: 'green',
      suffix: '%'
    }
  },
  inventory: {
    id: 'inventory',
    name: 'Inventory Value',
    description: 'Total stock worth',
    category: 'inventory',
    icon: '📦',
    defaultOrder: 11,
    requiresOwnerAccess: true,
    badge: {
      field: 'amount',
      color: 'blue',
      prefix: '₦'
    }
  },
  customers: {
    id: 'customers',
    name: 'Customers',
    description: 'Total registered customers',
    category: 'finance',
    icon: '👥',
    defaultOrder: 12,
    badge: {
      field: 'count',
      color: 'gray',
      suffix: ' customers'
    }
  }
};

/**
 * Business type presets - optimized widget layouts for different business types
 */
export const BUSINESS_PRESETS: Record<BusinessType, {
  name: string;
  description: string;
  icon: string;
  widgets: WidgetId[];
}> = {
  fashion: {
    name: 'Fashion & Clothing',
    description: 'Boutiques, fashion stores, tailoring',
    icon: '👗',
    widgets: [
      'todaySales',
      'quickSell',
      'lowStock',
      'topProducts',
      'recentSales',
      'credits',
      'customers'
    ]
  },
  electronics: {
    name: 'Electronics & Gadgets',
    description: 'Phone shops, computer stores',
    icon: '📱',
    widgets: [
      'todaySales',
      'quickSell',
      'lowStock',
      'topProducts',
      'recentSales',
      'credits',
      'customers'
    ]
  },
  food: {
    name: 'Food & Beverages',
    description: 'Restaurants, supermarkets, provisions',
    icon: '🍽️',
    widgets: [
      'todaySales',
      'quickSell',
      'lowStock',
      'topProducts',
      'recentSales',
      'credits',
      'customers'
    ]
  },
  pharmacy: {
    name: 'Pharmacy & Health',
    description: 'Pharmacies, medical stores',
    icon: '💊',
    widgets: [
      'todaySales',
      'quickSell',
      'lowStock',
      'topProducts',
      'recentSales',
      'credits',
      'customers'
    ]
  },
  general: {
    name: 'General Store',
    description: 'All-purpose retail',
    icon: '🏪',
    widgets: [
      'todaySales',
      'quickSell',
      'lowStock',
      'topProducts',
      'recentSales',
      'credits',
      'customers'
    ]
  }
};

/**
 * Default widget configuration for new users
 */
export const DEFAULT_WIDGETS: WidgetId[] = [
  'todaySales',
  'quickSell',
  'lowStock',
  'recentSales'
];

/**
 * Widget categories for organization
 */
export const WIDGET_CATEGORIES: Record<WidgetCategory, {
  name: string;
  icon: string;
  color: string;
}> = {
  sales: {
    name: 'Sales Metrics',
    icon: '📊',
    color: '#10b981'
  },
  inventory: {
    name: 'Inventory',
    icon: '📦',
    color: '#3b82f6'
  },
  finance: {
    name: 'Finance',
    icon: '💰',
    color: '#f59e0b'
  },
  'quick-actions': {
    name: 'Quick Actions',
    icon: '⚡',
    color: '#8b5cf6'
  }
};

/**
 * Widget groups for collapsible sections
 */
export const WIDGET_GROUPS = {
  salesInsights: {
    title: 'Today\'s Sales',
    ids: ['todaySales', 'weekSales', 'monthSales', 'recentSales']
  },
  inventoryHealth: {
    title: 'Inventory Health',
    ids: ['lowStock', 'inventory', 'topProducts']
  },
  moneyAndCredit: {
    title: 'Money & Credit',
    ids: ['credits', 'expenses', 'profitMargin']
  },
  quickSell: {
    title: 'Quick Sell',
    ids: ['quickSell']
  }
};

/**
 * Core action button IDs
 */
export const CORE_ACTIONS = ['record-sale-button', 'add-item-button'];
