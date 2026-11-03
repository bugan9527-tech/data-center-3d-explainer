> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

# 播放时的“流动感”优化方案

状态：方案待确认。范围仅限支撑演示（供电 6 步、制冷 7 步）的播放表现，不改步骤划分、文案口径、11 阶段请求流程与服务器内部。

## 一、先确认事实：动画在跑，但看不出来

用无头 Chrome 在 1440×900 实测（默认纯净视野 → 显示界面 → 持续支撑 → 播放）：

| 场景 | 连续 4 帧画布去重 | progress | 结论 |
| --- | --- | --- | --- |
| 供电播放中 | 4 / 4 各不相同 | 0.29 | 画布每帧都在重绘 |
| 供电暂停 | 1 / 4 | 0.30 | 暂停确实冻结 |
| 制冷播放中 | 4 / 4 | 0.29 | 同上 |
| 制冷暂停 | 1 / 4 | 0.29 | 同上 |

所以不是“没动画”，而是**动画的视觉量级不够、位置不合适**。截图中看到的是：供电只有一小团模糊橙色光斑贴在 UPS 上方；制冷在地板上只有一条几乎看不见的淡青细线。

## 二、根因（4 条根因 + 1 条同源表现，由 P0-4 覆盖；按影响排序）

1. **一条路径只有一个发光头，5.6 秒走完就停。** `FlowGlow` 只渲染 1 个头部 + 3 段尾迹，`SUPPORT_STEP_DURATION = 5600`，进度到 1 后这一步结束、进入下一步。观感是“闪一下”，不是“持续流动”。
2. **只有最长的一条路径有发光头。** `SupportVisualization` 里 `showMarker={path === primary}`，同一阶段其余路径（例如 UPS→配电柜、配电柜→母线）连一个移动标记都没有，只有不动的锥形箭头。
3. **头部尺寸过大且是软边贴图。** `StepPath` 传 `size={.7}`，`glowTexture` 是径向渐隐圆，近景下直径约 60–80 px，看起来像一团雾或污渍，没有“电在走”的指向性。
4. **制冷路径贴在地板表面（y = 0.06），颜色又淡。** `coolingBase.supply` 全线 `y = .06`，线宽 1.6、透明度 0.34，青色叠在浅灰地板上对比不足；同时 1440×900 下底部卡片高 466 px，正好覆盖画面下半部分——地面路径落在被遮挡区里，等于看不见。
5. **（同源表现，由 P0-4 覆盖）静态锥形箭头不参与播放。** 箭头固定在 t = 1/4、1/2、3/4 处，播放时只有那个小光点动，箭头不动，观众很难读出“方向”。

## 三、方案

### P0 让“流动”持续、可读（视觉核心，推荐先做）

| 编号 | 做法 | 落点 |
| --- | --- | --- |
| P0-1 | 一条路径放 **3 个相位错开的流头**（progress + i/3 mod 1），步骤内形成连续车流；进度到 1 时全部停在末端，不反向、不自动循环 | `FlowGlow.jsx` |
| P0-2 | 流头改为**小而实**：核心 0.16–0.2 单位实心圆 + 一圈 0.3 的淡环 + 3 段渐隐短尾（替代现在 0.7 的软光斑） | `FlowGlow.jsx` + 新 `flowTexture` |
| P0-3 | **每一条 stage 路径都发光**，次要路径头部 0.6 倍大小、60% 不透明度（按路径长度排序定主次，不再只点亮最长那条） | `SupportVisualization.jsx` |
| P0-4 | 静态锥体改为**沿曲线巡游的箭头**（每路径 3 个，位置 = (progress + i/3) mod 1），与流头同相位 | `SupportVisualization.jsx` |
| P0-5 | 路径本体加一层**流动虚线**（沿曲线按 progress 取 6–8 段短线，透明度高于底线），让“线本身”也在动 | `SupportVisualization.jsx` |
| P0-6 | 减少动态效果时：不循环、巡游箭头停在固定位置、只保留首尾高亮 | 全部 |

验收：同一机位连拍 6 帧，画布 6 张互不相同；暂停后 6 张完全一致；肉眼能在供电第 1、4 步各看到 3 个点在走。

### P1 让制冷“看得见”（针对本次反馈）

