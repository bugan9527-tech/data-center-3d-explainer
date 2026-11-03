> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

> **历史存档**：本文件是某一阶段的任务提示词存档。其中“不引入虚构数值、仪表盘或实时数据”的约束已被 2026-11-03 的口径变更取代——现行约定允许显示读数，但每处必须标注为模拟。现行口径见 `README.md` 的“范围限制”与 `docs/TWIN_UPGRADE_REVIEW.md` 的决策记录。

# 视觉优化执行步骤与提示词

配套文档：[视觉与镜头优化方案](VISUAL_UPGRADE_PLAN.md)。本文把方案拆成可独立执行的步骤，每一步给出可直接复制的提示词。

## 使用方式

1. 按顺序做，做完一步先跑一次回归，再进下一步；相机与光照互相影响，跳步会让截图对照失真。
2. 每次开工前先启动服务：`npm.cmd run dev -- --port 5173`，回归命令 `npm.cmd run verify:browser -- -Url http://127.0.0.1:5173/`。
3. 每步都要留一张同机位的前后对照截图到 `outputs/`，下一步的提示词会引用它。
4. 提示词默认包含本项目已确立的硬约束：11 阶段请求流程、供电 6 步／制冷 7 步与文案口径不变；不引入虚构数值；暂停时画布必须完全一致；减少动态效果时不出现连续动画；窄屏无横向溢出；键盘可操作。

## 步骤总览

| 步骤 | 内容 | 依赖 | 预期产出 |
| --- | --- | --- | --- |
| S0 | 建立改造前基线截图 | 无 | `outputs/before-*.png` |
| S1 | 光照与色调 | S0 | 明暗对比与纵深 |
| S2 | 背景、雾与地面淡出 | S1 | 沙盘式无边场景 |
| S3 | 基座与右前空地道具 | S2 | 无死白区域的展品台 |
| S4 | 总览构图收紧 | S3 | 主体占比提升 |
| S5 | 正交改透视 | S1–S4 | 近大远小，机内镜头可用 |
| S6 | 五个机内／功能机位 | S5 | 可进入场景的讲解视角 |
| S7 | 弧线运镜与时长 | S5 | 更像运镜的切换 |
| S8 | 流光路径 | S7 | 当前步骤的流动光 |
| S9 | 展品模式叠加层 | S8 | 边角玻璃卡布局 |
| S10 | 对照复核与文档 | S1–S9 | 前后对照与验收记录 |
| 可选 | 相机微移、自动导览、后处理 | S10 | 见文末 |

---

## S0 建立改造前基线

先固定“改之前长什么样”，否则后面无法判断是变好还是变差。

```
项目 D:\CodexProjects\PCAssemblyLab。先不要改任何源码。
1) 启动 npm.cmd run dev -- --port 5173。
2) 用 playwright-cli 打开页面，在 1440×1000 下依次截取：机房总览、网络设备、计算服务器、存储设备、UPS 与配电、制冷设备六个章节镜头，以及「持续支撑」供电第 1/5 步、制冷第 1/5 步，共 10 张，存到 outputs/before-<镜头名>.png。
3) 再在 375×812 下各截一张总览与供电章节，存为 outputs/before-375-*.png。
4) 记录每张的相机 data-camera 与页面上出现的说明文字，写入 outputs/before-baseline.json。
不改源码，不新增依赖。
```

## S1 光照与色调

```
项目 D:\CodexProjects\PCAssemblyLab，只改 src/scene/DataCenterViewport.jsx 的光照与渲染参数，不改几何、路径、文案。
1) 主光 intensity 3 → 2.7，位置改到 [6,13,9]，shadow camera 收紧到 ±8，shadow-normalBias 保持 .035。
2) ambientLight 1.2 → 0.55，hemisphereLight 1.1 → 0.5，保留一盏冷色方向光作为轮廓光，intensity 0.9。
3) 显式设置 renderer 色调映射为 ACESFilmic、曝光 1.02，并在 gl 参数里声明，避免版本默认值差异。
4) 复核节点高亮：src/scene/Infrastructure.jsx 的 emissiveIntensity 若在新环境下过亮或看不清，调到能分辨即可，不要超过 0.3。
约束：不得改动相机、路径、图层开关；暂停时画布必须完全一致；减少动态效果下无连续动画。
验收：npm.cmd run build 通过；npm.cmd run verify:browser -- -Url http://127.0.0.1:5173/ 全绿；在六个章节镜头同机位重拍截图存为 outputs/after-light-*.png，并与 before 对比说明变化。
```

