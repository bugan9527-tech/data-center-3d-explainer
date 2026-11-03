// P2-2 evidence: play from power step 2 across the step boundary; the camera
// auto-pans to step 3's close-up, then pausing freezes the scene.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const read = async () => JSON.parse(await canvas().getAttribute('data-support'));
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(220);
  };

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await settle();
  await page.locator('.support-steps .step-button').nth(1).click();
  await page.waitForTimeout(90);
  await page.locator('.support-stage .camera-button').click();
  await settle();
  await page.screenshot({ path: 'outputs/p2-2-step-2.png', fullPage: false });

  await page.locator('.support-play').click();
  await page.waitForTimeout(5200);
  const moving = [];
  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(120);
    moving.push(await canvas().screenshot({ path: `outputs/p2-2-auto-f${index + 1}.png` }));
  }
  check('自动切机位连拍 6 帧互不相同', new Set(moving.map(f => f.toString('base64'))).size === 6);
  await page.waitForTimeout(650);
  const after = await read();
  const afterCamera = await camera();
  check('自动切到下一步特写', after.step === '配电柜分成多条回路' && Math.abs(afterCamera.target[0] - 3.9) < .02 && Math.abs(afterCamera.target[2] + 3.55) < .02);
  await page.screenshot({ path: 'outputs/p2-2-step-3.png', fullPage: false });
  await page.locator('.support-play').click();
  await page.waitForTimeout(320);
  await canvas().scrollIntoViewIfNeeded();
  await page.waitForTimeout(160);
  const paused = [];
  for (let index = 0; index < 6; index += 1) {
    await page.waitForTimeout(120);
    paused.push(await canvas().screenshot({ path: `outputs/p2-2-auto-pause-f${index + 1}.png` }));
  }
  check('自动切机位暂停 6 帧完全一致', paused.every(f => f.equals(paused[0])));
  check('截图过程无控制台错误', errors.length === 0);
  return { results, errors };
}
