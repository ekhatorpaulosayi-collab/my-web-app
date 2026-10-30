/**
 * Turn PostgREST / network failures into sentences a merchant can act on.
 * Raw database text never goes on screen.
 */
export function userFacingError(error: unknown): string {
  const err = error as { message?: string; code?: string; status?: number } | null;
  const message = (err?.message || '').toLowerCase();
  const code = String(err?.code || '');

  if (code === 'PGRST116' || message.includes('cannot coerce the result') || message.includes('0 rows')) {
    return 'We could not find that record. It may have been removed.';
  }
  if (code === '406' || err?.status === 406 || message.includes('not acceptable')) {
    return 'We could not load that record. Refresh and try again.';
  }
  if (
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('offline') ||
    message.includes('load failed')
  ) {
    return 'You appear to be offline. Check your connection and try again.';
  }
  if (code === '42501' || message.includes('permission denied') || message.includes('row-level security')) {
    return 'You do not have permission to do that. Ask the owner if you are staff.';
  }
  if (code === '23505' || message.includes('duplicate')) {
    return 'That is already saved. Nothing new was added.';
  }
  if (message.includes('jwt') || message.includes('not authenticated')) {
    return 'Your session expired. Sign in again.';
  }
  return 'Something went wrong. Try again, or contact support if it keeps happening.';
}
