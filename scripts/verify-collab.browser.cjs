async page => {
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async (extra = 0) => {
    await page.waitForTimeout(160 + extra);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(160);
  };
  const snap = async () => (await canvas().screenshot()).toString('base64');
  const flow = () => page.evaluate(() => JSON.parse(document.querySelector('.room-shell canvas').dataset.flow));

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + '/');
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(400);

  // One view only: the old mode tabs, system rail, chapter chips and layer pills
  // were removed on request, so none of them may come back.
  check('没有模式标签', await page.locator('.mode-tab').count() === 0);
  check('没有左侧系统栏', await page.locator('.system-sidebar').count() === 0);
  check('没有镜头章节条', await page.locator('.camera-chapters').count() === 0);
  check('没有图层开关', await page.locator('.layer-toolbar').count() === 0);
  check('没有职责说明面板', await page.locator('.room-detail').count() === 0);

  // Desktop opens in the clean view; the transport bar is the only chrome kept.
  check('默认纯净视野隐藏顶栏', !(await page.locator('.app-header').isVisible()));
  check('默认纯净视野保留播放条', await page.locator('.collab-bar').isVisible());
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(400);
  check('显示界面恢复顶栏', await page.locator('.app-header').isVisible());
  check('播放条只有一个播放按钮', await page.locator('.collab-bar .play-button').count() === 1);
  check('进度共 11 段', await page.locator('.collab-segment').count() === 11);
  check('步骤标签随进度更新', (await page.locator('.collab-status').innerText()).includes('1 / 11'));
  check('图例只保留三条流向', await page.locator('.collab-bar .flow-legend > span').count() === 3);

  // Playback drives the collaboration loop.
  const start = await flow();
  await page.getByRole('button', { name: '播放演示', exact: true }).click();
  await page.waitForTimeout(1200);
  const moved = await flow();
  check('播放推进进度', moved.progress > start.progress || moved.step > start.step);
  check('播放时按钮变为停止', await page.getByRole('button', { name: '停止演示', exact: true }).isVisible());
  await page.getByRole('button', { name: '停止演示', exact: true }).click();
  await page.waitForTimeout(500);
  const frozenA = await snap();
  await page.waitForTimeout(500);
  check('停止后画布静止', frozenA === await snap());

  // Space toggles the same transport, which is how the clean view is driven.
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await page.waitForTimeout(300);
  const beforeSpace = await flow();
  await page.keyboard.press(' ');
  await page.waitForTimeout(1000);
  check('空格开始播放', (await flow()).progress > beforeSpace.progress || (await flow()).step > beforeSpace.step);
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check('Esc 恢复界面', await page.locator('.app-header').isVisible());

  // Picking a device is the only detail entrance.
  check('八个系统标注都可点', await page.locator('.room-callout').count() === 8);
  // Exploding a cabinet must not interrupt the running demo.
  await page.getByRole('button', { name: '播放演示', exact: true }).click();
  await page.waitForTimeout(700);
  const beforePick = await flow();
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await settle(1600);
  const afterPick = await flow();
  check('点设备打开说明面板', await page.locator('.room-detail').count() === 1);
  check('点设备进入拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('拆解清单 11 件', await page.locator('.teardown-list li').count() === 11);
  check('规格卡显示当前部件', (await page.locator('.teardown-spec h3').innerText()).includes('计算服务器 01'));
  check('拆解时播放条仍在', await page.locator('.collab-bar').isVisible());
  check('拆解不打断演示', afterPick.progress > beforePick.progress || afterPick.step > beforePick.step);
  check('拆解时状态显示继续', (await page.locator('.collab-status').innerText()).includes('拆解中'));
  check('拆解时播放按钮仍在播放', await page.locator('.collab-bar .play-button').getAttribute('aria-pressed') === 'true');
  await page.getByRole('button', { name: '停止演示', exact: true }).click();
  await page.waitForTimeout(500);
  check('停止演示不关闭拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  await page.screenshot({ path: 'outputs/collab-device.png', fullPage: true });

  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await settle(1200);
  check('收起说明关闭面板', await page.locator('.room-detail').count() === 0);
  check('收起说明退出拆解', !(await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));

  // Each progress segment is a shortcut into that stage.
  await page.locator('.collab-segment').nth(4).click();
  await page.waitForTimeout(400);
  check('点击段落跳到对应步骤', (await page.locator('.collab-status').innerText()).includes('5 / 11'));

  // Phone layout keeps one column without horizontal overflow.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(600);
  check('375 无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  check('375 播放条仍可用', await page.locator('.collab-bar .play-button').isVisible());
  await page.screenshot({ path: 'outputs/collab-375.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(400);

  // Reduced motion: the loop may not keep animating on its own.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(500);
  const rmA = await snap();
  await page.waitForTimeout(500);
  check('减少动态效果下画面静止', rmA === await snap());
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  check('全程无控制台错误', errors.length === 0);
  return { results, errors };
}
