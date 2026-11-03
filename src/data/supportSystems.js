// Teaching model for the two continuous support systems. Power follows the
// utility feed -> UPS -> distribution -> busway -> rack PDU -> server PSU chain;
// cooling follows the raised-floor loop. Coordinates are world-space and match
// the room assets; every step lists the exact polyline it draws.
export const SUPPORT_STEP_DURATION = 5600;

export const supportColors = {
  power: '#fbbf24',
  powerBright: '#fde68a',
  cold: '#22d3ee',
  warm: '#fb923c',
  warmDeep: '#c2410c',
  dim: '#64748b',
};

const FEED = [4.62, 1.3, -4.66];
const UPS_TOP = [2.6, 1.99, -3.65];
const DIST_TOP = [3.9, 1.99, -3.65];
const BUS = [3.9, 2.94, -.27];
const TAP = [-1.65, 2.94, -.27];
const RACK_PDU = [-2.24, 1.7, .85];
const PSU = [-1.75, .5, 1.35];
const CRAC1 = [-4.55, 0, -3.65];
const CRAC2 = [-3.12, 0, -3.65];

export const supportNodes = {
  feed: {
    name: '上游电源引入', system: 'power', anchor: FEED, label: [4.55, 1.92, -4.26], frame: [.56, .78, .24],
    role: '两路市电分别从这两个进线箱进入机房：A 路经 ATS 送到 UPS 主输入，B 路直接送到 UPS 旁路输入。',
    input: '来自外部电网的高压或低压电力', output: '送往 UPS 输入端的电力',
    partners: 'UPS、配电柜与机房总进线保护',
    short: '外部电力进入机房',
  },
  ups: {
    name: 'UPS 不间断电源', system: 'power', anchor: [2.6, 1.5, -3.26], label: [2.6, 2.3, -3.3], frame: [1.06, 1.94, .98],
    role: 'UPS 稳定输入电力，并在上游中断时用电池短时接管，为关键负载争取时间。',
    input: '上游电源引入的交流电', output: '稳定、连续的交流电，送往配电柜',
    partners: '上游电源、配电柜与电池组',
    short: '稳压与短时后备',
  },
  distribution: {
    name: '配电柜', system: 'power', anchor: [3.9, 1.5, -3.26], label: [3.95, 2.3, -3.3], frame: [1.06, 1.94, .96],
    role: '配电柜把 UPS 送来的电力分成多条带保护的回路，分别送往不同区域和机柜列。',
    input: 'UPS 输出的稳定电力', output: '按回路分开、带断路保护的电力',
    partners: 'UPS、机房配电母线与各机柜 PDU',
    short: '分成多条受保护回路',
  },
  busway: {
    name: '机房配电母线', system: 'power', anchor: [.55, 2.86, -.27], label: [.55, 3.06, -.27], frame: [1.4, .3, .36],
    role: '母线沿机柜列上方敷设，把配电柜的回路送到每台机柜上方，再由插接箱取电。',
    input: '配电柜送出的回路电力', output: '送到各机柜上方的分支电力',
    partners: '配电柜与各机柜 PDU',
    short: '把回路送到机柜上方',
  },
  rackPdu: {
    name: 'C01 机柜 PDU', system: 'power', anchor: [-2.24, 1.15, .85], label: [-2.32, 1.86, 1.24], frame: [.22, 1.32, .26],
    role: '机柜 PDU 装在机柜侧面，把一条回路分成多个插座回路，供柜内每台设备分别取电。',
    input: '母线与插接箱送来的机柜回路', output: '分配到各设备电源模块的插座回路',
    partners: '配电母线、服务器与网络设备的电源模块',
    short: '把回路分到每个设备插座',
  },
  psu: {
    name: '设备电源模块', system: 'power', anchor: [-1.75, .52, 1.3], label: [-1.5, 1.02, 1.5], frame: [.34, .26, .2],
    role: '设备电源模块把交流电转换成设备内部需要的直流电，再分配给主板、处理器和硬盘。',
    input: '机柜 PDU 送来的交流电', output: '设备内部可用的直流电',
    partners: '机柜 PDU、服务器主板与内部部件',
    short: '转换成设备内部用电',
  },
  crac: {
    name: '制冷设备', system: 'cooling', anchor: [-3.12, 1.4, -3.2], label: [-3.05, 2.34, -3.1], frame: [1.2, 1.94, 1.04],
    role: '制冷设备让回风经过盘管进行热交换，把热量带走，再送出调节后的冷空气。风扇只负责推动空气。',
    input: '从设备排风侧回来的较热空气', output: '经过降温、送往架空地板的冷空气',
    partners: '架空地板、送风口与机房回风路径',
    short: '与回风进行热交换',
  },
  plenum: {
    name: '架空地板送风层', system: 'cooling', anchor: [-4.42, .18, .55], label: [-3.75, .58, .95], frame: [.5, .18, 1.1],
    role: '地板下的空间形成送风静压层，把制冷设备送出的冷空气均匀分布到各个送风口。',
    input: '制冷设备送出的冷空气', output: '分配到各送风口的冷空气',
    partners: '制冷设备与地板送风口',
    short: '把冷空气分布到各风口',
  },
  vent: {
    name: '地板送风口', system: 'cooling', anchor: [-1.65, .06, 1.9], label: [-1.65, .64, 2.3], frame: [.8, .12, .7],
    role: '带孔的地板砖让冷空气从静压层向上进入冷通道，正对机柜的进风侧。',
    input: '静压层中分布的冷空气', output: '进入冷通道、流向设备进风侧的冷空气',
    partners: '静压层与机柜进风侧',
    short: '冷空气进入冷通道',
  },
  deviceFan: {
    name: '设备风扇', system: 'cooling', anchor: [-1.65, 2.02, 1.14], label: [-.95, 2.46, 1.5], frame: [.82, .22, .66],
    role: '机柜与服务器内的风扇建立气流，把冷空气从进风侧吸过部件。风扇推动空气，不负责降温。',
    input: '冷通道中的冷空气', output: '流过设备内部部件的空气',
    partners: '送风口、设备进风侧与制冷设备',
    short: '把冷空气推过设备',
  },
  rackAir: {
    name: '设备内部气流', system: 'cooling', anchor: [-1.65, 1.62, .62], label: [-1.3, 1.72, .72], frame: [.8, 1.3, .9],
    role: '空气流过处理器、内存和电源等发热部件，吸收热量后温度升高。',
    input: '被风扇推入的冷空气', output: '吸收热量后的较热空气',
    partners: '设备风扇与排风侧',
    short: '空气经过部件吸热',
  },
  exhaust: {
    name: '设备排风侧', system: 'cooling', anchor: [-1.65, 1.72, -.12], label: [-1.5, 2.02, .08], frame: [.9, 1.0, .34],
    role: '较热的空气从机柜背面离开设备，进入两排机柜之间的热通道。',
    input: '设备内部吸热后的空气', output: '进入热通道、向上抬升的较热空气',
    partners: '设备内部气流与回风路径',
    short: '热空气离开机柜',
  },
  return: {
    name: '回风路径', system: 'cooling', anchor: [-3.3, 2.45, -.27], label: [-3.9, 2.82, -.1], frame: [1.1, .32, .36],
    role: '热通道里的较热空气上升，经机房上部的回风路径返回制冷设备，再次参与热交换。',
    input: '热通道中上升的较热空气', output: '回到制冷设备的回风',
    partners: '排风侧与制冷设备',
    short: '较热空气回到制冷设备',
  },
};

