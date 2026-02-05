import React from 'react';
import { MessageCircle } from 'lucide-react';
import { openWhatsApp } from '../utils/whatsapp';

/**
 * WhatsApp Contact Button Component
 * Can be used as inline button or floating action button
 */
export const WhatsAppButton = ({
  message = '',
  context = {},
  variant = 'inline', // 'inline' | 'floating'
  label = 'Chat on WhatsApp',
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
}) => {
  const handleClick = () => {
    openWhatsApp(message, context);
  };

  const baseStyles = {
    inline: 'bg-[#25D366] hover:bg-[#20BA5A] text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg',
    floating: 'fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BA5A] text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-50 flex items-center justify-center'
  };

  const sizeStyles = {
    sm: variant === 'inline' ? 'px-3 py-2 text-sm' : 'w-12 h-12',
    md: variant === 'inline' ? 'px-4 py-2.5 text-base' : 'w-14 h-14',
    lg: variant === 'inline' ? 'px-6 py-3 text-lg' : 'w-16 h-16',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      onClick={handleClick}
      className={`${baseStyles[variant]} ${sizeStyles[size]} ${className}`}
      aria-label={label}
      title={label}
    >
      <MessageCircle size={iconSizes[size]} />
      {variant === 'inline' && <span>{label}</span>}
    </button>
  );
};

/**
 * Floating WhatsApp Button - appears on all pages
 */
export const FloatingWhatsAppButton = ({ message, context }) => {
  return (
    <WhatsAppButton
      variant="floating"
      message={message}
      context={context}
      size="md"
      label="Contact us on WhatsApp"
    />
  );
};

/**
 * Product WhatsApp Button - for product pages
 */
export const ProductWhatsAppButton = ({ productName, businessName, className }) => {
  return (
    <WhatsAppButton
      variant="inline"
      context={{ productName, businessName }}
      label="Ask about this product"
      size="md"
      className={className}
    />
  );
};

export default WhatsAppButton;
