/**
 * Public Storefront Page
 * Customer-facing product catalog
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, ShoppingBag, Phone, MapPin, ArrowLeft, Camera, X, ShoppingCart, Plus } from 'lucide-react';
import { currencyNGN } from '../utils/format';
import type { StoreProfile } from '../types';
import { SmartPicture } from '../components/SmartPicture';
import { CartProvider, useCart } from '../contexts/CartContext';
import { Cart } from '../components/Cart';
import '../styles/storefront.css';

interface Product {
  id: string;
  name: string;
  sellKobo: number;
  qty: number;
  category?: string;
  isPublic: boolean;
  imageUrl?: string;
  imageHash?: string; // Content hash for enhanced images
}

function StorefrontContent() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { openCart, itemCount, addItem } = useCart();

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Load store data and products
  useEffect(() => {
    const loadStorefront = async () => {
      if (!slug) {
        setError('Store not found');
        setLoading(false);
        return;
      }

      try {
        // 1. Get store owner ID from slug
        const slugDoc = await getDoc(doc(db, 'slugs', slug));

        if (!slugDoc.exists()) {
          setError('Store not found');
          setLoading(false);
          return;
        }

        const ownerId = slugDoc.data().ownerId;

        // 2. Get store profile
        const storeDoc = await getDoc(doc(db, 'stores', ownerId));

        if (!storeDoc.exists()) {
          setError('Store not found');
          setLoading(false);
          return;
        }

        const storeData = storeDoc.data() as StoreProfile;

        // Check if store is public
        if (!storeData.isPublic) {
          setError('This store is currently private');
          setLoading(false);
          return;
        }

        setStore(storeData);

        // 3. Get public items from the products collection
        const itemsRef = collection(db, 'users', ownerId, 'products');
        const itemsQuery = query(itemsRef, where('isPublic', '==', true));
        const itemsSnapshot = await getDocs(itemsQuery);

        const publicProducts = itemsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(item => !item.isDeleted && (item.qty || 0) > 0) as Product[];

        setProducts(publicProducts);
        setLoading(false);
      } catch (err) {
        console.error('[Storefront] Error loading store:', err);
        setError('Failed to load store');
        setLoading(false);
      }
    };

    loadStorefront();
  }, [slug]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // WhatsApp contact
  const handleWhatsAppContact = () => {
    if (!store?.whatsappNumber) {
      alert('WhatsApp number not available');
      return;
    }

    let phone = store.whatsappNumber.replace(/\D/g, '');
    if (phone.startsWith('0')) {
      phone = '234' + phone.substring(1);
    } else if (!phone.startsWith('234')) {
      phone = '234' + phone;
    }

    const message = `Hi ${store.businessName}, I'm interested in your products!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Loading state
  if (loading) {
    return (
      <div className="storefront-container">
        <div className="storefront-loading">
          <div className="loading-spinner"></div>
          <p>Loading store...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !store) {
    return (
      <div className="storefront-container">
        <div className="storefront-error">
          <ShoppingBag size={64} strokeWidth={1} />
          <h2>{error || 'Store not found'}</h2>
          <p>This store may be private or the link may be incorrect.</p>
          <button onClick={() => navigate('/')} className="btn-back">
            <ArrowLeft size={20} />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="storefront-container">
      {/* Header */}
      <header className="storefront-header" style={{
        backgroundColor: store.primaryColor || '#2563eb',
        backgroundImage: store.primaryColor
          ? `linear-gradient(135deg, ${store.primaryColor} 0%, ${store.primaryColor}dd 100%)`
          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
      }}>
        {/* Cart Button - Fixed Position */}
        <button onClick={openCart} className="storefront-cart-btn">
          <ShoppingCart size={24} />
          {itemCount > 0 && <span className="storefront-cart-badge">{itemCount}</span>}
        </button>

        <div className="storefront-header-content">
          {store.logoUrl && (
            <img
              src={store.logoUrl}
              alt={store.businessName}
              className="storefront-logo"
            />
          )}
          <h1 className="storefront-title">{store.businessName}</h1>

          <div className="storefront-info">
            {store.address && (
              <div className="storefront-info-item">
                <MapPin size={16} />
                <span>{store.address}</span>
              </div>
            )}
            {store.whatsappNumber && (
              <button
                onClick={handleWhatsAppContact}
                className="btn-whatsapp"
              >
                <Phone size={16} />
                Contact on WhatsApp
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="storefront-main">
        {/* Search and Filter */}
        <div className="storefront-controls">
          <div className="search-box">
            <Search size={20} />
            <input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          {categories.length > 2 && (
            <div className="category-filter">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat === 'all' ? 'All Products' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="storefront-empty">
            <ShoppingBag size={64} strokeWidth={1} />
            <h3>No products available</h3>
            <p>
              {searchQuery
                ? 'Try a different search term'
                : 'Check back soon for new items!'}
            </p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                {/* Clickable area for product details */}
                <div
                  onClick={() => setSelectedProduct(product)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Enhanced Product Image */}
                  {product.imageHash ? (
                    <div style={{ marginBottom: '12px' }}>
                      <SmartPicture
                        contentHash={product.imageHash}
                        alt={product.name}
                        width={800}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 400px"
                        className="product-grid-image"
                      />
                    </div>
                  ) : product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '240px',
                        objectFit: 'cover',
                        objectPosition: 'center',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '12px',
                        backgroundColor: '#f8fafc',
                        imageRendering: 'high-quality'
                      }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '240px',
                      background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      borderRadius: '8px 8px 0 0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <Camera size={56} color="#9ca3af" strokeWidth={1.5} />
                      <span style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontWeight: 500
                      }}>No image</span>
                    </div>
                  )}

                  <div className="product-card-header">
                    <h3 className="product-name">{product.name}</h3>
                    {product.category && (
                      <span className="product-category">{product.category}</span>
                    )}
                  </div>

                  <div className="product-card-body">
                    <div className="product-price">
                      {currencyNGN(product.sellKobo)}
                    </div>

                    <div className="product-stock">
                      {product.qty > 10 ? (
                        <span className="stock-badge stock-available">In Stock</span>
                      ) : product.qty > 0 ? (
                        <span className="stock-badge stock-low">Only {product.qty} left</span>
                      ) : (
                        <span className="stock-badge stock-out">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons - not part of clickable area */}
                {product.qty > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Add to cart clicked for:', product.name);
                        try {
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.sellKobo,
                            imageUrl: product.imageUrl,
                            imageHash: product.imageHash,
                            category: product.category,
                            maxQty: product.qty
                          });
                          console.log('Item added successfully');
                          // Open cart to show visual feedback
                          openCart();
                        } catch (error) {
                          console.error('Error adding to cart:', error);
                          alert('Failed to add item to cart');
                        }
                      }}
                      className="btn-add-to-cart"
                    >
                      <Plus size={18} />
                      Add to Cart
                    </button>

                    {store.whatsappNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          let phone = store.whatsappNumber!.replace(/\D/g, '');
                          if (phone.startsWith('0')) {
                            phone = '234' + phone.substring(1);
                          } else if (!phone.startsWith('234')) {
                            phone = '234' + phone;
                          }
                          const message = `Hi, I'm interested in ordering *${product.name}* (${currencyNGN(product.sellKobo)})`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="btn-quick-order"
                      >
                        <Phone size={18} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payment Details Section */}
      {(store.bankName || store.accountNumber || store.acceptedPaymentMethods?.length) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.75rem' }}>💳</span>
            Payment Information
          </h2>

          {/* Bank Account Details */}
          {(store.bankName || store.accountNumber || store.accountName) && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              border: '2px solid #bae6fd'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#0369a1',
                marginBottom: '1rem'
              }}>
                Bank Account Details
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {store.bankName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Bank Name:</span>
                    <strong style={{ color: '#0c4a6e', fontSize: '1rem' }}>{store.bankName}</strong>
                  </div>
                )}
                {store.accountNumber && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Account Number:</span>
                    <strong
                      style={{
                        color: '#0c4a6e',
                        fontSize: '1.25rem',
                        fontFamily: 'monospace',
                        letterSpacing: '2px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        navigator.clipboard.writeText(store.accountNumber || '');
                        alert('Account number copied!');
                      }}
                      title="Click to copy"
                    >
                      {store.accountNumber}
                    </strong>
                  </div>
                )}
                {store.accountName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Account Name:</span>
                    <strong style={{ color: '#0c4a6e', fontSize: '1rem' }}>{store.accountName}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Accepted Payment Methods */}
          {store.acceptedPaymentMethods && store.acceptedPaymentMethods.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1e293b',
                marginBottom: '1rem'
              }}>
                Accepted Payment Methods
              </h3>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                {store.acceptedPaymentMethods.map(method => (
                  <span
                    key={method}
                    style={{
                      padding: '8px 16px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: '20px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>✓</span>
                    {method}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          {store.paymentInstructions && (
            <div style={{
              padding: '1rem',
              background: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '8px',
              color: '#92400e',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>📝 Payment Instructions:</strong>
              {store.paymentInstructions}
            </div>
          )}
        </section>
      )}

      {/* Delivery Information Section */}
      {(store.deliveryAreas?.length || store.deliveryFee || store.deliveryTime) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.75rem' }}>🚚</span>
            Delivery Information
          </h2>

          {store.deliveryAreas && store.deliveryAreas.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem' }}>
                We Deliver To:
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {store.deliveryAreas.map(area => (
                  <span
                    key={area}
                    style={{
                      padding: '8px 16px',
                      background: '#fef3c7',
                      color: '#92400e',
                      borderRadius: '20px',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    📍 {area}
                  </span>
                ))}
              </div>
            </div>
          )}

          {store.deliveryFee && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
              <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>💰 Delivery Fee:</strong>
              <span style={{ color: '#475569' }}>{store.deliveryFee}</span>
            </div>
          )}

          {store.deliveryTime && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f1f5f9', borderRadius: '8px' }}>
              <strong style={{ color: '#1e293b', display: 'block', marginBottom: '0.5rem' }}>⏱️ Delivery Time:</strong>
              <span style={{ color: '#475569' }}>{store.deliveryTime}</span>
            </div>
          )}

          {store.minimumOrder && (
            <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '8px' }}>
              <strong style={{ color: '#1e40af', display: 'block', marginBottom: '0.5rem' }}>📦 Minimum Order:</strong>
              <span style={{ color: '#1e40af' }}>{store.minimumOrder}</span>
            </div>
          )}
        </section>
      )}

      {/* Business Hours Section */}
      {(store.businessHours || store.daysOfOperation?.length) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.75rem' }}>⏰</span>
            Business Hours
          </h2>

          {store.businessHours && (
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                padding: '1.5rem 2rem',
                background: 'linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%)',
                borderRadius: '12px',
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#5b21b6'
              }}>
                {store.businessHours}
              </div>
            </div>
          )}

          {store.daysOfOperation && store.daysOfOperation.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', textAlign: 'center' }}>
                Open Days:
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                {store.daysOfOperation.map(day => (
                  <span
                    key={day}
                    style={{
                      padding: '10px 20px',
                      background: '#8b5cf6',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Social Media Section */}
      {(store.instagramUrl || store.facebookUrl || store.tiktokUrl || store.twitterUrl) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '1.75rem' }}>📱</span>
            Follow Us On Social Media
          </h2>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center' }}>
            {store.instagramUrl && (
              <a
                href={store.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #f56040 0%, #e1306c 100%)',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                📷 Instagram
              </a>
            )}

            {store.facebookUrl && (
              <a
                href={store.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: '#1877f2',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                👍 Facebook
              </a>
            )}

            {store.tiktokUrl && (
              <a
                href={store.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: '#000000',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                🎵 TikTok
              </a>
            )}

            {store.twitterUrl && (
              <a
                href={store.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: '#1da1f2',
                  color: 'white',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                🐦 Twitter
              </a>
            )}
          </div>
        </section>
      )}

      {/* About Us Section */}
      {store.aboutUs && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.75rem' }}>📖</span>
            About Us
          </h2>

          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
            borderRadius: '12px',
            fontSize: '1rem',
            lineHeight: 1.8,
            color: '#064e3b',
            whiteSpace: 'pre-wrap'
          }}>
            {store.aboutUs}
          </div>
        </section>
      )}

      {/* Return Policy Section */}
      {store.returnPolicy && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '2rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1e293b',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.75rem' }}>🔄</span>
            Return & Refund Policy
          </h2>

          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
            borderRadius: '12px',
            borderLeft: '4px solid #f97316',
            fontSize: '0.95rem',
            lineHeight: 1.8,
            color: '#7c2d12',
            whiteSpace: 'pre-wrap'
          }}>
            {store.returnPolicy}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="storefront-footer">
        <p>Powered by <strong>Storehouse</strong></p>
        <p className="footer-note">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
        </p>
      </footer>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="product-modal-overlay"
          onClick={() => setSelectedProduct(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <div
            className="product-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                transition: 'all 0.2s',
                backdropFilter: 'blur(10px)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <X size={24} />
            </button>

            {/* Large Product Image */}
            {selectedProduct.imageHash ? (
              <div style={{
                borderRadius: '16px 16px 0 0',
                backgroundColor: '#f8fafc',
                padding: '20px'
              }}>
                <SmartPicture
                  contentHash={selectedProduct.imageHash}
                  alt={selectedProduct.name}
                  width={1600}
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority={true}
                  className="product-modal-image"
                />
              </div>
            ) : selectedProduct.imageUrl ? (
              <img
                src={selectedProduct.imageUrl}
                alt={selectedProduct.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  borderRadius: '16px 16px 0 0',
                  backgroundColor: '#f8fafc',
                  padding: '20px'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '300px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: '16px 16px 0 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}>
                <Camera size={80} color="#9ca3af" strokeWidth={1.5} />
                <span style={{
                  fontSize: '16px',
                  color: '#94a3b8',
                  fontWeight: 500
                }}>No image available</span>
              </div>
            )}

            {/* Product Details */}
            <div style={{ padding: '24px' }}>
              {/* Product Name */}
              <h2 style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#1e293b',
                marginBottom: '8px',
                lineHeight: 1.3
              }}>
                {selectedProduct.name}
              </h2>

              {/* Category Badge */}
              {selectedProduct.category && (
                <span style={{
                  display: 'inline-block',
                  padding: '6px 14px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginBottom: '20px'
                }}>
                  {selectedProduct.category}
                </span>
              )}

              {/* Price */}
              <div style={{
                fontSize: '36px',
                fontWeight: 800,
                color: store?.primaryColor || '#2563eb',
                marginBottom: '16px',
                letterSpacing: '-0.02em'
              }}>
                {currencyNGN(selectedProduct.sellKobo)}
              </div>

              {/* Stock Status */}
              <div style={{ marginBottom: '24px' }}>
                {selectedProduct.qty > 10 ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#16a34a'
                    }}></span>
                    In Stock
                  </div>
                ) : selectedProduct.qty > 0 ? (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#f59e0b'
                    }}></span>
                    Only {selectedProduct.qty} left
                  </div>
                ) : (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#dc2626'
                    }}></span>
                    Out of Stock
                  </div>
                )}
              </div>

              {/* Order Button */}
              {store?.whatsappNumber && selectedProduct.qty > 0 && (
                <button
                  onClick={() => {
                    let phone = store.whatsappNumber!.replace(/\D/g, '');
                    if (phone.startsWith('0')) {
                      phone = '234' + phone.substring(1);
                    } else if (!phone.startsWith('234')) {
                      phone = '234' + phone;
                    }
                    const message = `Hi, I'm interested in ordering *${selectedProduct.name}* (${currencyNGN(selectedProduct.sellKobo)})`;
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    backgroundColor: '#25D366',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#20BA5A';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(37, 211, 102, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#25D366';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(37, 211, 102, 0.3)';
                  }}
                >
                  <Phone size={20} />
                  Order via WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {store && <Cart store={store} />}
    </div>
  );
}

// Wrap with CartProvider
export default function StorefrontPage() {
  return (
    <CartProvider>
      <StorefrontContent />
    </CartProvider>
  );
}
