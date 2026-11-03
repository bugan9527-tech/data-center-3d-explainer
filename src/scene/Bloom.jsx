import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector2 } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// A single renderer-owned composer. The scene uses frameloop="demand", so the
// composer only runs on the frames the app invalidates; with bloom off it falls
// back to the plain renderer and produces exactly the same image as before.
export default function Bloom({ enabled = true, strength = .5, radius = .36, threshold = .82, dpr = 1.5 }) {
  const { gl, scene, camera, size } = useThree();
  const options = useRef({ strength, radius, threshold });
  options.current = { strength, radius, threshold };
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const { composer, bloomPass } = useMemo(() => {
    const instance = new EffectComposer(gl);
    instance.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new Vector2(1, 1), strength, radius, threshold);
    instance.addPass(bloom);
    instance.addPass(new OutputPass());
    return { composer: instance, bloomPass: bloom };
  }, [gl, scene, camera]);

  useEffect(() => {
    composer.setPixelRatio(dpr);
    composer.setSize(size.width, size.height);
    bloomPass.setSize(size.width, size.height);
  }, [composer, bloomPass, gl, size.width, size.height, dpr]);

  useEffect(() => {
    bloomPass.enabled = enabled;
    bloomPass.strength = options.current.strength;
    bloomPass.radius = options.current.radius;
    bloomPass.threshold = options.current.threshold;
    gl.domElement.dataset.bloom = enabled ? 'true' : 'false';
  }, [bloomPass, enabled, strength, radius, threshold, gl]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(() => {
    if (enabledRef.current) composer.render();
    else gl.render(scene, camera);
  }, 1);

  return null;
}
