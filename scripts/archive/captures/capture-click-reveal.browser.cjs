async page => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + '/');
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'outputs/click-before.png' });
  const box = await page.locator('.room-shell canvas').boundingBox();
  await page.mouse.click(box.x + box.width * .32, box.y + box.height * .42);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: 'outputs/click-after.png' });
  return { results: [{ name: 'panel=' + (await page.locator('.room-detail').isVisible()), passed: true }] };
}
