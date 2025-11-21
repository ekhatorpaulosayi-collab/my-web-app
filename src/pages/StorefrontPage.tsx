/**
 * Public Storefront Page
 * Customer-facing product catalog
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, ShoppingBag, Phone, MapPin, ArrowLeft, Camera, X, ShoppingCart, Plus, Share2 } from 'lucide-react';
import { currencyNGN } from '../utils/format';
import type { StoreProfile } from '../types';
import type { ProductVariant } from '../types/variants';
import { OptimizedImage } from '../components/OptimizedImage';
import { CartProvider, useCart } from '../contexts/CartContext';
import { Cart } from '../components/Cart';
import { VariantSelector } from '../components/VariantSelector';
import { getDisplayFields, formatAttributeValue, getAttributeIcon } from '../config/categoryAttributes';
import { shareProductToWhatsApp } from '../utils/shareToWhatsApp';
import { getProductVariants } from '../lib/supabase-variants';
import '../styles/storefront.css';

interface Product {
  id: string;
  name: string;
  selling_price: number; // Now in kobo from Supabase
  quantity: number;
  category?: string;
  description?: string;
  is_public: boolean;
  image_url?: string;
  image_thumbnail?: string;
  attributes?: Record<string, any>;
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
  const [selectedProductVariants, setSelectedProductVariants] = useState<ProductVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);

  // Load store data and products
  useEffect(() => {
    const loadStorefront = async () => {
      try {
        // Determine how to lookup the store based on URL
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isStorehouseApp = hostname.endsWith('.storehouse.app') || hostname === 'storehouse.app';

        let storeData = null;
        let storeError = null;

        // Strategy 1: Custom domain (e.g., mybusiness.com)
        if (!isLocalhost && !isStorehouseApp) {
          console.log('[Storefront] Trying custom domain lookup:', hostname);
          const result = await supabase
            .from('stores')
            .select('*')
            .eq('custom_domain', hostname)
            .eq('custom_domain_verified', true)
            .eq('is_public', true)
            .single();

          storeData = result.data;
          storeError = result.error;
        }

        // Strategy 2: Subdomain (e.g., myshop.storehouse.app)
        if (!storeData && isStorehouseApp && hostname !== 'storehouse.app') {
          const subdomain = hostname.split('.')[0];
          console.log('[Storefront] Trying subdomain lookup:', subdomain);
          const result = await supabase
            .from('stores')
            .select('*')
            .eq('subdomain', subdomain)
            .eq('is_public', true)
            .single();

          storeData = result.data;
          storeError = result.error;
        }

        // Strategy 3: Path-based slug (e.g., /store/myshop) - fallback for localhost and default domain
        if (!storeData && slug) {
          console.log('[Storefront] Trying slug lookup:', slug);
          const result = await supabase
            .from('stores')
            .select('*')
            .eq('store_slug', slug)
            .eq('is_public', true)
            .single();

          storeData = result.data;
          storeError = result.error;
        }

        // Handle errors

        if (storeError || !storeData) {
          console.error('[Storefront] Store not found:', storeError);
          setError('Store not found');
          setLoading(false);
          return;
        }

        console.log('[Storefront] Store found:', storeData.business_name);

        // Convert snake_case to camelCase for StoreProfile compatibility
        const store: StoreProfile = {
          id: storeData.id,
          businessName: storeData.business_name,
          whatsappNumber: storeData.whatsapp_number,
          address: storeData.address,
          logoUrl: storeData.logo_url,
          primaryColor: storeData.primary_color,
          isPublic: storeData.is_public,
        } as StoreProfile;

        setStore(store);

        // 2. Get public products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', storeData.user_id)
          .eq('is_public', true)
          .eq('is_active', true)
          .gt('quantity', 0)
          .order('name');

        if (productsError) {
          console.error('[Storefront] Error loading products:', productsError);
        }

        console.log('[Storefront] Products loaded:', productsData?.length || 0, 'products');

        const publicProducts = (productsData || []).map(product => ({
          id: product.id,
          name: product.name,
          selling_price: product.selling_price,
          quantity: product.quantity,
          category: product.category,
          is_public: product.is_public,
          image_url: product.image_url,
          image_thumbnail: product.image_thumbnail,
        })) as Product[];

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

  // Load variants when product is selected for detail view
  useEffect(() => {
    const loadVariants = async () => {
      if (!selectedProduct) {
        setSelectedProductVariants([]);
        setSelectedVariant(null);
        return;
      }

      try {
        const variants = await getProductVariants(selectedProduct.id);
        setSelectedProductVariants(variants);
        console.log('[Storefront] Loaded', variants.length, 'variants for', selectedProduct.name);
      } catch (error) {
        console.error('[Storefront] Error loading variants:', error);
        setSelectedProductVariants([]);
      }
    };

    loadVariants();
  }, [selectedProduct]);

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
                  {/* Product Image - Click to zoom full-screen directly */}
                  {product.image_thumbnail || product.image_url ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewerImageUrl(product.image_url || product.image_thumbnail || null);
                        setImageViewerOpen(true);
                      }}
                      style={{
                        position: 'relative',
                        cursor: 'zoom-in',
                        borderRadius: '8px 8px 0 0',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        width: '100%',
                        height: '240px',
                        backgroundColor: '#f3f4f6'
                      }}
                    >
                      <img
                        src={product.image_url || product.image_thumbnail}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {/* Zoom badge - highly visible */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(59, 130, 246, 0.95)',
                        color: 'white',
                        padding: '8px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}>
                        🔍 ZOOM
                      </div>
                    </div>
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
                      {currencyNGN(product.selling_price)}
                    </div>

                    {/* Category-Specific Attributes */}
                    {product.attributes && Object.keys(product.attributes).length > 0 && (() => {
                      const displayFieldKeys = getDisplayFields(product.category);
                      const attributesToShow = displayFieldKeys
                        .map(key => ({
                          key,
                          value: product.attributes?.[key],
                          icon: getAttributeIcon(product.category, key)
                        }))
                        .filter(attr => attr.value);

                      if (attributesToShow.length === 0) return null;

                      return (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '12px'
                        }}>
                          {attributesToShow.map(attr => (
                            <span
                              key={attr.key}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                background: '#f3f4f6',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#6b7280'
                              }}
                            >
                              <span style={{ fontSize: '14px' }}>{attr.icon}</span>
                              <span>{formatAttributeValue(attr.key, attr.value)}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    <div className="product-stock">
                      {product.quantity > 10 ? (
                        <span className="stock-badge stock-available">In Stock</span>
                      ) : product.quantity > 0 ? (
                        <span className="stock-badge stock-low">Only {product.quantity} left</span>
                      ) : (
                        <span className="stock-badge stock-out">Out of Stock</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons - not part of clickable area */}
                {product.quantity > 0 && (
                  <div style={{ display: 'flex', gap: '0.75rem', padding: '0 1.5rem 1.5rem' }}>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        console.log('Add to cart clicked for:', product.name);

                        // Check if product has variants
                        try {
                          const variants = await getProductVariants(product.id);
                          if (variants.length > 0) {
                            // Product has variants - open detail modal
                            setSelectedProduct(product);
                            return;
                          }

                          // No variants - add directly to cart
                          addItem({
                            id: product.id,
                            name: product.name,
                            price: product.selling_price,
                            imageUrl: product.image_url,
                            category: product.category,
                            maxQty: product.quantity,
                            attributes: product.attributes || {}
                          });
                          console.log('Item added successfully');
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
                          const message = `Hi, I'm interested in ordering *${product.name}* (${currencyNGN(product.selling_price)})`;
                          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
                        }}
                        className="btn-quick-order"
                      >
                        <Phone size={18} />
                      </button>
                    )}

                    {/* Share to WhatsApp Status Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const productUrl = `${window.location.origin}/store/${slug}`;
                        shareProductToWhatsApp({
                          name: product.name,
                          price: product.selling_price,
                          selling_price: product.selling_price,
                          description: product.description,
                          category: product.category,
                          quantity: product.quantity
                        }, productUrl);
                      }}
                      className="btn-share"
                      title="Share to WhatsApp Status"
                      style={{
                        padding: '0.75rem',
                        backgroundColor: '#25d366',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontWeight: 600,
                        fontSize: '14px',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#20ba5a';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 211, 102, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#25d366';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 211, 102, 0.2)';
                      }}
                    >
                      <Share2 size={18} />
                    </button>
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
            padding: '10px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-in-out',
            border: 'none',
            outline: 'none'
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
              maxHeight: '95vh',
              overflow: 'hidden',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out',
              border: 'none',
              outline: 'none',
              borderTop: 'none',
              boxSizing: 'border-box'
            }}
          >
            {/* Close Button - Mobile optimized with larger touch target */}
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                border: '2px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                color: '#000000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                transition: 'all 0.2s',
                outline: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onTouchEnd={(e) => {
                setTimeout(() => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.color = '#000000';
                  e.currentTarget.style.borderColor = '#e5e7eb';
                }, 150);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.backgroundColor = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.color = '#000000';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              <X size={28} strokeWidth={2.5} />
            </button>

            {/* Large Product Image - Click to view full screen */}
            {selectedProduct.image_thumbnail || selectedProduct.image_url ? (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('[Storefront] Image clicked, opening viewer');
                  setViewerImageUrl(selectedProduct.image_url || selectedProduct.image_thumbnail || null);
                  setImageViewerOpen(true);
                }}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '20px',
                  width: '100%',
                  cursor: 'zoom-in',
                  position: 'relative',
                  userSelect: 'none',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none'
                }}
              >
                <img
                  src={selectedProduct.image_url || selectedProduct.image_thumbnail}
                  alt={selectedProduct.name}
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    objectFit: 'contain'
                  }}
                />
              </div>
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
                {currencyNGN(
                  selectedVariant?.price_override || selectedProduct.selling_price
                )}
              </div>

              {/* Product Description */}
              {selectedProduct.description && (
                <div style={{
                  marginBottom: '24px',
                  padding: '16px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}>
                  <p style={{
                    fontSize: '15px',
                    lineHeight: '1.7',
                    color: '#6b7280',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedProduct.description}
                  </p>
                </div>
              )}

              {/* Variant Selector */}
              {selectedProductVariants.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1f2937',
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Select Options
                  </h3>
                  <VariantSelector
                    variants={selectedProductVariants}
                    onVariantChange={setSelectedVariant}
                    primaryColor={store?.primaryColor || '#3b82f6'}
                  />
                </div>
              )}

              {/* Stock Status */}
              <div style={{ marginBottom: '24px' }}>
                {selectedProduct.quantity > 10 ? (
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
                ) : selectedProduct.quantity > 0 ? (
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
                    Only {selectedProduct.quantity} left
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

              {/* All Product Attributes */}
              {selectedProduct.attributes && Object.keys(selectedProduct.attributes).length > 0 && (
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#1f2937',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Product Details
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px'
                  }}>
                    {Object.entries(selectedProduct.attributes)
                      .filter(([_, value]) => value)
                      .map(([key, value]) => (
                        <div
                          key={key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 12px',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}
                        >
                          <span style={{ fontSize: '18px' }}>
                            {getAttributeIcon(selectedProduct.category, key)}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#6b7280',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '2px'
                            }}>
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <div style={{
                              fontSize: '14px',
                              color: '#1f2937',
                              fontWeight: 600
                            }}>
                              {formatAttributeValue(key, value)}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Add to Cart Button */}
              {selectedProduct.quantity > 0 && (
                <button
                  onClick={() => {
                    // Check if product has variants but none selected
                    if (selectedProductVariants.length > 0 && !selectedVariant) {
                      alert('Please select product options first');
                      return;
                    }

                    // Check if selected variant is out of stock
                    if (selectedVariant && selectedVariant.quantity === 0) {
                      alert('This option is out of stock');
                      return;
                    }

                    try {
                      const itemToAdd = selectedVariant
                        ? {
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            price: selectedVariant.price_override || selectedProduct.selling_price,
                            imageUrl: selectedVariant.image_url || selectedProduct.image_url,
                            category: selectedProduct.category,
                            maxQty: selectedVariant.quantity,
                            attributes: selectedProduct.attributes || {},
                            variantId: selectedVariant.id,
                            variantName: selectedVariant.variant_name,
                          }
                        : {
                            id: selectedProduct.id,
                            name: selectedProduct.name,
                            price: selectedProduct.selling_price,
                            imageUrl: selectedProduct.image_url,
                            category: selectedProduct.category,
                            maxQty: selectedProduct.quantity,
                            attributes: selectedProduct.attributes || {},
                          };

                      addItem(itemToAdd);
                      openCart();
                      setSelectedProduct(null); // Close modal
                    } catch (error) {
                      console.error('Error adding to cart:', error);
                      alert('Failed to add item to cart');
                    }
                  }}
                  disabled={selectedProductVariants.length > 0 && !selectedVariant}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    backgroundColor: (selectedProductVariants.length > 0 && !selectedVariant)
                      ? '#9ca3af'
                      : store?.primaryColor || '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: (selectedProductVariants.length > 0 && !selectedVariant) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                    marginBottom: '12px'
                  }}
                  onMouseEnter={(e) => {
                    if (!(selectedProductVariants.length > 0 && !selectedVariant)) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  <ShoppingCart size={20} />
                  {selectedProductVariants.length > 0 && !selectedVariant
                    ? 'Select Options First'
                    : 'Add to Cart'}
                </button>
              )}

              {/* Order via WhatsApp Button */}
              {store?.whatsappNumber && selectedProduct.quantity > 0 && (
                <button
                  onClick={() => {
                    let phone = store.whatsappNumber!.replace(/\D/g, '');
                    if (phone.startsWith('0')) {
                      phone = '234' + phone.substring(1);
                    } else if (!phone.startsWith('234')) {
                      phone = '234' + phone;
                    }

                    const variantInfo = selectedVariant ? ` - ${selectedVariant.variant_name}` : '';
                    const price = selectedVariant?.price_override || selectedProduct.selling_price;
                    const message = `Hi, I'm interested in ordering *${selectedProduct.name}${variantInfo}* (${currencyNGN(price)})`;
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

              {/* Share to WhatsApp Status */}
              <button
                onClick={() => {
                  const productUrl = `${window.location.origin}/store/${slug}`;
                  shareProductToWhatsApp({
                    name: selectedProduct.name,
                    price: selectedProduct.selling_price,
                    selling_price: selectedProduct.selling_price,
                    description: selectedProduct.description,
                    category: selectedProduct.category,
                    quantity: selectedProduct.quantity
                  }, productUrl);
                }}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  backgroundColor: 'white',
                  color: '#25d366',
                  border: '2px solid #25d366',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  transition: 'all 0.2s',
                  marginTop: '12px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                  e.currentTarget.style.borderColor = '#20ba5a';
                  e.currentTarget.style.color = '#20ba5a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#25d366';
                  e.currentTarget.style.color = '#25d366';
                }}
              >
                <Share2 size={20} />
                Share to WhatsApp Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Image Viewer */}
      {imageViewerOpen && viewerImageUrl && (
        <div
          onClick={() => setImageViewerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            cursor: 'zoom-out',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          <OptimizedImage
            src={viewerImageUrl}
            alt="Product image"
            width={1600}
            height={1600}
            sizes="100vw"
            objectFit="contain"
            priority={true}
            style={{
              maxWidth: '95vw',
              maxHeight: '95vh',
              objectFit: 'contain'
            }}
          />
          {/* Close hint */}
          <div style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#1f2937',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            pointerEvents: 'none'
          }}>
            Click anywhere to close
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
