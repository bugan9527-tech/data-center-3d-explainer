import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import { Box } from './primitives.jsx';
import { twinPalette } from '../data/twinData.js';
import glowTexture from './glowTexture.js';

// Fire and security equipment. Every piece is schematic geometry rather than a
// GLB node: the parts are small, and a cabinet-sized asset would cost far more
// triangles than it earns. Positions come from docs/TWIN_BATCH_A_SPEC.md and sit
// inside the floor's opaque core (|x| <= 5.1, z <= 3.3), clear of the busway at
// y 2.86 / z -0.27 and of both overhead cable trays.
const SAFETY = twinPalette.fire;
const SELECTED = twinPalette.accent;
const PIPE = '#6b3a3e';
// Pipe plane: above the cold aisles, below nothing else in the scene.
const MAIN_Y = 2.96;
const FRONT_Z = 1.52;
const REAR_Z = -2.45;
const RISER_X = -4.9;
// Nozzles sit over each rack column; detectors sit between them so the two never
// occupy the same point.
const FRONT_COLUMNS = [-3.65, -1.65, -.3, 2.1, 3.55];
const REAR_COLUMNS = [-3.65, -1.65, -.3];
const FRONT_DETECTORS = [-2.65, -.975, .9, 2.825];
const REAR_DETECTORS = [-2.65, -.975];
const UP = new Vector3(0, 1, 0);

function Pipe({ from, to, radius = .036 }) {
  const a = new Vector3(...from);
  const b = new Vector3(...to);
  const direction = b.clone().sub(a);
  const quaternion = new Quaternion().setFromUnitVectors(UP, direction.clone().normalize());
  return <mesh position={a.clone().add(b).multiplyScalar(.5)} quaternion={quaternion} castShadow>
    <cylinderGeometry args={[radius, radius, direction.length(), 8]} />
    <meshStandardMaterial color={PIPE} metalness={.42} roughness={.45} />
  </mesh>;
}

function Elbow({ position }) {
  return <mesh position={position}><sphereGeometry args={[.052, 10, 8]} /><meshStandardMaterial color={PIPE} metalness={.42} roughness={.45} /></mesh>;
}

function SmokeDetector({ position }) {
  return <group position={position}>
    <mesh position={[0, -.02, 0]}><cylinderGeometry args={[.014, .014, .042, 6]} /><meshStandardMaterial color="#425668" metalness={.5} roughness={.45} /></mesh>
    <mesh position={[0, -.062, 0]}><cylinderGeometry args={[.058, .058, .04, 14]} /><meshStandardMaterial color="#c6d6e2" roughness={.5} /></mesh>
    <mesh position={[0, -.086, 0]}><cylinderGeometry args={[.030, .030, .014, 12]} /><meshStandardMaterial color="#778c9d" roughness={.6} /></mesh>
  </group>;
}

function Nozzle({ x, z }) {
  return <group position={[x, MAIN_Y, z]}>
    <Pipe from={[0, 0, 0]} to={[0, -.22, 0]} radius={.013} />
    <mesh position={[0, -.248, 0]}><cylinderGeometry args={[.052, .034, .045, 12]} /><meshStandardMaterial color="#7a3d3e" metalness={.55} roughness={.4} /></mesh>
  </group>;
}

function Piping() {
  return <group>
    <Pipe from={[RISER_X, MAIN_Y, FRONT_Z]} to={[4.1, MAIN_Y, FRONT_Z]} />
    <Pipe from={[RISER_X, MAIN_Y, FRONT_Z]} to={[RISER_X, MAIN_Y, REAR_Z]} />
    // The rear run needs its own horizontal main: the branch only reaches the
    // aisle at RISER_X, so without this the rear detectors hang from nothing.
    <Pipe from={[RISER_X, MAIN_Y, REAR_Z]} to={[.2, MAIN_Y, REAR_Z]} />
    <Pipe from={[RISER_X, MAIN_Y, FRONT_Z]} to={[RISER_X, 1.92, FRONT_Z]} />
    <Pipe from={[RISER_X, 1.92, FRONT_Z]} to={[RISER_X, 1.92, 1.02]} />
    <Pipe from={[RISER_X, 1.92, 1.02]} to={[-4.82, 1.84, 1.02]} />
    <Elbow position={[RISER_X, MAIN_Y, FRONT_Z]} />
    <Elbow position={[RISER_X, MAIN_Y, REAR_Z]} />
    <Elbow position={[RISER_X, 1.92, FRONT_Z]} />
    {/* Capped ends: a bare cylinder end reads as a cut pipe. */}
    <Elbow position={[4.1, MAIN_Y, FRONT_Z]} />
    <Elbow position={[.2, MAIN_Y, REAR_Z]} />
    {FRONT_DETECTORS.map((x) => <SmokeDetector key={`d${x}`} position={[x, MAIN_Y, FRONT_Z]} />)}
    {REAR_DETECTORS.map((x) => <SmokeDetector key={`dr${x}`} position={[x, MAIN_Y, REAR_Z]} />)}
    {FRONT_COLUMNS.map((x) => <Nozzle key={`n${x}`} x={x} z={FRONT_Z} />)}
    {REAR_COLUMNS.map((x) => <Nozzle key={`nr${x}`} x={x} z={REAR_Z} />)}
  </group>;
}

