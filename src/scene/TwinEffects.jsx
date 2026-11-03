import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { CatmullRomCurve3, CanvasTexture, Color, SRGBColorSpace, Vector3 } from 'three';
import FlowGlow from './FlowGlow.jsx';
import { racks } from '../data/roomLayout.js';
import { twinPalette } from '../data/twinData.js';

// A persistent, low-key pulse between the storage cabinet and the compute rack.
// It is deliberately thinner than the request path so it reads as background
// telemetry rather than the lesson's active route.
const STORAGE_PATH = [
  [2.1, .92, 1.32], [2.1, 1.72, 1.33], [1.2, 2.02, 1.48],
  [-.35, 2.02, 1.48], [-1.65, 1.9, 1.3],
];

export function StoragePulse({ enabled, playing, reducedMotion, heads = 2 }) {
  const { invalidate } = useThree();
  const progress = useRef(reducedMotion ? .5 : 0);
  const curve = useMemo(() => new CatmullRomCurve3(STORAGE_PATH.map((point) => new Vector3(...point)), false, 'catmullrom', .28), []);
  useFrame((_, delta) => {
    if (!playing || reducedMotion) return;
    progress.current = (progress.current + Math.min(delta, .1) / 4.6) % 1;
    invalidate();
  });
  if (!enabled) return null;
  return <FlowGlow curve={curve} progressRef={progress} color={twinPalette.storage} size={.2} heads={heads} tail={.06} opacity={.9} />;
}

const signed = (rack) => (rack.rotation ? -1 : 1);

// Green-field teaching links: dashed cyan for the network route and dashed amber
// for the busway feed. Dashes keep these from being mistaken for real conduits.
export function DeviceLinks({ selected, selectedRack, visible }) {
  const rack = useMemo(() => {
    const id = selected === 'compute' ? selectedRack : selected === 'network' ? 'N01' : selected === 'storage' ? 'S01' : null;
    return id ? racks.find((item) => item.id === id) : null;
  }, [selected, selectedRack]);
  if (!visible || !rack) return null;
  const dir = signed(rack);
  const front = rack.z + dir * .58;
  const networkTarget = rack.kind === 'network' ? [-5.15, .7, 2.85] : [-3.5, 2.86, 1.2];
  const network = [
    [rack.x + .22, 1.82, front],
    [rack.x + .22, 2.35, front],
    [rack.x + .22, 2.62, rack.z + dir * .28],
    [networkTarget[0], 2.62, networkTarget[2]],
    networkTarget,
  ];
  const power = [
    [rack.x, 2.86, -.27],
    [rack.x, 2.6, rack.z - dir * .18],
    [rack.x, 2.28, rack.z],
  ];
  return <group raycast={() => null}>
    <Line points={network} color={twinPalette.cold} lineWidth={1.8} dashed dashSize={.08} gapSize={.06} transparent opacity={.8} depthWrite={false} />
    <Line points={power} color={twinPalette.power} lineWidth={1.8} dashed dashSize={.08} gapSize={.06} transparent opacity={.8} depthWrite={false} />
    <Html position={network[2]} center zIndexRange={[13, 0]} style={{ pointerEvents: 'none' }}>
      <span className="link-tag link-tag-network">网络链路</span>
    </Html>
    <Html position={power[1]} center zIndexRange={[13, 0]} style={{ pointerEvents: 'none' }}>
      <span className="link-tag link-tag-power">供电链路</span>
    </Html>
  </group>;
}

let heatCache = null;
function heatTexture() {
  if (heatCache) return heatCache;
  const width = 256;
  const height = 128;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  const hot = [
    { x: .27, y: .62, radius: .2, power: .55 },
    { x: .53, y: .58, radius: .22, power: .62 },
    { x: .82, y: .6, radius: .16, power: .4 },
    { x: .66, y: .18, radius: .13, power: .3 },
  ];
  const cold = [
    { x: .08, y: .75, radius: .18, power: -.25 },
    { x: .42, y: .86, radius: .2, power: -.35 },
    { x: .9, y: .82, radius: .18, power: -.2 },
  ];
  const from = new Color(twinPalette.cold);
  const to = new Color('#fb923c');
  const deep = new Color('#ef4444');
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const ny = y / height;
      let heat = .12 + ny * .12;
      hot.forEach((spot) => {
        const d = Math.sqrt(((nx - spot.x) / spot.radius) ** 2 + ((ny - spot.y) / spot.radius) ** 2);
        heat += spot.power * Math.max(0, 1 - d);
      });
      cold.forEach((spot) => {
        const d = Math.sqrt(((nx - spot.x) / spot.radius) ** 2 + ((ny - spot.y) / spot.radius) ** 2);
        heat += spot.power * Math.max(0, 1 - d);
      });
      heat = Math.max(0, Math.min(1, heat));
      const color = from.clone().lerp(to, Math.min(1, heat * 1.7));
      if (heat > .62) color.lerp(deep, (heat - .62) / .38);
      const index = (y * width + x) * 4;
      image.data[index] = Math.round(color.r * 255);
      image.data[index + 1] = Math.round(color.g * 255);
      image.data[index + 2] = Math.round(color.b * 255);
      image.data[index + 3] = Math.round(150 + heat * 105);
    }
  }
  context.putImageData(image, 0, 0);
  heatCache = new CanvasTexture(canvas);
  heatCache.colorSpace = SRGBColorSpace;
  heatCache.needsUpdate = true;
  return heatCache;
}

// Cold-aisle floor heat map, drawn once and faded over the floor. The HUD prints
// the teaching disclaimer next to the toggle.
export function HeatMap({ visible }) {
  const map = useMemo(() => heatTexture(), []);
  if (!visible) return null;
  return <group raycast={() => null}>
    <mesh position={[-.35, .024, 2.1]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[8.9, 2.4]} />
      <meshBasicMaterial map={map} transparent opacity={.68} depthWrite={false} toneMapped={false} />
    </mesh>
    <Line points={[[-4.8, .04, .9], [4.1, .04, .9], [4.1, .04, 3.3], [-4.8, .04, 3.3], [-4.8, .04, .9]]} color={twinPalette.cold} lineWidth={1} dashed dashSize={.12} gapSize={.09} transparent opacity={.42} depthWrite={false} />
    <Html position={[2.6, .05, 2.72]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
      <span className="floor-label heat-map-label">冷通道温度示意 · 模拟</span>
    </Html>
  </group>;
}
