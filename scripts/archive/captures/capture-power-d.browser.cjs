// Dual feed, facility fittings and the genset teardown.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'outputs/dual-feed-overview.png' });

  await page.getByRole('button', { name: '查看供电系统的工作', exact: true }).click();
  await page.waitForTimeout(1200);
  const devices = await page.getByRole('combobox', { name: '选择设备' }).count();
  if (devices) {
    await page.getByRole('combobox', { name: '选择设备' }).selectOption('genset');
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'outputs/genset-teardown.png' });
  const parts = await page.locator('.teardown-list button').count();
  const names = await page.locator('.teardown-list .part-name').allInnerTexts();
  const camera = await page.locator('.room-shell canvas').getAttribute('data-camera');
  return { errors, devices, parts, names, camera };
}
