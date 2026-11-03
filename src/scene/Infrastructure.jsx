import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line, useGLTF } from '@react-three/drei';
import { Box3, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments, Vector3 } from 'three';
import { Box } from './primitives.jsx';
import { VENTS } from '../data/supportSystems.js';
import { racks } from '../data/roomLayout.js';
import { applyInfraTheme } from './techMaterials.js';
import { twinPalette } from '../data/twinData.js';

export const INFRA_URL = '/models/infrastructure.glb';

// Highlight materials are derived once per (source material, colour) so eleven
// device instances never duplicate the asset's material set.
const tints = new Map();
function tinted(material, color) {
  if (!material) return material;
  const key = `${material.uuid}-${color}`;
  if (!tints.has(key)) {
    const clone = material.clone();
    clone.emissive.set(color);
    clone.emissiveIntensity = .18;
    tints.set(key, clone);
  }
  return tints.get(key);
}

// P1-5: one faint dashed ring per fan, built at runtime and shared by all
// instances. It is a child of the fan group, so it inherits the same rotation:
// playing spins it, pausing and reduced motion leave it at the current angle.
let vortexGeometry = null;
let vortexMaterial = null;
function vortexAssets() {
  if (!vortexGeometry) {
    const positions = [];
    const segments = 10;
    for (let index = 0; index < segments; index += 1) {
      const start = (index / segments) * Math.PI * 2;
      const end = start + .18;
      positions.push(
        Math.cos(start) * 1.35, Math.sin(start) * 1.35, 0,
        Math.cos(end) * 1.35, Math.sin(end) * 1.35, 0,
      );
    }
    vortexGeometry = new BufferGeometry();
    vortexGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    vortexMaterial = new LineBasicMaterial({ color: '#bfe7f2', transparent: true, opacity: .38, depthWrite: false, depthTest: false });
  }
  return { geometry: vortexGeometry, material: vortexMaterial };
}

