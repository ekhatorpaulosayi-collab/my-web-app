import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir } from 'node:fs/promises';

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
  await mkdir('/opt/cursor/artifacts/ux-after', { recursive: true });
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
    const shot = `/opt/cursor/artifacts/ux-after/${name}-${sizeLabel}.png`;
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
