import { test, expect } from '@playwright/test';

test('public site loads and has a restaurant/category surface', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/Application failed|Internal Server Error/);
  await expect(page.locator('body')).toContainText(/مسافر|الموقع/);
});