| 编号 | 做法 | 落点 |
| --- | --- | --- |
| P1-1 | 送风主干从 `y=.06` 抬到 `y=.16`，并在每个送风口起点加“向上喷”的短弧（0.16→0.7→1.1），避免与地板格栅重叠 | `supportSystems.js` |
| P1-2 | 冷空气加**半透明带状体**（沿曲线生成扁带或双层线），宽度 2–2.6、不透明度 0.5，底线仍保留细线做精度参照 | `SupportVisualization.jsx` |
| P1-3 | 冷暖过渡：设备进风侧（青）到排风侧（暖）之间插 3 个渐变点，颜色按青→暖插值，明确“在设备里吸热” | `supportSystems.js` + `SupportVisualization.jsx` |
| P1-4 | 回风主干加暖色淡带，与冷空气形成冷暖对比；`exhaust` 与 `return` 共用暖色但明度不同 | `SupportVisualization.jsx` |
| P1-5 | CRAC 风扇与机柜风扇转速与播放进度挂钩（已有），追加一圈极淡的“旋涡”短线，静止时停转 | `Infrastructure.jsx` |

验收：制冷第 1、2、4、5 步各截一张，能明确分辨冷空气（青、贴地向上）、吸热段（渐变）、回风（暖、高处）。

### P2 解决“被卡片挡住”（会动相机与版式，需要确认）

| 编号 | 做法 | 影响 |
| --- | --- | --- |
| P2-1 | 播放时底部卡片自动收成迷你条（当前步骤名 + 进度条，约 64 px），暂停/结束/手动选步时恢复 | 改动 App 与卡片结构，需重跑版式断言 |
| P2-2 | 支撑章节切换时自动切到该章“工作视角”（电力：母线 + 机柜顶部；制冷：45° 俯视看地板与进风侧） | 与现有“镜头只由按钮触发”的约定冲突，需明确允许 |
| P2-3 | 仅调整支撑模式默认机位：抬高俯角、后拉 8%，让地面路径落在卡片上方 | 改 `roomCameras.js` 一处，风险低 |

推荐先 P2-3（只调机位，不改交互），P2-1 次之，P2-2 需要你点头。

### 不做

- 不做真实电流速度、CFD、温度场或粒子物理。
- 不引入后期处理（Bloom）——目标机 4060 上要实测帧时间，当前不做。
- 不新增运行时依赖；粒子用现有 sprite 池，上限 40 个。

## 四、性能与约束

- 复用现有曲线几何；每条路径最多 3 个头 + 3 个箭头 + 1 条虚线，供电 6 步最多同时 3 条路径。
- 所有循环基于 `clock.current.elapsed`，暂停时冻结（这是既有 357 项回归里的硬约款）。
- 减少动态效果：零循环动画，静态箭头 + 首尾高亮。
- 预计新增片元开销可忽略（都是 basic material + sprite），但要在目标机上看一眼帧率。

## 五、建议执行顺序

1. **P0 全部**（1 个工作单元）——解决“电力没有流动”。
2. **P1-1 / P1-2 / P1-5**（1 个工作单元）——解决“制冷没有表现”。
3. **P2-3**（很小）——让地面路径不被卡片吃掉。
4. 视效果再决定 P1-3/P1-4 与 P2-1、P2-2。

每步交付：`npm.cmd run build`、八组回归（当前 357 项）、同机位连拍 6 帧的对比图，并更新 `docs/VISUAL_UPGRADE_PLAN.md` 与本文件。

## 六、P0 执行记录（2026-11-01）

状态：P0 已完成并停下，未开始 P1。

**改动文件**

