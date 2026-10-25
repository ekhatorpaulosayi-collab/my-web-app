import { escapeHtml, safeHttpUrl } from '../src/utils/htmlEscape.js';

const FALLBACK_IMAGE = 'https://www.storehouse.ng/og-image.png';

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
<body>
  <p><a href="${safeUrl}">${safeTitle}</a></p>
</body>
</html>`;
}

export { FALLBACK_IMAGE };
