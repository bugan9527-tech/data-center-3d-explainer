// Teaching topology: A = external group, B = compute group, C = storage group.
// Anchors follow the independently named Blender assemblies (glTF Y up).
export const REQUEST_STAGE_DURATION = 4200;
export const flowColors = { request: '#38bdf8', data: '#a78bfa', result: '#2dd4bf', active: '#fbbf24' };
export const requestNodes = {
  user: { name: '用户终端', system: 'network', anchor: [-5.15,.65,2.85] },
  ingress: { name: 'N01 · A 外网端口组', system: 'network', rack: 'N01', assembly: 'part_ingress_ports', anchor: [-3.885,1.29,1.23] },
  fabric: { name: 'N01 · 交换转发单元', system: 'network', rack: 'N01', assembly: 'part_forwarding_unit', anchor: [-3.65,1.48,1.23] },
  egress: { name: 'N01 · B 计算端口组', system: 'network', rack: 'N01', assembly: 'part_compute_ports', anchor: [-3.708,1.29,1.23] },
  storagePort: { name: 'N01 · C 存储端口组', system: 'network', rack: 'N01', assembly: 'part_storage_ports', anchor: [-3.495,1.29,1.23] },
  compute: { name: 'C01 · 01 号计算服务器', system: 'compute', rack: 'C01', anchor: [-1.65,1.87,1.23] },
  controller: { name: 'S01 · 存储控制单元', system: 'storage', rack: 'S01', assembly: 'part_controller_01', anchor: [2.1,2.03,1.25] },
  module: { name: 'S01 · 文件存储模块', system: 'storage', rack: 'S01', assembly: 'part_shelf_03', anchor: [2.1,.87,1.25] },
};
export const requestWorkflow = [
  { title: '外部请求到达', short: '请求入站', kind: 'request', active: ['user','ingress'], route: ['user','ingress'], owner: '外部网络与 A 端口组', input: '用户的读取并处理文件请求', output: 'N01 的 A 外网端口组', text: '用户请求进入机房，A 端口组接收网络信息。A 是外部网络的教学入口。', internal: 0 },
  { title: '交换单元选择出口', short: '选择出口', kind: 'request', active: ['ingress','fabric','egress'], route: ['ingress','fabric','egress'], owner: 'N01 交换转发单元', input: 'A 端口组接收的请求', output: '通向 C01 的 B 计算端口组', text: '交换单元按目标选择 B 出口。端口组负责连接，转发单元负责将信息送往正确方向。', internal: 0 },
  { title: '请求到达计算服务器', short: '送达计算', kind: 'request', active: ['egress','compute'], route: ['egress','compute'], owner: 'B 端口组与服务器网卡', input: '转发后的用户请求', output: 'C01 的 01 号服务器', text: '请求从 B 端口组输出，由计算服务器的网卡接收。机房级路径到达具体服务器。', internal: 0 },
  { title: 'CPU 执行请求程序', short: '执行程序', kind: 'request', active: ['compute'], route: ['compute'], owner: 'C01 内的 CPU 与内存', input: '网卡交来的用户请求', output: '交给存储系统的文件读取请求', text: 'CPU 执行应用程序，确定要读取的文件；内存保存正在使用的程序和请求信息。可进入内部查看部件协作。', internal: 1 },
  { title: '读取请求到达控制单元', short: '请求读取', kind: 'request', active: ['compute','egress','fabric','storagePort','controller'], route: ['compute','egress','fabric','storagePort','controller'], owner: '计算服务器、网络与存储控制单元', input: 'CPU 发出的文件读取请求', output: 'S01 的存储控制单元', text: '计算服务器经 B → 交换单元 → C 发送读取请求。存储控制单元接收请求，确定文件所在模块。', internal: 2 },
  { title: '控制单元定位文件', short: '定位模块', kind: 'request', active: ['controller','module'], route: ['controller','module'], owner: 'S01 存储控制单元', input: '指定文件的读取请求', output: '保存该文件的存储模块', text: '控制单元组织读取并访问对应模块。机柜中其他托架保留作空间背景；这里仅突出本次文件所在模块。', internal: 2 },
  { title: '存储模块读出数据', short: '读出数据', kind: 'data', active: ['module','controller'], route: ['module','controller'], owner: 'S01 文件存储模块', input: '控制单元的读取操作', output: '返回存储控制单元的文件数据', text: '模块从持久保存的位置读出数据，交回控制单元。模块可代表不同存储介质，不用机械旋转表示读写。', internal: 2 },
  { title: '文件数据返回计算', short: '数据回传', kind: 'data', active: ['controller','storagePort','fabric','egress','compute'], route: ['controller','storagePort','fabric','egress','compute'], owner: '存储控制单元、网络与服务器网卡', input: '已读出的文件数据', output: 'C01 的内存工作区', text: '控制单元经 C → 交换单元 → B 返回文件数据。服务器网卡接收，数据进入内存，供 CPU 使用。', internal: 2 },
  { title: 'CPU 整理处理结果', short: '整理结果', kind: 'result', active: ['compute'], route: ['compute'], owner: 'C01 内的 CPU 与内存', input: '内存中正在使用的文件数据', output: '暂存在内存、等待网卡发送的结果', text: 'CPU 按程序处理内存中的数据并组织响应；内存暂存处理结果，存储继续持久保存原文件。', internal: 3 },
  { title: '网络转发返回结果', short: '转发响应', kind: 'result', active: ['compute','egress','fabric','ingress'], route: ['compute','egress','fabric','ingress'], owner: '服务器网卡与 N01 交换转发单元', input: '计算服务器整理好的结果', output: '连接外部网络的 A 端口组', text: '网卡发出结果，网络设备沿 B → 交换单元 → A 返回。此时 B 是接收侧，A 是输出侧，方向与入站相反。', internal: 4 },
  { title: '用户收到处理结果', short: '用户收到', kind: 'result', active: ['ingress','user'], route: ['ingress','user'], owner: '外部网络与用户终端', input: 'A 端口组送出的处理结果', output: '发起请求的用户终端', text: '处理结果通过外部网络到达用户。一次读取并处理文件的请求完成；供电与制冷始终提供支撑。', internal: 4 },
];

// Entering freezes the room clock. Internal exploration magnifies the same
// responsibilities without advancing the room request; returning retains it.
export function internalStageForRequest(step) { return requestWorkflow[step].internal; }
