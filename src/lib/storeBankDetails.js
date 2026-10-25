/**
 * Owner settlement fields live on store_bank_details.
 * stores.bank_name, account_number, and account_name are cleared by
 * migration 20261025_21. Until that file is applied, a missing table
 * falls back to the stores columns.
 */

const BANK_KEYS = ['bank_name', 'account_number', 'account_name'];

export function splitBankDetails(updates) {
  const bank = {};
  const rest = { ...updates };
  for (const key of BANK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(rest, key)) {
      bank[key] = rest[key];
      delete rest[key];
    }
  }
  return { bank, rest };
}

function missingTable(error) {
  const message = `${error?.message || ''} ${error?.details || ''} ${error?.code || ''}`;
  return /store_bank_details|schema cache|does not exist|PGRST205|42P01/i.test(message);
}

export async function readStoreBankDetails(client, storeId) {
  if (!storeId) return null;
  const { data, error } = await client
    .from('store_bank_details')
    .select('bank_name, account_number, account_name')
    .eq('store_id', storeId)
    .maybeSingle();
  if (error) {
    if (!missingTable(error)) {
      console.warn('[store_bank_details] read failed', error.message);
    }
    return null;
  }
  return data;
}

export function mergeBankDetails(store, bank) {
  if (!store || !bank) return store;
  if (!bank.bank_name && !bank.account_number && !bank.account_name) return store;
  return {
    ...store,
    bank_name: bank.bank_name,
    account_number: bank.account_number,
    account_name: bank.account_name,
  };
}

const BANK_TRANSFER_TYPES = new Set(['bank', 'bank-transfer', 'bank_transfer']);

/**
 * Replace the customer-facing Bank Transfer method with the account the
 * owner just saved. Checkout reads payment_methods, not store_bank_details.
 */
export function withBankTransferMethod(paymentMethods, storeId, bank) {
  const list = Array.isArray(paymentMethods) ? paymentMethods.map((method) => ({ ...method })) : [];
  const next = {
    type: 'bank',
    enabled: Boolean(String(bank?.account_number || '').trim() || String(bank?.bank_name || '').trim()),
    label: 'Bank Transfer',
    bank_name: String(bank?.bank_name || '').trim(),
    account_number: String(bank?.account_number || '').trim(),
    account_name: String(bank?.account_name || '').trim(),
  };
  const index = list.findIndex((method) => BANK_TRANSFER_TYPES.has(String(method?.type || '').toLowerCase()));
  if (index >= 0) {
    list[index] = {
      ...list[index],
      ...next,
      id: list[index].id || `transfer-${storeId}`,
    };
    return list;
  }
  if (!next.bank_name && !next.account_number && !next.account_name) return list;
  list.push({ id: `transfer-${storeId}`, ...next });
  return list;
}

async function syncBankTransferMethod(client, storeId, bank) {
  const { data, error } = await client
    .from('stores')
    .select('payment_methods')
    .eq('id', storeId)
    .maybeSingle();
  if (error) return { error };
  const payment_methods = withBankTransferMethod(data?.payment_methods, storeId, bank);
  const { error: updateError } = await client
    .from('stores')
    .update({ payment_methods })
    .eq('id', storeId);
  return { error: updateError || null };
}

export async function writeStoreBankDetails(client, storeId, bank) {
  if (!storeId || !bank || Object.keys(bank).length === 0) {
    return { error: null, stored: false };
  }
  const row = { store_id: storeId, updated_at: new Date().toISOString() };
  for (const key of BANK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(bank, key)) row[key] = bank[key];
  }
  const { error } = await client
    .from('store_bank_details')
    .upsert(row, { onConflict: 'store_id' });
  if (error && missingTable(error)) {
    const synced = await syncBankTransferMethod(client, storeId, bank);
    if (synced.error) return { error: synced.error, stored: false };
    return { error, stored: false, missing: true };
  }
  if (error) return { error, stored: false };
  const synced = await syncBankTransferMethod(client, storeId, bank);
  if (synced.error) return { error: synced.error, stored: true };
  return { error: null, stored: true };
}
