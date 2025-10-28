export function openWhatsApp(phone?: string, msg?: string) {
  if (!phone) return;
  const digits = phone.replace(/[^\d]/g, '');
  const url = `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
