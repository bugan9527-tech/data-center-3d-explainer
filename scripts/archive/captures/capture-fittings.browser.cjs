async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 2880, height: 2000 });
  await page.goto(new URL(page.url()).origin);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'outputs/fittings-wall.png', clip: { x: 460, y: 380, width: 1180, height: 560 } });
  return { errors };
}
