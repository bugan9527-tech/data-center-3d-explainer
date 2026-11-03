// Crop of the exterior power platform so the genset can be judged in the new
// dark theme.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 2880, height: 2000 });
  await page.goto(new URL(page.url()).origin);
  await page.waitForTimeout(1600);
  await page.screenshot({ path: 'outputs/power-exterior.png', clip: { x: 1750, y: 560, width: 1000, height: 820 } });
  return { errors };
}
