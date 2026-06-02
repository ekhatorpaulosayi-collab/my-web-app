import { useState } from 'react';
import PaystackPop from '@paystack/inline-js';
import { supabase } from '../lib/supabase';

const STORE_ID = 'd93cd891-7e0a-47a8-9963-5e2a00a2591f';
const PRODUCT_ID = '926335ce-ce9a-47e8-86c5-91d236842205';

export default function V2SpikeTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState('');

  const runTest = async () => {
    setIsLoading(true);
    setLastResult('Calling F3...');

    const initResult = await supabase.functions.invoke('initiate-storefront-payment', {
      body: {
        store_id: STORE_ID,
        customer_email: 'spike-test@example.com',
        customer_phone: '07000000000',
        customer_name: 'Spike Test',
        items: [{
          product_id: PRODUCT_ID,
          product_name: 'Spike Test Item',
          quantity: 1,
          unit_price_kobo: 100000,
        }],
      },
    });

    if (initResult.error) {
      setLastResult('F3 ERROR: ' + JSON.stringify(initResult.error));
      setIsLoading(false);
      return;
    }

    const f3Data = initResult.data as {
      access_code?: string;
      reference?: string;
      authorization_url?: string;
    };

    if (!f3Data?.access_code || !f3Data?.reference) {
      setLastResult('F3 returned malformed payload: ' + JSON.stringify(f3Data));
      setIsLoading(false);
      return;
    }

    setLastResult('F3 OK. F3 ref: ' + f3Data.reference + ' | Opening Paystack popup...');

    const popup = new PaystackPop();
    popup.newTransaction({
      accessCode: f3Data.access_code,
      onSuccess: (transaction: { reference: string }) => {
        const match = transaction.reference === f3Data.reference;
        setLastResult(
          'SUCCESS — Paystack ref: ' + transaction.reference +
          ' | F3 ref: ' + f3Data.reference +
          ' | Match: ' + (match ? 'YES (single tx)' : 'NO (two txs created)')
        );
        setIsLoading(false);
      },
      onCancel: () => {
        setLastResult('CANCELLED by user');
        setIsLoading(false);
      },
      onError: (error: unknown) => {
        const message = (error as { message?: string })?.message || JSON.stringify(error);
        setLastResult('ERROR: ' + message);
        setIsLoading(false);
      },
      onLoad: () => {
        console.log('[V2 Spike] Popup loaded with accessCode');
      },
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>v2 SDK Spike</h1>
      <p>
        Tests whether @paystack/inline-js v2's newTransaction with accessCode
        binds to F3's pre-initialized transaction (vs creating a fresh one).
      </p>
      <button disabled={isLoading} onClick={runTest}>
        {isLoading ? 'Running...' : 'Test v2 SDK Subaccount Flow'}
      </button>
      <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap' }}>{lastResult}</pre>
    </div>
  );
}
