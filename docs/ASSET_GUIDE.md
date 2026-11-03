# 模型与素材规范

- server-rack.glb 由项目自己的 Blender 脚本生成，无第三方模型授权依赖。
- 保留 enclosure、server_bank、rack_frame 三个层级，内部展开依赖前两者。
- 机房采用三类专用机柜模型，分别按 2 网络、4 计算、2 存储布置；同类实例共享几何和材质，克隆节点不自动销毁缓存资源。
- `server-rack.glb` 为计算柜，包含九组托盘、散热孔、状态灯；编号在场景中按实例标注。`server_bank` 下按 1U 行合并为 `part_server_01…09`（各 7 个材质 primitive），另有两个**零三角形命名锚点** `part_fan_tray`、`part_pdu`——风扇模块与机柜 PDU 由 `infrastructure.glb` 的独立资产经网页组件渲染，锚点只提供与组件逐位相同的坐标，避免同位置重复几何。
- `generate_equipment.py` 同时生成 `network-rack.blend/.glb` 和 `storage-rack.blend/.glb`。网络柜为两组配线架、两台交换设备、成组端口、理线区和四条短跳线；`server_bank` 下为 `part_patch_panel`、`part_patch_leads`、`part_forwarding_unit`、`part_ingress_ports`、`part_compute_ports`、`part_storage_ports`、`part_standby_switch`、`part_cable_manager` 八件。存储柜为五组磁盘架（每组三托架）、双控制单元和两条上联线；`server_bank` 下为 `part_controller_01`、`part_controller_02`、`part_shelf_01…05` 七件。两柜的 `part_*` 都是单一网格、原点位于几何中心，供前端拆解按基准加偏移。
- 机柜共同骨架的比例一致，职责差异通过功能装配的实体几何体现；不能用只换颜色替代结构差异。新增资产无贴图或透明材质；边缘倒角，内部按材质合并网格。
- `python scripts/inspect-assets.py` 会检查三层契约及内嵌缓冲，输出字节、网格、材质、三角形和纹理统计到 `outputs/equipment-assets.json`。机房模型合计约 1.30 MiB；计算柜约 456 KiB（6,432 三角形，改造前后一致）。
- Blender 源文件放在 blender/source，网页使用的导出文件放在 public/models。
- 标注、连接与颜色用于讲解功能关系，不代表真实设备的精确尺寸与施工路径。
- docs/concepts/data-center-explainer.png 为 AI 生成的视觉方向参考；正式界面使用实时三维场景，不直接展示该图冒充功能。
- 后续引入外部素材时，记录来源、作者、授权与修改情况。

## 服务器内部模型

- `blender/source/generate_server.py` 使用 Blender 自带基础网格原创建模，无下载模型、贴图、字体或授权不明素材。
- 可编辑源文件：`blender/source/server-internal.blend`；运行时导出：`public/models/server-internal.glb`。
- glTF 顶层装配名是界面契约：`chassis`（不可选机箱）、`nic`、`cpu`、`memory`、`motherboard`、`psu`、`fans`。不要随意改名。
- Blender X 为宽度、Y 为前后、Z 为竖直；导出后 glTF 为 Y 竖直、Z 前后。前进风面在 Blender 的负 Y、glTF 的正 Z。
- 机箱为低侧墙敞口托盘；前部五风扇、中央主板、左侧 CPU 散热器、右侧四条竖直内存、后部左侧双口网卡、后部右侧双电源。主板接口／插槽与部件位置对应。
- CPU 装配包含处理器封装和散热片；内存包含四条 DIMM（插入内存插槽的长条电路板）；风扇和电源按功能组选择，未实现单条内存或单个风扇的二次选择。
- 每个装配内部按材质合并网格；GLB 25 网格、10 材质、2,768 三角形、205,252 字节。没有纹理内存和外部素材请求。
- 网页保留 GLB 加载缓存；克隆装配节点并共享几何，按选中／当前步骤复用少量材质变体。材质变体和描边资源退出时清理，原始缓存资源供再次进入复用。
- `src/data/server.js` 记录默认标注、部件锚点与展开偏移；展开位移是观察辅助，不是安装或维修步骤。
- 外部存储圆柱、用户终端、逻辑箭头由 Three.js 基础几何构建，属于图解节点，不属于需要在 Blender 编辑的服务器实体。

## 网络与存储请求节点（2026-10-30）

`generate_equipment.py` 继续保留 enclosure、server_bank、rack_frame，新增以下 bank 子装配，分别按材质合并，不能跨功能组再次合并：

| 资产 | 独立装配 | 本例连接 |
| --- | --- | --- |
| network-rack | ingress_ports | A 端口组 ↔ 外部网络 |
| network-rack | forwarding_unit | 在 A、B、C 之间选择出口 |
| network-rack | compute_ports | B 端口组 ↔ C01 的 01 号服务器 |
| network-rack | storage_ports | C 端口组 ↔ S01 控制单元 |
| storage-rack | storage_controller | 接收读取请求、定位模块、返回数据 |
| storage-rack | file_module | 中间一排中间托架，代表本次文件的持久存储模块 |

