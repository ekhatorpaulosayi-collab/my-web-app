import React from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * Floating WhatsApp Customer Support Button
 * UK Support Number: 07345014588 (+447345014588)
 */
export const WhatsAppSupportButton = () => {
  const SUPPORT_NUMBER = '447345014588'; // International format without +
  const SUPPORT_MESSAGE = 'Hi! I need help with Storehouse.';

  const handleClick = () => {
    const encodedMessage = encodeURIComponent(SUPPORT_MESSAGE);
    const whatsappUrl = `https://wa.me/${SUPPORT_NUMBER}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <button
      onClick={handleClick}
      className="whatsapp-support-button"
      aria-label="Contact Support on WhatsApp"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle size={24} />
      <span className="whatsapp-support-text">Support</span>
    </button>
  );
};

export default WhatsAppSupportButton;
