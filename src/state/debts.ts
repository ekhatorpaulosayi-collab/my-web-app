// src/state/debts.ts
export type DebtStatus = "open" | "paid" | "partial";
export type InstallmentFrequency = "weekly" | "biweekly" | "monthly";
export type InstallmentStatus = "pending" | "paid" | "overdue";

export interface Payment {
  id: string;               // Payment ID (e.g., PAY-001)
  amount: number;           // Amount paid
  date: string;             // ISO timestamp
  method?: string;          // Optional: "cash", "transfer", "pos"
  installmentNumber?: number; // Which installment this payment is for
}

export interface Installment {
  number: number;           // Installment number (1, 2, 3, etc.)
  amount: number;           // Expected payment amount
  dueDate: string;          // "yyyy-mm-dd"
  status: InstallmentStatus; // "pending" | "paid" | "overdue"
  paidDate?: string;        // When it was paid
  paidAmount?: number;      // Actual amount paid (may differ from expected)
  paymentId?: string;       // Link to payment record
}

export interface InstallmentPlan {
  enabled: true;
  totalInstallments: number;    // Total number of installments
  installmentAmount: number;    // Amount per installment
  frequency: InstallmentFrequency; // "weekly" | "biweekly" | "monthly"
  startDate: string;            // First payment date "yyyy-mm-dd"
  schedule: Installment[];      // Full payment schedule
}

export interface Debt {
  id: string;               // nanoid or Date.now().toString()
  customerName: string;
  phone?: string;

  // Payment tracking (amounts in naira, not kobo)
  totalAmount: number;      // Original debt amount
  amountPaid: number;       // Total amount paid so far
  amountRemaining: number;  // Balance due

  // Legacy field for backward compatibility
  amount?: number;          // Deprecated, use totalAmount

  // Installment plan (optional)
  installmentPlan?: InstallmentPlan;

  payments: Payment[];      // Payment history
  dueDate: string;          // "yyyy-mm-dd" (final due date or next installment due)
  createdAt: string;        // ISO
  status: DebtStatus;       // "open" | "partial" | "paid"
}

let cache: Debt[] | null = null;
const KEY = "storehouse:debts";

// Migration helper: Convert old debt format to new format
function migrateDebt(debt: any): Debt {
  // If already migrated, return as-is
  if (debt.totalAmount !== undefined && debt.payments !== undefined) {
    return debt as Debt;
  }

  // Migrate old format to new format
  const amount = debt.amount || 0;
  const isPaid = debt.status === "paid";

  return {
    ...debt,
    totalAmount: amount,
    amountPaid: isPaid ? amount : 0,
    amountRemaining: isPaid ? 0 : amount,
    payments: isPaid ? [{
      id: `PAY-${Date.now()}`,
      amount: amount,
      date: debt.createdAt,
      method: "legacy"
    }] : [],
    status: isPaid ? "paid" : "open"
  };
}

function load(): Debt[] {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Migrate all debts to new format
    cache = raw.map(migrateDebt);
    // Save migrated data
    if (cache.length > 0) {
      save(cache);
    }
  } catch {
    cache = [];
  }
  return cache!;
}

function save(list: Debt[]) {
  cache = list;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getDebts(): Debt[] {
  const list = load();
  return [...list].sort((a,b) =>
    a.dueDate.localeCompare(b.dueDate) || b.createdAt.localeCompare(a.createdAt)
  );
}

export function addDebt(d: Debt) {
  const list = load();
  list.push(d);
  save(list);
}

export function markDebtPaid(id: string) {
  const list = load();
  const i = list.findIndex(x => x.id === id);
  if (i >= 0) {
    list[i].status = "paid";
    save(list);
  }
}

export function searchDebts(q: string): Debt[] {
  const s = q.trim().toLowerCase();
  if (!s) return getDebts();
  return getDebts().filter(d =>
    d.customerName.toLowerCase().includes(s) || (d.phone||"").includes(s)
  );
}

export function isOverdue(d: Debt, today = new Date()): boolean {
  return d.status !== "paid" && new Date(d.dueDate) < new Date(today.toDateString());
}

export function countsByStatus() {
  const list = getDebts();
  const paid = list.filter(d => d.status === "paid").length;
  const overdue = list.filter(d => isOverdue(d)).length;
  return { all: list.length, overdue, paid };
}

export function totalOpenDebt(): number {
  return getDebts().filter(d => d.status !== "paid").reduce((s,d)=>s+d.amountRemaining,0);
}

export function openCount(): number {
  return getDebts().filter(d => d.status === "open").length;
}

// simple pub/sub for KPI updates
type Fn = () => void;
const subs = new Set<Fn>();

export function subscribeDebts(fn: Fn){
  subs.add(fn);
  return ()=>subs.delete(fn);
}

function notify(){
  subs.forEach(fn=>fn());
}

export function addDebtNotify(d: Debt){
  addDebt(d);
  notify();
}

export function markDebtPaidNotify(id: string){
  markDebtPaid(id);
  notify();
}

// Generate unique payment ID
function generatePaymentId(): string {
  const debts = getDebts();
  const allPayments = debts.flatMap(d => d.payments || []);
  const nextNumber = allPayments.length + 1;
  return `PAY-${String(nextNumber).padStart(3, '0')}`;
}

// Record a partial payment
export function recordPayment(debtId: string, amount: number, method?: string): Payment | null {
  const list = load();
  const index = list.findIndex(d => d.id === debtId);

  if (index === -1) return null;

  const debt = list[index];

  // Validate payment amount
  if (amount <= 0 || amount > debt.amountRemaining) {
    return null;
  }

  // Create payment record
  const payment: Payment = {
    id: generatePaymentId(),
    amount,
    date: new Date().toISOString(),
    method: method || undefined
  };

  // Update debt
  debt.payments = [...(debt.payments || []), payment];
  debt.amountPaid = (debt.amountPaid || 0) + amount;
  debt.amountRemaining = debt.totalAmount - debt.amountPaid;

  // Update status
  if (debt.amountRemaining <= 0) {
    debt.status = "paid";
    debt.amountRemaining = 0; // Ensure exactly 0
  } else if (debt.amountPaid > 0) {
    debt.status = "partial";
  }

  save(list);
  return payment;
}

// Record payment with notification
export function recordPaymentNotify(debtId: string, amount: number, method?: string): Payment | null {
  const payment = recordPayment(debtId, amount, method);
  if (payment) {
    notify();
  }
  return payment;
}

// Get payment history for a debt
export function getPaymentHistory(debtId: string): Payment[] {
  const debt = getDebts().find(d => d.id === debtId);
  return debt?.payments || [];
}

// ========== INSTALLMENT PLAN HELPERS ==========

// Calculate next installment date based on frequency
function calculateNextDate(startDate: string, frequency: InstallmentFrequency, interval: number): string {
  const date = new Date(startDate);

  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + (interval * 7));
      break;
    case 'biweekly':
      date.setDate(date.getDate() + (interval * 14));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + interval);
      break;
  }

  return date.toISOString().split('T')[0];
}

