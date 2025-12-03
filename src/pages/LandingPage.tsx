import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, ShoppingCart, Users, TrendingUp,
  Smartphone, Wifi, WifiOff, MessageCircle,
  CheckCircle, ArrowRight, Menu, X,
  Store, Zap, Shield, Clock, ChevronDown
} from 'lucide-react';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="nav-logo">
            <Store size={28} />
            <span>Storehouse</span>
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a onClick={() => scrollToSection('features')}>Features</a>
            <a onClick={() => scrollToSection('pricing')}>Pricing</a>
            <a onClick={() => scrollToSection('testimonials')}>Reviews</a>
            <a onClick={() => scrollToSection('faq')}>FAQ</a>
            <button className="nav-cta" onClick={() => navigate('/signup')}>
              Start Free Trial
            </button>
          </div>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-headline">
              Manage Your Inventory & Sales Like a Pro
            </h1>
            <p className="hero-subheadline">
              Track stock, record sales, and manage customers from your phone.
              Built for Nigerian businesses, works offline.
            </p>

            <div className="hero-cta-group">
              <button
                className="btn-gradient-primary btn-lg"
                onClick={() => navigate('/signup')}
              >
                Start Free Trial
                <ArrowRight size={20} />
              </button>
              <button
                className="btn-ghost btn-lg"
                onClick={() => scrollToSection('features')}
              >
                See How It Works
              </button>
            </div>

            <div className="hero-trust">
              <CheckCircle size={16} className="trust-icon" />
              <span>Join 1,000+ Nigerian businesses • No credit card required</span>
            </div>
          </div>

          <div className="hero-image">
            <div className="hero-dashboard-preview">
              {/* Placeholder for dashboard screenshot */}
              <div className="preview-placeholder">
                <div className="preview-header">
                  <div className="preview-dot"></div>
                  <div className="preview-dot"></div>
                  <div className="preview-dot"></div>
                </div>
                <div className="preview-content">
                  <div className="preview-stats">
                    <div className="preview-stat-card">
                      <div className="stat-icon green">₦</div>
                      <div className="stat-label">Today's Sales</div>
                      <div className="stat-value">₦45,000</div>
                    </div>
                    <div className="preview-stat-card">
                      <div className="stat-icon blue">📦</div>
                      <div className="stat-label">Products</div>
                      <div className="stat-value">127</div>
                    </div>
                  </div>
                  <div className="preview-chart"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="social-proof-bar">
        <div className="proof-container">
          <span className="proof-text">Trusted by stores across Lagos, Abuja, Port Harcourt & Beyond</span>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="section-container">
          <h2 className="section-title">Tired of Managing Your Store with Pen & Paper?</h2>

          <div className="problem-grid">
            <div className="problem-card">
              <div className="problem-icon">❌</div>
              <h3>Lost Sales Records</h3>
              <p>Missing inventory and unclear profit margins</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">📊</div>
              <h3>No Business Insights</h3>
              <p>Can't tell which products are actually selling</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">💸</div>
              <h3>Unpaid Debts</h3>
              <p>Customers forget to pay, you forget to follow up</p>
            </div>
            <div className="problem-card">
              <div className="problem-icon">⏰</div>
              <h3>Time Wasted</h3>
              <p>Hours spent counting stock manually</p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution / Features Section */}
      <section id="features" className="features-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Everything You Need to Run Your Store</h2>
            <p className="section-subtitle">Powerful features that work together seamlessly</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Package size={32} />
              </div>
              <h3>Track Inventory</h3>
              <p>Know exactly what's in stock. Get alerts when running low on your best sellers.</p>
              <ul className="feature-list">
                <li>Automatic stock updates</li>
                <li>Low stock alerts</li>
                <li>Multi-location support</li>
                <li>Barcode scanning</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <ShoppingCart size={32} />
              </div>
              <h3>Record Sales</h3>
              <p>Fast checkout with instant receipts sent via WhatsApp. Accept cash, transfer, or credit.</p>
              <ul className="feature-list">
                <li>Quick sale recording</li>
                <li>Multiple payment methods</li>
                <li>WhatsApp receipts</li>
                <li>Discount & promo codes</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h3>Manage Customers</h3>
              <p>Track customer debts, send payment reminders, and build lasting relationships.</p>
              <ul className="feature-list">
                <li>Customer database</li>
                <li>Debt tracking</li>
                <li>Automated reminders</li>
                <li>Purchase history</li>
              </ul>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <TrendingUp size={32} />
              </div>
              <h3>Smart Reports</h3>
              <p>See your best sellers, daily revenue, and profits at a glance. Make data-driven decisions.</p>
              <ul className="feature-list">
                <li>Sales analytics</li>
                <li>Profit margins</li>
                <li>Best sellers</li>
                <li>Export to Excel</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive - Alternating Sections */}
      <section className="feature-showcase">
        <div className="section-container">
          {/* Feature 1 - Works Offline */}
          <div className="showcase-item">
            <div className="showcase-content">
              <div className="showcase-badge">
                <WifiOff size={16} />
                <span>Works Offline</span>
              </div>
              <h2>Never Let Bad Internet Stop Your Business</h2>
              <p>
                Record sales, update inventory, and serve customers even without internet.
                Everything syncs automatically when you're back online.
              </p>
              <ul className="showcase-benefits">
                <li>
                  <CheckCircle size={20} />
                  <span>Full offline functionality</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>Automatic sync when online</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>No data loss guaranteed</span>
                </li>
              </ul>
            </div>
            <div className="showcase-visual">
              <div className="visual-placeholder offline">
                <Wifi size={48} className="wifi-icon" />
                <WifiOff size={48} className="wifi-off-icon" />
                <p>Works 24/7</p>
              </div>
            </div>
          </div>

          {/* Feature 2 - WhatsApp Integration */}
          <div className="showcase-item reverse">
            <div className="showcase-content">
              <div className="showcase-badge">
                <MessageCircle size={16} />
                <span>WhatsApp Integration</span>
              </div>
              <h2>Send Receipts & Reminders via WhatsApp</h2>
              <p>
                Instantly share receipts with customers. Send automated payment reminders
                for credit sales. Share your product catalog with one click.
              </p>
              <ul className="showcase-benefits">
                <li>
                  <CheckCircle size={20} />
                  <span>Instant receipt sharing</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>Payment reminders</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>Product catalog sharing</span>
                </li>
              </ul>
            </div>
            <div className="showcase-visual">
              <div className="visual-placeholder whatsapp">
                <MessageCircle size={48} />
                <p>WhatsApp Ready</p>
              </div>
            </div>
          </div>

          {/* Feature 3 - Mobile First */}
          <div className="showcase-item">
            <div className="showcase-content">
              <div className="showcase-badge">
                <Smartphone size={16} />
                <span>Mobile First</span>
              </div>
              <h2>Manage Your Store From Your Phone</h2>
              <p>
                Fully optimized for mobile. Run your entire business from your phone,
                tablet, or computer. Works on any device, anywhere.
              </p>
              <ul className="showcase-benefits">
                <li>
                  <CheckCircle size={20} />
                  <span>Works on any device</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>Fast & responsive</span>
                </li>
                <li>
                  <CheckCircle size={20} />
                  <span>No app installation needed</span>
                </li>
              </ul>
            </div>
            <div className="showcase-visual">
              <div className="visual-placeholder mobile">
                <Smartphone size={48} />
                <p>Any Device</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="use-cases-section">
        <div className="section-container">
          <h2 className="section-title">Perfect For Every Business</h2>

          <div className="use-cases-grid">
            <div className="use-case-card">
              <div className="use-case-icon">📱</div>
              <h3>Phone & Electronics</h3>
              <p>Track IMEI numbers, warranties, and accessories</p>
            </div>
            <div className="use-case-card">
              <div className="use-case-icon">👗</div>
              <h3>Fashion & Boutiques</h3>
              <p>Manage sizes, colors, and seasonal inventory</p>
            </div>
            <div className="use-case-card">
              <div className="use-case-icon">🏪</div>
              <h3>Supermarkets</h3>
              <p>Handle bulk items and expiry date tracking</p>
            </div>
            <div className="use-case-card">
              <div className="use-case-icon">💊</div>
              <h3>Pharmacies</h3>
              <p>Manage prescriptions and batch numbers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing-section">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-subtitle">Start free, upgrade as you grow</p>
          </div>

          <div className="pricing-grid">
            {/* Free Plan */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Starter</h3>
                <div className="price">
                  <span className="currency">₦</span>
                  <span className="amount">0</span>
                  <span className="period">/month</span>
                </div>
                <p className="pricing-desc">Perfect for getting started</p>
              </div>

              <ul className="pricing-features">
                <li><CheckCircle size={18} /> Up to 50 products</li>
                <li><CheckCircle size={18} /> Unlimited sales</li>
                <li><CheckCircle size={18} /> Basic reports</li>
                <li><CheckCircle size={18} /> Mobile access</li>
                <li><CheckCircle size={18} /> WhatsApp receipts</li>
              </ul>

              <button
                className="btn-outline-gradient btn-lg"
                onClick={() => navigate('/signup')}
              >
                Start Free
              </button>
            </div>

            {/* Pro Plan */}
            <div className="pricing-card featured">
              <div className="popular-badge">Most Popular</div>
              <div className="pricing-header">
                <h3>Professional</h3>
                <div className="price">
                  <span className="currency">₦</span>
                  <span className="amount">5,000</span>
                  <span className="period">/month</span>
                </div>
                <p className="pricing-desc">For growing businesses</p>
              </div>

              <ul className="pricing-features">
                <li><CheckCircle size={18} /> Unlimited products</li>
                <li><CheckCircle size={18} /> Unlimited sales</li>
                <li><CheckCircle size={18} /> Advanced analytics</li>
                <li><CheckCircle size={18} /> Customer management</li>
                <li><CheckCircle size={18} /> Debt tracking</li>
                <li><CheckCircle size={18} /> Multiple staff accounts</li>
                <li><CheckCircle size={18} /> Priority support</li>
                <li><CheckCircle size={18} /> Export data</li>
              </ul>

              <button
                className="btn-gradient-primary btn-lg"
                onClick={() => navigate('/signup')}
              >
                Start Free Trial
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="pricing-card">
              <div className="pricing-header">
                <h3>Enterprise</h3>
                <div className="price">
                  <span className="currency">₦</span>
                  <span className="amount">15,000</span>
                  <span className="period">/month</span>
                </div>
                <p className="pricing-desc">For multiple locations</p>
              </div>

              <ul className="pricing-features">
                <li><CheckCircle size={18} /> Everything in Pro</li>
                <li><CheckCircle size={18} /> Multiple store locations</li>
                <li><CheckCircle size={18} /> Advanced permissions</li>
                <li><CheckCircle size={18} /> Custom integrations</li>
                <li><CheckCircle size={18} /> Dedicated support</li>
                <li><CheckCircle size={18} /> Custom training</li>
              </ul>

              <button
                className="btn-outline-gradient btn-lg"
                onClick={() => navigate('/signup')}
              >
                Start Free Trial
              </button>
            </div>
          </div>

          <div className="pricing-footer">
            <p>All plans include 14-day free trial • No credit card required • Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-container">
          <h2 className="section-title">Loved by Business Owners Across Nigeria</h2>

          <div className="testimonials-grid">
            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "Storehouse helped me catch ₦50,000 in missing inventory in the first week!
                I finally know exactly what I have in stock."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">C</div>
                <div className="author-info">
                  <div className="author-name">Chioma O.</div>
                  <div className="author-role">Fashion Boutique, Lagos</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "The WhatsApp feature is a game changer. My customers love getting instant receipts,
                and I never have to chase payments anymore."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">A</div>
                <div className="author-info">
                  <div className="author-name">Adebayo M.</div>
                  <div className="author-role">Phone Store, Abuja</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "I was using pen and paper before Storehouse. Now I can see my daily sales,
                best sellers, and profit margins instantly. This is the future!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">F</div>
                <div className="author-info">
                  <div className="author-name">Funke A.</div>
                  <div className="author-role">Supermarket, Port Harcourt</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "Best investment for my pharmacy. The expiry date tracking alone has saved me
                from losses. Customer support is also excellent!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">E</div>
                <div className="author-info">
                  <div className="author-name">Emmanuel I.</div>
                  <div className="author-role">Pharmacy, Enugu</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "Works perfectly offline! Even when NEPA takes light and my internet is down,
                I can still run my business. Absolutely brilliant."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">O</div>
                <div className="author-info">
                  <div className="author-name">Oluwaseun T.</div>
                  <div className="author-role">Electronics Store, Ibadan</div>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <div className="testimonial-rating">
                {'⭐'.repeat(5)}
              </div>
              <p className="testimonial-text">
                "My staff can now record sales on their phones. The reports show me everything
                at a glance. I wish I found this years ago!"
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">N</div>
                <div className="author-info">
                  <div className="author-name">Ngozi P.</div>
                  <div className="author-role">Cosmetics Store, Lagos</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="faq-section">
        <div className="section-container">
          <h2 className="section-title">Frequently Asked Questions</h2>

          <div className="faq-list">
            {[
              {
                question: 'Do I need internet to use Storehouse?',
                answer: 'No! Storehouse works completely offline. You can record sales, update inventory, and manage customers without internet. Everything syncs automatically when you\'re back online.'
              },
              {
                question: 'How much does it cost?',
                answer: 'We have a free Starter plan for small stores with up to 50 products. Our Professional plan costs ₦5,000/month with unlimited products and advanced features. All paid plans include a 14-day free trial with no credit card required.'
              },
              {
                question: 'Can I try it before paying?',
                answer: 'Absolutely! You can start with our free Starter plan immediately, no credit card needed. All paid plans also include a 14-day free trial so you can test all premium features risk-free.'
              },
              {
                question: 'Is my data secure?',
                answer: 'Yes! Your data is encrypted and stored securely on cloud servers with automatic backups. We use bank-level security to protect your business information. You can also export your data anytime.'
              },
              {
                question: 'Can I export my data?',
                answer: 'Yes! You can export your sales, inventory, and customer data to Excel at any time. Your data belongs to you, and you have full control over it.'
              },
              {
                question: 'Do you offer training and support?',
                answer: 'Yes! We provide video tutorials, a detailed help center, and WhatsApp support. Professional and Enterprise plans get priority support with faster response times.'
              },
              {
                question: 'What payment methods do you accept?',
                answer: 'We accept bank transfers, card payments, and mobile money. All transactions are processed securely through trusted Nigerian payment providers.'
              },
              {
                question: 'Can I cancel anytime?',
                answer: 'Yes, you can cancel your subscription at any time with no penalties or hidden fees. If you cancel, you can still access your data and export it before your plan expires.'
              }
            ].map((faq, index) => (
              <div
                key={index}
                className={`faq-item ${openFaq === index ? 'open' : ''}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
              >
                <div className="faq-question">
                  <h3>{faq.question}</h3>
                  <ChevronDown className="faq-icon" size={20} />
                </div>
                <div className="faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="cta-container">
          <h2>Ready to Transform Your Business?</h2>
          <p>Join thousands of Nigerian businesses using Storehouse</p>

          <button
            className="btn-gradient-primary btn-xl"
            onClick={() => navigate('/signup')}
          >
            Start Your Free Trial
            <ArrowRight size={24} />
          </button>

          <div className="cta-trust">
            <Shield size={16} />
            <Clock size={16} />
            <Zap size={16} />
            <span>No credit card required • Cancel anytime • 24/7 support</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="footer-logo">
                <Store size={24} />
                <span>Storehouse</span>
              </div>
              <p>Modern inventory and sales management for Nigerian businesses.</p>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <a onClick={() => scrollToSection('features')}>Features</a>
              <a onClick={() => scrollToSection('pricing')}>Pricing</a>
              <a onClick={() => navigate('/help')}>Help Center</a>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Blog</a>
              <a onClick={() => scrollToSection('testimonials')}>Reviews</a>
            </div>

            <div className="footer-col">
              <h4>Support</h4>
              <a href="https://wa.me/2348000000000" target="_blank" rel="noopener noreferrer">WhatsApp</a>
              <a href="mailto:support@storehouse.ng">Email</a>
              <a onClick={() => scrollToSection('faq')}>FAQ</a>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Refund Policy</a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 Storehouse. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
