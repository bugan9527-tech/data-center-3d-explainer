import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PMREMGenerator } from 'three';
import { techEnvironmentTexture } from './techMaterials.js';

// A generated studio environment gives the metal cabinets readable reflections
// while keeping the room's deep-blue cast. The map is a few kilobytes of canvas.
export default function TechEnvironment({ intensity = .55 }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const source = techEnvironmentTexture();
    const generator = new PMREMGenerator(gl);
    const target = generator.fromEquirectangular(source);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    scene.environmentRotation?.set(0, Math.PI * .35, 0);
    return () => {
      scene.environment = null;
      target.dispose();
      generator.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}