function BottleCabinet({ position, accent }) {
  return <group position={position}>
    <Box position={[0, .05, 0]} size={[.60, .10, .54]} color="#15232f" roughness={.85} />
    <Box position={[0, .93, 0]} size={[.56, 1.60, .50]} color="#2b3b4b" roughness={.46} metalness={.3} />
    <Box position={[0, .93, .253]} size={[.50, 1.50, .014]} color="#1c2b38" roughness={.5} />
    {[-.46, -.24, -.02, .20, .42].map((y) => <Box key={y} position={[0, .93 + y, .262]} size={[.42, .052, .008]} color="#435767" roughness={.55} />)}
    <Box position={[0, 1.58, .262]} size={[.30, .05, .010]} color={accent} metalness={.3} />
    <Box position={[.18, .60, .263]} size={[.026, .14, .010]} color="#587082" metalness={.6} />
    <Box position={[0, 1.77, 0]} size={[.60, .06, .54]} color="#243442" roughness={.6} />
    <Box position={[-.15, 1.82, .04]} size={[.10, .05, .10]} color="#354a5b" metalness={.55} />
  </group>;
}

function FirePanel({ position }) {
  return <group position={position}>
    <Box position={[0, 0, 0]} size={[.06, .58, .44]} color="#1d2d3b" roughness={.46} />
    <Box position={[.031, .09, 0]} size={[.010, .24, .30]} color="#071f2d" roughness={.35} />
    <Box position={[.031, -.13, 0]} size={[.010, .10, .30]} color="#263947" roughness={.5} />
    {[-.10, 0, .10].map((z) => <Box key={z} position={[.036, -.205, z]} size={[.008, .05, .05]} color="#405565" metalness={.5} />)}
  </group>;
}

function Annunciator({ position, rotation }) {
  return <group position={position} rotation={rotation}>
    {/* The wall is nearly background-coloured, so a lighter back plate is what
        makes the unit read as mounted instead of floating. */}
    <Box position={[0, .01, -.045]} size={[.17, .22, .02]} color="#3c5062" roughness={.75} />
    <Box position={[0, 0, 0]} size={[.11, .14, .07]} color="#d3e0ea" roughness={.5} />
    <mesh position={[0, .10, 0]}><cylinderGeometry args={[.045, .045, .075, 12]} /><meshStandardMaterial color="#c9333c" transparent opacity={.9} roughness={.3} /></mesh>
    <mesh position={[0, .005, .042]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.034, .034, .014, 12]} /><meshStandardMaterial color={twinPalette.warn} emissive={twinPalette.warn} emissiveIntensity={.8} roughness={.4} /></mesh>
    <mesh position={[0, -.095, 0]}><cylinderGeometry args={[.012, .012, .05, 6]} /><meshStandardMaterial color="#405565" metalness={.5} /></mesh>
  </group>;
}

function SurveillanceCamera({ position, rotation }) {
  return <group position={position} rotation={rotation}>
    <Box position={[0, 0, 0]} size={[.09, .05, .07]} color="#263745" metalness={.4} roughness={.5} />
    <mesh position={[0, -.075, 0]}><sphereGeometry args={[.052, 12, 10]} /><meshStandardMaterial color="#cfdfe9" roughness={.42} metalness={.15} /></mesh>
    <mesh position={[0, -.075, .052]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.026, .026, .022, 12]} /><meshStandardMaterial color="#0d1a24" metalness={.55} roughness={.35} /></mesh>
  </group>;
}

