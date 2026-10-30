import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <main className="ds-legal">
      <h1>Privacy policy</h1>
      <p>Last updated 25 October 2026. Storehouse stores business records for Nigerian merchants.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone, business name, and business type.</li>
        <li>Shop data you enter: products, sales, customers, invoices, and staff names.</li>
        <li>Payment metadata from Paystack (reference, status, amount). We do not store full card numbers.</li>
        <li>Technical logs: device, IP address, and error reports, used to keep the service up.</li>
      </ul>
      <h2>Why</h2>
      <p>We use this data to run your store, show your dashboard, send receipts you ask for, take subscription payments, and prevent abuse. We do not sell your customer list.</p>
      <h2>Who else sees it</h2>
      <p>Supabase hosts the database. Vercel hosts the website. Paystack processes card payments. Sentry receives crash reports. Each only gets what it needs to do that job.</p>
      <h2>How long</h2>
      <p>We keep shop records while your account is open. You can export them from the app. If you ask us to delete the account, we delete or anonymise personal data unless a payment record must be kept for accounting.</p>
      <h2>Your choices</h2>
      <p>You can update your profile in Settings and ask for a copy or deletion at <a href="mailto:storehouseapp@outlook.com">storehouseapp@outlook.com</a>.</p>
      <p><Link to="/terms">Terms of use</Link></p>
    </main>
  );
}
