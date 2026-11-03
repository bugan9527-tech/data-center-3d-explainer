// S0 baseline capture. Read-only: clicks existing controls, records camera and
// on-screen text, saves screenshots. No source changes, no new dependencies.
async page => {
  const errors = [];
  const shots = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const canvas = () => page.locator('.room-shell canvas');
  const readCamera = async () => JSON.parse(await canvas().getAttribute('data-camera'));
  const settle = async () => {
    // dataset.moving is absent until the first camera request; only 'true' means in flight.
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving !== 'true');
    await page.waitForTimeout(150);
  };
  const text = async (selector) => (await page.locator(selector).count()) ? (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim() : null;
  const record = async (name, path) => {
    await page.screenshot({ path, fullPage: true });
    const camera = await readCamera();
    const entry = {
      name,
      file: path,
      viewport: page.viewportSize(),
      camera,
      heading: await text('.scene-heading h1'),
      caption: await text('.scene-caption'),
      mode: await page.locator('.mode-tab.active').innerText(),
      detail: { title: await text('.detail-title h2'), role: await text('.detail-title > p') },
      stage: await text('.request-stage'),
      supportCaption: await text('.support-caption'),
      supportSteps: await text('.support-steps'),
      flowDevices: await text('.flow-devices'),
    };
    shots.push(entry);
    return entry;
  };

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(300);

  const chapters = [
    ['机房总览', 'overview'], ['网络设备', 'network'], ['计算服务器', 'compute'],
    ['存储设备', 'storage'], ['UPS 与配电', 'power'], ['制冷设备', 'cooling'],
  ];
  for (const [title, id] of chapters) {
    await page.getByRole('button', { name: `章节：${title}`, exact: true }).click();
    await settle();
    await record(`chapter-${id}`, `outputs/before-${id}.png`);
  }

  // Support chapter: step 1 and step 5 of each system, framed by 查看本步特写.
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(300);
  for (const step of [0, 4]) {
    await page.locator('.support-steps .step-button').nth(step).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
    await settle();
    await record(`support-power-step${step + 1}`, `outputs/before-support-power-step${step + 1}.png`);
  }
  await page.getByRole('tab', { name: '制冷', exact: true }).click();
  await page.waitForTimeout(250);
  for (const step of [0, 4]) {
    await page.locator('.support-steps .step-button').nth(step).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
    await settle();
    await record(`support-cooling-step${step + 1}`, `outputs/before-support-cooling-step${step + 1}.png`);
  }

  // Narrow layout: reload for a clean state, then one overview frame and one
  // support-power frame at 375×812.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: '章节：机房总览', exact: true }).click();
  await settle();
  const narrowOverview = await record('375-overview', 'outputs/before-375-overview.png');
  narrowOverview.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);
  await page.locator('.support-steps .step-button').first().click();
  await page.waitForTimeout(200);
  const narrowSupport = await record('375-support-power', 'outputs/before-375-power.png');
  narrowSupport.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);

  return {
    capturedAt: new Date().toISOString(),
    url: new URL(page.url()).origin,
    viewport: { desktop: { width: 1440, height: 1000 }, narrow: { width: 375, height: 812 } },
    reducedMotion: 'no-preference',
    shots,
    errors,
  };
}
