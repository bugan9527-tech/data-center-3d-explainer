> **历史归档（2026-11-03 整理）**：本文记录某一阶段的过程与结论，其中的检查项计数、界面口径与文件路径可能已被后续实现取代。现行状态以根目录 `README.md` 为准，文档索引见 `../README.md`。

# 逐件拆解：实现方案

目标：把现在的「整组拆开」升级成参考视频那种「一件一件拆开、每件有编号标签和规格卡、显示已拆解进度」。

现状与差距先摆清楚，方案只做必要的事。

## 一、现状（已核对代码与 GLB）

- `public/models/server-rack.glb` 顶层只有 4 个节点：`enclosure`、`rack_frame`、`server_bank`。
- `server_bank` 下面按**材质**合并：`server_bank_Server_chassis`、`_Brushed_aluminum`、`_Graphite_steel`、`_Network_ports`、`_Status_LEDs`、`_PCB_green`、`_Ventilation_openings`。
- 也就是说 9 台服务器 + 风扇 + PDU 已经焊成 7 块网格，前端拿不到单台。
- `blender/source/generate_rack.py` 里**每台服务器是逐件创建的**（`for row in range(9)` 里建 tray / front plate / handle / vent / port / LED / PCB / heatsink），最后一步 `for parent in [shell, servers, frame]` 按材质 `join` 才把它们合并。
- 结论：**不需要重做模型，只需要改 join 策略**，把"按材质合并"改成"按部件合并"。

## 二、模型侧（Blender）

### 2.1 改动点

`blender/source/generate_rack.py` 末尾的三段 join：

1. 保留 `enclosure`、`rack_frame` 的按材质 join（外壳与框架仍各是一组）。
2. `server_bank` 不再按材质 join，改为**按行合并**：每一行的所有网格 join 成一个对象，命名 `part_server_01` … `part_server_09`，parent 仍为 `server_bank`。
3. 新增两个独立部件（如果当前不在 GLB 里，就用脚本生成）：
   - `part_fan_tray`：机柜顶部风扇模块（2 个风扇圈 + 护网），parent = `server_bank`；
   - `part_pdu`：机柜左侧 PDU 竖条（8 个插座 + 断路器），parent = `server_bank`。

### 2.2 命名契约（前端依赖，不能改）

```
enclosure
rack_frame
server_bank
  part_server_01 … part_server_09   # 9 台 1U 服务器，从下(HU1)到上(HU9)
  part_fan_tray                     # 顶部风扇模块
  part_pdu                         # 左侧 PDU
```

- 前缀固定 `part_`，前端用 `name.startsWith('part_')` 枚举。
- 编号两位补零，前端按名称排序即可还原上下顺序。
- 每个 `part_*` 的原点必须在**自身几何中心**（导出前 `Set Origin → Origin to Geometry`），这样前端做"沿 +z 拉出"不会歪。
- **`part_fan_tray` / `part_pdu` 是零三角形命名锚点，不是实体网格**（S1 已按此实施，见第六节）。这两件在 `infrastructure.glb` 里本来就有独立资产，网页由 `FanTray` / `RackPdu` 组件渲染在机柜局部坐标 `[0,1.94,.18]` 与 `[-.51,.45,.2]`；锚点坐标与之逐位相同，作为唯一真值来源。若改成在 `server-rack.glb` 里再造一份实体，会与前端组件同位置重叠（z-fighting），并让三角形从 6,432 涨到 9,184（+2,752，+43%），同时打断支撑章节对这些组件的 `active` 染色与扇叶旋转。
- `part_pdu` 的锚点**不含旋转**：−90° 绕 Y 只存在于 `RackPdu` 组件里，前端取锚点位置时必须保留该旋转。

### 2.3 约束

- 不改变外形尺寸、位置、材质；只改变层级。
- 三角形数不增加（原来是 join，现在是分组，几何量相同）；draw call 会从 7 增加到约 13，可接受。
- 不新增贴图。
- 导出后更新 `scripts/inspect-assets.py` 的必需节点集合，加上 `part_server_01`、`part_fan_tray`、`part_pdu`。
- `network-rack.glb`、`storage-rack.glb` 在 S1 时保持原状；S5 已按同一 `part_*` 契约重组，几何与三角形数不变，只改层级与原点。

