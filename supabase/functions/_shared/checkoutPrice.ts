/** Server prices for card checkout. The browser price is ignored. */

export const MAX_CHECKOUT_LINES = 50;
export const MAX_LINE_QUANTITY = 10000;

const FLAT_FEE_KOBO = 10000;
const FLAT_FEE_THRESHOLD_KOBO = 250000;
const PAYSTACK_RATE = 0.015;

export type CatalogProduct = {
  id: string;
  user_id: string;
  name: string;
  selling_price: number | null;
  quantity: number | null;
  is_active: boolean | null;
};

export type CatalogVariant = {
  id: string;
  product_id: string;
  user_id: string;
  price_override: number | null;
  quantity: number | null;
  is_active: boolean | null;
};

export type RequestedLine = {
  product_id?: unknown;
  variant_id?: unknown;
  quantity?: unknown;
};

export type PricedLine = {
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price_kobo: number;
  total_price_kobo: number;
};

export type PriceResult =
  | { ok: true; lines: PricedLine[]; subtotalKobo: number }
  | { ok: false; error: string };

function textId(value: unknown): string {
  return String(value ?? '').trim();
}

function kobo(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER) return null;
  return amount;
}

export function priceCheckoutLines(
  storeUserId: string,
  requested: RequestedLine[],
  products: CatalogProduct[],
  variants: CatalogVariant[],
): PriceResult {
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > MAX_CHECKOUT_LINES) {
    return { ok: false, error: 'bad_items' };
  }
  const owner = String(storeUserId);
  const productsById = new Map(products.map((product) => [String(product.id), product]));
  const variantsById = new Map(variants.map((variant) => [String(variant.id), variant]));
  const seen = new Set<string>();
  const lines: PricedLine[] = [];
  let subtotalKobo = 0;

  for (const raw of requested) {
    const productId = textId(raw?.product_id);
    const variantId = textId(raw?.variant_id);
    const quantity = raw?.quantity;
    if (!productId || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_LINE_QUANTITY) {
      return { ok: false, error: 'bad_quantity' };
    }
    const key = `${productId}:${variantId}`;
    if (seen.has(key)) return { ok: false, error: 'duplicate_line' };
    seen.add(key);

    const product = productsById.get(productId);
    if (!product || String(product.user_id) !== owner || product.is_active === false) {
      return { ok: false, error: 'unknown_product' };
    }

    let unit = kobo(product.selling_price);
    let stock = product.quantity;
    if (variantId) {
      const variant = variantsById.get(variantId);
      if (!variant || String(variant.product_id) !== productId || String(variant.user_id) !== owner || variant.is_active === false) {
        return { ok: false, error: 'unknown_variant' };
      }
      if (variant.price_override !== null && variant.price_override !== undefined) {
        unit = kobo(variant.price_override);
      }
      stock = variant.quantity;
    }
    if (unit === null || unit <= 0) return { ok: false, error: 'invalid_price' };
    if (stock !== null && stock !== undefined && Number(stock) < quantity) {
      return { ok: false, error: 'insufficient_stock' };
    }

    const total = unit * quantity;
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(subtotalKobo + total)) {
      return { ok: false, error: 'amount_overflow' };
    }
    subtotalKobo += total;
    lines.push({
      product_id: productId,
      variant_id: variantId || null,
      product_name: String(product.name || 'Product').slice(0, 200),
      quantity,
      unit_price_kobo: unit,
      total_price_kobo: total,
    });
  }

  if (subtotalKobo <= 0) return { ok: false, error: 'zero_subtotal' };
  return { ok: true, lines, subtotalKobo };
}

/** Customer total for a server subtotal. Null when the kobo identity does not hold. */
export function customerChargeKobo(subtotalKobo: number): {
  customerTotalKobo: number;
  paystackTakeKobo: number;
  flatKobo: number;
} | null {
  if (!Number.isInteger(subtotalKobo) || subtotalKobo <= 0 || subtotalKobo > Number.MAX_SAFE_INTEGER) return null;
  const flatKobo = subtotalKobo >= FLAT_FEE_THRESHOLD_KOBO ? FLAT_FEE_KOBO : 0;
  const customerTotalKobo = Math.round((subtotalKobo + flatKobo) / (1 - PAYSTACK_RATE));
  const paystackTakeKobo = customerTotalKobo - subtotalKobo;
  const expected = Math.round(customerTotalKobo * PAYSTACK_RATE + flatKobo);
  if (!Number.isSafeInteger(customerTotalKobo) || Math.abs(paystackTakeKobo - expected) > 1) return null;
  return { customerTotalKobo, paystackTakeKobo, flatKobo };
}
