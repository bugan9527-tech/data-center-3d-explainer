// S7: one reload per frame so the screenshot latency does not shift the sample.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const frames = [];
  for (const [at, name] of [[300, 'early'], [600, 'middle'], [900, 'late']]) {
    await page.goto(new URL(page.url()).origin);
    await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
    await page.locator('.rack-id').first().waitFor();
    await page.waitForTimeout(350);
    const start = JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera'));
    await page.getByRole('button', { name: '章节：存储设备', exact: true }).click();
    await page.waitForTimeout(at);
    const cam = JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera'));
    await page.screenshot({ path: `outputs/after-move-${name}.png`, fullPage: true });
    frames.push({ name, at, startY: +start.position[1].toFixed(2), y: +cam.position[1].toFixed(2), moving: await page.locator('.room-shell canvas').getAttribute('data-moving') });
  }
  return { frames, errors };
}
