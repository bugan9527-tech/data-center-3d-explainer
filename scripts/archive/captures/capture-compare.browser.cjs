// S10: render the local comparison sheet and capture it as one tall image.
async page => {
  await page.setViewportSize({ width: 1680, height: 1200 });
  await page.goto('file:///D:/CodexProjects/PCAssemblyLab/outputs/compare-chapters.html');
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.waitForLoadState('load');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'outputs/compare-chapters.png', fullPage: true });
  const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  console.log('compare-chapters.png captured', JSON.stringify(size));
}
