import { useState, useEffect } from 'react';

export function useDirty(initialValue = false) {
  const [dirty, setDirty] = useState(initialValue);

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
      console.debug('[Settings] beforeunload: unsaved changes');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [dirty]);

  return {
    dirty,
    setDirty,
    markDirty: () => setDirty(true),
    markClean: () => setDirty(false)
  };
}
