> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

> **历史存档**：本文件是某一阶段的任务提示词存档。其中“不引入虚构数值、仪表盘或实时数据”的约束已被 2026-11-03 的口径变更取代——现行约定允许显示读数，但每处必须标注为模拟。现行口径见 `README.md` 的“范围限制”与 `docs/TWIN_UPGRADE_REVIEW.md` 的决策记录。

# 流动表现优化 · 新对话提示词

用途：把「播放时电力没有流动、制冷没有表现」这件事交给另一个对话继续做。文档自包含，新对话不需要本对话的上下文。

对应方案：`docs/FLOW_VISUAL_PLAN.md`（先读再动手）。

---

## 附录 A：开场提示词（先贴这段）

```
工作目录 D:\CodexProjects\PCAssemblyLab：Vite + React 19 + three.js 的数据中心三维教学展品。
先只读不写，按顺序读：README.md、docs/FLOW_VISUAL_PLAN.md、docs/VISUAL_UPGRADE_PLAN.md、docs/SUPPORT_VALIDATION.md，以及
src/scene/SupportVisualization.jsx、src/scene/FlowGlow.jsx、src/scene/Infrastructure.jsx、src/scene/glowTexture.js、
src/data/supportSystems.js、src/App.jsx、src/styles/global.css（只看末尾 @media (min-width: 901px) 的几段）。

读完用不超过 15 行复述：4 个展示模式、11 阶段请求流程、供电 6 步／制冷 7 步、默认纯净视野的行为、
data-camera／data-flow／data-support 三个诊断契约、八组回归脚本与当前总通过项数（357 项）、
以及 docs/FLOW_VISUAL_PLAN.md 判断的 4 条根因。与仓库实际代码不一致时先指出来，不要直接照抄文档。

然后只执行附录 B 的 P0，做完立刻停下等我确认，不要顺手做 P1。

硬约束（每一步都适用）：
1. 不改 11 阶段请求流程、供电 6 步／制冷 7 步的步骤划分、文案口径与简化说明；不引入虚构数值、仪表盘或实时数据。
2. 暂停时两次画布截图必须完全一致；减少动态效果（prefers-reduced-motion）下不得有连续动画；结束不自动循环。
3. 窄屏（375/768）无横向溢出；键盘可完成主要操作。
4. 桌面默认是「纯净视野」：focus=true 时所有浮层 display:none。任何新写的测试或截图脚本，打开页面后必须先点一次「显示界面」再找面板。
5. 除方案明确允许，不新增运行时依赖、不引入外部贴图或模型；粒子用现有 sprite，最多 40 个。
6. 支撑演示的相机只在明确操作时移动；除非我单独同意，不做「播放时自动切机位」。

环境：开发服务 npm.cmd run dev -- --port 5173；生产预览 npm.cmd run preview -- --port 4180；
回归 npm.cmd run verify:browser -- -Url http://127.0.0.1:4180/（需要 playwright-cli 与本机 Chrome）。
每步交付必须包含：改了哪些文件、build 结果、八组回归项数、同机位连拍 6 帧的前后对比图路径。
```

---

## 附录 B：P0 让流动持续可读（第一步，必须先做）

```
项目 D:\CodexProjects\PCAssemblyLab，按 docs/FLOW_VISUAL_PLAN.md 的 P0 实施，只改视觉，不动交互与文案。

背景：实测播放时画布每帧都在变（连拍 4 帧全不相同），暂停也能冻结，所以不是没动画，而是看不出流动。
根因：①一条路径只有 1 个流头、5.6 秒走完即停；②只有最长路径 showMarker={path === primary} 有流头；
③FlowGlow size=.7 的软边贴图近景下像一团雾；④静态锥形箭头不参与播放。

1) src/scene/FlowGlow.jsx
   - 由 1 个流头改为 3 个相位错开的流头：head i 的取点为 (progress + i/3) mod 1，i = 0,1,2。
     末尾若 progress >= 1，则三个头都停在末端，不要绕回起点。
   - 头改为小而实：核心实心圆 0.16–0.2 世界单位、外圈 0.3 的淡环、后方 3 段渐隐短尾（不要再用 0.7 的大软光斑）。
     圆环与核心都用现有 glowTexture 或新增一张边缘更硬的贴图，颜色饱和度提高，toneMapped={false} 保持。
   - 仍然全部由 progressRef 驱动，不得自己读 Date/performance；暂停时位置必须冻结。

2) src/scene/SupportVisualization.jsx 的 StepPath
   - 去掉只有 primary 才显示流头的判断，改为每条 stage 路径都渲染流头；按路径长度排序，次要路径流头 0.6 倍大小、60% 不透明度。
   - 把静态锥形箭头改成沿线巡游：每个箭头位置 = (progress + i/3) mod 1 处的 curve.getPoint，朝向用切线；
     每路径 3 个，和流头同相位，这样在任何相机距离都能看出方向。
   - 路径本体加一层"流动虚线"：按 progress 取 6–8 段等长短线，透明度高于底线，让线本身也在动。
   - reducedMotion 为 true 时：不循环、箭头固定在 1/4、1/2、3/4，只保留首尾高亮。

3) 保持：data-support 的字段与含义不变（chapter/step/progress/active/nodes/persistent/visible）；
   暂停后画布像素完全一致；步骤结束停在终点，不反向、不自动循环。

验收：
- npm.cmd run build 通过；
- 八组回归全绿（当前 357 项；pause 断言若偶发失败，先确认是采样窗口问题，不要改断言语义）；
- 供电第 1 步与第 4 步各连拍 6 帧，6 张互不相同；暂停后连拍 6 帧完全一致；
- 截图存 outputs/flow-p0-power-1.png、flow-p0-power-4.png、flow-p0-cool-1.png；
- 在 docs/FLOW_VISUAL_PLAN.md 末尾追加"P0 执行记录"：改了什么、实测数据、剩余问题。
```

