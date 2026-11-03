import { CanvasTexture, Color, EquirectangularReflectionMapping, SRGBColorSpace } from 'three';

// Resource generation for the twin look. Every texture is built at runtime, so
// the upgrade adds no external asset and no new dependency.

let auraCache = null;
let shadowCache = null;
let envCache = null;

export function auraTexture() {
  if (auraCache) return auraCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, size * .18, size / 2, size / 2, size * .5);
  gradient.addColorStop(0, 'rgba(255,255,255,0)');
  gradient.addColorStop(.55, 'rgba(255,255,255,.05)');
  gradient.addColorStop(.78, 'rgba(255,255,255,.55)');
  gradient.addColorStop(.92, 'rgba(255,255,255,.12)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  auraCache = new CanvasTexture(canvas);
  auraCache.colorSpace = SRGBColorSpace;
  auraCache.needsUpdate = true;
  return auraCache;
}

export function contactShadowTexture() {
  if (shadowCache) return shadowCache;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * .5);
  gradient.addColorStop(0, 'rgba(0,0,0,.72)');
  gradient.addColorStop(.45, 'rgba(0,0,0,.42)');
  gradient.addColorStop(.8, 'rgba(0,0,0,.10)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  shadowCache = new CanvasTexture(canvas);
  shadowCache.colorSpace = SRGBColorSpace;
  shadowCache.needsUpdate = true;
  return shadowCache;
}

// A blue-black studio gradient with cyan and warm accents. Used through PMREM so
// the brushed aluminium has something to reflect without loading an HDR file.
export function techEnvironmentTexture() {
  if (envCache) return envCache;
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const base = context.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#0a1a2d');
  base.addColorStop(.42, '#102638');
  base.addColorStop(.56, '#07121f');
  base.addColorStop(1, '#03080f');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);
  const cyan = context.createRadialGradient(width * .2, height * .34, 4, width * .2, height * .34, width * .34);
  cyan.addColorStop(0, 'rgba(72,214,255,.80)');
  cyan.addColorStop(.45, 'rgba(30,150,210,.25)');
  cyan.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = cyan;
  context.fillRect(0, 0, width, height);
  const blue = context.createRadialGradient(width * .78, height * .28, 4, width * .78, height * .28, width * .3);
  blue.addColorStop(0, 'rgba(57,120,255,.55)');
  blue.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = blue;
  context.fillRect(0, 0, width, height);
  const warm = context.createLinearGradient(0, height * .72, 0, height);
  warm.addColorStop(0, 'rgba(0,0,0,0)');
  warm.addColorStop(1, 'rgba(80,48,20,.18)');
  context.fillStyle = warm;
  context.fillRect(0, 0, width, height);
  // horizon strip reads as the room's ceiling line in metal reflections
  context.fillStyle = 'rgba(95,210,255,.16)';
  context.fillRect(0, height * .52, width, 3);
  envCache = new CanvasTexture(canvas);
  envCache.mapping = EquirectangularReflectionMapping;
  envCache.colorSpace = SRGBColorSpace;
  envCache.needsUpdate = true;
  return envCache;
}

const themedMaterials = new WeakSet();

// Rack GLBs already ship dark graphite panels; the bright room was lifting them.
// This pass only nudges metalness/roughness and boosts the parts that should read
// as light sources, so the model's construction is untouched.
export function applyRackTheme(scene) {
  scene.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material || themedMaterials.has(material)) return;
      themedMaterials.add(material);
      const name = material.name || '';
      if (material.isMeshStandardMaterial) {
        material.envMapIntensity = 1.15;
        if (/Cabinet panels|Server chassis|Graphite steel/i.test(name)) {
          material.metalness = Math.max(material.metalness, .58);
          material.roughness = Math.min(material.roughness, .44);
        }
        if (/Brushed aluminum/i.test(name)) {
          material.color.multiplyScalar(.78);
          material.metalness = .85;
          material.roughness = .3;
        }
        if (/Status (LEDs|indicators)/i.test(name)) {
          material.emissiveIntensity = 2.1;
        }
        if (/Network ports|Blue patch leads/i.test(name)) {
          material.emissive.set(new Color('#1b4ed8'));
          material.emissiveIntensity = .3;
        }
      }
    });
  });
}

// The infrastructure asset still uses a light "Equipment paint". Pull it into the
// same graphite family; displays and warning labels are left alone.
export function applyInfraTheme(scene) {
  scene.traverse((object) => {
    if (!object.isMesh || !object.material) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (!material || themedMaterials.has(material)) return;
      themedMaterials.add(material);
      const name = material.name || '';
      if (!material.isMeshStandardMaterial) return;
      material.envMapIntensity = 1.1;
      if (/Equipment paint/i.test(name)) {
        material.color.set('#273545');
        material.metalness = .62;
        material.roughness = .42;
      }
      if (/Brushed aluminum/i.test(name)) {
        material.color.multiplyScalar(.72);
        material.metalness = .82;
        material.roughness = .3;
      }
      if (/Status indicators/i.test(name)) {
        material.emissiveIntensity = 1.9;
      }
      if (/Control display/i.test(name)) {
        material.emissive.set(new Color('#22d3ee'));
        material.emissiveIntensity = 1.4;
      }
      if (/Supply air opening/i.test(name)) {
        material.emissiveIntensity = .85;
      }
      if (/Heat exchange coil/i.test(name)) {
        material.metalness = .7;
        material.roughness = .38;
      }
    });
  });
}
