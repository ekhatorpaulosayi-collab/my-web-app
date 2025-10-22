import { useState } from 'react';
import './Landing.css';

function Landing({ onNavigateToApp }) {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleGetStarted = (isPro = false) => {
    localStorage.setItem('hasVisited', 'true');
    if (isPro) {
      localStorage.setItem('smartstock-plan', 'PRO');
      localStorage.setItem('trialStart', Date.now().toString());
    }
    // Use callback to navigate without page reload
    if (onNavigateToApp) {
      onNavigateToApp();
    } else {
      // Fallback for direct access
      window.location.href = '/';
    }
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      question: "How does the 14-day trial work?",
      answer: "Start with full PRO features for 14 days, no credit card required. After the trial, you can continue with the Free plan or upgrade to keep PRO features."
    },
    {
      question: "Do I need internet?",
      answer: "No! Storehouse works offline. Record sales, manage inventory, and track everything without internet. Your data syncs automatically when you're back online."
    },
    {
      question: "Can I export my data?",
      answer: "Yes, export your inventory and sales data anytime as CSV files. Your data is yours - download it whenever you need it."
    },
    {
      question: "How do credit sales work?",
      answer: "Track customers who buy on credit. See who owes money, when they bought, and send WhatsApp payment reminders directly from the app."
    },
    {
      question: "Is my data secure?",
      answer: "Your data is stored locally on your device and synced securely. You're always in control - export or delete your data anytime."
    },
    {
      question: "What happens after trial ends?",
      answer: "You automatically switch to the Free plan (10 products). No surprise charges. Upgrade anytime to unlock unlimited products and advanced features."
    },
    {
      question: "Can I use Storehouse on multiple devices?",
      answer: "Currently, Storehouse stores data locally on your device. For multi-device access, upgrade to TEAM or BUSINESS plans (coming soon)."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept bank transfers, card payments, and mobile money. Contact support via WhatsApp to upgrade your plan."
    }
  ];

  return (
    <div className="landing">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-headline">
              Storehouse - Know Your Profit, Grow Your Business
            </h1>
            <p className="hero-subheadline">
              Simple inventory management for Nigerian retailers. Track profit, manage credit sales, never run out of stock.
            </p>
            <div className="hero-cta">
              <button
                className="btn-cta-primary"
                onClick={() => handleGetStarted(true)}
              >
                Start 14-Day Pro Trial
              </button>
              <button
                className="btn-cta-secondary"
                onClick={() => handleGetStarted(false)}
              >
                Or continue on Free Plan
              </button>
            </div>
          </div>
          <div className="hero-image">
            <div className="dashboard-mockup">
              <div className="mockup-header">
                <div className="mockup-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="mockup-title">Storehouse Dashboard</div>
              </div>
              <div className="mockup-content">
                <div className="mockup-kpi">
                  <div className="mockup-card">
                    <div className="mockup-label">Today's Sales</div>
                    <div className="mockup-value">₦45,200</div>
                  </div>
                  <div className="mockup-card">
                    <div className="mockup-label">Profit</div>
                    <div className="mockup-value">₦12,300</div>
                  </div>
                </div>
                <div className="mockup-table">
                  <div className="mockup-row">
                    <div className="mockup-cell">Rice (50kg)</div>
                    <div className="mockup-cell green">₦5,000</div>
                  </div>
                  <div className="mockup-row">
                    <div className="mockup-cell">Cooking Oil</div>
                    <div className="mockup-cell green">₦2,100</div>
                  </div>
                  <div className="mockup-row">
                    <div className="mockup-cell">Indomie Noodles</div>
                    <div className="mockup-cell orange">Low Stock</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">Everything You Need to Run Your Shop</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3 className="feature-title">Profit Tracking</h3>
              <p className="feature-description">
                See which items make you money. Know your real profit after costs. Make better buying decisions.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3 className="feature-title">Credit Management</h3>
              <p className="feature-description">
                Track who owes you money. Send WhatsApp payment reminders. Never lose track of credit sales again.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Smart Reports</h3>
              <p className="feature-description">
                Daily sales summaries via WhatsApp. Works offline, syncs online. Export data anytime as CSV.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing">
        <div className="pricing-container">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">Start free, upgrade when you're ready</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3 className="pricing-name">FREE</h3>
              <div className="pricing-price">
                <span className="price-amount">₦0</span>
                <span className="price-period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Up to 10 products</li>
                <li>✓ Basic inventory tracking</li>
                <li>✓ Sales recording</li>
                <li>✓ Works offline</li>
              </ul>
              <button className="btn-pricing" onClick={() => handleGetStarted(false)}>
                Get Started
              </button>
            </div>

            <div className="pricing-card recommended">
              <div className="pricing-badge">RECOMMENDED</div>
              <h3 className="pricing-name">PRO</h3>
              <div className="pricing-price">
                <span className="price-amount">₦2,500</span>
                <span className="price-period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Unlimited products</li>
                <li>✓ Profit tracking & reports</li>
                <li>✓ WhatsApp EOD summaries</li>
                <li>✓ Credit sales management</li>
                <li>✓ CSV export</li>
              </ul>
              <button className="btn-pricing primary" onClick={() => handleGetStarted(true)}>
                Start 14-Day Trial
              </button>
            </div>

            <div className="pricing-card">
              <h3 className="pricing-name">TEAM</h3>
              <div className="pricing-price">
                <span className="price-amount">₦5,000</span>
                <span className="price-period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Everything in PRO</li>
                <li>✓ Up to 3 users</li>
                <li>✓ Team activity log</li>
                <li>✓ Priority support</li>
              </ul>
              <button className="btn-pricing" onClick={() => alert('Coming Soon! Contact support via WhatsApp.')}>
                Coming Soon
              </button>
            </div>

            <div className="pricing-card">
              <h3 className="pricing-name">BUSINESS</h3>
              <div className="pricing-price">
                <span className="price-amount">₦10,000</span>
                <span className="price-period">/month</span>
              </div>
              <ul className="pricing-features">
                <li>✓ Everything in TEAM</li>
                <li>✓ Up to 10 users</li>
                <li>✓ Advanced analytics</li>
                <li>✓ Custom integrations</li>
              </ul>
              <button className="btn-pricing" onClick={() => alert('Coming Soon! Contact support via WhatsApp.')}>
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq">
        <div className="faq-container">
          <h2 className="section-title">Frequently Asked Questions</h2>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
                onClick={() => toggleFaq(index)}
              >
                <div className="faq-question">
                  <span>{faq.question}</span>
                  <span className="faq-icon">{expandedFaq === index ? '−' : '+'}</span>
                </div>
                {expandedFaq === index && (
                  <div className="faq-answer">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Storehouse</h4>
              <p>Simple inventory management for Nigerian retailers</p>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <a
                href="https://wa.me/2348000000000?text=Hello%2C%20I%20need%20help%20with%20Storehouse"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                Contact via WhatsApp
              </a>
              <a href="#faq" className="footer-link">Help & FAQ</a>
            </div>
            <div className="footer-section">
              <h4>Your Data</h4>
              <p className="footer-note">Your data is yours - export anytime</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 Storehouse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
