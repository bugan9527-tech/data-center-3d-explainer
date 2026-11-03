// S2 re-shoot: same six chapter poses and one support close-up, prefix after-bg.
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

  const chapters = [
    ['机房总览', 'overview'], ['网络设备', 'network'], ['计算服务器', 'compute'],
    ['存储设备', 'storage'], ['UPS 与配电', 'power'], ['制冷设备', 'cooling'],
  ];
  const shots = [];
  for (const [title, id] of chapters) {
    await page.getByRole('button', { name: `章节：${title}`, exact: true }).click();
    await settle();
    await page.screenshot({ path: `outputs/after-bg-${id}.png`, fullPage: true });
    shots.push({ id, camera: JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera')) });
  }
  // One cooling frame proves the floor fade does not hide the vents.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(200);
  await page.locator('.support-steps .step-button').nth(2).click();
  await page.waitForTimeout(120);
  await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  await settle();
  await page.screenshot({ path: 'outputs/after-bg-support-cooling-step3.png', fullPage: true });
  return { shots, errors };
}
