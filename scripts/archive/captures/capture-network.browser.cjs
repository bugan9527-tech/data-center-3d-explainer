// Batch B: the network cabinet's exploded view, so the four new units can be
// checked against the assemblies they sit between.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: '查看网络设备的工作', exact: true }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'outputs/network-teardown.png' });
  const parts = await page.locator('.teardown-list button').count();
  const names = await page.locator('.teardown-list .part-name').allInnerTexts();
  await page.locator('.teardown-list button').nth(8).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'outputs/network-router.png' });
  return { errors, parts, names };
}