const powerSteps = [
  {
    title: '上游电源进入机房', short: '电源引入', owner: '上游电源引入箱', camera: 'power-feed',
    active: ['feed'], paths: [{ points: [FEED, [4.62, 2.42, -4.6], [4.62, 2.52, -4.5], [2.6, 2.52, -4.5], [2.6, 2.52, -3.75], [2.6, 2.02, -3.72]], tone: 'power' }],
    text: '外部电力先进入机房的两个上游进线箱：A 路经 ATS 送到 UPS 主输入，B 路直接接到旁路输入。任何一路失电，UPS 仍有一路可用。',
    input: '外部电网的交流电', output: '送到 UPS 输入端的电力',
    partners: 'UPS 与机房总进线保护',
  },
  {
    title: 'UPS 稳定并保障电力', short: 'UPS 稳压', owner: 'UPS 不间断电源', camera: 'power-ups',
    active: ['ups'], persistent: true, paths: [{ points: [[2.6, 1.06, -3.24], [2.6, 1.5, -3.24], [2.6, 1.95, -3.32]], tone: 'power' }],
    text: 'UPS 稳定输入电压，并在上游中断时由电池短时接管。它把连续、稳定的电力交给配电柜，因此网络、计算和存储不会因为一次切换而断电。',
    input: '上游电源引入的交流电', output: '稳定连续的交流电，送往配电柜',
    partners: '上游电源与配电柜',
  },
  {
    title: '配电柜分成多条回路', short: '配电分路', owner: '配电柜', camera: 'power-pdu',
    active: ['ups', 'distribution'], paths: [{ points: [UPS_TOP, [2.6, 2.3, -3.65], [3.9, 2.3, -3.65], DIST_TOP], tone: 'power' }],
    text: '配电柜把 UPS 送来的电力分成多条回路，每条回路都有自己的断路器。一路出问题只影响一条回路，不会让整个机房同时失去电力。',
    input: 'UPS 输出的稳定电力', output: '按回路分开的受保护电力',
    partners: 'UPS 与机房配电母线',
  },
  {
    title: '母线把回路送到机柜上方', short: '母线下送', owner: '机房配电母线', camera: 'busway-up',
    active: ['distribution', 'busway'], paths: [{ points: [DIST_TOP, [3.9, 2.94, -3.65], BUS, TAP], tone: 'power' }],
    text: '母线沿机柜列上方敷设，把回路送到每台机柜上方。插接箱从母线取电，再用电缆引到机柜。这样机柜可以增减，而不用重新铺设整条线路。',
    input: '配电柜送出的回路电力', output: '各机柜上方的分支电力',
    partners: '配电柜与各机柜 PDU',
  },
  {
    title: '机柜 PDU 分成插座回路', short: '机柜 PDU', owner: 'C01 机柜 PDU', camera: 'rack-front',
    active: ['busway', 'rackPdu'], paths: [{ points: [TAP, [-1.65, 2.6, -.02], [-2.24, 2.42, .55], RACK_PDU], tone: 'power' }],
    text: '机柜 PDU 装在机柜侧面，把一条机柜回路分成多个插座回路。柜内每台设备都有自己的取电点，维护一台设备时不必断开整个机柜。',
    input: '母线插接箱送来的机柜回路', output: '分配到各设备插座的回路',
    partners: '配电母线与设备电源模块',
  },
  {
    title: '设备电源模块转换成内部用电', short: '设备电源', owner: 'C01 的服务器电源模块', camera: 'rack-front',
    active: ['rackPdu', 'psu'], paths: [{ points: [[-2.24, .58, .85], [-2.2, .48, 1.06], [-1.95, .45, 1.28], PSU], tone: 'power' }],
    text: '设备电源模块把交流电转换成服务器内部使用的直流电，再分配给主板、处理器和硬盘。到这里，电力才真正变成设备可以使用的形式。',
    input: '机柜 PDU 送来的交流电', output: '设备内部的直流电',
    partners: '机柜 PDU 与服务器内部部件',
  },
];