## 三、前端侧

### 3.1 数据（新增 `src/data/rackParts.js`）

每件一条：

```js
export const rackParts = {
  compute: [
    { id: 'part_server_01', name: '计算服务器 01', specs: { 高度: '1U', 形态: '机架式', 供电: '双路 550 W' }, role: '执行程序与任务处理' },
    // …09
    { id: 'part_fan_tray', name: '风扇模块', specs: { 风扇: '2 × 80 mm', 位置: '顶部后侧' }, role: '把机柜内的热空气抽到热通道' },
    { id: 'part_pdu', name: '机柜 PDU', specs: { 插座: '8 × C13', 输入: '单路 32 A' }, role: '把母线电力分给每台服务器' },
  ],
  network: [...],
  storage: [...],
};
```

规格里的数字必须是**教学示例**，标注"示例参数"，不装作真实产品规格（与项目既有的"不宣称未经实测"一致）。

### 3.2 场景拆解（改 `DataCenterViewport.jsx`）

- `TEARDOWN_PARTS` 不再写死两组标签，改为从 `rackParts` 读。
- 每件沿 **+z（正前方）** 拉出，形成"抽屉"排列：`z = baseZ + 0.12 + index * 0.055`，同时 `y` 保持不变（服务器本来就在不同高度，天然错开）。
- **必须记录基准位置**：S1 之后每个 `part_*` 的原点被移到几何中心，节点自带非零 translation（9 台服务器 `z=0.046`、风扇锚点 `z=0.18`、PDU 锚点 `z=0.2`）。现有代码用 `target = .18 + index * .13` 直接把 `position.z` 缓动过去，等于把基准覆盖掉；一旦偏移量变动就会整体跳位。正确写法是加载时 `node.userData.base = node.position.clone()`，动画时写 `base.z + offset`。
- `part_fan_tray` / `part_pdu` 的锚点没有网格，移动它**不会**带动画面：`FanTray` 与 `RackPdu` 是 `model` 的兄弟节点。必须由 `Rack` 把同一份偏移量传给这两个组件（读锚点位置换算，不要在组件里再写一遍常量），否则 9 台服务器滑出、风扇模块与 PDU 留在柜内，看起来像穿帮。
- 展开时外壳继续沿用现在的实现（左移 + 26% 透明 + 点光）。
- **标签只给"当前聚焦件"一个**，其余件只显示编号小圆点（`01`…`09`），避免 11 个标签糊屏；现有标签按 `1.92 - index * .42` 排会掉到机柜底部以下，需要重排。

### 3.3 部件清单与规格卡（改 `App.jsx` 的 detail 面板）

拆解态下，右侧面板换成：

- 顶部：`已拆解 11 / 11` + 「全部拆解 / 全部合上」；
- 列表：每行 `编号 · 名称 · 状态`，点击 → 该件高亮（emissive）+ 相机聚焦该件 + 下方显示规格卡；
- 规格卡：名称、四行规格、一句作用；
- 底部：「合上内部构造」。

### 3.4 交互

- 点「网络设备 / 计算服务器 / 存储设备」→ **直接进入拆解**（用户已明确要"点击就出来"）。
- 只在「工作分工」视图生效：协作流程与持续支撑把底部卡片当作讲解主体（11 阶段请求流程 / 供电 6 步、制冷 7 步），拆解必须收起卡片给机柜让位；整体结构是总览，也不应因一次点选切走构图。产品上，拆解是"看清一个机柜"的动作，只属于工作分工。
- 章节镜头（`viewLocation`）与流程设备按钮（`chooseNode`）不触发拆解：前者是定位、后者属于 11 阶段流程。
- 代价：`verify-immersive` 里「普通系统选择保持视角」这条断言要改成「普通系统选择保持视角，三类设备进入拆解并靠近」，并新增一条反向断言。
- 「纯净视野」下按 `T` 可切换拆解（可选）。

## 四、验收

1. `node scripts/inspect-assets.py` 能列出 `part_server_01…09`、`part_fan_tray`、`part_pdu`。
2. 点计算服务器 → 11 件依次拉出，编号标签不重叠；点列表任意一件 → 高亮 + 相机聚焦 + 规格卡更新。
3. 「已拆解」计数随合上/展开变化。
4. 合上后机柜恢复原样，外壳透明度回到 1。
5. 八组回归全绿（含更新后的 1 条断言），console 0 error。
6. 截图：`outputs/teardown-all.png`（全部拉出）、`outputs/teardown-part.png`（单件聚焦）。

