const MESSAGE_LIMIT = 200;

function textField(value: unknown, limit: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, limit);
}

/** Message and code only. A raw object prints as [object Object] in the edge log. */
export function errorLogFields(error: unknown): { message: string; code: string } {
  if (typeof error === 'string') {
    return { message: textField(error, MESSAGE_LIMIT) || 'Error', code: 'error' };
  }
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown };
    const codeText = textField(record.code, 80);
    const code = codeText
      || (typeof record.code === 'number' && Number.isFinite(record.code) ? String(record.code) : 'error');
    return { message: textField(record.message, MESSAGE_LIMIT) || 'Error', code };
  }
  return { message: 'Error', code: 'error' };
}
