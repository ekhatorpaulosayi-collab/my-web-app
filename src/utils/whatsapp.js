/**
 * WhatsApp Business Integration
 * UK Number: 07345014588 (+447345014588)
 */

const WHATSAPP_NUMBER = '447345014588'; // International format without +

/**
 * Check if device is mobile
 * @returns {boolean}
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Validate Nigerian phone number
 * @param {string} phone
 * @returns {boolean}
 */
export const isValidNigerianPhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return /^(0|234)?[789][01]\d{8}$/.test(cleaned);
};

/**
 * Format phone for display
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneDisplay = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('234')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  return `+${cleaned}`;
};

/**
 * Format phone for WhatsApp
 * @param {string} phone
 * @returns {string}
 */
export const formatPhoneForWhatsApp = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '234' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('234')) {
    cleaned = '234' + cleaned;
  }
  return cleaned;
};

/**
 * Generate WhatsApp click-to-chat URL
 * @param {string} message - Pre-filled message (optional)
 * @param {Object} context - Additional context like product name, business name
 * @returns {string} WhatsApp URL
 */
export const getWhatsAppURL = (message = '', context = {}) => {
  let finalMessage = message;

  // If context provided, customize the message
  if (context.productName) {
    finalMessage = `Hi! I'm interested in *${context.productName}* from ${context.businessName || 'your store'}`;
  } else if (context.businessName) {
    finalMessage = `Hi! I'm interested in products from *${context.businessName}*`;
  } else if (!message) {
    finalMessage = 'Hi! I have a question about your products';
  }

  const encodedMessage = encodeURIComponent(finalMessage);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
};

/**
 * Open WhatsApp in new tab/window
 * @param {string} message - Pre-filled message
 * @param {Object} context - Additional context
 */
export const openWhatsApp = (message = '', context = {}) => {
  const url = getWhatsAppURL(message, context);
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Get support message templates
 */
export const WhatsAppTemplates = {
  PRODUCT_INQUIRY: (productName, businessName) =>
    `Hi! I'm interested in *${productName}* from ${businessName}. Can you provide more details?`,

  GENERAL_SUPPORT: (businessName) =>
    `Hi! I need help with ${businessName}. Can you assist me?`,

  ORDER_INQUIRY: (businessName) =>
    `Hi! I'd like to place an order from ${businessName}. What's the process?`,

  TECHNICAL_SUPPORT: () =>
    `Hi! I'm experiencing a technical issue with my order. Can you help?`,
};

// Alias for compatibility
export const getWhatsAppUrl = getWhatsAppURL;

export default {
  getWhatsAppURL,
  getWhatsAppUrl,
  openWhatsApp,
  WhatsAppTemplates,
  WHATSAPP_NUMBER,
};