## 五、工作量与顺序

| 阶段 | 内容 | 依赖 |
| --- | --- | --- |
| S1 | Blender 改 join 策略 + 导出 + 资产检查 | 无 |
| S2 | 前端数据 + 逐件拆解动画 + 编号 | S1 |
| S3 | 清单 / 规格卡 / 进度 / 全部拆解 | S2 |
| S4 | 交互改为"点击即拆" + 回归更新 | S3 |
| S5 | 网络柜与存储柜套用同一契约 | S4 |

先做 S1–S4（计算柜），确认效果后再复制到另外两类。

## 六、S1 独立验收（2026-11-02 15:00）

由未参与 S1 实施的一方复核。方法：把 `generate_rack.py` 复制到 `work/gen_old_rack.py`，把 join 段改回"整柜按材质合并"，用同一份 Blender 脚本导出基线模型，再与当前 `public/models/server-rack.glb` 逐项对比。

| 指标 | 改造前（基线） | 改造后 | 判定 |
| --- | ---: | ---: | --- |
| 三角形 | 6,432 | 6,432 | 一致 |
| 顶点 | 12,864 | 12,864 | 一致 |
| 世界包围盒 min | (−0.438, 0, −0.575) | (−0.438, 0, −0.575) | 一致 |
| 世界包围盒 max | (0.438, 2.223, 0.575) | (0.438, 2.223, 0.575) | 一致 |
| 网格数 | 10 | 12 | +2（空锚点不产生网格，多的是节点元数据拆出的 mesh 条目） |
| 节点数 | 13 | 17 | +4 |
| 文件字节 | 460,692 | 466,896 | +6,204（+1.3%，来自多份节点/网格元数据） |
| `server_bank` 子节点 | 7 个按材质合并的网格 | 9 个 `part_server_*` + 2 个锚点 | 符合契约 |

逐件校验：`part_server_01…09` 各 7 个 primitive、7 个材质（Brushed aluminum／Graphite steel／Network ports／PCB green／Server chassis／Status LEDs／Ventilation openings），即"按行合并"没有丢掉多材质；`part_server_09` 在 `y=1.891`、`part_server_01` 在 `y=0.251`，步进 0.205，符合 1U 间距。

锚点校验：`part_fan_tray` 的 `translation = [0, 1.94, 0.18]`，与 `DataCenterViewport.jsx` 的 `<FanTray position={[0, 1.94, .18]} />` 逐位相同；`part_pdu` 的 `[-0.51, 0.45, 0.2]` 与 `<RackPdu position={[-.51, .45, .2]} />` 逐位相同。两者的 glTF 节点均无 `mesh` 字段，确认是零三角形锚点。

功能回归：`npm.cmd run build` 通过；八组浏览器回归 **280/280**（playback 20、immersive 44、support 90、present 71、server 16、responsive 25、fallback 10、resources 4），console error 0。现有"整组拆解"仍可用（`TEARDOWN_PARTS.compute` 仍指向 `server_bank`，移动父节点即移动全部子节点），截图 `outputs/s1-compute-open.png`。

### 待 S2 处理的三个已知风险

1. 锚点不会带动画面：`FanTray` / `RackPdu` 是 `model` 的兄弟节点，需要接收同一份偏移。
2. 动画假设基准为 0：`target = .18 + index * .13` 会覆盖节点自带 translation（服务器 0.046、锚点 0.18／0.2），必须改成 `base + offset`。
3. `inspect-assets.py` 只断言 `part_server_*` 有网格，没有断言两个锚点存在且无网格；已在验收时补上这两条。

## 七、S2/S3 首轮验收（2026-11-02 15:55）

**通过项（实测）**

