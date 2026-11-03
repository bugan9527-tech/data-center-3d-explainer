async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const close = (a, b, tol = .02) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < tol);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const read = async () => JSON.parse(await canvas().getAttribute('data-support'));
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const play = () => page.locator('.support-play');
  const stepButton = i => page.locator('.support-steps .step-button').nth(i);
  const settle = async () => { await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false'); await page.waitForTimeout(80); };
  const manual = async i => { await stepButton(i).click(); await page.waitForTimeout(90); };

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(300);
  await settle();
  check('进入持续支撑移动到供电基底机位', close((await camera()).target, [1.5, 1, -1.9]));
  check('持续支撑模式显示双章节讲解', await page.locator('.support-workflow').count() === 1 && await page.getByRole('tab', { name: '供电', exact: true }).count() === 1 && await page.getByRole('tab', { name: '制冷', exact: true }).count() === 1);
  check('进入支撑模式默认只显示供电路径', same((await read()).visible, { power: true, cooling: false }) && await page.getByRole('button', { name: '电力', exact: true }).getAttribute('aria-pressed') === 'true');

  const powerExpected = [['feed'], ['ups'], ['ups', 'distribution'], ['distribution', 'busway'], ['busway', 'rackPdu'], ['rackPdu', 'psu']];
  const powerCameras = [[4.55, 1.55, -4.3], [2.6, 1.15, -3.55], [3.9, 1.15, -3.55], [1.0, 2.86, -.27], [-1.65, 1.25, 1.1], [-1.65, 1.25, 1.1]];
  for (let index = 0; index < 6; index += 1) {
    await manual(index);
    const state = await read();
    check(`供电第 ${index + 1} 步节点与说明联动`, state.chapter === 'power' && state.step !== null && same(state.active, powerExpected[index]));
    check(`供电第 ${index + 1} 步手动选步暂停并回到起点`, state.progress === 0 && await play().getAttribute('aria-pressed') === 'false');
    check(`供电第 ${index + 1} 步文字节点高亮一致`, await page.locator(`.support-devices [data-participating="true"]`).count() === powerExpected[index].length);
    check(`供电第 ${index + 1} 步说明包含设备与输入输出`, await page.locator('.support-facts dt').allTextContents().then(t => t.join('|') === '当前设备|接收什么|输出到哪里|与谁配合'));
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
    await settle();
    check(`供电第 ${index + 1} 步特写镜头`, close((await camera()).target, powerCameras[index]));
    if (index === 0) await page.screenshot({ path: 'outputs/support-power-feed.png', fullPage: true });
    if (index === 3) await page.screenshot({ path: 'outputs/support-power-busway-up.png', fullPage: true });
    if (index === 4) await page.screenshot({ path: 'outputs/support-power-rack-front.png', fullPage: true });
  }
  const nodeCameraBefore = await camera();
  check('断电节点可独立选择并解释四项职责', await (async () => {
    await page.getByRole('button', { name: '查看支撑节点：UPS 不间断电源', exact: true }).click();
    await page.waitForTimeout(120);
    const labels = await page.locator('.support-node-card dt').allTextContents();
    return labels.join('|') === '负责什么|接收什么|输出到哪里|与谁配合' && (await page.locator('.selected-node').innerText()).includes('UPS');
  })());
  check('选择支撑节点不移动镜头', same(nodeCameraBefore, await camera()));
  check('选择节点不改变讲解阶段', (await read()).step === '设备电源模块转换成内部用电');

  // Playback contract: play, pause holds pixels, continue resumes the same clock.
  await manual(1);
  await play().click();
  await page.waitForTimeout(700);
  const running = await read();
  check('播放推进阶段进度', running.progress > .05 && await play().getAttribute('aria-pressed') === 'true');
  await play().click();
  await page.waitForTimeout(120); // let the mini strip restore to the full sheet before sampling
  const paused = await read();
  await page.waitForTimeout(320);  // let the pause re-render settle before sampling
  await page.waitForTimeout(900);
  check('暂停保留阶段与进度', same(paused, await read()) && paused.progress > .05);
  await play().click();
  await page.waitForTimeout(500);
  const resumed = await read();
  check('继续从暂停进度恢复', resumed.progress > paused.progress && resumed.step === paused.step);
  await play().click();

  await page.locator('.support-workflow .restart-button').click();
  await page.waitForTimeout(100);
  check('重新开始回到第一步并暂停', (await read()).progress === 0 && (await read()).step === '上游电源进入机房' && await play().getAttribute('aria-pressed') === 'false');

  // Playback no longer moves the camera by itself: the base view stays put across
  // step boundaries so the whole route keeps flowing on screen.
  await manual(1);
  const targetBeforeStep = (await camera()).target;
  await play().click();
  await page.waitForTimeout(5700);
  await settle();
  check('播放切步不移动镜头', (await read()).step === '配电柜分成多条回路' && close((await camera()).target, targetBeforeStep));
  await play().click();
  await page.waitForTimeout(120);
  await manual(1);
  await page.locator('.support-stage .camera-button').click();
  await settle();
  await play().click();
  await page.waitForTimeout(5900);
  await play().click();
  await page.waitForTimeout(120);
  await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
  const autoPaused = await canvas().screenshot();
  await page.waitForTimeout(900);
  check('播放切步后暂停画布一致', autoPaused.toString('base64') === (await canvas().screenshot()).toString('base64'));

  // Cooling chapter reuses the same clock contract and swaps the visible layer.
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(250);
  await settle();
  check('切换制冷移动到制冷基底机位', close((await camera()).target, [-.5, .6, -.9]));
  check('切到制冷后只显示冷空气与回风', same((await read()).visible, { power: false, cooling: true }) && await page.getByRole('button', { name: '冷空气', exact: true }).getAttribute('aria-pressed') === 'true');
  check('制冷章节为七步', await page.locator('.support-steps .step-button').count() === 7);
  const coolingExpected = [['crac'], ['crac', 'plenum'], ['plenum', 'vent'], ['vent', 'deviceFan'], ['deviceFan', 'rackAir'], ['rackAir', 'exhaust'], ['exhaust', 'return']];
  const coolingCameras = [[-3.75, 1, -3.45], [.2, .12, 1.9], [-1.65, .45, 1.5], [1.2, 1.15, 1.75], [-1.65, 1.25, .8], [1.4, 1.0, -.28], [1.4, 1.0, -.28]];
  for (let index = 0; index < 7; index += 1) {
    await manual(index);
    const state = await read();
    check(`制冷第 ${index + 1} 步节点与说明联动`, state.chapter === 'cooling' && same(state.active, coolingExpected[index]));
    if (index === 3 || index === 4) check(`制冷第 ${index + 1} 步显示放大机柜内部提示`, await page.locator('.support-stage .camera-button').innerText() === '放大看机柜内部气流' && await page.locator('.support-stage .camera-hint').count() === 1);
    await page.locator('.support-stage .camera-button').click();
    await settle();
    check(`制冷第 ${index + 1} 步特写镜头`, close((await camera()).target, coolingCameras[index]));
    if (index === 3) {
      await play().click();
      await page.waitForTimeout(700);
      await play().click();
      await page.waitForTimeout(320);
      await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
      const hintPaused = await canvas().screenshot();
      await page.waitForTimeout(900);
      check('制冷第 4 步暂停画布一致（含放大提示）', hintPaused.toString('base64') === (await canvas().screenshot()).toString('base64'));
    }
    if (index === 0) await page.screenshot({ path: 'outputs/support-cooling-crac.png', fullPage: true });
    if (index === 2) await page.screenshot({ path: 'outputs/support-cooling-vent.png', fullPage: true });
    if (index === 5) await page.screenshot({ path: 'outputs/support-cooling-exhaust.png', fullPage: true });
    if (index === 6) await page.screenshot({ path: 'outputs/support-cooling-return.png', fullPage: true });
  }
  // Finishing the last step must hold, not loop.
  await play().click();
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '查看支撑节点：回风路径', exact: true }).click();
  await page.waitForTimeout(200);
  check('制冷讲解播放中可独立选择节点', (await read()).chapter === 'cooling' && (await page.locator('.selected-node').innerText()).includes('回风路径'));
  await page.getByText('第 7 / 7 步 · 演示结束', { exact: true }).waitFor({ timeout: 20000 });
  const ended = await read();
  await page.waitForTimeout(900);
  check('讲解结束后保持最后一步且不循环', ended.step === '回风返回制冷设备' && ended.progress === 1 && same(ended, await read()) && await play().getAttribute('aria-pressed') === 'false');
  await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
  const endedShot = await canvas().screenshot();
  await page.waitForTimeout(500);
  check('结束后画布保持静止', endedShot.toString('base64') === (await canvas().screenshot()).toString('base64'));
  await page.screenshot({ path: 'outputs/support-cooling-finished.png', fullPage: true });

  // Background pause uses the same visibility event as the request demo.
  await page.getByRole('tab', { name: '供电', exact: true }).click();
  await page.waitForTimeout(150);
  await play().click();
  await page.waitForTimeout(400);
  const beforeHide = await read();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(160);
  check('切到后台时自动暂停支撑讲解', await play().getAttribute('aria-pressed') === 'false' && (await read()).progress > 0);
  const hiddenProgress = (await read()).progress;
  await page.waitForTimeout(300);
  check('后台保留暂停进度', (await read()).progress === hiddenProgress && beforeHide.progress > 0);
  await page.evaluate(() => { delete document.hidden; });

  // Reduced motion keeps static paths but stops markers and fans.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await manual(2);
  await play().click();
  await page.waitForTimeout(200);
  await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
  const stillA = await canvas().screenshot();
  await page.waitForTimeout(600);
  check('减少动态效果保留静态箭头并停止移动', stillA.toString('base64') === (await canvas().screenshot()).toString('base64'));
  await page.screenshot({ path: 'outputs/support-reduced-motion.png', fullPage: true });
  await play().click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  // Business flow and support can be seen together; support stays continuous.
  await page.getByRole('button', { name: '在协作流程中同时查看', exact: true }).click();
  await page.waitForTimeout(220);
  check('同时查看切到业务流程并保留支撑图层', await page.getByRole('tab', { name: '协作流程', exact: true }).getAttribute('aria-selected') === 'true' && same((await read()).visible, { power: true, cooling: true }));
  check('业务流程中同时显示供电与制冷', same((await read()).visible, { power: true, cooling: true }) && await page.locator('.support-strip').count() === 1);
  check('支撑系统不插入请求步骤', await page.locator('.request-workflow .step-button').count() === 11);
  await page.screenshot({ path: 'outputs/support-with-request.png', fullPage: true });
  await page.locator('.request-workflow .play-button').click();
  await page.waitForTimeout(600);
  const reqProgress = JSON.parse(await canvas().getAttribute('data-flow')).progress;
  check('业务流程照常运行', reqProgress > 0);
  await page.locator('.request-workflow .play-button').click();

  // Entering the server freezes everything and the return restores the support state.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(160);
  await page.getByRole('button', { name: '计算服务器 程序与任务处理', exact: true }).click();
  await page.waitForTimeout(120);
  await manual(3);
  await play().click();
  await page.waitForTimeout(400);
  const beforeEntry = await read();
  await page.getByRole('button', { name: '打开服务器内部', exact: true }).click();
  await page.locator('.phase-inside').waitFor();
  await page.getByRole('button', { name: '返回机房', exact: true }).click();
  await page.locator('.phase-room').waitFor();
  await page.waitForTimeout(220);
  const afterReturn = await read();
  check('返回后保留支撑章节、阶段与图层', afterReturn.chapter === 'power' && afterReturn.step === beforeEntry.step && same(afterReturn.visible, beforeEntry.visible));
  check('返回后支撑讲解保持暂停', await play().getAttribute('aria-pressed') === 'false' && Math.abs(afterReturn.progress - beforeEntry.progress) < .06);

  // Keyboard operation of the chapter steps.
  await stepButton(2).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(140);
  check('键盘手动选步暂停并回到起点', (await read()).progress === 0 && await play().getAttribute('aria-pressed') === 'false');
  check('键盘选择同步更新说明', (await page.locator('.support-stage strong').innerText()).startsWith('3.'));

  for (const [width, height] of [[375, 812], [768, 1024], [1024, 768], [1440, 900], [812, 375]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    check(`支撑界面无横向溢出 ${width}×${height}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`支撑界面控件可操作 ${width}`, await play().isVisible() && await page.locator('.support-stage .camera-button').isVisible() && await page.locator('.support-steps .step-button').first().isVisible());
    if (width <= 900) check(`窄屏隐藏空间标注 ${width}`, await page.locator('.support-label:visible').count() === 0);
    await page.screenshot({ path: `outputs/support-layout-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  check('正常流程无控制台错误', errors.length === 0);
  return { results, errors, browser: await page.evaluate(() => navigator.userAgent) };
}
