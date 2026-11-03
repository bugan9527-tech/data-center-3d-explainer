// Internal parts of the power and cooling devices. Numbers are teaching
// examples, not product ratings. `offset` is where the part slides when the
// equipment is opened (device-local metres); the door moves sideways so it does
// not stand between the camera and the modules behind it.
export const infraParts = {
  ups: [
    { id: 'part_ups_battery', tag: '01', name: '电池模块组', specs: { 形式: '抽屉式', 位置: '下半柜', 散热: '前部通风格栅' }, role: '市电中断时短时供电，等切换或停机', offset: [0, -.08, .34], label: [.95, .8, .5] },
    { id: 'part_ups_control', tag: '02', name: '控制与旁路面板', specs: { 显示: '状态屏', 旁路: '手动旋钮', 指示: '3 个状态灯' }, role: '显示运行状态，并可切到旁路检修', offset: [0, .12, .66], label: [.7, 1.62, .78] },
    { id: 'part_ups_door', tag: '03', name: '前门与把手', specs: { 形式: '双开门', 用途: '维护通道', 锁: '机械锁' }, role: '打开后可以接触电池与功率模块', offset: [-.8, 0, .16], label: [-1.25, 1.35, .34] },
    { id: 'part_ups_cabinet', tag: '04', name: '柜体与进线', specs: { 进线: '柜顶引入', 尺寸: '示例 800 mm 宽', 接地: '柜体接地' }, role: '承托模块并把电缆从顶部引入', offset: [0, 0, 0], label: [-.4, 2.08, .1] },
  ],
  distribution: [
    { id: 'part_dist_breakers', tag: '01', name: '断路器排', specs: { 回路: '3 排 × 6 位', 安装: 'DIN 导轨', 标识: '相色标签' }, role: '把一路进线分成多条回路，可单独断开', offset: [0, .05, .38], label: [0, 1.62, .52] },
    { id: 'part_dist_switch', tag: '02', name: '总开关', specs: { 形式: '手动操作', 位置: '柜门左下', 用途: '整柜断电' }, role: '检修时一次性切断整柜电源', offset: [0, -.08, .62], label: [-.95, 1.0, .72] },
    { id: 'part_dist_meter', tag: '03', name: '计量表', specs: { 显示: '电流／电压', 位置: '柜门上部', 数据: '本地读数' }, role: '显示这一路的用电情况', offset: [0, .3, .52], label: [.7, 1.86, .6] },
    { id: 'part_dist_door', tag: '04', name: '柜门与把手', specs: { 形式: '单开门', 位置: '柜前', 锁: '机械锁' }, role: '打开后可以操作断路器与总开关', offset: [-.8, 0, .16], label: [-1.25, 1.35, .34] },
    { id: 'part_dist_cabinet', tag: '05', name: '柜体与母线', specs: { 进线: '底部引入', 母线: '柜内铜排', 尺寸: '示例 800 mm 宽' }, role: '承托开关并把电力送到出线回路', offset: [0, 0, 0], label: [-.4, 2.06, .1] },
  ],
  // The exterior set is primitive geometry, not GLB nodes, so its offsets are read
  // by PowerExterior directly instead of by the generic Infra teardown.
  genset: [
    { id: 'part_genset', tag: '01', name: '柴油发电机组', specs: { 形态: '隔声罩机组', 散热: '端部散热器（示例）', 位置: '室外平台' }, role: '市电中断时启动，经 ATS 接管 UPS 主输入', offset: [1.05, 0, 0], label: [0, 0, 0] },
    { id: 'part_ats', tag: '02', name: 'ATS 自动转换开关', specs: { 切换: '双电源互锁（示例）', 位置: '平台靠墙一侧', 指示: '两路电源状态' }, role: '在两路电源之间选择一路送出，避免同时并联', offset: [.85, 0, .95], label: [0, 0, 0] },
    { id: 'part_tank', tag: '03', name: '日用油箱', specs: { 容量: '示例 1 m³', 位置: '机组旁', 附件: '液位计与出油管' }, role: '储存机组运行时需要的燃油', offset: [.55, 0, 1.45], label: [0, 0, 0] },
  ],
  crac: [
    { id: 'part_crac_fans', tag: '01', name: '回风风扇', specs: { 数量: '2 台', 位置: '顶部回风口', 作用: '抽回热空气' }, role: '把机柜排出的热空气抽回机组', offset: [0, .2, .5], label: [0, 2.1, .6] },
    { id: 'part_crac_coil', tag: '02', name: '盘管与滤网', specs: { 形式: '翅片盘管', 位置: '风扇下方', 换热: '水或冷媒' }, role: '在这里把热量交给冷媒，空气变冷', offset: [0, 0, .68], label: [-.95, 1.4, .78] },
    { id: 'part_crac_control', tag: '03', name: '控制与检修门', specs: { 显示: '运行状态', 位置: '机组中段', 检修: '前检修门' }, role: '设定送风状态并方便打开检修', offset: [.62, -.4, .34], label: [.95, .95, .48] },
    { id: 'part_crac_cabinet', tag: '04', name: '柜体与送风口', specs: { 送风: '下部出风', 接入: '架空地板', 尺寸: '示例 1.1 m 宽' }, role: '把冷空气送进地板静压箱', offset: [0, 0, 0], label: [-.9, 1.3, .12] },
  ],
};

export const infraDevices = {
  power: [
    { id: 'ups', name: 'UPS', camera: 'teardown-ups' },
    { id: 'distribution', name: '配电柜', camera: 'teardown-distribution' },
    { id: 'genset', name: '柴油发电机', camera: 'teardown-genset' },
  ],
  cooling: [{ id: 'crac', name: '制冷设备', camera: 'teardown-crac' }]
};
