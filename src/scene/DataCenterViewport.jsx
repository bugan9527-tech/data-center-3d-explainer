import { Suspense, useEffect, useMemo, useRef, useLayoutEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, useGLTF } from '@react-three/drei';
import { AdditiveBlending, CatmullRomCurve3, ACESFilmicToneMapping, DoubleSide, PCFShadowMap, Vector3 } from 'three';
import { systemById, systems } from '../data/systems.js';

import { racks, rackModels } from '../data/roomLayout.js';
import RoomCameraRig from './RoomCameraRig.jsx';
import SceneReady from './SceneReady.jsx';
import RequestVisualization from './RequestVisualization.jsx';
import SupportVisualization from './SupportVisualization.jsx';
import { Box } from './primitives.jsx';
import floorFadeTexture from './floorFade.js';
import FloorProps from './FloorProps.jsx';
import { FanTray, RackPdu, RoomInfrastructure } from './Infrastructure.jsx';
import SafetyInfrastructure from './SafetyInfrastructure.jsx';
import PowerExterior from './PowerExterior.jsx';
import FacilityFittings from './FacilityFittings.jsx';
import { requestNodes, requestWorkflow } from '../data/requestFlow.js';
import { rackParts } from '../data/rackParts.js';
import { twinPalette, qualityPresets } from '../data/twinData.js';
import { applyRackTheme, auraTexture, contactShadowTexture } from './techMaterials.js';
import TechEnvironment from './TechEnvironment.jsx';
import Bloom from './Bloom.jsx';
import { DeviceLinks, HeatMap, StoragePulse } from './TwinEffects.jsx';

const labelPositions = {
  network: [-3.65, 2.7, 1.2], compute: [-.85, 2.9, -.2], storage: [3.2, 2.7, 1.2],
  cooling: [-4.0, 2.5, -3.1], power: [3.3, 2.5, -3.1], monitoring: [.25, 3.2, -4],
  safety: [-4.85, 2.45, 1.45], backup: [1.55, 2.62, -1.75],
};
const paths = {
  request: [[-5.4,.45,2.85],[-4.8,1.3,2.3],[-3.65,1.3,1.3]],
  network: [[-3.65,2.45,.65],[-3.65,2.9,.65],[-1,2.9,.65],[-1,2.45,.65]],
  compute: [[-1,1.8,1.27],[-1,1.15,1.35],[-.5,.9,1.3]],
  storage: [[-.3,2.45,.65],[.5,2.85,.65],[2.1,2.85,.65],[2.1,2.45,.65]],
};

function SceneHtml(props) {
  const { gl } = useThree();
  // Keep the annotation portal stable when Canvas connects pointer events.
  const portal = useMemo(() => ({ current: gl.domElement.parentNode }), [gl]);
  return <Html portal={portal} {...props} />;
}

function SelectionFrame({ color, width = .94, depth = 1.24, height = 2.25 }) {
  return <group>
    {[-width/2,width/2].flatMap((x) => [-depth/2,depth/2].map((z) => <Box key={`${x}-${z}`} position={[x,height/2,z]} size={[.023,height,.023]} color={color} />))}
    {[.025,height].flatMap((y) => [<Box key={`x${y}`} position={[0,y,depth/2]} size={[width,.022,.022]} color={color} />,<Box key={`b${y}`} position={[0,y,-depth/2]} size={[width,.022,.022]} color={color} />,<Box key={`l${y}`} position={[-width/2,y,0]} size={[.022,.022,depth]} color={color} />,<Box key={`r${y}`} position={[width/2,y,0]} size={[.022,.022,depth]} color={color} />])}
  </group>;
}

// A soft contact shadow plus a very low cyan rim under every cabinet. The two
// planes share one 128 px texture each, so eight racks cost two uploads.
function RackBaseFX({ accent = twinPalette.accent }) {
  const shadow = useMemo(() => contactShadowTexture(), []);
  const aura = useMemo(() => auraTexture(), []);
  return <group position={[0, .012, 0]} raycast={() => null}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.72, 1.62, 1]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={shadow} transparent opacity={.72} depthWrite={false} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.9, 1.8, 1]} position={[0, .002, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={aura} color={accent} transparent opacity={.26} depthWrite={false} blending={AdditiveBlending} toneMapped={false} />
    </mesh>
  </group>;
}

// Local fault indicator: one red emitter on the cabinet's front edge, never a
// whole-cabinet tint. It freezes under reduced motion and when the demo is paused.
function StatusBeacon({ mode, animate, reducedMotion }) {
  const { invalidate } = useThree();
  const sprite = useRef();
  const ring = useRef();
  const phase = useRef(0);
  useFrame((_, delta) => {
    if (mode === 'normal' || reducedMotion || !animate) return;
    phase.current += Math.min(delta, .06);
    const pulse = .5 + .5 * Math.sin(phase.current * 2.4);
    if (sprite.current) sprite.current.material.opacity = .35 + pulse * .45;
    if (ring.current) ring.current.scale.setScalar(1 + pulse * .16);
    invalidate();
  });
  if (mode === 'normal') return null;
  return <group position={[.43, 1.02, .61]} raycast={() => null}>
    <mesh renderOrder={4} raycast={() => null}>
      <sphereGeometry args={[.032, 10, 8]} />
      <meshBasicMaterial color={twinPalette.fire} toneMapped={false} />
    </mesh>
    <sprite ref={sprite} scale={[.48, .48, 1]} renderOrder={4}>
      <spriteMaterial map={auraTexture()} color={twinPalette.fire} transparent opacity={.55} depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4} raycast={() => null}>
      <ringGeometry args={[.09, .13, 24]} />
      <meshBasicMaterial color={twinPalette.fire} transparent opacity={.42} depthWrite={false} depthTest={false} toneMapped={false} />
    </mesh>
    <pointLight intensity={1.4} distance={1.5} decay={2} color={twinPalette.fire} />
  </group>;
}

