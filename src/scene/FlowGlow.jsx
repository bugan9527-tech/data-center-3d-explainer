import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import glowTexture, { flowTexture } from './glowTexture.js';

// Three phase-offset heads turn one short marker into a continuous flow. Each
// head is a hard core plus a faint ring with three short, dimmer tails behind;
// all of it is driven by the shared progress ref, so a paused flow freezes and
// schedules no frames. Once progress reaches 1 every head holds at the end
// instead of wrapping back to the start.
//
// Additive blending was the first choice, but this room is nearly white: adding a
// colour to an already bright background only pushes it towards white and the head
// disappears. Normal blending with the same radial alpha keeps the colour readable.
const DEFAULT_HEADS = 3;
const TAILS = 3;

export default function FlowGlow({ curve, progressRef, color, size = .32, tail = .12, opacity = 1, phase = 0, heads = DEFAULT_HEADS }) {
  const headMap = useMemo(() => flowTexture(), []);
  const tailMap = useMemo(() => glowTexture(), []);
  const headRefs = useRef([]);
  const tailRefs = useRef([]);
  useFrame(() => {
    const progress = Math.max(0, Math.min(1, progressRef.current));
    for (let index = 0; index < heads; index += 1) {
      const head = headRefs.current[index];
      if (!head) continue;
      const at = progress >= 1 && !phase ? 1 : (progress + index / heads + phase) % 1;
      curve.getPoint(at, head.position);
      const tailGroup = tailRefs.current[index] || [];
      for (let segment = 0; segment < TAILS; segment += 1) {
        const sprite = tailGroup[segment];
        if (!sprite) continue;
        curve.getPoint(Math.max(0, at - ((segment + 1) * tail) / TAILS), sprite.position);
      }
    }
  });
  return <group>
    {Array.from({ length: heads }, (_, headIndex) => <group key={headIndex}>
      <sprite
        ref={(sprite) => { headRefs.current[headIndex] = sprite; }}
        scale={[size, size, 1]}
        renderOrder={1}
      >
        <spriteMaterial map={headMap} color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} toneMapped={false} />
      </sprite>
      {Array.from({ length: TAILS }, (_, tailIndex) => {
        const scale = size * (.56 - tailIndex * .12);
        const tailOpacity = opacity * .5 * Math.pow(.55, tailIndex);
        return <sprite
          key={tailIndex}
          ref={(sprite) => { if (!tailRefs.current[headIndex]) tailRefs.current[headIndex] = []; tailRefs.current[headIndex][tailIndex] = sprite; }}
          scale={[scale, scale, 1]}
          renderOrder={1}
        >
          <spriteMaterial map={tailMap} color={color} transparent opacity={tailOpacity} depthWrite={false} depthTest={false} toneMapped={false} />
        </sprite>;
      })}
    </group>)}
  </group>;
}
