import { useEffect } from 'react';

interface HotkeyHandlers {
  onFocusSearch?: () => void;
  onAddItem?: () => void;
  onCompleteSale?: () => void;
  onIncrementLast?: () => void;
}

export const useHotkeys = (handlers: HotkeyHandlers, enabled = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // / focuses search
      if (e.key === '/' && !isInputFocused()) {
        e.preventDefault();
        handlers.onFocusSearch?.();
        return;
      }

      // Enter adds item (if not in input)
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey && !isInputFocused()) {
        e.preventDefault();
        handlers.onAddItem?.();
        return;
      }

      // Cmd/Ctrl+Enter completes sale
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handlers.onCompleteSale?.();
        return;
      }

      // + increments last item
      if (e.key === '+' && !isInputFocused()) {
        e.preventDefault();
        handlers.onIncrementLast?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, enabled]);
};

const isInputFocused = () => {
  const active = document.activeElement;
  return active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA';
};
