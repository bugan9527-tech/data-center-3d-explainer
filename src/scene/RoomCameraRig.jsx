import { useEffect, useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { cameraPose, roomCameras } from '../data/roomCameras.js';

const DEG = Math.PI / 180;
const OVERVIEW = cameraPose('overview');
// Chapter moves are long enough to read as travel; close-ups stay brisk and a
// restore is nearly immediate.
const CHAPTER_SECONDS = 1.2;
const CLOSEUP_SECONDS = .9;
const RESTORE_SECONDS = .5;
const ARC_RISE = .08;
const isChapter = id => roomCameras.some(pose => pose.id === id);

// Distance at which a pose's framing box (world width × height) exactly fills the
// viewport, given its vertical fov. Replaces the orthographic zoom: apparent size
// now follows from fov and distance instead of a flat scale factor.
const frameDistance = (size, pose) => {
  const tangent = Math.tan((pose.fov * DEG) / 2);
  const aspect = size.width / Math.max(1, size.height);
  return Math.max(pose.height / (2 * tangent), pose.width / (2 * tangent * aspect));
};

export default function RoomCameraRig({ request, cameraSnapshot, reducedMotion, autoOrbit = false, onComplete, onInterrupt }) {
  const controls = useRef();
  const movement = useRef(null);
  const handled = useRef(request.token);
  const initial = useRef(cameraSnapshot.current);
  const orbit = useRef(autoOrbit);
  orbit.current = autoOrbit;
  const userHold = useRef(false);
  // Framing distance of the pose currently applied; zoomRatio is relative to it.
  const base = useRef(1);
  const { camera, size, gl, invalidate } = useThree();
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const callbacks = useRef({ onComplete, onInterrupt });
  callbacks.current = { onComplete, onInterrupt };

  // Keep dollies inside a sane range. A transition can start far away (overview)
  // and end close (close-up), so the ceiling follows the overview framing rather
  // than the destination, otherwise OrbitControls would clamp mid-flight.
  function limits(distance) {
    if (!controls.current) return;
    controls.current.minDistance = Math.max(.5, Math.min(distance * .3, 1.2));
    controls.current.maxDistance = frameDistance(sizeRef.current, OVERVIEW) * 2.2;
  }
  function save() {
    if (!controls.current) return;
    const target = controls.current.target;
    const distance = camera.position.distanceTo(target) || 1;
    const zoomRatio = base.current / distance;
    cameraSnapshot.current = { position: camera.position.toArray(), target: target.toArray(), zoomRatio, fov: camera.fov, base: base.current };
    gl.domElement.dataset.camera = JSON.stringify({ position: camera.position.toArray(), target: target.toArray(), zoomRatio, projection: 'perspective' });
  }
  function applyState(state) {
    camera.position.fromArray(state.position);
    controls.current.target.fromArray(state.target);
    camera.fov = state.fov;
    camera.updateProjectionMatrix();
    base.current = state.base;
    // Interior poses look up from below the target, which the default ceiling of
    // 1.4 rad would rotate away; relax it per pose instead of globally.
    const offset = camera.position.clone().sub(controls.current.target);
    const polar = Math.acos(Math.min(1, Math.max(-1, offset.y / (offset.length() || 1))));
    controls.current.maxPolarAngle = Math.max(1.4, polar + .12);
    limits(offset.length());
    controls.current.update(); save(); invalidate();
  }
  // A pose supplies direction and framing only: the distance is derived, so the
  // authored position never fights the fov.
  function stateFromPose(pose) {
    const target = new Vector3(...pose.target);
    const distance = frameDistance(sizeRef.current, pose);
    const position = target.clone().add(new Vector3(...pose.position).sub(target).normalize().multiplyScalar(distance));
    return { position: position.toArray(), target: pose.target.slice(), fov: pose.fov, base: distance };
  }
  function stateFromSnapshot(snapshot) {
    const distance = new Vector3(...snapshot.position).distanceTo(new Vector3(...snapshot.target)) || 1;
    return { position: snapshot.position.slice(), target: snapshot.target.slice(), fov: snapshot.fov ?? OVERVIEW.fov, base: snapshot.base ?? distance };
  }
  function stop() {
    const interrupted = movement.current;
    movement.current = null;
    gl.domElement.dataset.moving = 'false';
    if (interrupted) callbacks.current.onInterrupt?.(interrupted.token);
  }
  useLayoutEffect(() => {
    applyState(initial.current ? stateFromSnapshot(initial.current) : stateFromPose(OVERVIEW));
  }, []);
  useLayoutEffect(() => {
    // Perspective keeps the camera where it is on resize; only the aspect changes.
    if (!controls.current) return;
    limits(camera.position.distanceTo(controls.current.target));
    save();
  }, [size.width, size.height]);
  useEffect(() => {
    if (handled.current === request.token) return;
    handled.current = request.token;
    stop();
    if (request.id === 'hold') { save(); invalidate(); return; }
    if (['left','right','in','out'].includes(request.id)) {
      const target = controls.current.target;
      const offset = camera.position.clone().sub(target);
      if (request.id === 'left' || request.id === 'right') offset.applyAxisAngle(new Vector3(0,1,0), request.id === 'left' ? -.22 : .22);
      const scale = request.id === 'in' ? 1/1.18 : request.id === 'out' ? 1.18 : 1;
      const distance = Math.max(controls.current.minDistance, Math.min(controls.current.maxDistance, offset.length() * scale));
      camera.position.copy(target).add(offset.setLength(distance));
      camera.updateProjectionMatrix(); controls.current.update(); save(); invalidate();
      return;
    }
    const pose = cameraPose(request.id, request.rackId);
    const to = request.pose ? stateFromSnapshot(request.pose) : stateFromPose(pose);
    if (reducedMotion || request.instant) { applyState(to); callbacks.current.onComplete?.(request.token); return; }
    base.current = to.base;
    const offset = new Vector3(...to.position).sub(new Vector3(...to.target));
    const polar = Math.acos(Math.min(1, Math.max(-1, offset.y / (offset.length() || 1))));
    controls.current.maxPolarAngle = Math.max(1.4, polar + .12);
    const duration = request.id === 'restore' ? RESTORE_SECONDS : isChapter(request.id) ? CHAPTER_SECONDS : CLOSEUP_SECONDS;
    movement.current = { from: { position: camera.position.toArray(), target: controls.current.target.toArray(), fov: camera.fov }, to, elapsed: 0, duration, token: request.token };
    gl.domElement.dataset.moving = 'true';
    invalidate();
  }, [request]);
  useEffect(() => {
    if (reducedMotion && movement.current) {
      const { to, token } = movement.current;
      movement.current = null; applyState(to); gl.domElement.dataset.moving = 'false'; callbacks.current.onComplete?.(token);
    }
  }, [reducedMotion]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => { movement.current = null; document.removeEventListener('visibilitychange', hide); document.body.style.cursor = 'auto'; };
  }, []);
  useEffect(() => {
    gl.domElement.dataset.orbit = autoOrbit ? 'true' : 'false';
    invalidate();
  }, [autoOrbit, gl, invalidate]);
  useFrame((_, delta) => {
    if (!orbit.current || reducedMotion || userHold.current || !controls.current || movement.current) return;
    const target = controls.current.target;
    const offset = camera.position.clone().sub(target);
    offset.applyAxisAngle(new Vector3(0, 1, 0), Math.min(delta, .06) * .18);
    camera.position.copy(target).add(offset);
    controls.current.update();
    save();
    invalidate();
  });
  useFrame((_, delta) => {
    const moving = movement.current;
    if (!moving) return;
    moving.elapsed += Math.min(delta,.05);
    const t = Math.min(1,moving.elapsed/moving.duration);
    const eased = t*t*(3-2*t);
    // A flat lerp reads as sliding; lifting the middle by 8% of the height change
    // makes it read as travel. The endpoints are untouched.
    const rise = Math.abs(moving.to.position[1] - moving.from.position[1]) * ARC_RISE * Math.sin(Math.PI * t);
    camera.position.fromArray(moving.from.position).lerp(new Vector3(...moving.to.position),eased);
    camera.position.y += rise;
    controls.current.target.fromArray(moving.from.target).lerp(new Vector3(...moving.to.target),eased);
    camera.fov = moving.from.fov + (moving.to.fov - moving.from.fov) * eased;
    camera.updateProjectionMatrix(); controls.current.update(); save();
    if (t === 1) { movement.current = null; gl.domElement.dataset.moving = 'false'; callbacks.current.onComplete?.(moving.token); }
    else invalidate();
  });
  return <OrbitControls ref={controls} onChange={save} onStart={() => { userHold.current = true; stop(); callbacks.current.onInterrupt?.(handled.current); }} onEnd={() => { userHold.current = false; }} makeDefault enablePan={false} minPolarAngle={.3} maxPolarAngle={1.4} enableDamping={false} />;
}
