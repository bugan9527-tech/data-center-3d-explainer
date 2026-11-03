// S5 overview at five sizes: the framing box fills exactly one axis at each size.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const out = [];
  for (const [w, h] of [[1440, 1000], [1024, 768], [768, 1024], [375, 812], [812, 375]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(new URL(page.url()).origin);
    await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
    await page.locator('.rack-id').first().waitFor();
    await page.waitForTimeout(420);
    await page.screenshot({ path: `outputs/after-persp-overview-${w}.png`, fullPage: true });
    const cam = JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera'));
    const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
    out.push({ size: `${w}x${h}`, distance: +d.toFixed(2), overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  }
  return { out, errors };
}
