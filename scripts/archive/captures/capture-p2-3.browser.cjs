// P2-3 evidence: 1440×900 clean base views for power/cooling, the normal-UI
// framing, and the explicit step 4/5 "look inside the rack" hint. The page is
// opened normally, then the interface is restored before anything else.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(220);
  };
  const step = i => page.locator('.support-steps .step-button').nth(i);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'outputs/p2-before-overview-1440.png', fullPage: false });

  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await settle();
  const powerCamera = await camera();
  check('进入持续支撑移动到供电基底机位', Math.abs(powerCamera.target[0] - .8) < .01 && Math.abs(powerCamera.target[1] - 1) < .01 && Math.abs(powerCamera.target[2] + 1.5) < .01);
  await page.screenshot({ path: 'outputs/p2-support-power-panel-1440.png', fullPage: false });
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'outputs/p2-support-power-clean-1440.png', fullPage: false });

  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(220);
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await settle();
  const coolingCamera = await camera();
  check('切换制冷移动到制冷基底机位', Math.abs(coolingCamera.target[0] + .5) < .01 && Math.abs(coolingCamera.target[1] - .6) < .01 && Math.abs(coolingCamera.target[2] + .9) < .01);
  await page.screenshot({ path: 'outputs/p2-support-cooling-panel-1440.png', fullPage: false });
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'outputs/p2-support-cooling-clean-1440.png', fullPage: false });

  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(220);
  const baseBeforeStep = await camera();
  for (const [index, file] of [[3, 'p2-hint-step-4-1440.png'], [4, 'p2-hint-step-5-1440.png']]) {
    await step(index).click();
    await page.waitForTimeout(120);
    check(`制冷第 ${index + 1} 步选步不移动镜头`, JSON.stringify(baseBeforeStep) === JSON.stringify(await camera()));
    check(`制冷第 ${index + 1} 步按钮显示放大提示`, await page.locator('.support-stage .camera-button').innerText() === '放大看机柜内部气流' && await page.locator('.support-stage .camera-hint').count() === 1);
    await page.screenshot({ path: `outputs/${file}`, fullPage: false });
  }
  await page.locator('.support-stage .camera-button').click();
  await settle();
  await page.screenshot({ path: 'outputs/p2-hint-step-5-zoom-1440.png', fullPage: false });

  check('截图过程无控制台错误', errors.length === 0);
  return { results, errors, powerCamera, coolingCamera };
}
