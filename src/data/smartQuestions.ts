/**
 * SMART QUESTIONS - Context-Aware Suggestions
 * Top 50 FAQs organized by page/context for AI Chat Widget
 * Based on priority scores and common user questions
 * Last updated: 2025-12-18
 */

export interface SmartQuestion {
  question: string;
  category: string;
  priority: number;
  contexts: string[]; // Which pages/contexts this question applies to
  keywords: string[];
}

export const SMART_QUESTIONS: SmartQuestion[] = [

  // ============================================
  // GETTING STARTED (Priority 90-100)
  // ============================================

  {
    question: "Show me the 5-minute quick start guide",
    category: "getting-started",
    priority: 100,
    contexts: ["dashboard", "all", "onboarding"],
    keywords: ["first 5 minutes", "quick start", "getting started", "new user", "tutorial"]
  },

  {
    question: "How do I add my first product?",
    category: "getting-started",
    priority: 95,
    contexts: ["dashboard", "products", "inventory", "onboarding"],
    keywords: ["add product", "new item", "first product", "add inventory"]
  },

  {
    question: "How do I record a sale?",
    category: "getting-started",
    priority: 90,
    contexts: ["dashboard", "sales", "onboarding"],
    keywords: ["record sale", "sell product", "make sale", "first sale"]
  },

  {
    question: "What is Storehouse and what can it do?",
    category: "getting-started",
    priority: 100,
    contexts: ["dashboard", "all", "onboarding"],
    keywords: ["welcome", "getting started", "introduction", "what is storehouse"]
  },

  {
    question: "How do I set up my business information?",
    category: "getting-started",
    priority: 85,
    contexts: ["settings", "onboarding"],
    keywords: ["business settings", "setup", "configure", "business info"]
  },

  // ============================================
  // PRICING & PLANS (Priority 95-100)
  // ============================================

  {
    question: "How much does Storehouse cost?",
    category: "pricing",
    priority: 100,
    contexts: ["all", "dashboard", "settings"],
    keywords: ["pricing", "cost", "how much", "free", "subscription", "plans"]
  },

  {
    question: "Why should I use Storehouse instead of Excel?",
    category: "marketing",
    priority: 95,
    contexts: ["all", "dashboard"],
    keywords: ["excel vs storehouse", "spreadsheet vs app", "why not excel"]
  },

  {
    question: "Is my business data safe and secure?",
    category: "security",
    priority: 90,
    contexts: ["all", "settings"],
    keywords: ["security", "safe", "privacy", "data protection", "secure"]
  },

  // ============================================
  // PRODUCTS & INVENTORY (Priority 70-75)
  // ============================================

  {
    question: "How do I edit or update a product?",
    category: "products",
    priority: 75,
    contexts: ["products", "inventory", "dashboard"],
    keywords: ["edit product", "update product", "change price", "modify product"]
  },

  {
    question: "How do I manage stock and inventory levels?",
    category: "products",
    priority: 75,
    contexts: ["products", "inventory", "dashboard"],
    keywords: ["stock", "inventory", "quantity", "restock", "low stock"]
  },

  {
    question: "How do I add product variants like sizes or colors?",
    category: "products",
    priority: 75,
    contexts: ["products", "inventory"],
    keywords: ["variants", "sizes", "colors", "options", "different sizes"]
  },

  {
    question: "How do I delete a product?",
    category: "products",
    priority: 70,
    contexts: ["products", "inventory"],
    keywords: ["delete product", "remove product", "trash bin icon"]
  },

  {
    question: "How do I upload product images?",
    category: "products",
    priority: 70,
    contexts: ["products", "inventory", "online-store"],
    keywords: ["images", "photos", "upload image", "multiple images"]
  },

  {
    question: "How do I set up low stock alerts?",
    category: "products",
    priority: 70,
    contexts: ["products", "inventory", "settings"],
    keywords: ["low stock", "alerts", "warnings", "restock"]
  },

  {
    question: "Can I import products from Excel/CSV?",
    category: "products",
    priority: 65,
    contexts: ["products", "inventory"],
    keywords: ["import", "csv", "excel", "bulk upload"]
  },

  // ============================================
  // SALES & TRANSACTIONS (Priority 70-85)
  // ============================================

  {
    question: "What's the difference between cash and credit sales?",
    category: "sales",
    priority: 85,
    contexts: ["sales", "dashboard", "customers"],
    keywords: ["cash", "credit", "debt", "owe", "customer owes"]
  },

  {
    question: "How do I view today's sales summary?",
    category: "sales",
    priority: 75,
    contexts: ["sales", "dashboard", "reports"],
    keywords: ["today sales", "daily sales", "summary", "today profit"]
  },

  {
    question: "What payment methods can I track?",
    category: "sales",
    priority: 70,
    contexts: ["sales", "dashboard", "settings"],
    keywords: ["payment", "cash", "transfer", "pos", "paystack"]
  },

  {
    question: "How do I track sales by channel (Instagram, WhatsApp, etc.)?",
    category: "sales",
    priority: 70,
    contexts: ["sales", "reports", "dashboard"],
    keywords: ["sales channel", "whatsapp", "online", "retail", "instagram"]
  },

  {
    question: "How do I view my sales history?",
    category: "sales",
    priority: 65,
    contexts: ["sales", "reports"],
    keywords: ["sales history", "past sales", "view sales", "sales report"]
  },

  {
    question: "How do I send receipts via WhatsApp?",
    category: "sales",
    priority: 70,
    contexts: ["sales", "customers", "settings"],
    keywords: ["whatsapp receipt", "send receipt", "share receipt"]
  },

  // ============================================
  // CUSTOMERS (Priority 65-80)
  // ============================================

  {
    question: "How do I add and manage customers?",
    category: "customers",
    priority: 70,
    contexts: ["customers", "dashboard"],
    keywords: ["customers", "customer list", "customer profile", "track customers"]
  },

  {
    question: "How do I track customer debts and payments?",
    category: "customers",
    priority: 80,
    contexts: ["customers", "sales"],
    keywords: ["debt", "customer debt", "credit", "money owed", "customer owes"]
  },

  {
    question: "How do I view a customer's purchase history?",
    category: "customers",
    priority: 65,
    contexts: ["customers"],
    keywords: ["purchase history", "customer history", "what customer bought"]
  },

  {
    question: "How do I send debt reminders via WhatsApp?",
    category: "customers",
    priority: 70,
    contexts: ["customers"],
    keywords: ["debt reminder", "payment reminder", "whatsapp reminder"]
  },

  // ============================================
  // INVOICING (Priority 70-75)
  // ============================================

  {
    question: "How do I create professional invoices?",
    category: "invoicing",
    priority: 75,
    contexts: ["invoices", "customers"],
    keywords: ["invoice", "b2b invoice", "professional invoice", "create invoice"]
  },

  {
    question: "How do I send invoices via WhatsApp?",
    category: "invoicing",
    priority: 70,
    contexts: ["invoices"],
    keywords: ["send invoice", "whatsapp invoice", "invoice delivery"]
  },

  {
    question: "How do I track invoice payments?",
    category: "invoicing",
    priority: 75,
    contexts: ["invoices"],
    keywords: ["track invoice", "invoice payment", "overdue invoice"]
  },

  // ============================================
  // ONLINE STORE (Priority 75-85)
  // ============================================

  {
    question: "How do I create my online store?",
    category: "online-store",
    priority: 80,
    contexts: ["online-store", "dashboard", "settings"],
    keywords: ["online store", "e-commerce", "sell online", "web store"]
  },

  {
    question: "How do customers order via WhatsApp from my store?",
    category: "online-store",
    priority: 85,
    contexts: ["online-store"],
    keywords: ["whatsapp", "order via whatsapp", "whatsapp button", "whatsapp ordering"]
  },

  {
    question: "How do I handle online store orders?",
    category: "online-store",
    priority: 75,
    contexts: ["online-store", "sales"],
    keywords: ["online orders", "order management", "process orders"]
  },

  {
    question: "How do I optimize my store for Google search?",
    category: "online-store",
    priority: 70,
    contexts: ["online-store", "settings"],
    keywords: ["seo", "google", "search", "optimize", "visibility"]
  },

  {
    question: "How do I add payment methods like OPay and Moniepoint?",
    category: "online-store",
    priority: 75,
    contexts: ["online-store", "settings"],
    keywords: ["payment methods", "opay", "moniepoint", "bank", "paystack"]
  },

  // ============================================
  // STAFF MANAGEMENT (Priority 65-70)
  // ============================================

  {
    question: "How do I add and manage staff members?",
    category: "staff",
    priority: 70,
    contexts: ["staff", "settings"],
    keywords: ["add staff", "staff management", "employee access", "cashier"]
  },

  {
    question: "How does staff PIN authentication work?",
    category: "staff",
    priority: 65,
    contexts: ["staff"],
    keywords: ["staff pin", "pin login", "staff authentication"]
  },

  {
    question: "How do I track staff sales and performance?",
    category: "staff",
    priority: 65,
    contexts: ["staff", "reports"],
    keywords: ["staff sales", "track staff", "employee performance"]
  },

  // ============================================
  // REPORTS & ANALYTICS (Priority 70-80)
  // ============================================

  {
    question: "How do I view business reports and analytics?",
    category: "reports",
    priority: 75,
    contexts: ["reports", "dashboard"],
    keywords: ["reports", "analytics", "business insights", "statistics"]
  },

  {
    question: "How do I view the sales trend chart?",
    category: "reports",
    priority: 70,
    contexts: ["reports", "dashboard"],
    keywords: ["sales trend", "chart", "graph", "visual", "trends"]
  },

  {
    question: "How do I track profit margins?",
    category: "reports",
    priority: 75,
    contexts: ["reports", "dashboard", "sales"],
    keywords: ["profit", "margin", "profit margin", "earnings"]
  },

  // ============================================
  // REFERRALS (Priority 75-85)
  // ============================================

  {
    question: "How does the referral program work?",
    category: "referrals",
    priority: 85,
    contexts: ["referrals", "settings"],
    keywords: ["referral program", "refer friends", "earn rewards"]
  },

  {
    question: "How do I refer friends to Storehouse?",
    category: "referrals",
    priority: 80,
    contexts: ["referrals"],
    keywords: ["refer friends", "share referral link", "referral code"]
  },

  {
    question: "How do I track my referral rewards?",
    category: "referrals",
    priority: 75,
    contexts: ["referrals"],
    keywords: ["referral rewards", "track referrals", "airtime credit"]
  },

  // ============================================
  // SETTINGS & CONFIGURATION (Priority 65-75)
  // ============================================

  {
    question: "How do I configure my business settings?",
    category: "settings",
    priority: 70,
    contexts: ["settings"],
    keywords: ["settings", "configure", "preferences", "business settings"]
  },

  {
    question: "How do I export and backup my data?",
    category: "settings",
    priority: 75,
    contexts: ["settings"],
    keywords: ["export", "backup", "data", "download", "save data"]
  },

  {
    question: "How do I change my password or account details?",
    category: "settings",
    priority: 65,
    contexts: ["settings"],
    keywords: ["password", "account", "email", "change password"]
  },

  // ============================================
  // TROUBLESHOOTING (Priority 70-75)
  // ============================================

  {
    question: "Why can't I see the Edit button?",
    category: "troubleshooting",
    priority: 70,
    contexts: ["all", "products", "staff"],
    keywords: ["edit button", "missing button", "permissions", "role"]
  },

  {
    question: "How do I fix sync and connection issues?",
    category: "troubleshooting",
    priority: 75,
    contexts: ["all"],
    keywords: ["sync", "connection", "offline", "not syncing", "internet"]
  },

  {
    question: "Why is my payment not recorded?",
    category: "troubleshooting",
    priority: 70,
    contexts: ["sales", "invoices"],
    keywords: ["payment not recorded", "missing payment", "payment issue"]
  },

  // ============================================
  // WHATSAPP FEATURES (Priority 70-85)
  // ============================================

  {
    question: "How do I send daily WhatsApp reports?",
    category: "whatsapp",
    priority: 75,
    contexts: ["settings", "reports"],
    keywords: ["whatsapp reports", "daily report", "automated report"]
  },

  {
    question: "How do I customize WhatsApp messages?",
    category: "whatsapp",
    priority: 70,
    contexts: ["settings", "customers"],
    keywords: ["whatsapp customize", "message template", "whatsapp text"]
  }
];

/**
 * Get smart questions for a specific context/page
 * @param context - The current page/context (e.g., "dashboard", "products", "sales")
 * @param limit - Maximum number of questions to return
 * @returns Array of relevant questions sorted by priority
 */
export function getSmartQuestionsForContext(context: string, limit: number = 6): string[] {
  return SMART_QUESTIONS
    .filter(q => q.contexts.includes(context) || q.contexts.includes("all"))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(q => q.question);
}

/**
 * Get top questions across all contexts
 * @param limit - Maximum number of questions to return
 * @returns Array of top questions sorted by priority
 */
export function getTopQuestions(limit: number = 10): string[] {
  return SMART_QUESTIONS
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(q => q.question);
}

/**
 * Search questions by keyword
 * @param keyword - Search term
 * @param limit - Maximum number of questions to return
 * @returns Array of matching questions
 */
export function searchQuestions(keyword: string, limit: number = 5): string[] {
  const lowerKeyword = keyword.toLowerCase();
  return SMART_QUESTIONS
    .filter(q =>
      q.question.toLowerCase().includes(lowerKeyword) ||
      q.keywords.some(k => k.includes(lowerKeyword))
    )
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(q => q.question);
}
