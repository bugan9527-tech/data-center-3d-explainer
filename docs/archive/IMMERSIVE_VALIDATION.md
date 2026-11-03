> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

# 沉浸界面、镜头与设备细化：验证记录

验证日期：2026-10-30。基于原有工程增量实现，未新增运行时依赖。参考本机视频及既有 `work/video-reference/` 抽帧，借鉴空间层次、近景设备结构与场景主导的布局。

## 本阶段实现

- 桌面顶部保留名称和三种展示模式；左侧缩为系统导航；右侧职责说明可以收起。1440 宽时场景列宽约 1016 CSS 像素，收起后约 1308 像素。窄屏依次排列导航、场景、章节、流程和说明。
- 六个章节镜头：总览、网络、计算、存储、UPS 与配电、制冷。监测系统也可通过“查看位置”定位。点击普通系统、机柜或标注只更新选择，不主动改变镜头。
- 镜头使用 850 ms 插值，可连续改选；旋转、滚轮、文字视角按钮可中断。机房复位返回总览，内部复位返回服务器默认视角。减少动态效果时直接定位；播放与镜头在后台停止。
- 点击章节或“查看位置”会开启该系统对应的路径，帮助观察周边协作关系；路径仍可独立关闭。
- 进入时保存机房视角、推近选中柜，同时懒加载内部界面与 GLB。内部真正绘制后才淡入切换；加载期间保留可见机房和“取消进入”。返回也等机房绘制后切换，恢复选择、模式、路径、展开、视角、滚动和入口焦点。
- `useRoomTransition.js` 管理层级和恢复；`roomCameras.js` 管理镜头构图；`RoomCameraRig.jsx` 管理可中断插值；`roomLayout.js` 管理八柜位置和资产映射。`SceneReady.jsx` 在目标场景已绘制后通知切换。
- 网络柜、计算柜、存储柜使用三份原创 Blender 资产，分别表现配线与端口、服务器托盘与散热孔、磁盘托架与控制单元。保留结构展开和计算柜服务器内部入口。

## 实际验证与证据

开发页面和 `npm.cmd run build` 后的 Vite preview 均检查过。本阶段生产页面为 `http://127.0.0.1:4173/`，浏览器是本机 Windows Chrome 156 的 Playwright 无头模式。

| 脚本 | 通过项 | 证据 |
| --- | ---: | --- |
| `verify-immersive.browser.cjs` | 44 | [镜头与衔接结果](../outputs/verification-immersive.json) |
| `verify-server.browser.cjs` | 16 | [服务器原有功能回归](../outputs/verification-full.json) |
| `verify-responsive.browser.cjs` | 25 | [键盘、响应式和流程回归](../outputs/verification-responsive.json) |
| `verify-fallback.browser.cjs` | 7 | [无 WebGL、界面加载失败及按需渲染](../outputs/verification-fallback.json) |
| `verify-resources.browser.cjs` | 4 | [资源与切换样本](../outputs/verification-resources.json) |

共 96 项通过。正常交互脚本的 `console.error` 和 `pageerror` 均为零。无 WebGL 和内部界面请求失败是独立页面的故障注入，预期会产生初始化或加载错误。

重点验收：

- 六个镜头的目标坐标与预设一致，实际截图逐张核对设备和周边。八次快速连续切换后落在最后的 UPS 视角，无残留插值。
- 旋转及滚轮分别在过渡中介入；等待超过原过渡时长，相机保持用户操作结果。
- 面板收起与展开后画布宽度正确改变，朝向和归一化缩放保持。
- 延迟内部 GLB 请求 1600 ms，加载期间机房可见；取消恢复原视角，重新进入正常。
- 返回保留 C04、整体结构模式、电力／冷空气开关和展开状态。原有回归先手动旋转缩放，返回后八柜标签相对画布的投影误差小于 1 CSS 像素，入口焦点恢复。
- 内部实际 CPU 网格点击、六部件文字选择、展开、暂停冻结、剩余时间续播、五步结束不循环均通过。
- 机房覆盖 375×812、768×1024、1024×768、1440×900 和 812×375；服务器内部覆盖前四种尺寸。均无横向溢出，主要按钮可操作。
- 键盘验证 Enter 进入、Tab 遍历部件、选择和旋转、职责面板收起及“查看位置”。减少动态效果下镜头直接定位，内部播放标记保持静止。
- 无 WebGL 时仍可进入文字讲解、选择部件、操作步骤并返回；内部界面代码加载失败时机房保留，仍可取消。
- 暂停并稳定后，500 ms 内 requestAnimationFrame 回调数为 0；切换完成后只有当前层级一个画布。