---

## 附录 C：P1 让制冷看得见（P0 通过后再发）

```
项目 D:\CodexProjects\PCAssemblyLab，接 P0，按 docs/FLOW_VISUAL_PLAN.md 的 P1-1 / P1-2 / P1-5 实施。
只改制冷路径的几何与呈现，不改步骤文案，不改供电。

1) src/data/supportSystems.js
   - coolingBase.supply 两条主干从 y=.06 抬到 y=.16，末端仍指向送风口；
   - 每个送风口的 branch 起点改为从格栅中心 (x,.16,z) 起，插一段"向上喷"的短弧：.16 → .7 → 1.1 → 1.36，
     不要与地板格栅重叠（原来贴地那一段正是被地板盖住、看不见的原因）。
2) src/scene/SupportVisualization.jsx
   - 冷空气主干加一层半透明带状体（沿曲线生成扁平带或双线），宽 2–2.6、不透明度 0.5，保留原细线做精度参照；
   - 回风（coolingBase.return）同样加一层暖色淡带，与冷空气形成冷暖对比，明度低于 exhaust；
   - 设备进风侧到排风侧插 3 个青→暖的插值点，明确"在设备里吸热"，不要做成真实温度场。
3) src/scene/Infrastructure.jsx
   - CRAC 风扇与机柜风扇的转速继续与播放挂钩（已有 spin/animate 参数），补充一圈极淡的旋涡短线；
     减少动态效果时必须停转，暂停时保持在当前角度。
4) 约束：不得让路径穿过实体机柜；带状体不得遮挡机柜正面可点选的部件；新增几何复用现有材质缓存。

验收：
- build 通过、八组回归全绿；
- 制冷第 1、2、4、5 步各截一张（outputs/flow-p1-cool-{1,2,4,5}.png），能明确分辨：青色冷空气贴地→上扬、
  设备内青转暖、高处暖色回风；
- 确认底部卡片不遮挡地面主路径（若仍遮挡，见附录 D）；
- 更新 docs/FLOW_VISUAL_PLAN.md 的 P1 执行记录。
```

---

## 附录 D：P2-3 让地面路径不被卡片吃掉（可选，风险最低）

```
项目 D:\CodexProjects\PCAssemblyLab。只做 P2-3：给「持续支撑」一个专门的基底机位，其他模式概不改变。
1) src/data/roomCameras.js 新增 supportBase（俯角略抬、距离后拉约 8%），使地面送风路径落在底部卡片上方；
2) 只在从其他模式切到「持续支撑」时应用一次；该模式下普通设备选择仍然不移动镜头；
3) 不改 overview 与另外五章机位；
4) verify-support 里若有机位目标点断言，按新值同步，不得为了过测试迁就旧数值。

验收：1440×900 与 1280×800 各一张截图，地面主路径完整可见、不被卡片覆盖；八组回归全绿。

注意：P2-1（播放时卡片收成迷你条）与 P2-2（播放时自动切章节机位）会改变现有交互约定，未经我同意不要做。
```

---

## 附录 E：环境与已知陷阱（贴给新对话，避免重复踩坑）

- **默认纯净视野**：`focus` 初值 = `matchMedia('(min-width: 901px)')`。桌面打开页面时所有浮层隐藏，只有右上角「显示界面」胶囊。写脚本先 `page.getByRole('button',{name:'显示界面',exact:true}).click()`。
- **卡片高度是活的**：`.workflow-card` 为 `height:auto` + `max-height`，由 `ResizeObserver` 把实测高度写回 `--sheet-h`，章节与图层胶囊靠它定位。修改卡片内容后要重新看胶囊有没有压住标题。
- **卡片是 CSS grid**：业务模式 `head/steps/stage+devices/strip/note`，支撑模式 `head/tabs/steps/legend+devices/stage/note`，≤1240 宽另有一套。**新增子元素必须给 grid-area**，否则会自动放置并挤出隐式列（曾导致内容高度涨到 3590px）。
- **步骤条**：业务 11 阶段是 `repeat(11,1fr)` 单行，支撑 7 步单行。改宽度前先确认卡片高度不会涨到遮住三维投影点（曾导致"点击文件模块"失败）。
- **暂停采样**：`verify-support` 里暂停比图的等待是 320ms，小于这个值会把暂停后的一次重绘算进窗口，导致偶发失败。
- **相机**：`RoomCameraRig` 的 fit 是 `min(视口宽/pose.width, 视口高/pose.height)`，桌面被 height 卡住；只改 width 不会改变构图。
- **诊断契约**：`data-camera`、`data-flow`、`data-support` 三个 dataset 是回归断言的基础，字段不要改名。
- 构建仍有 `THREE.Clock` 弃用警告与三维包 >500 kB 提示，属既有问题。

---

## 附录 F：每轮怎么发

1. 贴附录 A 开场 → 它复述 + 做 P0 → 你确认连拍图与回归数。
2. 通过就说「通过，继续 P1」，只发附录 C。
3. 不通过用下面格式：

```
P0 未通过：<具体现象，例如暂停后 6 帧里有 2 帧不同 / 供电第 4 步看不到流头>。
期望：<期望结果>。
请只修 <具体文件或范围>，不要顺手改 P1 的内容；修完给出 build 结果、八组回归项数与连拍图。
```

4. 只看四件事：连拍 6 帧是否真的在动、暂停后是否完全静止、控制台是否 0 error、八组是否 357 项全绿。
