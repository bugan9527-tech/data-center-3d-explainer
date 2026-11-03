async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'outputs/bar-full.png' });
  const box = await page.locator('.collab-bar').boundingBox();
  await page.screenshot({ path: 'outputs/bar-closeup.png', clip: { x: box.x - 8, y: box.y - 8, width: box.width + 16, height: box.height + 16 } });
  const style = await page.locator('.collab-bar').evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundImage.slice(0, 60), border: s.borderTopColor, radius: s.borderRadius };
  });
  return { errors, style };
}
