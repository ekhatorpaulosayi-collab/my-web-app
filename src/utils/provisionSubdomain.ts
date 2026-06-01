import { supabase } from '../lib/supabase';

/**
 * Fire-and-forget call to the provision-subdomain edge function.
 *
 * Never throws and never returns a useful value to the caller — store
 * creation and settings saves must succeed even if Vercel provisioning
 * fails. On failure, the merchant can retry by re-saving the slug, or
 * ops can re-run scripts/provision-existing-subdomains.sh.
 *
 * Skipped silently when there is no active session (e.g. signup with
 * email confirmation pending — the merchant has no JWT yet). In that
 * case, the next StoreSettings save will fire the provision call once
 * the session exists.
 */
export async function provisionSubdomain(args: {
  subdomain: string;
  storeId: string;
}): Promise<void> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.warn('[provisionSubdomain] no session — skipping (e.g. pending email confirmation)');
      return;
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-subdomain`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    void fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subdomain: args.subdomain, store_id: args.storeId }),
    }).catch((err) => {
      console.warn('[provisionSubdomain] enqueue failed (non-fatal):', err);
    });
  } catch (err) {
    console.warn('[provisionSubdomain] unexpected error (non-fatal):', err);
  }
}
