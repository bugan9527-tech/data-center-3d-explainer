import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges, Html, Line } from '@react-three/drei';
import { BufferGeometry, Color, CurvePath, DoubleSide, Float32BufferAttribute, LineCurve3, Quaternion, Vector3 } from 'three';
import { chapterById, coolingBase, powerChain, powerChainB, SUPPORT_STEP_DURATION, supportColors, supportNodes, RACK_COLUMNS } from '../data/supportSystems.js';
import FlowGlow from './FlowGlow.jsx';

const toneColor = { power: supportColors.power, cold: supportColors.cold, warm: supportColors.warm };

function polyline(points) {
  const curve = new CurvePath();
  for (let index = 0; index < points.length - 1; index += 1) {
    curve.add(new LineCurve3(new Vector3(...points[index]), new Vector3(...points[index + 1])));
  }
  return curve;
}

function curveLength(points) {
  return points.reduce((total, point, index) => index === 0 ? 0 : total + new Vector3(...points[index - 1]).distanceTo(new Vector3(...point)), 0);
}

function arrowSet(curve, count) {
  return Array.from({ length: count }, (_, index) => {
    const t = count === 1 ? .5 : (index + .5) / count;
    return { position: curve.getPoint(t), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), curve.getTangent(t).normalize()) };
  });
}

function StaticPath({ points, color, opacity = .3, width = 1.5, arrows = 2 }) {
  const geometry = useMemo(() => polyline(points), [points]);
  const cones = useMemo(() => arrows ? arrowSet(geometry, arrows) : [], [geometry, arrows]);
  return <group>
    <Line points={points} color={color} lineWidth={width} transparent opacity={opacity} />
    {cones.map((arrow, index) => <mesh key={index} position={arrow.position} quaternion={arrow.quaternion}>
      <coneGeometry args={[.04, .12, 8]} /><meshBasicMaterial color={color} transparent opacity={Math.min(1, opacity + .3)} />
    </mesh>)}
  </group>;
}

// P1-2: a real ribbon, not a wider line. The width is in world units
// (0.12–0.18) so the stream reads as a band even when the camera is pulled
// back; the thin line stays as the geometric reference.
function FlowBand({ points, color, width = .16, opacity = .5 }) {
  const geometry = useMemo(() => {
    const vertices = points.map((point) => new Vector3(...point));
    const positions = [];
    const indices = [];
    const up = new Vector3(0, 1, 0);
    const side = new Vector3();
    for (let index = 0; index < vertices.length; index += 1) {
      const previous = vertices[Math.max(0, index - 1)];
      const next = vertices[Math.min(vertices.length - 1, index + 1)];
      const tangent = new Vector3().subVectors(next, previous).normalize();
      side.crossVectors(tangent, up);
      if (side.lengthSq() < .0001) side.crossVectors(tangent, new Vector3(1, 0, 0));
      side.normalize().multiplyScalar(width / 2);
      positions.push(
        vertices[index].x + side.x, vertices[index].y - .006, vertices[index].z + side.z,
        vertices[index].x - side.x, vertices[index].y - .006, vertices[index].z - side.z,
      );
    }
    for (let index = 0; index < vertices.length - 1; index += 1) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const buffer = new BufferGeometry();
    buffer.setAttribute('position', new Float32BufferAttribute(positions, 3));
    buffer.setIndex(indices);
    return buffer;
  }, [points, width]);
  return <mesh geometry={geometry} renderOrder={-1} raycast={() => null}>
    <meshBasicMaterial color={color} transparent opacity={opacity} side={DoubleSide} depthWrite={false} toneMapped={false} />
  </mesh>;
}

const UP = new Vector3(0, 1, 0);
const DASH_SLOTS = 7;
const DASH_SPAN = .038;
const ARROW_PHASES = [.25, .5, .75];

