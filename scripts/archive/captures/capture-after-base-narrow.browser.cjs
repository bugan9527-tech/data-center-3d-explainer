// S2 narrow check: 375 and 768 overview, plus the overflow assertion used by the suite.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const out = [];
  for (const [width, height] of [[375, 812], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    await page.goto(new URL(page.url()).origin);
    await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
    await page.locator('.rack-id').first().waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `outputs/after-base-${width}.png`, fullPage: true });
    out.push({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) });
  }
  return { out, errors };
}
