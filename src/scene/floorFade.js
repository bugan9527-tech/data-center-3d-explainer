import { NoColorSpace, CanvasTexture } from 'three';

// 64×64 edge ramp sampled by the floor shader in world space (see FloorSlab).
// The band is expressed in texture pixels, so 4.5 of 64 ≈ 0.8 world units on the
// 11.9 m slab: enough to dissolve the edge without eating the aisles or vents.
let cache = new Map();

export default function floorFadeTexture(band = 4.5) {
  if (cache.has(band)) return cache.get(band);
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      const alpha = Math.max(0, Math.min(1, (edge + .5) / band));
      const index = (y * size + x) * 4;
      image.data[index] = image.data[index + 1] = image.data[index + 2] = Math.round(alpha * 255);
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  // alphaMap samples the green channel; keep it out of sRGB so the ramp stays linear.
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  cache.set(band, texture);
  return texture;
}