N01 的上部交换设备按 A/B/C 三组简化，每组包含可见插口；下部交换设备、第二控制器、其余模块与其他机柜作为背景，不暗示本例经过它们。C01 最上方托盘作为本例 01 号服务器。端口与介质类型为教学抽象，不模拟真实网络协议或物理介质时序。

网页从克隆装配向上追溯功能节点以处理实际网格点击；缓存几何与正常材质继续共享，少量发光材质变体只用于当前功能组。选中蓝框与工作金色高亮独立。装饰框不参与拾取。

新网络／存储资产分别为 308,404／593,712 字节，15／18 网格、6／7 材质、5,748／9,000 三角形；两者共增加 9,936 字节，三角形数量没有增加。所有机柜仍无贴图。`inspect-assets.py` 同时检查新增装配名契约。

## 供电与制冷设备（2026-10-30）

`generate_infrastructure.py` 生成 `infrastructure.blend` 与 `public/models/infrastructure.glb`，是供电与制冷讲解的实体来源。所有设备围绕各自原点建模，源文件里仅沿 X 轴排开便于编辑；网页克隆装配后按机房坐标重新定位，克隆时把装配原点归零。

| 顶层装配 | 用途 | 关键几何 |
| --- | --- | --- |
| `ups` | UPS 不间断电源 | 双门、显示屏、旁路开关、电池模块通风格栅、顶部进线 |
| `distribution` | 配电柜 | 三排断路器与 DIN 导轨、总开关、计量屏、门把手与铰链 |
| `rack_pdu` | 机柜 PDU | 竖向条体、8 个插座、断路器、状态灯、安装耳 |
| `crac` | 制冷设备 | 上部回风格栅、盘管与百叶、控制屏、下部送风开口；含 `CRAC fan A/B` 两个可旋转风扇 |
| `floor_vent` | 架空地板送风口 | 外框、深色凹槽、双向格栅条 |
| `fan_tray` | 设备风扇模块 | 1U 机箱、两个风扇环与护网；含 `Tray fan A/B` 两个可旋转风扇 |
| `feed_panel` | 上游电源引入箱 | 门板、计量屏、断路器、铭牌、下部电缆引入 |

- 风扇叶片在独立空节点下合并为一个网格，网页按节点名旋转，因此改名前必须同步 `src/scene/Infrastructure.jsx`。
- 机柜 PDU 挂在机柜左侧，实例由 `Rack` 组合局部坐标 `[-.51,.45,.2]` 定位并绕 Y 轴旋转 −90°；风扇模块装在计算柜顶部前方 `[0,1.94,.18]`。
- 高亮通过按（原材质，颜色）缓存的一次性材质变体实现，只切换 `mesh.material`，不克隆几何、不新增纹理。风扇模块不做材质染色，只用节点描边表示“参与本步”，以免透明感遮挡叶片。
- 母线、静压层与地面路径由 Three.js 基础几何和线段绘制，属于图解元素，不在 Blender 中编辑。
- 资产统计：715,708 字节、38 网格、10 材质、12,292 三角形、无贴图。`inspect-assets.py` 检查上述装配名契约。
- UPS／配电柜／制冷设备改按**部件**合并（此前整台按材质合并），供页面做内部拆解：`part_ups_battery`、`part_ups_control`、`part_ups_door`、`part_ups_cabinet`；`part_dist_breakers`、`part_dist_switch`、`part_dist_meter`、`part_dist_door`、`part_dist_cabinet`；`part_crac_fans`、`part_crac_coil`、`part_crac_control`、`part_crac_cabinet`。几何未变，三角形数与改造前一致（12,292），网格数 49 → 38 是因为部件内部又合并了一次。
- 设备尺寸与间距为教学比例，不代表真实产品的标准宽度或安装间距；后排机柜旋转 180° 是为让进风／排风方向自洽。

## 运行时生成贴图（2026-11-01，S2/S4b/S8）

视觉升级引入的贴图全部由浏览器运行时 canvas 生成并缓存，不下载任何外部图片，不进 `public/`：

| 贴图 | 生成位置 | 规格与用途 |
| --- | --- | --- |
| 地板径向淡出 alphaMap | `src/scene/floorFade.js` | 64×64 径向渐变，经 `onBeforeCompile` 改写为世界坐标衰减，地板外沿约 0.8 世界单位淡出；墙面 Y 向淡出复用同一思路（y 1.2→3.2 降到 0.12，开口端 0.8 内淡到 0） |
| 流光头尾迹贴图 | `src/scene/glowTexture.js` | 32×32 径向渐变，普通透明混合；当前步骤路径的 FlowGlow 发光头（1 个 billboard sprite）+ 尾迹 3 段（末端 12%，透明度 .45/.25/.12） |

约束沿用：场景 GLB 资产仍无贴图；新增运行时贴图必须同样走“canvas 生成 + 缓存”，不引入外部素材。
