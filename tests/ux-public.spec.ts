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

    const shot = `/opt/cursor/artifacts/ux-after/${name}-${testInfo.project.name}.png`;
    await page.screenshot({ path: shot, fullPage: false });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const serious = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    const summary = serious.map((v) => `${v.id} (${v.nodes.length})`).join(', ');
    expect(serious, summary || 'no serious axe violations').toEqual([]);
  });
}
