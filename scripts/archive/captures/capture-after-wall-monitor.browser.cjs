// The monitoring chapter frames the back wall and its wall-mounted collector;
// this is the view used for the 5× close-up of the box.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('button', { name: '监测系统 状态采集与汇集', exact: true }).click();
  await page.getByRole('button', { name: '查看位置', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.room-shell canvas').dataset.moving === 'false');
  // Leave the monitoring pose in place but deselect, so the box shows its normal
  // (non-highlighted) colour for the close-up.
  await page.getByRole('button', { name: '计算服务器 程序与任务处理', exact: true }).click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'outputs/after-wall-monitoring.png', fullPage: true });
  return { errors, camera: JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera')) };
}
