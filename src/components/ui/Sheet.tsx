import { useEffect, useRef, type ReactNode, type RefObject } from 'react';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

function useModalFlag(open: boolean) {
  useEffect(() => {
    if (!open) return;
    document.body.setAttribute('data-modal-open', 'true');
    return () => document.body.removeAttribute('data-modal-open');
  }, [open]);
}

function useFocusTrap(open: boolean, ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open || !ref.current) return;
    const root = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(root.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.hasAttribute('disabled'));
    focusable()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      root.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, ref]);
}

export function Modal({ open, title, onClose, children, footer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFlag(open);
  useFocusTrap(open, ref);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="ds-overlay" onClick={onClose}>
      <div
        ref={ref}
        className="ds-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ds-handle" aria-hidden="true" />
        <div className="ds-modal-body">
          <h2 style={{ margin: '0 0 12px', fontSize: 20 }}>{title}</h2>
          {children}
        </div>
        {footer && <div className="ds-sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Sheet(props: Props) {
  return <Modal {...props} />;
}
