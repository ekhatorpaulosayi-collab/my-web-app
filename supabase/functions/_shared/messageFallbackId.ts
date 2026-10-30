/** Same text inside one bucket is one delivery. The next bucket is a new message. */
export const HASH_BUCKET_MS = 2 * 60 * 1000;

export function hashTimeBucket(now: number) {
  return Math.floor(now / HASH_BUCKET_MS);
}

/** Key for a webhook delivery that arrived without a provider message id. */
export async function messageFallbackId(parts: string[], now = Date.now()): Promise<string> {
  const raw = [...parts.map((part) => String(part ?? '')), String(hashTimeBucket(now))].join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `hash.${hex}`;
}
