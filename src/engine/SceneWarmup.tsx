import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { balanceLights, finished, pendingTextures, warmObject, type ProgramLike } from './warmup';

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
export function LightBudget({ budget, spots = 0 }: { budget: number; spots?: number }) {
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
    // Spot lights are counted apart from point lights, so a game's spot
    // (the Hot Wheels headlight) gets a dark stand-in of its own.
    const spotList: THREE.SpotLight[] = [];
    for (let i = 0; i < spots; i++) {
      const light = new THREE.SpotLight(0x000000, 0, 0.001, 0.1, 0, 2);
      light.position.set(0, -50, 0);
      light.target.position.set(0, -51, 0);
      light.visible = false;
      group.add(light, light.target);
      spotList.push(light);
    }
    return { group, list, spotList };
  }, [budget, spots]);

  useEffect(() => {
    scene.add(spares.group);
    scene.userData.lightBudget = { budget, spares: spares.list, spotSpares: spares.spotList, group: spares.group };
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

interface Held {
  mask: number;
  since: number;
  mats: THREE.Material[];
  textures: THREE.Texture[];
}

type Drawable = THREE.Mesh | THREE.Points | THREE.Line | THREE.Sprite;

/**
 * The room's last line against first-draw freezes. SceneWarmup only looks
 * every 0.7 s, and anything that mounts and draws in the same frame (the Hot
 * Wheels track, the TV's picture, a game's pieces, the army men) used to have
 * its shaders built inside that frame: one frame held for every new shader.
 * Starting Hot Wheels built 16 in one frame.
 *
 * Before each frame this looks for drawn things whose material it hasn't seen.
 * It starts their shaders and textures and keeps those things out of the
 * picture (an empty layer mask; nothing else in the room uses layers) until
 * they are ready, usually a frame or two later:
 *  - with KHR_parallel_shader_compile (Chrome, Edge, Safari, most phones) the
 *    driver builds them on its own threads and the frame never waits;
 *  - without it, one shader is linked per frame, so twelve new shaders are
 *    twelve short frames instead of one long freeze.
 * Nothing is drawn differently once it shows, and nothing waits longer than
 * `holdMaxMs`. Whatever is already in the scene when the room first draws
 * goes through untouched: the loading cover and the title warm-up have it.
 */
export function FirstDrawGate({ holdMaxMs = 1500 }: { holdMaxMs?: number }) {
  const gl = useThree(state => state.gl);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const st = useMemo(
    () => ({
      started: false,
      ready: new WeakMap<THREE.Material, number>(),
      held: new Map<Drawable, Held>(),
      /** Things that keep getting new materials (a material made per frame): never held again. */
      strikes: new WeakMap<Drawable, number>(),
      fresh: [] as Drawable[],
    }),
    [],
  );

  useFrame(() => {
    const parallel = gl.extensions.has('KHR_parallel_shader_compile');
    const props = gl.properties as unknown as { get: (m: object) => { currentProgram?: ProgramLike; __version?: number } };
    const now = performance.now();
    const seen = (m: THREE.Material) => st.ready.get(m) === m.version;
    const mark = (m: THREE.Material) => st.ready.set(m, m.version);

    // Find drawn things with a material not seen before.
    const fresh = st.fresh;
    fresh.length = 0;
    const walk = (obj: THREE.Object3D) => {
      if (!obj.visible) return;
      const d = obj as Drawable;
      const mat = (d as THREE.Mesh).material;
      if (mat && !st.held.has(d) && ((d as THREE.Mesh).isMesh || (d as THREE.Points).isPoints || (d as THREE.Line).isLine || (d as THREE.Sprite).isSprite)) {
        if (Array.isArray(mat)) {
          for (let i = 0; i < mat.length; i++) {
            if (!seen(mat[i])) {
              fresh.push(d);
              break;
            }
          }
        } else if (!seen(mat)) fresh.push(d);
      }
      const kids = obj.children;
      for (let i = 0; i < kids.length; i++) walk(kids[i]);
    };
    walk(scene);

    if (!st.started) {
      // The first frame drawn: the room as it is goes straight in.
      st.started = true;
      for (const d of fresh) ([] as THREE.Material[]).concat(d.material).forEach(mark);
      fresh.length = 0;
    }

    if (fresh.length) {
      balanceLights(scene);
      for (const d of fresh) {
        const mats = ([] as THREE.Material[]).concat(d.material);
        const n = (st.strikes.get(d) ?? 0) + 1;
        st.strikes.set(d, n);
        if (n > 4 || d.userData.noGate) {
          mats.forEach(mark);
          continue;
        }
        try {
          gl.compile(d, camera, scene);
        } catch {
          mats.forEach(mark);
          continue;
        }
        // Only what isn't on the GPU yet (the title warm-up or an earlier frame may have sent it).
        const textures = pendingTextures(d).filter(t => props.get(t).__version !== t.version);
        st.held.set(d, { mask: d.layers.mask, since: now, mats, textures });
        d.layers.mask = 0;
      }
    }

    if (!st.held.size) return;
    // Let through what is ready. Without parallel compile, link one new shader per frame.
    let linkBudget = 1;
    let uploadBudget = 4;
    for (const [d, h] of st.held) {
      let done = true;
      for (const m of h.mats) {
        const prog = props.get(m).currentProgram;
        if (!prog || finished.has(prog)) continue;
        if (parallel) {
          if (prog.isReady()) finished.add(prog);
          else done = false;
        } else if (linkBudget > 0) {
          linkBudget -= 1;
          prog.getUniforms();
          finished.add(prog);
        } else done = false;
      }
      while (done && h.textures.length && uploadBudget > 0) {
        uploadBudget -= 1;
        const tex = h.textures.pop()!;
        try {
          gl.initTexture(tex);
        } catch {
          // it uploads (or fails) on first draw, as before
        }
      }
      if (h.textures.length) done = false;
      if (done || now - h.since > holdMaxMs || !d.parent) {
        // Leave a mask alone if its owner set one meanwhile.
        if (d.layers.mask === 0) d.layers.mask = h.mask;
        h.mats.forEach(mark);
        st.held.delete(d);
      }
    }
  }, -1);

  return null;
}
