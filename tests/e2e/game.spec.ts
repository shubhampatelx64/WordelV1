import { expect, test } from '@playwright/test';

test('admin logs in, creates custom game, user can open shared route', async ({ page, context }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/daily');

  const wordsRes = await page.request.get('/api/admin/words');
  const wordsJson = await wordsRes.json();
  expect(wordsJson.ok).toBeTruthy();
  const answerWordId = wordsJson.data[0].id;

  const createRes = await page.request.post('/api/admin/games', {
    data: { answerWordId, length: 5, maxAttempts: 6, difficulty: 'medium', dictionaryMode: 'STRICT', hardModeAllowed: true }
  });
  const created = await createRes.json();
  expect(created.ok).toBeTruthy();

  const userPage = await context.newPage();
  await userPage.goto(`/g/${created.data.shareCode}`);
  await expect(userPage.getByText('Shared Game')).toBeVisible();
});

test('admin assigns tomorrow daily and /api/daily returns metadata only', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@example.com');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.getByRole('button', { name: 'Login' }).click();

  const wordsRes = await page.request.get('/api/admin/words');
  const wordsJson = await wordsRes.json();
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  await page.request.post('/api/admin/daily/schedule', {
    data: { type: 'assign', dateKey: tomorrow, wordId: wordsJson.data[0].id, length: 5, difficulty: 'medium', hardModeAllowed: true }
  });

  const dailyRes = await page.request.get(`/api/daily?date=${tomorrow}&length=5&difficulty=medium`);
  const dailyJson = await dailyRes.json();
  expect(dailyJson.ok).toBeTruthy();
  expect(dailyJson.data.answerWordId).toBeUndefined();
});
