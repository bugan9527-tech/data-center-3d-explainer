import { systems } from './systems.js';
import { racks } from './roomLayout.js';

// Devices the HUD counts: every cabinet plus the power and cooling units that have
// their own model in the room. Fire, security and sensor end-points (detectors,
// nozzles, cameras, door frame, probe boxes) are fittings rather than capacity, so
// they stay out — and the KPI is labelled to say so.
export const POWER_UNITS = ['UPS 不间断电源', '配电柜', '上游进线箱 A', '上游进线箱 B', '柴油发电机组', 'ATS 自动转换开关'];
export const COOLING_UNITS = 2;
export const DEVICE_TOTAL = racks.length + POWER_UNITS.length + COOLING_UNITS;
const OFFLINE = { normal: 0, fault: 1, alarm: 2 };

// Shared palette for the dark digital-twin treatment. The values are deliberately
// desaturated except for the flow colours, so the racks stay readable while the
// signal paths remain the brightest thing on screen.
export const twinPalette = {
  bg: '#0b1220',
  bgDeep: '#040a13',
  floor: '#101a28',
  floorEdge: '#0a1421',
  wall: '#0f1b29',
  gridMajor: '#1d4a68',
  gridMinor: '#123247',
  accent: '#22d3ee',
  accentSoft: '#38bdf8',
  accentDeep: '#0e7490',
  text: '#d7e8f7',
  muted: '#8ea9c0',
  line: '#1e3a52',
  power: '#fbbf24',
  cold: '#22d3ee',
  heat: '#fb923c',
  storage: '#a78bfa',
  fire: '#fb7185',
  ok: '#34d399',
  warn: '#fbbf24',
  fault: '#fb7185',
};

export const qualityPresets = {
  high: { id: 'high', label: '高', dpr: 1.5, shadows: true, shadowMap: 2048, bloom: true, bloomStrength: .42, bloomRadius: .32, bloomThreshold: .86, storageHeads: 3, heat: true },
  medium: { id: 'medium', label: '中', dpr: 1.25, shadows: true, shadowMap: 1024, bloom: true, bloomStrength: .3, bloomRadius: .28, bloomThreshold: .9, storageHeads: 2, heat: true },
  low: { id: 'low', label: '低', dpr: 1, shadows: false, shadowMap: 512, bloom: false, bloomStrength: 0, bloomRadius: 0, bloomThreshold: 1, storageHeads: 1, heat: false },
};

export const qualityOrder = ['high', 'medium', 'low'];

export const flowLayerDefs = [
  { id: 'data', label: '数据', color: '#38bdf8' },
  { id: 'power', label: '电力', color: '#fbbf24' },
  { id: 'cooling', label: '制冷', color: '#22d3ee' },
  { id: 'heat', label: '排热', color: '#fb923c' },
  { id: 'storage', label: '存储', color: '#a78bfa' },
  { id: 'fire', label: '消防', color: '#fb7185' },
];

export const systemVisibilityDefs = systems.map((system) => ({ id: system.id, label: system.short, color: system.color }));

export const statusOrder = ['normal', 'fault', 'alarm'];

export const statusLabels = { normal: '运行正常', fault: '局部故障', alarm: '告警处理中' };

// Deterministic teaching figures. Nothing here talks to a real API; the HUD
// prints "模拟" next to every block and freezes when playback stops.
const statusBase = {
  normal: {
    cpu: 42, memory: 62, throughput: 1.72,
    temperature: 23.4, power: 38.6, ups: '在线', upsNote: 'A 路主用 · B 路旁路待机',
    cooling: '运行', coolingNote: '2 台运行 · 无备用', alerts: [],
  },
  fault: {
    cpu: 55, memory: 68, throughput: 1.31,
    temperature: 24.9, power: 37.2, ups: '在线', upsNote: 'A 路已切至发电机 · B 路旁路',
    cooling: '降级', coolingNote: '1 台运行 · 无备用',
    alerts: [{ level: 'fault', title: 'C02 机柜风扇转速异常', note: '局部红色呼吸灯 · 模拟' }],
  },
  alarm: {
    cpu: 61, memory: 71, throughput: .86,
    temperature: 27.6, power: 41.4, ups: '旁路', upsNote: '旁路供电 · A 路待恢复',
    cooling: '告警', coolingNote: '1 台运行 · 无备用',
    alerts: [
      { level: 'alarm', title: '消防回路烟感告警', note: '消防管线高亮 · 模拟' },
      { level: 'fault', title: 'C02 机柜风扇转速异常', note: '局部红色呼吸灯 · 模拟' },
    ],
  },
};

export function twinMetrics(mode, tick) {
  const base = statusBase[mode] ?? statusBase.normal;
  const wave = Math.sin(tick * .62);
  const slow = Math.sin(tick * .27 + 1.2);
  const offline = OFFLINE[mode] ?? 0;
  const total = DEVICE_TOTAL;
  const online = total - offline;
  return {
    ...base,
    total,
    online,
    onlineRate: Math.round((online / total) * 1000) / 10,
    cpu: Math.max(8, Math.min(96, Math.round(base.cpu + wave * 3))),
    memory: Math.max(20, Math.min(94, Math.round(base.memory + slow * 2))),
    throughput: Math.max(.1, Math.round((base.throughput + wave * .08) * 100) / 100),
    temperature: Math.round((base.temperature + slow * .25) * 10) / 10,
    power: Math.round((base.power + wave * .4) * 10) / 10,
  };
}

// Sparkline points are computed from the same deterministic series, so the chart
// is a readable trend rather than random noise.
export function twinTrend(mode, tick, key, count = 22) {
  const base = statusBase[mode] ?? statusBase.normal;
  const value = key === 'cpu' ? base.cpu : key === 'memory' ? base.memory : base.throughput * 20;
  const points = [];
  for (let index = 0; index < count; index += 1) {
    const phase = index / count;
    points.push(value + Math.sin((tick - (count - index)) * .55 + phase * 2.4) * (key === 'throughput' ? 3 : 5));
  }
  return points;
}

export function sparkPath(values, width = 132, height = 38, min = 0, max = 100) {
  const step = width / Math.max(1, values.length - 1);
  return values.map((value, index) => {
    const x = Math.round(index * step * 10) / 10;
    const y = Math.round((height - ((value - min) / (max - min)) * height) * 10) / 10;
    return `${index ? 'L' : 'M'}${x} ${Math.max(1, Math.min(height - 1, y))}`;
  }).join(' ');
}
