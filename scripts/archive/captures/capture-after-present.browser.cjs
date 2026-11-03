// S9: capture exhibit-mode before/after frames, the 375 compact layout, the
// roles overlay and the restored three-column layout. Camera readings are
// returned so the caller can prove that toggling never moves the camera.
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const camera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const settle = async () => { await page.waitForTimeout(160); await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true'); };
  const toggle = () => page.getByRole('button', { name: '展品模式', exact: true });
  const view = async (w, h) => { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(260); };

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await view(1440, 1000);
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await settle();

  await canvas().scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'outputs/before-present-1440.png', fullPage: true });
  const cameraBefore = await camera();

  await toggle().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'outputs/after-present-1440.png', fullPage: true });
  const cameraAfter = await camera();

  const wide = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
  const toggleOn = await toggle().getAttribute('aria-pressed');

  await view(375, 812);
  await settle();
  await page.screenshot({ path: 'outputs/after-present-375.png', fullPage: true });
  const narrowInfo = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth, innerWidth,
    detailPosition: getComputedStyle(document.querySelector('.exhibit-detail')).position,
    detailTop: document.querySelector('.exhibit-detail')?.getBoundingClientRect().top,
    viewportBottom: document.querySelector('.viewport')?.getBoundingClientRect().bottom,
  }));

  await view(768, 1024);
  await settle();
  const tablet = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));

  await view(1440, 1000);
  await page.getByRole('tab', { name: '工作分工', exact: true }).click();
  await page.waitForTimeout(250);
  await settle();
  await page.screenshot({ path: 'outputs/after-present-roles-1440.png', fullPage: true });
  const rolesCamera = await camera();

  // Return to the same support chapter as the before frame so the off shot is
  // a direct layout comparison.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await toggle().click();
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'outputs/after-present-off-1440.png', fullPage: true });
  const off = {
    togglePressed: await toggle().getAttribute('aria-pressed'),
    sidebarVisible: await page.locator('.system-sidebar').isVisible(),
    detailVisible: await page.locator('.room-detail').isVisible(),
    workflowVisible: await page.locator('.request-workflow').isVisible(),
    exhibitNodes: await page.locator('.exhibit-detail, .exhibit-dock').count(),
  };
  const cameraOff = await camera();

  return { errors, cameraBefore, cameraAfter, cameraOff, rolesCamera, wide, narrow: narrowInfo, tablet, toggleOn, off };
}
