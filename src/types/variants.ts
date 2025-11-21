/**
 * Product Variants Types
 * For size/color options in products
 */

export interface ProductVariant {
  id?: string;
  product_id?: string;
  user_id?: string;
  variant_name: string; // e.g., "Red - Large"
  sku?: string;
  barcode?: string;
  attributes: Record<string, string>; // e.g., {size: "L", color: "Red"}
  price_override?: number; // in kobo, null means use product price
  quantity: number;
  low_stock_threshold?: number;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface VariantOption {
  name: string; // e.g., "Size", "Color"
  values: string[]; // e.g., ["Small", "Medium", "Large"]
}

export interface VariantFormData {
  hasVariants: boolean;
  options: VariantOption[]; // What attributes to vary (size, color, etc.)
  variants: ProductVariant[]; // Generated combinations
}
