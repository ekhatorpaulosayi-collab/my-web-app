/**
 * Drop email and IP before an event is sent to Sentry.
 * User id may stay. Email must not.
 */
export function scrubSentryEvent<T extends {
  user?: { email?: string; ip_address?: string; id?: string } | null;
  extra?: Record<string, unknown> | null;
  contexts?: Record<string, unknown> | null;
  request?: { cookies?: unknown; headers?: Record<string, unknown> } | null;
}>(event: T): T {
  if (!event) return event;
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  const dropEmailKeys = (value: unknown, depth: number) => {
    if (!value || typeof value !== 'object' || depth > 4) return;
    if (Array.isArray(value)) {
      value.forEach((item) => dropEmailKeys(item, depth + 1));
      return;
    }
    const record = value as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (/email/i.test(key) || key === 'ip_address') delete record[key];
      else dropEmailKeys(record[key], depth + 1);
    }
  };
  dropEmailKeys(event.extra, 0);
  dropEmailKeys(event.contexts, 0);
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers['Authorization'];
      delete event.request.headers['authorization'];
      delete event.request.headers['Cookie'];
      delete event.request.headers['cookie'];
    }
  }
  return event;
}
