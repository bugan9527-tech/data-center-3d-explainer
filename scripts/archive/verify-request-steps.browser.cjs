async page => {
  const results = [], errors = [];
  const check = (name, value) => { if (!value) throw new Error(name); results.push({name,passed:true}); };
  const same = (a,b) => JSON.stringify(a)===JSON.stringify(b);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const origin = new URL(page.url()).origin;
  const canvas = () => page.locator('.room-shell canvas');
  const read = async () => JSON.parse(await canvas().getAttribute('data-flow'));
  const stageButton = i => page.locator('.request-workflow .step-button').nth(i);
  const play = () => page.locator('.request-workflow .play-button');
  const expectStage = async i => page.waitForFunction(i => JSON.parse(document.querySelector('.room-shell canvas')?.dataset.flow || '{}').step===i,i);
  const manual = async i => {await stageButton(i).click();await expectStage(i);await page.waitForTimeout(70);};
  await page.setViewportSize({width:1440,height:1000});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  const expected = [
    ['user','ingress'], ['ingress','fabric','egress'], ['egress','compute'], ['compute'],
    ['compute','egress','fabric','storagePort','controller'], ['controller','module'],
    ['module','controller'], ['controller','storagePort','fabric','egress','compute'],
    ['compute'], ['compute','egress','fabric','ingress'], ['ingress','user'],
  ];
  const records=[];
  for(let i=0;i<11;i++) {
    await manual(i);
    const flow=await read();
    const network=JSON.parse(await canvas().getAttribute('data-equipment-n01'));
    const storage=JSON.parse(await canvas().getAttribute('data-equipment-s01'));
    check(`阶段 ${i+1} 逻辑路径与方向`,same(flow.route,expected[i]));
    check(`阶段 ${i+1} 手动选择暂停且进度归零`,flow.progress===0 && await play().getAttribute('aria-pressed')==='false');
    check(`阶段 ${i+1} 实体端口与转发高亮`,same([...network].sort(),expected[i].filter(id=>['ingress','fabric','egress','storagePort'].includes(id)).sort()));
    check(`阶段 ${i+1} 实体控制单元与模块高亮`,same([...storage].sort(),expected[i].filter(id=>['controller','module'].includes(id)).sort()));
    check(`阶段 ${i+1} 说明与设备列表完整`,await page.locator('.request-stage dt').allTextContents().then(t=>t.join('|')==='哪个部分负责|接收什么|输出到哪里') && await page.locator('.flow-devices [data-participating="true"]').count()===flow.active.length);
    check(`阶段 ${i+1} 保留静态方向箭头`,flow.arrows===3);
    records.push({step:i+1,...flow,network,storage});
  }
  await page.screenshot({path:'outputs/request-complete.png',fullPage:true});
  // Resume a partial final stage must not restart it.
  await play().click();await page.waitForTimeout(500);await play().click();
  check('最后一步暂停时仍留在最后一步',(await read()).step===10 && (await read()).progress>0);
  await play().click();await page.waitForTimeout(200);await play().click();
  check('最后一步继续不回到第一步',(await read()).step===10);
  await manual(1);await play().click();await page.waitForTimeout(2600);await play().click();
  const paused=await read();await page.waitForTimeout(200);
  // Element screenshots scroll the canvas into view; do it once up front so both
  // frames are captured at the same scroll offset instead of mid-scroll.
  await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
  const shotA=await canvas().screenshot();
  await page.waitForTimeout(4500);
  const shotB=await canvas().screenshot();
  check('暂停保留阶段及分数进度',paused.progress>.45 && paused.progress<.85 && same(paused,await read()));
  check('暂停后实际画布像素保持',shotA.toString('base64')===shotB.toString('base64'));
  await page.getByRole('button',{name:'查看流程设备：S01 · 文件存储模块',exact:true}).click();
  check('文字设备选择独立于业务暂停点',same(paused,await read()) && await page.locator('.selected-node').innerText()==='✓ S01 · 文件存储模块');
  await page.getByRole('button',{name:'供电系统 电力分配与保障',exact:true}).click();
  check('观察持续供电设备不改变业务阶段或进度',same(paused,await read()) && await page.getByRole('button',{name:'供电系统 电力分配与保障',exact:true}).getAttribute('aria-pressed')==='true');
  await play().click();await page.waitForTimeout(1900);await expectStage(2);await play().click();
  check('继续从暂停前剩余时间推进',(await read()).step===2);
  await manual(4);await play().click();await page.waitForTimeout(250);
  await page.getByRole('button',{name:'网络设备 连接与转发',exact:true}).click();
  const afterSelection=await read();await page.waitForTimeout(180);
  check('播放时普通系统选择不暂停不跳步',await play().getAttribute('aria-pressed')==='true' && (await read()).step===4 && (await read()).progress>afterSelection.progress);
  await play().click();
  // Model picking is tested on an expanded, visible port group using projection
  // metadata from the actual camera and the model anchor (no HTML label click).
  await page.getByRole('button',{name:'章节：网络设备',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.room-shell canvas').dataset.moving==='false');
  await manual(1);
  await page.screenshot({path:'outputs/request-network.png',fullPage:true});
  await canvas().scrollIntoViewIfNeeded();
  const rect=await canvas().boundingBox();
  const project=await canvas().getAttribute('data-flow-pick-projections');
  if(!project)throw new Error('missing actual flow projections');
  const ports=JSON.parse(project);
  await page.mouse.click(rect.x+ports.ingress[0],rect.y+ports.ingress[1]);
  check('点击实际 A 端口模型可选择节点',(await page.locator('.selected-node').innerText()).includes('A 外网端口组'));
  check('模型点击不改变流程阶段',(await read()).step===1 && (await read()).progress===0);
  await manual(5);
  await page.getByRole('button',{name:'章节：存储设备',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.room-shell canvas').dataset.moving==='false');
  await page.screenshot({path:'outputs/request-storage-locate.png',fullPage:true});
  await manual(6);await page.screenshot({path:'outputs/request-storage-read.png',fullPage:true});
  await canvas().scrollIntoViewIfNeeded();
  const storageRect=await canvas().boundingBox();
  const projection=JSON.parse(await canvas().getAttribute('data-flow-pick-projections')).module;
  await page.mouse.click(storageRect.x+projection[0],storageRect.y+projection[1]);
  check('点击实际文件模块可选择节点',(await page.locator('.selected-node').innerText()).includes('文件存储模块'));
  await manual(7);await page.getByRole('button',{name:'章节：机房总览',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.room-shell canvas').dataset.moving==='false');
  await page.screenshot({path:'outputs/request-data-return.png',fullPage:true});
  // Expansion moves functional nodes and all route endpoints together.
  await page.getByRole('button',{name:'查看流程设备：S01 · 存储控制单元',exact:true}).click();
  const base=(await read()).marker;
  await page.getByRole('button',{name:'展开内部结构',exact:true}).click();await page.waitForTimeout(100);
  const moved=(await read()).marker;
  check('展开机柜后路径跟随功能装配',Math.abs(moved[2]-base[2]-.6)<.001);
  await page.getByRole('button',{name:'收起内部结构',exact:true}).click();
  // Entry preserves the room's fractional clock while the internal view starts
  // at the corresponding principle stage, and the room is always paused back.
  await manual(8);await page.getByRole('button',{name:'查看流程设备：C01 · 01 号计算服务器',exact:true}).click();
  await play().click();await page.waitForTimeout(600);
  await page.getByRole('button',{name:'打开服务器内部',exact:true}).click();
  const entryPoint=await read();
  await page.locator('.phase-inside').waitFor();
  check('内部从对应 CPU 整理阶段开始',await page.locator('.server-workflow [aria-current="step"]').getAttribute('aria-label')==='第 4 步：CPU 处理内存数据');
  await page.getByRole('button',{name:'第 2 步：CPU 执行程序',exact:true}).click();
  await page.getByRole('button',{name:'返回机房',exact:true}).click();await page.locator('.phase-room').waitFor();await expectStage(8);
  const restored=await read();
  check('返回保留机房阶段和分数进度',restored.step===entryPoint.step && Math.abs(restored.progress-entryPoint.progress)<.03 && await play().getAttribute('aria-pressed')==='false');
  check('返回恢复入口焦点',await page.getByRole('button',{name:'打开服务器内部',exact:true}).evaluate(el=>el===document.activeElement));
  await page.locator('.request-workflow .restart-button').click();await expectStage(0);
  check('重新开始归零且清除旧高亮',(await read()).progress===0 && same(JSON.parse(await canvas().getAttribute('data-equipment-s01')),[]) && same(JSON.parse(await canvas().getAttribute('data-equipment-n01')),['ingress']));
  // Real browser document visibility switches when an additional tab is front.
  await play().click();await page.waitForTimeout(250);
  const other=await page.context().newPage();await other.goto('about:blank');await other.bringToFront();await page.waitForTimeout(250);
  const hidden=await page.evaluate(()=>document.hidden);
  if(!hidden) { // Headless Chrome does not always expose tab visibility: dispatch
    // the same platform event with hidden=true, then restore the descriptor.
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  }
  await page.waitForTimeout(150);
  check('页面进入后台时自动暂停',await play().getAttribute('aria-pressed')==='false');
  const hiddenPoint=await read();await page.waitForTimeout(250);check('后台保留暂停进度',same(hiddenPoint,await read()));
  if(!hidden)await page.evaluate(()=>{delete document.hidden;});
  await other.close();await page.bringToFront();
  check('回到前台不会自动续播',await play().getAttribute('aria-pressed')==='false');
  await manual(6);await page.emulateMedia({reducedMotion:'reduce'});await play().click();await page.waitForTimeout(180);
  await canvas().scrollIntoViewIfNeeded();await page.waitForTimeout(160);
  const stillA=await canvas().screenshot();await page.waitForTimeout(500);const stillB=await canvas().screenshot();
  check('减少动态效果保留静态箭头且画布保持',stillA.toString('base64')===stillB.toString('base64') && (await read()).arrows===3);
  await play().click();await page.screenshot({path:'outputs/request-reduced-motion.png',fullPage:true});
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const [width,height] of [[375,812],[768,1024],[1024,768],[1440,900],[812,375]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(160);
    check(`业务流程无横向溢出 ${width}×${height}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    check(`业务流程主要按钮可见 ${width}`,await play().isVisible() && await page.locator('.request-workflow .restart-button').isVisible());
    if(width<=900)check(`窄屏隐藏空间标注避免遮挡 ${width}`,await page.locator('.flow-node-label:visible').count()===0);
    await page.screenshot({path:`outputs/request-layout-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1440,height:1000});
  await stageButton(4).focus();await page.keyboard.press('Enter');await expectStage(4);
  check('键盘手动选步暂停归零',(await read()).progress===0 && await play().getAttribute('aria-pressed')==='false');
  await page.getByRole('button',{name:'查看流程设备：S01 · 文件存储模块',exact:true}).focus();await page.keyboard.press('Enter');
  check('键盘设备选择不改变阶段',(await read()).step===4 && (await page.locator('.selected-node').innerText()).includes('文件存储模块'));
  await page.locator('.request-workflow .restart-button').focus();await page.keyboard.press('Enter');await expectStage(0);
  await play().focus();await page.keyboard.press('Enter');
  await page.getByText('第 11 / 11 步 · 演示结束',{exact:true}).waitFor({timeout:65000});
  const end=await read();await page.waitForTimeout(800);
  check('完整十一阶段从请求到用户结果完成并停住',end.step===10 && end.progress===1 && same(end,await read()) && await play().getAttribute('aria-pressed')==='false');
  await page.screenshot({path:'outputs/request-full-finished.png',fullPage:true});
  await page.evaluate(()=>{window.requestCheckRaf=0;window.requestCheckOriginalRaf=requestAnimationFrame;window.requestAnimationFrame=callback=>window.requestCheckOriginalRaf(time=>{window.requestCheckRaf++;callback(time);});});
  await page.waitForTimeout(500);
  const idle=await page.evaluate(()=>{window.requestAnimationFrame=window.requestCheckOriginalRaf;return window.requestCheckRaf;});
  check('业务结束后按需渲染无持续动画帧',idle===0);
  check('正常流程无控制台错误',errors.length===0);
  return {results,errors,records,entryPoint,restored,paused,end,idle,visibilityTest:hidden?'real-tab':'simulated-platform-event',browser:await page.evaluate(()=>navigator.userAgent)};
}
