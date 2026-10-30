import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const REVIEWER_USER_ID = 'dffba89b-869d-422a-a542-2e2494850b44';

/** Visible list of inventory and payment alerts for the reviewer account. */
export function OperatorAlerts() {
  const [messages, setMessages] = useState<{ id: number; message: string }[]>([]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (stop || data.user?.id !== REVIEWER_USER_ID) return;
      const { data: rows } = await supabase
        .from('operator_alerts')
        .select('id, message')
        .is('seen_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!stop && rows) setMessages(rows);
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
