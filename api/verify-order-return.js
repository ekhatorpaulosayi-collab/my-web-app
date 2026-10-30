/**
 * Confirms a Paystack reference before the return page says the payment
 * was received. The browser only learns the status, not the secret.
 */
export default async function handler(req, res) {
  const reference = String(req.query.reference || '').trim();
  if (!reference || reference.length > 100 || !/^[A-Za-z0-9_-]+$/.test(reference)) {
    return res.status(400).json({ status: 'missing' });
  }
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    return res.status(500).json({ status: 'unconfigured' });
  }
  try {
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${key}` } },
    );
    const body = await response.json().catch(() => null);
    const status = body?.data?.status;
    if (status === 'success') return res.status(200).json({ status: 'success' });
    if (status === 'failed' || status === 'abandoned' || status === 'reversed') {
      return res.status(200).json({ status });
    }
    return res.status(200).json({ status: 'pending' });
  } catch (error) {
    console.error('[verify-order-return]', error?.message || 'failed');
    return res.status(502).json({ status: 'unavailable' });
  }
}
