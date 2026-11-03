// S5: six chapter poses plus a support close-up, with the camera state that the
// perspective rig derives (distance, fov, zoomRatio).
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  // Wait for the transition to actually start before waiting for it to end,
  // otherwise a screenshot can land mid-flight.
  const settle = async () => {
    await page.waitForTimeout(140);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(140);
  };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(300);

  const out = [];
  const chapters = [
    ['机房总览', 'overview'], ['网络设备', 'network'], ['计算服务器', 'compute'],
    ['存储设备', 'storage'], ['UPS 与配电', 'power'], ['制冷设备', 'cooling'],
  ];
  for (const [title, id] of chapters) {
    await page.getByRole('button', { name: `章节：${title}`, exact: true }).click();
    await settle();
    await page.screenshot({ path: `outputs/after-persp-${id}.png`, fullPage: true });
    const cam = JSON.parse(await canvas().getAttribute('data-camera'));
    const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
    out.push({ id, target: cam.target.map(v => +v.toFixed(2)), distance: +d.toFixed(2), zoomRatio: +cam.zoomRatio.toFixed(3), projection: cam.projection });
  }
  // One close-up proves the same math drives the support cameras.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(220);
  await page.locator('.support-steps .step-button').nth(3).click();
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  await settle();
  await page.screenshot({ path: 'outputs/after-persp-support-busway.png', fullPage: true });
  return { out, errors };
}
