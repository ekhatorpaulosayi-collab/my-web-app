export type ToastTone = 'info' | 'success' | 'danger';

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
  undo?: () => void;
};

type ConfirmRequest = {
  id: number;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

const toastListeners = new Set<(items: ToastItem[]) => void>();
const confirmListeners = new Set<(req: ConfirmRequest | null) => void>();
let toasts: ToastItem[] = [];
let confirmReq: ConfirmRequest | null = null;
let nextId = 1;

function emitToasts() {
  toastListeners.forEach((fn) => fn(toasts));
}

function emitConfirm() {
  confirmListeners.forEach((fn) => fn(confirmReq));
}

export function pushToast(message: string, tone: ToastTone = 'info', undo?: () => void) {
  const id = nextId++;
  const item: ToastItem = { id, message, tone, undo };
  toasts = [...toasts, item].slice(-4);
  emitToasts();
  window.setTimeout(() => dismissToast(id), 4000);
  return id;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emitToasts();
}

export function subscribeToasts(fn: (items: ToastItem[]) => void) {
  toastListeners.add(fn);
  fn(toasts);
  return () => {
    toastListeners.delete(fn);
  };
}

export function askConfirm(options: {
  message: string;
  title?: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    if (confirmReq) confirmReq.resolve(false);
    confirmReq = {
      id: nextId++,
      title: options.title || 'Please confirm',
      message: options.message,
      confirmLabel: options.confirmLabel || 'Confirm',
      danger: options.danger !== false,
      resolve,
    };
    document.body.setAttribute('data-modal-open', 'true');
    emitConfirm();
  });
}

export function settleConfirm(ok: boolean) {
  if (!confirmReq) return;
  const pending = confirmReq;
  confirmReq = null;
  document.body.removeAttribute('data-modal-open');
  emitConfirm();
  pending.resolve(ok);
}

export function subscribeConfirm(fn: (req: ConfirmRequest | null) => void) {
  confirmListeners.add(fn);
  fn(confirmReq);
  return () => {
    confirmListeners.delete(fn);
  };
}

/** Route window.alert through toasts. confirm() stays native so existing if (confirm()) checks stay safe. */
export function installDialogs() {
  if (typeof window === 'undefined') return;
  if ((window as Window & { __storehouseDialogs?: boolean }).__storehouseDialogs) return;
  (window as Window & { __storehouseDialogs?: boolean }).__storehouseDialogs = true;
  window.alert = (message?: unknown) => {
    const text = message == null ? '' : String(message);
    const tone: ToastTone = /fail|error|❌|could not|invalid/i.test(text) ? 'danger' : 'info';
    pushToast(text.replace(/^[❌⚠️✅]\s*/, ''), tone);
  };
}
