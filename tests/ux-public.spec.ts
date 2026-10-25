import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';
import { buildOgDocument } from '../api/ogHtml.js';

const artifactDir = process.env.UX_ARTIFACT_DIR || `${process.cwd()}/artifacts/ux-after`;

const routes = [
  ['home', '/'],
  ['login', '/login'],
  ['signup', '/signup'],
  ['forgot-password', '/forgot-password'],
  ['terms', '/terms'],
  ['privacy', '/privacy'],
  ['not-found', '/this-route-does-not-exist'],
  ['help', '/dev/ux-preview/help'],
  ['upgrade', '/dev/ux-preview/upgrade'],
  ['referrals', '/dev/ux-preview/referrals'],
  ['quick-setup', '/dev/ux-preview/quick-setup'],
];

test.beforeAll(async () => {
  await mkdir(artifactDir, { recursive: true });
});

for (const [name, path] of routes) {
  test(`${name} renders and meets axe on serious issues`, async ({ page }, testInfo) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(response, 'navigation').toBeTruthy();
    await page.waitForTimeout(500);

    if (name === 'not-found') {
      await expect(page.getByRole('heading', { name: /can’t find that page/i })).toBeVisible();
    }
    if (name === 'terms') {
      await expect(page.getByRole('heading', { name: /terms of use/i })).toBeVisible();
    }
    if (name === 'login') {
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    }

    const width = page.viewportSize()?.width ?? 0;
    const sizeLabel = width <= 400 ? '390x844' : '1440x900';
    const shot = `${artifactDir}/${name}-${sizeLabel}.png`;
    await page.screenshot({ path: shot, fullPage: false });

    if (name === 'help' || name === 'upgrade' || name === 'referrals' || name === 'quick-setup') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${name} horizontal overflow`).toBeLessThanOrEqual(1);
    }

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const summary = serious.map((v) => `${v.id} (${v.nodes.length})`).join(', ');
    expect(serious, summary || 'no serious axe violations').toEqual([]);
  });
}

test('preview storefront shows a product, a real price, and readable hours', async ({ page }) => {
  const response = await page.goto('/store/preview', { waitUntil: 'domcontentloaded' });
  expect(response, 'navigation').toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Preview Fabrics' })).toBeVisible();
  const hours = page.getByTestId('business-hours');
  await expect(hours).toContainText('Monday: 09:00');
  await expect(hours).not.toContainText('{');
  await expect(page.getByRole('link', { name: 'Privacy' })).toBeVisible();
  await expect(page.getByRole('button', { name: /shopping cart/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Order this product on WhatsApp' })).toHaveCount(0);
  await expect(page.getByText('Only 4 left')).toHaveCount(1);

  await page.getByRole('heading', { name: 'Ankara' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ankara' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/Only \d+ left/)).toHaveCount(0);
  await expect(dialog.getByText('Six yards of cotton Ankara.')).toBeVisible();
  await expect(dialog.getByText(/250,000/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Share product' }).click();
  const sharePrice = page.getByLabel('Share Product', { exact: true }).getByText('₦2,500');
  await expect(sharePrice).toBeVisible();
  await expect(page.getByText(/₦250,000/)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Ankara' })).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
  const summary = serious.map((v) => `${v.id} (${v.nodes.length})`).join(', ');
  expect(serious, summary || 'no serious axe violations').toEqual([]);
});

test('phone share menu shows full labels and the store preview card', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0;
  test.skip(width > 500, 'phone layout');
  await mkdir(artifactDir, { recursive: true });

  await page.goto('/store/preview', { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Ankara' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ankara' });
  await dialog.getByRole('button', { name: 'Share product' }).click();
  const menu = page.getByRole('dialog', { name: 'Share Product' });
  await expect(menu.getByText('Send to Contacts')).toBeVisible();
  await expect(menu.getByText('Post on X')).toBeVisible();
  const content = await menu.locator('.share-menu-content').boundingBox();
  const label = await menu.getByText('Send to Contacts').boundingBox();
  expect(content && label).toBeTruthy();
  expect(label.x).toBeGreaterThanOrEqual(content.x);
  expect(label.x + label.width).toBeLessThanOrEqual(content.x + content.width + 1);
  await page.screenshot({ path: `${artifactDir}/retest17-phone-share-menu.png` });

  const html = buildOgDocument({
    title: 'Ankara | Preview Fabrics',
    description: '₦2,500 — Six yards of cotton Ankara.',
    image: '/og-image.png',
    url: 'https://preview.storehouse.ng/?product=preview-ankara',
    siteName: 'Preview Fabrics',
    priceNaira: 2500,
    inStock: true,
  });
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Ankara | Preview Fabrics' })).toBeVisible();
  await expect(page.getByText('₦2,500 — Six yards of cotton Ankara.')).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/retest17-phone-preview-card.png` });
});

