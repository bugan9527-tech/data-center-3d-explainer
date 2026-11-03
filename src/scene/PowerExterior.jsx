import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Quaternion, Vector3 } from 'three';
import { Box } from './primitives.jsx';
import { infraParts } from '../data/infraParts.js';

// Standby power sits on a platform outside the raised floor: the slab ends at
// x 5.95, so anything further right is outside the building envelope. Keeping the
// set out here also keeps the generator out of the rack rows, and puts it next to
// the incoming feed panel instead of across the room.
const PAD = { x: 6.95, z: -2.2, width: 2.0, depth: 4.2 };
const ATS = [6.42, 0, -3.72];
const GEN = [6.75, 0, -2.7];
const TANK = [6.75, 0, -1.55];
const UP = new Vector3(0, 1, 0);
const BASE = { part_genset: GEN, part_ats: ATS, part_tank: TANK };

// These three are primitive geometry rather than GLB nodes, so the generic Infra
// teardown cannot drive them; each unit gets a wrapper group that slides by the
// offset declared in infraParts.genset.
const LAYOUT = infraParts.genset.map((part) => ({ id: part.id, offset: part.offset, base: BASE[part.id] }));

// The pad has to dissolve into the background like the room floor, otherwise it
// reads as a rectangle pasted beside the model.
function PadSlab({ position, size, color, center, radii }) {
  const slab = useRef();
  useLayoutEffect(() => {
    const material = slab.current?.material;
    if (!material) return;
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPadWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPadWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vPadWorld;')
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
  float padEdge = length(vec2((vPadWorld.x - ${center[0].toFixed(2)}) / ${radii[0].toFixed(2)}, (vPadWorld.z - ${center[1].toFixed(2)}) / ${radii[1].toFixed(2)}));
  diffuseColor.a *= 1.0 - smoothstep(0.82, 1.0, padEdge);`);
    };
    material.needsUpdate = true;
  }, [center, radii]);
  return <mesh ref={slab} position={position} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.88} />
  </mesh>;
}

function Tube({ from, to, radius = .035, color = '#8a939b' }) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const direction = b.clone().sub(a);
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  return <mesh position={a.clone().add(b).multiplyScalar(.5)} quaternion={quaternion} castShadow>
    <cylinderGeometry args={[radius, radius, direction.length(), 8]} />
    <meshStandardMaterial color={color} metalness={.5} roughness={.45} />
  </mesh>;
}

// Genset: skid, acoustic enclosure, radiator louvres, exhaust stack, local panel.
function GeneratorSet() {
  return <>
    <Box position={[0, .05, 0]} size={[1.02, .10, 2.16]} color="#1f2933" roughness={.75} />
    <Box position={[0, .66, 0]} size={[.96, 1.12, 2.04]} color="#2b3742" roughness={.5} metalness={.25} />
    <Box position={[0, 1.24, 0]} size={[.98, .04, 2.06]} color="#3c4a57" roughness={.55} metalness={.2} />
    {/* radiator end faces the ATS side */}
    {[-.42, -.28, -.14, 0, .14, .28, .42].map((y) => <Box key={y} position={[0, .72 + y, -1.03]} size={[.84, .07, .03]} color="#55636e" roughness={.6} />)}
    <Box position={[0, .40, -1.045]} size={[.84, .30, .02]} color="#333f4a" roughness={.6} />
    <mesh position={[.28, 1.40, .78]} castShadow>
      <cylinderGeometry args={[.055, .055, .34, 10]} />
      <meshStandardMaterial color="#6b747c" metalness={.65} roughness={.4} />
    </mesh>
    <Box position={[.30, 1.53, .78]} size={[.13, .05, .13]} color="#4a555e" metalness={.55} />
    <Box position={[.49, .95, -.72]} size={[.02, .22, .34]} color="#151d25" roughness={.4} />
    <Box position={[.50, 1.00, -.72]} size={[.012, .06, .16]} color="#5fd0c4" roughness={.5} />
    <Box position={[0, .30, 1.02]} size={[.70, .18, .03]} color="#333f4a" roughness={.6} />
    <Box position={[.49, 1.04, .34]} size={[.012, .055, 1.10]} color="#c58f18" metalness={.3} roughness={.5} />
    <Box position={[.49, .30, .34]} size={[.012, .10, 1.10]} color="#3a4650" roughness={.6} />
  </>;
}

// Automatic transfer switch: the one place the utility feed and the standby feed
// meet, and the reason the generator is neither always on nor directly wired in.
function TransferSwitch() {
  return <>
    <Box position={[0, .04, 0]} size={[.70, .08, .54]} color="#232d37" roughness={.8} />
    <Box position={[0, .80, 0]} size={[.66, 1.45, .50]} color="#2a3540" roughness={.5} metalness={.2} />
    <Box position={[0, .80, .253]} size={[.58, 1.33, .014]} color="#222c36" roughness={.5} />
    <Box position={[0, 1.16, .262]} size={[.34, .20, .008]} color="#2f4a5c" roughness={.4} />
    <Box position={[0, 1.16, .268]} size={[.20, .06, .004]} color="#5fd0c4" roughness={.5} />
    <Box position={[0, .62, .262]} size={[.16, .16, .008]} color="#46525c" metalness={.5} roughness={.45} />
    <Box position={[.20, .96, .262]} size={[.06, .06, .010]} color="#c0713f" roughness={.5} emissive="#c0713f" emissiveIntensity={.25} />
    <Box position={[.20, .84, .262]} size={[.06, .06, .010]} color="#5fd0c4" roughness={.5} emissive="#5fd0c4" emissiveIntensity={.25} />
  </>;
}

function DayTank() {
  return <>
    <Box position={[0, .04, 0]} size={[.90, .08, .84]} color="#232d37" roughness={.8} />
    <Box position={[0, .44, 0]} size={[.84, .72, .78]} color="#333f4a" roughness={.55} metalness={.2} />
    <Box position={[0, .84, 0]} size={[.66, .06, .60]} color="#3c4a57" roughness={.55} metalness={.2} />
    <Box position={[0, .58, .395]} size={[.30, .05, .012]} color="#46525c" roughness={.5} />
    <Tube from={[0, .46, .39]} to={[0, .22, .39]} radius={.022} color="#5c6873" />
  </>;
}

const PIECES = { part_genset: GeneratorSet, part_ats: TransferSwitch, part_tank: DayTank };

export default function PowerExterior({ teardown = false, focusPart = null, reducedMotion = false, onSelectDevice }) {
  const { invalidate } = useThree();
  const refs = useRef({});
  const tinted = useRef(new Map());

  // Wrappers own the world position, so the pull-out animation never fights a
  // React-applied position prop.
  useLayoutEffect(() => {
    LAYOUT.forEach(({ id, base }) => {
      const group = refs.current[id];
      if (group) group.position.set(...base);
    });
    invalidate();
  }, [invalidate]);

  // Focusing a part tints it, matching the GLB teardown; the originals are kept so
  // closing always restores the exact material set.
  useEffect(() => {
    const group = focusPart ? refs.current[focusPart] : null;
    const restore = tinted.current;
    if (!group) {
      restore.forEach((material, mesh) => { mesh.material = material; });
      restore.clear();
      return undefined;
    }
    group.traverse((object) => {
      if (!object.isMesh || restore.has(object)) return;
      restore.set(object, object.material);
      const material = object.material.clone();
      material.emissive = new Color('#2f9a92');
      material.emissiveIntensity = .10;
      object.material = material;
    });
    invalidate();
    return () => {
      restore.forEach((material, mesh) => { mesh.material = material; });
      restore.clear();
      invalidate();
    };
  }, [focusPart, invalidate]);

  useFrame((_, delta) => {
    const ease = reducedMotion ? 1 : Math.min(1, Math.min(delta, .08) * 4.5);
    let dirty = false;
    LAYOUT.forEach(({ id, base, offset }) => {
      const group = refs.current[id];
      if (!group) return;
      const target = teardown ? [base[0] + offset[0], base[1] + offset[1], base[2] + offset[2]] : base;
      const moved = Math.abs(group.position.x - target[0]) > .0015
        || Math.abs(group.position.y - target[1]) > .0015
        || Math.abs(group.position.z - target[2]) > .0015;
      if (!moved) return;
      group.position.set(
        group.position.x + (target[0] - group.position.x) * ease,
        group.position.y + (target[1] - group.position.y) * ease,
        group.position.z + (target[2] - group.position.z) * ease,
      );
      dirty = true;
    });
    if (dirty) invalidate();
  });

  // All three units are parts of one device, so any click opens the genset row.
  const pick = () => (onSelectDevice ? (event) => { event.stopPropagation(); onSelectDevice('genset'); } : undefined);
  const hover = onSelectDevice ? {
    onPointerOver: (event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = 'auto'; },
  } : {};

  return <group>
    <PadSlab position={[PAD.x, -.06, PAD.z]} size={[PAD.width, .12, PAD.depth]} color="#1b2530"
      center={[PAD.x, PAD.z]} radii={[PAD.width / 2 + .16, PAD.depth / 2 + .16]} />
    {LAYOUT.map(({ id }) => {
      const Piece = PIECES[id];
      return <group key={id} ref={(node) => { if (node) refs.current[id] = node; }} onClick={pick()} {...hover}>
        <Piece />
      </group>;
    })}
    {/* Standby feed: static on purpose. It only carries current during an outage,
        so it must not share the animated amber path that runs every day. */}
    <Tube from={[6.75, 1.26, -3.62]} to={[6.60, 1.44, -3.86]} radius={.03} />
    <Tube from={[6.60, 1.44, -3.86]} to={[6.42, 1.48, -3.72]} radius={.03} />
  </group>;
}
