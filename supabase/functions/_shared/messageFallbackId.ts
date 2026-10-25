/** Stable key for a webhook delivery that arrived without a provider message id. */
export async function messageFallbackId(parts: string[]): Promise<string> {
  const raw = parts.map((part) => String(part ?? '')).join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `hash.${hex}`;
}