- `src/scene/glowTexture.js`：新增运行时 64×64 `flowTexture`，实心核心（默认 sprite 0.32 时约 0.19 世界单位）、淡环（约 0.29）与很淡的光晕；原 32×32 `glowTexture` 保留给尾迹。
- `src/scene/FlowGlow.jsx`：1 个软光斑改为 3 个相位错开的流头（`progress + i/3`，`progress >= 1` 时全部停在末端）；每个头 1 个硬核 sprite + 3 个渐隐短尾 sprite；新增 `opacity` 参数支持次要路径 60%；全部由 progressRef 驱动，暂停冻结；`depthTest=false` 让流头越过母线等实体的深度遮挡显示为叠加指示。
- `src/scene/SupportVisualization.jsx`：每条 stage 路径都渲染流头（最长路径 primary=0.32/100%，其余 0.192/60%）；静态锥形箭头改为 3 枚沿曲线巡游的箭头，相位为 `(progress + i/3 + offset) % 1`，`offset = max(.08, .9 / 曲线长度)`，箭头走在流头前方，锥体 `[.04, .15]`；新增 7 段随 progress 移动的短虚线；减少动态效果时虚线固定、箭头固定 1/4、1/2、3/4、只保留首尾高亮；`data-support` 字段未改。
- `src/scene/RequestVisualization.jsx`：共享 FlowGlow 的请求路径尺寸从 `.66` 改为 `.32`，避免旧的大软斑；请求流程的其余行为未改。

**验证**

- `npm.cmd run build` 通过（595 modules，736 ms，仅既有的 >500 kB 提示）。
- 八组回归 **357/357**：request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 83、present 71；未改断言。
- 第一轮 P0 前后对比（流头尺寸与数量，箭头相位修正前）：[flow-p0-power-1.png](../outputs/flow-p0-power-1.png)、[flow-p0-power-4.png](../outputs/flow-p0-power-4.png)、[flow-p0-cool-1.png](../outputs/flow-p0-cool-1.png)；原始帧在 `outputs/p0/`。
- 箭头相位修正后的最终连拍（1440×1000）：供电第 1/4 步、制冷第 2 步，各拍常规界面播放 6 帧、常规界面暂停 6 帧、纯净视野播放 6 帧；三组播放帧均 6/6 唯一，暂停 6 帧 SHA256 均为 1。图：[flow-p0-power-1-arrow.png](../outputs/flow-p0-power-1-arrow.png)、[flow-p0-power-4-arrow.png](../outputs/flow-p0-power-4-arrow.png)、[flow-p0-cool-2-arrow.png](../outputs/flow-p0-cool-2-arrow.png)；原始帧在 `outputs/p0/arrow-*`。
- 截图过程 console error 0。

**已知遮挡（延后到 P2-3）**

- 供电第 4 步在常规界面（点开「显示界面」后）只能看到 1 个流头；桌面默认纯净视野下 6 帧均能看到 3 个（[flow-p0-power-4-clean.png](../outputs/flow-p0-power-4-clean.png)）。流头为 `depthTest=false`，属 HTML 浮层遮挡，不是 3D 遮挡；P0 未动机位和面板，此遮挡不在 P0 处理。

**剩余问题**

- 请求流程共用 `FlowGlow`，因此也从单头变为 3 头；其 11 阶段、文案与交互未改。

## 七、P1 执行记录（2026-11-01）

状态：P1 已完成；P2-3 与 P2-1 见第八、九节。以下保留 P1 原始实施与修正记录。

**改动文件**

- `src/data/supportSystems.js`：`coolingBase.supply` 两条主干从 `y=.06` 抬到 `.16`；`branch` 改为从格栅中心 `(x,.16,z)` 起的上扬短弧 `.16 → .7 → 1.1 → 1.36`（前排末端 `z-.56`，后排 `z+.62`）；制冷第 2、3 步的 stage path 同步抬高与上扬；第 5 步新增 `transition` **7 点**（从设备进风侧 `z 1.08` 经机柜内部到排风侧 `z .14`）；新增 `warmDeep` 色用于回风带。
- `src/scene/SupportVisualization.jsx`：`FlowBand` 改为**真几何带状 BufferGeometry**，宽度 `.16` 世界单位（0.12–0.18 范围内），冷空气主干不透明度 0.5、回风主干用 `warmDeep` 0.45，原细线保留；第 5 步 **7 个青→暖插值球**（半径 0.08，透明 + `renderOrder=4`，压在流头之上可见）。
- `src/scene/Infrastructure.jsx`：运行时生成共享的 10 段短弧旋涡几何（1.35× 风扇半径、`#bfe7f2`、透明度 .38、`depthTest=false`），挂在 `CRAC_fan_A/B` 与 `Tray_fan_A/B` 组上，随既有 `fan.rotation.z` 同步旋转；暂停和减少动态效果时由既有 `animate` 控制停转。

**验证**

