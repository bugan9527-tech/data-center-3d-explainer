import { useCallback, useEffect, useRef, useState } from 'react';

// Both scene levels use this clock. Selection and cameras never mutate it.
export default function useWorkflow(count, duration, initialStep = 0) {
  const [state, setState] = useState({ step: initialStep, playing: false, revision: 0 });
  const clock = useRef({ elapsed: 0 });
  const pause = useCallback(() => setState(old => ({ ...old, playing: false })), []);
  useEffect(() => {
    if (!state.playing) return;
    let frame;
    let previous = performance.now();
    function tick(now) {
      clock.current.elapsed = Math.min(duration, clock.current.elapsed + Math.min(now - previous, 100));
      previous = now;
      if (clock.current.elapsed >= duration) {
        if (state.step === count - 1) pause();
        else {
          clock.current.elapsed = 0;
          setState(old => ({ ...old, step: old.step + 1 }));
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state.playing, state.step, count, duration, pause]);
  useEffect(() => {
    const hide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [pause]);
  function chooseStep(step) {
    clock.current.elapsed = 0;
    setState(old => ({ step: Math.max(0, Math.min(count - 1, step)), playing: false, revision: old.revision + 1 }));
  }
  function toggle() {
    if (document.hidden) return;
    if (!state.playing && clock.current.elapsed >= duration) {
      clock.current.elapsed = 0;
      setState(old => ({ step: 0, playing: true, revision: old.revision + 1 }));
    } else setState(old => ({ ...old, playing: !old.playing }));
  }
  return { ...state, clock, pause, chooseStep, toggle, restart: () => chooseStep(0), ended: state.step === count - 1 && clock.current.elapsed >= duration };
}
