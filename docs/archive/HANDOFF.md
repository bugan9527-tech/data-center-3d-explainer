> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

# 视觉优化任务交接

用途：把本项目的视觉升级任务交给另一个 AI 继续执行。下面是可直接粘贴的交接提示词，后面附进度快照，方便接手方核对是否一致。

## 交接提示词

```
工作目录 D:\CodexProjects\PCAssemblyLab：Vite + React 19 + three.js 的数据中心三维教学展品。当前在做一轮“视觉与镜头优化”，任务清单是 docs/UPGRADE_PROMPTS.md（S0–S10 + 可选项）。

第一步只读不写，按顺序读：README.md、docs/VISUAL_UPGRADE_PLAN.md、docs/UPGRADE_PROMPTS.md、docs/SUPPORT_VALIDATION.md，以及 src/scene/RoomCameraRig.jsx、src/data/roomCameras.js、src/scene/floorFade.js、src/scene/FlowGlow.jsx、src/App.jsx、src/components/SupportPanel.jsx。
读完用不超过 15 行复述：4 个展示模式、11 阶段请求流程、供电 6 步／制冷 7 步、机位总数、data-camera／data-flow／data-support 三个诊断契约、八组回归脚本与总项数（346，其中原七组 286）。与我下面的快照不一致时，先指出来再动手。

进度：S0–S10 已完成（光照与色调、背景与地面淡出、基座与道具、总览取景、正交改透视、机内机位、弧线运镜、流光路径、展品模式、对照复核与文档）。
待办：无。可选项 A4 相机微移、F 自动导览、G 后处理，等我单独开口再做。

硬约束（每步都适用）：
1. 不改 11 阶段请求流程、供电 6 步／制冷 7 步的步骤划分与文案口径；除方案明确允许，不新增运行时依赖。读数口径（2026-11-03 改定）：允许显示运行指标，但每一处都必须是**标注为模拟**的值，且不得声称接入任何实时接口——面板标题的“模拟”角标与底部“无实时接口”说明不得删除；新增读数要同时补 `verify-twin` 的模拟标注断言。
2. 暂停时两次画布截图必须完全一致；减少动态效果下不得有连续动画。
3. 窄屏（375/768）无横向溢出；键盘可完成主要操作；六组原有回归语义不能被“改测试迁就实现”破坏。
4. 镜头只能由明确按钮触发，普通选择不移动镜头；进入服务器内部后返回要保留视角与状态。
5. 淡出带内的任何新几何都复用 src/scene/floorFade.js 的世界坐标衰减，不要引入不透明硬边；不创建界面无法到达的机位、道具或数据。

交付要求：每步给出改了哪些文件、build 结果、七组回归项数、同机位前后截图路径，并把修正写回 docs/VISUAL_UPGRADE_PLAN.md 与 docs/UPGRADE_PROMPTS.md。方案参数若与实际测量不符，以测量为准并说明理由，不要照抄旧参数。

环境：开发服务 npm.cmd run dev -- --port 5173（后台启动）；回归 npm.cmd run verify:browser -- -Url http://127.0.0.1:5173/，需要 playwright-cli 与本机 Chrome。参考视频 C:\Users\PC\Desktop\3D智慧农业场景_7700134417188080934.mp4 只作为视觉依据，不要引用它作为功能证据。
```

## 进度快照（2026-11-01 盘点）

| 步骤 | 状态 | 实际实现要点 | 证据 |
| --- | --- | --- | --- |
| S0 基线 | 完成 | `outputs/before-*` | 10+ 张基线图 |
| S1 光照色调 | 完成 | ambient .55、hemi .5、主光 2.7、ACES + 曝光 1.02 | `src/scene/DataCenterViewport.jsx` |
| S2 背景与地面淡出 | 完成 | CSS 渐变背景 + `scene.fog`；`floorFade.js` 64×64 径向贴图按世界坐标采样，顶板 band 4.5、基座 band 18 | `src/scene/floorFade.js`、`FloorSlab` |
| S3 基座与道具 | 完成 | 基座不外扩、内收并共用衰减；8 条地脚支腿已删；道具抽到 `src/scene/FloorProps.jsx` | 同上 |
| S4 总览取景 | 完成 | overview width 15.2、height 10.8、target x +0.4。**注意：fit 由 height 卡住，收 width 无效** | `src/data/roomCameras.js` |
| S4b 墙面淡出 | 完成 | 墙面按世界 Y 淡出，knee 取 2.4、顶部 3.05 收到 0（监测盒顶 2.35、进线箱顶 2.06 必须落在实心墙上）；墙 `castShadow=false`、`depthWrite=false`；顶部白条已处理 | 同上 |
| S5 正交改透视 | 完成 | 单一透视相机；每个机位带 `fov`；`frameDistance()` 由 width/height + fov + 视口比例求相机距离；总览 fov 14 模拟近正交；`zoomRatio` 为相对取景系数 | `RoomCameraRig.jsx` |
| S6 机内机位 | 完成 | 新增 `functionCameras` 5 个：cold-aisle、hot-aisle、rack-front、busway-up、floor-low；6 个原专用特写无引用后已删；**当前共 11 个机位覆盖 13 个功能节点（排风与回风共用热通道机位）** | `roomCameras.js`、README |
| S7 弧线运镜 | 完成 | 章节 1.2s、特写 0.9s、复位 0.5s；位置叠加 `sin(πt) × 8%` 抬升 | `RoomCameraRig.jsx` |
| S8 流光路径 | 完成 | `glowTexture.js` 运行时径向贴图 + `FlowGlow.jsx`（发光头 + 12% 尾迹），请求与支撑两处复用；减少动态效果不生成 | `FlowGlow.jsx` |
| S9 展品模式 | 完成 | 顶部开关默认关闭；隐藏左栏、右下玻璃浮层、左下大章节号（供电 04／制冷 05）；离散步骤条；≤900 单列；`verify-present` 60 项 | `App.jsx`、`global.css`、`outputs/after-present-*` |
| S10 对照复核 | 完成 | `outputs/compare-chapters.png`（10 组同机位）；README/ASSET_GUIDE/验证文档回写；`verify-present` 已并入包装脚本，八组 346 项 | `outputs/compare-chapters.png`、`docs/VISUAL_UPGRADE_PLAN.md` |
| A4/F/G | 未做 | 相机微移、自动导览、后处理，单独开口再做 | 可选 |

## 常用命令

```powershell
npm.cmd run dev -- --port 5173
npm.cmd run build
npm.cmd run verify:browser -- -Url http://127.0.0.1:5173/
python scripts/inspect-assets.py
```

包装脚本共八组：原七组 support、request、immersive、server、responsive、fallback、resources 合计 **286 项**（support 83、request 104、immersive 44、server 16、responsive 25、fallback 10、resources 4），另加展品模式 present **60 项**，总计 **346 项**。