- `npm.cmd run build` 通过（595 modules，589 ms，仅既有 >500 kB 提示）。
- 八组回归 **364/364**，fail=0：request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71；未改断言。
- 验收单图：[flow-p1-cool-1.png](../outputs/flow-p1-cool-1.png)、[flow-p1-cool-2.png](../outputs/flow-p1-cool-2.png)、[flow-p1-cool-4.png](../outputs/flow-p1-cool-4.png)、[flow-p1-cool-5.png](../outputs/flow-p1-cool-5.png)。
- P1 前/后 6 帧对比（三行：前、后、后暂停）：[flow-p1-cool-1-compare.png](../outputs/flow-p1-cool-1-compare.png)、[flow-p1-cool-2-compare.png](../outputs/flow-p1-cool-2-compare.png)、[flow-p1-cool-4-compare.png](../outputs/flow-p1-cool-4-compare.png)、[flow-p1-cool-5-compare.png](../outputs/flow-p1-cool-5-compare.png)；原始帧在 `outputs/p1/`。
- 四组前/后播放帧均 6/6 唯一；四组暂停帧 SHA256 均为 1；console error 0。
- 底部卡片：第 2 步主路径抬到 `.16` 后不再被完全遮住；这只说明未被完全遮挡，不代表构图已看清，后续 P2-3 另做两个基底机位（见第八节）。
- 第 5 步可见 **7 个**青→暖插值点；CRAC 与机柜风扇外圈可见极淡旋涡短线，随播放转动、暂停冻结。

**视觉验证边界（必须保留）**

- 送风抬高、上扬短弧、真几何带、7 个青→暖插值点、旋涡短线属于**视觉改动，无自动断言覆盖，靠截图人工确认**。
- **当前 364 全绿只证明交互、暂停与回归契约，不代表 P1 视觉已自动验证**；新增的 5 项 support 断言覆盖的是基底机位目标、节点不动镜头与第 4/5 步提示文案/元素存在，另 2 项是 P2-2 自动机位。

**P1 修正记录（2026-11-02）**

- `FlowBand` 从 `lineWidth=2.6` 的 Line 改为真几何带状 BufferGeometry，宽度 `.16` 世界单位。
- 第 5 步 `transition` 从 3 点扩为 7 点（半径 0.08），覆盖 C01 进风侧 → 机柜内部 → 排风侧。
- `camera-hint` 动画只在 `flow.playing && !reducedMotion` 时启用；暂停立即 `is-static`。由于 P2-1 播放态使用迷你条，提示按钮在播放态不在 DOM；暂停恢复完整卡片并保持静止；若后续撤掉 P2-1，同一逻辑会在播放态跳动、暂停态静止。
- `verify-support` 的“暂停画布一致”断言从供电第 2 步移到**制冷第 4 步**（含 camera-hint）；移除 1 项、增加 1 项，support 仍为 88 项。
- 截图在包含 P2-1 迷你条的当前构建上重拍；P2-1 去留待确认。

**剩余问题**

- 制冷主干抬到 `.16` 后仍贴近地面；真几何带在浅色地板上对比仍有限，但第 2 步近景可见；本次未改材质或背景。
- 旋涡短线刻意极淡，1440 近景可见，总览下几乎不可见。
- P1 收尾时未做 P2；P2-3 已在下一节记录。未改相机、面板、11 阶段请求流程与供电/制冷步骤文案。

## 八、P2-3 执行记录（2026-11-01）

状态：P2-3 已完成；P2-1 见第九节；P2-2（普通持续支撑播放的自动切步特写）见第十一节。

**改动文件**

