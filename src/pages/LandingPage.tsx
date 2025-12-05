import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, ShoppingCart, Users, TrendingUp,
  Smartphone, Wifi, WifiOff, MessageCircle,
  CheckCircle, ArrowRight, Menu, X,
  Store, Zap, Shield, Clock, ChevronDown, Sparkles
} from 'lucide-react';
import AIChatWidget from '../components/AIChatWidget';
import './LandingPage.css';

// Pricing Toggle Component
function PricingToggle({ billingCycle, setBillingCycle }: {
  billingCycle: 'monthly' | 'annual';
  setBillingCycle: (cycle: 'monthly' | 'annual') => void;
}) {
  return (
    <div className="pricing-toggle-container">
      <p className="pricing-toggle-label">
        💰 Choose your billing cycle (click to switch)
      </p>
      <div className="pricing-toggle">
        <button
          className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
          onClick={() => setBillingCycle('monthly')}
        >
          Monthly
        </button>
        <button
          className={`toggle-option ${billingCycle === 'annual' ? 'active' : ''}`}
          onClick={() => setBillingCycle('annual')}
        >
          Annual
          <span className="toggle-badge">Save 20%</span>
        </button>
      </div>
    </div>
  );
}

// Pricing Amount Component
function PricingAmount({ monthly, annual, billingCycle }: {
  monthly: number;
  annual: number;
  billingCycle: 'monthly' | 'annual';
}) {

  const monthlyEquivalent = Math.floor(annual / 12);
  const savings = (monthly * 12) - annual;

  if (billingCycle === 'annual') {
    return (
      <div className="pricing-amount">
        <div className="savings-badge">Save ₦{savings.toLocaleString()}/year</div>
        <span className="price-currency">₦</span>
        <span className="price-value">{monthlyEquivalent.toLocaleString()}</span>
        <span className="price-period">/month</span>
        <div className="billed-annually">Billed ₦{annual.toLocaleString()} annually</div>
      </div>
    );
  }

  return (
    <div className="pricing-amount">
      <span className="price-currency">₦</span>
      <span className="price-value">{monthly.toLocaleString()}</span>
      <span className="price-period">/month</span>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Scroll tracking for parallax
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.fade-up, .fade-in, .slide-in-left, .slide-in-right').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  return (
    <div className="landing-page">
      {/* Animated background blobs */}
      <div className="blob blob-1" style={{ transform: `translate(${scrollY * 0.1}px, ${scrollY * 0.15}px)` }}></div>
      <div className="blob blob-2" style={{ transform: `translate(${-scrollY * 0.1}px, ${scrollY * 0.1}px)` }}></div>
      <div className="blob blob-3" style={{ transform: `translate(${scrollY * 0.05}px, ${-scrollY * 0.08}px)` }}></div>

      {/* Glassmorphism Navigation */}
      <nav className="landing-nav glassmorphism">
        <div className="nav-container">
          <div className="nav-logo" onClick={() => navigate('/')}>
            <img
              src="/storehouse-logo-new.png"
              alt="Storehouse - Inventory Management"
              className="logo-image"
            />
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a onClick={() => scrollToSection('features')}>Features</a>
            <a onClick={() => scrollToSection('pricing')}>Pricing</a>
            <a onClick={() => scrollToSection('testimonials')}>Reviews</a>
            <a onClick={() => scrollToSection('faq')}>FAQ</a>
            <button className="nav-cta" onClick={() => navigate('/signup')}>
              Start Free Forever
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
            <div className="sparkle-wrapper fade-up">
              <Sparkles className="sparkle-icon" size={20} />
              <span className="sparkle-text">Join 1,000+ Nigerian Businesses</span>
            </div>
            <h1 className="hero-headline fade-up">
              Manage Your Inventory & Sales Like a Pro
            </h1>
            <p className="hero-subheadline fade-up">
              Track stock, record sales, and manage customers from your phone.
              Built for Nigerian businesses, works offline.
            </p>

            <div className="hero-cta-group fade-up">
              <button
                className="btn-gradient-primary btn-lg"
                onClick={() => navigate('/signup')}
              >
                Start Free Forever
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

          <div className="hero-image fade-up">
            <img
              src="/landing-young-professional.png"
              alt="Nigerian businesswoman using Storehouse inventory app"
              className="hero-real-image"
            />
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="social-proof-bar">
        <div className="proof-container">
          <span className="proof-text">Trusted by stores across Lagos, Abuja, Port Harcourt & Beyond</span>
        </div>
      </section>

      {/* Ease of Use - Grandma Approved Section */}
      <section className="ease-of-use-section">
        <div className="section-container">
          <div className="ease-content">
            <div className="ease-image fade-in">
              <img
                src="/landing-elderly-woman.png"
                alt="Elderly Nigerian businesswoman using Storehouse app"
                className="grandma-image"
              />
            </div>
            <div className="ease-text fade-up">
              <div className="ease-badge">
                <CheckCircle size={20} className="badge-icon" />
                <span>Easy to Use</span>
              </div>
              <h2 className="ease-title">
                So Simple, Even Mama Can Use It
              </h2>
              <p className="ease-description">
                If she can manage her business at 65, imagine what you can do.
                No tech degree needed. No complicated setup. Just simple tools
                that work.
              </p>
              <div className="ease-features">
                <div className="ease-feature">
                  <CheckCircle size={18} className="feature-check" />
                  <span>No tech skills required</span>
                </div>
                <div className="ease-feature">
                  <CheckCircle size={18} className="feature-check" />
                  <span>Works on any phone</span>
                </div>
                <div className="ease-feature">
                  <CheckCircle size={18} className="feature-check" />
                  <span>Learn in 5 minutes</span>
                </div>
                <div className="ease-feature">
                  <CheckCircle size={18} className="feature-check" />
                  <span>Free forever plan</span>
                </div>
              </div>
              <button
                className="btn-gradient-primary"
                onClick={() => navigate('/signup')}
              >
                Get Started Free
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="problem-section">
        <div className="section-container">
          <h2 className="section-title fade-up">Tired of Managing Your Store with Pen & Paper?</h2>

          <div className="problem-grid">
            <div className="problem-card frosted-card fade-up">
              <div className="problem-icon">❌</div>
              <h3>Lost Sales Records</h3>
              <p>Missing inventory and unclear profit margins</p>
            </div>
            <div className="problem-card frosted-card fade-up">
              <div className="problem-icon">📊</div>
              <h3>No Business Insights</h3>
              <p>Can't tell which products are actually selling</p>
            </div>
            <div className="problem-card frosted-card fade-up">
              <div className="problem-icon">💸</div>
              <h3>Unpaid Debts</h3>
              <p>Customers forget to pay, you forget to follow up</p>
            </div>
            <div className="problem-card frosted-card fade-up">
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
            <div className="feature-card card-3d fade-up">
              <div className="feature-icon pulse-glow">
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

            <div className="feature-card card-3d fade-up">
              <div className="feature-icon pulse-glow">
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

            <div className="feature-card card-3d fade-up">
              <div className="feature-icon pulse-glow">
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

            <div className="feature-card card-3d fade-up">
              <div className="feature-icon pulse-glow">
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

      {/* Real Businesses Showcase */}
      <section className="businesses-showcase">
        <div className="section-container">
          <div className="section-header">
            <h2 className="section-title">Real Nigerian Businesses Thriving with Storehouse</h2>
            <p className="section-subtitle">From local shops to growing enterprises</p>
          </div>

          <div className="businesses-grid">
            <div className="business-card fade-up">
              <img
                src="/landing-spice-shop.png"
                alt="Nigerian spice shop owners managing inventory with Storehouse"
                className="business-image"
              />
              <div className="business-overlay">
                <h3>Works Anywhere</h3>
                <p>On your phone, tablet, or laptop - manage your business from anywhere</p>
              </div>
            </div>

            <div className="business-card fade-up">
              <img
                src="/landing-business-ecosystem.png"
                alt="Complete business ecosystem with delivery tracking"
                className="business-image"
              />
              <div className="business-overlay">
                <h3>Complete Solution</h3>
                <p>From inventory to delivery - everything you need in one place</p>
              </div>
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

          {/* Billing Toggle */}
          <PricingToggle billingCycle={billingCycle} setBillingCycle={setBillingCycle} />

          <div className="pricing-grid-new">
            {/* FREE TIER */}
            <div className="pricing-card-new">
              <div className="pricing-tier-header">
                <h3 className="tier-name">Free</h3>
                <p className="tier-desc">Perfect for solo entrepreneurs</p>
              </div>

              <div className="pricing-amount">
                <span className="price-currency">₦</span>
                <span className="price-value">0</span>
                <span className="price-period">/forever</span>
              </div>

              <button className="pricing-cta pricing-cta-outline" onClick={() => navigate('/signup')}>
                Get Started Free
              </button>

              <div className="pricing-features-section">
                <h4 className="features-category">Core Features</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 50 products, 1 image each</li>
                  <li><CheckCircle size={16} /> 1 user account</li>
                  <li><CheckCircle size={16} /> 50 AI chats/month</li>
                </ul>

                <h4 className="features-category">🛍️ Online Store</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Public storefront</li>
                  <li><CheckCircle size={16} /> Custom URL</li>
                  <li><CheckCircle size={16} /> Paystack payments</li>
                </ul>

                <h4 className="features-category">Basic Operations</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Record sales</li>
                  <li><CheckCircle size={16} /> Customer database</li>
                  <li><CheckCircle size={16} /> WhatsApp receipts</li>
                  <li><CheckCircle size={16} /> Works offline</li>
                </ul>
              </div>
            </div>

            {/* STARTER TIER */}
            <div className="pricing-card-new pricing-card-popular">
              <div className="popular-badge-new">Most Popular</div>
              <div className="pricing-tier-header">
                <h3 className="tier-name">Starter</h3>
                <p className="tier-desc">For small shops with 1-3 staff</p>
              </div>

              <PricingAmount
                monthly={5000}
                annual={48000}
                billingCycle={billingCycle}
              />

              <button className="pricing-cta pricing-cta-primary" onClick={() => navigate('/signup')}>
                Get Started Free
              </button>

              <div className="pricing-features-section">
                <h4 className="features-category">Everything in Free, plus:</h4>

                <h4 className="features-category">Inventory & Products</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 200 products, 3 images each</li>
                  <li><CheckCircle size={16} /> Product variants (sizes, colors)</li>
                  <li><CheckCircle size={16} /> Bulk CSV import/export</li>
                </ul>

                <h4 className="features-category">🛍️ Online Store Advanced</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Custom branding & logo</li>
                  <li><CheckCircle size={16} /> Delivery settings</li>
                </ul>

                <h4 className="features-category">💰 Debt & Credit Sales</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Credit sales tracking</li>
                  <li><CheckCircle size={16} /> Installment plans</li>
                  <li><CheckCircle size={16} /> WhatsApp reminders</li>
                </ul>

                <h4 className="features-category">📄 Professional Invoicing</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Create & send invoices</li>
                  <li><CheckCircle size={16} /> Payment links</li>
                </ul>

                <h4 className="features-category">📊 Analytics & Reports</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Profit tracking</li>
                  <li><CheckCircle size={16} /> Sales trends</li>
                  <li><CheckCircle size={16} /> Export to Excel</li>
                </ul>

                <h4 className="features-category">Team & AI</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 3 users with roles</li>
                  <li><CheckCircle size={16} /> 500 AI chats/month</li>
                </ul>
              </div>
            </div>

            {/* PRO TIER */}
            <div className="pricing-card-new">
              <div className="pricing-tier-header">
                <h3 className="tier-name">Pro</h3>
                <p className="tier-desc">For established businesses</p>
              </div>

              <PricingAmount
                monthly={10000}
                annual={96000}
                billingCycle={billingCycle}
              />

              <button className="pricing-cta pricing-cta-outline" onClick={() => navigate('/signup')}>
                Get Started
              </button>

              <div className="pricing-features-section">
                <h4 className="features-category">Everything in Starter, plus:</h4>

                <h4 className="features-category">Unlimited Power</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> <strong>UNLIMITED products</strong></li>
                  <li><CheckCircle size={16} /> 5 images per product</li>
                  <li><CheckCircle size={16} /> 5 users</li>
                </ul>

                <h4 className="features-category">💬 WhatsApp AI Assistant</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 24/7 AI chatbot</li>
                  <li><CheckCircle size={16} /> Auto customer support</li>
                  <li><CheckCircle size={16} /> Product inquiries</li>
                </ul>

                <h4 className="features-category">Advanced Features</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Recurring invoices</li>
                  <li><CheckCircle size={16} /> 2,000 AI chats/month</li>
                  <li><CheckCircle size={16} /> Daily AI business tips</li>
                  <li><CheckCircle size={16} /> Priority support</li>
                </ul>
              </div>
            </div>

            {/* BUSINESS TIER */}
            <div className="pricing-card-new">
              <div className="pricing-tier-header">
                <h3 className="tier-name">Business</h3>
                <p className="tier-desc">Enterprise power</p>
              </div>

              <PricingAmount
                monthly={15000}
                annual={144000}
                billingCycle={billingCycle}
              />

              <button className="pricing-cta pricing-cta-outline" onClick={() => navigate('/signup')}>
                Get Started
              </button>

              <div className="pricing-features-section">
                <h4 className="features-category">Everything in Pro, plus:</h4>

                <h4 className="features-category">Maximum Scale</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 10 images per product</li>
                  <li><CheckCircle size={16} /> 10 users</li>
                  <li><CheckCircle size={16} /> 5,000 AI chats/month</li>
                </ul>

                <h4 className="features-category">Dedicated Support</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Account manager</li>
                  <li><CheckCircle size={16} /> 1-on-1 training session</li>
                  <li><CheckCircle size={16} /> 24/7 priority support</li>
                  <li><CheckCircle size={16} /> Quarterly business review</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pricing-footer-new">
            <p><strong>Start free forever</strong> • No credit card required • Upgrade anytime</p>
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
                answer: 'Start free forever with 50 products and 50 AI chats per month. When you need more, upgrade to Starter (₦5,000/month for 200 products), Pro (₦10,000/month for unlimited products + WhatsApp AI), or Business (₦15,000/month for maximum scale). No credit card required to start.'
              },
              {
                question: 'Can I try it before paying?',
                answer: 'Yes! Start with our generous free plan (50 products, 50 AI chats/month, online store, invoicing) to test everything. Upgrade only when you hit your limits. No credit card needed, no time restrictions on the free plan.'
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

          <div className="cta-buttons-group">
            <button
              className="btn-gradient-primary btn-xl"
              onClick={() => navigate('/signup')}
            >
              Start Free Forever
              <ArrowRight size={24} />
            </button>

            <a
              href="https://wa.me/2348000000000?text=Hi!%20I%27m%20interested%20in%20Storehouse"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp btn-xl"
            >
              <MessageCircle size={24} />
              Chat on WhatsApp
            </a>
          </div>

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
              <a onClick={() => navigate('/submit-testimonial')}>Share Your Story</a>
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

      {/* Documentation-Only Chat Widget for Visitors */}
      <AIChatWidget contextType="help" />
    </div>
  );
}
