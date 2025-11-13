import React from 'react';
import { formatNGN } from '../../utils/currency';

export interface CartItem {
  id: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  stockAvailable: number;
}

interface CartDrawerProps {
  items: CartItem[];
  onChangeQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  onChangeQty,
  onRemove,
  onClose
}) => {
  const handleQtyChange = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = Math.max(1, Math.min(item.stockAvailable, item.quantity + delta));
    onChangeQty(id, newQty);
  };

  return (
    <div className="cart-drawer">
      <div className="cart-drawer-header">
        <h3>Cart Items</h3>
        <button
          type="button"
          className="cart-drawer-close"
          onClick={onClose}
          aria-label="Close cart"
        >
          ×
        </button>
      </div>

      <div className="cart-drawer-body">
        {items.length === 0 ? (
          <div className="cart-empty">
            <p>Your cart is empty</p>
            <p className="cart-empty-hint">Search and select items to add them to your cart</p>
          </div>
        ) : (
          <div className="cart-items">
            {items.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{formatNGN(item.price)} each</div>
                </div>

                <div className="cart-item-controls">
                  <div className="cart-qty-stepper">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(item.id, -1)}
                      disabled={item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="qty-input"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        onChangeQty(item.id, Math.max(1, Math.min(item.stockAvailable, val)));
                      }}
                      min="1"
                      max={item.stockAvailable}
                      aria-label="Quantity"
                    />
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(item.id, 1)}
                      disabled={item.quantity >= item.stockAvailable}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div className="cart-item-total">{formatNGN(item.price * item.quantity)}</div>

                  <button
                    type="button"
                    className="cart-remove-btn"
                    onClick={() => onRemove(item.id)}
                    aria-label={`Remove ${item.name}`}
                    title="Remove from cart"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