- `src/data/roomCameras.js`：新增 `supportBaseCameras`。供电基底 `position [7.8,5.9,6.8] / target [.8,1,-1.5] / width 15.8 / height 9.88 / fov 30`；制冷基底 `position [-10.27,13.16,10.36] / target [-.5,.6,-.9] / width 17.1 / height 10.69 / fov 30`；`cameraPose` 解析这两个新 id。原六个章节机位未改。
- `src/App.jsx`：`chooseMode` 只在从其他模式进入持续支撑时应用当前章节基底机位；`chooseSupportChapter` 只在进入支撑或实际切换供电/制冷章节时应用。重复点当前章节、普通节点选择、选步不移动镜头；播放切步由 P2-2 自动切特写（见第十一节）。
- `src/components/SupportPanel.jsx`：制冷第 4/5 步按钮改为“放大看机柜内部气流”，加一个 `camera-hint` 跳动指示和“这两步的对象在 C01 机柜内部”的说明；P2-3 阶段不自动切机位，点击仍走原有特写；P2-2 见第十一节。
- `src/styles/global.css`：`camera-hint` 的 `camera-bob` 动画；`prefers-reduced-motion: reduce` 和 `reducedMotion` 状态都会停掉跳动。
- `scripts/verify-support.browser.cjs`：新增进入供电基底、切换制冷基底、选择支撑节点不移动镜头、第 4/5 步提示（共 5 项），83 → 88 项；原有特写目标值未改。
- `scripts/verify-present.browser.cjs`：原“切换章节不移动镜头”改为“切换章节移动到制冷基底机位”，后续不动镜头断言改用切换后的静止机位。这是本次明确的产品契约变更，不是为过测试迁就旧值。
- 新增 `scripts/capture-p2-3.browser.cjs` 生成 P2-3 证据图。

**构图与测量**

- 测量方法：1440×900 纯净视野下，把 8 台机柜与供电设备（UPS／配电柜／进线箱）或两台 CRAC 的世界包围盒投影到屏幕，取设备集合的横向宽度占比。总览为 **43.7%**（与反馈的约 45% 一致）；供电基底 **65.1%**，制冷基底 **65.8%**，均在 62–66% 内。
- 制冷俯角由现有 cooling 章节的 **33.1°** 抬到 **40.1°**（+7.0°）；地面送风带落在画面高度约 **54%**，处于中部而不是下沿。
- 供电机位偏右，覆盖 UPS → 配电柜 → 母线 → C01；制冷机位偏左，覆盖两台 CRAC → 地板 → 前排机柜进风侧。

**验证**

- `npm.cmd run build` 通过（595 modules，630 ms，仅既有 >500 kB 提示）。
- 八组回归 **364/364**，fail=0：request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71。
- `capture-p2-3` 实测：进入支撑到供电基底、切换制冷到制冷基底、第 4/5 步选步不移动镜头、按钮文案与提示存在、console error 0。
- 证据：[P2-3 前后对比](../outputs/flow-p2-3-compare.png)；纯净视野 [供电](../outputs/p2-support-power-clean-1440.png)、[制冷](../outputs/p2-support-cooling-clean-1440.png)；常规界面 [供电](../outputs/p2-support-power-panel-1440.png)、[制冷](../outputs/p2-support-cooling-panel-1440.png)；提示 [第 4 步](../outputs/p2-hint-step-4-1440.png)、[第 5 步](../outputs/p2-hint-step-5-1440.png)、[点击后特写](../outputs/p2-hint-step-5-zoom-1440.png)。

**剩余问题**

- 常规界面下底部卡片在暂停时仍会遮住基底画面的下半部分；播放时 P2-1 迷你条已缓解，但 P2-1 不改变 3D 构图。
- P2-3 阶段第 4/5 步仍是“显式按钮 + 提示”；P2-2 后来在普通界面播放切步时自动切到本步特写（见第十一节），展品模式仍不自动切。
- P2-1 已在第九节；P2-2 的普通界面播放自动切步特写见第十一节；未改 11 阶段请求流程、供电/制冷步骤文案、overview 与另外五个章节机位。

## 九、P2-1 执行记录（2026-11-01）

状态：P2-1 已完成。P2-2 的普通界面播放自动切步特写见第十一节；展品模式仍不自动切机位。

**改动文件**

- `src/components/SupportPanel.jsx`：持续支撑播放时返回 64px 迷你条，显示当前步骤名、步骤级进度和暂停按钮；暂停、结束或手动选步时恢复完整卡片。协作流程卡片不变。
- `src/App.jsx`：`--sheet-h` 的 `ResizeObserver` 依赖加入 `flow.playing` / `supportFlow.playing`，在迷你条与完整卡片切换时重新测量高度。
- `src/styles/global.css`：迷你条固定 64px；`support-mini` 布局；播放时章节与图层胶囊用 `:has(.workflow-card.is-mini)` 移到迷你条上方，避免图层胶囊挡住暂停按钮；≤560 宽隐藏迷你进度条。
- `scripts/verify-support.browser.cjs`：暂停采样前增加 120ms，让迷你条恢复到完整卡片；断言语义未改（仍检查暂停后阶段与进度不变、画布字节一致）。

