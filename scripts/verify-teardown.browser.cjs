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
  const dismiss = async () => {
    const close = page.locator('.room-detail .panel-close');
    if (await close.count()) { await close.first().click(); await settle(1200); }
  };
  const geometry = () => page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    const label = document.querySelector('.teardown-label');
    const vp = document.querySelector('.viewport');
    const line = document.querySelector('.teardown-focus-line line');
    return {
      label: box(label), vp: box(vp),
      sidebar: box(document.querySelector('.system-sidebar')),
      panel: box(document.querySelector('.detail-panel')),
      header: box(document.querySelector('.app-header')),
      line: line ? { x1: +line.getAttribute('x1'), y1: +line.getAttribute('y1'), x2: +line.getAttribute('x2'), y2: +line.getAttribute('y2') } : null,
      camera: JSON.parse(document.querySelector('.room-shell canvas').dataset.camera),
    };
  });
  const checkLabel = (name, info) => {
    const { label, vp, sidebar, panel, header, line } = info;
    check(name, !!label && label.left >= vp.left && label.right <= vp.right && label.top >= vp.top && label.bottom <= vp.bottom);
    if (sidebar && sidebar.width > 0) check(`${name}避开左栏`, label.left >= sidebar.right);
    if (panel && panel.width > 0) check(`${name}避开右面板`, label.right <= panel.left);
    if (header && header.bottom > vp.top) check(`${name}避开顶栏`, label.top >= header.bottom);
    const lx1 = label.left - vp.left, lx2 = label.right - vp.left, ly1 = label.top - vp.top, ly2 = label.bottom - vp.top;
    const eps = 1.5;
    check(`${name}引线连到标签边缘`, !!line && (
      ((Math.abs(line.x2 - lx1) < eps || Math.abs(line.x2 - lx2) < eps) && line.y2 >= ly1 - eps && line.y2 <= ly2 + eps)
      || ((Math.abs(line.y2 - ly1) < eps || Math.abs(line.y2 - ly2) < eps) && line.x2 >= lx1 - eps && line.x2 <= lx2 + eps)
    ));
  };

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin + '/');
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  check('打开时没有任何面板', await page.locator('.room-detail').count() === 0);
  await page.screenshot({ path: 'outputs/teardown-entry.png', fullPage: true });
  const entryCamera = (await geometry()).camera;
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await settle(1400);
  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await settle(1200);
  check('收起时进度为 0 / 11', (await page.locator('.teardown-entry-progress').innerText()).includes('0 / 11'));
  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await settle(1200);

  // S4: picking a device opens its exploded view; power keeps the old behaviour.
  await page.getByRole('button', { name: '查看供电系统的工作', exact: true }).click();
  await settle(1600);
  check('点供电系统进入设备拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('UPS 拆解清单 4 件', await page.locator('.teardown-list button').count() === 4);
  check('UPS 拆解机位', Math.abs((await geometry()).camera.target[0] - 3.05) < .05);
  check('设备选择器可选配电柜', await page.getByRole('combobox', { name: '选择设备' }).count() === 1);
  await page.getByRole('combobox', { name: '选择设备' }).selectOption('distribution');
  await settle(1600);
  check('切换到配电柜后有 5 件', await page.locator('.teardown-list button').count() === 5);
  await dismiss();
  await page.getByRole('button', { name: '查看制冷系统的工作', exact: true }).click();
  await settle(1800);
  check('点制冷系统进入设备拆解', (await page.locator('.teardown-list button').count()) === 4);
  await dismiss();
  await page.getByRole('button', { name: '查看存储设备的工作', exact: true }).click();
  await settle(1400);
  check('点存储设备即进入拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('点存储设备时播放条仍在', await page.locator('.collab-bar').isVisible());
  check('存储设备拆解镜头', Math.abs((await geometry()).camera.target[0] - 2.55) < .05 && Math.abs((await geometry()).camera.target[2] - .65) < .05);
  check('存储设备清单 7 件', await page.locator('.teardown-list button').count() === 7);
  check('存储设备进度 7 / 7', (await page.locator('.teardown-heading').innerText()).includes('7 / 7'));
  await page.locator('[data-part="part_controller_01"]').click();
  await settle(1100);
  check('存储控制器规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('存储控制器 01'));
  check('存储件专用机位', Math.abs((await geometry()).camera.target[0] - 2.55) < .05 && Math.abs((await geometry()).camera.target[1] - 1.1) < .05);
  const storage = await geometry();
  checkLabel('存储控制器标签在画布内', storage);
  await page.screenshot({ path: 'outputs/teardown-storage.png', fullPage: true });

  await dismiss();
  await page.getByRole('button', { name: '查看网络设备的工作', exact: true }).click();
  await settle(1400);
  check('点网络设备即进入拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('网络设备清单 12 件', await page.locator('.teardown-list button').count() === 12);
  check('网络设备进度 12 / 12', (await page.locator('.teardown-heading').innerText()).includes('12 / 12'));
  await page.locator('[data-part="part_cable_manager"]').click();
  await settle(1100);
  check('理线区规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('理线区'));
  check('网络件专用机位', Math.abs((await geometry()).camera.target[0] + 3.2) < .05 && Math.abs((await geometry()).camera.target[1] - 1.1) < .05);
  const network = await geometry();
  checkLabel('理线区标签在画布内', network);
  await page.screenshot({ path: 'outputs/teardown-network.png', fullPage: true });

  await dismiss();
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await settle(1400);
  check('点计算服务器即进入拆解', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode') && await page.locator('.teardown-panel').count() === 1);
  check('计算服务器拆解镜头', Math.abs((await geometry()).camera.target[0] + 1.2) < .05 && Math.abs((await geometry()).camera.target[2] - .65) < .05);
  check('点计算服务器时播放条仍在', await page.locator('.collab-bar').isVisible());
  await page.screenshot({ path: 'outputs/teardown-click-compute.png', fullPage: true });

  check('展开后 11 段进度全亮', await page.locator('.teardown-segments span.on').count() === 11);

  check('已拆解 11 / 11', (await page.locator('.teardown-heading').innerText()).includes('11 / 11'));
  check('清单共 11 件', await page.locator('.teardown-list button').count() === 11);
  check('只有一个完整标签', await page.locator('.teardown-label').count() === 1);
  check('其余 10 件为编号点', await page.locator('.teardown-dot').count() === 10);
  check('默认规格卡为服务器 01', (await page.locator('.teardown-spec h3').innerText()).includes('计算服务器 01'));
  const first = await geometry();
  checkLabel('服务器 01 标签在画布内', first);

  await page.locator('[data-part="part_server_05"]').click();
  await settle(1100);
  check('服务器 05 聚焦状态', await page.locator('[data-part="part_server_05"]').getAttribute('aria-pressed') === 'true');
  check('服务器 05 规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('计算服务器 05'));
  const server = await geometry();
  checkLabel('服务器 05 标签在画布内', server);

  await page.locator('[data-part="part_pdu"]').click();
  await settle(1100);
  check('PDU 规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('机柜 PDU'));
  check('PDU 专用机位', Math.abs((await geometry()).camera.target[0] + 2.16) < .05 && Math.abs((await geometry()).camera.target[2] - 1.52) < .05);
  const pdu = await geometry();
  checkLabel('PDU 标签在画布内', pdu);
  await page.screenshot({ path: 'outputs/teardown-pdu.png', fullPage: true });

  // S5 fixes: the server interior is reachable from the teardown header, and
  // re-picking the already open device keeps the focused part and its camera.
  check('拆解面板头部有进入服务器内部', await page.getByRole('button', { name: '进入服务器内部', exact: true }).isVisible());
  await page.locator('[data-part="part_fan_tray"]').click();
  await settle(1100);
  check('风扇模块规格卡', (await page.locator('.teardown-spec h3').innerText()).includes('风扇模块'));
  const fan = await geometry();
  checkLabel('风扇标签在画布内', fan);
  check('风扇标签不贴画布左缘', fan.label.left >= fan.vp.left + 16);
  check('风扇标签在部件右侧', fan.line.x1 < fan.label.left);
  check('风扇标签外移避开轮毂', fan.label.left - fan.line.x1 >= 38);
  await page.screenshot({ path: 'outputs/teardown-fan.png', fullPage: true });

  const frameA = await snap();
  await page.waitForTimeout(900);
  const frameB = await snap();
  check('聚焦后画布静止', frameA === frameB);

  await page.getByRole('button', { name: '合上内部构造', exact: true }).click();
  await settle(1600);
  check('合上后拆解模式消失', !(await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('合上后清单消失', await page.locator('.teardown-list').count() === 0);
  check('合上后进度回到 0 / 11', (await page.locator('.teardown-entry-progress').innerText()).includes('0 / 11'));
  check('合上后播放条仍在', await page.locator('.collab-bar').isVisible());
  check('合上后相机回到计算服务器章节机位', Math.abs((await geometry()).camera.target[0] + .9) < .05 && Math.abs((await geometry()).camera.target[2]) < .05);
  const shellOpacity = parseFloat(await canvas().getAttribute('data-shell-opacity'));
  check('合上后外壳透明度回到 1', Math.abs(shellOpacity - 1) < .01);

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: '全部拆解', exact: true }).click();
  await page.locator('.teardown-list').waitFor();
  await page.waitForTimeout(900);
  const medium = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
  check('768 宽无横向溢出', medium.scrollWidth <= medium.innerWidth);
  await page.screenshot({ path: 'outputs/teardown-768.png', fullPage: true });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
  check('375 宽无横向溢出', narrow.scrollWidth <= narrow.innerWidth);
  check('375 宽隐藏编号点', await page.locator('.teardown-dot').count() === 0);
  await page.screenshot({ path: 'outputs/teardown-375.png', fullPage: true });

  check('无 console 错误', errors.length === 0);
  return {
    results,
    pdu: { label: pdu.label, camera: pdu.camera, line: pdu.line },
    fan: { label: fan.label, camera: fan.camera, line: fan.line },
    medium,
    narrow,
    shellOpacity,
    knownLimitation: '画布宽度低于 520 px 时隐藏 3D 编号点，移动端只保留聚焦标签与右侧清单。',
    errors,
  };
}
