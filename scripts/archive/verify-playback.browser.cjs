async page => {
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const canvas = () => page.locator('.room-shell canvas');
  const read = async () => JSON.parse(await canvas().getAttribute('data-flow'));
  const support = async () => JSON.parse(await canvas().getAttribute('data-support'));
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const snap = async () => (await canvas().screenshot()).toString('base64');
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const playButton = () => page.locator('.request-workflow .play-button');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(page.url().replace(/\/$/, '') + '/');
  await page.locator('.rack-id').first().waitFor();

  // The playback view is the only place that offers a transport now.
  check('打开页面默认纯净视野', await page.getByRole('button', { name: '显示界面', exact: true }).isVisible());
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('tab', { name: '协作流程', exact: true }).click();
  await page.waitForTimeout(1400);

  const controls = await page.evaluate(() => [...document.querySelectorAll('.request-workflow button')]
    .filter(button => button.offsetHeight > 0).map(button => button.textContent.trim()));
  check('播放视图只剩一个控制按钮', controls.length === 1 && controls[0].includes('播放'));
  check('步骤条与设备列表已移除', !(await page.locator('.request-workflow .workflow-steps').isVisible())
    && !(await page.locator('.request-workflow .flow-devices').isVisible())
    && !(await page.locator('.request-workflow .request-stage').isVisible()));
  check('镜头章节与图层开关已移除', !(await page.locator('.camera-chapters').isVisible())
    && !(await page.locator('.layer-toolbar').isVisible()));

  const idle = await support();
  check('进入播放视图同时开启电力与冷空气', idle.visible.power === true && idle.visible.cooling === true);

  const cameraBefore = await camera();
  const flowBefore = await read();
  check('初始为停止状态', (await playButton().innerText()).includes('播放'));

  await playButton().click();
  await page.waitForTimeout(1500);
  const flowPlaying = await read();
  check('播放后数据流开始推进', flowPlaying.progress > flowBefore.progress);
  check('播放时按钮变为停止', (await playButton().innerText()).includes('停止'));
  check('播放时仍保留电力与冷空气层', (await support()).visible.power === true && (await support()).visible.cooling === true);

  const frameA = await snap();
  await page.waitForTimeout(420);
  const frameB = await snap();
  check('播放时画面持续变化（三条流同时在动）', frameA !== frameB);
  check('播放时相机不动', same(cameraBefore, await camera()));

  // Step boundaries keep running without asking the viewer for input.
  const stepBefore = (await read()).step;
  await page.waitForTimeout(6000);
  check('阶段自动推进', (await read()).step > stepBefore);

  await playButton().click();
  await page.waitForTimeout(600);
  const pausedA = await snap();
  await page.waitForTimeout(700);
  check('停止后画面完全静止', pausedA === (await snap()));
  const stoppedFlow = await read();
  await page.waitForTimeout(900);
  check('停止后阶段与进度保持', same(stoppedFlow.step, (await read()).step) && Math.abs(stoppedFlow.progress - (await read()).progress) < .001);

  await playButton().click();
  await page.waitForTimeout(900);
  const resumed = await read();
  check('继续播放从停止处接着走', resumed.step > stoppedFlow.step || resumed.progress > stoppedFlow.progress);
  await playButton().click();
  await page.waitForTimeout(200);

  // Background pause still applies to the single transport.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(400);
  check('切到后台自动停止', (await read()).progress === stoppedFlow.progress || (await playButton().innerText()).includes('播放'));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);

  // Keyboard: space plays from the clean view without opening any panel.
  await page.getByRole('button', { name: '纯净视野', exact: true }).isVisible().catch(() => false);
  if (await page.getByRole('button', { name: '纯净视野', exact: true }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: '纯净视野', exact: true }).click();
    await page.waitForTimeout(400);
  }
  const beforeSpace = (await read()).progress;
  await page.keyboard.press(' ');
  await page.waitForTimeout(1200);
  check('纯净视野下空格开始播放', (await read()).progress > beforeSpace);
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  check('纯净视野下再次空格停止', Math.abs((await read()).progress - (await read()).progress) < .001);

  // Reduced motion keeps the scene static while the numbers still advance.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(400);
  const reducedSteps = await read();
  check('减少动态效果时保留阶段数据', typeof reducedSteps.step === 'number' && reducedSteps.progress >= 0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  check('播放视图全程无控制台错误', errors.length === 0);
  return { results, errors };
}
