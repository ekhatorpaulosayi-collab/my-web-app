import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <main className="ds-legal">
      <h1>Terms of use</h1>
      <p>Last updated 25 October 2026. These terms cover the Storehouse app at storehouse.ng, run for merchants in Nigeria.</p>
      <h2>The service</h2>
      <p>Storehouse helps you record sales, stock, invoices, and (when you turn it on) card payments through Paystack. You keep ownership of your business data. We host it so the app can run.</p>
      <h2>Your account</h2>
      <p>You must give a real email and keep your password private. You are responsible for staff you add, including what they record. Cashiers and managers cannot edit or delete products.</p>
      <h2>Payments</h2>
      <p>Card payments are processed by Paystack. Storehouse’s fee follows the plan you are on (Free, Starter, or Pro) and is capped at ₦10,000 per transaction. Subscription fees are charged to the card you use at checkout. Bank-transfer payments against a plan do not start a subscription.</p>
      <h2>Acceptable use</h2>
      <p>Do not use Storehouse for fraud, to sell illegal goods, or to store card numbers yourself. We may suspend an account that puts other merchants or customers at risk.</p>
      <h2>Liability</h2>
      <p>The app is provided as available. We are not liable for lost profits from downtime, a wrong price you entered, or a Paystack outage. Nothing here limits liability that Nigerian law does not allow us to limit.</p>
      <h2>Contact</h2>
      <p>Questions: <a href="mailto:storehouseapp@outlook.com">storehouseapp@outlook.com</a>. See also the <Link to="/privacy">privacy policy</Link>.</p>
    </main>
  );
}
