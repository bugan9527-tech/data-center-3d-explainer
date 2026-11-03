// Batch A: overview, a zoomed look, and the opened panel, so placement can be
// checked against the real geometry.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'outputs/safety-overview.png' });

  // The camera buttons live in the interface, which the clean view hides.
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(500);
  const zoom = page.getByRole('button', { name: '放大机房', exact: true });
  for (let index = 0; index < 3; index += 1) { await zoom.click(); await page.waitForTimeout(700); }
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'outputs/safety-zoom.png' });

  await page.getByRole('button', { name: '复位视角', exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: '查看消防与安防的工作', exact: true }).click();
  await page.waitForTimeout(700);
  const panelTitle = await page.locator('.detail-panel h2').first().textContent();
  await page.screenshot({ path: 'outputs/safety-panel.png' });
  return { errors, panelTitle, callouts: await page.locator('.room-callout').count() };
}
