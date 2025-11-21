/**
 * About Us Templates
 * Pre-written templates for different business types
 */

export interface AboutTemplate {
  id: string;
  name: string;
  icon: string;
  content: string;
}

export const ABOUT_TEMPLATES: AboutTemplate[] = [
  {
    id: 'fashion',
    name: 'Fashion & Style',
    icon: '👗',
    content: `Welcome to our fashion store! We specialize in bringing you the latest trends in clothing, shoes, and accessories at affordable prices.

Quality and style are our priorities. We carefully select each item to ensure you look and feel your best. Whether you're dressing for work, a special occasion, or everyday comfort, we have something perfect for you.

We offer genuine products, fast delivery, and excellent customer service. Your satisfaction is our success!`,
  },
  {
    id: 'electronics',
    name: 'Electronics',
    icon: '📱',
    content: `Your trusted source for quality electronics and gadgets!

We sell genuine phones, laptops, accessories, and tech products from top brands. Every item comes with a warranty and our commitment to authenticity.

We understand how important technology is to your daily life. That's why we only stock products we would use ourselves, and we stand behind every sale.

Fast delivery, secure payment options, and responsive customer support - we're here to make your tech shopping experience smooth and reliable.`,
  },
  {
    id: 'beauty',
    name: 'Beauty Products',
    icon: '💄',
    content: `Discover your beauty with our curated selection of skincare, makeup, and beauty essentials!

We believe everyone deserves to feel confident and beautiful. Our products are carefully chosen for quality, effectiveness, and value.

From everyday essentials to special occasion must-haves, we stock authentic products that deliver real results. We're passionate about helping you look and feel your absolute best.

Shop with confidence - genuine products, expert advice, and fast delivery to your doorstep.`,
  },
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AboutTemplate | undefined {
  return ABOUT_TEMPLATES.find(t => t.id === id);
}

/**
 * Count characters in text
 */
export function countCharacters(text: string): number {
  return text.length;
}

/**
 * Check if text exceeds max length
 */
export function isWithinLimit(text: string, maxLength: number = 500): boolean {
  return text.length <= maxLength;
}
