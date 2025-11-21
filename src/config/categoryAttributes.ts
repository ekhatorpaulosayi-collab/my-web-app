/**
 * Category-Specific Product Attributes
 * World-class configuration for dynamic product fields
 */

export interface AttributeField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number' | 'date' | 'textarea';
  options?: string[]; // For select type
  placeholder?: string;
  required?: boolean;
  icon?: string;
  helpText?: string;
}

export interface CategoryAttributes {
  name: string;
  icon: string;
  fields: AttributeField[];
  displayFields: string[]; // Which fields to show on storefront cards
}

/**
 * Complete attribute definitions for all categories
 */
export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttributes> = {
  Fashion: {
    name: 'Fashion',
    icon: '👕',
    displayFields: ['size', 'color', 'brand'],
    fields: [
      {
        key: 'size',
        label: 'Size',
        type: 'select',
        options: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', 'One Size'],
        icon: '📏',
        placeholder: 'Select size'
      },
      {
        key: 'color',
        label: 'Color',
        type: 'text',
        icon: '🎨',
        placeholder: 'e.g., Black, Blue, Red'
      },
      {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        icon: '🏷️',
        placeholder: 'e.g., Nike, Adidas, Zara'
      },
      {
        key: 'material',
        label: 'Material',
        type: 'text',
        icon: '🧵',
        placeholder: 'e.g., Cotton, Polyester, Silk'
      },
      {
        key: 'gender',
        label: 'Gender',
        type: 'select',
        options: ['Male', 'Female', 'Unisex', 'Kids'],
        icon: '👤',
        placeholder: 'Select gender'
      },
      {
        key: 'fit',
        label: 'Fit',
        type: 'select',
        options: ['Slim Fit', 'Regular Fit', 'Loose Fit', 'Oversized'],
        placeholder: 'Select fit'
      }
    ]
  },

  Electronics: {
    name: 'Electronics',
    icon: '📱',
    displayFields: ['brand', 'model', 'warranty'],
    fields: [
      {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        icon: '🏷️',
        placeholder: 'e.g., Samsung, Apple, LG',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        icon: '📋',
        placeholder: 'e.g., Galaxy S23, iPhone 15'
      },
      {
        key: 'warranty',
        label: 'Warranty',
        type: 'select',
        options: ['No Warranty', '6 Months', '1 Year', '2 Years', '3 Years'],
        icon: '🛡️',
        placeholder: 'Select warranty period'
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Brand New', 'Refurbished', 'Used - Excellent', 'Used - Good'],
        icon: '✨',
        placeholder: 'Select condition'
      },
      {
        key: 'specifications',
        label: 'Key Specifications',
        type: 'textarea',
        icon: '⚙️',
        placeholder: 'e.g., 8GB RAM, 256GB Storage, 6.1" Display',
        helpText: 'Add key specs, one per line or comma-separated'
      }
    ]
  },

  'Food & Beverages': {
    name: 'Food & Beverages',
    icon: '🍔',
    displayFields: ['weight', 'expiryDate'],
    fields: [
      {
        key: 'weight',
        label: 'Weight/Volume',
        type: 'text',
        icon: '⚖️',
        placeholder: 'e.g., 500g, 1L, 250ml'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        icon: '📅',
        helpText: 'When does this product expire?'
      },
      {
        key: 'ingredients',
        label: 'Ingredients',
        type: 'textarea',
        icon: '🧪',
        placeholder: 'List main ingredients'
      },
      {
        key: 'dietary',
        label: 'Dietary Information',
        type: 'select',
        options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Organic'],
        icon: '🌱',
        placeholder: 'Select dietary info'
      },
      {
        key: 'storage',
        label: 'Storage Instructions',
        type: 'text',
        icon: '❄️',
        placeholder: 'e.g., Refrigerate after opening'
      }
    ]
  },

  'Beauty & Cosmetics': {
    name: 'Beauty & Cosmetics',
    icon: '💄',
    displayFields: ['brand', 'shade', 'skinType'],
    fields: [
      {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        icon: '🏷️',
        placeholder: 'e.g., MAC, Maybelline, Fenty'
      },
      {
        key: 'shade',
        label: 'Shade/Color',
        type: 'text',
        icon: '🎨',
        placeholder: 'e.g., Nude, Ruby Red, Cocoa'
      },
      {
        key: 'skinType',
        label: 'Skin Type',
        type: 'select',
        options: ['All Skin Types', 'Oily', 'Dry', 'Combination', 'Sensitive'],
        icon: '✨',
        placeholder: 'Select skin type'
      },
      {
        key: 'ingredients',
        label: 'Key Ingredients',
        type: 'textarea',
        icon: '🧪',
        placeholder: 'List active ingredients'
      },
      {
        key: 'volume',
        label: 'Volume/Size',
        type: 'text',
        icon: '📏',
        placeholder: 'e.g., 30ml, 50g'
      },
      {
        key: 'expiryDate',
        label: 'Expiry Date',
        type: 'date',
        icon: '📅'
      }
    ]
  },

  Furniture: {
    name: 'Furniture',
    icon: '🛋️',
    displayFields: ['dimensions', 'material', 'color'],
    fields: [
      {
        key: 'dimensions',
        label: 'Dimensions (L × W × H)',
        type: 'text',
        icon: '📐',
        placeholder: 'e.g., 180cm × 90cm × 75cm'
      },
      {
        key: 'material',
        label: 'Material',
        type: 'text',
        icon: '🪵',
        placeholder: 'e.g., Solid Wood, Metal, Fabric'
      },
      {
        key: 'color',
        label: 'Color/Finish',
        type: 'text',
        icon: '🎨',
        placeholder: 'e.g., Walnut, Black, White'
      },
      {
        key: 'weight',
        label: 'Weight',
        type: 'text',
        icon: '⚖️',
        placeholder: 'e.g., 25kg'
      },
      {
        key: 'assembly',
        label: 'Assembly Required',
        type: 'select',
        options: ['No - Fully Assembled', 'Yes - Easy Assembly', 'Yes - Professional Required'],
        icon: '🔧',
        placeholder: 'Select assembly'
      }
    ]
  },

  Books: {
    name: 'Books',
    icon: '📚',
    displayFields: ['author', 'publisher', 'pages'],
    fields: [
      {
        key: 'author',
        label: 'Author',
        type: 'text',
        icon: '✍️',
        placeholder: 'e.g., Chimamanda Adichie'
      },
      {
        key: 'publisher',
        label: 'Publisher',
        type: 'text',
        icon: '📖',
        placeholder: 'e.g., Penguin Books'
      },
      {
        key: 'isbn',
        label: 'ISBN',
        type: 'text',
        icon: '🔢',
        placeholder: 'e.g., 978-0-123456-78-9'
      },
      {
        key: 'pages',
        label: 'Number of Pages',
        type: 'number',
        icon: '📄',
        placeholder: 'e.g., 350'
      },
      {
        key: 'language',
        label: 'Language',
        type: 'text',
        icon: '🌍',
        placeholder: 'e.g., English, Yoruba'
      },
      {
        key: 'format',
        label: 'Format',
        type: 'select',
        options: ['Hardcover', 'Paperback', 'eBook', 'Audiobook'],
        icon: '📕',
        placeholder: 'Select format'
      }
    ]
  },

  'Phones & Accessories': {
    name: 'Phones & Accessories',
    icon: '📱',
    displayFields: ['brand', 'model', 'storage'],
    fields: [
      {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        icon: '🏷️',
        placeholder: 'e.g., iPhone, Samsung, Tecno',
        required: true
      },
      {
        key: 'model',
        label: 'Model',
        type: 'text',
        icon: '📋',
        placeholder: 'e.g., 15 Pro Max, S24 Ultra'
      },
      {
        key: 'storage',
        label: 'Storage',
        type: 'select',
        options: ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB'],
        icon: '💾',
        placeholder: 'Select storage'
      },
      {
        key: 'ram',
        label: 'RAM',
        type: 'select',
        options: ['2GB', '3GB', '4GB', '6GB', '8GB', '12GB', '16GB'],
        icon: '🧠',
        placeholder: 'Select RAM'
      },
      {
        key: 'color',
        label: 'Color',
        type: 'text',
        icon: '🎨',
        placeholder: 'e.g., Space Black, Gold'
      },
      {
        key: 'condition',
        label: 'Condition',
        type: 'select',
        options: ['Brand New', 'UK Used', 'US Used', 'Refurbished'],
        icon: '✨',
        placeholder: 'Select condition'
      }
    ]
  },

  Shoes: {
    name: 'Shoes',
    icon: '👟',
    displayFields: ['size', 'brand', 'color'],
    fields: [
      {
        key: 'size',
        label: 'Shoe Size',
        type: 'select',
        options: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
        icon: '📏',
        placeholder: 'Select size'
      },
      {
        key: 'brand',
        label: 'Brand',
        type: 'text',
        icon: '🏷️',
        placeholder: 'e.g., Nike, Adidas, Gucci'
      },
      {
        key: 'color',
        label: 'Color',
        type: 'text',
        icon: '🎨',
        placeholder: 'e.g., Black, White, Red'
      },
      {
        key: 'material',
        label: 'Material',
        type: 'text',
        icon: '🧵',
        placeholder: 'e.g., Leather, Canvas, Suede'
      },
      {
        key: 'gender',
        label: 'Gender',
        type: 'select',
        options: ['Men', 'Women', 'Unisex', 'Kids'],
        icon: '👤',
        placeholder: 'Select gender'
      }
    ]
  }
};

/**
 * Get attribute fields for a specific category
 */
export function getCategoryAttributes(category: string | null | undefined): CategoryAttributes | null {
  if (!category) return null;
  return CATEGORY_ATTRIBUTES[category] || null;
}

/**
 * Get display fields for a category (shown on storefront cards)
 */
export function getDisplayFields(category: string | null | undefined): string[] {
  const config = getCategoryAttributes(category);
  return config?.displayFields || [];
}

/**
 * Format attribute value for display
 */
export function formatAttributeValue(key: string, value: any): string {
  if (!value) return '';

  // Format dates
  if (key.toLowerCase().includes('date') || key.toLowerCase().includes('expiry')) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB');
    }
  }

  return String(value);
}

/**
 * Get attribute icon
 */
export function getAttributeIcon(category: string | null, key: string): string {
  const config = getCategoryAttributes(category);
  const field = config?.fields.find(f => f.key === key);
  return field?.icon || '•';
}

/**
 * Get all available categories
 */
export function getAllCategories(): string[] {
  return Object.keys(CATEGORY_ATTRIBUTES);
}
