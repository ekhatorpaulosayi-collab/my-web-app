import { supabase } from '../lib/supabase';
import { interpretProvisionResponse } from './provisionStatus.js';

export type ProvisionState =
  | { state: 'skipped_no_session' }
  | { state: 'pending'; httpStatus: number }
  | { state: 'active'; httpStatus: number }
  | { state: 'retryable_failure'; httpStatus: number };

/**
 * Ask the server to register a subdomain. The saved slug is not proof that
 * DNS or the certificate is ready. Callers should show pending or failed.
 */
export async function provisionSubdomain(args: {
  subdomain: string;
  storeId: string;
}): Promise<ProvisionState> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
      console.warn('[provisionSubdomain] no session — skipping (e.g. pending email confirmation)');
      return { state: 'skipped_no_session' };
    }

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-subdomain`;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subdomain: args.subdomain, store_id: args.storeId }),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => null);
      const result = interpretProvisionResponse(response.status, body);
      if (result.state !== 'active') {
        console.warn('[provisionSubdomain] registration is not active', result.state, result.httpStatus);
      }
      return result;
    } catch {
      return { state: 'retryable_failure', httpStatus: 0 };
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { state: 'retryable_failure', httpStatus: 0 };
  }
}
