> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

> **历史存档**：本文件是某一阶段的任务提示词存档。其中“不引入虚构数值、仪表盘或实时数据”的约束已被 2026-11-03 的口径变更取代——现行约定允许显示读数，但每处必须标注为模拟。现行口径见 `README.md` 的“范围限制”与 `docs/TWIN_UPGRADE_REVIEW.md` 的决策记录。

# 逐件拆解 · 新对话提示词

对应方案：`docs/TEARDOWN_PLAN.md`（先读再动手）。

当前状态：S1 已完成并通过独立验收——`server_bank` 下已是 9 个 `part_server_*`（各 7 个材质 primitive）+ 2 个锚点；三角形 6,432、顶点 12,864、包围盒与改造前逐项一致（记录见方案第六节）。

**进度**：S1–S4 已完成并通过独立验收（记录见方案第六、七、八节），九组回归 333/333。S4 通过后仍有三条不阻塞项：① 拆解态看不到「打开服务器内部」，建议把入口放进拆解面板头部；② 375 宽下 10 个编号点互相压住（间距 11–12 px、点径 21 px），窄画布应隐藏编号点；③ 重复点同一设备会重置聚焦与机位。做 S5 时一并处理或单列一轮都可。

**S2 首轮验收遗留（已修复，保留备查）**：① 聚焦 PDU 时标签跑到画布外（实测 y=1053 > 900），机位仍是机柜中心 → 给 PDU 单独机位，标签 y 抬到 1.05；② 风扇标签贴住左栏（x=92，栏右缘 90）、引线断开、模块过曝（点光 3.2 距离 0.6 m）→ 标签移右侧、引线连到标签、聚焦风扇时点光降到 1.6；③ 标签统一 +0.55 前移会让低处部件（PDU y=0.45）的圆点落到地板上 → 降到 0.12–0.15，并把标签夹进画布（左右各留 16 px）。详见 `docs/TEARDOWN_PLAN.md` 第七节。

**已定论的决策（不要再问）**：`part_fan_tray` / `part_pdu` 保持零三角形命名锚点，S2 绑定到现有 `FanTray` / `RackPdu` 组件，不在 `server-rack.glb` 里新增实体几何。理由：这两件在 `infrastructure.glb` 里已有独立资产且网页已在渲染，再造一份会同位置重叠；且三角形会从 6,432 涨到 9,184（+43%），并打断支撑章节对这些组件的染色与扇叶旋转。锚点坐标与组件坐标逐位相同（`[0,1.94,.18]`、`[-.51,.45,.2]`），可作为唯一真值来源。

---

## 附录 A：开场提示词（先贴这段）

新对话没有本项目的上下文，第一句必须整段贴这个。它会让模型先读文档、复述现状，再只做 S1。

```
工作目录 D:\CodexProjects\PCAssemblyLab：Vite + React 19 + three.js 的数据中心三维教学展品，桌面端默认是纯净视野（所有浮层隐藏）。
先只读不写，按顺序读：README.md、docs/TEARDOWN_PLAN.md、docs/TEARDOWN_PROMPTS.md、docs/SUPPORT_VALIDATION.md，
以及 blender/source/generate_rack.py、scripts/inspect-assets.py、src/scene/DataCenterViewport.jsx、src/data/roomCameras.js、src/App.jsx。

读完用不超过 15 行复述：4 个模式（整体结构／工作分工／协作流程／持续支撑）、11 阶段请求流程、供电 6 步／制冷 7 步、
默认纯净视野的行为、data-camera／data-flow／data-support 三个诊断契约、八组回归脚本与当前总通过项数（280 项）、
以及拆解现状（server_bank 下只有 7 个按材质合并的网格，目标契约是 11 个 part_*）。
与仓库实际代码不一致时先指出来，不要照抄文档。

然后只执行 docs/TEARDOWN_PROMPTS.md 附录 B 的 S1（模型侧），做完立刻停下等我确认，不要顺手写前端（附录 C）。

硬约束（每一步都适用）：
1. 不改 11 阶段请求流程、供电 6 步／制冷 7 步的步骤划分与文案口径；不引入虚构数值、仪表盘或实时数据；
   部件规格数值一律标注为示例参数，不得写成真实产品参数。
2. 暂停时两次画布截图必须完全一致；减少动态效果下不得有连续动画；演示结束不自动循环。
3. 窄屏（375/768）无横向溢出；键盘可完成主要操作。
4. 桌面默认纯净视野：focus=true 时所有浮层 display:none。任何新写的测试或截图脚本，打开页面后必须先点一次「显示界面」再找面板。
5. 除方案明确允许，不新增运行时依赖、不引入外部贴图或模型；改造后三角形数不得增加、外观不得变化。
6. 机柜外壳材质必须按实例 clone 并 dispose（scene.clone 共享材质，直接改 opacity 会让 8 台机柜一起变透明）；
   只拆解主柜（network→N01、compute→当前选中柜、storage→S01），否则同类第二台外壳滑出会与邻柜重叠。

环境：开发服务 npm.cmd run dev -- --port 5173；生产预览 npm.cmd run preview -- --port 4180；
回归 npm.cmd run verify:browser -- -Url http://127.0.0.1:4180/（需要 playwright-cli 与本机 Chrome）；
Blender：D:\CodexTools\Blender\blender-4.5.15-windows-x64\blender.exe。
每步交付必须包含：改了哪些文件、build 结果、八组回归项数、inspect-assets.py 输出、同机位前后对比截图路径。
```

