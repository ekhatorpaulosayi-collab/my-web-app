export const formatNaira = (kobo: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })
    .format((kobo || 0) / 100);

export const parseNairaToKobo = (text: string) => {
  const n = Number(String(text).replace(/[^\d.]/g, ''));
  return Math.round((isNaN(n) ? 0 : n) * 100);
};

// YYYY-MM-DD without timezone surprises
export const todayISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const toISODate = (d: Date | string) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const displayDate = (iso: string) => {
  const [y, m, dd] = iso.split('-');
  return `${dd}/${m}/${y}`;
};

export const monthWindow = (date = new Date()) => {
  const y = date.getFullYear(); const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0, 23, 59, 59);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
  return { startISO: iso(start), endISO: iso(end) };
};
