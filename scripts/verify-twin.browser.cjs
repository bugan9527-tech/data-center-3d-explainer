async page => {
  const results = [];
  const check = (name, value) => { results.push({ name, passed: !!value }); if (!value) throw new Error(name); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async (extra = 0) => {
    await page.waitForTimeout(160 + extra);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(160);
  };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + '/');
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(700);
  check('HUD 顶栏存在', await page.locator('.hud-top').isVisible());
  check('左侧指标面板存在', await page.locator('.hud-left').isVisible());
  check('右侧环境面板存在', await page.locator('.hud-right').isVisible());
  check('六个流向开关', await page.locator('.hud-toggle').count() === 6);
  check('八个设备类别开关', await page.locator('.hud-system').count() === 8);
  check('模拟数据标识', (await page.locator('.hud-left').innerText()).includes('模拟') && (await page.locator('.hud-right').innerText()).includes('模拟'));
  const leftText = await page.locator('.hud-left').innerText();
  check('设备总数口径含备份柜与双路进线', leftText.includes('机柜与动力设备') && leftText.includes('17'));
  check('九个机柜已渲染', await page.locator('.rack-id').count() === 9);
  await page.screenshot({ path: 'outputs/twin-hud.png', fullPage: true });

  // Hover: the C01 label sits above the cabinet; a point below it lands on the body.
  const c01 = page.locator('.rack-id', { hasText: 'C01' }).first();
  const box = await c01.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height + 88);
  await page.waitForTimeout(500);
  const hoverVisible = await page.locator('.rack-hover').count() === 1;
  check('悬停出现设备卡片', hoverVisible);
  if (hoverVisible) {
    const text = await page.locator('.rack-hover').innerText();
    check('悬停卡片包含编号', text.includes('C01'));
    await page.screenshot({ path: 'outputs/twin-hover.png', fullPage: true });
  }

  // Data-flow toggle.
  await page.getByRole('button', { name: '关闭数据流向' }).click();
  await page.waitForTimeout(400);
  const flow = await page.evaluate(() => JSON.parse(document.querySelector('.room-shell canvas').dataset.flow));
  check('关闭数据流后路径停止', flow.arrows === 0);
  await page.getByRole('button', { name: '开启数据流向' }).click();
  await page.waitForTimeout(400);

  // Selection opens the detail panel in the right column, replacing the HUD.
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await settle(1400);
  check('拆解面板替换右栏', !(await page.locator('.hud-right').isVisible()) && await page.locator('.room-detail').isVisible());
  check('网络链路标签', await page.locator('.link-tag-network').count() === 1);
  check('供电链路标签', await page.locator('.link-tag-power').count() === 1);
  await page.screenshot({ path: 'outputs/twin-teardown-links.png', fullPage: true });
  await page.getByRole('button', { name: '连接路径' }).click();
  await page.waitForTimeout(400);
  check('关闭连接路径', await page.locator('.link-tag').count() === 0);
  await page.getByRole('button', { name: '连接路径' }).click();
  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await settle(1200);

  // Double-click on the cabinet body asks for the dedicated close-up pose.
  const c01After = await page.locator('.rack-id', { hasText: 'C01' }).first().boundingBox();
  await page.mouse.dblclick(c01After.x + c01After.width / 2, c01After.y + c01After.height + 88);
  await settle(1500);
  const closeCam = await page.evaluate(() => JSON.parse(document.querySelector('.room-shell canvas').dataset.camera));
  check('双击进入机柜近景', Math.abs(closeCam.target[0] + 1.65) < .05 && Math.abs(closeCam.target[2] - .65) < .05);
  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await settle(1200);
  await page.getByRole('button', { name: '回到总览视角' }).click();
  await settle(1400);

  // Fault / alarm demos.
  await page.getByRole('button', { name: '局部故障' }).click();
  await page.waitForTimeout(600);
  check('故障告警列表 1 条', await page.locator('.hud-alarm').count() === 1);
  check('故障状态胶囊', (await page.locator('.hud-status-pill').innerText()).includes('局部故障'));
  await page.screenshot({ path: 'outputs/twin-fault.png', fullPage: true });
  await page.getByRole('button', { name: '告警处理中' }).click();
  await page.waitForTimeout(600);
  check('告警列表 2 条', await page.locator('.hud-alarm').count() === 2);
  await page.screenshot({ path: 'outputs/twin-alarm.png', fullPage: true });

  // Heat map.
  await page.getByRole('button', { name: '冷通道热力图开关' }).click();
  await page.waitForTimeout(600);
  check('热力图标记出现', await page.locator('.heat-map-label').count() === 1);
  await page.screenshot({ path: 'outputs/twin-heatmap.png', fullPage: true });

  // Camera orbit and reset.
  const cam = () => page.evaluate(() => JSON.parse(document.querySelector('.room-shell canvas').dataset.camera));
  await page.getByRole('button', { name: '开启自动环绕' }).click();
  await page.waitForTimeout(900);
  const orbitA = await cam();
  await page.waitForTimeout(700);
  const orbitB = await cam();
  check('自动环绕改变相机', JSON.stringify(orbitA.position) !== JSON.stringify(orbitB.position));
  await page.getByRole('button', { name: '关闭自动环绕' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '回到总览视角' }).click();
  await settle(1500);
  check('总览复位', Math.abs((await cam()).target[0] - .4) < .05);

  // Quality and low-quality bloom fallback.
  check('高画质 Bloom 开启', await canvas().getAttribute('data-bloom') === 'true');
  await page.getByRole('button', { name: 'Bloom 泛光开关' }).click();
  await page.waitForTimeout(500);
  check('可单独关闭 Bloom', await canvas().getAttribute('data-bloom') === 'false');
  await page.getByRole('button', { name: 'Bloom 泛光开关' }).click();
  await page.waitForTimeout(500);
  check('可重新开启 Bloom', await canvas().getAttribute('data-bloom') === 'true');
  await page.getByRole('button', { name: '低', exact: true }).click();
  await page.waitForTimeout(700);
  check('低画质 Bloom 关闭', await canvas().getAttribute('data-bloom') === 'false');
  check('低画质隐藏热力图', await page.locator('.heat-map-label').count() === 0);
  await page.screenshot({ path: 'outputs/twin-low.png', fullPage: true });
  await page.getByRole('button', { name: '高', exact: true }).click();
  await page.waitForTimeout(500);

  // Hide a category.
  await page.getByRole('button', { name: '隐藏计算设备' }).click();
  await page.waitForTimeout(500);
  check('隐藏计算后少四台机柜', await page.locator('.rack-id').count() === 5);
  check('隐藏计算后标注同步隐藏', await page.locator('.room-callout').count() === 7);
  await page.screenshot({ path: 'outputs/twin-hide-compute.png', fullPage: true });
  await page.getByRole('button', { name: '显示计算设备' }).click();
  await page.waitForTimeout(400);
  check('恢复计算后标注回到八个', await page.locator('.room-callout').count() === 8);

  // Browser fullscreen round trip. Escape-to-exit lives in the browser UI
  // layer and cannot be synthesized in automation, so the test uses the
  // button; the fullscreenchange listener keeps the icon in sync either way.
  const fsEnter = page.getByRole('button', { name: '进入全屏', exact: true });
  check('全屏按钮存在', await fsEnter.count() === 1);
  await fsEnter.click();
  await page.waitForTimeout(900);
  check('进入浏览器全屏', await page.evaluate(() => document.fullscreenElement === document.documentElement));
  await page.getByRole('button', { name: '退出全屏', exact: true }).click();
  await page.waitForTimeout(900);
  check('退出浏览器全屏', await page.evaluate(() => !document.fullscreenElement));

  check('全程无控制台错误', errors.length === 0);
  return { results, errors };
}
