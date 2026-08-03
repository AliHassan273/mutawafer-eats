import { test, expect } from '@playwright/test';

test('health endpoint is available', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBeTruthy();
  expect((await response.json()).status).toBe('ok');
});

test('public site loads and has a restaurant/category surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Application failed|Internal Server Error/);
  await expect(page.locator('body')).toContainText(/مسافر|الموقع/);
});

test('public restaurant API responds with JSON', async ({ request }) => {
  const response = await request.get('/api/restaurants');
  expect(response.ok()).toBeTruthy();
  expect(Array.isArray(await response.json())).toBeTruthy();
});
