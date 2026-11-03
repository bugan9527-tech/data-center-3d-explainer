// S1: same-camera before/after frames of C01. The stage is read from the page
// query so one file serves both runs; overlays are reopened once to drive the
// camera, then closed again so the canvas is captured clean.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async () => {
    await page.waitForTimeout(160);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(160);
  };
  const stage = await page.evaluate(() => new URLSearchParams(location.search).get('stage') || 'unknown');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + `/?stage=${stage}`);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();

  // Use the closest existing pose (供电第 5 步 → rack-front) so the cabinet fills
  // enough of the frame for a pixel comparison.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator('.support-steps .step-button').nth(4).click();
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  await settle();
  // Remove the support ribbon so the frame contains only the cabinet.
  const power = page.locator('.layer-buttons .layer-button', { hasText: '电力' });
  if (await power.getAttribute('aria-pressed') === 'true') await power.click();
  await page.waitForTimeout(200);

  // Selecting compute keeps the camera; it only brings up the teardown action.
  await page.locator('.system-sidebar .system-button', { hasText: '计算服务器' }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await settle();
  await canvas().scrollIntoViewIfNeeded();
  await canvas().screenshot({ path: `outputs/s1-${stage}-rack-front.png` });
  await page.screenshot({ path: `outputs/s1-${stage}-rack-front-full.png`, fullPage: true });
  const closedCamera = await page.evaluate(() => document.querySelector('.room-shell canvas').dataset.camera);

  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(150);
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await settle();
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await settle();
  await canvas().scrollIntoViewIfNeeded();
  await canvas().screenshot({ path: `outputs/s1-${stage}-teardown.png` });
  await page.screenshot({ path: `outputs/s1-${stage}-teardown-full.png`, fullPage: true });
  const teardownCamera = await page.evaluate(() => document.querySelector('.room-shell canvas').dataset.camera);

  return { stage, closedCamera: JSON.parse(closedCamera), teardownCamera: JSON.parse(teardownCamera), errors };
}