const coolingSteps = [
  {
    title: '制冷设备进行热交换', short: '热交换', owner: '制冷设备', camera: 'cool-crac',
    active: ['crac'], persistent: true,
    paths: [
      { points: [[-3.12, 2.5, -2.55], [-3.12, 2.12, -2.92], [-3.12, 1.74, -3.06]], tone: 'warm' },
      { points: [[-3.12, .42, -3.14], [-3.12, .26, -3.02], [-3.12, .1, -2.92]], tone: 'cold' },
    ],
    text: '较热回风从上部的回风格栅进入制冷设备，经过盘管时把热量交给冷媒，变成冷空气后从下部送到架空地板。风扇只负责推动空气。',
    input: '从设备排风侧回来的较热空气', output: '经过降温的冷空气',
    partners: '架空地板与回风路径',
  },
  {
    title: '冷空气进入架空地板', short: '地板送风', owner: '架空地板送风层', camera: 'floor-low',
    active: ['crac', 'plenum'],
    paths: [{ points: [[-4.55, .16, -3.02], [-4.55, .16, -2.92], [-4.45, .16, -2.86], [-4.45, .16, 1.9], [2.6, .16, 1.9]], tone: 'cold' }],
    text: '冷空气进入地板下方的送风静压层，沿机柜列向前分布。静压层让每个送风口都能得到比较均匀的冷空气。',
    input: '制冷设备送出的冷空气', output: '分配到各送风口的冷空气',
    partners: '制冷设备与地板送风口',
  },
  {
    title: '送风口把冷风送入冷通道', short: '送风口', owner: '地板送风口', camera: 'cool-vent',
    active: ['plenum', 'vent'],
    paths: [{ points: [[-4.45, .16, 1.9], [-1.65, .16, 1.9], [-1.65, .7, 1.9], [-1.65, 1.1, 1.9], [-1.65, 1.36, 1.34]], tone: 'cold' }],
    text: '带孔的地板砖让冷空气向上进入冷通道。送风口正对机柜的进风侧，冷空气因此在被吸入之前不会被排风混合。',
    input: '静压层中的冷空气', output: '进入冷通道的冷空气',
    partners: '静压层与机柜进风侧',
  },
  {
    title: '设备风扇吸入冷空气', short: '设备风扇', owner: '机柜与服务器风扇', camera: 'cold-aisle',
    active: ['vent', 'deviceFan'],
    paths: [{ points: [[-1.65, 1.5, 1.3], [-1.65, 1.86, 1.2], [-1.65, 2.02, 1.14]], tone: 'cold' }],
    text: '风扇在机柜内建立气流，把冷通道里的空气从进风侧吸进设备。风扇只推动空气，真正带走热量的是制冷设备的盘管。',
    input: '冷通道中的冷空气', output: '被推入设备内部的空气',
    partners: '送风口、设备进风侧与制冷设备',
  },
  {
    title: '空气经过部件并吸收热量', short: '空气吸热', owner: '服务器内部部件', camera: 'cool-air',
    active: ['deviceFan', 'rackAir'],
    paths: [
      { points: [[-1.65, 2.02, 1.08], [-1.65, 1.8, .92], [-1.65, 1.66, .74]], tone: 'cold' },
      { points: [[-1.65, 1.64, .74], [-1.65, 1.6, .44], [-1.65, 1.56, .14]], tone: 'warm' },
    ],
    transition: [[-1.65, 2.02, 1.08], [-1.65, 1.86, .98], [-1.65, 1.74, .86], [-1.65, 1.66, .74], [-1.65, 1.61, .50], [-1.65, 1.58, .30], [-1.65, 1.56, .14]],
    text: '空气依次流过处理器、内存和电源等发热部件，吸收热量后温度升高。颜色在这里由青色变为暖色，表示空气变热，而不是空气本身被消耗。',
    input: '被风扇推入的冷空气', output: '吸收热量后的较热空气',
    partners: '设备风扇与排风侧',
  },
  {
    title: '较热空气从排风侧离开', short: '排风离开', owner: '机柜排风侧', camera: 'hot-aisle',
    active: ['rackAir', 'exhaust'],
    paths: [{ points: [[-1.65, 1.56, .1], [-1.65, 1.92, -.12], [-1.65, 2.45, -.24]], tone: 'warm' }],
    text: '较热的空气从机柜背面进入两排机柜之间的热通道。机柜朝向决定了进风在正面、排风在背面，箭头方向与这个关系一致。',
    input: '设备内部吸热后的空气', output: '进入热通道的较热空气',
    partners: '设备内部气流与回风路径',
  },
  {
    title: '回风返回制冷设备', short: '回风返回', owner: '机房回风路径', camera: 'hot-aisle',
    active: ['exhaust', 'return'],
    paths: [{ points: [[-1.65, 2.45, -.27], [-3.9, 2.45, -.27], [-4.45, 2.48, -.3], [-4.45, 2.95, -.36], [-4.55, 2.95, -3.02], [-4.55, 1.96, -3.12]], tone: 'warm' }],
    text: '热通道里的空气上升，经机房上部的回风路径回到制冷设备。空气在制冷设备中放热变冷，再进入架空地板，形成持续的循环。',
    input: '热通道中上升的较热空气', output: '回到制冷设备的回风',
    partners: '排风侧与制冷设备',
  },
];