## S2 背景、雾与地面淡出

```
项目 D:\CodexProjects\PCAssemblyLab。在上一步的光照基础上处理背景与地面边缘。
1) Canvas 背景改为可透出 CSS 渐变：给 .viewport 加纵向渐变（顶部 #eef3f7 → 底部 #dfe8ee），Canvas 设 alpha:true 并移除 <color attach="background">。
2) 场景 fog 使用与渐变中段一致的颜色，near/far 调到只让远端机柜轻微淡出，不影响主体可读性。
3) 地板改为径向 alpha 淡出：运行时用 canvas 生成 64×64 径向渐变贴图作为 alphaMap，不引入外部图片；边缘淡出范围只作用于地板外沿约 0.8 单位。
4) 房间两面墙保留，但材质略降饱和度，避免与背景抢对比。
约束：不新增依赖、不加外部贴图；不得改变几何位置与锚点；窄屏与减少动态效果行为不变。
验收：build 通过、全量回归全绿；重拍 outputs/after-bg-*.png，确认四周无硬切边且地板仍能看清通道与送风口。
```

## S3 基座与右前空地

```
项目 D:\CodexProjects\PCAssemblyLab。为场景加“展品台”，并补齐右前空地，消除大片空白地板。
1) 基座不要外扩。用与地板同轮廓、内收 0.1、向下 0.12 的深色板（颜色比顶板暗两档），并且必须复用 src/scene/floorFade.js 的同一套世界坐标衰减（onBeforeCompile + floorFade 贴图），band 取 6–7（约 1.1 世界单位），让它在淡出带之前就消失。外扩会越过淡出带，必然把硬边带回来。
2) 删除 Floor 里 y≈-0.63 的 8 条地脚支腿：基座接管“托住地板”的语义，支腿会与基座穿插，且在淡出带里几乎不可见。
3) 右前空地补道具：一组备件柜/托盘、一个检修推车、地面通道标线（细长盒），以及“冷通道 / 热通道”地贴文字。文字用 SceneHtml 贴地标签实现，窄屏（≤900）隐藏文字只留标线。
4) 淡出带内任何新几何（基座、推车、标线）都必须共用同一张世界坐标衰减贴图；道具要么整体在淡出带以内，要么整体在带外，不允许一半踩在带上。
5) 所有道具必须避开请求锚点与功能节点：不得遮挡 data-flow-pick-projections 里的 A 端口与文件模块。
6) 复用现有 Box 组件与材质，控制三角形数量，不新增 GLB。
约束：不改机柜、设备模型与路径；不给道具加可点击语义（避免与设备选择混淆）。
验收：build 与全量回归全绿；检查 verify-request 里“点击实际 A 端口/文件模块”两项仍通过；截图 outputs/after-base-*.png。
```

## S4 总览构图收紧

```
项目 D:\CodexProjects\PCAssemblyLab，只改 src/data/roomCameras.js 的 overview 机位。
1) 先看清取景规则：RoomCameraRig 的 fit = min(视口宽/pose.width, 视口高/pose.height)。桌面端和横屏端实际是被 height 卡住的，只收 width 不会改变构图；width 只在窄屏（视口宽高比 < pose 宽高比）时起作用。
2) 因此两个数一起定：width 16.8 → 15.2（管窄屏），height 12.2 → 10.8（管桌面与横屏，约 +13%）；height 不得低于 10.5，否则 812×375 这类矮视口下地板前沿会贴到画布下沿。
3) 目标点略右移（x 约 +0.4），消掉右前空地的构图失衡。
4) 五种尺寸逐一截图确认：主体与“机房结构剖面”贴地标签不被裁切、不与右下角视角按钮重叠、说明不遮挡设备。
验收：verify-immersive 全绿（总览目标点断言同步改为新 target，其余五个镜头目标点不得变化）；截图 outputs/after-overview-{375,768,1024,1440,812}.png，不能只截 1440。
```

