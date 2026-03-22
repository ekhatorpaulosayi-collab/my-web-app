// Debug version - Minimal component to isolate React error #306
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function ConversationsDebug() {
  const { currentUser } = useAuth();
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');

  useEffect(() => {
    const checkData = async () => {
      try {
        // Step 1: Check auth
        if (!currentUser || !currentUser.id) {
          setDebugInfo('No user logged in');
          return;
        }
        setDebugInfo(`User ID: ${currentUser.id}`);

        // Step 2: Check store
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();

        if (storeError) {
          setDebugInfo(`Store error: ${storeError.message}`);
          return;
        }

        if (!store) {
          setDebugInfo('No store found');
          return;
        }

        setDebugInfo(`Store ID: ${store.id}`);

        // Step 3: Try to fetch conversations
        const { data, error } = await supabase
          .from('store_conversations')
          .select('id')
          .eq('store_id', store.id)
          .limit(1);

        if (error) {
          setDebugInfo(`Conversations error: ${error.message} (Code: ${error.code})`);
          return;
        }

        setDebugInfo(`Found ${data?.length || 0} conversations`);

      } catch (err: any) {
        setDebugInfo(`Unexpected error: ${err?.message || 'Unknown error'}`);
      }
    };

    checkData();
  }, [currentUser]);

  // Extremely simple render - no complex operations
  return (
    <div style={{ padding: '20px', backgroundColor: 'white', minHeight: '400px' }}>
      <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Conversations Debug</h2>
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <pre style={{ margin: 0 }}>{debugInfo}</pre>
      </div>
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fffbeb', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px' }}>
          This is a debug component. If you see this without errors, the issue is in the original component's rendering logic.
        </p>
      </div>
    </div>
  );
}