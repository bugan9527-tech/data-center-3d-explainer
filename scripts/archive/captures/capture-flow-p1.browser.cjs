// P1 evidence: cooling steps 1, 2, 4 and 5, six consecutive play frames and six
// paused frames at the step close-up camera. Run with ?capture=before or
// ?capture=after; the tag only labels files. After runs also save the single
// full-page screenshot used by the acceptance list.
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
  const frames = async (step, phase) => {
    const list = [];
    for (let index = 0; index < 6; index += 1) {
      await page.waitForTimeout(120);
      list.push(await canvas().screenshot({ path: `outputs/p1/${tag}-cool-${step}-${phase}-f${index + 1}.png` }));
    }
    return list;
  };
  const story = async step => {
    await stepButton(step - 1).click();
    await page.waitForTimeout(90);
    await page.locator('.support-stage .camera-button').click();
    await settle();
    await play().click();
    await page.waitForTimeout(900);
    if (tag === 'after') await page.screenshot({ path: `outputs/flow-p1-cool-${step}.png`, fullPage: true });
    else await page.screenshot({ path: `outputs/p1/before-cool-${step}-page.png`, fullPage: true });
    check(`${tag} 制冷第 ${step} 步播放 6 帧互不相同`, new Set((await frames(step, 'play')).map(f => f.toString('base64'))).size === 6);
    await play().click();
    await page.waitForTimeout(320);
    await canvas().scrollIntoViewIfNeeded();
    await page.waitForTimeout(160);
    const paused = await frames(step, 'pause');
    check(`${tag} 制冷第 ${step} 步暂停 6 帧完全一致`, paused.every(f => f.equals(paused[0])));
  };

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(220);
  for (const step of [1, 2, 4, 5]) await story(step);

  check('截图过程无控制台错误', errors.length === 0);
  return { tag, results, errors };
}
