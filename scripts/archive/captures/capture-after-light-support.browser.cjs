// S1 highlight check: two support close-ups where a node is in its active state.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(150);
  };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(300);
  await page.locator('.support-steps .step-button').first().click();
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  await settle();
  await page.screenshot({ path: 'outputs/after-light-support-power-step1.png', fullPage: true });
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(250);
  await page.locator('.support-steps .step-button').nth(2).click();
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  await settle();
  await page.screenshot({ path: 'outputs/after-light-support-cooling-step3.png', fullPage: true });
  return { errors };
}
