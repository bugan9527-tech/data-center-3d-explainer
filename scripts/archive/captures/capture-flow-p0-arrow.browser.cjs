// P0 arrow-phase evidence: power steps 1/4 and cooling step 2, each with six
// normal-UI play frames, six paused frames and six clean-view play frames.
// The page is opened normally; every run starts by restoring the interface.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const stepButton = i => page.locator('.support-steps .step-button').nth(i);
  const play = () => page.locator('.support-play');
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(120);
  };
  const readCamera = async () => await canvas().getAttribute('data-camera');
  const capture = async (id, prefix) => {
    const frames = [];
    for (let index = 0; index < 6; index += 1) {
      await page.waitForTimeout(120);
      frames.push(await canvas().screenshot({ path: `outputs/p0/arrow-${id}-${prefix}-f${index + 1}.png` }));
    }
    return frames;
  };
  const story = async (id, prepare) => {
    await prepare();
    await settle();
    await play().click();
    await page.waitForTimeout(420);
    check(`${id} 常规界面播放 6 帧互不相同`, new Set((await capture(id, 'play')).map(f => f.toString('base64'))).size === 6);
    await play().click();
    await page.waitForTimeout(320);
    await canvas().scrollIntoViewIfNeeded();
    await page.waitForTimeout(160);
    const pausedCamera = await readCamera();
    const paused = await capture(id, 'pause');
    check(`${id} 常规界面暂停 6 帧完全一致`, paused.every(f => f.equals(paused[0])));
    check(`${id} 暂停时相机不动`, pausedCamera === await readCamera());
    await play().click();
    await page.waitForTimeout(420);
    await page.getByRole('button', { name: '纯净视野', exact: true }).click();
    await page.waitForTimeout(220);
    check(`${id} 纯净视野开关不动机位`, pausedCamera === await readCamera());
    check(`${id} 纯净视野播放 6 帧互不相同`, new Set((await capture(id, 'clean')).map(f => f.toString('base64'))).size === 6);
    await page.getByRole('button', { name: '显示界面', exact: true }).click();
    await page.waitForTimeout(220);
  };

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(300);

  await story('power-1', async () => {
    await stepButton(0).click();
    await page.waitForTimeout(90);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  });
  await story('power-4', async () => {
    await stepButton(3).click();
    await page.waitForTimeout(90);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  });
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(200);
  await story('cool-2', async () => {
    await stepButton(1).click();
    await page.waitForTimeout(90);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  });

  check('截图过程无控制台错误', errors.length === 0);
  return { results, errors };
}
