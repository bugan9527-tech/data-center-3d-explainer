// P2-1 evidence: support playback collapses the bottom sheet to a 64 px strip
// and pausing restores the full sheet. Checks the pause button is hit-testable
// and that the mini strip does not overflow at 375/768.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const mini = () => page.locator('.workflow-card.is-mini');
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(220);
  };
  const hit = () => page.evaluate(() => {
    const button = document.querySelector('.support-play');
    const r = button.getBoundingClientRect();
    const target = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return target === button || target?.closest('.support-play');
  });
  const play = () => page.getByRole('button', { name: /播放|暂停|继续/ }).filter({ has: page.locator('svg') });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await settle();
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await settle();
  await page.locator('.support-play').click();
  await page.waitForTimeout(450);
  const h = await mini().evaluate(el => el.getBoundingClientRect().height);
  check('播放时底部卡片收成 64px 迷你条', await mini().count() === 1 && Math.abs(h - 64) < 1.5);
  check('迷你条暂停按钮可点击', await hit());
  await page.screenshot({ path: 'outputs/p2-mini-1440.png', fullPage: false });
  await page.locator('.support-play').click();
  await page.waitForTimeout(350);
  check('暂停恢复完整卡片', await mini().count() === 0 && await page.locator('.support-workflow').count() === 1);
  await page.screenshot({ path: 'outputs/p2-mini-paused-1440.png', fullPage: false });

  for (const [width, height] of [[375, 812], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    await page.locator('.support-play').click();
    await page.waitForTimeout(300);
    const mh = await mini().evaluate(el => el.getBoundingClientRect().height);
    check(`${width} 宽迷你条高度`, await mini().count() === 1 && Math.abs(mh - 64) < 1.5);
    check(`${width} 宽无横向溢出`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `outputs/p2-mini-${width}.png`, fullPage: false });
    await page.locator('.support-play').click();
    await page.waitForTimeout(250);
  }
  check('截图过程无控制台错误', errors.length === 0);
  return { results, errors };
}
