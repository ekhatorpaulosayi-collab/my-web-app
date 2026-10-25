import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, safeHttpUrl } from '../../src/utils/htmlEscape.js';
import { formatBusinessHours } from '../../src/utils/businessHours.js';
import { shortSlugFromName, validateStoreSlug } from '../../src/utils/storeSlug.ts';
import { isKnownAppPath } from '../../src/utils/appPaths.js';
import { storeHealthFlags } from '../../src/utils/storeHealth.js';
import { buildOgDocument } from '../../api/ogHtml.js';

test('store text is escaped before it is placed in a link preview', () => {
  const html = buildOgDocument({
    title: '<script>alert(1)</script>',
    description: 'Tom & "Jerry"',
    image: 'javascript:alert(1)',
    url: 'https://evil.test/?q="x"',
    siteName: "O'Brien",
  });
  assert.equal(html.includes('<script>alert'), false);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Tom &amp; &quot;Jerry&quot;/);
  assert.match(html, /O&#39;Brien/);
  assert.match(html, /https:\/\/www\.storehouse\.ng\/og-image\.png/);
  assert.equal(escapeHtml(`<>&"'`), '&lt;&gt;&amp;&quot;&#39;');
  assert.equal(safeHttpUrl('https://cdn.example/a.png', 'https://fallback'), 'https://cdn.example/a.png');
});

test('business hours are readable lines', () => {
  const hours = formatBusinessHours('{"monday":{"open":"09:00","close":"17:00"},"sunday":"Closed"}');
  assert.match(hours, /Monday: 09:00–17:00/);
  assert.match(hours, /Sunday: Closed/);
  assert.equal(hours.includes('{'), false);
  assert.equal(formatBusinessHours('Mon to Fri, 9 to 5'), 'Mon to Fri, 9 to 5');
});

test('existing long slugs are kept and new reserved slugs are rejected', () => {
  const existing = 'a-live-slug-that-is-longer-than-thirty-characters';
  assert.equal(validateStoreSlug(existing, existing), null);
  assert.match(validateStoreSlug('admin', null) || '', /reserved/i);
  assert.match(validateStoreSlug('ab', null) || '', /3/);
  const fresh = shortSlugFromName('Ekhator Fabrics And Lace Emporium');
  assert.ok(fresh.length <= 20);
  assert.equal(fresh.includes('ekhator') || fresh.startsWith('ekhator'), true);
  assert.equal(shortSlugFromName('234').endsWith('shop'), true);
});

test('unknown paths are not treated as app routes', () => {
  assert.equal(isKnownAppPath('/store/osayi'), true);
  assert.equal(isKnownAppPath('/privacy'), true);
  assert.equal(isKnownAppPath('/this-route-does-not-exist'), false);
  assert.equal(isKnownAppPath('/'), true);
});

test('store health flags the problems a merchant should see before going live', () => {
  const flags = storeHealthFlags({
    businessName: 'test',
    aboutUs: 'cash only, no card',
    logoUrl: '',
    whatsappNumber: '+44 7700 900123',
    paystackEnabled: true,
    samplePrices: [100],
  });
  assert.ok(flags.some((flag) => /logo/i.test(flag)));
  assert.ok(flags.some((flag) => /placeholder/i.test(flag)));
  assert.ok(flags.some((flag) => /Nigerian/i.test(flag)));
  assert.ok(flags.some((flag) => /cash/i.test(flag)));
  assert.ok(flags.some((flag) => /test amount/i.test(flag)));
});
