import { useEffect, useRef } from 'react';

interface UseBarcodeOptions {
  onScan: (barcode: string) => void;
  maxDelay?: number;
  minLength?: number;
}

export const useBarcode = ({ onScan, maxDelay = 50, minLength = 3 }: UseBarcodeOptions) => {
  const buffer = useRef<string[]>([]);
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const now = Date.now();
      const timeSinceLastKey = now - lastKeyTime.current;

      // If too much time passed, reset buffer
      if (timeSinceLastKey > maxDelay) {
        buffer.current = [];
      }

      lastKeyTime.current = now;

      // Scanner typically ends with Enter
      if (e.key === 'Enter') {
        const code = buffer.current.join('');
        if (code.length >= minLength) {
          e.preventDefault();
          onScan(code);
          playBeep();
        }
        buffer.current = [];
        return;
      }

      // Add character to buffer if printable
      if (e.key.length === 1) {
        buffer.current.push(e.key);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [onScan, maxDelay, minLength]);
};

const playBeep = () => {
  const audio = new Audio('/beep.mp3');
  audio.play().catch(() => {
    /* Beep file not found, silent fail */
  });
};
