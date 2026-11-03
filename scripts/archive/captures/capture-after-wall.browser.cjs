// S4b: overview plus two chapter views, to check wall fade, its open ends and
// the wall-mounted devices.
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
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'outputs/after-wall.png', fullPage: true });
  const out = [];
  for (const [title, id] of [['制冷设备', 'cooling'], ['UPS 与配电', 'power'], ['网络设备', 'network']]) {
    await page.getByRole('button', { name: `章节：${title}`, exact: true }).click();
    await settle();
    await page.screenshot({ path: `outputs/after-wall-${id}.png`, fullPage: true });
    out.push(id);
  }
  return { out, errors };
}