// Short bright dashes ride along the path with the same progress that moves the
// heads. They are the only part of the line that changes frame to frame; with
// reduced motion they stay at fixed slots and schedule no frames.
function MovingDashes({ curve, progressRef, color, opacity, reducedMotion }) {
  const line = useRef();
  const initial = useMemo(() => {
    const points = [];
    for (let slot = 0; slot < DASH_SLOTS; slot += 1) {
      const start = slot / DASH_SLOTS;
      const end = Math.min(1, start + DASH_SPAN);
      points.push(curve.getPoint(start), curve.getPoint(end));
    }
    return points;
  }, [curve]);
  const write = (progress) => {
    if (!line.current) return;
    const flat = [];
    for (let slot = 0; slot < DASH_SLOTS; slot += 1) {
      const start = reducedMotion ? slot / DASH_SLOTS : ((progress % 1) + slot / DASH_SLOTS) % 1;
      const end = start + DASH_SPAN;
      if (end <= 1) {
        const a = curve.getPoint(start);
        const b = curve.getPoint(end);
        flat.push(a.x, a.y, a.z, b.x, b.y, b.z);
      } else {
        const a = curve.getPoint(start);
        const b = curve.getPoint(1);
        const c = curve.getPoint(0);
        const d = curve.getPoint(end - 1);
        flat.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
      }
    }
    line.current.geometry.setPositions(flat);
  };
  useEffect(() => { write(progressRef.current); }, [curve, reducedMotion]);
  useFrame(() => { if (!reducedMotion) write(progressRef.current); });
  return <Line ref={line} segments points={initial} color={color} lineWidth={1.8}
    transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false} />;
}

function CruisingArrows({ curve, length, progressRef, color, reducedMotion }) {
  const arrows = useRef([]);
  const point = useMemo(() => new Vector3(), []);
  const tangent = useMemo(() => new Vector3(), []);
  const offset = Math.max(.08, .9 / length);
  const update = (progress) => {
    for (let index = 0; index < 3; index += 1) {
      const arrow = arrows.current[index];
      if (!arrow) continue;
      const at = reducedMotion ? ARROW_PHASES[index] : progress >= 1 ? 1 : (progress + index / 3 + offset) % 1;
      curve.getPoint(at, point);
      arrow.position.copy(point);
      curve.getTangent(at, tangent).normalize();
      arrow.quaternion.setFromUnitVectors(UP, tangent);
    }
  };
  useEffect(() => { update(progressRef.current); }, [curve, reducedMotion, length]);
  useFrame(() => update(progressRef.current));
  return <group>
    {Array.from({ length: 3 }, (_, index) => <mesh key={index} ref={(arrow) => { arrows.current[index] = arrow; }} renderOrder={2}>
      <coneGeometry args={[.04, .15, 8]} /><meshBasicMaterial color={color} transparent opacity={.95} depthWrite={false} depthTest={false} />
    </mesh>)}
  </group>;
}

function StepPath({ points, color, progressRef, animate, glow, reducedMotion, size = .32, opacity = 1 }) {
  const { invalidate } = useThree();
  const geometry = useMemo(() => polyline(points), [points]);
  const length = useMemo(() => curveLength(points), [points]);
  const ends = useMemo(() => [geometry.getPoint(0), geometry.getPoint(1)], [geometry]);
  useFrame(() => {
    if (animate) invalidate();
  });
  useEffect(() => { invalidate(); }, [points, invalidate]);
  return <group>
    <Line points={points} color={color} lineWidth={5.4} transparent opacity={.88 * opacity} />
    <MovingDashes curve={geometry} progressRef={progressRef} color={color} opacity={.92 * opacity} reducedMotion={reducedMotion} />
    <CruisingArrows curve={geometry} length={length} progressRef={progressRef} color={color} reducedMotion={reducedMotion} />
    {glow && <FlowGlow curve={geometry} progressRef={progressRef} color={color} size={size} opacity={opacity} />}
    {reducedMotion && ends.map((end, index) => <mesh key={index} position={end} raycast={() => null}>
      <sphereGeometry args={[.055, 8, 8]} /><meshBasicMaterial color={color} />
    </mesh>)}
  </group>;
}

