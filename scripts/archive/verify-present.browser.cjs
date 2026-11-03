// S9 exhibit mode contract: default off, layout-only, camera untouched, keyboard
// complete, narrow layout in flow, pause/reduced-motion canvas stable.
async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const close = (a, b, tolerance = .01) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < tolerance);
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const support = async () => JSON.parse(await canvas().getAttribute('data-support') || '{}');
  const toggle = () => page.getByRole('button', { name: '展品模式', exact: true });
  const settle = async () => { await page.waitForTimeout(160); await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true'); };
  const activeClass = () => page.evaluate(() => document.activeElement?.className || '');
  const scrollWidthOk = () => page.evaluate(() => document.documentElement.scrollWidth === innerWidth);
  const overlayFlow = () => page.evaluate(() => {
    const detail = document.querySelector('.exhibit-detail');
    const viewport = document.querySelector('.viewport');
    if (!detail || !viewport) return null;
    const d = detail.getBoundingClientRect(), v = viewport.getBoundingClientRect();
    return { position: getComputedStyle(detail).position, detailTop: d.top, detailBottom: d.bottom, detailWidth: d.width, viewportTop: v.top, viewportBottom: v.bottom, viewportRight: v.right };
  });

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();

  check('展品模式默认关闭', await toggle().getAttribute('aria-pressed') === 'false');
  check('默认保留三栏与职责面板', await page.locator('.system-sidebar').isVisible() && await page.locator('.room-detail').isVisible());

  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await settle();
  const cameraBefore = await camera();
  const stateBefore = await page.evaluate(() => ({ local: localStorage.length, url: location.href }));

  // Toggle with the keyboard, not a pointer: reach it with real Tab presses.
  await page.locator('.brand').focus();
  // The header now holds two toggles (focus view, exhibit); walk to the exhibit
  // one by real Tab presses instead of assuming a fixed count.
  for (let step = 0; step < 6 && !(await activeClass()).includes('exhibit-toggle'); step += 1) {
    await page.keyboard.press('Tab');
  }
  check('Tab 可到达展品模式开关', (await activeClass()).includes('exhibit-toggle'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  check('键盘 Enter 开启展品模式', await toggle().getAttribute('aria-pressed') === 'true');
  check('展品模式隐藏左侧系统栏', !(await page.locator('.system-sidebar').isVisible()));
  check('展品模式不渲染原支撑流程卡', await page.locator('.support-workflow').count() === 0);
  check('开启展品模式不移动镜头', same(cameraBefore, await camera()));
  check('开关状态不写入存储或 URL', await page.evaluate(before => localStorage.length === 0 && location.href === before.url, stateBefore));

  check('右下半透明玻璃浮层存在', await page.locator('.exhibit-detail').isVisible());
  check('浮层显示当前对象名称', await page.locator('.exhibit-object-name').innerText() === '供电系统');
  check('浮层显示三条要点', (await page.locator('.exhibit-facts dt').allTextContents()).join('|') === '负责什么|接收什么|输出什么');
  check('浮层显示与谁配合', await page.locator('.exhibit-partners h3').innerText() === '与谁配合');
  check('浮层不显示旧面板字段', await page.locator('.detail-heading, .structure-button, .server-entry, .relationship-strip').count() === 0);
  check('浮层文本只来自现有系统数据', await page.locator('.exhibit-facts dd').allTextContents().then(t => t.join('|') === '配电设备分配电力，UPS 为关键负载提供短时后备与电能保障，再经机柜配电单元送到服务器等设备。|上游供电与后备能源|送往设备的电力'));

  check('供电章节号取自 systems.js 的 04', await page.locator('.exhibit-index').innerText() === '04');
  check('供电章节标题', await page.locator('.exhibit-chapter-title').innerText() === '供电');
  check('供电细进度条为 6 段', await page.locator('.exhibit-segment').count() === 6);
  check('当前步骤为第 1 / 6 步', await page.locator('.exhibit-count').innerText() === '第 1 / 6 步' && await page.locator('.exhibit-segment').nth(0).getAttribute('aria-current') === 'step');

  // Play/pause through the exhibit transport.
  await page.locator('.exhibit-play').click();
  await page.waitForTimeout(700);
  check('展品播放控制推进步骤进度', (await support()).progress > 0 && await page.locator('.exhibit-play').getAttribute('aria-pressed') === 'true');
  check('展品播放不移动镜头', same(cameraBefore, await camera()));
  await page.locator('.exhibit-play').click();
  await page.waitForTimeout(250);
  const paused = await support();
  await canvas().scrollIntoViewIfNeeded(); await page.waitForTimeout(160);
  const pausedA = await canvas().screenshot();
  await page.waitForTimeout(900);
  const pausedB = await canvas().screenshot();
  check('展品模式暂停保留进度', paused.progress > 0 && (await support()).progress === paused.progress);
  check('展品模式暂停后画布两次截图一致', pausedA.toString('base64') === pausedB.toString('base64'));

  // Chapter switch inside the exhibit transport now applies the P2-3 cooling
  // base view. Subsequent no-move checks use that new resting camera.
  await page.getByRole('button', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(160);
  await settle();
  const chapterCamera = await camera();
  check('切换章节移动到制冷基底机位', close(chapterCamera.target, [-.5, .6, -.9]));
  check('展品制冷章节号取自 systems.js 的 05', await page.locator('.exhibit-index').innerText() === '05');
  check('展品制冷标题', await page.locator('.exhibit-chapter-title').innerText() === '制冷');
  check('制冷细进度条为 7 段', await page.locator('.exhibit-segment').count() === 7);

  // Keyboard step selection and playback.
  await page.locator('.exhibit-segment').nth(1).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('键盘选步生效并暂停', await page.locator('.exhibit-count').innerText() === '第 2 / 7 步' && await page.locator('.exhibit-segment').nth(1).getAttribute('aria-current') === 'step' && await page.locator('.exhibit-play').getAttribute('aria-pressed') === 'false');
  check('键盘选步不移动镜头', same(chapterCamera, await camera()));
  await page.locator('.exhibit-play').focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  check('键盘 Space 可播放', await page.locator('.exhibit-play').getAttribute('aria-pressed') === 'true');
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);
  check('键盘 Space 可暂停', await page.locator('.exhibit-play').getAttribute('aria-pressed') === 'false');

  // Reduced motion: no glow or moving marker, and no continuous frames once paused.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(300);
  await page.locator('.exhibit-play').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await canvas().scrollIntoViewIfNeeded(); await page.waitForTimeout(160);
  const reducedA = await canvas().screenshot();
  await page.waitForTimeout(900);
  const reducedB = await canvas().screenshot();
  check('减少动态效果下展品画布保持静止', reducedA.toString('base64') === reducedB.toString('base64'));
  await page.locator('.exhibit-play').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.presentRaf = 0; window.presentOriginalRaf = window.requestAnimationFrame; window.requestAnimationFrame = cb => window.presentOriginalRaf(t => { window.presentRaf += 1; cb(t); }); });
  await page.waitForTimeout(500);
  const idle = await page.evaluate(() => { window.requestAnimationFrame = window.presentOriginalRaf; return window.presentRaf; });
  check('减小动态效果且暂停后无持续动画帧', idle === 0);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(200);

  // Workflow transport reuses the 11 request steps.
  await page.getByRole('tab', { name: '协作流程', exact: true }).click();
  await page.waitForTimeout(250);
  await settle();
  check('协作流程无系统序号只显示标题', await page.locator('.exhibit-index').count() === 0 && await page.locator('.exhibit-chapter-title').innerText() === '协作流程');
  check('协作流程细进度条为 11 段', await page.locator('.exhibit-segment').count() === 11);
  await page.locator('.exhibit-segment').nth(5).focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('协作流程键盘选步生效', await page.locator('.exhibit-count').innerText() === '第 6 / 11 步' && await page.locator('.exhibit-segment').nth(5).getAttribute('aria-current') === 'step');
  check('协作流程选步不移动镜头', same(chapterCamera, await camera()));

  await page.getByRole('tab', { name: '整体结构', exact: true }).click();
  await page.waitForTimeout(250);
  check('整体结构无播放进度', await page.locator('.exhibit-transport').count() === 0 && await page.locator('.exhibit-index').count() === 0 && await page.locator('.exhibit-chapter-title').innerText() === '整体结构');
  check('整体结构切换不移动镜头', same(chapterCamera, await camera()));

  await page.getByRole('tab', { name: '工作分工', exact: true }).click();
  await page.waitForTimeout(250);
  check('工作分工章节号取当前系统 index', await page.locator('.exhibit-index').innerText() === '05' && await page.locator('.exhibit-chapter-title').innerText() === '制冷系统');
  check('工作分工浮层跟随当前系统', await page.locator('.exhibit-object-name').innerText() === '制冷系统' && await page.locator('.exhibit-partners p').innerText() === '计算、存储、网络设备与监测传感器');
  check('模式切换不移动镜头', same(chapterCamera, await camera()));

  // An explicit chapter button still moves the camera; toggling around that
  // non-default pose must not move it again.
  await page.getByRole('button', { name: '章节：制冷设备', exact: true }).click();
  await settle();
  const movedCamera = await camera();
  check('显式章节按钮才会移动镜头', !same(movedCamera, chapterCamera));
  await toggle().click();
  await page.waitForTimeout(200);
  check('非默认机位关闭展品模式不移动镜头', same(movedCamera, await camera()));
  await toggle().click();
  await page.waitForTimeout(200);
  check('非默认机位开启展品模式不移动镜头', same(movedCamera, await camera()));


  // panelOpen must stay untouched and must not gate the overlay.
  await toggle().click();
  await page.waitForTimeout(200);
  check('关闭展品模式恢复职责面板', await page.locator('.room-detail').isVisible() && await page.locator('.system-sidebar').isVisible() && await page.locator('.request-workflow').isVisible());
  await page.getByRole('button', { name: '收起职责说明', exact: true }).click();
  await page.waitForTimeout(150);
  check('收起职责说明后面板隐藏', await page.locator('.room-detail').count() === 0);
  await toggle().focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  check('收起状态不影响展品浮层', await page.locator('.exhibit-detail').isVisible());
  await toggle().click();
  await page.waitForTimeout(200);
  check('关闭展品模式保留原收起状态', await page.locator('.room-detail').count() === 0 && await page.locator('.system-sidebar').isVisible());
  await page.getByRole('button', { name: '展开职责说明', exact: true }).click();
  await page.waitForTimeout(150);
  check('展开职责说明恢复面板', await page.locator('.room-detail').isVisible());

  // Focus order: hidden sidebar is skipped on; restored on off.
  await toggle().focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await toggle().focus(); await page.keyboard.press('Tab');
  const focusOn = await activeClass();
  check('展品模式焦点跳过隐藏侧栏', !focusOn.includes('system-button') && focusOn.includes('location-button'));
  await page.evaluate(() => document.activeElement?.blur());
  await toggle().focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  await toggle().focus(); await page.keyboard.press('Tab');
  const focusOff = await activeClass();
  check('关闭后恢复原焦点顺序进入侧栏', focusOff.includes('system-button'));

  // Responsive: overlay overlays at wide, flows at narrow, no horizontal overflow.
  await toggle().click();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  check('1440 无横向溢出', await scrollWidthOk());
  const wideOverlay = await overlayFlow();
  check('1440 浮层在画布右下并覆盖画布', wideOverlay.position === 'absolute' && wideOverlay.detailTop < wideOverlay.viewportBottom && wideOverlay.detailBottom <= wideOverlay.viewportBottom + 1);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(300);
  check('768 无横向溢出', await scrollWidthOk());
  const tabletOverlay = await overlayFlow();
  check('768 浮层进入文档流不覆盖画布', tabletOverlay.position === 'static' && tabletOverlay.detailTop >= tabletOverlay.viewportBottom);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(300);
  check('375 无横向溢出', await scrollWidthOk());
  const narrowOverlay = await overlayFlow();
  check('375 浮层在画布之下且不超宽', narrowOverlay.position === 'static' && narrowOverlay.detailTop >= narrowOverlay.viewportBottom && narrowOverlay.detailWidth <= 375);
  check('375 展品进度与播放可用', await page.locator('.exhibit-segment').count() > 0 && await page.locator('.exhibit-play').isVisible() && await page.getByRole('button', { name: '展品模式', exact: true }).isVisible());
  check('375 相机操作仍可见', await page.getByRole('button', { name: '复位视角', exact: true }).isVisible());

  // Focus view: one click hides every overlay, a click on the stage brings it back.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  await toggle().click();
  await page.waitForTimeout(250);
  const focusButton = page.getByRole('button', { name: '纯净视野', exact: true });
  check('纯净视野入口可见', await focusButton.isVisible());
  await focusButton.click();
  await page.waitForTimeout(350);
  const overlaysHidden = await page.evaluate(() => ['.app-header', '.system-sidebar', '.room-detail', '.workflow-card', '.camera-chapters', '.layer-toolbar', '.scene-controls']
    .every((sel) => { const el = document.querySelector(sel); return !el || getComputedStyle(el).display === 'none'; }));
  check('纯净视野隐藏全部浮层', overlaysHidden);
  const focusBox = await page.locator('.room-shell canvas').boundingBox();
  check('纯净视野画布铺满窗口', Math.abs(focusBox.width - 1440) < 2 && Math.abs(focusBox.height - 900) < 2);
  check('纯净视野页面不滚动', await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
  check('纯净视野保留显示界面按钮', await page.getByRole('button', { name: '显示界面', exact: true }).isVisible());
  await page.screenshot({ path: 'outputs/present-focus.png' });
  await page.mouse.click(720, 380);
  await page.waitForTimeout(400);
  check('点击场景不退出纯净视野', !(await page.locator('.workflow-card').isVisible()));
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.waitForTimeout(350);
  check('点击显示界面恢复界面', await page.locator('.workflow-card').isVisible());
  await focusButton.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Esc 恢复界面', await page.locator('.workflow-card').isVisible());

  // A fresh load opens in the clean view; narrowing the window returns the UI
  // because the restore chip is no longer offered at phone widths.
  await page.reload();
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(400);
  check('打开页面默认是纯净视野', !(await page.locator('.workflow-card').isVisible()) && await page.getByRole('button', { name: '显示界面', exact: true }).isVisible());
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  check('窄屏自动回到完整界面', await page.getByRole('tab', { name: '协作流程', exact: true }).isVisible());
  check('375 不显示纯净视野入口', !(await focusButton.isVisible()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(400);

  check('展品模式全程无控制台错误', errors.length === 0);
  return { results, errors };
}
