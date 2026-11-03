async page => {
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({name,passed:true}); };
  const origin = new URL(page.url()).origin;
  const fallback = await page.context().newPage();
  await fallback.setViewportSize({width:1024,height:850});
  await fallback.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return getContext.call(this,type,...args);
    };
  });
  try {
    await fallback.goto(origin);
    // The interface starts hidden in focus view; restore it before touching panels.
    await fallback.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 10000 });
    await fallback.locator('.fallback-systems').waitFor({ state: 'visible', timeout: 10000 });
    await fallback.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
    // Picking compute opens the teardown panel, which carries the interior entry.
    await fallback.locator('.teardown-mode').waitFor({ timeout: 15000 });
    await fallback.getByRole('button',{name:'进入服务器内部',exact:true}).click({ timeout: 15000 });
    await fallback.locator('.phase-inside').waitFor();
    await fallback.getByRole('heading',{name:'三维视图暂时无法显示',exact:true}).waitFor();
    check('没有 WebGL 时显示文字降级提示',true);
    await fallback.getByRole('button',{name:'内存 临时工作区',exact:true}).click();
    check('没有 WebGL 仍可选择内存说明',await fallback.locator('.server-detail h2').innerText()==='内存');
    await fallback.getByRole('button',{name:'第 3 步：读取数据到内存',exact:true}).click();
    check('没有 WebGL 仍可逐步阅读流程',(await fallback.locator('.current-role p').innerText()).includes('接收从外部存储读来的文件数据'));
    await fallback.getByRole('button',{name:'播放',exact:true}).click();
    await fallback.getByRole('button',{name:'暂停',exact:true}).click();
    await fallback.screenshot({path:'outputs/server-internal-text-fallback.png',fullPage:true});
    await fallback.getByRole('button',{name:'返回机房',exact:true}).click();
    await fallback.locator('.phase-room').waitFor();
    check('没有 WebGL 仍可返回机房', await fallback.locator('.room-detail').isVisible() && await fallback.locator('.collab-bar').isVisible());
    check('没有 WebGL 仍可用播放条', await fallback.locator('.collab-bar .play-button').isVisible());
    await fallback.locator('.collab-bar .play-button').click();
    await fallback.waitForTimeout(300);
    await fallback.locator('.collab-bar .play-button').click();
    check('没有 WebGL 可控制播放', await fallback.locator('.collab-bar .play-button').getAttribute('aria-pressed')==='false');
    await fallback.screenshot({path:'outputs/request-text-fallback.png',fullPage:true});
  } finally { await fallback.close(); }
  // A failed UI chunk must keep the room and its cancel action usable.
  const failedModule = await page.context().newPage();
  try {
    await failedModule.route(/ServerExperience.*\.jsx?(\?|$)/,route => route.abort());
    await failedModule.goto(origin);
    await failedModule.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 10000 });
    await failedModule.locator('.rack-id').first().waitFor();
    await failedModule.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
    await failedModule.waitForTimeout(800);
    await failedModule.getByRole('button', { name: '进入服务器内部', exact: true }).click();
    await failedModule.getByText('内部界面未能加载，请取消进入并刷新页面重试。',{exact:true}).waitFor();
    check('内部界面加载失败时保留机房',await failedModule.locator('.room-shell canvas').isVisible());
    await failedModule.getByRole('button',{name:'取消进入',exact:true}).click();
    await failedModule.locator('.phase-room').waitFor();
    check('界面加载失败仍可取消进入', await failedModule.getByRole('button',{name:'进入服务器内部',exact:true}).isEnabled());
  } finally { await failedModule.close(); }
  await page.bringToFront();
  // The main page also opens in focus view; restore its interface before use.
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 10000 }).catch(() => {});
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await page.locator('.teardown-mode').waitFor({ timeout: 15000 });
  await page.getByRole('button',{name:'进入服务器内部',exact:true}).click();
  await page.locator('.part-label').first().waitFor();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.serverCheckRafCount = 0;
    window.serverCheckOriginalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = function(callback) {
      return window.serverCheckOriginalRaf.call(window,(time) => { window.serverCheckRafCount++; callback(time); });
    };
  });
  await page.waitForTimeout(500);
  const idleCallbacks = await page.evaluate(() => {
    window.requestAnimationFrame = window.serverCheckOriginalRaf;
    return window.serverCheckRafCount;
  });
  check('暂停静止时没有持续动画帧回调',idleCallbacks===0);
  return {results,idleCallbacks,browser:await page.evaluate(()=>navigator.userAgent),note:'禁用 WebGL 的独立测试页会产生预期的 WebGL 初始化错误；正常页面的控制台错误在另两份脚本中断言为零。'};
}
