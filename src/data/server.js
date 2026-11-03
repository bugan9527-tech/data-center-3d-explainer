// Original teaching content. Coordinates use the exported glTF Y-up convention.
export const serverParts = [
  { id: 'nic', name: '网卡', subtitle: '网络的出入口', icon: 'network',
    responsibility: '把网络上的请求交给服务器，再把处理结果发回去。网卡是服务器连接网络的接口。',
    partners: '通过主板上的扩展插槽与 CPU、内存交换数据，并连接机房网络。',
    stages: ['接收“读取并处理文件”的请求，把请求交给服务器。', '配合 CPU 传递请求信息，等待后续数据。', '通过机房网络接收外部存储系统送来的文件数据。', '等待 CPU 完成处理。', '把处理结果送回发起请求的用户。'],
    anchor: [-1.75,.85,-.85], label: [-1.4,1.2,-1.5], offset: [-.75,.55,-.35] },
  { id: 'cpu', name: 'CPU', subtitle: '中央处理器', icon: 'chip',
    responsibility: '按照程序的指令进行计算和控制。上方的金属散热片帮助把 CPU 产生的热量传出去。',
    partners: '通过主板与内存、网卡配合；由电源供电，由散热片和风扇帮助散热。',
    stages: ['准备处理网卡送来的请求。', '执行应用程序，识别要读取哪份文件、如何处理。', '发起读取请求，等待所需数据进入内存。', '读取内存中的文件数据，按照程序完成处理，并把结果放回内存。', '组织响应，让网卡把结果返回。'],
    anchor: [-.62,.85,-.05], label: [-.7,1.02,-.05], offset: [-.25,1.12,0] },
  { id: 'memory', name: '内存', subtitle: '临时工作区', icon: 'memory',
    responsibility: '临时存放正在使用的程序、文件数据和处理结果，方便 CPU 快速取用。内存不是断电后仍长期保存文件的地方。',
    partners: '通过主板与 CPU 交换数据；接收从存储系统读入的数据。',
    stages: ['为这次任务提供临时工作空间。', '存放 CPU 正在使用的程序和请求信息。', '接收从外部存储读来的文件数据，供 CPU 使用。', '为 CPU 提供文件数据，并暂存处理结果。', '暂存等待网卡发送的处理结果。'],
    anchor: [.95,.85,0], label: [1.4,1.02,.1], offset: [.6,.65,.1] },
  { id: 'motherboard', name: '主板', subtitle: '部件连接的基础', icon: 'board',
    responsibility: '承载插槽、接口和连接线路，让 CPU、内存、网卡等部件交换数据，并分配来自电源的电力。计算任务由 CPU 执行。',
    partners: '连接 CPU、内存、网卡、电源和风扇。这里的路径表示逻辑协作，不是实际电路走线。',
    stages: ['提供网卡与其他部件之间的连接。', '提供 CPU 与内存之间的连接和电力分配。', '提供文件数据进入内存所需的部件连接。', '提供 CPU 与内存交换数据的连接。', '提供 CPU、内存与网卡之间的连接。'],
    anchor: [0,.28,.65], label: [-1.45,.4,.8], offset: [0,.18,0] },
  { id: 'psu', name: '电源模块', subtitle: '持续提供电力', icon: 'power',
    responsibility: '把机房送来的电力转换成服务器内部部件需要的直流电。图中两块电源模块是常见的双模块布局示意。',
    partners: '连接机房供电系统，并向主板、CPU、内存、网卡和风扇供电。',
    stages: Array(5).fill('持续向各部件供电，支撑整个处理过程，不是只在某一步工作。'),
    anchor: [1.3,.7,-1.4], label: [1.4,.85,-1.65], offset: [.7,.4,-.55] },
  { id: 'fans', name: '风扇', subtitle: '持续推动空气散热', icon: 'fan',
    responsibility: '推动空气穿过机箱和散热片，把部件产生的热量带走。这里用前部风扇组展示从前到后的通风关系。',
    partners: '配合 CPU 散热片、机箱风道与机房制冷；由电源供电。',
    stages: Array(5).fill('持续推动空气带走热量，支撑各部件工作；不随数据处理阶段开关。'),
    anchor: [0,.8,1.35], label: [0,1.02,1.65], offset: [0,.25,1.05] },
];
export const partById = Object.fromEntries(serverParts.map((part) => [part.id, part]));
export const serverWorkflow = [
  { title: '网卡接收请求', short: '接收请求', kind: 'request', focus: 'nic', active: ['nic','motherboard'], route: ['user','nic'], text: '用户发来“读取并处理一份文件”的请求。网卡接收网络信息，并通过主板连接交给服务器。' },
  { title: 'CPU 执行程序', short: '执行程序', kind: 'request', focus: 'cpu', active: ['cpu','memory','motherboard'], route: ['nic','cpu'], text: 'CPU（中央处理器）按照应用程序的指令，确定要读取的文件和处理方式。内存提供程序正在使用的临时工作区。' },
  { title: '读取数据到内存', short: '读入内存', kind: 'data', focus: 'memory', active: ['nic','memory','motherboard'], route: ['storage','nic','memory'], text: 'CPU 发起读取请求。外部存储系统长期保存文件；所需数据通过网络和网卡读入内存，供本次处理使用。' },
  { title: 'CPU 处理内存数据', short: '处理数据', kind: 'data', focus: 'cpu', active: ['cpu','memory','motherboard'], route: ['memory','cpu'], text: 'CPU 取用内存中的文件数据，按照程序完成处理。处理结果也会暂存在内存中，等待发送。' },
  { title: '网卡返回结果', short: '返回结果', kind: 'result', focus: 'nic', active: ['nic','cpu','memory','motherboard'], route: ['cpu','memory','nic','user'], text: 'CPU 组织响应，网卡把内存中暂存的结果通过网络发回用户。本次请求结束，电源和风扇仍持续提供支撑。' },
];
export const externalNodes = { user: [-3.95,.45,1.8], storage: [-3.95,.45,-1.35] };
export const STAGE_DURATION = 5200;
