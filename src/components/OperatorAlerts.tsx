import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

/** Unread payment and inventory alerts for whoever is in operator_reviewers. */
export function OperatorAlerts() {
  const [messages, setMessages] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (stop || !userId) return;
      const { data: reviewer } = await supabase
        .from('operator_reviewers')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (stop || !reviewer) return;
      const { data: rows } = await supabase
        .from('operator_alerts')
        .select('id, message')
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (stop || !rows?.length) return;
      setMessages(rows);
      await supabase
        .from('operator_alerts')
        .update({ seen_at: new Date().toISOString() })
        .in('id', rows.map((row) => row.id));
    })();
    return () => {
      stop = true;
    };
  }, []);

  if (!messages.length) return null;
  return (
    <div role="status">
      {messages.map((row) => (
        <p key={row.id}>{row.message}</p>
      ))}
    </div>
  );
}