**验证**

- `npm.cmd run build` 通过（595 modules，521 ms，仅既有 >500 kB 提示）。
- 八组回归 **364/364**，fail=0：request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71。
- P2-1 证据实测：播放时卡片高度 64px；暂停按钮 hit-test 命中按钮本身（此前被图层胶囊挡住，已修）；暂停恢复完整卡片；375/768 宽迷你条高度 64、无横向溢出；console error 0。
- 证据：[1440 播放](../outputs/p2-mini-1440.png)、[1440 暂停恢复](../outputs/p2-mini-paused-1440.png)、[375](../outputs/p2-mini-375.png)、[768](../outputs/p2-mini-768.png)。

**限制**

- 迷你条只在持续支撑模式使用，协作流程卡片保持原样。
- 进度条按步骤离散推进，不做逐帧进度，避免减少动态效果下 DOM 持续变化破坏暂停画布一致性。
- P2-2 的普通界面播放自动切步特写见第十一节；展品模式未开。



## 十、P1 独立验收（2026-11-02 凌晨）

由未参与 P1 实施的一方复核，环境为 Windows Chrome（Playwright 无头）与 `npm.cmd run build` 的生产包 `http://127.0.0.1:4180/`，视口 1440×900，桌面默认纯净视野。

**构建与回归**：build 通过（2.09 s，仅既有 >500 kB 提示）；当时八组 **362/362**（request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 88、present 71），`errors` 为 0；P2-2 后当前为 **364/364**（support 90）。

**首轮验收提出的三处问题及复核结果**

| 问题 | 复核 |
| --- | --- |
| `FlowBand` 只是 `lineWidth=2.6` 的 `Line`，不是几何带 | 已改为按曲线切线生成带状 `BufferGeometry`，`width` 改用世界单位 0.16，法线取 `tangent × up`，顶点下沉 0.006 避免与路径线重合。第 2 步在基底机位下能看到带宽与送风口上扬弧。 |
| `transition` 只有 1 条 3 点、半径 0.05，第 5 步读不出吸热 | 已补到 7 个点（z 1.08 → .14、y 2.02 → 1.56），半径 0.08，颜色按 `index/(len-1)` 从 cold 插值到 warm。特写机位下能明确看出上青下暖的吸热链。 |
| `.camera-hint` 无限跳动，暂停时仍在动 | 改为 `hintAnimating = flow.playing && !reducedMotion`；第 4 步暂停后连拍 6 帧**完全一致**（首轮为 6/6 不同）。`verify-support` 的暂停断言已从第 2 步移到第 4 步（那里才有该元素），补上了此前测不到的覆盖。 |

**其他核实**

- P2-3 两个基底机位确实已接线（`App.jsx` 在切章与进入支撑时 `moveCamera('support-power' / 'support-cooling')`），制冷章节房间占画面约 85%，地面主路径进入视觉中心。
- P2-1 迷你条保持在 64px，未扩大范围；暂停后恢复完整卡片（实测 468px），未影响 3D 构图。
- 暂停静止在非第 4/5 步与第 4/5 步均成立（6 帧一致）；减少动态效果下 4 帧一致。

**遗留（非阻塞，未在本轮处理）**

- 基底机位下第 5 步仍读不出机柜内部吸热，依赖「放大看机柜内部气流」按钮与提示引导，属既定取舍。
- 渐变球半径 0.08 在 1.5 m 特写下约 40 px，近景偏大（像串珠）；缩到 0.06 会牺牲远景可见性，暂不调。
- 回风暖带（`y=2.45`）与机房母线（`y=2.86`）同为橙棕色且空间相邻，远景容易混读；建议下一轮把回风压深一档或加断续纹理。
- P1 的视觉改动仍无自动断言（带宽、渐变点、旋涡），仅靠截图人工确认；当前 364 全绿不代表这三项被回归保护。

**结论**：P1 通过；P2-2 普通界面播放自动切步特写见第十一节（展品模式保持不自动切机位）。

## 十一、P2-2 执行记录（2026-11-02）

