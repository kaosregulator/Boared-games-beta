import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { noteFrameRate } from './graphics';
import { frameFps, noteFrame, noteRenderer, startPerfObservers } from './perf';

/**
 * Samples the existing renderer. It does not allocate, and it does not
 * set React state on each frame. Quality changes go out through graphics.ts.
 */
export function EngineBridge() {
  const gl = useThree(state => state.gl);
  const acc = useRef(0);
  useEffect(() => {
    startPerfObservers();
  }, []);
  useFrame((_, dt) => {
    const ms = dt * 1000;
    noteFrame(ms);
    acc.current += ms;
    if (acc.current < 500) return;
    acc.current = 0;
    const info = gl.info;
    noteRenderer({
      calls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
    });
    noteFrameRate(frameFps());
  });
  return null;
}
