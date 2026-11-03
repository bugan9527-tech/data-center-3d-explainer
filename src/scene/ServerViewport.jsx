import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line, OrbitControls, useGLTF } from '@react-three/drei';
import { Box3, BoxGeometry, CurvePath, EdgesGeometry, LineCurve3, Quaternion, Vector3 } from 'three';
import SceneReady from './SceneReady.jsx';
import { flowColors } from '../data/requestFlow.js';
import { externalNodes, serverParts, serverWorkflow, STAGE_DURATION } from '../data/server.js';

function SceneHtml(props) {
  const { gl } = useThree();
  const portal = useMemo(() => ({ current: gl.domElement.parentNode }), [gl]);
  return <Html portal={portal} {...props} />;
}

function Assembly({ source, part, palette, selected, active, expanded, onSelect }) {
  const model = useMemo(() => source.clone(true), [source]);
  const { center, geometry } = useMemo(() => {
    const box = new Box3().setFromObject(source);
    const size = box.getSize(new Vector3()).addScalar(.06);
    const base = new BoxGeometry(size.x, size.y, size.z);
    const geometry = new EdgesGeometry(base);
    base.dispose();
    return { center: box.getCenter(new Vector3()), geometry };
  }, [source]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useMemo(() => {
    model.traverse((object) => {
      if (object.isMesh) {
        const original = source.getObjectByName(object.name).material;
        object.material = palette[selected ? 'selected' : active ? 'active' : 'normal'].get(original);
      }
    });
  }, [model, source, palette, selected, active]);
  const offset = expanded ? part.offset : [0,0,0];
  const label = part.label.map((v,i) => v + offset[i]);
  return <>
    <group position={offset} onClick={(event) => { event.stopPropagation(); if (event.delta < 5) onSelect(part.id); }}>
      <primitive object={model} dispose={null} />
      {(selected || active) && <lineSegments position={center} geometry={geometry} raycast={() => null}><lineBasicMaterial color={selected ? '#185ed1' : '#a06806'} /></lineSegments>}
    </group>
    <SceneHtml position={label} center zIndexRange={[15,0]}><button type="button" tabIndex={-1} aria-hidden="true" className={`part-label ${selected ? 'is-selected' : ''}`} onClick={() => onSelect(part.id)}>{selected && '✓ '}{part.name}{active && <small>参与本步</small>}</button></SceneHtml>
  </>;
}

function ServerModel({ selected, expanded, step, onSelect }) {
  const { scene } = useGLTF('/models/server-internal.glb');
  const chassis = useMemo(() => scene.getObjectByName('chassis').clone(true), [scene]);
  const palette = useMemo(() => {
    const normal = new Map();
    scene.traverse((object) => { if (object.isMesh) normal.set(object.material, object.material); });
    const variants = { normal, selected: new Map(), active: new Map() };
    for (const key of ['selected','active']) normal.forEach((mat) => {
      const copy = mat.clone();
      copy.emissive.set(key === 'selected' ? '#2468df' : '#ba861e');
      copy.emissiveIntensity = key === 'selected' ? .24 : .13;
      variants[key].set(mat,copy);
    });
    return variants;
  }, [scene]);
  useEffect(() => () => {
    for (const key of ['selected','active']) palette[key].forEach((mat) => mat.dispose());
  }, [palette]);
  return <group>
    <primitive object={chassis} dispose={null} />
    {serverParts.map((part) => <Assembly key={part.id} source={scene.getObjectByName(part.id)} palette={palette} part={part} selected={part.id === selected} active={serverWorkflow[step].active.includes(part.id)} expanded={expanded} onSelect={onSelect} />)}
  </group>;
}

function ExternalNodes() {
  return <>
    <group position={externalNodes.storage}>
      <mesh><cylinderGeometry args={[.43,.43,.64,24]} /><meshStandardMaterial color="#2f4a5f" metalness={.55} roughness={.4} /></mesh>
      {[-.16,.05,.27].map((y) => <mesh key={y} position={[0,y,0]}><torusGeometry args={[.435,.015,6,24]} /><meshStandardMaterial color="#7f9db2" metalness={.6} /></mesh>)}
      <SceneHtml position={[0,.7,0]} center zIndexRange={[12,0]}><span className="external-label">外部存储系统<small>经机房网络 · 持久保存文件</small></span></SceneHtml>
    </group>
    <group position={externalNodes.user}>
      <mesh><boxGeometry args={[.7,.48,.1]} /><meshStandardMaterial color="#2c4558" metalness={.4} roughness={.5} /></mesh>
      <mesh position={[0,-.29,0]}><boxGeometry args={[.38,.06,.28]} /><meshStandardMaterial color="#2c4558" metalness={.4} roughness={.5} /></mesh>
      <SceneHtml position={[0,.5,0]} center zIndexRange={[12,0]}><span className="external-label">用户<small>经机房网络 · 请求 / 结果</small></span></SceneHtml>
    </group>
  </>;
}

function DataRoute({ step, expanded, playing, reducedMotion, clock, revision }) {
  const marker = useRef();
  const color = flowColors[serverWorkflow[step].kind];
  const { invalidate } = useThree();
  const { curve, points, arrows } = useMemo(() => {
    const nodes = { ...externalNodes };
    serverParts.forEach((part) => { nodes[part.id] = part.anchor.map((value,i) => value + (expanded ? part.offset[i] : 0)); });
    const route = serverWorkflow[step].route.map((id) => new Vector3(...nodes[id]));
    const curve = new CurvePath();
    const points = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i+1];
      const height = Math.max(a.y,b.y) + .38;
      const via = [a, new Vector3(a.x,height,a.z), new Vector3(b.x,height,b.z), b];
      via.forEach((p,j) => { if (j < via.length-1) curve.add(new LineCurve3(p,via[j+1])); });
      points.push(...via);
    }
    const arrows = [.3,.72].map((t) => ({ position: curve.getPoint(t), quaternion: new Quaternion().setFromUnitVectors(new Vector3(0,1,0),curve.getTangent(t).normalize()) }));
    return { curve, points, arrows };
  }, [step, expanded]);
  useEffect(() => { invalidate(); }, [playing, revision, curve, reducedMotion, invalidate]);
  useFrame(() => {
    if (marker.current) curve.getPoint(reducedMotion ? .5 : Math.min(clock.current.elapsed / STAGE_DURATION, 1), marker.current.position);
    if (playing && !reducedMotion) invalidate();
  });
  return <group>
    <Line points={points} color={color} lineWidth={2.5} />
    {arrows.map((arrow,i) => <mesh key={i} position={arrow.position} quaternion={arrow.quaternion}><coneGeometry args={[.08,.23,10]} /><meshBasicMaterial color={color} /></mesh>)}
    <mesh ref={marker}><sphereGeometry args={[.085,12,8]} /><meshBasicMaterial color={color} /></mesh>
  </group>;
}