// Generate installment schedule
export function generateInstallmentSchedule(
  totalAmount: number,
  numInstallments: number,
  frequency: InstallmentFrequency,
  startDate: string
): Installment[] {
  const installmentAmount = Math.ceil(totalAmount / numInstallments);
  const schedule: Installment[] = [];

  for (let i = 0; i < numInstallments; i++) {
    const dueDate = calculateNextDate(startDate, frequency, i);

    // Last installment gets any remainder to ensure total matches
    const amount = i === numInstallments - 1
      ? totalAmount - (installmentAmount * (numInstallments - 1))
      : installmentAmount;

    schedule.push({
      number: i + 1,
      amount,
      dueDate,
      status: 'pending'
    });
  }

  return schedule;
}

// Create debt with installment plan
export function createDebtWithInstallments(
  customerName: string,
  phone: string | undefined,
  totalAmount: number,
  numInstallments: number,
  frequency: InstallmentFrequency,
  startDate: string
): Debt {
  const schedule = generateInstallmentSchedule(totalAmount, numInstallments, frequency, startDate);
  const installmentAmount = schedule[0].amount;

  const debt: Debt = {
    id: `DEBT-${Date.now()}`,
    customerName,
    phone,
    totalAmount,
    amountPaid: 0,
    amountRemaining: totalAmount,
    installmentPlan: {
      enabled: true,
      totalInstallments: numInstallments,
      installmentAmount,
      frequency,
      startDate,
      schedule
    },
    payments: [],
    dueDate: schedule[0].dueDate, // First installment due date
    createdAt: new Date().toISOString(),
    status: 'open'
  };

  return debt;
}

// Update installment statuses based on dates
export function updateInstallmentStatuses(debt: Debt): Debt {
  if (!debt.installmentPlan) return debt;

  const today = new Date().toISOString().split('T')[0];

  debt.installmentPlan.schedule = debt.installmentPlan.schedule.map(inst => {
    if (inst.status === 'paid') return inst; // Don't change paid status

    if (inst.dueDate < today) {
      return { ...inst, status: 'overdue' };
    }

    return inst;
  });

  return debt;
}

// Get next pending installment
export function getNextPendingInstallment(debt: Debt): Installment | null {
  if (!debt.installmentPlan) return null;

  return debt.installmentPlan.schedule.find(
    inst => inst.status === 'pending' || inst.status === 'overdue'
  ) || null;
}

// Record payment for installment
export function recordInstallmentPayment(
  debtId: string,
  installmentNumber: number,
  amount: number,
  method?: string
): Payment | null {
  const list = load();
  const index = list.findIndex(d => d.id === debtId);

  if (index === -1) return null;

  const debt = list[index];

  if (!debt.installmentPlan) {
    // Fallback to regular payment
    return recordPayment(debtId, amount, method);
  }

  const installment = debt.installmentPlan.schedule.find(i => i.number === installmentNumber);

  if (!installment) return null;

  // Validate amount
  if (amount <= 0 || amount > debt.amountRemaining) {
    return null;
  }

  // Create payment record
  const payment: Payment = {
    id: generatePaymentId(),
    amount,
    date: new Date().toISOString(),
    method,
    installmentNumber
  };

  // Update installment
  installment.status = 'paid';
  installment.paidDate = payment.date;
  installment.paidAmount = amount;
  installment.paymentId = payment.id;

  // Update debt
  debt.payments = [...debt.payments, payment];
  debt.amountPaid += amount;
  debt.amountRemaining = debt.totalAmount - debt.amountPaid;

  // Update next due date
  const nextInstallment = getNextPendingInstallment(debt);
  if (nextInstallment) {
    debt.dueDate = nextInstallment.dueDate;
  }

  // Update status
  if (debt.amountRemaining <= 0) {
    debt.status = 'paid';
    debt.amountRemaining = 0;
  } else if (debt.amountPaid > 0) {
    debt.status = 'partial';
  }

  save(list);
  return payment;
}

// Record installment payment with notification
export function recordInstallmentPaymentNotify(
  debtId: string,
  installmentNumber: number,
  amount: number,
  method?: string
): Payment | null {
  const payment = recordInstallmentPayment(debtId, installmentNumber, amount, method);
  if (payment) {
    notify();
  }
  return payment;
}
