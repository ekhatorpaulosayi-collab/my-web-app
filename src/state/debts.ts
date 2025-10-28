// src/state/debts.ts
export type DebtStatus = "open" | "paid";

export interface Debt {
  id: string;               // nanoid or Date.now().toString()
  customerName: string;
  phone?: string;
  amount: number;
  dueDate: string;          // "yyyy-mm-dd"
  createdAt: string;        // ISO
  status: DebtStatus;       // default "open"
}

let cache: Debt[] | null = null;
const KEY = "storehouse:debts";

function load(): Debt[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || "[]");
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
  return d.status === "open" && new Date(d.dueDate) < new Date(today.toDateString());
}

export function countsByStatus() {
  const list = getDebts();
  const paid = list.filter(d => d.status === "paid").length;
  const overdue = list.filter(d => isOverdue(d)).length;
  return { all: list.length, overdue, paid };
}

export function totalOpenDebt(): number {
  return getDebts().filter(d => d.status === "open").reduce((s,d)=>s+d.amount,0);
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
