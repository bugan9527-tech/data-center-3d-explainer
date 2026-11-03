// Device click must open the exploded view *and* bring the part list back:
// the clean view hides the right panel, so without the reveal a click looks dead.
async page => {
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({ name, passed: true }); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const base = new URL(page.url()).origin + '/';
  const project = () => page.evaluate(() => {
    const canvas = document.querySelector('.room-shell canvas');
    const cam = JSON.parse(canvas.dataset.camera);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
    const fwd = norm(sub(cam.target, cam.position));
    const right = norm(cross(fwd, [0, 1, 0]));
    const up = cross(right, fwd);
    const tan = Math.tan(((cam.fov || 14 / (cam.zoomRatio || 1)) * Math.PI) / 360);
    const to = (p) => {
      const v = sub(p, cam.position);
      const z = dot(v, fwd);
      return { x: Math.round(W / 2 + (W / 2) * (dot(v, right) / (z * tan * (W / H)))), y: Math.round(H / 2 - (H / 2) * (dot(v, up) / (z * tan))) };
    };
    return { ups: to([2.6, 1.05, -3.65]), distribution: to([3.9, 1.05, -3.65]) };
  });

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });

  // 1. A cabinet body click in the clean view opens the list.
  await page.goto(base);
  await page.locator('.rack-id').first().waitFor();
  check('打开时是纯净视野', !(await page.locator('.app-header').isVisible()));
  const canvas = await page.locator('.room-shell canvas').boundingBox();
  await page.mouse.click(canvas.x + canvas.width * .32, canvas.y + canvas.height * .42);
  await page.waitForTimeout(2200);
  check('点机柜后出现拆解清单', await page.locator('.room-detail').isVisible());
  check('点机柜后界面自动恢复', await page.locator('.app-header').isVisible());
  check('点机柜后进入拆解态', (await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode'));
  check('机柜清单有部件', await page.locator('.teardown-list button').count() > 0);

  // 2. Clicking empty stage must not restore the interface.
  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await page.waitForTimeout(1600);
  await page.getByRole('button', { name: '纯净视野', exact: true }).click();
  await page.waitForTimeout(400);
  await page.mouse.click(canvas.x + 24, canvas.y + canvas.height - 24);
  await page.waitForTimeout(600);
  check('点空白仍是纯净视野', !(await page.locator('.app-header').isVisible()));

  // 3. Power hardware answers a click on the cabinet itself.
  await page.goto(base);
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(600);
  const point = await project();
  await page.mouse.click(point.ups.x, point.ups.y);
  await page.waitForTimeout(2400);
  check('点 UPS 机身打开拆解', await page.locator('.room-detail').isVisible());
  check('UPS 清单 4 件', await page.locator('.teardown-list button').count() === 4);
  const camera = JSON.parse(await page.locator('.room-shell canvas').getAttribute('data-camera'));
  check('UPS 拆解机位', Math.abs(camera.target[0] - 3.05) < .05);

  // 4. The same for the distribution cabinet, which used to be dead too.
  await page.getByRole('button', { name: '收起说明', exact: true }).click();
  await page.waitForTimeout(1500);
  const point2 = await project();
  await page.mouse.click(point2.distribution.x, point2.distribution.y);
  await page.waitForTimeout(2400);
  check('点配电柜机身打开拆解', await page.locator('.teardown-list button').count() === 5);

  check('无控制台错误', errors.length === 0);
  return { results, errors };
}
