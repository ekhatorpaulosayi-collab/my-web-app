import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

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
  await page.screenshot({ path: '/opt/cursor/artifacts/retest12-phone-dashboard.png' });

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
  const fade = page.locator('.more-menu-fade.is-on');
  await expect(fade).toBeVisible();
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
      && sections.scrollHeight > sections.clientHeight + 12
      && pad >= 16;
  });
  expect(sheetFits).toBe(true);
  await page.screenshot({ path: '/opt/cursor/artifacts/more-sheet-after-phone.png' });

  // iPhone Safari with the toolbars open leaves about 664px of page on a 390×844 screen.
  await page.setViewportSize({ width: 390, height: 664 });
  await expect(fade).toBeVisible();
  await expect(page.locator('footer.app-footer')).toBeHidden();
  const fitsToolbar = await page.evaluate(() => {
    const box = document.querySelector('dialog.more-menu')?.getBoundingClientRect();
    if (!box) return false;
    return box.top >= 0 && box.bottom <= window.innerHeight + 1;
  });
  expect(fitsToolbar).toBe(true);
  await page.screenshot({ path: '/opt/cursor/artifacts/more-sheet-after-safari-toolbar.png' });
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
  await page.screenshot({ path: '/opt/cursor/artifacts/retest12-phone-storefront.png' });
  await page.getByRole('button', { name: /shopping cart/i }).click();
  await expect(page.locator('.cart-powered')).toBeVisible();
  await expect(page.locator('.cart-powered')).toContainText('Powered by Storehouse');
  await page.screenshot({ path: '/opt/cursor/artifacts/retest12-phone-cart.png' });
});