## S4b 墙面淡出（新增，接在 S4 之后）

S3 完成后，画面里最硬的边已经不在 3D 场景里，而在两面墙上：后墙是一整块亮灰平板，顶部与右端各有一条直线。它比“基座看不见”更影响沙盘感。

```
项目 D://CodexProjects//PCAssemblyLab。接着 S4 做，处理两面墙的硬边，不改几何位置。
1) 复用 src/scene/floorFade.js 的世界坐标思路，给墙面加轻量 shader 修饰（onBeforeCompile）：按世界 Y 做 alpha 渐变，y<1.2 保持 1.0，y 从 1.2→3.2 降到 0.12；再按世界 X（后墙）或 Z（左墙）在开口端外侧 0.8 单位内淡到 0。
2) 墙面必须关闭 castShadow 并设 depthWrite=false：否则淡出后仍会投出一条看不见的墙影，还会和机柜、走线架出现排序闪烁。
3) 顶部 y=2.95 的白色收边细条：如果在新渐变下变成一条孤立亮线，一并做同样的 Y 衰减或直接删除。
4) 监测采集盒与上游进线箱贴在墙上，确认与半透明墙面叠加后没有描边、发白或穿帮。
约束：不改墙体位置与厚度；不动其它几何；减少动态效果与窄屏行为不变。
验收：build 与七组回归全绿；总览重拍 outputs/after-wall.png，确认墙顶与墙端不再是硬线、设备仍清晰；375 宽无溢出。
```

---

## S5 正交改透视（核心步骤）

```
项目 D:\CodexProjects\PCAssemblyLab。把机房相机从正交改为单一透视相机，保持现有全部交互契约。
1) src/scene/DataCenterViewport.jsx：Canvas 相机改为透视，初始 fov 由机位决定，near 0.1 / far 200。
2) src/data/roomCameras.js：每个机位新增 fov 字段。总览用 fov 14 并把相机距离拉远以模拟近正交；网络/计算/存储/供电/制冷用 28–32；supportCameras 里的 12 个特写用 32–45。
3) src/scene/RoomCameraRig.jsx：把 fit() 从“worldWidth → zoom”改为“worldWidth + fov + 视口比例 → 相机距离”；cameraSnapshot 继续保存 position/target/zoomRatio，zoomRatio 改为归一化取景系数，保证面板展开/收起时比例稳定。
4) 保持：过渡可中断、减少动态效果直接定位、进入/返回恢复视角、data-camera 字段不变（可新增 projection 字段）。
5) 逐项确认 data-flow-pick-projections 仍然准确：矢量投影在透视相机下同样成立，但锚点必须仍在画面内。
约束：不改任何机位位置与目标点（除总览在上一步已调整）；不改路径、图层、面板布局。
验收：build 通过；七组回归全绿；六个章节镜头在五种尺寸下取景正确、无跳变；截图 outputs/after-persp-*.png 与 before 同机位对比，说明近大远小的变化。
```

## S6 五个机内／功能机位

```
项目 D:\CodexProjects\PCAssemblyLab，在上一步的透视相机基础上新增机位，不改现有 6 个章节镜头与 12 个特写。
1) src/data/roomCameras.js 新增：冷通道（视高 1.55，位于前排机柜前 z≈1.9，沿 x 向纵深看）、热通道（视高 1.7，位于 z≈-0.27 两排之间）、机柜正面（距 C01 正面约 1.4，正对 1.3 高度）、母线仰视（地面附近向上看 y=2.86 的母线）、地板低角（视高 0.5，沿送风主干看向送风口）。
2) 在 src/data/supportSystems.js 里把合适的步骤 camera 指向这些新机位：制冷 2/4 步用冷通道与地板低角、制冷 6/7 步用热通道、供电 4 步用母线仰视、供电 5/6 步用机柜正面。其余步骤保持现有特写。
3) 机位只能由「查看本步特写」按钮触发，普通选择不移动镜头。
约束：进入/返回、暂停、后台暂停、减少动态效果的行为不变；窄屏下不做额外裁切逻辑。

落地结果：删去 6 个已无步骤引用的机位（power-busway、power-rack-pdu、power-psu、cool-plenum、cool-fan、cool-return），最终 11 个机位覆盖供电 6 个、制冷 7 个共 13 个功能节点；制冷第 2 步用地板低角、第 4 步用冷通道。截图改名 support-power-busway-up.png / support-power-rack-front.png。
收尾：某步骤改指向新机位后，它原来专用的特写若已无任何步骤或脚本引用（先 grep 确认），直接删除，不留不可达的机位数据；同时把文档里“12 个功能节点特写”一类计数改成实际值（本次为 11 个机位覆盖 13 个功能节点，排风与回风共用热通道机位）。
验收：build 与全量回归全绿（verify-support 的机位目标断言需同步更新）；每个新机位重拍截图到 outputs/after-pose-*.png，确认无穿模、无遮挡主体。
```