## 资产与资源

[资产统计原始结果](../outputs/equipment-assets.json)，可用 `python scripts/inspect-assets.py` 重建。

| 网页资产 | 字节 | 网格 | 材质 | 三角形 |
| --- | ---: | ---: | ---: | ---: |
| `network-rack.glb` | 303568 | 8 | 6 | 5748 |
| `server-rack.glb` | 460692 | 10 | 8 | 6432 |
| `storage-rack.glb` | 588612 | 10 | 7 | 9000 |
| `server-internal.glb` | 205252 | 25 | 10 | 2768 |

三类机柜唯一 GLB 合计约 1.29 MiB，替代原来单一约 450 KiB 的通用机柜。场景按 2 网络＋4 计算＋2 存储复用几何与材质。机柜实体合计 55,224 个三角形，相比原八个通用柜的 51,456 个增加 3,768 个。没有贴图和透明柜门；部件按材质合并，沿用一盏带阴影方向光。内部不增加实时阴影。像素比上限 1.5，场景继续按需渲染，资源按层级懒加载。

最后一次资源样本：机房模型标注就绪约 865 ms，入内约 1373 ms（含主动镜头过渡和检测等待）；三个机柜 GLB 请求约 2.9–4.0 ms，`transferBytes=300` 表明命中了缓存校验。此结果不能代表首次网络下载。JS 已用堆样本为机房 36,958,493 字节、内部 24,033,765 字节、返回 19,965,795 字节，自动 GC 和采样时机影响很大，不能据此推断显存、进程内存或跨版本性能变化。此前版本没有可对比的加载与内存基线。

## 实际截图

- [机房总览](../outputs/immersive-overview.png)；[收起说明](../outputs/immersive-collapsed.png)。
- [网络柜](../outputs/immersive-network.png)；[计算柜](../outputs/immersive-compute.png)；[存储柜](../outputs/immersive-storage.png)。
- [UPS 与配电](../outputs/immersive-power.png)；[制冷](../outputs/immersive-cooling.png)。
- [375 宽机房](../outputs/immersive-layout-375.png)；[1024 宽机房](../outputs/immersive-layout-1024.png)；[横屏机房](../outputs/immersive-layout-812.png)。
- [内部完整视图](../outputs/server-internal-desktop.png)；[展开与协作](../outputs/server-internal-expanded.png)；[内部窄屏](../outputs/server-internal-375.png)。
- [进入前](../outputs/room-before-entry.png)；[延迟加载时保持可见的机房](../outputs/entry-loading.png)；[返回后](../outputs/room-restored.png)。

## 复现

先启动应用，再执行（URL 使用终端实际打印的地址）：

```powershell
npm.cmd run build
npm.cmd run preview
npm.cmd run verify:browser -- -Url http://127.0.0.1:4173/
python scripts/inspect-assets.py
```

需要已安装的 `playwright-cli` 和 Chrome。包装脚本会打开自己的浏览器会话，执行五份回归、保存 JSON 与截图，再关闭该会话。亦可按 README 单独运行某份脚本。

## 剩余限制

- 六个镜头为教学构图，未增加碰撞避让或完整自动导览；局部视角允许裁切远处无关设备。窄屏主要使用文字导航，隐藏空间悬浮说明以免遮挡。
- 进入与返回的短暂准备阶段会同时持有两个按需画布，切换后卸载上一层；未在两套模型之间做连续三维几何变形。
- 四个计算柜仍共用同一内部教学结构，只展示 01 号服务器；部件按功能组选择。教学路径不模拟真实电路、协议时序或流体。
- 未进行目标硬件的长期 FPS、GPU 显存及多浏览器基准，不能承诺帧率。
- 仍有 `THREE.Clock` 弃用警告和约 1028 kB 公共三维包超过 500 kB 的构建提示；没有屏蔽警告或升级无关依赖。
- 没有引入真实设备、故障维修、监控指标、自动配音或完整自动导览。

## 后续增量：请求流程

本记录描述沉浸布局阶段的历史验收。网络、计算与存储的 11 阶段请求流程现已接入；保留原镜头与层级衔接，新增验证见 [请求流程实施与验证](REQUEST_FLOW_VALIDATION.md)。`outputs/verification-*.json` 与同名截图由最新生产页面回归更新。普通设备选择现在不会暂停业务流程；进入内部才暂停机房，返回保留阶段和分数进度。
