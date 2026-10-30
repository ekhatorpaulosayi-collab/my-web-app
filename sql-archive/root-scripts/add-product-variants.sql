-- =====================================================
-- PRODUCT VARIANTS FEATURE
-- Allow products to have multiple options (size, color, etc.)
-- Critical for fashion/clothing businesses
-- =====================================================

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Variant identification
  variant_name TEXT NOT NULL, -- e.g., "Red - Large", "Blue - Medium"
  sku TEXT, -- Optional SKU for this specific variant
  barcode TEXT, -- Optional barcode for this variant

  -- Variant-specific attributes (stored as JSONB for flexibility)
  -- Example: {"size": "Large", "color": "Red"}
  attributes JSONB DEFAULT '{}',

  -- Pricing (optional override - if NULL, uses product price)
  price_override BIGINT, -- in kobo, NULL means use product's price

  -- Inventory
  quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,

  -- Images (optional - specific images for this variant)
  image_url TEXT,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_quantity_variants CHECK (quantity >= 0),
  CONSTRAINT unique_variant_per_product UNIQUE(product_id, variant_name)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_user ON public.product_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_variants_active ON public.product_variants(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_variants_attributes ON public.product_variants USING gin(attributes);

-- Auto-update updated_at timestamp
DROP TRIGGER IF EXISTS update_variants_updated_at ON public.product_variants;
CREATE TRIGGER update_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS variants_select_own ON public.product_variants;
CREATE POLICY variants_select_own ON public.product_variants
  FOR SELECT USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS variants_insert_own ON public.product_variants;
CREATE POLICY variants_insert_own ON public.product_variants
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS variants_update_own ON public.product_variants;
CREATE POLICY variants_update_own ON public.product_variants
  FOR UPDATE USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS variants_delete_own ON public.product_variants;
CREATE POLICY variants_delete_own ON public.product_variants
  FOR DELETE USING (user_id = auth.uid()::text);

-- Add variant_id to sales table (optional - tracks which variant was sold)
ALTER TABLE public.sales
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sales_variant ON public.sales(variant_id) WHERE variant_id IS NOT NULL;

-- Comments
COMMENT ON TABLE public.product_variants IS 'Product variants for size/color options - critical for fashion stores';
COMMENT ON COLUMN public.product_variants.attributes IS 'Flexible JSONB storage for variant attributes like {"size": "L", "color": "Red"}';
COMMENT ON COLUMN public.product_variants.price_override IS 'Optional price override in kobo - NULL means use base product price';
COMMENT ON COLUMN public.sales.variant_id IS 'Links sale to specific variant sold (e.g., which size/color)';

-- Function to get effective price for a variant (considering override)
CREATE OR REPLACE FUNCTION get_variant_price(p_variant_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_price BIGINT;
  v_product_price BIGINT;
BEGIN
  -- Get variant's price override
  SELECT price_override INTO v_price
  FROM public.product_variants
  WHERE id = p_variant_id;

  -- If no override, get product's base price
  IF v_price IS NULL THEN
    SELECT selling_price INTO v_product_price
    FROM public.products p
    INNER JOIN public.product_variants v ON p.id = v.product_id
    WHERE v.id = p_variant_id;

    v_price := v_product_price;
  END IF;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement variant quantity (similar to product quantity decrement)
CREATE OR REPLACE FUNCTION decrement_variant_quantity(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.product_variants
  SET quantity = GREATEST(0, quantity - p_quantity)
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to see products with their variants (useful for queries)
CREATE OR REPLACE VIEW product_variants_view AS
SELECT
  p.id as product_id,
  p.name as product_name,
  p.category,
  p.selling_price as base_price,
  p.quantity as base_quantity,
  v.id as variant_id,
  v.variant_name,
  v.attributes,
  COALESCE(v.price_override, p.selling_price) as effective_price,
  v.quantity as variant_quantity,
  v.is_active,
  v.image_url as variant_image,
  p.user_id
FROM public.products p
LEFT JOIN public.product_variants v ON p.id = v.product_id
WHERE p.is_public = true;

COMMENT ON VIEW product_variants_view IS 'Combines products with their variants for easy querying';
