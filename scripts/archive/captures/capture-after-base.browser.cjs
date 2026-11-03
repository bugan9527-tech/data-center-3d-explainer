// S3 re-shoot: six chapter poses plus the right-front service strip looked at
// from two extra angles for base/prop review.
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
    await page.screenshot({ path: `outputs/after-base-${id}.png`, fullPage: true });
    shots.push(id);
  }
  // Close look at the plinth and the props: back to the overview, then zoom.
  await page.getByRole('button', { name: '章节：机房总览', exact: true }).click();
  await settle();
  const canvas = page.locator('.room-shell canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width * .62, box.y + box.height * .7);
  await page.mouse.wheel(0, -420);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'outputs/after-base-props.png', fullPage: true });
  return { shots, errors };
}
