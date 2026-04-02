import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const QuotaAlert = ({ userId }) => {
  const [quota, setQuota] = useState(null);

  useEffect(() => {
    const checkQuota = async () => {
      const { data } = await supabase.rpc('check_ai_chat_quota', { p_user_id: userId });
      setQuota(data);
    };
    checkQuota();
  }, [userId]);

  if (!quota) return null;

  const percentUsed = (quota.used / quota.limit) * 100;
  const remaining = quota.limit - quota.used;

  if (percentUsed < 70) return null;

  if (percentUsed < 90) {
    return (
      <div style={{ background: '#FEF3C7', borderRadius: '8px', padding: '12px 16px', margin: '8px 0' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#92400E', margin: 0 }}>
          ⚡ {quota.used} of {quota.limit} AI chats used this month
        </p>
        <p style={{ fontSize: '11px', color: '#B45309', margin: '2px 0 0' }}>
          {remaining} remaining — customers will be redirected to WhatsApp after
        </p>
      </div>
    );
  }

  if (percentUsed < 100) {
    return (
      <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '12px 16px', margin: '8px 0' }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#991B1B', margin: 0 }}>
          🔴 Only {remaining} AI chat{remaining !== 1 ? 's' : ''} left this month!
        </p>
        <p style={{ fontSize: '11px', color: '#B91C1C', margin: '2px 0 0' }}>
          New customers will be redirected to WhatsApp when limit is reached
        </p>
        <button onClick={() => { window.location.href = '/subscription'; }} style={{
          background: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
          padding: '8px 16px', fontSize: '12px', fontWeight: 500, marginTop: '8px', cursor: 'pointer'
        }}>
          Upgrade for more AI chats →
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '12px 16px', margin: '8px 0' }}>
      <p style={{ fontSize: '13px', fontWeight: 500, color: '#991B1B', margin: 0 }}>
        🚫 AI chat limit reached for this month
      </p>
      <p style={{ fontSize: '11px', color: '#B91C1C', margin: '2px 0 0' }}>
        Customers are being redirected to WhatsApp. Your AI assistant resets next month.
      </p>
      <button onClick={() => { window.location.href = '/subscription'; }} style={{
        background: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
        padding: '8px 16px', fontSize: '12px', fontWeight: 500, marginTop: '8px', cursor: 'pointer'
      }}>
        Upgrade now to reactivate AI →
      </button>
    </div>
  );
};

export default QuotaAlert;