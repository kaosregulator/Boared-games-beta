import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { balanceLights, warmObject } from './warmup';

/**
 * Keeps the GPU a step ahead of the room. Every so often it looks for
 * materials that have never been drawn (a model that just finished loading,
 * a game that just mounted) and compiles them in the background, so their
 * first frame on screen doesn't have to. Behind the title reel this is what
 * readies the whole room before you press play.
 */
export function SceneWarmup({ everyMs = 700 }: { everyMs?: number }) {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);

  useEffect(() => {
    const seen = new WeakSet<THREE.Material>();
    const ac = new AbortController();
    let busy = false;
    const fresh = () => {
      let found = false;
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.material || !(mesh.isMesh || (obj as THREE.Points).isPoints || (obj as THREE.Line).isLine || (obj as THREE.Sprite).isSprite)) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (!seen.has(m)) {
            seen.add(m);
            found = true;
          }
        }
      });
      return found;
    };
    // Compiling a shader while the player is looking around or driving is the hitch.
    // The work waits until they let go; behind the title screen nothing is held.
    // Capture phase, so a joystick or game that stops its own events can't
    // leave a press counted forever, and a long hold (a whole lap on the phone
    // stick) only delays the work a few seconds: anything new still gets built
    // in the background rather than on its first frame.
    const pointers = new Set<number>();
    const keys = new Set<string>();
    const driving = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    const HOLD_MAX_MS = 3000;
    let heldSince = 0;
    const touch = () => {
      if (heldSince === 0) heldSince = performance.now();
    };
    const settle = () => {
      if (pointers.size === 0 && keys.size === 0) heldSince = 0;
    };
    const onPointerDown = (e: PointerEvent) => {
      pointers.add(e.pointerId);
      touch();
    };
    const onPointerUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      settle();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (!driving.has(e.code)) return;
      keys.add(e.code);
      touch();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      settle();
    };
    const onBlur = () => {
      pointers.clear();
      keys.clear();
      heldSince = 0;
    };
    const onVisibility = () => {
      if (document.hidden) onBlur();
    };
    const held = () => heldSince !== 0 && performance.now() - heldSince < HOLD_MAX_MS;
    const opts = { capture: true } as const;
    window.addEventListener('pointerdown', onPointerDown, opts);
    window.addEventListener('pointerup', onPointerUp, opts);
    window.addEventListener('pointercancel', onPointerUp, opts);
    window.addEventListener('keydown', onKeyDown, opts);
    window.addEventListener('keyup', onKeyUp, opts);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    const tick = () => {
      if (busy || ac.signal.aborted || held() || !fresh()) return;
      busy = true;
      void warmObject(gl, scene, camera, scene, { signal: ac.signal, timeoutMs: 8000 }).finally(() => {
        busy = false;
        invalidate();
      });
    };
    tick();
    const id = window.setInterval(tick, everyMs);
    return () => {
      ac.abort();
      window.clearInterval(id);
      window.removeEventListener('pointerdown', onPointerDown, opts);
      window.removeEventListener('pointerup', onPointerUp, opts);
      window.removeEventListener('pointercancel', onPointerUp, opts);
      window.removeEventListener('keydown', onKeyDown, opts);
      window.removeEventListener('keyup', onKeyUp, opts);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [gl, scene, camera, invalidate, everyMs]);
  return null;
}

/**
 * The number of lights is part of every lit shader. When a game adds a lamp
 * (the army men's desk light, the Furby's disco lights, the PC's glow), three
 * has to rebuild the shader of every lit thing in the room, and that is a
 * freeze of a second or more on many machines.
 *
 * This keeps the count of point lights at `budget`. While a game's lamps are
 * in, the room's smallest glows (marked `userData.expendable`) step out to
 * make room; when the room has fewer, dark spare lights fill in. So nothing
 * that switches on or off rebuilds a shader, and walking about costs the GPU
 * no more lights than before.
 */
export function LightBudget({ budget }: { budget: number }) {
  const scene = useThree(state => state.scene);
  const spares = useMemo(() => {
    const group = new THREE.Group();
    group.name = 'light-budget';
    const list: THREE.PointLight[] = [];
    for (let i = 0; i < budget; i++) {
      // Dark, tiny and out of the way: it adds a light to the count and nothing to the picture.
      const light = new THREE.PointLight(0x000000, 0, 0.001, 2);
      light.position.set(0, -50, 0);
      light.visible = false;
      group.add(light);
      list.push(light);
    }
    return { group, list };
  }, [budget]);

  useEffect(() => {
    scene.add(spares.group);
    scene.userData.lightBudget = { budget, spares: spares.list, group: spares.group };
    return () => {
      scene.remove(spares.group);
      delete scene.userData.lightBudget;
    };
  }, [scene, spares, budget]);

  useFrame(() => balanceLights(scene));
  return null;
}

/**
 * Keeps a newly mounted piece of the scene hidden until its shaders are built
 * and its textures are on the GPU, then shows it. Pass `armed` false while its
 * parts are still loading. Returns true once it is showing. If the GPU is slow
 * it still shows after `timeoutMs`, so nothing waits forever.
 */
export function useWarmReveal(ref: React.RefObject<THREE.Object3D | null>, armed = true, timeoutMs = 4000): boolean {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    if (ref.current && !ready) ref.current.visible = false;
  });

  useEffect(() => {
    const obj = ref.current;
    if (!armed || ready || !obj) return;
    const ac = new AbortController();
    void warmObject(gl, obj, camera, scene, { signal: ac.signal, timeoutMs }).then(() => {
      if (ac.signal.aborted) return;
      obj.visible = true;
      setReady(true);
      invalidate();
    });
    return () => ac.abort();
  }, [armed, ready, ref, gl, scene, camera, invalidate, timeoutMs]);

  return ready;
}
