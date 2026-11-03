> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

# 设备结构拆解视图

参考素材：`C:/Users/PC/Desktop/DJI_Action4_teardown.mp4`（DJI Action 4 结构拆解：外壳分离、部件散开、引线标签、右侧规格详情）。

## 已实现

选中「网络设备 / 计算服务器 / 存储设备」后，右侧说明面板出现 **「拆解内部构造」** 按钮；点击后：

1. 相机切到该柜的拆解机位（`teardown-network` / `teardown-compute` / `teardown-storage`，框住整柜）。
2. 机柜外壳（GLB 节点 `enclosure`）向左滑出 1.12 个单位，材质渐变为 26% 透明，能看到内部。
3. 内部功能组依次向前错位（`0.18 + index × 0.13`），形成分层感。
4. 机柜前上方加一盏点光（intensity 3.2 / distance 3.6），把原本偏暗的机柜内部照亮。
5. 每个内部组右侧生成一个标签（`转发单元`、`入口端口组`、`计算端口组`、`存储端口组`、`服务器区` / `存储控制器`、`文件存储模块`、`服务器区` / `服务器区 · 01–09`），带虚线引线。
6. 再次点击「合上内部构造」回到原机位，外壳与内部组平滑归位。

只拆解该类型的主柜（N01 / 当前选中的计算柜 / S01），同类第二台保持关闭，避免外壳滑出后与邻柜重叠。

## 实现要点

| 文件 | 作用 |
| --- | --- |
| `src/scene/DataCenterViewport.jsx` | `TEARDOWN_PARTS` 定义各柜内部组与标签；`Rack` 内的 `useFrame` 用 delta 缓动外壳位移、外壳透明度、内部组前移；标签用 `Html` + `Line` |
| `src/data/roomCameras.js` | `teardownCameras` 三个机位 |
| `src/App.jsx` | `teardown` 状态与 `toggleTeardown()`；`.teardown-mode` 时隐藏底部步骤卡片 |
| `src/styles/global.css` | `.teardown-label` 标签样式、拆解态卡片隐藏 |

外壳材质在 `useEffect` 中按实例 `clone()`，避免改透明度影响其它机柜；卸载时 `dispose()`。

## 与参考视频的差距

参考视频是**逐件拆解**：17 个部件可以单独挑出、每个都有材质 / 尺寸 / 分辨率等规格卡，还有「已拆解 8/16」的进度。我们目前是**按功能组整体拆分 + 名称标签**，原因是：

- 机柜 GLB 只到「功能组」这一层（例如计算柜内部只有一个 `server_bank`），再往下没有独立网格；
- 要做逐件拆解，需要在 Blender 里把服务器抽屉、风扇、PDU 等拆成独立节点并重新导出，工作量在模型侧。

## 交互取舍

「拆解」目前是**显式按钮**，不是「点设备即拆解」。原因：既有约定是「普通选择不移动镜头」，自动拆解会同时移动相机，`verify-immersive` 中「普通系统选择保持视角」的断言会失效。

如果要改成「点设备即自动拆解」，需要同时改这条断言，并接受"选择设备必然带动镜头"。

## 验证

- `npm.cmd run build` 通过。
- 八组回归 **280/280**（playback 20、support 90、immersive 44、present 71、responsive 25、server 16、fallback 10、resources 4），console error 0。
- 截图：`outputs/tf-1.png`（网络）、`outputs/tf-2.png`（计算）、`outputs/tf-3.png`（存储）。