## S7 弧线运镜与时长

```
项目 D:\CodexProjects\PCAssemblyLab，只改 src/scene/RoomCameraRig.jsx 的过渡曲线与时长。
1) 过渡时长可配置：章节 1.2 秒、特写 0.9 秒、还原/复位 0.5 秒；仍使用缓入缓出。
2) 位置不再直线插值，改为轻微弧线：中点向上抬升起终点落差的 8% 后回落，方向保留；目标点仍线性插值。
3) 用户拖动、滚轮、新定位请求继续中断过渡；减少动态效果直接定位。
验收：verify-immersive 的“快速连续切换以最后镜头为准”“手动旋转中断自动镜头”“减少动态效果直接定位”三项通过；录 2–3 张过渡中间帧截图存 outputs/after-move-*.png。
```

## S8 流光路径

```
项目 D:\CodexProjects\PCAssemblyLab，只改路径的视觉表现，不改路径几何与步骤数据。
1) 新建 src/scene/glowTexture.js：运行时用 canvas 生成 32×32 径向渐变贴图并缓存，作为发光头与尾迹的贴图，不引入外部素材。
2) src/scene/SupportVisualization.jsx：当前步骤的路径加“发光头”（加性混合 sprite，大小随路径粗细）+ 短尾迹（取曲线末端 12%，分三段递减透明度）。静态基础路径保持现有细线与半透明小箭头。
3) src/scene/RequestVisualization.jsx 采用同一套头部表现，逐步替换现有实心球标记，保持 data-flow 的 marker/arrows 字段不变。
4) 同屏最多 2 条流光；减少动态效果时不生成流光，只保留静态路径与箭头；暂停时随进度冻结。
约束：不得提高透明物体叠加数量到影响性能的程度；不引入后处理依赖。
验收：build 与全量回归全绿，重点确认“暂停时两次画布截图完全一致”“业务结束后无持续动画帧”；截图 outputs/after-flow-*.png。
```

## S9 展品模式

```
项目 D:\CodexProjects\PCAssemblyLab。新增一个默认关闭的“展品模式”，不改现有默认布局。
1) 顶部右侧加开关（与“示例架构”标签同区），状态存组件 state，不持久化。
2) 开启后：隐藏左侧系统栏；右侧说明面板收为右下玻璃浮层（半透明深色、圆角、只显示当前选中对象的名称、三条要点与“与谁配合”）；左下显示大号章节序号与标题（如 03 供电 / 05 制冷）；底部保留细进度条与播放控制。
3) 内容只能来自现有数据，禁止新增任何数值、仪表或虚构读数。
4) 关闭后完全恢复现有三栏布局与焦点顺序；窄屏（≤900）下展品模式退化为单列紧凑版，不出现横向溢出。
验收：build 与全量回归全绿；键盘可完成开关、选步、播放；截图 outputs/after-present-1440.png、after-present-375.png。
```

