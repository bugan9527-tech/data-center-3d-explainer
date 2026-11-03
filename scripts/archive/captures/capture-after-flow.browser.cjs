// S8: glow head on the request route and on a support step, plus the
// reduced-motion state (static path only).
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async () => { await page.waitForTimeout(140); await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false'); };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();

  // Request route mid-stage, seen from the network close-up where the head is
  // clear of the HTML node labels.
  await page.getByRole('tab', { name: '协作流程', exact: true }).click();
  await page.getByRole('button', { name: '章节：网络设备', exact: true }).click();
  await settle();
  await page.locator('.request-workflow .step-button').nth(1).click();
  await page.locator('.request-workflow .play-button').click();
  await page.waitForTimeout(2100);
  await page.locator('.request-workflow .play-button').click();
  await page.waitForTimeout(180);
  await canvas().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/after-flow-request.png', fullPage: true });
  await canvas().screenshot({ path: 'outputs/after-flow-request-canvas.png' });
  const requestFlow = JSON.parse(await canvas().getAttribute('data-flow'));

  // Support step mid-flight, cooling vent close-up.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(250);
  await page.locator('.support-steps .step-button').nth(2).click();
  await page.waitForTimeout(150);
  await page.locator('.camera-button').click();
  await settle();
  await page.locator('.support-play').click();
  await page.waitForTimeout(2600);
  await page.locator('.support-play').click();
  await page.waitForTimeout(180);
  await canvas().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/after-flow-support.png', fullPage: true });
  await canvas().screenshot({ path: 'outputs/after-flow-support-canvas.png' });
  const support = JSON.parse(await canvas().getAttribute('data-support'));

  // Reduced motion: same support step, no glow, path and arrows only.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'outputs/after-flow-reduced.png', fullPage: true });
  return { errors, requestFlow: { step: requestFlow.step, progress: requestFlow.progress }, support: { step: support.step, progress: support.progress } };
}
