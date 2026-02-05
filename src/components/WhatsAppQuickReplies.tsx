import React from 'react';
import { getWhatsAppUrl } from '../utils/whatsapp';

interface WhatsAppQuickRepliesProps {
  product: {
    id: string;
    name: string;
    selling_price: number;
    quantity: number;
    category?: string;
    description?: string;
  };
  storeInfo: {
    store_name: string;
    whatsapp_number: string;
  };
  className?: string;
}

interface QuickAction {
  icon: string;
  label: string;
  message: (product: any, store: any) => string;
  color: string;
}

const WhatsAppQuickReplies: React.FC<WhatsAppQuickRepliesProps> = ({
  product,
  storeInfo,
  className = ''
}) => {
  const formatPrice = (kobo: number) => {
    return `₦${(kobo / 100).toLocaleString()}`;
  };

  const quickActions: QuickAction[] = [
    {
      icon: '🛒',
      label: 'Order Now',
      message: (p, s) =>
        `Hi ${s.store_name}! 👋\n\nI'd like to order:\n📦 ${p.name}\n💰 ${formatPrice(p.selling_price)}\n\nIs it available?`,
      color: '#25D366'
    },
    {
      icon: '💰',
      label: 'Ask for Best Price',
      message: (p, s) =>
        `Hi ${s.store_name}! 👋\n\nI'm interested in ${p.name} (${formatPrice(p.selling_price)}).\n\nWhat's your best price? Can we negotiate? 😊`,
      color: '#128C7E'
    },
    {
      icon: '📏',
      label: 'Check Details',
      message: (p, s) => {
        let detailQuestion = 'What are the details?';
        if (p.category === 'Fashion') {
          detailQuestion = 'What sizes and colors are available?';
        } else if (p.category === 'Electronics' || p.category === 'Technology') {
          detailQuestion = 'What are the specifications?';
        }
        return `Hi ${s.store_name}! 👋\n\nI'd like more information about:\n📦 ${p.name}\n\n${detailQuestion}`;
      },
      color: '#075E54'
    },
    {
      icon: '🚚',
      label: 'Delivery Info',
      message: (p, s) =>
        `Hi ${s.store_name}! 👋\n\nI want to order ${p.name}.\n\nDo you deliver? What are the delivery costs and timeframes? 📦`,
      color: '#34B7F1'
    }
  ];

  const handleQuickReply = (action: QuickAction) => {
    const message = action.message(product, storeInfo);
    const whatsappUrl = getWhatsAppUrl(
      storeInfo.whatsapp_number,
      message
    );
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className={className}>
      <div style={{
        marginBottom: '12px',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151'
      }}>
        💬 Quick Actions
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 640 ? '1fr' : 'repeat(2, 1fr)',
        gap: '8px'
      }}>
        {quickActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleQuickReply(action)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 12px',
              background: 'white',
              border: `2px solid ${action.color}`,
              borderRadius: '8px',
              color: action.color,
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = action.color;
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'white';
              e.currentTarget.style.color = action.color;
            }}
          >
            <span style={{ fontSize: '16px' }}>{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Fallback "Ask Another Question" button */}
      <button
        onClick={() => {
          const message = `Hi ${storeInfo.store_name}! 👋\n\nI have a question about ${product.name}.`;
          const whatsappUrl = getWhatsAppUrl(storeInfo.whatsapp_number, message);
          window.open(whatsappUrl, '_blank');
        }}
        style={{
          width: '100%',
          marginTop: '8px',
          padding: '10px',
          background: '#f3f4f6',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          color: '#6b7280',
          fontSize: '13px',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#e5e7eb';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#f3f4f6';
        }}
      >
        ❓ Ask Another Question
      </button>

      <p style={{
        marginTop: '8px',
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        Messages open in WhatsApp. You can edit before sending.
      </p>
    </div>
  );
};

export default WhatsAppQuickReplies;
