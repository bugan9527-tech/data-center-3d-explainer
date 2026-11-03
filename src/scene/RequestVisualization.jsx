import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { CurvePath, LineCurve3, Quaternion, Vector3 } from 'three';
import { requestNodes, requestWorkflow, flowColors, REQUEST_STAGE_DURATION } from '../data/requestFlow.js';
import FlowGlow from './FlowGlow.jsx';

export function nodeAnchor(id, selected, selectedRack, expanded, selectedNode) {
  const node = requestNodes[id];
  const offset = expanded && node.rack && (!selectedNode || requestNodes[selectedNode].rack === node.rack) && selected === node.system && (selected !== 'compute' || selectedRack === node.rack) ? .6 : 0;
  return node.anchor.map((v,i) => v + (i === 2 ? offset : 0));
}

const sizes = { ingress: [.14,.18,.05], egress: [.21,.18,.05], storagePort: [.21,.18,.05], fabric: [.77,.25,.06], compute: [.77,.16,.07], controller: [.78,.18,.07], module: [.24,.22,.07], user: [.72,.6,.14] };

function NodeFrame({ id, position, selected, active, onSelect, portal }) {
  const { size: viewportSize } = useThree();
  const size = sizes[id];
  const framePosition = id === 'fabric' ? [position[0],1.29,position[2] + .04] : position;
  const offset = ['controller','module'].includes(id) ? [-.85,.42,.12] : id === 'compute' ? [-.2,.48,.12] : [0,.55,.12];
  const labelPosition = framePosition.map((v,i) => v + offset[i]);
  const showLabel = viewportSize.width > 650 && (selected || (active && ['user','compute','controller','module'].includes(id)));
  return <group>
    {showLabel && <Line points={[framePosition,labelPosition]} color={selected ? '#2468df' : flowColors.active} lineWidth={1} raycast={() => null} />}
    {(active || selected) && <mesh position={framePosition} raycast={() => null}>
      <boxGeometry args={size.map(v => v + (selected ? .04 : .01))} /><meshBasicMaterial color={selected ? '#2468df' : flowColors.active} wireframe />
    </mesh>}
    {showLabel && <Html portal={portal} position={labelPosition} center zIndexRange={[16,0]}><button type="button" tabIndex={-1} aria-hidden="true" className={`flow-node-label ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(requestNodes[id].system, requestNodes[id].rack, id)}>{selected && '✓ '}{requestNodes[id].name}{active && <small>参与本步</small>}</button></Html>}
  </group>;
}

export default function RequestVisualization({ step, playing, clock, revision, reducedMotion, selected, selectedRack, selectedNode, expanded, onSelect, showPath }) {
  const glowProgress = useRef(0);
  const marker = useRef(new Vector3());
  const { gl, invalidate, camera, size } = useThree();
  const portal = useMemo(() => ({ current: gl.domElement.parentNode }), [gl]);
  const stage = requestWorkflow[step];
  const color = flowColors[stage.kind];
  const anchors = useMemo(() => Object.fromEntries(Object.keys(requestNodes).map(id => [id, nodeAnchor(id, selected, selectedRack, expanded, selectedNode)])), [selected, selectedRack, expanded, selectedNode]);
  const { curve, points, arrows } = useMemo(() => {
    const curve = new CurvePath();
    const points = [];
    const route = stage.route.map(id => new Vector3(...anchors[id]));
    // The local compute stages use a short front-panel loop: internal detail is
    // available on demand. All other arrows connect actual functional anchors.
    if (route.length === 1) {
      const a = route[0];
      route.push(a.clone().add(new Vector3(.4,.25,.18)), a.clone().add(new Vector3(-.4,.25,.18)), a.clone());
    }
    for (let i=0; i<route.length-1; i++) {
      const a = route[i], b = route[i+1];
      const far = Math.abs(a.x-b.x)>1;
      const via = far && !stage.active.includes('user')
        ? [a, new Vector3(a.x,2.8,a.z+.25), new Vector3(b.x,2.8,b.z+.25), b]
        : [a, b];
      via.forEach((p,j) => { if (j<via.length-1) curve.add(new LineCurve3(p,via[j+1])); });
      points.push(...via);
    }
    const arrows = [.2,.5,.82].map(t => ({ position: curve.getPoint(t), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0,1,0),curve.getTangent(t).normalize()) }));
    return { curve, points, arrows };
  }, [stage, anchors]);
  useEffect(() => { invalidate(); }, [playing, revision, reducedMotion, curve, showPath, invalidate]);
  useFrame(() => {
    const progress = Math.min(clock.current.elapsed / REQUEST_STAGE_DURATION, 1);
    glowProgress.current = progress;
    curve.getPoint(reducedMotion ? .5 : progress, marker.current);
    gl.domElement.dataset.flowPickProjections = JSON.stringify(Object.fromEntries(Object.entries({ingress:[-3.92,1.336,1.151],module:[2.1,.893,1.205]}).map(([id,p]) => { const v=new Vector3(...p).project(camera); return [id,[(v.x+1)*size.width/2,(1-v.y)*size.height/2]]; })));
    gl.domElement.dataset.flowProjections = JSON.stringify(Object.fromEntries(Object.entries(anchors).map(([id,p]) => { const v = new Vector3(...p).project(camera); return [id, [(v.x+1)*size.width/2,(1-v.y)*size.height/2]]; })));
    // Read-only diagnostics reflect the actual rendered route and shared clock.
    gl.domElement.dataset.flow = JSON.stringify({step, progress, active: stage.active, route: stage.route, color, marker: marker.current.toArray(), arrows: showPath ? arrows.length : 0});
    if (playing && !reducedMotion && showPath) invalidate();
  });
  return <group>
    <group position={anchors.user} onClick={e => { e.stopPropagation(); onSelect('network', null, 'user'); }}>
      <mesh><boxGeometry args={[.65,.44,.1]} /><meshStandardMaterial color="#658ba5" /></mesh>
      <mesh position={[0,-.26,0]}><boxGeometry args={[.4,.06,.27]} /><meshStandardMaterial color="#658ba5" /></mesh>
    </group>
    {size.width > 650 && stage.active.includes('fabric') && <Html portal={portal} position={[-3.65,2.68,1.23]} center zIndexRange={[16,0]}><span className="flow-node-label">N01 · {stage.route.filter(id => ['ingress','fabric','egress','storagePort'].includes(id)).map(id => ({ingress:'A',fabric:'转发',egress:'B',storagePort:'C'})[id]).join(' → ')}<small>参与本步</small></span></Html>}
    {Object.keys(requestNodes).map(id => <NodeFrame key={id} id={id} position={anchors[id]} selected={selectedNode === id} active={stage.active.includes(id)} onSelect={onSelect} portal={portal} />)}
    {showPath && <group><Line points={points} color={color} lineWidth={3} />
      {arrows.map((arrow,i) => <mesh key={i} position={arrow.position} quaternion={arrow.quaternion}><coneGeometry args={[.065,.18,10]} /><meshBasicMaterial color={color} /></mesh>)}
      {!reducedMotion && <FlowGlow curve={curve} progressRef={glowProgress} color={color} size={.32} />}
    </group>}
  </group>;
}
