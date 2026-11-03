# 文档索引

本项目的文档经历了五个阶段的迭代，过程文档很多。这份索引说明**哪些是现行依据、哪些只是过程记录**，避免照抄过时计数或已废弃的界面口径。

权威顺序：`README.md`（现状与范围）→ `docs/PROJECT_PLAN.md`（教学边界）→ 本索引列出的现行文档 → `docs/archive/`（过程记录，仅作参考）。

## 现行文档

| 文档 | 作用 | 什么时候读 |
| --- | --- | --- |
| [`README.md`](../README.md) | 已实现内容、工程结构、验证方式、范围限制 | 任何改动的第一步 |
| [`PROJECT_PLAN.md`](PROJECT_PLAN.md) | 工程定位、八类系统的教学边界 | 判断"这个功能该不该做" |
| [`ASSET_GUIDE.md`](ASSET_GUIDE.md) | GLB 节点契约、Blender 脚本、资产统计、运行时贴图 | 改模型、加设备、动 `part_*` |
| [`TWIN_BATCH_B_SPEC.md`](TWIN_BATCH_B_SPEC.md) | 网络柜补全与三张网：填空档而非重排 U 位的理由 | 改 `network-rack` 或 N01 内部 |
| [`TWIN_BATCH_C_SPEC.md`](TWIN_BATCH_C_SPEC.md) | 备用电力与室外平台：选址推导与口径冲突记录 | 改供电链、室外几何 |
| [`TWIN_BATCH_D_SPEC.md`](TWIN_BATCH_D_SPEC.md) | 备份与容灾：B01 为何独立成柜 | 改备份柜或加系统 |
| [`TWIN_UPGRADE_REVIEW.md`](TWIN_UPGRADE_REVIEW.md) | 需求书逐项对账、"模拟数据 + 逐处标注"的决策来源 | 讨论要不要加指标、告警、图层 |
| [`BUILD_STEPS.md`](BUILD_STEPS.md) | 做出这个项目的九个关键步骤、十个坑、复刻检查表 | 想照着做一遍的时候 |
| [`concepts/`](concepts/) | 视觉方向参考图 | 只看方向，不作为功能证据 |

## 历史归档 `docs/archive/`

归档文档开头都带"历史归档"横幅。它们记录了当时的任务书、实测数据与踩过的坑，**计数、文件路径、界面描述可能已被取代**，引用前先对照 `README.md` 与代码。

| 归档文档 | 内容 | 为什么过时 |
| --- | --- | --- |
| `SETUP_STATUS.md` | 最初八柜状态验证 | 机柜已扩到九个（含 B01），HUD 已重做 |
| `DESIGN_BRIEF.md` | 浅色工程教学风格方向 | 现行界面是深色数字孪生 HUD |
| `IMMERSIVE_VALIDATION.md` | 沉浸布局与六章节镜头 | 现为三栏 HUD + 纯净视野，章节条已取消 |
| `REQUEST_FLOW_VALIDATION.md` | 11 阶段请求流程首次落地 | 回归脚本与项数已全部重编 |
| `SERVER_VALIDATION.md` | 服务器内部六部件 | 同上 |
| `SUPPORT_VALIDATION.md` | 供电 6 步／制冷 7 步首次落地 | 同上 |
| `VIDEO_REFERENCE_PLAN.md` | 参考智慧农业视频的转化方案 | 第一阶段方案，后续已重排 |
| `VISUAL_UPGRADE_PLAN.md` | 视觉与镜头优化方案与执行记录 | S0–S10 已全部落地并入 README |
| `UPGRADE_PROMPTS.md` | 视觉优化的十步提示词原文 | 含"不做任何读数"的旧口径 |
| `FLOW_VISUAL_PLAN.md` | 流动表现的四条根因与 P0–P2 记录 | 已实施完毕 |
| `FLOW_PROMPTS.md` | 流动优化的提示词原文 | 同上，且含旧口径 |
| `TEARDOWN_PLAN.md` | 逐件拆解方案与三处验收遗留 | 已实施完毕 |
| `TEARDOWN_PROMPTS.md` | 逐件拆解的提示词原文 | 同上 |
| `TEARDOWN.md` | 拆解视图第一版说明 | 部件清单已抽到 `rackParts.js`／`infraParts.js` |
| `TWIN_BATCH_A_SPEC.md` | 消防与安防的坐标基准 | 状态行"未实施"已过时，批次已落地 |
| `HANDOFF.md` | 视觉优化的交接提示词与进度快照 | 快照停留在四模式／346 项时代 |
| `PROMPTS_RETRO.md` | 本项目五阶段的提示词复盘（有效／失效写法） | 面向回顾，不是上手手册 |
| `PROMPTS_FLOW.md` | "六段提示词"流程草稿 | 反馈是不可复制，已被 `BUILD_STEPS.md` 取代 |

## 文档约定

1. **计数不写进提示词正文**。检查项会随脚本增减漂移（历史上出现过 280／286／333／346／357／179+34 六种口径），现行做法是只写命令，交付时贴脚本实际输出。
2. **每轮改动必须回写 `README.md`**。范围限制、已实现条目、脚本清单三处最容易漏。
3. **归档只增不删**。旧文档移入 `docs/archive/` 并加横幅，保留判断依据。
4. **截图归档在 `outputs/archive/`**，`outputs/` 根目录只放当前回归产物（`verification-*.json`、`*-check.log`、`twin-*.png` 等）。
