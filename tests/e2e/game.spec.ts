import { expect, test } from '@playwright/test';

test('login and play short game', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/daily');
  await page.getByRole('textbox').fill('APPLE');
  await page.getByRole('button', { name: 'Guess' }).click();
  await expect(page.getByTestId('status')).toHaveText('WIN');
});

test('leaderboard shows entry', async ({ page }) => {
  await page.goto('/leaderboard');
  await expect(page.getByTestId('leaderboard-entry').first()).toBeVisible();
});
