// P0 evidence capture: six consecutive canvas frames per condition, before and
// after the flow-head change, at the same close-up camera. Run with the page
// opened at ?capture=before or ?capture=after; the query tag only labels files.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const tag = new URL(page.url()).searchParams.get('capture') || 'before';
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
  const capture = async (name, count = 6) => {
    const frames = [];
    for (let index = 0; index < count; index += 1) {
      await page.waitForTimeout(120);
      frames.push(await canvas().screenshot({ path: `outputs/p0/${tag}-${name}-f${index + 1}.png` }));
    }
    return frames;
  };
  const pauseAndCapture = async name => {
    await play().click();
    await page.waitForTimeout(320);
    await canvas().scrollIntoViewIfNeeded();
    await page.waitForTimeout(160);
    const frames = [];
    for (let index = 0; index < 6; index += 1) {
      await page.waitForTimeout(120);
      frames.push(await canvas().screenshot({ path: `outputs/p0/${tag}-${name}-pause-f${index + 1}.png` }));
    }
    return frames;
  };
  const story = async (name, prepare) => {
    await prepare();
    await settle();
    await play().click();
    await page.waitForTimeout(420);
    const moving = await capture(name);
    check(`${tag} ${name} 播放 6 帧互不相同`, new Set(moving.map(f => f.toString('base64'))).size === 6);
    const paused = await pauseAndCapture(name);
    check(`${tag} ${name} 暂停 6 帧完全一致`, paused.every(f => f.equals(paused[0])));
    await page.screenshot({ path: `outputs/p0/${tag}-${name}-entire.png`, fullPage: true });
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
  await story('cool-1', async () => {
    await stepButton(0).click();
    await page.waitForTimeout(90);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
  });

  check('截图过程无控制台错误', errors.length === 0);
  return { tag, results, errors };
}
