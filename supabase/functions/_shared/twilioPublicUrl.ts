/**
 * The URL Twilio signed. The edge runtime's req.url is the internal address,
 * so the signature is checked against the public function URL instead.
 * WHATSAPP_WEBHOOK_PUBLIC_URL wins. Otherwise the forwarded host, scheme,
 * and path are used. No forwarded host and no env var means there is no URL.
 */
export function twilioPublicUrl(input: {
  configured: string;
  forwardedHost: string;
  forwardedProto: string;
  forwardedUri: string;
  path: string;
  search: string;
}): string | null {
  const search = input.search || '';
  const configured = (input.configured || '').trim();
  if (configured) {
    try {
      const base = new URL(configured);
      if (!base.search && search) base.search = search;
      return base.toString();
    } catch {
      return null;
    }
  }
  const host = (input.forwardedHost || '').split(',')[0].trim();
  if (!host) return null;
  const proto = (input.forwardedProto || '').split(',')[0].trim() || 'https';
  const forwardedUri = (input.forwardedUri || '').trim();
  if (forwardedUri) {
    const pathAndQuery = forwardedUri.startsWith('/') ? forwardedUri : `/${forwardedUri}`;
    return `${proto}://${host}${pathAndQuery}`;
  }
  const path = (input.path || '').startsWith('/') ? input.path : `/${input.path || ''}`;
  return `${proto}://${host}${path}${search}`;
}
