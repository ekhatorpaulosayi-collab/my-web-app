import { escapeHtml, safeHttpUrl } from '../src/utils/htmlEscape.js';

const FALLBACK_IMAGE = 'https://www.storehouse.ng/og-image.png';

export function productPreviewDescription({ priceKobo, description, name }) {
  const naira = Number(priceKobo) / 100;
  const price = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(naira) ? naira : 0);
  const detail = String(description || name || '').trim();
  return `${price} — ${detail}`.slice(0, 155);
}

export function buildOgDocument({
  title,
  description,
  image,
  url,
  siteName,
  priceNaira,
  inStock,
}) {
  const safeTitle = escapeHtml(title || 'Storehouse');
  const safeDescription = escapeHtml(String(description || '').slice(0, 155));
  const safeImage = escapeHtml(safeHttpUrl(image, FALLBACK_IMAGE));
  const safeUrl = escapeHtml(safeHttpUrl(url, 'https://www.storehouse.ng'));
  const safeSite = escapeHtml(siteName || 'Storehouse');
  const productMeta = priceNaira != null
    ? `<meta property="product:price:amount" content="${escapeHtml(Number(priceNaira).toFixed(2))}" />
  <meta property="product:price:currency" content="NGN" />
  <meta property="product:availability" content="${inStock ? 'in stock' : 'out of stock'}" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <meta property="og:type" content="${priceNaira != null ? 'product' : 'website'}" />
  <meta property="og:url" content="${safeUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="${safeSite}" />
  <meta property="og:locale" content="en_NG" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  ${productMeta}
</head>
<body style="margin:0;background:#f8fafc;font-family:Georgia,serif;color:#0f172a;">
  <article style="max-width:420px;margin:24px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <img src="${safeImage}" alt="" width="1200" height="630" style="display:block;width:100%;height:auto;background:#0b6b3a;" />
    <div style="padding:16px 18px 20px;">
      <p style="margin:0 0 6px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:#0b6b3a;">${safeSite}</p>
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;">${safeTitle}</h1>
      <p style="margin:0;font-size:16px;line-height:1.45;">${safeDescription}</p>
    </div>
  </article>
  <p style="text-align:center;"><a href="${safeUrl}">${safeTitle}</a></p>
</body>
</html>`;
}

export { FALLBACK_IMAGE };
