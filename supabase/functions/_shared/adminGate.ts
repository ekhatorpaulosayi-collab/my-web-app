/** One-off admin functions refuse every call unless this header matches a long server secret. */

export function adminCallAllowed(expected: string | undefined, presented: string | null): boolean {
  const secret = expected || '';
  const header = presented || '';
  if (secret.length < 16 || header.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i += 1) {
    diff |= secret.charCodeAt(i) ^ header.charCodeAt(i);
  }
  return diff === 0;
}
