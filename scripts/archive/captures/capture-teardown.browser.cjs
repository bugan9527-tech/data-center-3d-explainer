// S2/S3: open the compute cabinet, verify the 11-part list, focus a row, prove
// the settled canvas is static, and capture desktop + 375 layouts.
async page => {
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async (extra = 0) => {
    await page.waitForTimeout(160 + extra);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(160);
  };
  const snap = async () => (await canvas().screenshot()).toString('base64');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + '/');
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await page.locator('.teardown-list').waitFor();
  await settle(1100);

  const frameA = await snap();
  await page.waitForTimeout(900);
  const frameB = await snap();
  check('零件拉出后画布静止', frameA === frameB);
  check('已拆解 11 / 11', (await page.locator('.teardown-heading').innerText()).includes('11 / 11'));
  check('清单共 11 件', await page.locator('.teardown-list button').count() === 11);
  check('展开时只有一个完整标签', await page.locator('.teardown-label').count() === 1);
  check('其余 10 件为编号点', await page.locator('.teardown-dot').count() === 10);
  check('默认聚焦部件有规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('计算服务器 01'));
  check('规格卡标注示例参数', (await page.locator('.teardown-spec').innerText()).includes('示例参数'));
  await canvas().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/teardown-all.png', fullPage: true });
  const allCamera = JSON.parse(await canvas().getAttribute('data-camera'));

  await page.locator('[data-part="part_server_05"]').click();
  await settle(1000);
  check('聚焦件高亮状态', await page.locator('[data-part="part_server_05"]').getAttribute('aria-pressed') === 'true');
  check('规格卡切换到服务器 05', (await page.locator('.teardown-spec h3').innerText()).includes('计算服务器 05'));
  check('聚焦后仍只有一个完整标签', await page.locator('.teardown-label').count() === 1);
  const partCamera = JSON.parse(await canvas().getAttribute('data-camera'));
  check('聚焦移动了相机', JSON.stringify(partCamera) !== JSON.stringify(allCamera));
  await canvas().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/teardown-part.png', fullPage: true });

  // Keyboard path: focus a list button with Tab-like focus and press Enter.
  await page.locator('[data-part="part_fan_tray"]').focus();
  await page.keyboard.press('Enter');
  await settle(1000);
  check('键盘可聚焦风扇模块', (await page.locator('.teardown-spec h3').innerText()).includes('风扇模块'));

  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await settle(1400);
  check('合上后 teardown-mode 消失', !(await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('合上后清单消失', await page.locator('.teardown-list').count() === 0);
  await page.screenshot({ path: 'outputs/teardown-closed.png', fullPage: true });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await page.locator('.teardown-list').waitFor();
  await page.waitForTimeout(400);
  const reducedA = await snap();
  await page.waitForTimeout(900);
  const reducedB = await snap();
  check('减少动态效果下画布静止', reducedA === reducedB);
  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await page.waitForTimeout(300);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await page.locator('.teardown-list').waitFor();
  await page.waitForTimeout(900);
  const medium = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    panelWidth: Math.round(document.querySelector('.teardown-panel')?.getBoundingClientRect().width || 0),
  }));
  check('768 宽无横向溢出', medium.scrollWidth <= medium.innerWidth);
  await page.screenshot({ path: 'outputs/teardown-768.png', fullPage: true });
  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await page.waitForTimeout(300);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await page.locator('.teardown-list').waitFor();
  await page.waitForTimeout(900);
  const narrow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth,
    panelWidth: Math.round(document.querySelector('.teardown-panel')?.getBoundingClientRect().width || 0),
  }));
  check('375 宽无横向溢出', narrow.scrollWidth <= narrow.innerWidth);
  await page.screenshot({ path: 'outputs/teardown-375.png', fullPage: true });

  check('无 console 错误', errors.length === 0);
  return { results, allCamera, partCamera, medium, narrow, errors };
}