function CameraRig({ action }) {
  const controls = useRef();
  const { camera, size, invalidate } = useThree();
  function reset() {
    camera.position.set(8,10,12);
    camera.zoom = Math.min(size.width / 11.6, size.height / 8);
    controls.current.target.set(-.6,.45,0);
    camera.updateProjectionMatrix();
    controls.current.update();
    invalidate();
  }
  useEffect(reset, [size.width, size.height]);
  useEffect(() => {
    if (action.type === 'reset') reset();
    if (action.type === 'left' || action.type === 'right') {
      const offset = camera.position.clone().sub(controls.current.target);
      offset.applyAxisAngle(new Vector3(0,1,0), action.type === 'left' ? -.22 : .22);
      camera.position.copy(controls.current.target).add(offset);
    }
    if (action.type === 'in' || action.type === 'out') camera.zoom = Math.max(12,Math.min(160,camera.zoom * (action.type === 'in' ? 1.18 : 1/1.18)));
    camera.updateProjectionMatrix();
    controls.current.update(); invalidate();
  }, [action]);
  return <OrbitControls ref={controls} makeDefault enablePan={false} minZoom={12} maxZoom={160} minPolarAngle={.18} maxPolarAngle={1.4} enableDamping={false} />;
}

export default function ServerViewport(props) {
  return <Canvas role="img" aria-label="服务器内部三维结构；也可用部件文字列表选择和阅读说明" orthographic camera={{ position: [8,10,12], zoom: 48, near: .1, far: 80 }} dpr={[1,1.5]} frameloop="demand" gl={{ antialias: true, powerPreference: 'high-performance' }}>
    <color attach="background" args={['#0b1220']} />
    <fogExp2 attach="fog" args={['#0b1220', .016]} />
    <ambientLight intensity={.7} color="#7fa7c8" />
    <hemisphereLight args={['#5ecbe8','#08131f',.9]} />
    <directionalLight position={[2,9,5]} intensity={2.1} color="#e2f2ff" />
    <directionalLight position={[-6,4,-4]} intensity={1.1} color="#22d3ee" />
    <gridHelper args={[12,24,'#1d4a68','#123247']} position={[-.6,-.04,0]} />
    <Suspense fallback={<SceneHtml center><span className="model-loading" role="status">正在加载服务器模型…</span></SceneHtml>}><ServerModel {...props} /><SceneReady onReady={props.onReady} /></Suspense>
    <ExternalNodes />
    <DataRoute {...props} />
    <CameraRig action={props.cameraAction} />
  </Canvas>;
}
