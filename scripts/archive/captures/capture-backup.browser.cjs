// Batch D: the backup cabinet in the rear row, closed and exploded.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'outputs/backup-overview.png' });
  await page.getByRole('button', { name: '查看备份与容灾的工作', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'outputs/backup-teardown.png' });
  const parts = await page.locator('.teardown-list button').count();
  const names = await page.locator('.teardown-list .part-name').allInnerTexts();
  const camera = JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera') || '{}');
  return { errors, parts, names, camera, racks: await page.locator('.rack-id').count() };
}
