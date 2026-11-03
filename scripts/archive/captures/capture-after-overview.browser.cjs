// S4: the overview at the four required sizes plus the landscape phone size.
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
    await page.waitForTimeout(450);
    const box = await page.locator('.room-shell canvas').boundingBox();
    await page.screenshot({ path: `outputs/after-overview-${w}.png`, fullPage: true });
    out.push({
      size: `${w}x${h}`,
      canvas: [Math.round(box.width), Math.round(box.height)],
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      camera: JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera')),
      racks: await page.locator('.rack-id').count(),
    });
  }
  return { out, errors };
}
