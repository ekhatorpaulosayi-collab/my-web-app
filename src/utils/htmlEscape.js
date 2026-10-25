/** Escape text for an HTML attribute or text node. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Allow only http(s) image and page URLs in a meta tag. */
export function safeHttpUrl(value, fallback) {
  const raw = String(value ?? '').trim();
  if (/^https:\/\/[^\s"'<>]+$/i.test(raw) || /^http:\/\/[^\s"'<>]+$/i.test(raw)) {
    return raw;
  }
  return fallback;
}