---

## 附录 B：S1 模型侧（先做这个）

```
项目 D:\CodexProjects\PCAssemblyLab，按 docs/TEARDOWN_PLAN.md 的「二、模型侧」改造 blender/source/generate_rack.py。

背景：脚本里 9 台服务器（for row in range(9)）是逐件建的，但末尾 `for parent in [shell, servers, frame]` 按材质 join，
把它们合并成了 server_bank_Server_chassis 等 7 块网格，前端拿不到单台。

1) 保留 enclosure、rack_frame 的按材质 join（外壳与框架仍各是一组）。
2) server_bank 不再按材质 join，改为按行合并：每一行的 tray / front plate / handle / vent / port / LED / PCB / heatsink
   全部 join 成一个对象，命名 part_server_01 … part_server_09（从下到上、两位补零），parent 保持 server_bank。
3) 新增两个独立部件：part_fan_tray（顶部风扇模块）、part_pdu（左侧 PDU 竖条），parent 也都是 server_bank。
4) 每个 part_* 导出前把原点设到自身几何中心（Set Origin → Origin to Geometry），否则前端沿 +z 拉出会歪。
5) 不改变外形尺寸、位置与材质；三角形数不得增加；不新增贴图。
6) 导出 public/models/server-rack.glb 与 blender/source/server-rack.blend。
7) 更新 scripts/inspect-assets.py：compute 的必需节点加入 part_server_01、part_fan_tray、part_pdu。
8) 运行：blender --background --factory-startup --python-exit-code 1 --python blender/source/generate_rack.py
   然后 python scripts/inspect-assets.py，确认节点名与三角形数与改造前一致（只多层级、不多面）。

验收：
- GLB 顶层仍是 enclosure / rack_frame / server_bank，server_bank 下有 11 个 part_*；
- 三角形总数与改造前相同（记录前后数字）；
- inspect-assets.py 通过；
- 打开 http://127.0.0.1:4180/ 后机柜外观与改造前逐像素一致（同一机位截图对比，允许 ≤0.5% 像素差异）。
```

---

## 附录 C：S2+S3 前端逐件拆解与清单

```
项目 D:\CodexProjects\PCAssemblyLab，接 S1，按 docs/TEARDOWN_PLAN.md 的「三、前端侧」实现计算柜的逐件拆解。

1) 新增 src/data/rackParts.js：
   - compute 列 11 条：part_server_01…09（名称「计算服务器 01」…）、part_fan_tray「风扇模块」、part_pdu「机柜 PDU」；
   - 每条含 specs（3 行，形如 高度/形态/供电）与 role（一句作用）；
   - 规格里的数值必须标为示例参数，不得写成真实产品规格。
2) src/scene/DataCenterViewport.jsx：
   - TEARDOWN_PARTS 改为从 rackParts 读取，不再写死组名与标签；network / storage 仍沿用现有组名（本轮只改计算柜）。
   - 保留外壳左移 1.12 + 26% 透明 + 点光的现有实现。
   - 每件沿 +z 拉出，y 不动（服务器本来就在不同高度）：z = base.z + 0.12 + index * 0.055。
     S1 之后每个 part_* 的原点已移到几何中心，节点自带非零 translation（服务器 z=0.046、风扇锚点 z=0.18、PDU 锚点 z=0.2）。
     现有代码把 position.z 直接缓动到 0.18 + index*0.13，等于覆盖基准位置；必须先存 node.userData.base = node.position.clone()，再写 base.z + offset。
   - part_fan_tray / part_pdu 是零三角形锚点，移动它不会带动画面：FanTray 与 RackPdu 是 model 的兄弟节点。
     由 Rack 读锚点位置算出同一份偏移，传给 <FanTray> / <RackPdu>（不要在组件里再写一份常量）；
     RackPdu 的 -90° 绕 Y 旋转只存在于组件里，锚点没有旋转，绑定后必须保留。
   - 展开时每件显示一个编号小圆点（01…09），只有"当前聚焦件"显示完整标签 + 引线；现有标签按 1.92 - index*0.42 排会掉到柜底以下，需要重排。
   - 聚焦切换用缓动，禁止瞬移；缓动结束必须停下（invalidate 不常驻）。
3) src/App.jsx 的 detail 面板：拆解态下列表 11 件（编号 · 名称 · 状态），点击某件 → 高亮（emissive）+ 相机聚焦该件 + 下方显示规格卡；
   顶部显示「已拆解 11 / 11」，加「全部拆解 / 全部合上」。
4) 状态放 App：teardown（是否展开）、teardownPart（当前聚焦件 id），经 DataCenterViewport 传到 Rack。
5) 相机聚焦件时用 moveCamera 到该件前方的近景（新增 3–4 个机位即可，不用每件一个）。

约束：
- 暂停/停止时不得有连续动画；逐件缓动结束后必须 invalidate 停止；
- 不改 11 阶段流程与支撑章节；
- 保留 .teardown-mode 时隐藏底部卡片的现行行为。

验收：
- 点计算服务器 →「拆解内部构造」→ 11 件依次拉出，编号不重叠，标签只有一个；
- 点列表任意一件 → 高亮 + 相机聚焦 + 规格卡内容正确；
- 合上后恢复原状；
- build 通过、八组回归 280 项全绿、console 0 error；
- 截图 outputs/teardown-all.png 与 outputs/teardown-part.png。
```