// All three cabinets expose part_* meshes now, so the exploded view reads its
// list from rackParts instead of the old per-kind label tables.
const EMPTY_PARTS = [];

// A slow additive ring under whatever device is open: it reads as an inspection
// field rather than decoration, and it freezes under reduced motion.
function ScanRing({ position, color = '#3f8ff0', reducedMotion = false, animate = false }) {
  const ring = useRef();
  useFrame((_, delta) => {
    // Frozen unless the demo is running: a paused frame must stay identical.
    if (!ring.current || reducedMotion || !animate) return;
    ring.current.rotation.z += Math.min(delta, .05) * .35;
    ring.current.material.opacity = .5 + Math.sin(performance.now() / 900) * .14;
  });
  return <group position={position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
    <mesh ref={ring} renderOrder={4} raycast={() => null}>
      <ringGeometry args={[1.18, 1.25, 72]} />
      <meshBasicMaterial color={color} transparent opacity={.5} depthWrite={false} depthTest={false} side={DoubleSide} />
    </mesh>
    <mesh renderOrder={4} raycast={() => null}>
      <ringGeometry args={[1.5, 1.53, 72]} />
      <meshBasicMaterial color={color} transparent opacity={.22} depthWrite={false} depthTest={false} side={DoubleSide} />
    </mesh>
  </group>;
}

function Rack({ rack, selected, selectedRack, expanded, teardown, teardownPart, reducedMotion, focusLabel, focusLine, onSelect, onInspect, statusMode, mode, step, selectedNode, support, animate, onSelectSupportNode }) {
  const { invalidate, gl, camera, size } = useThree();
  const [hovered, setHovered] = useState(false);
  const { scene } = useGLTF(rackModels[rack.kind]);
  const activeMaterials = useMemo(() => {
    applyRackTheme(scene);
    const materials = new Map();
    scene.traverse(obj => { if (obj.isMesh && !materials.has(obj.material)) { const mat = obj.material.clone(); mat.emissive.set('#c18a1e'); mat.emissiveIntensity = .55; materials.set(obj.material, mat); } });
    return materials;
  }, [scene]);
  useEffect(() => () => activeMaterials.forEach(mat => mat.dispose()), [activeMaterials]);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; object.userData.originalMaterial = object.material; }
      // Origins now sit at each part's geometry centre, so the loaded translation
      // is the base the pull-out animation must add to instead of overwrite.
      if (object.name?.startsWith('part_')) object.userData.base = object.position.clone();
    });
    return clone;
  }, [scene]);
  const active = selected === rack.kind && mode !== 'overview' && (rack.kind !== 'compute' || selectedRack === rack.id) && (!selectedNode || requestNodes[selectedNode].rack === rack.id);
  // Only the lead cabinet of each kind opens; the twin stays closed so the two
  // do not overlap when their shells slide out.
  const leadRack = rack.kind === 'compute' ? selectedRack : rack.kind === 'network' ? 'N01' : rack.kind === 'storage' ? 'S01' : 'B01';
  const teardownActive = !!teardown && active && rack.id === leadRack;
  const parts = rackParts[rack.kind] ?? EMPTY_PARTS;
  const partNodes = useMemo(() => parts
    .map((def) => {
      const node = model.getObjectByName(def.id);
      return node ? { def, node, base: node.userData.base || node.position.clone() } : null;
    })
    .filter(Boolean), [model, parts]);
  const fanFollow = useRef();
  const pduFollow = useRef();
  const labelWorld = useMemo(() => new Vector3(), []);
  const fanFocused = teardownActive && teardownPart === 'part_fan_tray';
  const pduFocused = teardownActive && teardownPart === 'part_pdu';
  // Below 520 px the numbered badges (21 px, 11–12 px apart at 375) stack into a
  // single column and cover the focused label, so phones keep the label and the
  // right-hand list only.
  const showPartDots = size.width >= 520;
  const shellMaterials = useRef([]);
  useEffect(() => {
    const shell = model.getObjectByName('enclosure');
    if (!shell) return () => {};
    const mats = [];
    shell.traverse((object) => {
      if (!object.isMesh) return;
      object.material = object.material.clone();
      object.material.transparent = true;
      mats.push(object.material);
    });
    shellMaterials.current = mats;
    return () => { mats.forEach((material) => material.dispose()); shellMaterials.current = []; };
  }, [model]);
  useEffect(() => {
    const shell = model.getObjectByName('enclosure');
    const bank = model.getObjectByName('server_bank');
    if (shell) shell.visible = !(active && expanded);
    if (bank) bank.position.z = active && expanded && !teardownActive ? .6 : 0;
  }, [active, expanded, model, teardownActive]);
  // Exploded view: the shell slides sideways while the parts step forward, so the
  // inside becomes readable without hiding the enclosure. Each part adds its pull
  // to the translation baked into the model instead of replacing it.
  useFrame((_, delta) => {
    const ease = reducedMotion ? 1 : Math.min(1, Math.min(delta, .08) * 4.5);
    let dirty = false;
    const shellOpacity = teardownActive ? .26 : 1;
    shellMaterials.current.forEach((material) => {
      if (Math.abs(material.opacity - shellOpacity) > (reducedMotion ? .0001 : .004)) {
        material.opacity = reducedMotion ? shellOpacity : material.opacity + (shellOpacity - material.opacity) * ease;
        material.depthWrite = material.opacity > .92;
        dirty = true;
      }
    });
    // The lead cabinet publishes its shell opacity so the regression can prove
    // the enclosure returns to fully opaque after closing.
    if (rack.id === leadRack && shellMaterials.current.length) {
      const opacity = shellMaterials.current[0].opacity.toFixed(3);
      if (gl.domElement.dataset.shellOpacity !== opacity) gl.domElement.dataset.shellOpacity = opacity;
    }
    const shell = model.getObjectByName('enclosure');
    if (shell) {
      const targetX = teardownActive ? -1.12 : 0;
      if (Math.abs(shell.position.x - targetX) > .0015) { shell.position.x = reducedMotion ? targetX : shell.position.x + (targetX - shell.position.x) * ease; dirty = true; }
      const targetY = teardownActive ? .12 : 0;
      if (Math.abs(shell.position.y - targetY) > .0015) { shell.position.y = reducedMotion ? targetY : shell.position.y + (targetY - shell.position.y) * ease; dirty = true; }
    }
    partNodes.forEach(({ node, base }, index) => {
      const target = base.z + (teardownActive ? .12 + index * .055 : 0);
      if (Math.abs(node.position.z - target) > .0015) {
        node.position.z = reducedMotion ? target : node.position.z + (target - node.position.z) * ease;
        dirty = true;
      }
    });
    // The fan tray and rack PDU are sibling components, so their wrappers must
    // follow the anchors; moving only the anchor would leave them inside the rack.
    const fanPart = partNodes.find(({ def }) => def.id === 'part_fan_tray');
    if (fanPart && fanFollow.current) {
      const offset = fanPart.node.position.z - fanPart.base.z;
      if (Math.abs(fanFollow.current.position.z - offset) > .0015) { fanFollow.current.position.z = offset; dirty = true; }
    }
    const pduPart = partNodes.find(({ def }) => def.id === 'part_pdu');
    if (pduPart && pduFollow.current) {
      const offset = pduPart.node.position.z - pduPart.base.z;
      if (Math.abs(pduFollow.current.position.z - offset) > .0015) { pduFollow.current.position.z = offset; dirty = true; }
    }
    // The focused callout is screen-space: project the part, then clamp the label
    // box into the canvas between the sidebar and the detail panel. A 3D Html
    // label cannot do this, which is why the low PDU fell below the viewport.
    if (teardownActive && teardownPart && focusLabel.current && focusLine.current) {
      const node = model.getObjectByName(teardownPart);
      if (node) {
        node.getWorldPosition(labelWorld);
        const vp = gl.domElement.parentNode.getBoundingClientRect();
        const point = labelWorld.clone().project(camera);
        const partX = (point.x + 1) * vp.width / 2;
        const partY = (1 - point.y) * vp.height / 2;
        if (teardownPart === 'part_pdu') labelWorld.y += .6;
        const lifted = labelWorld.clone().project(camera);
        const labelPointX = (lifted.x + 1) * vp.width / 2;
        const labelPointY = (1 - lifted.y) * vp.height / 2;
        const label = focusLabel.current;
        const w = label.offsetWidth || 110;
        const h = label.offsetHeight || 24;
        let safeLeft = 16, safeRight = vp.width - 16, safeTop = 16, safeBottom = vp.height - 16;
        const header = document.querySelector('.room-shell .app-header');
        const sidebar = document.querySelector('.room-shell .system-sidebar');
        const panel = document.querySelector('.room-shell .detail-panel');
        if (header && getComputedStyle(header).display !== 'none') {
          const r = header.getBoundingClientRect();
          if (r.bottom > vp.top && r.top < vp.bottom && r.right > vp.left && r.left < vp.right) safeTop = Math.max(safeTop, r.bottom - vp.top + 12);
        }
        if (sidebar && getComputedStyle(sidebar).display !== 'none') {
          const r = sidebar.getBoundingClientRect();
          if (r.right > vp.left && r.left < vp.right && r.bottom > vp.top && r.top < vp.bottom) safeLeft = Math.max(safeLeft, r.right - vp.left + 16);
        }
        if (panel && getComputedStyle(panel).display !== 'none') {
          const r = panel.getBoundingClientRect();
          if (r.left < vp.right && r.right > vp.left && r.bottom > vp.top && r.top < vp.bottom) safeRight = Math.min(safeRight, r.left - vp.left - 16);
        }
        const preferRight = teardownPart === 'part_fan_tray' || (safeRight - labelPointX) >= (labelPointX - safeLeft);
        // The fan tray's own frame reaches close to the 18 px default gap, so its
        // label sits ~50 px further out to clear the hub.
        const labelGap = teardownPart === 'part_fan_tray' ? 68 : 18;
        const desiredX = preferRight ? labelPointX + labelGap : labelPointX - w - labelGap;
        const desiredY = labelPointY - h / 2;
        const x = Math.min(Math.max(desiredX, safeLeft), Math.max(safeLeft, safeRight - w));
        const y = Math.min(Math.max(desiredY, safeTop), Math.max(safeTop, safeBottom - h));
        label.style.left = `${Math.round(x)}px`;
        label.style.top = `${Math.round(y)}px`;
        const line = focusLine.current;
        line.setAttribute('x1', partX.toFixed(1));
        line.setAttribute('y1', partY.toFixed(1));
        line.setAttribute('x2', Math.min(Math.max(partX, x), x + w).toFixed(1));
        line.setAttribute('y2', Math.min(Math.max(partY, y), y + h).toFixed(1));
      }
    }
    if (dirty) invalidate();
  });
  // Focus uses a cloned material, so tinting one server never reaches the seven
  // other cabinets that share the source asset.
  useEffect(() => {
    if (!teardownActive || !teardownPart) return undefined;
    const node = model.getObjectByName(teardownPart);
    if (!node) return undefined;
    const clones = [];
    node.traverse((object) => {
      if (!object.isMesh) return;
      // Remember the untouched material: the step highlight may already have
      // swapped in a gold clone, and the focus tint must not adopt that.
      if (!object.userData.teardownOriginal) object.userData.teardownOriginal = object.userData.originalMaterial || object.material;
      const material = object.userData.teardownOriginal.clone();
      material.emissive.set('#2468df');
      material.emissiveIntensity = .5;
      object.material = material;
      clones.push(material);
    });
    invalidate();
    return () => {
      node.traverse((object) => {
        if (object.isMesh && object.userData.teardownOriginal) object.material = object.userData.teardownOriginal;
      });
      clones.forEach((material) => material.dispose());
      invalidate();
    };
  }, [model, teardownActive, teardownPart, invalidate]);
  useEffect(() => {
    // The exploded view can now run while the demo plays, so the step highlight
    // must leave the focused part alone: the focus effect owns its material.
    const focusRoot = teardownActive && teardownPart ? model.getObjectByName(teardownPart) : null;
    const ownedByFocus = (mesh) => {
      if (!focusRoot) return false;
      let node = mesh;
      while (node && node !== model) { if (node === focusRoot) return true; node = node.parent; }
      return false;
    };
    model.traverse(obj => {
      if (!obj.isMesh || ownedByFocus(obj)) return;
      let parent = obj, nodeId;
      while (parent && parent !== model) {
        nodeId ||= Object.keys(requestNodes).find(id => requestNodes[id].rack === rack.id && requestNodes[id].assembly === parent.name);
        parent = parent.parent;
      }
      obj.userData.flowNode = nodeId;
      obj.material = mode === 'workflow' && requestWorkflow[step].active.includes(nodeId) ? activeMaterials.get(obj.userData.originalMaterial) : obj.userData.originalMaterial;
    });
    const highlighted = [];
    model.traverse(obj => { if (obj.isMesh && !ownedByFocus(obj) && obj.material !== obj.userData.originalMaterial) highlighted.push(obj.userData.flowNode); });
    gl.domElement.dataset[`equipment${rack.id}`] = JSON.stringify([...new Set(highlighted)]);
    invalidate();
  }, [model, activeMaterials, mode, step, rack.id, invalidate, gl, teardownActive, teardownPart]);
  const supportActive = support?.active ?? [];
  const isDemo = rack.id === 'C01';
  const faulty = statusMode !== 'normal' && rack.id === 'C02';
  const statusText = faulty ? (statusMode === 'alarm' ? '消防联动 · 模拟' : '风扇告警 · 模拟') : '运行正常 · 模拟';
  useEffect(() => { invalidate(); }, [hovered, invalidate]);
  return <group position={[rack.x, 0, rack.z]} rotation={[0, rack.rotation || 0, 0]}
    onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect(rack.kind, rack.id, event.object.userData.flowNode || (rack.id === 'C01' ? 'compute' : null)); }}
    onDoubleClick={(event) => { event.stopPropagation(); onInspect?.(rack.id); }}
    onPointerOver={(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}>
    <RackBaseFX accent={systemById[rack.kind].color} />
    <primitive object={model} dispose={null} />
    {rack.kind === 'compute' && <group ref={fanFollow}>
      <FanTray position={[0, 1.94, .18]} tone={fanFocused ? '#4f8fe6' : twinPalette.cold} active={(isDemo && supportActive.includes('deviceFan')) || fanFocused} animate={animate} />
    </group>}
    <group ref={pduFollow}>
      <RackPdu position={[-.51, .45, .2]} tone={pduFocused ? '#4f8fe6' : twinPalette.power} active={(isDemo && supportActive.includes('rackPdu')) || pduFocused} onSelect={() => onSelectSupportNode?.('rackPdu')} />
    </group>
    <Box position={[0,2.15,.588]} size={[.68,.035,.025]} color={systemById[rack.kind].color} />
    {active && <SelectionFrame color={twinPalette.accent} />}
    {hovered && !active && <SelectionFrame color={twinPalette.accentSoft} />}
    {faulty && <StatusBeacon mode={statusMode} animate={animate} reducedMotion={reducedMotion} />}
    {hovered && <Html position={[0, 2.44, .8]} center zIndexRange={[26, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`rack-hover ${faulty ? 'is-fault' : ''}`}>
        <strong>{rack.id} · {systemById[rack.kind].name}</strong>
        <span><i />{statusText}</span>
      </div>
    </Html>}
    {teardownActive && <pointLight position={[.1, 1.5, 1.35]} intensity={fanFocused ? .5 : .7} distance={fanFocused ? 2.0 : 2.5} decay={2} color="#bfe4ff" />}
    {teardownActive && showPartDots && partNodes.map(({ def, node }) => {
      if (teardownPart === def.id) return null;
      const index = parts.findIndex((part) => part.id === def.id);
      const base = node.userData.base || node.position;
      // Parts that share a height (the switch body and its port groups) carry a
      // small `dotY` nudge so their badges do not sit on top of each other.
      const y = def.id === 'part_fan_tray' ? 2.08 : base.y + (def.dotY || 0);
      // The dot sits on the part body; the old +0.55 pull made the low PDU dot
      // float half a metre in front of the cabinet.
      const z = base.z + .12 + index * .055 + .14;
      return <Html key={def.id} position={[base.x, y, z]} zIndexRange={[14, 0]} style={{ pointerEvents: 'none' }}>
        <span className="teardown-dot">{def.tag}</span>
      </Html>;
    })}
    <SceneHtml position={[0,2.31,.62]} center zIndexRange={[12,0]}><span className={`rack-id ${active ? 'rack-id-active' : ''}`}>{rack.id}</span></SceneHtml>
  </group>;
}

// The grid lines are separate geometry with no UVs, so the slabs' ramp cannot
// reach them. Fading them by world-space edge distance keeps them from
// outlining the plate after the floor has dissolved.
function FloorGrid() {
  const grid = useRef();
  useLayoutEffect(() => {
    const material = grid.current?.material;
    if (!material) return;
    material.transparent = true;
    material.opacity = .58;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGridWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGridWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGridWorld;')
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
  float gridEdge = min(min(5.95 - abs(vGridWorld.x), 4.45 - abs(vGridWorld.z + .45)), 1.0);
  gl_FragColor.a *= clamp(gridEdge / .8, 0.0, 1.0);`);
    };
    material.needsUpdate = true;
  }, []);
  return <gridHelper ref={grid} args={[12,20,twinPalette.gridMajor,twinPalette.gridMinor]} position={[0,.005,-.45]} scale={[.99,1,.74]} />;
}

// Zone boundaries and corner ticks give the floor an industrial layout language
// without moving any rack. All marks are thin lines at y 0.008, below the racks.
function FloorZones() {
  const color = twinPalette.gridMajor;
  const dim = '#16405a';
  const rect = (x1, z1, x2, z2) => [[x1, .008, z1], [x2, .008, z1], [x2, .008, z2], [x1, .008, z2], [x1, .008, z1]];
  const line = { transparent: true, opacity: .55, depthWrite: false };
  return <group raycast={() => null}>
    <Line points={rect(-4.35, .02, 4.35, 2.42)} color={color} lineWidth={1} {...line} />
    <Line points={rect(-4.35, -2.32, 4.35, -.42)} color={color} lineWidth={1} {...line} />
    <Line points={rect(-5.05, -4.35, 5.05, 3.55)} color={dim} lineWidth={.8} transparent opacity={.4} depthWrite={false} />
    <Line points={[[-4.55, .008, -.4], [-4.55, .008, -4.35]]} color={dim} lineWidth={1} transparent opacity={.5} depthWrite={false} />
    <Line points={[[-4.35, .008, 3.42], [4.35, .008, 3.42]]} color={dim} lineWidth={1} transparent opacity={.5} depthWrite={false} />
    {[[-4.35, .02], [4.35, .02], [-4.35, 2.42], [4.35, 2.42]].map(([x, z]) => <group key={`${x}-${z}`}>
      <Line points={[[x, .01, z], [x + (x < 0 ? .22 : -.22), .01, z]]} color={twinPalette.accent} lineWidth={1.4} transparent opacity={.7} depthWrite={false} />
      <Line points={[[x, .01, z], [x, .01, z + (z < 1 ? .22 : -.22)]]} color={twinPalette.accent} lineWidth={1.4} transparent opacity={.7} depthWrite={false} />
    </group>)}
  </group>;
}

// A box's per-face UVs would fade the thin rim over 1 cm instead of 80 cm, so
// the 64×64 ramp is sampled with world coordinates instead: top and rim then
// dissolve over the same band and the slab keeps no rectangular outline.
function FloorSlab({ position, size, color, roughness, fade }) {
  const slab = useRef();
  useLayoutEffect(() => {
    const material = slab.current?.material;
    if (!material) return;
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.uniforms.floorFade = { value: fade };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSlabWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlabWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D floorFade;\nvarying vec3 vSlabWorld;')
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
  vec2 slabUv = vec2((vSlabWorld.x + 5.95) / 11.9, (vSlabWorld.z + 4.9) / 8.9);
  diffuseColor.a *= texture2D(floorFade, clamp(slabUv, 0.0, 1.0)).g;`);
    };
    material.needsUpdate = true;
  }, [fade]);
  return <mesh ref={slab} position={position} receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>;
}

