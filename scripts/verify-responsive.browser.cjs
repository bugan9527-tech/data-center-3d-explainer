async page => {
  const origin = new URL(page.url()).origin;
  const results = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({name,passed:true}); };
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.setViewportSize({width:375,height:812});
  await page.getByRole('button', {name:'查看计算服务器的工作',exact:true}).click();
  await page.waitForTimeout(1200);
  await page.getByRole('combobox', {name:'选择计算机柜'}).selectOption('C03');
  await page.getByRole('button', {name:'进入服务器内部',exact:true}).focus();
  await page.keyboard.press('Enter');
  await page.locator('.part-label').first().waitFor();
  check('键盘进入 C03 服务器', (await page.locator('.section-kicker').innerText()).includes('C03'));
  check('进入后标题获得焦点', await page.locator('h1').evaluate(el => el===document.activeElement));
  await page.getByRole('button',{name:'返回机房',exact:true}).focus();
  await page.keyboard.press('Tab');
  check('从顶部按 Tab 进入部件列表', await page.getByRole('button',{name:'网卡 网络的出入口',exact:true}).evaluate(el=>el===document.activeElement));
  await page.keyboard.press('Enter');
  check('键盘网卡选择', await page.locator('.server-detail h2').innerText()==='网卡');
  for (const id of ['cpu','memory','nic','motherboard','psu','fans']) {
    await page.locator(`.part-sidebar .system-button`).nth(['nic','cpu','memory','motherboard','psu','fans'].indexOf(id)).click();
    check('部件说明 '+id, (await page.locator('.current-role p').innerText()).length>0);
  }
  await page.getByRole('button',{name:'展开视图',exact:true}).click();
  await page.getByRole('button',{name:'第 3 步：读取数据到内存',exact:true}).click();
  for (const [width,height] of [[375,812],[768,1024],[1024,768],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.waitForTimeout(150);
    check(`布局无横向溢出 ${width}`, await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(`主要控件可见 ${width}`, await page.getByRole('button',{name:'返回机房',exact:true}).isVisible() && await page.getByRole('button',{name:'播放',exact:true}).isVisible());
    await page.screenshot({path:`outputs/server-internal-${width}.png`,fullPage:true});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.getByText('已遵循减少动态效果偏好',{exact:false}).waitFor();
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.waitForTimeout(150);
  const stillA = await page.locator('.server-viewport canvas').screenshot();
  await page.waitForTimeout(600);
  const stillB = await page.locator('.server-viewport canvas').screenshot();
  check('减少动态效果时播放中的标记保持静止',stillA.toString('base64')===stillB.toString('base64'));
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.getByRole('button',{name:'第 2 步：CPU 执行程序',exact:true}).click();
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.waitForTimeout(3500);
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  await page.waitForTimeout(300);
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.waitForTimeout(2200);
  check('继续播放使用暂停前剩余时间',await page.locator('.server-workflow [aria-current="step"]').getAttribute('aria-label')==='第 3 步：读取数据到内存');
  await page.getByRole('button',{name:'暂停',exact:true}).click();
  await page.getByRole('button',{name:'重新开始',exact:true}).click();
  check('重新开始回到第 1 步并暂停',await page.locator('.server-workflow [aria-current="step"]').getAttribute('aria-label')==='第 1 步：网卡接收请求' && await page.getByRole('button',{name:'播放',exact:true}).count()===1);
  await page.getByRole('button',{name:'播放',exact:true}).click();
  await page.getByText('第 5 / 5 步 · 演示结束',{exact:true}).waitFor({timeout:35000});
  check('五步播放完成后停止',await page.getByRole('button',{name:'重新播放',exact:true}).count()===1);
  await page.waitForTimeout(700);
  check('结束后没有自动循环',await page.getByText('第 5 / 5 步 · 演示结束',{exact:true}).count()===1);
  await page.getByRole('button',{name:'返回机房',exact:true}).click();
  await page.locator('.phase-room').waitFor();
  check('返回保留具体机柜 C03',await page.getByRole('combobox',{name:'选择计算机柜'}).inputValue()==='C03');
  check('没有控制台错误',errors.length===0);
  return {results,errors};
}