落地结果：开关在 `header-meta`（与“示例架构”同区），默认关闭且只存 React state；开启后左栏用 `hidden` 移除、支撑/请求流程卡不渲染，右下 296px 深色玻璃浮层只保留名称、三条要点与“与谁配合”，不受 `panelOpen` 影响；左下章节号为供电 **04**、制冷 **05**（取 `systems.js` 的 index，工作分工取当前系统 index，整体结构与协作流程只显示标题）；底部为离散步骤条（6/7/11 段）+ 播放/暂停 + “第 X / N 步”，无播放的模式不显示进度。≤900 时展品条与浮层进入文档流（375 实测浮层在画布下方），1440/768/375 无横向溢出。七组回归 286 项全绿，新增 `verify-present` 60 项（S10 已并入包装脚本，合计 346 项）；开关/模式切换/选步/播放的 `data-camera` 完全一致，显式章节按钮移动后再开关也不变。截图 `outputs/before-present-1440.png`、`after-present-1440.png`、`after-present-375.png`、`after-present-roles-1440.png`、`after-present-off-1440.png`。

## S10 对照复核与文档

```
项目 D:\CodexProjects\PCAssemblyLab。做一次完整复核并更新文档。
1) 用 outputs/before-* 与各步 after-* 生成一张同机位对照（可用 HTML 拼版截图），存 outputs/compare-chapters.png。
2) 跑 npm.cmd run build 与完整包装脚本（原七组 + 展品模式），记录总数；把结果写进 docs/VISUAL_UPGRADE_PLAN.md 的“执行记录”小节，包含：改了什么、回归项数、遗留问题。
3) 更新 README 的“已实现”与“范围限制”，补充展品模式、机内机位、透视相机与流光说明。
4) 检查 docs/ASSET_GUIDE.md 是否需要补充运行时生成贴图（径向渐变、发光贴图）的说明。
不改功能，只做复核与文档。
```

落地结果（2026-11-01）：功能代码零改动。新增 `scripts/build-compare.cjs` 生成 base64 内嵌的 10 组同机位对照页（六章节、供电/制冷支撑、375 总览、展品模式开关），`scripts/capture-compare.browser.cjs` 整页截出 `outputs/compare-chapters.png`（1680×13,671，5.2 MiB）。`verify-present` 已并入 `scripts/verify-browser.ps1` 的 `ValidateSet` 与默认列表；`npm run build` 通过，包装脚本八组 **346** 项全绿（原七组 **286**：support 83 / request 104 / immersive 44 / server 16 / responsive 25 / fallback 10 / resources 4；新增 present **60**），原七组断言未改。节点计数按实际数据核准为 13（供电 6 + 制冷 7，排风与回风共用热通道机位），修正此前“12 个功能节点”的口径。README 补「已实现」四条（透视相机与运镜、背景与光照、展品模式、流光路径）与验证段说明；ASSET_GUIDE 新增“运行时生成贴图”小节；VISUAL_UPGRADE_PLAN 新增“六、执行记录”。遗留：可选 A4/F/G 未做；`THREE.Clock` 警告与分包体积提示仍在；后台暂停仅有无头注入验证。

---

## 可选步骤

### 可选 A4：播放时相机微移

```
项目 D:\CodexProjects\PCAssemblyLab，在 S7 之后可做。播放时相机绕当前目标做 ≤1.5° 的缓慢推移，角度由当前步骤进度驱动（progress 驱动，暂停即冻结、换步即归零），不写入 cameraSnapshot；用户手动旋转后停止，直到下次定位。若“暂停时两次画布截图完全一致”回归失败，则整体回退此项。
```

### 可选 F：自动导览

```
项目 D:\CodexProjects\PCAssemblyLab，独立立项。新增 src/data/tour.js 与 src/hooks/useTour.js，复用 useWorkflow 的播放时钟：8–10 个节拍、约 40 秒，总览 → 供电（进线/母线/机柜 PDU）→ 制冷（制冷设备/送风口/回风）→ 请求流程收尾 → 回总览。每拍绑定机位、章节卡与一句话说明；支持播放/暂停/退出/手动接管，减少动态效果时改为静态分镜列表。不得复用虚构指标。
```

### 可选 G：后处理

```
项目 D:\CodexProjects\PCAssemblyLab，先实测再决定。引入 @react-three/postprocessing，只开 Bloom（仅作用于发光路径）与轻微暗角；在 1920×1080 下记录帧时间、JS heap 与显存占用，与未开启时对比。若掉帧或不明显则移除依赖，不做此项。
```

