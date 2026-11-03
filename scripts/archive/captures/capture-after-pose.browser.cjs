// S6: one screenshot per new interior pose, plus the eye distance each pose
// derives back to (it should land on the authored position).
async page => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const canvas = () => page.locator('.room-shell canvas');
  const settle = async () => {
    await page.waitForTimeout(150);
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(150);
  };
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.getByRole('tab', { name: '持续支撑', exact: true }).click();
  await page.waitForTimeout(250);

  const shots = [
    ['供电', 3, 'busway-up'], ['供电', 4, 'rack-front'], ['供电', 5, 'rack-front'],
    ['制冷', 1, 'cold-aisle'], ['制冷', 3, 'floor-low'], ['制冷', 5, 'hot-aisle'], ['制冷', 6, 'hot-aisle'],
  ];
  const out = [];
  for (const [chapter, index, id] of shots) {
    await page.getByRole('tab', { name: chapter, exact: true }).click();
    await page.waitForTimeout(200);
    await page.locator('.support-steps .step-button').nth(index).click();
    await page.waitForTimeout(120);
    await page.getByRole('button', { name: '查看本步特写', exact: true }).click();
    await settle();
    const cam = JSON.parse(await canvas().getAttribute('data-camera'));
    const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
    await page.screenshot({ path: `outputs/after-pose-${id}${index >= 4 && id === 'rack-front' ? '-psu' : index === 5 && id === 'hot-aisle' ? '-return' : ''}.png`, fullPage: true });
    out.push({ id, step: index + 1, eye: cam.position.map(v => +v.toFixed(2)), target: cam.target.map(v => +v.toFixed(2)), distance: +d.toFixed(2) });
  }
  return { out, errors };
}