test('phone added-to-cart toast stays off the name field', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0;
  test.skip(width > 500, 'phone layout');
  await page.route('**/product_variants*', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: '[]',
  }));
  await page.goto('/store/preview', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Add to Cart' }).first().click();
  const toast = page.locator('.add-to-cart-toast.show');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveText(/Added to cart/);
  await page.getByRole('button', { name: 'Proceed to Checkout' }).click();
  const name = page.getByPlaceholder('Your name *');
  await name.scrollIntoViewIfNeeded();
  await expect(name).toBeVisible();
  const toastBox = await toast.boundingBox();
  const nameBox = await name.boundingBox();
  expect(toastBox && nameBox).toBeTruthy();
  const overlaps = toastBox.y < nameBox.y + nameBox.height && toastBox.y + toastBox.height > nameBox.y
    && toastBox.x < nameBox.x + nameBox.width && toastBox.x + toastBox.width > nameBox.x;
  expect(overlaps).toBe(false);
  expect(toastBox.y).toBeLessThan(80);
});

test('phone tab bar stays clear of help and uses 48px targets', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 0;
  test.skip(width > 500, 'phone layout');

  await page.addInitScript(() => {
    localStorage.setItem('storehouse:setup-checklist:dismissed', 'true');
    localStorage.setItem('storehouse_chat_used', 'true');
  });

  const intersects = (a, b) => {
    if (!a || !b) return false;
    const x = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
    const y = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
    return x > 0 && y > 0;
  };

  await page.goto('/dev/ux-preview/dashboard', { waitUntil: 'domcontentloaded' });
  const more = page.locator('.app-shell-tab', { hasText: 'More' });
  await expect(more).toBeVisible();
  await expect(page.locator('.need-help-fab')).toBeVisible();
  const dash = await page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const tab = Array.from(document.querySelectorAll('.app-shell-tab')).find((el) => (el.textContent || '').includes('More'));
    const help = document.querySelector('.need-help-fab');
    const heights = Array.from(document.querySelectorAll('.app-shell-tab')).map((el) => el.getBoundingClientRect().height);
    return {
      tab: tab ? rect(tab) : null,
      help: help ? rect(help) : null,
      heights,
    };
  });
  expect(dash.tab && dash.help && intersects(dash.tab, dash.help)).toBe(false);
  expect(Math.min(...dash.heights)).toBeGreaterThanOrEqual(48);

  const sale = page.getByRole('button', { name: '💰 Record Sale' });
  await expect(sale).toBeVisible();
  const prompt = page.locator('.business-type-prompt');
  await expect(prompt).toBeVisible();
  const footer = page.locator('footer.app-footer');
  await expect(footer).toBeVisible();
  const layout = await page.evaluate(() => {
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    const help = document.querySelector('.need-help-fab');
    const saleEl = Array.from(document.querySelectorAll('button')).find((el) => (el.textContent || '').includes('Record Sale'));
    const card = document.querySelector('.business-type-prompt');
    const foot = document.querySelector('footer.app-footer');
    const tab = document.querySelector('.app-shell-tabs');
    const footStyle = foot ? getComputedStyle(foot) : null;
    return {
      help: rect(help),
      sale: rect(saleEl || null),
      card: rect(card),
      foot: rect(foot),
      tab: rect(tab),
      footPosition: footStyle ? footStyle.position : '',
    };
  });
  expect(layout.footPosition).toBe('static');
  expect(intersects(layout.help, layout.sale)).toBe(false);
  expect(intersects(layout.help, layout.card)).toBe(false);
  expect(intersects(layout.help, layout.tab)).toBe(false);
  expect(intersects(layout.foot, layout.tab)).toBe(false);
  await page.evaluate(() => {
    const foot = document.querySelector('footer.app-footer');
    const tab = document.querySelector('.app-shell-tabs');
    if (!foot || !tab) return;
    const tabH = tab.getBoundingClientRect().height;
    const footH = foot.getBoundingClientRect().height;
    const top = foot.getBoundingClientRect().top + window.scrollY - (window.innerHeight - tabH - footH - 12);
    window.scrollTo(0, Math.max(0, top));
  });
  await page.screenshot({ path: `${artifactDir}/retest12-phone-dashboard.png` });

  await page.goto('/dev/ux-preview/more', { waitUntil: 'domcontentloaded' });
  const share = page.getByRole('button', { name: /Share your store/ });
  const history = page.getByRole('button', { name: /Sales History/ });
  const money = page.getByRole('button', { name: /Money Book/ });
  await expect(share).toBeVisible();
  await expect(history).toBeVisible();
  await expect(money).toBeVisible();
  await expect(page.getByRole('button', { name: /Online Store/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /WhatsApp Store Link/ })).toHaveCount(0);
  const shareBox = await share.boundingBox();
  const historyBox = await history.boundingBox();
  const moneyBox = await money.boundingBox();
  expect(shareBox && historyBox && moneyBox && shareBox.y < historyBox.y && historyBox.y < moneyBox.y).toBe(true);
  expect(moneyBox?.height ?? 0).toBeGreaterThanOrEqual(48);
  await page.getByRole('button', { name: /Getting Started Guide/ }).click();
  await expect(page.getByRole('button', { name: /Add a product/ })).toBeVisible();
  await expect(page.locator('.more-sheet-status svg').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Publish your store/ })).toBeVisible();
  await page.screenshot({ path: `${artifactDir}/getting-started-phone.png` });
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(share).toBeVisible();
  const fade = page.locator('.more-menu-fade.is-on');
  const overflows = await page.evaluate(() => {
    const sections = document.querySelector('.more-menu-sections');
    if (!sections) return false;
    return sections.scrollHeight > sections.clientHeight + 12;
  });
  if (overflows) await expect(fade).toBeVisible();
  await expect(page.locator('footer.app-footer')).toBeHidden();
  const sheetFits = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.more-menu');
    const sections = document.querySelector('.more-menu-sections');
    if (!dialog || !sections) return false;
    const box = dialog.getBoundingClientRect();
    const style = getComputedStyle(sections);
    const pad = parseFloat(style.paddingBottom);
    return box.top >= 0
      && box.bottom <= window.innerHeight + 1
      && pad >= 16;
  });
  expect(sheetFits).toBe(true);
  await page.screenshot({ path: `${artifactDir}/more-sheet-after-phone.png` });

  // iPhone Safari with the toolbars open leaves about 664px of page on a 390×844 screen.
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(page.locator('footer.app-footer')).toBeHidden();
  const fitsToolbar = await page.evaluate(() => {
    const box = document.querySelector('dialog.more-menu')?.getBoundingClientRect();
    if (!box) return false;
    return box.top >= 0 && box.bottom <= window.innerHeight + 1;
  });
  expect(fitsToolbar).toBe(true);
  await page.screenshot({ path: `${artifactDir}/more-sheet-after-safari-toolbar.png` });
  await page.setViewportSize({ width: 390, height: 844 });

  const moreFooter = page.locator('.more-menu-powered');
  await page.locator('.more-menu-sections').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(page.locator('.more-menu-fade.is-on')).toHaveCount(0);
  await expect(moreFooter).toBeVisible();
  await money.click();

  await page.goto('/store/preview', { waitUntil: 'domcontentloaded' });
  const ask = page.getByRole('button', { name: 'Ask about products' });
  await expect(ask).toBeVisible();
  const askBox = await ask.boundingBox();
  expect(askBox?.y ?? 999).toBeLessThan(80);
  expect(Math.round(askBox?.width ?? 0)).toBeGreaterThanOrEqual(48);
  expect(Math.round(askBox?.height ?? 0)).toBeGreaterThanOrEqual(48);
  const covered = await page.evaluate(() => {
    const help = document.querySelector('.need-help-fab')?.getBoundingClientRect();
    if (!help) return true;
    return Array.from(document.querySelectorAll('.btn-add-to-cart, .storefront-share-button')).some((button) => {
      const r = button.getBoundingClientRect();
      const x = Math.min(help.right, r.right) - Math.max(help.left, r.left);
      const y = Math.min(help.bottom, r.bottom) - Math.max(help.top, r.top);
      return x > 0 && y > 0;
    });
  });
  expect(covered).toBe(false);

  const add = page.getByRole('button', { name: 'Add to Cart' }).first();
  await expect(add).toBeVisible();
  const clipped = await add.evaluate((el) => el.scrollWidth > el.clientWidth + 2);
  expect(clipped).toBe(false);
  await page.locator('.storefront-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.storefront-footer')).toContainText('Storehouse');
  await page.screenshot({ path: `${artifactDir}/retest12-phone-storefront.png` });
  await page.getByRole('button', { name: /shopping cart/i }).click();
  await expect(page.locator('.cart-powered')).toBeVisible();
  await expect(page.locator('.cart-powered')).toContainText('Powered by Storehouse');
  await page.screenshot({ path: `${artifactDir}/retest12-phone-cart.png` });
});

