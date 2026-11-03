// Batch D contract: the backup cabinet exists as its own rack and system, opens a
// five-part teardown, and states that local backup is not remote disaster recovery.
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

  check('九个机柜就绪', await page.locator('.rack-id').count() === 9);
  check('备份柜编号可见', await page.locator('.rack-id', { hasText: 'B01' }).count() === 1);
  const callout = page.getByRole('button', { name: '查看备份与容灾的工作', exact: true });
  check('备份与容灾标注可点', await callout.count() === 1 && await callout.isVisible());
  await callout.click();
  // A device-kind system opens its exploded view first, so the heading is the
  // teardown counter rather than the system title.
  await page.locator('.teardown-list').first().waitFor();
  check('拆解清单 5 件', await page.locator('.teardown-list button').count() === 5);
  check('清单含磁带库', (await page.locator('.teardown-list').first().innerText()).includes('磁带库'));
  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await page.locator('.detail-panel h2').first().waitFor();
  check('合上后显示系统说明', (await page.locator('.detail-panel h2').first().innerText()) === '备份与容灾');

  const panel = await page.locator('.detail-panel').first().innerText();
  check('说明区分本地与异地', panel.includes('异地容灾'));
  check('没有备份模拟按钮', await page.getByRole('button', { name: /模拟备份|执行备份|开始备份/ }).count() === 0);
  check('没有控制台错误', errors.length === 0);
  return { results, errors };
}