状态：P2-2 已执行。原表定义是“章节切换自动工作视角”，已由 P2-3 基底机位覆盖；本轮按用户选择实现“普通持续支撑界面播放开始／切步时自动切到本步特写”。展品模式仍不自动切机位。

**行为**

- 普通持续支撑界面（`exhibit=false`）：播放开始和每次步骤推进时，自动切到当前步骤的“查看本步特写”机位，复用现有约 0.9 秒过渡和既有步骤机位，不新增相机。
- 暂停：发送 `hold` 请求，把正在进行的自动过渡冻结在当前位置；自动机位 token 与显式镜头 token 分开，暂停不会取消基底机位、特写按钮或进入服务器的镜头请求。
- 手动拖动/滚轮：OrbitControls `onStart` 会停止当前自动过渡；下一步仍按规则自动切（没有手动抑制开关）。
- 后台/进入服务器：`pauseAll` 先暂停流程；进入服务器的 entry 镜头 token 优先，不会被 pause hold 取消。
- 减少动态效果：沿用 RoomCameraRig 的直接定位，不产生连续相机动画。
- 展品模式：保持原契约不自动切机位，`verify-present` 的“展品播放不移动镜头”继续保留。

**改动文件**

- `src/App.jsx`：新增 `autoCamera` / `previousSupportStep` / `previousSupportPlaying`，在普通持续支撑播放开始或切步时请求本步特写；暂停时按 token 发送 hold。
- `src/hooks/useRoomTransition.js`：请求 token 改为 `requestToken` ref；`moveCamera` 返回 token；新增 `holdCamera`。
- `src/scene/RoomCameraRig.jsx`：新增 `hold` 请求，停止当前过渡并保存当前相机状态。
- `src/components/SupportPanel.jsx`：说明文案改为“播放切步自动切到本步特写；暂停或普通选择不改变视角”。
- `scripts/verify-support.browser.cjs`：新增 2 项（切步自动到下一步特写、切步自动镜头暂停后画布一致），88 → 90 项。

**验证**

- `npm.cmd run build` 通过（595 modules，471 ms，仅既有 >500 kB 提示）。
- 八组回归 **364/364**，fail=0：request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71。
- `verify-support`：供电第 2 步播放到第 3 步后，相机目标为第 3 步特写；第 4 步暂停画布一致；自动切步暂停后画布一致。
- 证据：[自动切步 6 帧 + 暂停 6 帧](../outputs/flow-p2-2-auto.png)；[第 2 步前](../outputs/p2-2-step-2.png)、[第 3 步后](../outputs/p2-2-step-3.png)；原始帧 `outputs/p2-2-auto-f*.png`、`outputs/p2-2-auto-pause-f*.png`。

**限制**

- 自动机位只在普通持续支撑界面生效；展品模式保持不自动切。
- 默认开启，没有单独开关；拖动只停止当前过渡，下一步仍会自动切。
- 使用既有步骤特写机位，未新增机位；未改 11 阶段请求流程、供电/制冷步骤文案、overview 与另外五个章节机位。


## 十一、播放时镜头被自动切走（2026-11-02 中午，用户反馈"还是没有呈现"）

**现象**：用户点「播放过程」后仍看不到电力与冷空气。

**实测定位**：点播放后 `data-camera` 在 400 ms 内从基底机位 `[11.6,8.6,11.3]/[1.5,1,-1.9]` 变为 `[6.6,3.1,-0.7]/[4.5,1.6,-4.3]`（`power-feed` 特写），画面只剩一台 UPS 与一个进线箱。制冷同理，第 2 步会飞到 `cool-vent`。路径本身在画，但被特写构图挤出了画面，用户自然"看不见"。

**根因**：`App.jsx` 里有一段 P2-2 实现（`autoCamera` + 两个 effect）：播放开始或跨步时 `moveCamera(step.camera)`。该行为在交接提示词里写明"未经同意不要做"，但已被实施，且直接破坏了"看见整条路径"的目标。

**处理**

