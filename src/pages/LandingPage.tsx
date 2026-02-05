import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import {
  Package, ShoppingCart, Users, TrendingUp,
  Smartphone, Wifi, WifiOff, MessageCircle,
  CheckCircle, ArrowRight, Menu, X,
  Store, Zap, Shield, Clock, ChevronDown, Sparkles,
  Facebook, Instagram, Mail, Twitter
} from 'lucide-react';
import AIChatWidget from '../components/AIChatWidget';
import { getImageKitUrl } from '../lib/imagekit';
import { useAuth } from '../contexts/AuthContext';
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
  const { currentUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Auto-redirect logged-in users to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

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

  // Add Schema.org structured data for SEO
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "Storehouse",
      "applicationCategory": "BusinessApplication",
      "applicationSubCategory": "Inventory Management",
      "operatingSystem": "Web, iOS, Android",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "NGN",
        "availability": "https://schema.org/InStock"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "1000",
        "bestRating": "5",
        "worstRating": "1"
      },
      "creator": {
        "@type": "Organization",
        "name": "Storehouse",
        "url": "https://storehouse.app"
      },
      "description": "Manage inventory, track sales, and record credits from your phone. Built for Nigerian retailers. Works offline with WhatsApp integration.",
      "featureList": [
        "Offline inventory management",
        "WhatsApp receipt sharing",
        "Sales tracking and analytics",
        "Credit/debt management",
        "Low stock alerts",
        "Multi-device sync",
        "Online store creation"
      ],
      "screenshot": "https://storehouse.app/landing-young-professional.png",
      "softwareVersion": "2.0",
      "inLanguage": "en-NG",
      "releaseNotes": "Complete inventory management solution for Nigerian businesses"
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

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
              src={getImageKitUrl('storehouse-logo-new.png', { width: 400, quality: 90 })}
              alt="Storehouse - Inventory Management"
              className="logo-image"
              loading="eager"
            />
          </div>

          <div className={`nav-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <a onClick={() => scrollToSection('features')}>Features</a>
            <a onClick={() => scrollToSection('pricing')}>Pricing</a>
            <a onClick={() => scrollToSection('testimonials')}>Reviews</a>
            <a onClick={() => scrollToSection('faq')}>FAQ</a>
            <button className="nav-cta" onClick={() => navigate('/signup')}>
              Get Started Free
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
              Stop Losing Money to Poor Inventory Management
            </h1>
            <p className="hero-subheadline fade-up">
              Track every Naira. Catch every debtor. Know exactly what's selling.
              Built for Nigerian businesses, works offline.
            </p>

            <div className="hero-cta-group fade-up">
              <button
                className="btn-gradient-primary btn-lg"
                onClick={() => navigate('/signup')}
              >
                Get Started Free
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
              <span>No credit card required • 30-day money-back guarantee • Cancel anytime</span>
            </div>
          </div>

          <div className="hero-image fade-up">
            <img
              src={getImageKitUrl('landing-young-professional.png', { width: 1200, quality: 90 })}
              alt="Nigerian businesswoman in traditional ankara dress using Storehouse inventory management app on smartphone to track stock and sales"
              className="hero-real-image"
              loading="eager"
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

      {/* Guarantee Badges Section */}
      <section className="guarantee-section">
        <div className="section-container">
          <div className="guarantee-grid">
            <div className="guarantee-card fade-up">
              <div className="guarantee-icon">
                <Shield size={32} />
              </div>
              <h3>30-Day Money-Back Guarantee</h3>
              <p>Not satisfied? Get a full refund within 30 days. No questions asked.</p>
            </div>
            <div className="guarantee-card fade-up">
              <div className="guarantee-icon">
                <Clock size={32} />
              </div>
              <h3>Cancel Anytime</h3>
              <p>No contracts. No penalties. Cancel your subscription whenever you want.</p>
            </div>
            <div className="guarantee-card fade-up">
              <div className="guarantee-icon">
                <Zap size={32} />
              </div>
              <h3>Instant Setup</h3>
              <p>Start tracking inventory in under 5 minutes. No technical skills needed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ease of Use - Grandma Approved Section */}
      <section className="ease-of-use-section">
        <div className="section-container">
          <div className="ease-content">
            <div className="ease-image fade-in">
              <img
                src={getImageKitUrl('landing-elderly-woman.png', { width: 1000, quality: 85 })}
                alt="Elderly Nigerian woman in traditional gele headwrap smiling while using simple inventory app - easy for all ages"
                className="grandma-image"
                loading="lazy"
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
                  <span>Free plan</span>
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
                <Zap size={32} />
              </div>
              <h3>⚡ Lightning-Fast Stores (Even on 3G)</h3>
              <p>Optimized for Nigerian networks. Your images load instantly with automatic WebP compression and CDN delivery—customers browse smoothly even on slow connections.</p>
              <ul className="feature-list">
                <li>90% faster than typical online stores</li>
                <li>Optimized for MTN, Glo, Airtel, 9mobile</li>
                <li>Mobile-first design with responsive images</li>
                <li>Auto-optimized product images via ImageKit</li>
              </ul>
            </div>

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

      {/* 24/7 AI Assistant - Sleep & Sell */}
      <section className="ai-sleep-section">
        <div className="section-container">
          <div className="ai-sleep-content">
            <div className="ai-sleep-image fade-up">
              <img
                src={getImageKitUrl('ai-chatbot-store.png', { width: 1200, quality: 90 })}
                alt="AI chatbot assistant in Storehouse online store helping customers 24/7 with product questions and availability"
                className="ai-robot-image"
                loading="lazy"
              />
            </div>
            <div className="ai-sleep-text fade-up">
              <div className="ai-badge">
                <MessageCircle size={20} className="badge-icon" />
                <span>24/7 AI Assistant</span>
              </div>
              <h2 className="ai-sleep-title">
                Make Sales While You Sleep 💤
              </h2>
              <p className="ai-sleep-description">
                Your AI assistant never sleeps. It chats with customers, answers questions about
                prices and availability, and helps them place orders—even at 3 AM when you're fast asleep.
              </p>

              <div className="ai-sleep-stats">
                <div className="ai-stat">
                  <div className="ai-stat-number">24/7</div>
                  <div className="ai-stat-label">Always Available</div>
                </div>
                <div className="ai-stat">
                  <div className="ai-stat-number">Instant</div>
                  <div className="ai-stat-label">Response Time</div>
                </div>
                <div className="ai-stat">
                  <div className="ai-stat-number">0</div>
                  <div className="ai-stat-label">Customers Lost</div>
                </div>
              </div>

              <div className="ai-features-list">
                <div className="ai-feature-item">
                  <CheckCircle size={20} className="feature-check" />
                  <div>
                    <strong>Product Inquiries</strong>
                    <p>Answers questions about price, availability, colors, sizes</p>
                  </div>
                </div>
                <div className="ai-feature-item">
                  <CheckCircle size={20} className="feature-check" />
                  <div>
                    <strong>Order Assistance</strong>
                    <p>Guides customers through ordering and payment process</p>
                  </div>
                </div>
                <div className="ai-feature-item">
                  <CheckCircle size={20} className="feature-check" />
                  <div>
                    <strong>Smart Recommendations</strong>
                    <p>Suggests similar products based on customer questions</p>
                  </div>
                </div>
                <div className="ai-feature-item">
                  <CheckCircle size={20} className="feature-check" />
                  <div>
                    <strong>WhatsApp Integration</strong>
                    <p>Customers can chat via WhatsApp, even while you sleep</p>
                  </div>
                </div>
              </div>

              <div className="ai-cta-box">
                <div className="ai-cta-icon">💡</div>
                <div className="ai-cta-content">
                  <h4>Never Miss a Sale Again</h4>
                  <p>Most customers shop after work hours (6 PM - 11 PM). Your AI assistant ensures they get instant answers, not "I'll reply tomorrow."</p>
                </div>
              </div>

              <button
                className="btn-gradient-primary btn-lg"
                onClick={() => navigate('/signup')}
              >
                Get Your AI Assistant
                <ArrowRight size={18} />
              </button>
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
                src={getImageKitUrl('landing-spice-shop.png', { width: 800, quality: 85 })}
                alt="Nigerian couple managing spice shop inventory using Storehouse software on phone and laptop for retail business"
                className="business-image"
                loading="lazy"
              />
              <div className="business-overlay">
                <h3>Works Anywhere</h3>
                <p>On your phone, tablet, or laptop - manage your business from anywhere</p>
              </div>
            </div>

            <div className="business-card fade-up">
              <img
                src={getImageKitUrl('landing-business-ecosystem.png', { width: 800, quality: 85 })}
                alt="Complete business ecosystem showing Storehouse inventory management with multi-device sync and delivery tracking"
                className="business-image"
                loading="lazy"
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
                <img
                  src={getImageKitUrl('works-24-7.png', { width: 600, quality: 85 })}
                  alt="Works 24/7"
                  className="feature-icon-image"
                  loading="lazy"
                />
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
                <img
                  src={getImageKitUrl('whatsapp-ready.png', { width: 600, quality: 85 })}
                  alt="WhatsApp Ready"
                  className="feature-icon-image"
                  loading="lazy"
                />
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
                <img
                  src={getImageKitUrl('any-device.png', { width: 600, quality: 85 })}
                  alt="Any Device"
                  className="feature-icon-image"
                  loading="lazy"
                />
              </div>
            </div>
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
                "My customers love how fast my online store loads! They say it's smoother than
                the big platforms. I'm getting more sales because people don't wait forever for pictures to load."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">C</div>
                <div className="author-info">
                  <div className="author-name">Chioma O.</div>
                  <div className="author-role">Fashion Store, Lekki, Lagos</div>
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
                <span className="price-period">/month</span>
              </div>

              <button className="pricing-cta pricing-cta-outline" onClick={() => navigate('/signup')}>
                Get Started Free
              </button>

              <div className="pricing-features-section">
                <h4 className="features-category">Core Features</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> 30 products, 1 image each</li>
                  <li><CheckCircle size={16} /> 1 user account</li>
                  <li><CheckCircle size={16} /> Unlimited AI chats (beta testing)</li>
                </ul>

                <h4 className="features-category">🛍️ Online Store</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Public storefront</li>
                  <li><CheckCircle size={16} /> Custom URL</li>
                  <li><CheckCircle size={16} /> Paystack payments</li>
                  <li><CheckCircle size={16} /> ⚡ Lightning fast loading</li>
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
                  <li><CheckCircle size={16} /> ⚡ Lightning fast loading</li>
                </ul>

                <h4 className="features-category">💰 Debt & Credit Sales</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Credit sales tracking</li>
                  <li><CheckCircle size={16} /> Installment plans</li>
                  <li><CheckCircle size={16} /> Customer payment records</li>
                </ul>

                <h4 className="features-category">📄 Professional Invoicing</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Create & send invoices</li>
                  <li><CheckCircle size={16} /> Payment links</li>
                </ul>

                <h4 className="features-category">📊 Analytics & Reports</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Basic sales analytics</li>
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
                  <li><CheckCircle size={16} /> ⚡ Lightning fast loading</li>
                </ul>

                <h4 className="features-category">💬 24/7 AI Shopping Assistant</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> <strong>Make sales while you sleep</strong></li>
                  <li><CheckCircle size={16} /> Answers price & availability questions</li>
                  <li><CheckCircle size={16} /> Guides customers through ordering</li>
                  <li><CheckCircle size={16} /> Works via WhatsApp & web chat</li>
                </ul>

                <h4 className="features-category">Advanced Features</h4>
                <ul className="pricing-features-list">
                  <li><CheckCircle size={16} /> Manual recurring invoices</li>
                  <li><CheckCircle size={16} /> 1,500 AI chats/month</li>
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
                  <li><CheckCircle size={16} /> 10,000 AI chats/month</li>
                  <li><CheckCircle size={16} /> ⚡ Lightning fast loading</li>
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
            <p><strong>Start free</strong> • No credit card required • 30-day money-back guarantee • Cancel anytime</p>
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
                question: 'Why are Storehouse online stores so fast?',
                answer: 'We use enterprise-grade image optimization technology that automatically makes your product photos load 5x faster. Your images are optimized for different screen sizes, compressed without losing quality, and delivered instantly even on slow Nigerian networks. This means customers can browse your products smoothly without waiting, leading to more sales.'
              },
              {
                question: 'Do I need internet to use Storehouse?',
                answer: 'No! Storehouse works completely offline. You can record sales, update inventory, and manage customers without internet. Everything syncs automatically when you\'re back online.'
              },
              {
                question: 'How much does it cost?',
                answer: 'Start free with 30 products and unlimited AI chats (during beta testing). When you need more, upgrade to Starter (₦5,000/month for 200 products), Pro (₦10,000/month for unlimited products + WhatsApp AI), or Business (₦15,000/month for maximum scale). No credit card required to start.'
              },
              {
                question: 'Can I try it before paying?',
                answer: 'Yes! Start with our generous free plan (30 products, unlimited AI chats during testing, online store, invoicing) to test everything. Upgrade only when you hit your limits. No credit card needed, no time restrictions on the free plan.'
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
              },
              {
                question: 'How do customer payments work?',
                answer: 'Your customers pay YOU directly through your chosen payment provider (Paystack, bank transfer, etc.). Storehouse provides the online store platform only - we never hold or process your customer payments. Think of us like Shopify: we provide the software, you run your business. This means you keep 100% control and receive payments instantly to your own account.'
              },
              {
                question: 'Who handles customer refunds and support?',
                answer: 'You handle all customer service, refunds, and returns directly. Storehouse is a software platform - we provide the tools (online store, inventory management, AI chat), but you own and operate your business independently. This gives you full control over your customer relationships, policies, and 100% of your revenue with no middleman fees.'
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

      {/* Affiliate Program CTA */}
      <section style={{
        padding: '80px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '42px', fontWeight: 700, marginBottom: '16px' }}>
            💰 Earn 30% Commission as an Affiliate
          </h2>
          <p style={{ fontSize: '20px', marginBottom: '32px', opacity: 0.95 }}>
            Refer businesses to Storehouse and earn recurring commission on every paid subscription
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>30%</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Commission Rate</div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>On all paid plans</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>2</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Conversions to Unlock</div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>Low barrier to start</div>
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '24px',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>Weekly</div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Payouts</div>
              <div style={{ fontSize: '14px', opacity: 0.9, marginTop: '4px' }}>Every Monday</div>
            </div>
          </div>

          <button
            onClick={() => navigate('/affiliate/signup')}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '12px',
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.2)';
            }}
          >
            Become an Affiliate Partner →
          </button>

          <p style={{ marginTop: '24px', fontSize: '14px', opacity: 0.85 }}>
            Perfect for influencers, business coaches, consultants, and community leaders
          </p>
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
              Get Started Free
              <ArrowRight size={24} />
            </button>

            <a
              href="https://wa.me/447345014588?text=Hi!%20I%27m%20interested%20in%20Storehouse"
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
            <span>30-day money-back guarantee • Cancel anytime • No credit card required</span>
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

              {/* Social Media Links */}
              <div className="footer-social">
                <a
                  href="https://www.facebook.com/profile.php?id=61585403256327"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook size={20} />
                </a>
                <a
                  href="https://instagram.com/storehouseappng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram size={20} />
                </a>
                <a
                  href="https://twitter.com/StorehouseappNg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  aria-label="Follow us on Twitter"
                >
                  <Twitter size={20} />
                </a>
                <a
                  href="https://tiktok.com/@storehouseng"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-link"
                  aria-label="Follow us on TikTok"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                  </svg>
                </a>
                <a
                  href="mailto:storehouseapp@outlook.com"
                  className="social-link"
                  aria-label="Email us"
                >
                  <Mail size={20} />
                </a>
              </div>
            </div>

            <div className="footer-col">
              <h4>Product</h4>
              <a onClick={() => scrollToSection('features')}>Features</a>
              <a onClick={() => scrollToSection('pricing')}>Pricing</a>
              <a onClick={() => navigate('/help')}>Help Center</a>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <a href="#" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>About Us</a>
              <a href="#" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Blog</a>
              <a onClick={() => scrollToSection('testimonials')} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Reviews</a>
              <a onClick={() => navigate('/submit-testimonial')} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Share Your Story</a>
              <a onClick={() => navigate('/affiliate/signup')} style={{ pointerEvents: 'auto', cursor: 'pointer', fontWeight: 600, color: '#667eea' }}>
                💰 Become an Affiliate
              </a>
            </div>

            <div className="footer-col">
              <h4>Support</h4>
              <a
                href="https://wa.me/447345014588?text=Hi!%20I%20need%20support%20with%20Storehouse"
                target="_blank"
                rel="noopener noreferrer"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                WhatsApp
              </a>
              <a
                href="mailto:storehouseapp@outlook.com"
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                Email
              </a>
              <a
                onClick={() => scrollToSection('faq')}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              >
                FAQ
              </a>
            </div>

            <div className="footer-col">
              <h4>Legal</h4>
              <a href="#" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Privacy Policy</a>
              <a href="#" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Terms of Service</a>
              <a href="#" style={{ pointerEvents: 'auto', cursor: 'pointer' }}>Refund Policy</a>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2024 Storehouse. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* FAQ-Only Chat Widget for Visitors (No AI Cost!) */}
      <AIChatWidget />
    </div>
  );
}