- `part_*` 基准位置：`useMemo` 里 `object.userData.base = object.position.clone()`，动画写 `base.z + (.12 + index * .055)`，不再覆盖基准（源码 68、131 行）。
- 锚点跟随：`<group ref={fanFollow}>` / `<group ref={pduFollow}>` 包裹两个组件，`useFrame` 用 `anchor.position.z - anchor.base.z` 同步（140–148 行）；风扇模块在总览与特写里都确实被带出柜体，说明这条链路成立；组件内没有重复的偏移常量。
- 标签策略：打开默认聚焦 `part_server_01`，实测 **10 个编号点 + 1 个完整标签**；点列表切换后仍是 10+1；规格卡内容正确（「计算服务器 05 / 高度 1U / 形态 机架式 / 供电 双路 550 W」，并标注示例参数）。
- 静止与恢复：展开后间隔 500 ms 两次画布完全一致；「全部合上」后 `.teardown-mode` 归零、标签归零、外壳与服务器复位；切到「持续支撑」自动退出拆解；减少动态效果下 4 帧静止。
- 回归：build 通过，八组 **280/280**，console error 0；1024 宽无横向溢出。

**未通过项（三个，均为"看得见"层面）**

| # | 现象 | 证据 |
| --- | --- | --- |
| 1 | 聚焦机柜 PDU 时，标签整个跑到画布外 | `.teardown-label` 的 `getBoundingClientRect().y = 1053`，视口高 900，`inView=false`；纯净视野下同样 1053。原因是 PDU 标签 `y = base.y = 0.45` 且 `z` 再加 0.55，近距离机位下投影到画面下方 153 px 之外 |
| 2 | 聚焦 PDU 的机位没有对准 PDU | 仍用 `teardown-part-low`（target `[-1.65, .62, 1.45]`，机柜中心）；PDU 在局部 `x=-0.51`、`y=0.45`，投影落在 x≈270，画面左缘被半透明外壳占满，PDU 本体读不出来 |
| 3 | 风扇标签贴住左栏、引线悬空、模块过曝 | 标签 `x=92`，左侧系统栏右缘 `x=90`，只剩 2 px；引线从 `base.x-.08` 到 `labelX+.14`，只有 0.2 世界单位长，和标签之间断开，在特写下是一段孤立虚线；外壳点光（3.2，距风扇约 0.6 m）把风扇烤成一片白 |

**其他发现**

- 标签与编号点统一加 `+0.55` 世界单位前移：对服务器够用，但 PDU 在 `y=0.45` 时这个前移把圆点推到地板上、离柜体约半米，1024 宽截图里「P」点孤零零落在空地。
- 375 宽下所有 3D 标签投影到负 y（画布外），移动端实际只有右侧列表可用。
- 没有任何自动化覆盖：`scripts/` 下没有 `verify-teardown`，以上全部靠截图与 DOM 测量人工核对。

**建议修法**（不影响已通过部分）

1. 标签改为"每件自带锚点 + 屏幕空间偏移"：z 前移从 0.55 降到 0.12–0.15，并在投影后把标签夹进画布内（左右各留 16 px，避开左栏与右面板）。
2. 给 PDU 单独机位：从左前方看，`target` 取 PDU 中心 `[-2.16, .45, 1.52]`，`fov` 30–34，`width` ≈ 1.6；标签 `y` 抬到 1.05 左右。
3. 风扇标签改到右侧或下方，引线连到标签边缘；外壳点光在聚焦风扇时降到 1.6 或把 `distance` 收到 2.2，避免过曝。
4. 补 `verify-teardown`（≥10 项）：11 件全部有节点、聚焦切换、标签在画布内、合上复位、减少动态效果静止、console 0 error。第 3 条"标签在画布内"正好能挡住本次的 PDU 缺陷。

## 八、S4 验收（2026-11-02 21:50）

**结论：通过，可进 S5。** 三条遗留（S2 验收提出）全部落实，两处行为变更中一处建议再调，不阻塞。

### 遗留修复核实

| S2 遗留 | 修法 | 实测 |
| --- | --- | --- |
| PDU 标签跑出画布（y=1053） | 聚焦标注改屏幕空间：`project` 后在 `useFrame` 里夹进画布（避开顶栏／左栏／右面板），SVG 引线单独绘制 | 标签矩形 `(630, 76)`，在视口内；引线端点落在标签边缘 |
| PDU 机位没对准 | 新增 `teardown-part-pdu`：`position [-2.35,1.15,3.0]`、`target [-2.16,.45,1.52]`、`fov 32` | PDU 进入画面；不再借用机柜中心机位 |
| 风扇标签贴左栏、引线断开 | `preferRight` 对风扇强制放右侧；引线端点 clamp 到标签框 | 标签 `(738, 504)`，离左栏 648 px |
| 编号点前移 0.55 掉到地板 | 改为 `+0.14` | 1024／1440 下编号点贴在部件本体上 |
| 风扇过曝 | 聚焦风扇时点光 1.6 / distance 2.2 | 扇叶与轮毂可辨，仍偏白但不再成一片 |

