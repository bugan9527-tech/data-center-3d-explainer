// Batch A contract: the seventh system exists, opens a structural panel, and
// stays inside the "no readings, no alarm states" rule the project already had.
async page => {
  const origin = new URL(page.url()).origin;
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(500);

  check('八个系统标注都在', await page.locator('.room-callout').count() === 8);
  const callout = page.getByRole('button', { name: '查看消防与安防的工作', exact: true });
  check('消防与安防标注可点', await callout.count() === 1 && await callout.isVisible());
  await callout.click();
  await page.locator('.detail-panel h2').first().waitFor();
  check('点击打开消防与安防说明', (await page.locator('.detail-panel h2').first().innerText()) === '消防与安防');

  const panel = await page.locator('.detail-panel').first().innerText();
  check('说明含负责什么', panel.includes('负责什么'));
  check('说明含接收什么', panel.includes('接收什么'));
  check('说明含输出什么', panel.includes('输出什么'));
  check('说明含与谁配合', panel.includes('与谁配合'));
  check('说明交代报警与灭火剂', panel.includes('报警') && panel.includes('灭火剂'));

  // The decided rule: structural copy only. No readings, no alarm simulation.
  check('没有温度读数', !panel.includes('℃') && !panel.includes('°C'));
  check('没有百分比读数', !/%/.test(panel));
  check('没有告警计数', !/(告警|报警)\s*\d+/.test(panel));
  check('没有火警模拟按钮', await page.getByRole('button', { name: /模拟火警|触发告警|火警演示/ }).count() === 0);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  check('窄屏无横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  check('窄屏标注仍可见', await page.locator('.room-callout').first().isVisible());
  check('没有控制台错误', errors.length === 0);
  return { results, errors };
}
