import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Reads the owner switch. Missing column or a failed read stays off. */
export function useAllowStaffPriceChange(userId: string | undefined, enabled: boolean): boolean {
  const [allow, setAllow] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) {
      setAllow(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('stores')
      .select('allow_staff_price_change')
      .eq('user_id', String(userId))
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setAllow(false);
          return;
        }
        setAllow(data?.allow_staff_price_change === true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  return allow;
}
