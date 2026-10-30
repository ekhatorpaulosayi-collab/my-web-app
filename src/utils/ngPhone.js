/**
 * Nigerian WhatsApp numbers, including the trunk-zero form "+234 0803…".
 * Returns E.164 or null. "pending", emails, and short input are null.
 */
export function normalizeNgWhatsApp(input) {
  const raw = String(input || '').trim();
  if (!raw || raw.toLowerCase() === 'pending' || raw.includes('@')) return null;
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('2340') && digits.length === 14) {
    digits = `234${digits.slice(4)}`;
  }
  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+234${digits}`;
  }
  return null;
}

export function isValidStoreWhatsApp(input) {
  const normalized = normalizeNgWhatsApp(input);
  return !!normalized && /^\+234[1-9]\d{9}$/.test(normalized);
}

export function whatsappDigits(input) {
  const normalized = normalizeNgWhatsApp(input);
  return normalized ? normalized.slice(1) : '';
}
