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

  await page.goto('/dev/ux-preview/more', { waitUntil: 'domcontentloaded' });
  const money = page.getByRole('button', { name: /Money Book/ });
  await expect(money).toBeVisible();
  const moneyBox = await money.boundingBox();
  expect(moneyBox?.height ?? 0).toBeGreaterThanOrEqual(48);
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
});
