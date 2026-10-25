const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function dayLabel(key) {
  const name = String(key || '').trim();
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function formatSlot(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const open = value.open || value.from || value.start;
    const close = value.close || value.to || value.end;
    if (open && close) return `${open}–${close}`;
    if (value.closed === true || value.is_closed === true) return 'Closed';
  }
  return '';
}

/**
 * Turn a business-hours value into lines a customer can read.
 * Objects and JSON strings are formatted. Plain text is returned as-is.
 */
export function formatBusinessHours(value) {
  if (value == null || value === '') return '';
  let parsed = value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  if (Array.isArray(parsed)) {
    return parsed.map((row) => {
      if (typeof row === 'string') return row;
      if (row && typeof row === 'object') {
        const label = dayLabel(row.day || row.name);
        const slot = formatSlot(row);
        return [label, slot].filter(Boolean).join(': ');
      }
      return '';
    }).filter(Boolean).join('\n');
  }
  if (typeof parsed === 'object') {
    const keys = Object.keys(parsed);
    const ordered = [
      ...DAY_ORDER.filter((day) => keys.some((key) => key.toLowerCase() === day)),
      ...keys.filter((key) => !DAY_ORDER.includes(key.toLowerCase())),
    ];
    return ordered.map((key) => {
      const match = keys.find((candidate) => candidate.toLowerCase() === key.toLowerCase()) || key;
      const slot = formatSlot(parsed[match]);
      return slot ? `${dayLabel(match)}: ${slot}` : dayLabel(match);
    }).filter(Boolean).join('\n');
  }
  return String(parsed);
}
