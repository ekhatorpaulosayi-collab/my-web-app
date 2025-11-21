// src/lib/store.ts
import { safeParse, saveJson } from '../utils/safeJson';

export type PaymentMethod = "cash" | "transfer" | "card" | "credit" | "credit-paid";
export type SaleRow = {
  id: string;
  date: string;           // ISO
  itemId?: string;
  itemName?: string;
  qty: number;
  unitPrice: number;      // naira (selling price)
  amount: number;         // naira (total sale amount)
  payment: PaymentMethod;
  customerName?: string;
  phone?: string;
  note?: string;
  relatedDebtId?: string; // if this row came from a credit being paid later
  cogsKobo?: number;      // Cost of Goods Sold in kobo (cost price × quantity)
};

export type Debt = {
  id: string;
  saleId: string;         // the original sale on credit
  customerName: string;
  phone?: string;
  dueDate: string;        // ISO
  amount: number;         // outstanding amount (single item total for now)
  createdAt: string;      // ISO
  paidAt?: string;        // ISO when marked paid
};

export function loadSales(): SaleRow[] {
  return safeParse<SaleRow[]>(localStorage.getItem("sales"), []);
}
export function saveSales(rows: SaleRow[]) {
  saveJson("sales", rows);
}

export function loadDebts(): Debt[] {
  return safeParse<Debt[]>(localStorage.getItem("debts"), []);
}
export function saveDebts(rows: Debt[]) {
  saveJson("debts", rows);
}

export function formatNGN(n: number) {
  const s = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
  return s.replace(".00",""); // keep integers
}
export const uid = () => Math.random().toString(36).slice(2, 10);