---

## 附录 A：新对话开场提示词

新对话没有本项目的上下文，第一步必须先让它读文档并复述，再发步骤提示词。把下面整段贴进新对话即可。

```
工作目录 D://CodexProjects//PCAssemblyLab：Vite + React 19 + three.js 的数据中心三维教学展品。
先只读不写，按顺序读这些文件：README.md、docs/PROJECT_PLAN.md、docs/SUPPORT_VALIDATION.md、docs/VISUAL_UPGRADE_PLAN.md、docs/UPGRADE_PROMPTS.md，以及 src/App.jsx、src/scene/DataCenterViewport.jsx、src/scene/RoomCameraRig.jsx、src/scene/Infrastructure.jsx、src/data/roomCameras.js、src/data/supportSystems.js。
读完用不超过 15 行复述：4 个展示模式、11 阶段请求流程、供电 6 步／制冷 7 步、data-camera／data-flow／data-support 三个诊断契约、八组回归脚本与当前总通过项数（346 项，其中原七组 286 项）。
然后只执行 docs/UPGRADE_PROMPTS.md 里的 S0，做完立刻停下等我确认，不要继续 S1。

硬约束（每步都适用）：
1. 不改 11 阶段请求流程、供电 6 步／制冷 7 步的步骤划分与文案口径；不引入虚构数值、仪表盘或实时数据。
2. 暂停时两次画布截图必须完全一致；减少动态效果下不得有连续动画。
3. 窄屏（375/768）无横向溢出；键盘可完成主要操作。
4. 除方案明确允许，不新增运行时依赖、不引入外部贴图或模型。

环境：开发服务 npm.cmd run dev -- --port 5173；回归 npm.cmd run verify:browser -- -Url http://127.0.0.1:5173/（需要 playwright-cli 与本机 Chrome）。每步交付必须包含：改了什么、build 结果、回归项数、同机位前后截图路径。
```

## 附录 B：每轮怎么发

1. 贴开场提示词 → 它复述 + 完成 S0 → 你确认基线截图存在。
2. 每轮只贴**一个**步骤提示词（S1、S2……），不要一次贴多步。多步一起贴，它容易跳过截图和回归。
3. 收到结果后只看四件事：同机位截图是否真的变了、控制台是否 0 error、回归是否 346 项全绿（原七组 286 项不变）、暂停后画面是否静止。
4. 通过就说「通过，继续 S<下一步>」；不通过用附录 C 的格式反馈。
5. 做到 S5 之后，相机行为变了，先手动点一遍六个章节镜头与三个机内机位，再继续 S6。

## 附录 C：不通过时的反馈模板

```
S<编号> 未通过：<具体现象，例如 375 宽出现横向滚动 / 暂停后画面仍在动 / 总览右侧仍有大片空地>。
期望：<期望结果>。
请只修 <具体文件或范围>，不要顺手改其他步骤的内容；修完给出 build 结果、七组回归项数与同机位截图。
```

## 附录 D：上下文快照（新对话也可直接引用）

- 场景：8 台机柜（N01/N02 网络、C01–C04 计算、S01/S02 存储），后排旋转 180° 背靠背，中间热通道、两侧冷通道，送风地板 8 块，制冷设备 2 台，UPS／配电柜／进线箱各 1，机柜 PDU 8 条，风扇模块 4 个。
- 关键坐标：机柜前排 z=0.65、后排 z=-1.15；C01 在 x=-1.65；母线 y=2.86、z=-0.27；UPS x=2.6、配电柜 x=3.9、z=-3.65；制冷设备 x=-4.55/-3.12。
- 颜色：供电琥珀 #c58b18、冷空气青 #1296b8、回风暖 #c1743a、请求蓝 #2468df。
- 诊断契约：`data-camera`（position/target/zoomRatio）、`data-flow`（step/progress/route/marker/arrows）、`data-support`（chapter/step/progress/active/visible）。
- 回归：verify-{support,request,immersive,server,responsive,fallback,resources,present}.browser.cjs，原七组合计 286 项，另加展品模式 60 项，共 346 项。