### 回归

`npm.cmd run build` 通过；**九组 333/333**（teardown 52、playback 20、immersive 45、support 90、present 71、server 16、responsive 25、fallback 10、resources 4），console error 0。新增 `verify-teardown.browser.cjs` 的断言是有意义的：标签必须落在 `.viewport` 内且避开左栏／右面板／顶栏，引线与标签边缘误差 ≤1.5 px——正是 S2 那三个缺陷的守门条件，不是走过场。

### 两处行为变更

1. **拆解只在「工作分工」生效** —— 认可。除了「`teardown-mode` 会隐藏 `.workflow-card`、支撑卡片同为该容器」这个测试层面的原因，产品上也成立：协作流程与持续支撑各自需要自己的底部卡片。实测切换到这两个模式后再点设备，`.teardown-mode` 不出现、卡片可见。
2. **选中计算柜后右侧换成拆解面板、「打开服务器内部」入口需先合上** —— 面板替换认可，但把既有入口藏到两步之后不建议。实测 `打开服务器内部` 在拆解态计数为 0，合上后为 1。建议在拆解面板头部（`已拆解 11 / 11` 与「全部合上」旁）直接放一个「进入服务器内部」按钮，仅对 `compute` 且主柜 `C01` 显示。

### 新发现（不阻塞）

- **375 宽下编号点互相压住**：实测 10 个点相邻间距 11–12 px，而点本身 21 px，`F/09/08/…/02` 叠成一串，还与「计算服务器 01」标签重叠。建议画布宽度低于约 520 px 时隐藏编号点，只保留聚焦标签与右侧清单。
- **重复点击同一设备会重置聚焦**：聚焦「机柜 PDU」后再点一次「计算服务器」，规格卡从「机柜 PDU」跳回「计算服务器 01」并重新飞镜头。建议同系统且已展开时保留 `teardownPart` 与机位。
- **风扇标签压住轮毂**：标签放在右侧但仍在模块轮廓内，遮住风扇中心；可把标签再外移 40–60 px。

## 九、S5 实施（2026-11-02）

### 契约

| 机柜 | `part_*` | 三角形 | 字节 |
| --- | --- | ---: | ---: |
| network | 8 件：配线架、跳线、主交换、入口/计算/存储端口组、备用交换、理线区 | 5,748（不变） | 308,160 |
| storage | 7 件：控制器 01/02、磁盘架 01–05 | 9,000（不变） | 571,652 |

- 每件是一个网格、原点在几何中心；`server_bank` 仍是父容器，`enclosure`／`rack_frame` 与共同骨架不变。
- 竖走线槽从理线区移到跳线组：否则理线区的几何中心被拉到 `y≈1.24`，聚焦标签会指向机柜上半部而不是理线面板。

### 前端

- `rackParts` 扩为三类；拆解面板、进度段、清单、规格卡、编号点都按当前机柜的 parts 渲染，计数为 11／8／7。
- 网络柜与存储柜的部件机位统一为 `teardown-network-parts`／`teardown-storage-parts`（整柜近景）。原因：这两柜的部件是宽块，正面逐件近景会被已拉出的前排挡住，编号点也会投出画布。
- 四项遗留：拆解面板头部加「进入服务器内部」（仅 compute 主柜 C01）；画布宽度 <520 px 时隐藏编号点；重复点同一设备保留 `teardownPart` 与机位；风扇标签再外移 50 px。

### 验收

- `npm.cmd run build` 通过；**九组 357/357**（teardown 76、playback 20、immersive 45、support 90、present 71、server 16、responsive 25、fallback 10、resources 4），console error 0。
- `inspect-assets.py` 对三类机柜都校验 `server_bank` 下的 `part_*`；只有计算柜的两个锚点允许无网格。
- 截图：`outputs/teardown-network.png`、`outputs/teardown-storage.png`、`outputs/teardown-click-compute.png`。
