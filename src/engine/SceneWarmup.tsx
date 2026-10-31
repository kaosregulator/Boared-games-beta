import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { compileBatch, finished, pendingTextures, pendingTexturesOf, syncLights, uploadNow, warmDrawables, warmObject, type ProgramLike } from './warmup';
import { collectAdds, isUnder, takeAdded } from './sceneGraph';
import { noteQuietScan, noteWarmerMounted, noteWarming } from './roomPrep';

/**
 * Keeps the GPU a step ahead of the room. Every so often it looks for
 * materials that have never been drawn (a model that just finished loading,
 * a game that just mounted) and compiles them in the background, so their
 * first frame on screen doesn't have to. Behind the title reel this is what
 * readies the whole room before you press play.
 *
 * Only the things with a new (or changed) material are compiled, in one
 * batch. It used to recompile every material in the scene each time anything
 * new turned up: forty times while the room loaded, each one asking three to
 * rebuild the program key of every material in the room. It also tells the
 * loading bar when the room is warm (roomPrep.ts).
 */
export function SceneWarmup({ everyMs = 700, hidden = false }: { everyMs?: number; hidden?: boolean }) {
  const gl = useThree(state => state.gl);
  // Nothing shows the canvas (behind the title): new things' vertex buffers can go up too.
  const hiddenRef = useRef(hidden);
  hiddenRef.current = hidden;
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const invalidate = useThree(state => state.invalidate);

  useEffect(() => {
    /** The material version each material was last warmed at. */
    const seen = new WeakMap<THREE.Material, number>();
    const ac = new AbortController();
    const unmount = noteWarmerMounted();
    let busy = false;
    const fresh = () => {
      const list: THREE.Object3D[] = [];
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.material || !(mesh.isMesh || (obj as THREE.Points).isPoints || (obj as THREE.Line).isLine || (obj as THREE.Sprite).isSprite)) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        let isNew = false;
        for (const m of mats) {
          if (seen.get(m) !== m.version) {
            seen.set(m, m.version);
            isNew = true;
          }
        }
        if (isNew) list.push(obj);
      });
      return list;
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
      if (busy || ac.signal.aborted || held()) return;
      const list = fresh();
      if (!list.length) {
        noteQuietScan();
        return;
      }
      busy = true;
      noteWarming(true);
      // Textures from the whole scene, not only the new things: a map swapped
      // onto a material already seen goes up here too, before it's drawn.
      void warmDrawables(gl, list, camera, scene, {
        signal: ac.signal,
        timeoutMs: 8000,
        textures: pendingTextures(scene),
        geometry: () => hiddenRef.current,
      }).finally(() => {
        busy = false;
        noteWarming(false);
        invalidate();
      });
    };
    tick();
    const id = window.setInterval(tick, everyMs);
    return () => {
      ac.abort();
      unmount();
      noteWarming(false);
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
 *
 * Before each frame it checks only what can change the count: whether
 * anything was added or removed (sceneGraph.ts) and whether one of the
 * room's lights was shown or hidden. It used to walk the whole scene every
 * frame to find out.
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

  useFrame(() => {
    syncLights(scene);
  });
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

const isDrawable = (obj: THREE.Object3D): obj is Drawable => {
  const d = obj as Drawable;
  return !!(d as THREE.Mesh).material && !!((d as THREE.Mesh).isMesh || (d as THREE.Points).isPoints || (d as THREE.Line).isLine || (d as THREE.Sprite).isSprite);
};

/** Most time a frame spends sending a held thing's textures to the GPU (at least one goes). */
const GATE_UPLOAD_MS = 4;

/**
 * The room's last line against first-draw freezes. SceneWarmup only looks
 * every 0.7 s, and anything that mounts and draws in the same frame (the Hot
 * Wheels track, the TV's picture, a game's pieces, the army men) used to have
 * its shaders built inside that frame: one frame held for every new shader.
 * Starting Hot Wheels built 16 in one frame.
 *
 * Before each frame this looks at what was added to the scene since the last
 * frame (sceneGraph.ts tells it; it doesn't walk the scene). Drawn things in
 * those new pieces whose material the renderer hasn't built yet get their
 * shaders started (one batched gl.compile) and their textures queued, and are
 * kept out of the picture (an empty layer mask; nothing else in the room uses
 * layers) until they are ready, usually a frame or two later:
 *  - with KHR_parallel_shader_compile (Chrome, Edge, Safari, most phones) the
 *    driver builds them on its own threads and the frame never waits;
 *  - without it, one shader is linked per frame, so twelve new shaders are
 *    twelve short frames instead of one long freeze.
 * Nothing is drawn differently once it shows, and nothing waits longer than
 * `holdMaxMs`. Whatever is already in the scene when the room first draws
 * goes through untouched: the loading cover and the title warm-up have it.
 * On a frame where nothing was added and nothing is held, it does nothing.
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
      /** Things that keep coming back with new materials (re-added every frame): never held again. */
      strikes: new WeakMap<Drawable, number>(),
      fresh: new Set<Drawable>(),
    }),
    [],
  );

  useEffect(() => collectAdds(scene), [scene]);

  useFrame(() => {
    const added = takeAdded(scene);
    if (!st.started) {
      // The first frame drawn: the room as it is goes straight in.
      st.started = true;
      return;
    }
    if (added === null || added.length) {
      const props = gl.properties as unknown as {
        get: (m: object) => { currentProgram?: ProgramLike; __version?: number };
      };
      // Built already: by the title warm-up, SceneWarmup, an earlier frame, or a copy of the same model.
      const built = (m: THREE.Material) => {
        if (st.ready.get(m) === m.version) return true;
        const p = props.get(m);
        return !!p.currentProgram && p.__version === m.version && finished.has(p.currentProgram);
      };
      const fresh = st.fresh;
      fresh.clear();
      const consider = (obj: THREE.Object3D) => {
        if (!isDrawable(obj) || st.held.has(obj) || fresh.has(obj)) return;
        const mat = obj.material;
        if (Array.isArray(mat)) {
          for (let i = 0; i < mat.length; i++) {
            if (!built(mat[i])) {
              fresh.add(obj);
              return;
            }
          }
        } else if (!built(mat)) fresh.add(obj);
      };
      if (added === null) scene.traverse(consider);
      else {
        for (const root of added) {
          // Taken out again before this frame: nothing to draw.
          if (isUnder(root, scene)) root.traverse(consider);
        }
      }
      if (fresh.size) gate([...fresh], props);
    }
    if (st.held.size) release();
  }, -1);

  /** Starts the new things' shaders and holds them back. */
  function gate(list: Drawable[], props: { get: (m: object) => { __version?: number } }) {
    const now = performance.now();
    syncLights(scene);
    const toCompile: Drawable[] = [];
    for (const d of list) {
      const n = (st.strikes.get(d) ?? 0) + 1;
      st.strikes.set(d, n);
      const mats = ([] as THREE.Material[]).concat(d.material);
      if (n > 4 || d.userData.noGate) {
        mats.forEach(m => st.ready.set(m, m.version));
        continue;
      }
      toCompile.push(d);
    }
    if (!toCompile.length) return;
    try {
      // One call for all of them: three gathers the scene's lights once, not once per mesh.
      compileBatch(gl, toCompile, camera, scene);
    } catch {
      for (const d of toCompile) ([] as THREE.Material[]).concat(d.material).forEach(m => st.ready.set(m, m.version));
      return;
    }
    for (const d of toCompile) {
      const mats = ([] as THREE.Material[]).concat(d.material);
      // Only what isn't on the GPU yet (the title warm-up or an earlier frame may have sent it).
      const textures = pendingTexturesOf([d]).filter(t => props.get(t).__version !== t.version);
      st.held.set(d, { mask: d.layers.mask, since: now, mats, textures });
      d.layers.mask = 0;
    }
  }

  /** Lets through what is ready. Without parallel compile, links one new shader per frame. */
  function release() {
    const parallel = gl.extensions.has('KHR_parallel_shader_compile');
    const props = gl.properties as unknown as { get: (m: object) => { currentProgram?: ProgramLike } };
    const now = performance.now();
    let linkBudget = 1;
    const uploadUntil = now + GATE_UPLOAD_MS;
    let uploadedOne = false;
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
      while (done && h.textures.length && (!uploadedOne || performance.now() < uploadUntil)) {
        uploadNow(gl, h.textures.pop()!);
        uploadedOne = true;
      }
      if (h.textures.length) done = false;
      if (done || now - h.since > holdMaxMs || !d.parent) {
        // Leave a mask alone if its owner set one meanwhile.
        if (d.layers.mask === 0) d.layers.mask = h.mask;
        h.mats.forEach(m => st.ready.set(m, m.version));
        st.held.delete(d);
      }
    }
  }

  return null;
}
