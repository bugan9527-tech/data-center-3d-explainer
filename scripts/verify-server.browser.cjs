async page => {
  const origin = new URL(page.url()).origin;
  await page.setViewportSize({width:1440,height:1100});
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({name, passed:true}); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const requested = [];
  page.on('request', req => requested.push(req.url()));
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  check('内部模型进入前不加载', !requested.some(url => url.includes('server-internal.glb')));
  await page.getByRole('button', {name:'查看计算服务器的工作',exact:true}).click();
  // S4: picking compute opens the teardown panel; close it first because this
  // script checks the server-internal entry that lives in the normal detail.
  await page.getByRole('button', {name:'合上内部构造',exact:true}).click();
  await page.waitForTimeout(300);
  const canvas = page.locator('[data-testid="viewport"] canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x+box.width*.65, box.y+box.height*.7);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.70, box.y+box.height*.64, {steps:12});
  await page.mouse.up();
  await page.mouse.wheel(0,-110);
  await page.waitForTimeout(400);
  const before = await page.locator('.rack-id').evaluateAll(nodes => nodes.map(n => { const r=n.getBoundingClientRect(); return {id:n.textContent,x:r.x,y:r.y}; }));
  const beforeViewport = await canvas.boundingBox();
  await page.screenshot({path:'outputs/room-before-entry.png',fullPage:true});
  await page.getByRole('button', {name:'打开服务器内部',exact:true}).click();
  await page.locator('.part-label').first().waitFor();
  check('实际 GLB 加载且没有降级', await page.locator('.part-label').count() === 6 && await page.locator('.scene-fallback').count() === 0);
  check('内部 GLB 在进入后请求', requested.some(url => url.includes('server-internal.glb')));
  for (const name of ['CPU 中央处理器','内存 临时工作区','网卡 网络的出入口']) {
    const button = page.getByRole('button', {name,exact:true});
    await button.click();
    check('文字选择 '+name, await button.getAttribute('aria-pressed') === 'true');
  }
  // CPU fins are visible at the center-left of this default camera.
  await page.mouse.click(652,531);
  check('点击实际 CPU 网格可选择', await page.locator('.server-detail h2').innerText() === 'CPU');
  await page.screenshot({path:'outputs/server-internal-desktop.png',fullPage:true});
  await page.getByRole('button', {name:'展开视图',exact:true}).click();
  check('展开视图状态', await page.getByRole('button', {name:'展开视图',exact:true}).getAttribute('aria-pressed') === 'true');
  await page.getByRole('button', {name:'第 3 步：读取数据到内存',exact:true}).click();
  await page.getByRole('button', {name:'播放',exact:true}).click();
  await page.waitForTimeout(850);
  await page.getByRole('button', {name:'暂停',exact:true}).click();
  const pausedStep = await page.locator('.server-workflow [aria-current="step"]').getAttribute('aria-label');
  await page.waitForTimeout(100);
  const shotA = await page.locator('.server-viewport canvas').screenshot();
  await page.waitForTimeout(5800);
  const shotB = await page.locator('.server-viewport canvas').screenshot();
  check('暂停后步骤保持', pausedStep === await page.locator('.server-workflow [aria-current="step"]').getAttribute('aria-label'));
  check('暂停后模型与移动标记像素保持', shotA.toString('base64') === shotB.toString('base64'));
  await page.getByRole('button', {name:'第 4 步：CPU 处理内存数据',exact:true}).click();
  check('手动步骤处于暂停', await page.getByRole('button', {name:'播放',exact:true}).count() === 1);
  await page.getByRole('button', {name:'内存 临时工作区',exact:true}).focus();
  await page.keyboard.press('Enter');
  check('键盘选择内存', await page.locator('.server-detail h2').innerText() === '内存');
  await page.getByRole('button', {name:'向左旋转视角',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', {name:'视角复位',exact:true}).click();
  await page.screenshot({path:'outputs/server-internal-expanded.png',fullPage:true});
  await page.getByRole('button', {name:'返回机房',exact:true}).click();
  await page.locator('.rack-id').first().waitFor();
  await page.waitForTimeout(400);
  const after = await page.locator('.rack-id').evaluateAll(nodes => nodes.map(n => { const r=n.getBoundingClientRect(); return {id:n.textContent,x:r.x,y:r.y}; }));
  check('返回保留计算系统选择', (await page.locator('.detail-title h2').innerText()) === '计算服务器');
  check('返回恢复入口焦点', await page.getByRole('button', {name:'打开服务器内部',exact:true}).evaluate(el => el === document.activeElement));
  const afterViewport = await canvas.boundingBox();
  check('返回恢复原先机房视角', before.every((p,i) => p.id===after[i].id && Math.abs(p.x-beforeViewport.x-after[i].x+afterViewport.x)<1 && Math.abs(p.y-beforeViewport.y-after[i].y+afterViewport.y)<1));
  await page.screenshot({path:'outputs/room-restored.png',fullPage:true});
  check('没有控制台错误', errors.length === 0);
  return {results,errors,before,after};
}