// The chain now starts at the transfer switch on the exterior platform: the
// utility feed and the standby genset meet there and only one of them reaches the
// UPS. The genset's own cable stays static (see PowerExterior) because it carries
// current only during an outage.
export const powerChain = [[6.42, 1.5, -3.92], [6.02, 1.66, -4.12], [5.52, 1.84, -4.36], [5.02, 1.96, -4.54], [4.62, 2.02, -4.63], [4.62, 2.42, -4.6], [4.62, 2.52, -4.5], [2.6, 2.52, -4.5], [2.6, 2.52, -3.75], [2.6, 2.02, -3.72], [2.6, 1.99, -3.65], [2.6, 2.3, -3.65], [3.9, 2.3, -3.65], [3.9, 2.94, -3.65], [3.9, 2.94, -.27], TAP, [-1.65, 2.6, -.02], [-2.24, 2.42, .55], [-2.24, 1.72, .85], [-2.24, .58, .85], [-2.2, .48, 1.06], [-1.95, .45, 1.28], PSU];

// 市电 B 直接进 UPS 的旁路输入，不经过 ATS。主路（市电 A → ATS → UPS）已经由
// powerChain 表达，这一条是第二条独立电源，因此画得细一些、慢一些。
export const powerChainB = [[2.2, 1.3, -4.66], [2.2, 1.95, -4.58], [2.2, 2.1, -3.34], [2.5, 2.1, -3.2], [2.6, 1.88, -3.14]];

