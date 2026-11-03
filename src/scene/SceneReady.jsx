import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

// Signal only after the Suspense subtree has committed and drawn a frame.
export default function SceneReady({ onReady }) {
  const frames = useRef(0);
  const done = useRef(false);
  const { invalidate } = useThree();
  useEffect(() => { invalidate(); }, [invalidate]);
  useFrame(() => {
    if (done.current) return;
    if (++frames.current < 2) { invalidate(); return; }
    done.current = true;
    onReady?.();
  });
  return null;
}
