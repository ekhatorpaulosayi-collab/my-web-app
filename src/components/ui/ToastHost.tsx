import { useEffect, useState } from 'react';
import {
  dismissToast,
  settleConfirm,
  subscribeConfirm,
  subscribeToasts,
  type ToastItem,
} from './toastStore';

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
} | null;

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  useEffect(() => { subscribeToasts(setItems); }, []);
  useEffect(() => {
    subscribeConfirm((req) => {
      setConfirm(req ? {
        title: req.title,
        message: req.message,
        confirmLabel: req.confirmLabel,
        danger: req.danger,
      } : null);
    });
  }, []);

  return (
    <>
      <div className="ds-toasts" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`ds-toast${item.tone === 'danger' ? ' ds-toast-danger' : ''}`} role="status">
            <span>{item.message}</span>
            {item.undo && (
              <button type="button" onClick={() => { item.undo?.(); dismissToast(item.id); }}>
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
      {confirm && (
        <div className="ds-overlay" role="presentation" onClick={() => settleConfirm(false)}>
          <div
            className="ds-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ds-confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ds-modal-body">
              <h2 id="ds-confirm-title" style={{ margin: '8px 0', fontSize: 20 }}>{confirm.title}</h2>
              <p style={{ margin: '0 0 8px', color: '#475569' }}>{confirm.message}</p>
            </div>
            <div className="ds-sheet-footer">
              <button type="button" className="ds-btn ds-btn-secondary ds-btn-md ds-btn-block" onClick={() => settleConfirm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={`ds-btn ds-btn-md ds-btn-block ${confirm.danger ? 'ds-btn-danger' : 'ds-btn-primary'}`}
                onClick={() => settleConfirm(true)}
              >
                {confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