export const RACK_COLUMNS = [
  { x: -3.65, z: .65 }, { x: -1.65, z: .65 }, { x: -.3, z: .65 }, { x: 2.1, z: .65 }, { x: 3.55, z: .65 },
  { x: -3.65, z: -1.15 }, { x: -1.65, z: -1.15 }, { x: -.3, z: -1.15 },
];

export const VENTS = [
  ...[-3.65, -1.65, -.3, 2.1, 3.55].map((x) => ({ x, z: 1.9, row: 'front' })),
  ...[-3.65, -1.65, -.3].map((x) => ({ x, z: -2.45, row: 'rear' })),
];

export const coolingBase = {
  supply: [
    [[-4.55, .16, -3.02], [-4.55, .16, -2.92], [-4.45, .16, -2.86], [-4.45, .16, 1.9], [3.9, .16, 1.9]],
    [[-3.12, .16, -3.02], [-3.12, .16, -2.92], [-2.95, .16, -2.86], [-2.95, .16, -2.45], [3.9, .16, -2.45]],
  ],
  branch: VENTS.map(({ x, z, row }) => row === 'front'
    ? [[x, .16, z], [x, .7, z], [x, 1.1, z], [x, 1.36, z - .56]]
    : [[x, .16, z], [x, .7, z], [x, 1.1, z], [x, 1.36, z + .62]]),
  exhaust: RACK_COLUMNS.map(({ x, z }) => z > 0
    ? [[x, 1.56, z - .55], [x, 1.92, -.12], [x, 2.45, -.24]]
    : [[x, 1.56, z + .55], [x, 1.92, -.48], [x, 2.45, -.32]]),
  return: [[3.55, 2.45, -.27], [-4.45, 2.45, -.27], [-4.45, 2.95, -.36], [-4.55, 2.95, -3.02], [-4.55, 1.96, -3.12]],
};

export const supportChapters = [
  {
    id: 'power', title: '供电', system: 'power', layer: 'power',
    caption: '上游电源 → UPS → 配电柜 → 母线 → 机柜 PDU → 设备电源',
    summary: '电力从上游进入机房，经 UPS 稳定、配电柜分路、母线送到机柜，最后由机柜 PDU 分到每台设备的电源模块。',
    steps: powerSteps, nodes: ['feed', 'ups', 'distribution', 'busway', 'rackPdu', 'psu'],
    persistent: ['ups', 'distribution'],
    note: '琥珀色路径只表示供电关系与逻辑方向，箭头速度不代表真实电流速度，也不模拟电网故障、UPS 切换或电池充放电时序。',
  },
  {
    id: 'cooling', title: '制冷', system: 'cooling', layer: 'cooling',
    caption: '制冷设备 → 架空地板 → 送风口 → 设备进风 → 回风',
    summary: '制冷设备把回风降温后送入架空地板，冷空气从送风口进入冷通道，被设备风扇吸过部件吸热，再从排风侧回到制冷设备。',
    steps: coolingSteps, nodes: ['crac', 'plenum', 'vent', 'deviceFan', 'rackAir', 'exhaust', 'return'],
    persistent: ['crac', 'deviceFan'],
    note: '青色表示冷空气，暖色表示吸热后的回风。路径与标记是工作原理示意，不是流体仿真，也不代表真实温度场或制冷功率。',
  },
];

export const chapterById = Object.fromEntries(supportChapters.map((chapter) => [chapter.id, chapter]));