function NodeFrame({ id, node, active, persistent, selected, onSelect, showLabels, portal }) {
  const color = supportColors[node.system === 'cooling' ? (id === 'return' || id === 'exhaust' ? 'warm' : 'cold') : 'power'];
  if (!(selected || active || persistent)) return null;
  return <group>
    {(selected || active) && <mesh position={node.anchor} raycast={() => null}>
      <boxGeometry args={node.frame.map((value) => value + (selected ? .05 : .01))} />
      <meshBasicMaterial visible={false} />
      <Edges color={selected ? '#2468df' : color} />
    </mesh>}
    {showLabels && (selected || active) && <Html portal={portal} position={node.label} center zIndexRange={[15, 0]}>
      <button type="button" tabIndex={-1} className={`flow-node-label support-label ${selected ? 'is-selected' : ''}`} style={{ '--label-color': color }} onClick={() => onSelect?.(id)}>
        {selected && '✓ '}{node.name}
        {active ? <small>参与本步</small> : persistent ? <small>持续支撑</small> : null}
      </button>
    </Html>}
  </group>;
}

export default function SupportVisualization({ layers, focus, step = 0, clock, playing, loop = false, reducedMotion, selectedNode, onSelectNode, compact = false }) {
  const { size, gl, invalidate } = useThree();
  const portal = useMemo(() => ({ current: gl.domElement.parentNode }), [gl]);
  const chapter = focus ? chapterById[focus] : null;
  const stage = chapter ? chapter.steps[step] : null;
  const progress = useRef(0);
  // Loop mode keeps power and cold air moving together while the request flow
  // plays, so all three layers read as one running scene.
  const loopProgress = useRef(0);
  const powerCurve = useMemo(() => polyline(powerChain), []);
  const powerCurveB = useMemo(() => polyline(powerChainB), []);
  const coldCurves = useMemo(() => coolingBase.supply.map((points) => polyline(points)), []);
  const warmCurve = useMemo(() => polyline(coolingBase.return), []);
  const jetCurves = useMemo(() => coolingBase.branch.map((points) => polyline(points)), []);
  useFrame((_, delta) => {
    if (!loop || !playing) return;
    loopProgress.current = (loopProgress.current + Math.min(delta, .12) / 3.4) % 1;
    invalidate();
  });
  const showLabels = size.width > 650 && !compact;
  const primary = stage ? stage.paths.reduce((best, item) => curveLength(item.points) > curveLength(best.points) ? item : best, stage.paths[0]) : null;
  const publish = () => {
    gl.domElement.dataset.support = JSON.stringify({
      chapter: focus, step: stage?.title ?? null, progress: Number(progress.current.toFixed(3)),
      active: stage?.active ?? [], nodes: chapter?.nodes ?? [], persistent: chapter?.persistent ?? [],
      visible: { power: !!layers.power, cooling: !!layers.cooling, heat: !!layers.heat },
    });
  };
  useFrame(() => {
    if (clock) progress.current = Math.min(1, clock.current.elapsed / SUPPORT_STEP_DURATION);
    publish();
    if (playing && !reducedMotion) invalidate();
  });
  useEffect(() => {
    if (clock) progress.current = Math.min(1, clock.current.elapsed / SUPPORT_STEP_DURATION);
    publish();
    invalidate();
  }, [focus, step, clock, layers.power, layers.cooling, invalidate]);
  return <group>
    {layers.power && <>
      <StaticPath points={powerChain} color={supportColors.power} opacity={compact ? .72 : .64} width={compact ? 3.4 : 3.2} arrows={3} />
      {/* Second utility feed into the UPS bypass: thinner and dimmer so the main
          path still reads first. */}
      <StaticPath points={powerChainB} color={supportColors.power} opacity={compact ? .44 : .38} width={compact ? 2.0 : 1.8} arrows={1} />
      {RACK_COLUMNS.map(({ x, z }) => <StaticPath key={`${x}-${z}`} points={[[x, 2.94, -.27], [x, 2.62, z - .28], [x, 2.34, z - .44]]} color={supportColors.power} opacity={compact ? .26 : .26} width={1.2} arrows={0} />)}
    </>}
    {layers.cooling && <>
      {coolingBase.supply.map((points, index) => <group key={`s${index}`}>
        <FlowBand points={points} color={supportColors.cold} width={.22} opacity={compact ? .62 : .66} />
        <StaticPath points={points} color={supportColors.cold} opacity={compact ? .7 : .62} width={compact ? 3.4 : 3.2} arrows={2} />
      </group>)}
      {coolingBase.branch.map((points, index) => <StaticPath key={`b${index}`} points={points} color={supportColors.cold} opacity={compact ? .44 : .4} width={1.8} arrows={1} />)}
    </>}
    {layers.heat && <>
      {coolingBase.exhaust.map((points, index) => <StaticPath key={`e${index}`} points={points} color={supportColors.warm} opacity={compact ? .44 : .4} width={1.8} arrows={1} />)}
      <group>
        <FlowBand points={coolingBase.return} color={supportColors.warmDeep} width={.22} opacity={compact ? .56 : .6} />
        <StaticPath points={coolingBase.return} color={supportColors.warm} opacity={compact ? .7 : .62} width={compact ? 3.4 : 3.2} arrows={2} />
      </group>
    </>}
    {loop && playing && <>
      {layers.power && <FlowGlow curve={powerCurve} progressRef={loopProgress} color={supportColors.power} size={.36} />}
      {layers.power && <FlowGlow curve={powerCurveB} progressRef={loopProgress} color={supportColors.power} size={.2} heads={1} tail={.05} opacity={.85} phase={.55} />}
      {layers.cooling && coldCurves.map((curve, index) => <FlowGlow key={`cold-${index}`} curve={curve} progressRef={loopProgress}
        color={supportColors.cold} size={.36} phase={index * .42} />)}
      {layers.heat && <>
        <FlowGlow curve={warmCurve} progressRef={loopProgress} color={supportColors.warm} size={.32} phase={.2} />
        {jetCurves.map((curve, index) => <FlowGlow key={`jet-${index}`} curve={curve} progressRef={loopProgress}
          color={supportColors.warm} size={.22} heads={1} tail={.05} opacity={.9} phase={(index + 1) / (jetCurves.length + 1)} />)}
      </>}
      {layers.cooling && jetCurves.map((curve, index) => <FlowGlow key={`cold-jet-${index}`} curve={curve} progressRef={loopProgress}
        color={supportColors.cold} size={.2} heads={1} tail={.05} opacity={.7} phase={(index + 1) / (jetCurves.length + 1)} />)}
    </>}
    {stage && stage.paths.map((path, index) => <StepPath key={`${focus}-${step}-${index}`} points={path.points} color={toneColor[path.tone]} progressRef={progress} animate={playing && !reducedMotion} glow={!reducedMotion} reducedMotion={reducedMotion} size={path === primary ? .32 : .192} opacity={path === primary ? 1 : .6} />)}
    {stage?.transition?.map((point, index) => <mesh key={`transition-${index}`} position={point} renderOrder={4} raycast={() => null}>
      <sphereGeometry args={[.08, 12, 12]} />
      <meshBasicMaterial color={new Color(supportColors.cold).lerp(new Color(supportColors.warm), stage.transition.length > 1 ? index / (stage.transition.length - 1) : 0)} transparent opacity={.95} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>)}
    {chapter && stage && chapter.nodes.map((id) => <NodeFrame key={id} id={id} node={supportNodes[id]} active={stage.active.includes(id)} persistent={chapter.persistent.includes(id)} selected={selectedNode === id} onSelect={onSelectNode} showLabels={showLabels} portal={portal} />)}
  </group>;
}
