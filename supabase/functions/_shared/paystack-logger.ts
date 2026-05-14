// paystack-logger
//
// Writes one row to paystack_logs per Paystack interaction. Two rows
// per call: outbound (before fetch) and response (after fetch). Linked
// by correlation_id (generated per edge-function invocation).
//
// Sync (awaited). Total added latency is typically <15ms because the
// insert hits Supabase's own infra. If the insert fails for any
// reason, we fall back to console.error so the primary flow never
// blocks on logging.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface LogPaystackInteractionParams {
  correlation_id: string;
  function_name: string;
  direction: 'outbound' | 'response';
  paystack_endpoint: string;
  http_method?: string;
  http_status?: number;
  paystack_reference?: string;
  store_id?: string;
  user_id?: string;
  order_id?: string;
  error_tag?: string;
  error_message?: string;
  request_body?: unknown;
  response_body?: unknown;
  duration_ms?: number;
}

// Redact Paystack secret/public keys and Bearer tokens by KEY name —
// not by value pattern — to avoid false positives on legitimate data
// that happens to start with sk_/pk_/Bearer.
//
// We do NOT redact account_number, customer_email, BVN/NIN: those
// already exist in other tables (bank_accounts, orders, vendor_kyc)
// behind the same service-role RLS as paystack_logs. Redacting here
// destroys debugging utility without improving security.
function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(redact);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lowered = k.toLowerCase();
    if (
      lowered === 'authorization' ||
      lowered === 'paystack_secret_key' ||
      lowered === 'secret_key' ||
      lowered === 'api_key'
    ) {
      out[k] = '[REDACTED]';
      continue;
    }
    if (typeof v === 'string') {
      // Match key-level patterns for sk_test_ / sk_live_ / pk_test_ /
      // pk_live_ / Bearer tokens — but only when the KEY suggests
      // this is a credential field.
      if (/(^|_)(secret|api|access|bearer|token)(_|$)/i.test(k)) {
        out[k] = '[REDACTED]';
        continue;
      }
    }
    out[k] = redact(v);
  }
  return out;
}

export async function logPaystackInteraction(
  supabase: SupabaseClient,
  params: LogPaystackInteractionParams,
): Promise<void> {
  try {
    const row = {
      correlation_id:     params.correlation_id,
      function_name:      params.function_name,
      direction:          params.direction,
      paystack_endpoint:  params.paystack_endpoint,
      http_method:        params.http_method ?? 'POST',
      http_status:        params.http_status ?? null,
      paystack_reference: params.paystack_reference ?? null,
      store_id:           params.store_id ?? null,
      user_id:            params.user_id ?? null,
      order_id:           params.order_id ?? null,
      error_tag:          params.error_tag ?? null,
      error_message:      params.error_message ?? null,
      request_body:       params.request_body === undefined ? null : redact(params.request_body),
      response_body:      params.response_body === undefined ? null : redact(params.response_body),
      duration_ms:        params.duration_ms ?? null,
    };
    const { error } = await supabase.from('paystack_logs').insert(row);
    if (error) {
      console.error('paystack_logs_insert_failed', {
        correlation_id: params.correlation_id,
        function_name: params.function_name,
        direction: params.direction,
        error: error.message,
      });
    }
  } catch (e) {
    console.error('paystack_logs_unexpected', {
      correlation_id: params.correlation_id,
      function_name: params.function_name,
      direction: params.direction,
      error: (e as any)?.message,
    });
  }
}