// Walls dissolve upwards and into the open side: the floor fade alone still left
// two lit slabs whose top and end edges read as straight lines. The knee sits
// above the tallest wall-mounted device (monitoring box, 2.35) so nothing on a
// wall ever sits on a half-transparent surface. Walls stop casting shadows,
// otherwise the fade keeps an invisible wall shadow and z-fights the racks.
function WallPanel({ position, size, color, openAxis, openAt, fadeStart, fadeEnd }) {
  const wall = useRef();
  useLayoutEffect(() => {
    const material = wall.current?.material;
    if (!material) return;
    material.transparent = true;
    material.depthWrite = false;
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWallWorld;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWallWorld = (modelMatrix * vec4(position, 1.0)).xyz;');
      const open = openAxis === 'x' ? `${openAt.toFixed(2)} - vWallWorld.x` : `${openAt.toFixed(2)} - vWallWorld.z`;
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWallWorld;')
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
  float wallFade = 1.0 - smoothstep(${fadeStart.toFixed(2)}, ${fadeEnd.toFixed(2)}, vWallWorld.y);
  diffuseColor.a *= wallFade * clamp((${open}) / .8, 0.0, 1.0);`);
    };
    material.needsUpdate = true;
  }, [openAxis, openAt, fadeStart, fadeEnd]);
  return <mesh ref={wall} position={position} receiveShadow castShadow={false}>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={.85} />
  </mesh>;
}

function Floor() {
  const fade = useMemo(() => floorFadeTexture(4.5), []);
  return <group>
    <FloorSlab position={[0,-.08,-.45]} size={[11.9,.15,8.9]} color={twinPalette.floor} roughness={.58} fade={fade} />
    <FloorZones />
    <FloorGrid />
    <FloorProps />
    <WallPanel position={[0,1.48,-4.83]} size={[12,3.25,.12]} color={twinPalette.wall} openAxis="x" openAt={6} fadeStart={2.4} fadeEnd={3.05} />
    <WallPanel position={[-5.95,.82,-1.6]} size={[.12,1.95,6.5]} color={twinPalette.wall} openAxis="z" openAt={1.65} fadeStart={1.15} fadeEnd={1.795} />
    <SceneHtml position={[-1,.03,1.9]} center zIndexRange={[6,0]} style={{ pointerEvents: 'none' }}><span className="floor-label">冷通道 A</span></SceneHtml>
    <SceneHtml position={[.95,.03,-.4]} center zIndexRange={[6,0]} style={{ pointerEvents: 'none' }}><span className="floor-label floor-label-heat">热通道</span></SceneHtml>
    <SceneHtml position={[-4.65,.03,-1.4]} center zIndexRange={[6,0]} style={{ pointerEvents: 'none' }}><span className="floor-zone-label">P-01</span></SceneHtml>
    <SceneHtml position={[3.95,.03,-3.95]} center zIndexRange={[6,0]} style={{ pointerEvents: 'none' }}><span className="floor-zone-label">PWR</span></SceneHtml>
    <SceneHtml position={[4.75,.1,3.45]} center zIndexRange={[8,0]}><span className="room-label">机房结构剖面 · DIGITAL TWIN</span></SceneHtml>
  </group>;
}

function MonitoringBox({ selected, onSelect, mode }) {
  return <group position={[.2,2.05,-4.66]} onClick={(event) => { event.stopPropagation(); onSelect('monitoring'); }}>
    <Box position={[0,0,0]} size={[.95,.6,.18]} color={mode !== 'overview' && selected === 'monitoring' ? '#155e75' : '#162534'} metalness={.55} roughness={.42} />
    <mesh position={[0,.06,.105]}>
      <boxGeometry args={[.6,.22,.02]} />
      <meshStandardMaterial color="#082032" emissive="#22d3ee" emissiveIntensity={.9} metalness={.3} roughness={.35} />
    </mesh>
    <Box position={[-.6,-.32,.02]} size={[.1,.2,.1]} color="#1c2c3a" metalness={.5} roughness={.5} />
    <Line points={[[-.6,-.32,.02],[-.6,-.6,.02],[-.15,-.6,.02],[-.15,-.3,.02]]} color={twinPalette.accent} transparent opacity={.6} lineWidth={1.4} />
  </group>;
}

function CableTrays() {
  // Overhead ladder trays explain the shared route between the two rack rows.
  return <>{[-1.15,.65].map((z) => <group key={z}>
    <Box position={[-.05,2.66,z-.16]} size={[9.4,.055,.035]} color="#3b4f60" metalness={.82} roughness={.3} />
    <Box position={[-.05,2.66,z+.16]} size={[9.4,.055,.035]} color="#3b4f60" metalness={.82} roughness={.3} />
    {Array.from({ length: 25 },(_,index) => <Box key={index} position={[-4.5+index*.37,2.64,z]} size={[.025,.035,.32]} color="#2c3d4c" metalness={.7} roughness={.38} />)}
  </group>)}</>;
}

function FlowPath({ points, color, radius = .025 }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((point) => new Vector3(...point)), false, 'catmullrom', .08), [points]);
  return <group>
    <mesh><tubeGeometry args={[curve,40,radius,6,false]} /><meshBasicMaterial color={color} transparent opacity={.75} /></mesh>
  </group>;
}

function DataPaths({ layers, mode }) {
  if (mode === 'workflow' || mode === 'support' || !layers.data) return null;
  return <>{['request','network','storage'].map((id) => <FlowPath key={id} points={paths[id]} color="#2c7cef" />)}</>;
}

function RoomLabels({ selected, mode, focus, visibleSystems, onSelect }) {
  if (focus) return null;
  // Without the old system rail, in-scene callouts are the only visible names for
  // the cabinets, so every visible system keeps a way into its detail.
  return systems.filter((system) => visibleSystems?.[system.id] !== false).map((system) => <SceneHtml key={system.id} position={labelPositions[system.id]} center zIndexRange={[20,0]}><button type="button" className={`room-callout ${system.id === 'network' ? 'callout-primary' : ''} ${system.id === 'compute' ? 'callout-secondary' : ''} ${selected === system.id && mode !== 'overview' ? 'callout-selected' : ''}`} style={{ '--system-color': system.color }} onClick={() => onSelect(system.id)} aria-label={`查看${system.name}的工作`}><span className="callout-indicator" /><span><strong>{system.name}</strong><small>{system.caption}</small></span></button></SceneHtml>);
}

export default function DataCenterViewport({ selected, selectedRack, cameraSnapshot, onSelect, onInspectRack, mode, expanded, teardown, teardownPart, infraTeardown, layers, step, playing, clock, revision, selectedNode, reducedMotion, cameraRequest, onCameraComplete, onCameraInterrupt, onReady, onSelectDevice, support, quality = 'high', bloomFx = true, statusMode = 'normal', visibleSystems, heatmap = false, links = true, autoOrbit = false }) {
  const supportActive = support?.active ?? [];
  const supportMotion = !!support?.animate && !reducedMotion;
  const preset = qualityPresets[quality] ?? qualityPresets.high;
  const systemVisible = (id) => visibleSystems?.[id] !== false;
  const focusLabel = useRef(null);
  const focusLine = useRef(null);
  const focusPart = teardown && teardownPart ? (rackParts[selected] ?? EMPTY_PARTS).find((part) => part.id === teardownPart) : null;
  return <>
  <Canvas role="img" aria-label="三维机房；可用系统导航选择设备，用章节和视角按钮定位" shadows={preset.shadows ? { type: PCFShadowMap } : false} camera={{ position: [12,10.5,16], fov: 14, near: .1, far: 200 }} dpr={preset.dpr} frameloop="demand" gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.02 }} onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.toneMappingExposure = 1.02; }}>
    <color attach="background" args={[twinPalette.bg]} />
    <fogExp2 attach="fog" args={['#0b1220', .0092]} />
    <TechEnvironment />
    <ambientLight intensity={.32} color="#7fa7c8" />
    <hemisphereLight args={['#5ecbe8','#08131f',.62]} />
    <directionalLight position={[6,13,9]} intensity={2.05} color="#d8eaff" castShadow shadow-mapSize={[preset.shadowMap,preset.shadowMap]} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-normalBias={.035} />
    <directionalLight position={[-7,4,-6]} intensity={.85} color="#22d3ee" />
    <pointLight position={[-3.4,2.5,2.7]} intensity={5.4} color="#22d3ee" distance={9.5} decay={2} />
    <pointLight position={[3.2,2.6,-2.8]} intensity={4.2} color="#f5b544" distance={8} decay={2} />
    <Suspense fallback={null}>
      <Floor />
      <HeatMap visible={heatmap && preset.heat} />
      <CableTrays />
      {racks.filter((rack) => systemVisible(rack.kind)).map((rack) => <Rack key={rack.id} rack={rack} selected={selected} selectedRack={selectedRack} expanded={expanded} teardown={teardown} teardownPart={teardownPart} reducedMotion={reducedMotion} focusLabel={focusLabel} focusLine={focusLine} onSelect={onSelect} onInspect={onInspectRack} statusMode={statusMode} mode={mode} step={step} selectedNode={selectedNode} support={support} animate={supportMotion} onSelectSupportNode={support?.onSelectNode} />)}
      {teardown && (() => {
        const infraSpot = { ups: [2.6, 0, -3.65], distribution: [3.9, 0, -3.65], crac: [-4.55, 0, -3.65], genset: [6.75, 0, -2.7] };
        if (infraTeardown) {
          const spot = infraSpot[infraTeardown.device];
          return spot ? <ScanRing position={[spot[0], .02, spot[2]]} reducedMotion={reducedMotion} animate={playing && !teardown} color={infraTeardown.device === 'crac' ? twinPalette.cold : twinPalette.power} /> : null;
        }
        const lead = selected === 'compute' ? selectedRack : selected === 'network' ? 'N01' : selected === 'storage' ? 'S01' : null;
        const rack = racks.find((item) => item.id === lead);
        return rack ? <ScanRing position={[rack.x, .02, rack.z]} reducedMotion={reducedMotion} animate={playing && !teardown} /> : null;
      })()}
      <RoomInfrastructure selected={selected} visibleSystems={visibleSystems} infraTeardown={infraTeardown} reducedMotion={reducedMotion} activeNodes={supportActive} tone={support?.chapter === 'cooling' ? twinPalette.cold : twinPalette.power} animate={supportMotion} onSelectNode={support?.onSelectNode} />
      <SafetyInfrastructure selected={selected} onSelect={onSelect} visible={systemVisible('safety')} alarm={statusMode === 'alarm'} fireVisible={layers?.fire !== false} animate={playing && !reducedMotion} />
      <PowerExterior teardown={!!teardown && infraTeardown?.device === 'genset'} focusPart={infraTeardown?.device === 'genset' ? infraTeardown.part : null} reducedMotion={reducedMotion} onSelectDevice={onSelectDevice} />
      <FacilityFittings monitoringVisible={systemVisible('monitoring')} powerVisible={systemVisible('power')} />
      {systemVisible('monitoring') && <MonitoringBox selected={selected} onSelect={onSelect} mode={mode} />}
      <DataPaths layers={layers} mode={mode} />
      <SupportVisualization layers={layers} focus={support?.chapter || null} step={support?.step || 0} clock={support?.clock} playing={support?.playing ?? false} loop={!!support?.loop} reducedMotion={reducedMotion} selectedNode={support?.node || null} onSelectNode={support?.onSelectNode} compact={mode !== 'support'} />
      {mode === 'workflow' && <RequestVisualization step={step} playing={playing} clock={clock} revision={revision} reducedMotion={reducedMotion} selected={selected} selectedRack={selectedRack} selectedNode={selectedNode} expanded={expanded} onSelect={onSelect} showPath={layers?.data !== false} />}
      <StoragePulse enabled={layers?.storage !== false && systemVisible('storage') && systemVisible('compute')} playing={playing} reducedMotion={reducedMotion} heads={preset.storageHeads} />
      <DeviceLinks selected={selected} selectedRack={selectedRack} visible={links} />
      <RoomLabels selected={selected} mode={mode} focus={mode === 'support' ? support?.chapter : null} visibleSystems={visibleSystems} onSelect={onSelect} />
      <SceneReady onReady={onReady} />
    </Suspense>
    <Bloom enabled={bloomFx && preset.bloom} strength={preset.bloomStrength} radius={preset.bloomRadius} threshold={preset.bloomThreshold} dpr={preset.dpr} />
    <RoomCameraRig request={cameraRequest} cameraSnapshot={cameraSnapshot} reducedMotion={reducedMotion} autoOrbit={autoOrbit} onComplete={onCameraComplete} onInterrupt={onCameraInterrupt} />
  </Canvas>
  {focusPart && <div className="teardown-focus-layer" aria-hidden="true">
    <svg className="teardown-focus-line"><line ref={focusLine} /></svg>
    <span className="teardown-label teardown-label-floating" ref={focusLabel}>{focusPart.name}</span>
  </div>}
  </>;
}

Object.values(rackModels).forEach(url => useGLTF.preload(url));