export function Infra({ name, position = [0, 0, 0], rotation = [0, 0, 0], tone = '#c58f22', active = false, tint = true, spin = false, animate = false,
  teardown = false, parts = null, focusPart = null, reducedMotion = false, onSelect, label }) {
  const { scene } = useGLTF(INFRA_URL);
  const { invalidate } = useThree();
  const model = useMemo(() => {
    const source = scene.getObjectByName(name);
    if (!source) return null;
    applyInfraTheme(scene);
    const clone = source.clone(true);
    clone.position.set(0, 0, 0);
    clone.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      object.userData.base = object.material;
    });
    return clone;
  }, [scene, name]);
  // Part nodes keep the translation baked by Blender; the exploded view adds an
  // offset instead of replacing it, so closing always returns to the source pose.
  const partNodes = useMemo(() => {
    if (!model || !parts) return [];
    return parts.map((part) => {
      const node = model.getObjectByName(part.id);
      if (!node) return null;
      if (!node.userData.basePos) node.userData.basePos = node.position.clone();
      return { part, node, base: node.userData.basePos };
    }).filter(Boolean);
  }, [model, parts]);
  const focusMeshes = useMemo(() => {
    if (!focusPart) return [];
    const list = [];
    partNodes.forEach(({ part, node }) => {
      if (part.id !== focusPart) return;
      node.traverse((object) => { if (object.isMesh) list.push(object); });
    });
    return list;
  }, [focusPart, partNodes]);
  useEffect(() => {
    const clones = [];
    focusMeshes.forEach((mesh) => {
      const material = (mesh.userData.teardownOriginal || mesh.material).clone();
      material.emissive.set('#3f8ff0');
      material.emissiveIntensity = .45;
      mesh.material = material;
      clones.push(material);
    });
    invalidate();
    return () => {
      focusMeshes.forEach((mesh) => { if (mesh.userData.teardownOriginal) mesh.material = mesh.userData.teardownOriginal; });
      clones.forEach((material) => material.dispose());
      invalidate();
    };
  }, [focusMeshes, invalidate]);
  const fans = useMemo(() => {
    const list = [];
    model?.traverse((object) => { if (/fan/i.test(object.name) && object.children.length) list.push(object); });
    return list;
  }, [model]);
  useEffect(() => {
    if (!model || !spin) return;
    model.updateMatrixWorld(true);
    model.traverse((object) => {
      if (!/fan[_ ]?[ab]/i.test(object.name) || !object.children.length || object.getObjectByName('fan_vortex')) return;
      const box = new Box3().setFromObject(object);
      const size = box.getSize(new Vector3());
      const radius = Math.max(.05, Math.min(size.x, size.y) * .55);
      const { geometry, material } = vortexAssets();
      const ring = new LineSegments(geometry, material);
      ring.name = 'fan_vortex';
      ring.scale.setScalar(radius);
      ring.rotation.x = Math.PI / 10;
      ring.renderOrder = 3;
      ring.frustumCulled = false;
      object.add(ring);
    });
    invalidate();
  }, [model, spin, invalidate]);
  useEffect(() => {
    if (!model) return;
    model.traverse((object) => { if (object.isMesh) object.material = active && tint ? tinted(object.userData.base, tone) : object.userData.base; });
    invalidate();
  }, [model, active, tint, tone, invalidate]);
  useFrame((_, delta) => {
    const step = Math.min(delta, .05) * 7;
    let dirty = false;
    if (spin && animate && fans.length) {
      fans.forEach((fan) => { fan.rotation.z += step; });
      dirty = true;
    }
    const ease = reducedMotion ? 1 : Math.min(1, Math.min(delta, .08) * 4.5);
    partNodes.forEach(({ part, node, base }) => {
      const target = teardown ? [base.x + part.offset[0], base.y + part.offset[1], base.z + part.offset[2]] : [base.x, base.y, base.z];
      const moved = Math.abs(node.position.x - target[0]) > .0015 || Math.abs(node.position.y - target[1]) > .0015 || Math.abs(node.position.z - target[2]) > .0015;
      if (!moved) return;
      node.position.set(
        node.position.x + (target[0] - node.position.x) * ease,
        node.position.y + (target[1] - node.position.y) * ease,
        node.position.z + (target[2] - node.position.z) * ease,
      );
      dirty = true;
    });
    if (dirty) invalidate();
  });
  if (!model) return null;
  return <group position={position} rotation={rotation}
    onClick={onSelect ? (event) => { event.stopPropagation(); onSelect(); } : undefined}
    onPointerOver={onSelect ? (event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
    onPointerOut={onSelect ? () => { document.body.style.cursor = 'auto'; } : undefined}>
    <primitive object={model} />
    {teardown && partNodes.map(({ part }) => <group key={part.id}>
      <Line points={[[part.label[0], part.label[1], part.label[2]], [part.label[0] + .3, part.label[1] + .16, part.label[2] + .1]]}
        color="#2468df" lineWidth={1.2} dashed dashSize={.05} gapSize={.04} transparent opacity={.85} />
      <Html position={[part.label[0] + .34, part.label[1] + .18, part.label[2] + .1]} zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
        <span className={focusPart === part.id ? 'teardown-label is-focused' : 'teardown-label'}>{part.name}</span>
      </Html>
    </group>)}
    {label}
  </group>;
}

export function Busway({ visible, onSelect }) {
  return <group visible={visible}
    onClick={onSelect ? (event) => { event.stopPropagation(); onSelect(); } : undefined}
    onPointerOver={onSelect ? (event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; } : undefined}
    onPointerOut={onSelect ? () => { document.body.style.cursor = 'auto'; } : undefined}>
    <Box position={[-.05, 2.86, -.27]} size={[8.7, .17, .2]} color="#33465a" metalness={.78} roughness={.28} />
    <Box position={[-.05, 2.78, -.27]} size={[8.7, .03, .12]} color="#1c2b3a" />
    {[-4.1, -2.9, -1.7, -.5, .7, 1.9, 3.1].map((x) => <Box key={x} position={[x, 2.86, -.27]} size={[.055, .19, .22]} color="#223241" />)}
    {[-4.3, 4.2].map((x) => <Box key={x} position={[x, 2.86, -.27]} size={[.09, .21, .24]} color="#1a2936" />)}
    {racks.map((rack) => <group key={rack.id}>
      <Box position={[rack.x, 2.7, -.27]} size={[.19, .19, .3]} color="#2b3d4d" metalness={.6} />
      <Box position={[rack.x, 2.62, -.27]} size={[.13, .05, .2]} color={twinPalette.power} metalness={.3} />
    </group>)}
  </group>;
}

export function FloorVents({ highlight = false, visible = true }) {
  return <group visible={visible}>{VENTS.map(({ x, z }) => <Infra key={`${x}-${z}`} name="floor_vent" position={[x, .004, z]} tone={twinPalette.cold} active={highlight} />)}</group>;
}

export function RoomInfrastructure({ selected, activeNodes, tone, animate, onSelectNode, infraTeardown, reducedMotion, visibleSystems }) {
  const is = (id) => activeNodes?.includes(id);
  const choose = (id) => () => onSelectNode?.(id);
  const powerVisible = visibleSystems?.power !== false;
  const coolingVisible = visibleSystems?.cooling !== false;
  return <group>
    <group visible={powerVisible}>
      <Busway visible onSelect={choose('busway')} />
      <Infra name="ups" position={[2.6, 0, -3.65]} tone={tone} active={is('ups')} onSelect={choose('ups')}
        teardown={infraTeardown?.device === 'ups'} parts={infraTeardown?.device === 'ups' ? infraTeardown.parts : null}
        focusPart={infraTeardown?.device === 'ups' ? infraTeardown.part : null} reducedMotion={reducedMotion} />
      <Infra name="distribution" position={[3.9, 0, -3.65]} tone={tone} active={is('distribution')} onSelect={choose('distribution')}
        teardown={infraTeardown?.device === 'distribution'} parts={infraTeardown?.device === 'distribution' ? infraTeardown.parts : null}
        focusPart={infraTeardown?.device === 'distribution' ? infraTeardown.part : null} reducedMotion={reducedMotion} />
      <Infra name="feed_panel" position={[4.62, 1.0, -4.7]} tone={tone} active={is('feed')} onSelect={choose('feed')} />
      {/* Second utility feed: 市电 A 经 ATS 进 UPS 主输入，市电 B 直接进旁路。
          Two independent incoming panels is what makes "双路输入" true. */}
      <Infra name="feed_panel" position={[2.2, 1.0, -4.7]} tone={tone} active={is('feed')} onSelect={choose('feed')} />
    </group>
    <FloorVents highlight={is('vent')} visible={coolingVisible} />
    {coolingVisible && [-4.55, -3.12].map((x, index) => <Infra key={x} name="crac" position={[x, 0, -3.65]} tone={twinPalette.cold} active={is('crac')} spin animate={animate} onSelect={choose('crac')}
      teardown={index === 0 && infraTeardown?.device === 'crac'} parts={index === 0 && infraTeardown?.device === 'crac' ? infraTeardown.parts : null}
      focusPart={index === 0 && infraTeardown?.device === 'crac' ? infraTeardown.part : null} reducedMotion={reducedMotion} />)}
  </group>;
}

export function RackPdu({ position, tone, active, onSelect }) {
  return <Infra name="rack_pdu" position={position} rotation={[0, -Math.PI / 2, 0]} tone={tone} active={active} onSelect={onSelect} />;
}

export function FanTray({ position, active, animate, tone = '#0f93ad' }) {
  return <Infra name="fan_tray" position={position} tone={tone} active={active} spin animate={animate} />;
}

useGLTF.preload(INFRA_URL);
