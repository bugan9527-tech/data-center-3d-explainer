// High-density crops of the new equipment, taken at 2x so the small parts can be
// judged at native resolution instead of a downscaled full-frame screenshot.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 2880, height: 1800 });
  await page.goto(new URL(page.url()).origin);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'outputs/safety-hi-left.png', clip: { x: 170, y: 330, width: 520, height: 620 } });
  await page.screenshot({ path: 'outputs/safety-hi-rear.png', clip: { x: 700, y: 200, width: 900, height: 400 } });
  await page.screenshot({ path: 'outputs/safety-hi-full.png' });
  return { errors };
}