---

## 附录 D：S4 点击即拆解 + 回归更新

```
项目 D:\CodexProjects\PCAssemblyLab，接 S3，把拆解改成"点设备即触发"。

1) src/App.jsx 的 chooseSystem：当 id 是 network / compute / storage 时，setTeardown(true) 并 moveCamera(`teardown-${id}`)；其它系统维持原样。
2) scripts/verify-immersive.browser.cjs 的「普通系统选择保持视角」断言改为两段：
   - 点「供电系统」→ 视角不变（保留原语义）；
   - 点「存储设备」→ 进入拆解且 target 改变（新增一条断言）。
3) 新增 scripts/verify-teardown.browser.cjs（约 12 项）：
   - 点计算服务器后 teardown 生效（.teardown-mode 存在、底部卡片隐藏）；
   - 聚焦件切换生效（列表点击后 data 属性/class 变化）；
   - 「已拆解 11 / 11」计数正确；
   - 合上后 .teardown-mode 消失、外壳透明度回到 1；
   - 相机在合上后回到该设备章节机位；
   - console 无错误。
4) 把新脚本加入 scripts/verify-browser.ps1 的 ValidateSet 与默认列表。

验收：八组 + teardown 合计全绿；给出一张「点击计算服务器后」的截图。
```

---

## 附录 E：环境与已知坑

- **默认纯净视野**：`focus` 初值 = `matchMedia('(min-width: 901px)')`，桌面打开时所有浮层隐藏，只有右上角「显示界面」。脚本必须先点它。
- **外壳材质要 clone**：`scene.clone(true)` 共享材质，直接改 `opacity` 会影响全部 8 台机柜；现有代码已在 `useEffect` 里按实例 clone 并 dispose。
- **只拆主柜**：`leadRack` 逻辑（network→N01、compute→当前选中柜、storage→S01），否则同类第二台外壳滑出会与邻柜重叠。
- **`--sheet-h` 是活的**：底部卡片高度由 ResizeObserver 写回 CSS 变量；隐藏卡片（teardown-mode）时不能把变量写成 0。
- **相机 fit**：`RoomCameraRig` 的 fit = `min(视口宽/pose.width, 视口高/pose.height)`，桌面被 height 卡住，只改 width 不会改变构图。
- **回归口径**：当前 280 项（playback 20、support 90、immersive 44、present 71、responsive 25、server 16、fallback 10、resources 4）。改断言必须说明是行为变更，不允许为过测试迁就实现。
- **包装脚本偶发**：`verify-browser.ps1` 有时 exit=1 且无输出（stderr 的证书警告被当成错误），此时逐组用 `playwright-cli run-code --filename scripts/verify-xxx.browser.cjs` 取真实结果。

---

## 附录 F：每轮怎么发

1. 贴附录 A → 它复述 + 做 S1 → 你确认 GLB 节点与三角形数。
2. 通过就说「通过，继续 S2」，贴附录 C（S2 与 S3 合成一轮）。
3. 通过后贴附录 D 做交互与回归。
4. 不通过用这个格式：

```
S1 未通过：<具体现象，例如 server_bank 下只有 7 个节点 / 三角形从 12k 变成 15k>。
期望：<期望结果>。
请只修 <具体文件或范围>，不要顺手做前端；修完给出 inspect-assets.py 输出与截图。
```

只看四件事：节点名与层级是否符合契约、三角形数是否没涨、机柜外观是否没变、八组回归是否仍全绿。
