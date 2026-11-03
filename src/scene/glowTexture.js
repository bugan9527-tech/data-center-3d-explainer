import { CanvasTexture, SRGBColorSpace } from 'three';

// 32×32 radial falloff used by the flow heads and their trail. Generated at
// runtime so no external sprite sheet is needed; one shared instance for all
// flows keeps it to a single texture upload.
let cached = null;
let flowCached = null;

// Hard-edged head texture for the P0 flow: a solid core (about 0.19 world units
// at the default sprite size) inside a faint ring (about 0.3). One sprite per
// head keeps the sharp "electricity" read that the soft radial blob lacked.
export function flowTexture() {
  if (flowCached) return flowCached;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const halo = context.createRadialGradient(size / 2, size / 2, 18, size / 2, size / 2, 30);
  halo.addColorStop(0, 'rgba(255,255,255,.18)');
  halo.addColorStop(.72, 'rgba(255,255,255,.06)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = halo;
  context.beginPath();
  context.arc(size / 2, size / 2, 30, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(size / 2, size / 2, 19, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255,255,255,1)';
  context.fill();
  context.beginPath();
  context.arc(size / 2, size / 2, 30, 0, Math.PI * 2);
  context.lineWidth = 2.5;
  context.strokeStyle = 'rgba(255,255,255,.32)';
  context.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  flowCached = texture;
  return texture;
}

export default function glowTexture() {
  if (cached) return cached;
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.30, 'rgba(255,255,255,1)');
  gradient.addColorStop(.58, 'rgba(255,255,255,.55)');
  gradient.addColorStop(.80, 'rgba(255,255,255,.18)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
