// S10: build a self-contained HTML contact sheet pairing the S0 baseline
// frames with the latest same-camera frames from S1–S9, then a browser
// script screenshots it into outputs/compare-chapters.png.
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'outputs');
const pairs = [
  ['before-overview.png', 'after-persp-overview.png', '机房总览'],
  ['before-network.png', 'after-persp-network.png', '网络设备'],
  ['before-compute.png', 'after-persp-compute.png', '计算服务器'],
  ['before-storage.png', 'after-persp-storage.png', '存储设备'],
  ['before-power.png', 'after-persp-power.png', 'UPS 与配电'],
  ['before-cooling.png', 'after-persp-cooling.png', '制冷设备'],
  ['before-support-power-step1.png', 'after-flow-support.png', '持续支撑 · 供电（流光路径）'],
  ['before-support-cooling-step1.png', 'after-flow-support-canvas.png', '持续支撑 · 制冷（画布）'],
  ['before-375-overview.png', 'after-persp-overview-375.png', '总览 · 375 宽'],
  ['before-present-1440.png', 'after-present-1440.png', '展品模式（关 → 开）'],
];

const b64 = name => 'data:image/png;base64,' + fs.readFileSync(path.join(outDir, name)).toString('base64');
const css = `body{margin:0;background:#10151a;color:#dfe7ee;font:14px/1.5 "Segoe UI",system-ui,sans-serif;padding:28px 32px}
h1{font-size:20px;margin:0 0 4px}p.sub{margin:0 0 20px;color:#8fa1b0}
.pair{margin:0 0 26px;border:1px solid #2a3540;border-radius:10px;overflow:hidden;background:#161d24}
.pair h2{font-size:15px;margin:0;padding:10px 14px;background:#1c252e}
.row{display:grid;grid-template-columns:1fr 1fr;gap:0}
.cell{padding:10px}.cell span{display:block;font-size:12px;color:#8fa1b0;margin:0 0 6px}
.cell img{display:block;width:100%;height:auto;border-radius:6px;background:#000}`;

const body = pairs.map(([b, a, cap]) => `<div class="pair"><h2>${cap}</h2><div class="row"><div class="cell"><span>改造前（S0 基线）</span><img src="${b64(b)}" alt="before"></div><div class="cell"><span>改造后（S1–S9 最新同机位）</span><img src="${b64(a)}" alt="after"></div></div></div>`).join('\n');
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>S0–S9 前后对照</title><style>${css}</style></head><body><h1>数据中心三维教学展品 · 视觉升级前后对照</h1><p class="sub">S0 基线 vs S1–S9（光照 / 背景淡出 / 基座与道具 / 构图收紧 / 透视相机 / 机内机位 / 弧线运镜 / 流光路径 / 展品模式）· 2026-11-01</p>${body}</body></html>`;
fs.writeFileSync(path.join(outDir, 'compare-chapters.html'), html);
console.log('compare-chapters.html written,', (fs.statSync(path.join(outDir, 'compare-chapters.html')).size / 1048576).toFixed(1), 'MiB');