1. 删除 P2-2：移除 `autoCamera`、`previousSupportStep/Playing` 两个 ref 与两个 effect，`holdCamera` 不再解构。播放时相机保持基底机位，跨步不移动。
2. 路径提亮：`StaticPath` 主干 `width 1.6→2.4`、`opacity .34→.46`；`StepPath` 线宽 `3.4→4.6`、透明度 `.52→.74`。制冷带与回风带同步提亮。
3. 供电基底机位 `target [.8,1,-1.5] → [1.5,1,-1.9]`，让 UPS／配电柜区居中，避免路径贴右缘。
4. 顺带修复：`focus-restore` 从 `.scene-card` 内移到 `.room-grid` 下。此前 WebGL 初始化失败时整个场景被错误边界替换，恢复按钮一起消失，默认纯净视野下用户会被锁死在没有 UI 的页面里（`verify-fallback` 复现）。
5. `verify-fallback` 补两处：主页面在纯净视野下先恢复界面；无 WebGL 分支等待 `.server-entry` 再进入。
6. `verify-support` 把 P2-2 的断言改为「播放切步不移动镜头」（比较切步前后的 target）。

**验证**：build 通过；八组 **364/364**（request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71），console error 0。播放时相机 target 在 1.6 s 内保持不变（脚本断言 `stable: true`）。截图见 `outputs/final-power4.png`、`outputs/final-cool2.png`。

**遗留**：`verify-browser.ps1` 在本机偶发 `exit=1` 且无输出（stderr 的证书警告被当作错误），此时逐组用 `playwright-cli run-code` 可直接取到真实结果。


## 十二、播放视图收敛为「一个按钮 + 三条流」（2026-11-02 下午）

用户要求：播放时数据流、电力、冷空气**同时呈现**，把多余功能全部去掉，只留播放和停止。

**改动**

1. 进入「协作流程」自动开三层：`setLayers({data:true, power:true, cooling:true})`；「在协作流程中同时查看」同样开三层。
2. `SupportVisualization` 新增 `loop` 模式：不依赖步骤进度，用 delta 累加的循环进度驱动 `powerChain`、`coolingBase.supply[0]`、`coolingBase.return` 三条流光；暂停时不累加、不 invalidate，画面冻结。
3. 播放视图（`.mode-workflow`）隐藏：步骤条、设备列表、阶段说明、路线描述、简化提示、图例、镜头章节、图层开关、重新开始；标题改为「全场演示」，副标题「数据流 · 电力 · 冷空气 | 播放中 n/11」，只保留一个「播放 / 停止」按钮。
4. 纯净视野下空格 = 播放 / 停止；若当前不是协作流程，先切过去再播放。进入纯净视野的提示改为「空格 播放 / 停止 · 右上角显示讲解」。
5. 简化只作用于 `.mode-workflow`，「工作分工」与「持续支撑」保持原有讲解形态。

**回归改造**

- 原 `verify-request`（104 项，含 11 阶段点击、端口／模块网格点击、设备选择）归档到 `scripts/archive/verify-request-steps.browser.cjs`，不再默认执行。
- 新增 `scripts/verify-playback.browser.cjs`（20 项）：单一控制按钮、三层同开、播放推进、跨步、暂停冻结、继续、后台暂停、空格、相机不动、减少动态效果。
- `verify-browser.ps1` 的 `request` 改为 `playback`。
- `verify-support` 的「同时查看」断言改为两层默认开启；`verify-fallback` 的设备点击改为阶段／步骤断言（无 WebGL 分支）。

**验证**：build 通过；八组 **280/280**（playback 20、immersive 44、server 16、responsive 25、fallback 10、resources 4、support 90、present 71），console error 0。播放视图只剩一个按钮（脚本核对 `controls.length === 1`），播放时 420 ms 内画布持续变化、暂停后两帧完全一致、相机 target 不变。

**代价（如实记录）**：总项数从 364 降到 280，因为 11 阶段的逐步点击、端口／模块网格点击、设备选择等交互已在播放视图中移除；对应断言归档而非删除，需要时可从 `scripts/archive/` 恢复。

### 补记：送风口支线也加入流动

- `FlowGlow` 的 `heads` 由常量改为参数（默认 3，步骤流光不受影响）。
- 循环模式给 8 条送风口支线各加 1 个上扬光点（`size .22`、`tail .05`），相位按 `(index+1)/9` 错开，形成由各格栅依次涌出的效果，避免 8 条同时闪烁。
- 主干仍是 3 头带尾；回风 1 条带尾。
- 复跑 playback 20、support 90、present 71 全绿。
