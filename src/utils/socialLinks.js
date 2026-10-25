/**
 * Turn @page, instagram.com/page, and full links into an https URL.
 * A value that is not a handle or an http(s) link becomes ''.
 */
const KINDS = {
  instagram: { host: 'https://www.instagram.com/', at: false },
  facebook: { host: 'https://www.facebook.com/', at: false },
  tiktok: { host: 'https://www.tiktok.com/@', at: true },
  x: { host: 'https://x.com/', at: false },
};

const HANDLE = /^[A-Za-z0-9._]{1,50}$/;

export function normalizeSocialUrl(kind, value) {
  const spec = KINDS[kind];
  if (!spec) return '';
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/\s/.test(raw)) return '';
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return url.toString();
    } catch {
      return '';
    }
  }
  let handle = raw.replace(/^@/, '');
  handle = handle.replace(/^(www\.)?(instagram\.com|facebook\.com|fb\.com|m\.facebook\.com|tiktok\.com|twitter\.com|x\.com)\//i, '');
  handle = handle.replace(/^@/, '').split(/[/?#\s]/)[0];
  if (!HANDLE.test(handle)) return '';
  return `${spec.host}${handle}`;
}

export function socialUrlForSave(kind, value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const url = normalizeSocialUrl(kind, raw);
  if (!url) {
    throw new Error('Enter a handle like @page or a full https link.');
  }
  return url;
}
