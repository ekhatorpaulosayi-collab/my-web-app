/**
 * Public Storefront Page
 * Customer-facing product catalog
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Search, ShoppingBag, Phone, MapPin, ArrowLeft, Camera, X, ShoppingCart, Plus, Share2, ChevronDown, ChevronUp, Copy, Check, Heart } from 'lucide-react';
import { currencyNGN } from '../utils/format';
import type { StoreProfile, PaymentMethod } from '../types';
import type { ProductVariant } from '../types/variants';
import { OptimizedImage } from '../components/OptimizedImage';
import { CartProvider, useCart } from '../contexts/CartContext';
import { Cart } from '../components/Cart';
import { VariantSelector } from '../components/VariantSelector';
import { getDisplayFields, formatAttributeValue, getAttributeIcon } from '../config/categoryAttributes';
import { shareProductToWhatsApp } from '../utils/shareToWhatsApp';
import { getProductVariants } from '../lib/supabase-variants';
import ProductImageGallery from '../components/ProductImageGallery';
import ReviewForm from '../components/ReviewForm';
import ReviewList from '../components/ReviewList';
import { getProductReviewStats, type ReviewStats } from '../services/reviewService';
import AIChatWidget from '../components/AIChatWidget';
import { ShareButton } from '../components/ProductShareMenu';
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

// Payment method provider configurations
const PAYMENT_PROVIDERS: Record<string, { name: string; icon: string; color: string }> = {
  opay: { name: 'OPay', icon: '🟢', color: '#00C087' },
  moniepoint: { name: 'Moniepoint', icon: '🔵', color: '#0066FF' },
  palmpay: { name: 'PalmPay', icon: '🟣', color: '#8B5CF6' },
  kuda: { name: 'Kuda Bank', icon: '🟣', color: '#8B5CF6' },
  bank: { name: 'Bank Account', icon: '🏦', color: '#3B82F6' },
  other: { name: 'Other', icon: '💳', color: '#6B7280' }
};

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

  // Review states
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [productReviewStats, setProductReviewStats] = useState<Map<string, ReviewStats>>(new Map());

  // Collapsible section states (default to collapsed for simpler UX)
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [socialExpanded, setSocialExpanded] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [returnPolicyExpanded, setReturnPolicyExpanded] = useState(false);
  const [copiedAccountId, setCopiedAccountId] = useState<string | null>(null);

  // Load review stats for products
  const loadReviewStats = async (products: Product[]) => {
    const statsMap = new Map<string, ReviewStats>();

    // Load stats for each product (in parallel for performance)
    await Promise.all(
      products.map(async (product) => {
        const result = await getProductReviewStats(product.id);
        if (result.success && result.stats) {
          statsMap.set(product.id, result.stats);
        }
      })
    );

    setProductReviewStats(statsMap);
  };

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
          aboutUs: storeData.about_us,
          returnPolicy: storeData.return_policy,
          deliveryAreas: storeData.delivery_areas,
          deliveryTime: storeData.delivery_time,
          businessHours: storeData.business_hours,
          // Bank details for checkout
          bankName: storeData.bank_name,
          accountNumber: storeData.account_number,
          accountName: storeData.account_name,
          // Payment methods for checkout
          payment_methods: storeData.payment_methods,
          // Paystack
          paystackEnabled: storeData.paystack_enabled,
          paystackPublicKey: storeData.paystack_public_key,
          paystackTestMode: storeData.paystack_test_mode,
        } as StoreProfile;

        setStore(store);

        // 2. Get public products with primary images
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            product_images(image_url, is_primary)
          `)
          .eq('user_id', storeData.user_id)
          .eq('is_public', true)
          .eq('is_active', true)
          .gt('quantity', 0)
          .order('name');

        if (productsError) {
          console.error('[Storefront] Error loading products:', productsError);
        }

        console.log('[Storefront] Products loaded:', productsData?.length || 0, 'products');

        const publicProducts = (productsData || []).map(product => {
          // Get primary image or first image
          const primaryImage = Array.isArray(product.product_images)
            ? product.product_images.find((img: any) => img.is_primary)?.image_url ||
              product.product_images[0]?.image_url
            : null;

          return {
            id: product.id,
            name: product.name,
            selling_price: product.selling_price,
            quantity: product.quantity,
            category: product.category,
            is_public: product.is_public,
            image_url: primaryImage || product.image_url,
            image_thumbnail: primaryImage || product.image_thumbnail,
          };
        }) as Product[];

        setProducts(publicProducts);

        // Load review stats for all products
        loadReviewStats(publicProducts);

        setLoading(false);
      } catch (err) {
        console.error('[Storefront] Error loading store:', err);
        setError('Failed to load store');
        setLoading(false);
      }
    };

    loadStorefront();
  }, [slug]);

  // Auto-open product from URL parameter (for shared links)
  useEffect(() => {
    if (!products.length || loading) return;

    // Check if URL has ?product=ID parameter
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');

    if (productId && !selectedProduct) {
      console.log('[Storefront] Auto-opening product from URL:', productId);

      // Find the product by ID
      const product = products.find(p => p.id === productId);

      if (product) {
        console.log('[Storefront] Product found, opening modal:', product.name);
        setSelectedProduct(product);

        // Clean URL after opening product (optional - makes URL cleaner)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } else {
        console.warn('[Storefront] Product not found in store:', productId);
      }
    }
  }, [products, loading, selectedProduct]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedProduct) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedProduct]);

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
        {/* Cart Button - High Visibility (Matches Close Button Style) */}
        <button
          onClick={openCart}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            background: '#1e293b',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
          }}
        >
          <ShoppingCart size={24} strokeWidth={2.5} />
          {itemCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '22px',
              height: '22px',
              padding: '0 5px',
              background: '#ef4444',
              color: 'white',
              borderRadius: '11px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
              border: '2px solid #1e293b'
            }}>
              {itemCount}
            </span>
          )}
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
                      {/* Stock Badge Overlays - Industry Standard UX */}
                      {product.quantity === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'rgba(0, 0, 0, 0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '8px 8px 0 0',
                          zIndex: 1
                        }}>
                          <span style={{
                            background: '#ef4444',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '14px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                          }}>
                            OUT OF STOCK
                          </span>
                        </div>
                      )}

                      {product.quantity > 0 && product.quantity <= 10 && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: '#f59e0b',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          fontSize: '12px',
                          zIndex: 1,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          Only {product.quantity} left!
                        </div>
                      )}

                      <img
                        src={product.image_url || product.image_thumbnail}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          opacity: product.quantity === 0 ? 0.6 : 1
                        }}
                      />
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
                    {/* Category badge hidden for cleaner look - customers can use filter at top */}
                  </div>

                  <div className="product-card-body">
                    <div className="product-price">
                      {currencyNGN(product.selling_price)}
                    </div>

                    {/* Review Stars */}
                    {(() => {
                      const stats = productReviewStats.get(product.id);
                      if (stats && stats.total_reviews > 0) {
                        return (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill={star <= Math.round(stats.average_rating) ? '#fbbf24' : 'none'}
                                  stroke={star <= Math.round(stats.average_rating) ? '#fbbf24' : '#d1d5db'}
                                  strokeWidth="2"
                                >
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                              ))}
                            </div>
                            <span style={{
                              fontSize: '0.8125rem',
                              color: '#64748b',
                              fontWeight: 500
                            }}>
                              {stats.average_rating.toFixed(1)} ({stats.total_reviews})
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

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
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '0 1.5rem 1.5rem'
                  }}>
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

                          // Show toast notification - Industry standard UX
                          const toast = document.createElement('div');
                          toast.className = 'add-to-cart-toast';
                          toast.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <span>${product.name} added to cart!</span>
                          `;
                          document.body.appendChild(toast);
                          setTimeout(() => toast.classList.add('show'), 10);
                          setTimeout(() => {
                            toast.classList.remove('show');
                            setTimeout(() => toast.remove(), 300);
                          }, 2500);

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
                        className="btn-whatsapp"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1rem',
                          backgroundColor: '#25D366',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '14px',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 4px rgba(37, 211, 102, 0.2)',
                          width: '100%'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#20ba5a';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(37, 211, 102, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#25D366';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(37, 211, 102, 0.2)';
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Order via WhatsApp
                      </button>
                    )}

                    {/* Share Button - Instagram, WhatsApp, Facebook, TikTok */}
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '100%' }}>
                      <ShareButton
                        product={{
                          id: product.id,
                          name: product.name,
                          price: product.selling_price,
                          description: product.description,
                          imageUrl: product.image_url
                        }}
                        variant="full"
                        className="storefront-share-button"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Payment Methods Section - NEW Multi-Payment Support */}
      {(store.payment_methods?.filter(m => m.enabled).length || store.bankName || store.accountNumber) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setPaymentExpanded(!paymentExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.75rem' }}>💳</span>
              Payment Methods
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {paymentExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {paymentExpanded && (
            <div style={{ paddingTop: '1rem' }}>
              {/* Multi-Payment Methods Display */}
              {store.payment_methods && store.payment_methods.filter(m => m.enabled).length > 0 && (
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  {store.payment_methods
                    .filter(method => method.enabled)
                    .map(method => {
                      const provider = PAYMENT_PROVIDERS[method.type];
                      const displayName = method.label || provider?.name || method.type;

                      return (
                        <div
                          key={method.id}
                          style={{
                            padding: '1.5rem',
                            background: `linear-gradient(135deg, ${provider?.color}15 0%, ${provider?.color}08 100%)`,
                            border: `2px solid ${provider?.color}40`,
                            borderRadius: '12px',
                            transition: 'all 0.2s'
                          }}
                        >
                          {/* Header */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            marginBottom: '1rem'
                          }}>
                            <span style={{ fontSize: '1.75rem' }}>{provider?.icon}</span>
                            <h3 style={{
                              fontSize: '1.125rem',
                              fontWeight: 700,
                              color: '#1e293b',
                              margin: 0
                            }}>
                              {displayName}
                            </h3>
                          </div>

                          {/* Account Details */}
                          <div style={{
                            display: 'grid',
                            gap: '0.75rem',
                            padding: '1rem',
                            background: 'rgba(255, 255, 255, 0.8)',
                            borderRadius: '8px'
                          }}>
                            {method.bank_name && (
                              <div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#6b7280',
                                  marginBottom: '0.25rem',
                                  textTransform: 'uppercase',
                                  fontWeight: 600,
                                  letterSpacing: '0.05em'
                                }}>
                                  Bank Name
                                </div>
                                <div style={{
                                  fontSize: '0.9375rem',
                                  fontWeight: 600,
                                  color: '#1f2937'
                                }}>
                                  {method.bank_name}
                                </div>
                              </div>
                            )}

                            <div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                letterSpacing: '0.05em'
                              }}>
                                Account Number
                              </div>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                              }}>
                                <span style={{
                                  fontSize: '1.25rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace',
                                  letterSpacing: '2px',
                                  color: '#1f2937'
                                }}>
                                  {method.account_number}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(method.account_number);
                                    setCopiedAccountId(method.id);
                                    setTimeout(() => setCopiedAccountId(null), 2000);
                                  }}
                                  style={{
                                    padding: '8px',
                                    background: 'white',
                                    border: `2px solid ${provider?.color}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                  }}
                                  title="Copy account number"
                                >
                                  {copiedAccountId === method.id ? (
                                    <Check size={16} color={provider?.color} />
                                  ) : (
                                    <Copy size={16} color={provider?.color} />
                                  )}
                                </button>
                              </div>
                            </div>

                            <div>
                              <div style={{
                                fontSize: '0.75rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                                letterSpacing: '0.05em'
                              }}>
                                Account Name
                              </div>
                              <div style={{
                                fontSize: '0.9375rem',
                                fontWeight: 600,
                                color: '#1f2937'
                              }}>
                                {method.account_name}
                              </div>
                            </div>

                            {method.instructions && (
                              <div style={{
                                marginTop: '0.5rem',
                                padding: '0.75rem',
                                background: '#fef3c7',
                                borderRadius: '6px',
                                borderLeft: `4px solid ${provider?.color}`
                              }}>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#92400e',
                                  fontWeight: 700,
                                  marginBottom: '0.25rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  📝 Instructions
                                </div>
                                <div style={{
                                  fontSize: '0.875rem',
                                  color: '#78350f',
                                  lineHeight: 1.6,
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {method.instructions}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Legacy Bank Account (Backward Compatibility) */}
              {(store.bankName || store.accountNumber) && !store.payment_methods?.length && (
                <div style={{
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  marginBottom: '1.5rem',
                  border: '2px solid #bae6fd'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ fontSize: '1.75rem' }}>🏦</span>
                    <h3 style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      color: '#0369a1',
                      margin: 0
                    }}>
                      Bank Account
                    </h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {store.bankName && (
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Bank Name</span>
                        <div style={{ color: '#0c4a6e', fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem' }}>{store.bankName}</div>
                      </div>
                    )}
                    {store.accountNumber && (
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                          <strong style={{
                            color: '#0c4a6e',
                            fontSize: '1.25rem',
                            fontFamily: 'monospace',
                            letterSpacing: '2px'
                          }}>
                            {store.accountNumber}
                          </strong>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(store.accountNumber || '');
                              alert('Account number copied!');
                            }}
                            style={{
                              padding: '8px',
                              background: 'white',
                              border: '2px solid #3b82f6',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Copy account number"
                          >
                            <Copy size={16} color="#3b82f6" />
                          </button>
                        </div>
                      </div>
                    )}
                    {store.accountName && (
                      <div>
                        <span style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600 }}>Account Name</span>
                        <div style={{ color: '#0c4a6e', fontSize: '1rem', fontWeight: 600, marginTop: '0.25rem' }}>{store.accountName}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General Payment Instructions */}
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
                  <strong style={{ display: 'block', marginBottom: '0.5rem' }}>📝 General Payment Instructions:</strong>
                  {store.paymentInstructions}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Delivery Information Section */}
      {(store.deliveryAreas?.length || store.deliveryFee || store.deliveryTime) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setDeliveryExpanded(!deliveryExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.75rem' }}>🚚</span>
              Delivery Information
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {deliveryExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {deliveryExpanded && (
            <div style={{ paddingTop: '1rem' }}>

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
            </div>
          )}
        </section>
      )}

      {/* Business Hours Section */}
      {(store.businessHours || store.daysOfOperation?.length) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setHoursExpanded(!hoursExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.75rem' }}>⏰</span>
              Business Hours
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {hoursExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {hoursExpanded && (
            <div style={{ paddingTop: '1rem' }}>

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
            </div>
          )}
        </section>
      )}

      {/* Social Media Section */}
      {(store.instagramUrl || store.facebookUrl || store.tiktokUrl || store.twitterUrl) && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setSocialExpanded(!socialExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#667eea' }}>
                <path d="M17 2h-3a5 5 0 0 0-5 5v3H6v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
              </svg>
              Connect With Us
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {socialExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {socialExpanded && (
            <div style={{ paddingTop: '1rem' }}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            {store.instagramUrl && (
              <a
                href={store.instagramUrl.startsWith('http') ? store.instagramUrl : `https://instagram.com/${store.instagramUrl.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(225, 48, 108, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(225, 48, 108, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(225, 48, 108, 0.3)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                Instagram
              </a>
            )}

            {store.facebookUrl && (
              <a
                href={store.facebookUrl.startsWith('http') ? store.facebookUrl : `https://facebook.com/${store.facebookUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: '#1877f2',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(24, 119, 242, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(24, 119, 242, 0.4)';
                  e.currentTarget.style.background = '#1664d8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(24, 119, 242, 0.3)';
                  e.currentTarget.style.background = '#1877f2';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            )}

            {store.tiktokUrl && (
              <a
                href={store.tiktokUrl.startsWith('http') ? store.tiktokUrl : `https://tiktok.com/@${store.tiktokUrl.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: '#000000',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                  e.currentTarget.style.background = '#1a1a1a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.background = '#000000';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                TikTok
              </a>
            )}

            {store.twitterUrl && (
              <a
                href={store.twitterUrl.startsWith('http') ? store.twitterUrl : `https://twitter.com/${store.twitterUrl.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: '#000000',
                  color: 'white',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
                  e.currentTarget.style.background = '#1a1a1a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.background = '#000000';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X (Twitter)
              </a>
            )}
          </div>
            </div>
          )}
        </section>
      )}

      {/* About Us Section */}
      {store.aboutUs && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setAboutExpanded(!aboutExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.75rem' }}>📖</span>
              About Us
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {aboutExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {aboutExpanded && (
            <div style={{ paddingTop: '1rem' }}>

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
            </div>
          )}
        </section>
      )}

      {/* Return Policy Section */}
      {store.returnPolicy && (
        <section style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem 1.5rem',
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          marginTop: '2rem',
          marginBottom: '2rem'
        }}>
          {/* Collapsible Header */}
          <div
            onClick={() => setReturnPolicyExpanded(!returnPolicyExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '1rem 0',
              userSelect: 'none'
            }}
          >
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#1e293b',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '1.75rem' }}>🔄</span>
              Return & Refund Policy
            </h2>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                color: '#64748b'
              }}
            >
              {returnPolicyExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
            </button>
          </div>

          {/* Collapsible Content */}
          {returnPolicyExpanded && (
            <div style={{ paddingTop: '1rem' }}>

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
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="storefront-footer">
        <p>Powered by <strong>Storehouse</strong></p>
        <p className="footer-note">
          {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} available
        </p>
        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
          <a href="https://github.com/anthropics/storehouse/blob/main/TERMS_OF_SERVICE.md" target="_blank" rel="noopener noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>Terms of Service</a>
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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-in-out',
            border: 'none',
            outline: 'none',
            overflowY: 'auto'
          }}
        >
          <div
            className="product-modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              maxWidth: '800px',
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
            {/* Close Button - Professional Storehouse design */}
            <button
              onClick={() => setSelectedProduct(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '56px',
                height: '56px',
                border: 'none',
                backgroundColor: '#64748b',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                transition: 'all 0.2s ease',
                outline: 'none',
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                WebkitTapHighlightColor: 'transparent'
              }}
              onTouchStart={(e: React.TouchEvent) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(0.95)';
              }}
              onTouchEnd={(e: React.TouchEvent) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
              onMouseEnter={(e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#ef4444';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e: React.MouseEvent) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#64748b';
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
              <X size={28} strokeWidth={2.5} />
            </button>

            {/* Product Image Gallery */}
            <div style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              width: '100%'
            }}>
              <ProductImageGallery
                productId={selectedProduct.id}
                fallbackImage={selectedProduct.image_url || selectedProduct.image_thumbnail}
              />
            </div>

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

              {/* Share Button - Instagram, WhatsApp, Facebook, TikTok */}
              <div style={{ marginTop: '12px' }}>
                <ShareButton
                  product={{
                    id: selectedProduct.id,
                    name: selectedProduct.name,
                    price: selectedProduct.selling_price,
                    description: selectedProduct.description,
                    imageUrl: selectedProduct.image_url
                  }}
                  variant="full"
                  className="storefront-share-button-modal"
                />
              </div>

              {/* Customer Reviews Section */}
              <div style={{ marginTop: '2rem', borderTop: '1px solid #e5e7eb', paddingTop: '2rem' }}>
                <ReviewList
                  productId={selectedProduct.id}
                  onWriteReview={() => setShowReviewForm(true)}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Form Modal */}
      {showReviewForm && selectedProduct && store && (
        <ReviewForm
          productId={selectedProduct.id}
          productName={selectedProduct.name}
          storeUserId={store.id}
          onClose={() => setShowReviewForm(false)}
          onSubmitSuccess={() => {
            // Reload review stats after successful submission
            loadReviewStats(products);
          }}
        />
      )}

      {/* Full-Screen Image Viewer - Clean White (Storehouse Style) */}
      {imageViewerOpen && viewerImageUrl && (
        <div
          onClick={() => setImageViewerOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '80px 40px 40px',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          {/* Close Button - Maximum Visibility (Dark Button) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setImageViewerOpen(false);
            }}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#1e293b',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10001,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
            }}
          >
            <X size={28} strokeWidth={3} style={{ color: '#ffffff' }} />
          </button>

          {/* Image Container - Clean & Centered */}
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src={viewerImageUrl}
              alt="Product image"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '85%',
                maxHeight: '85%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                border: '1px solid #f1f5f9'
              }}
            />
          </div>

          {/* Product Name / Hint (Optional - Clean Design) */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 500,
            pointerEvents: 'none'
          }}>
            Click outside to close
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {store && <Cart store={store} />}

      {/* AI Shopping Assistant */}
      <AIChatWidget
        contextType="storefront"
        storeSlug={slug}
        storeInfo={store ? {
          businessName: store.businessName,
          aboutUs: store.aboutUs,
          address: store.address,
          whatsappNumber: store.whatsappNumber,
          deliveryAreas: store.deliveryAreas,
          deliveryTime: store.deliveryTime,
          businessHours: store.businessHours,
          returnPolicy: store.returnPolicy,
        } : undefined}
      />
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
