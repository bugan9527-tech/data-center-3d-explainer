async page => {
  const results = [], errors = [], poses = {};
  const check = (name,value) => { if (!value) throw new Error(name); results.push({name,passed:true}); };
  const read = () => page.locator('.room-shell canvas').evaluate(el => JSON.parse(el.dataset.camera));
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  const close = (a,b) => a.every((v,i) => Math.abs(v-b[i])<.001);
  const settle = async () => {
    await page.waitForFunction(() => document.querySelector('.room-shell canvas')?.dataset.moving === 'false');
    await page.waitForTimeout(60);
  };
  page.on('pageerror',e => errors.push(e.message));
  page.on('console',m => { if (m.type()==='error') errors.push(m.text()); });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  const expected = [
    ['机房总览','overview',[.4,.6,-.5]], ['网络设备','network',[-2.7,1,.1]],
    ['计算服务器','compute',[-.9,1,0]], ['存储设备','storage',[1.9,1,.1]],
    ['UPS 与配电','power',[2.4,1,-2.9]], ['制冷设备','cooling',[-3.1,1,-2.7]],
  ];
  for (const [title,id,target] of expected) {
    await page.getByRole('button',{name:`章节：${title}`,exact:true}).click();
    await settle(); poses[id]=await read();
    check(`镜头定位 ${title}`,close(poses[id].target,target));
    const count = await page.locator('.rack-id').count();
    check(`定位后场景完整 ${title}`,count===8 && await page.locator('.scene-fallback').count()===0);
    await page.screenshot({path:`outputs/immersive-${id}.png`,fullPage:true});
  }
  const beforeSelection = await read();
  // S4: only the three device systems step into teardown; the others still
  // select without moving the camera.
  await page.getByRole('button',{name:'供电系统 电力分配与保障',exact:true}).click();
  await page.waitForTimeout(200);
  check('普通系统选择保持视角',same(beforeSelection,await read()));
  await page.getByRole('button',{name:'存储设备 数据读写与保存',exact:true}).click();
  await settle();
  check('选择存储设备进入拆解',(await page.locator('.room-shell').getAttribute('class')).includes('teardown-mode') && !same(beforeSelection,await read()));
  await page.getByRole('button',{name:'查看位置',exact:true}).focus();
  await page.keyboard.press('Enter'); await settle();
  check('键盘查看位置',close((await read()).target,expected[3][2]));
  for (const index of [0,1,4,2,3,5,1,4]) {
    await page.getByRole('button',{name:`章节：${expected[index][0]}`,exact:true}).click();
    await page.waitForTimeout(45);
  }
  await settle();
  check('快速连续切换以最后镜头为准',close((await read()).target,expected[4][2]));
  await page.getByRole('button',{name:'章节：网络设备',exact:true}).click();
  await page.waitForTimeout(120);
  let box=await page.locator('.room-shell canvas').boundingBox();
  await page.mouse.move(box.x+box.width*.62,box.y+box.height*.42);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width*.68,box.y+box.height*.36,{steps:8});
  await page.mouse.up();
  const manual=await read(); await page.waitForTimeout(1000);
  check('手动旋转中断自动镜头且不会继续',same(manual,await read()));
  await page.getByRole('button',{name:'章节：存储设备',exact:true}).click();
  await page.waitForTimeout(100);
  await page.mouse.move(box.x+box.width*.66,box.y+box.height*.4);
  await page.mouse.wheel(0,-80);
  await page.waitForTimeout(120);
  const zoomed=await read(); await page.waitForTimeout(950);
  check('滚轮缩放中断自动镜头',same(zoomed,await read()));
  await page.getByRole('button',{name:'复位视角',exact:true}).click(); await settle();
  check('复位回到机房默认视角',close((await read()).target,expected[0][2]));
  const widthBefore=(await page.locator('.room-shell canvas').boundingBox()).width;
  const poseBefore=await read();
  await page.getByRole('button',{name:'收起职责说明',exact:true}).focus();
  await page.keyboard.press('Enter'); await page.waitForTimeout(220);
  // The stage is full-bleed now: collapsing frees the screen without resizing the canvas.
  check('收起说明隐藏职责面板且画布保持满屏',await page.locator('.detail-panel').count()===0 && Math.abs((await page.locator('.room-shell canvas').boundingBox()).width-widthBefore)<1);
  check('收起面板保持相机朝向',close(poseBefore.position,(await read()).position));
  await page.screenshot({path:'outputs/immersive-collapsed.png',fullPage:true});
  await page.getByRole('button',{name:'展开职责说明',exact:true}).click(); await page.waitForTimeout(220);
  check('展开面板恢复职责说明且画布不变',await page.locator('.detail-panel').count()===1 && Math.abs((await page.locator('.room-shell canvas').boundingBox()).width-widthBefore)<1);
  check('展开面板保持相机比例',Math.abs(poseBefore.zoomRatio-(await read()).zoomRatio)<.001);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  await page.getByRole('button',{name:'章节：网络设备',exact:true}).click();
  check('减少动态效果直接定位',close((await read()).target,expected[1][2]));
  check('减少动态效果无进行中的镜头',await page.locator('.room-shell canvas').getAttribute('data-moving')==='false');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for (const [width,height] of [[375,812],[768,1024],[1024,768],[1440,900],[812,375]]) {
    await page.setViewportSize({width,height}); await page.waitForTimeout(200);
    check(`机房无横向溢出 ${width}×${height}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(`机房章节与说明可操作 ${width}`,await page.getByRole('button',{name:'查看位置',exact:true}).isVisible() && await page.getByRole('button',{name:'章节：机房总览',exact:true}).isVisible());
    await page.screenshot({path:`outputs/immersive-layout-${width}.png`,fullPage:true});
  }
  // Hold the internal asset to prove the room remains visible until ready.
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  await page.route('**/server-internal.glb',async route => { await new Promise(resolve=>setTimeout(resolve,1600)); await route.continue(); });
  await page.getByRole('combobox',{name:'选择计算机柜'}).selectOption('C04');
  await page.getByRole('tab',{name:'整体结构',exact:true}).click();
  await page.getByRole('button',{name:'电力',exact:true}).click();
  await page.getByRole('button',{name:'冷空气',exact:true}).click();
  await page.getByRole('button',{name:'展开内部结构',exact:true}).click();
  const original=await read();
  await page.getByRole('button',{name:'打开服务器内部',exact:true}).click();
  await page.waitForTimeout(220);
  check('加载内部时机房仍可见',await page.locator('.room-shell canvas').isVisible());
  await page.screenshot({path:'outputs/entry-loading.png',fullPage:true});
  await page.getByRole('button',{name:'取消进入',exact:true}).click();
  await page.waitForTimeout(120);
  check('可取消进入并恢复视角',await page.locator('.phase-room').count()===1 && close(original.position,(await read()).position));
  await page.getByRole('button',{name:'打开服务器内部',exact:true}).click();
  await page.locator('.phase-inside').waitFor();
  check('内部就绪后才切换层级',await page.locator('.part-label').count()===6 && await page.locator('.room-shell canvas').count()===0);
  await page.getByRole('button',{name:'返回机房',exact:true}).click();
  await page.locator('.phase-room').waitFor();
  check('返回恢复 C04',await page.getByRole('combobox',{name:'选择计算机柜'}).inputValue()==='C04');
  check('返回恢复进入前视角',close(original.position,(await read()).position) && close(original.target,(await read()).target));
  check('返回保留展示模式',await page.getByRole('tab',{name:'整体结构',exact:true}).getAttribute('aria-selected')==='true');
  check('返回保留路径开关',await page.getByRole('button',{name:'电力',exact:true}).getAttribute('aria-pressed')==='true' && await page.getByRole('button',{name:'冷空气',exact:true}).getAttribute('aria-pressed')==='true');
  check('返回保留机柜展开状态',await page.getByRole('button',{name:'收起内部结构',exact:true}).getAttribute('aria-pressed')==='true');
  check('内部退出后卸载内部画布',await page.locator('.server-viewport canvas').count()===0);
  await page.unroute('**/server-internal.glb');
  check('没有控制台错误',errors.length===0);
  return {results,errors,poses};
}
