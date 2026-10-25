/**
 * The URL Twilio signed. WHATSAPP_WEBHOOK_PUBLIC_URL is that exact URL.
 * An empty or invalid value means the request cannot be checked.
 */
export function twilioPublicUrl(configured: string): string | null {
  const value = (configured || '').trim();
  if (!value) return null;
  try {
    const base = new URL(value);
    if (base.protocol !== 'https:' && base.protocol !== 'http:') return null;
  } catch {
    return null;
  }
  return value;
}
