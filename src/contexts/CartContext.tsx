/**
 * Cart Context
 * Manages shopping cart state for storefront
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number; // Price in kobo
  quantity: number;
  imageUrl?: string;
  imageHash?: string;
  category?: string;
  maxQty: number; // Available stock
  attributes?: Record<string, any>; // Category-specific attributes
  variantId?: string; // Selected variant ID (if product has variants)
  variantName?: string; // Selected variant name for display
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (product: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('storefront_cart');
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart from localStorage');
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('storefront_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: Omit<CartItem, 'quantity'>) => {
    setItems(current => {
      // Use composite key: productId + variantId
      const existingItem = current.find(item =>
        item.id === product.id &&
        (item.variantId || null) === (product.variantId || null)
      );

      if (existingItem) {
        // Increase quantity if not exceeding max stock
        if (existingItem.quantity < product.maxQty) {
          return current.map(item =>
            item.id === product.id && (item.variantId || null) === (product.variantId || null)
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return current; // Max stock reached
      }

      // Add new item with quantity 1
      return [...current, { ...product, quantity: 1 }];
    });
  };

  const removeItem = (productId: string, variantId?: string) => {
    setItems(current => current.filter(item =>
      !(item.id === productId && (item.variantId || null) === (variantId || null))
    ));
  };

  const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
    if (quantity <= 0) {
      removeItem(productId, variantId);
      return;
    }

    setItems(current =>
      current.map(item => {
        if (item.id === productId && (item.variantId || null) === (variantId || null)) {
          // Don't exceed available stock
          const newQuantity = Math.min(quantity, item.maxQty);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalPrice,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
