import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml, safeHttpUrl } from '../../src/utils/htmlEscape.js';
import { formatBusinessHours } from '../../src/utils/businessHours.js';
import { shortSlugFromName, validateStoreSlug } from '../../src/utils/storeSlug.ts';
import { isKnownAppPath } from '../../src/utils/appPaths.js';
import { storeHealthFlags } from '../../src/utils/storeHealth.js';
import { buildOgDocument } from '../../api/ogHtml.js';
import { canonicalStoreUrl, STORE_SUBDOMAIN_BLOCKLIST } from '../../src/utils/canonicalStoreUrl.js';
import { PUBLIC_STORE_COLUMNS } from '../../src/utils/publicStoreColumns.js';
import { RESERVED_SUBDOMAINS } from '../../src/utils/reservedSubdomains.ts';
import { friendlyAuthError } from '../../src/lib/authErrors.js';

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
  assert.match(validateStoreSlug('a'.repeat(38), null) || '', /30/);
  assert.match(validateStoreSlug('12345', null) || '', /number/i);
});

test('link previews use the shop subdomain and the public select is narrow', () => {
  assert.equal(canonicalStoreUrl('osayi'), 'https://osayi.storehouse.ng');
  assert.equal(canonicalStoreUrl('osayi', 'ankara'), 'https://osayi.storehouse.ng?product=ankara');
  assert.equal(canonicalStoreUrl('234'), 'https://www.storehouse.ng/store/234');
  assert.equal(canonicalStoreUrl('admin'), 'https://www.storehouse.ng/store/admin');
  for (const label of RESERVED_SUBDOMAINS) {
    assert.equal(STORE_SUBDOMAIN_BLOCKLIST.includes(label), true, label);
    assert.match(canonicalStoreUrl(label), /\/store\//);
  }
  assert.equal(STORE_SUBDOMAIN_BLOCKLIST.length, RESERVED_SUBDOMAINS.size);
  const columns = PUBLIC_STORE_COLUMNS.split(',');
  assert.equal(columns.includes('business_name'), true);
  assert.equal(columns.includes('store_slug'), true);
  assert.equal(columns.includes('primary_color'), false);
  for (const banned of ['bank_name', 'account_number', 'account_name', 'paystack_secret', 'subaccount_code', '*']) {
    assert.equal(columns.includes(banned), false, banned);
  }
});

function storesColumnsFromSchema() {
  const columns = new Set();
  const schema = readFileSync(new URL('../../sql-archive/root-scripts/supabase-schema.sql', import.meta.url), 'utf8');
  const create = schema.match(/CREATE TABLE IF NOT EXISTS public\.stores \(([\s\S]*?)\n\);/);
  if (!create) throw new Error('stores create table missing from schema dump');
  for (const line of create[1].split('\n')) {
    const match = line.match(/^\s*([a-z_][a-z0-9_]*)\s+/i);
    if (!match) continue;
    const name = match[1].toLowerCase();
    if (name === 'constraint') continue;
    columns.add(name);
  }

  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith('.sql')) files.push(path);
    }
  };
  walk(new URL('../../supabase/migrations', import.meta.url).pathname);
  files.push(new URL('../../sql-archive/root-scripts/add-domain-support.sql', import.meta.url).pathname);

  const alter = /ALTER TABLE\s+(?:public\.)?stores\b([\s\S]*?);/gi;
  const add = /ADD COLUMN(?:\s+IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)/gi;
  for (const file of files) {
    const sql = readFileSync(file, 'utf8');
    for (const statement of sql.matchAll(alter)) {
      for (const col of statement[1].matchAll(add)) columns.add(col[1].toLowerCase());
    }
  }
  return columns;
}

test('public store select only names columns the schema actually has', () => {
  const known = storesColumnsFromSchema();
  assert.equal(known.has('primary_color'), false);
  assert.equal(known.has('business_name'), true);
  assert.equal(known.has('payment_methods'), true);
  const missing = PUBLIC_STORE_COLUMNS.split(',').filter((column) => !known.has(column));
  assert.deepEqual(missing, []);
});

test('signup says when the store link could not be saved', () => {
  const message = 'Your account was created, but the store link could not be saved. Sign in and set your store link, or try signing up again.';
  assert.equal(friendlyAuthError(new Error(message)), message);
  assert.equal(
    friendlyAuthError(new Error('We could not reserve a store link. Please try again.')),
    'We could not reserve a store link. Please try again.',
  );
});

test('the live editor owns slug checks and chat errors stay out of the message list', () => {
  const editor = readFileSync(new URL('../../src/components/OnlineStoreSetup.tsx', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../../src/components/StoreSettings.tsx', import.meta.url), 'utf8');
  const chat = readFileSync(new URL('../../src/components/AIChatWidget.tsx', import.meta.url), 'utf8');
  const storefront = readFileSync(new URL('../../src/pages/StorefrontPage.tsx', import.meta.url), 'utf8');
  const signup = readFileSync(new URL('../../src/lib/authService-supabase.js', import.meta.url), 'utf8');
  const overlay = readFileSync(new URL('../../src/components/BusinessTypeSelector.css', import.meta.url), 'utf8');
  const gallery = readFileSync(new URL('../../src/components/ProductImageGallery.tsx', import.meta.url), 'utf8');
  const addItem = readFileSync(new URL('../../src/App.jsx', import.meta.url), 'utf8');
  const deploy = readFileSync(new URL('../../DEPLOY_ORDER.md', import.meta.url), 'utf8');
  const guard = readFileSync(new URL('../../supabase/migrations/20261025_19_public_store_columns.sql', import.meta.url), 'utf8');
  assert.equal(editor.includes('remember_store_slug'), false);
  assert.equal(settings.includes('remember_store_slug'), false);
  assert.match(editor, /validateStoreSlug/);
  assert.match(editor, /store_slug_is_available/);
  assert.match(editor, /storeHealthFlags/);
  assert.equal(editor.includes('Skip Check'), false);
  assert.equal(editor.includes('Use Anyway'), false);
  assert.equal((chat.match(/setMessages\(/g) || []).length, 4);
  assert.match(chat, /Typing…/);
  assert.match(chat, /The assistant did not answer/);
  assert.match(storefront, /PUBLIC_STORE_COLUMNS/);
  assert.match(storefront, /resolve_store_redirect/);
  assert.equal(storefront.includes("select('*')"), false);
  assert.equal(storefront.includes('Only {selectedProduct.quantity} left'), false);
  assert.match(signup, /generate_store_slug/);
  assert.match(signup, /store link could not be saved/);
  const overlayRule = overlay.split('.business-selector-modal')[0];
  assert.match(overlayRule, /pointer-events:\s*none/);
  assert.equal(/top:\s*0/.test(overlayRule), false);
  assert.equal(overlay.includes('min-height: 100vh'), false);
  assert.equal(gallery.includes('yzlniqwzqlsftxrtapdl'), false);
  assert.match(gallery, /supabaseUrl/);
  assert.match(addItem, /item-purchase-price/);
  assert.match(addItem, /aria-required="true"/);
  assert.match(chat, /env\(safe-area-inset-bottom\)/);
  assert.equal(chat.includes("bottom: '20px'"), false);
  assert.match(deploy, /after step 19b/);
  assert.match(deploy, /Do not use that rollback after step 19b/);
  assert.match(guard, /invalid_store_subdomain/);
  assert.match(guard, /lower\(old_slug\)/);
  assert.equal(guard.includes('account_number'), true);
  assert.equal(/GRANT SELECT \([^)]*account_number/.test(guard), false);
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
