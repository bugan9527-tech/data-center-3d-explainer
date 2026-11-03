async page => {
  const results=[];
  const check=(name,value)=>{ if(!value)throw new Error(name);results.push({name,passed:true}); };
  const memory=()=>page.evaluate(()=>performance.memory ? {
    usedJSHeapSize:performance.memory.usedJSHeapSize,
    totalJSHeapSize:performance.memory.totalJSHeapSize
  } : null);
  await page.setViewportSize({width:1440,height:900});
  await page.goto(new URL(page.url()).origin);
  await page.getByRole('button', { name: '显示界面', exact: true }).click({ timeout: 6000 }).catch(() => {});
  await page.locator('.rack-id').first().waitFor();
  const roomReadyMs=await page.evaluate(()=>performance.now());
  const roomMemory=await memory();
  check('机房九柜就绪',await page.locator('.rack-id').count()===9);
  const roomResources=await page.evaluate(()=>performance.getEntriesByType('resource')
    .filter(r=>r.name.endsWith('.glb')).map(r=>({file:r.name.split('/').pop(),durationMs:r.duration,transferBytes:r.transferSize,decodedBytes:r.decodedBodySize})));
  check('内部模型保持懒加载',roomResources.length===5 && !roomResources.some(r=>r.file==='server-internal.glb') && roomResources.some(r=>r.file==='infrastructure.glb') && roomResources.some(r=>r.file==='backup-rack.glb'));
  const start=Date.now();
  await page.getByRole('button', { name: '查看计算服务器的工作', exact: true }).click();
  await page.locator('.teardown-mode').waitFor({ timeout: 15000 });
  await page.getByRole('button',{name:'进入服务器内部',exact:true}).click();
  await page.locator('.phase-inside').waitFor();
  const entryMs=Date.now()-start, internalMemory=await memory();
  check('进入后只有内部画布',await page.locator('canvas').count()===1);
  await page.getByRole('button',{name:'返回机房',exact:true}).click();
  await page.locator('.phase-room').waitFor();
  const returnedMemory=await memory();
  check('返回后只有机房画布',await page.locator('canvas').count()===1);
  return {results,roomReadyMs,entryMs,roomResources,roomMemory,internalMemory,returnedMemory,
    browser:await page.evaluate(()=>navigator.userAgent),
    note:'单次本机 Chrome 样本。资源可能命中浏览器缓存；entryMs 包含 850ms 的主动镜头过渡、内部绘制及检测等待。JS heap 不代表进程内存或 GPU 显存，返回后未强制 GC。没有目标硬件的长期 FPS 或显存基准。'};
}