test('reviews, affiliate, and upgrade open on a skeleton while auth is resolving', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sb-example-auth-token', JSON.stringify({
      access_token: 'expired',
      refresh_token: 'refresh',
      expires_at: 1,
      expires_in: 1,
      token_type: 'bearer',
      user: {
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        aud: 'authenticated',
        role: 'authenticated',
      },
    }));
  });
  await page.route('**/auth/v1/**', () => new Promise(() => {}));
  for (const path of ['/reviews', '/affiliate/signup', '/upgrade']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.route-skeleton')).toBeVisible();
    await expect(page.getByText('Loading your store...')).toHaveCount(0);
    await expect(page.getByText('Loading...', { exact: true })).toHaveCount(0);
  }
});

test('fresh dashboard shows one setup card in a wide column', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('storehouse:setup-checklist:dismissed');
    localStorage.removeItem('storehouse:business-type-prompt:dismissed');
    localStorage.removeItem('storehouse_business_type');
    localStorage.setItem('storehouse_first_time_setup', 'true');
  });

  await page.goto('/dev/ux-preview/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Finish setting up' })).toBeVisible();
  await expect(page.getByText('Add your business name')).toBeVisible();
  await expect(page.locator('.business-type-prompt')).toHaveCount(0);
  await expect(page.locator('.partner-widget-compact')).toHaveCount(0);

  const width = page.viewportSize()?.width ?? 0;
  const column = await page.locator('.dashboard-minimal').boundingBox();
  expect(column?.width ?? 0).toBeGreaterThan(width > 500 ? 700 : 300);
  if (width > 500 && column) {
    const contentCenter = 240 + (width - 240) / 2;
    expect(Math.abs(column.x + column.width / 2 - contentCenter)).toBeLessThan(80);
  }

  const sizeLabel = width <= 400 ? '390x844' : '1440x900';
  await page.screenshot({ path: `${artifactDir}/fresh-owner-dashboard-${sizeLabel}.png` });

  if (width > 500) {
    await page.goto('/dev/ux-preview/more', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Getting Started Guide/ }).click();
    await expect(page.locator('.more-sheet-status svg').first()).toBeVisible();
    const dialog = await page.locator('dialog.more-menu').boundingBox();
    expect(dialog).toBeTruthy();
    if (dialog) expect(Math.abs(dialog.x + dialog.width / 2 - width / 2)).toBeLessThan(40);
    await page.screenshot({ path: `${artifactDir}/getting-started-desktop.png` });
  }

  for (const [name, path] of [
    ['reviews', '/dev/ux-preview/reviews'],
    ['affiliate', '/dev/ux-preview/affiliate'],
    ['plans', '/dev/ux-preview/upgrade?skeleton=1'],
  ] as const) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.route-skeleton')).toBeVisible();
    await expect(page.getByText(/^Loading/)).toHaveCount(0);
    await page.screenshot({ path: `${artifactDir}/${name}-skeleton-${sizeLabel}.png` });
  }
});