// Two posts and a lintel only: the scene has no right wall, so a closed door
// would contradict the model and would stand in front of rack-front.
function Entrance({ accent }) {
  return <group>
    <Box position={[-4.55, 1.05, 2.18]} size={[.13, 2.10, .13]} color="#324555" roughness={.5} metalness={.3} />
    <Box position={[-4.55, 1.05, 3.02]} size={[.13, 2.10, .13]} color="#324555" roughness={.5} metalness={.3} />
    <Box position={[-4.55, 2.105, 2.60]} size={[.13, .09, .97]} color="#324555" roughness={.5} metalness={.3} />
    <Box position={[-4.55, .015, 2.60]} size={[.13, .03, .97]} color="#20313f" roughness={.8} />
    <Box position={[-4.47, 1.15, 3.075]} size={[.05, .20, .12]} color="#1a2a38" roughness={.45} />
    <Box position={[-4.467, 1.17, 3.075]} size={[.018, .10, .06]} color={accent} metalness={.3} />
    <Box position={[-4.47, 1.98, 2.18]} size={[.045, .15, .05]} color="#3c5060" metalness={.6} />
  </group>;
}

const ALARM_SPOTS = [
  ...FRONT_COLUMNS.map((x) => [x, MAIN_Y, FRONT_Z]),
  ...REAR_COLUMNS.map((x) => [x, MAIN_Y, REAR_Z]),
  ...FRONT_DETECTORS.map((x) => [x, MAIN_Y - .08, FRONT_Z]),
  ...REAR_DETECTORS.map((x) => [x, MAIN_Y - .08, REAR_Z]),
  [-4.40, 1.95, -4.73],
  [1.60, 1.95, -4.73],
];

// Alarm demo only: an additive dashed line along the existing suppression pipe
// and local red breathing halos on the nozzles and detectors. It is layered on
// top of the real geometry rather than recolouring the pipe, so the normal scene
// still explains the same physical route.
function AlarmOverlay({ animate }) {
  const { invalidate } = useThree();
  const map = useMemo(() => glowTexture(), []);
  const halos = useRef([]);
  useFrame(({ clock }) => {
    if (!animate) return;
    const time = clock.elapsedTime;
    halos.current.forEach((halo, index) => {
      if (halo) halo.material.opacity = .28 + .3 * (.5 + .5 * Math.sin(time * 2.1 + index * .55));
    });
    invalidate();
  });
  return <group raycast={() => null}>
    <Line points={[[RISER_X, MAIN_Y, FRONT_Z], [4.1, MAIN_Y, FRONT_Z]]} color={twinPalette.fire} lineWidth={2.4} dashed dashSize={.12} gapSize={.08} transparent opacity={.65} depthWrite={false} />
    <Line points={[[RISER_X, MAIN_Y, REAR_Z], [.2, MAIN_Y, REAR_Z]]} color={twinPalette.fire} lineWidth={2.2} dashed dashSize={.12} gapSize={.08} transparent opacity={.5} depthWrite={false} />
    <Line points={[[RISER_X, MAIN_Y, FRONT_Z], [RISER_X, MAIN_Y, REAR_Z], [RISER_X, 1.95, FRONT_Z]]} color={twinPalette.fire} lineWidth={2} dashed dashSize={.1} gapSize={.08} transparent opacity={.45} depthWrite={false} />
    {ALARM_SPOTS.map((position, index) => <sprite key={index} position={position} ref={(sprite) => { halos.current[index] = sprite; }} scale={[.62, .62, 1]} renderOrder={3}>
      <spriteMaterial map={map} color={twinPalette.fire} transparent opacity={.34} depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>)}
  </group>;
}

export default function SafetyInfrastructure({ selected, onSelect, alarm = false, fireVisible = true, animate = false, visible = true }) {
  const accent = selected === 'safety' ? SELECTED : SAFETY;
  const handlers = onSelect ? {
    onClick: (event) => { event.stopPropagation(); onSelect('safety'); },
    onPointerOver: (event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { document.body.style.cursor = 'auto'; },
  } : {};
  return <group {...handlers} visible={visible}>
    <BottleCabinet position={[-4.78, 0, 0.34]} accent={accent} />
    <BottleCabinet position={[-4.78, 0, 1.02]} accent={accent} />
    {/* The left wall dissolves from y 1.15 up, so only the controller (top 1.14)
        can hang there. The annunciators and the entrance camera move to the back
        wall and to the door lintel, which are solid at those heights. */}
    <FirePanel position={[-5.86, .85, -.15]} />
    <Annunciator position={[-4.40, 1.95, -4.73]} rotation={[0, 0, 0]} />
    <Annunciator position={[1.60, 1.95, -4.73]} rotation={[0, 0, 0]} />
    <SurveillanceCamera position={[-4.55, 2.02, 2.60]} rotation={[0, Math.PI, 0]} />
    <SurveillanceCamera position={[2.90, 2.10, -4.73]} rotation={[0, 0, 0]} />
    <Entrance accent={accent} />
    <Piping />
    {alarm && fireVisible && <AlarmOverlay animate={animate} />}
  </group>;
}
