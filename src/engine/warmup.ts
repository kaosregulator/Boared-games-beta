import * as THREE from 'three';

/**
 * Getting the GPU ready before it is needed.
 *
 * The first time three draws a material it compiles a shader and uploads its
 * textures, and it does both on the spot, holding the frame until they are
 * done. In the room that is the stutter at the start, the hitch when you turn
 * and see something for the first time, and the freeze when a mini world
 * (the army men's town, the Furby box) appears.
 *
 * warmObject() does that work ahead of time: compileAsync lets the driver
 * build the shaders on its own threads (KHR_parallel_shader_compile), and the
 * textures go up a few at a time between frames. Nothing has to be on screen
 * for it, and hidden objects are included.
 */

const MAP_KEYS = [
  'map',
  'alphaMap',
  'aoMap',
  'bumpMap',
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'emissiveMap',
  'lightMap',
  'displacementMap',
  'specularMap',
  'clearcoatMap',
  'clearcoatNormalMap',
  'clearcoatRoughnessMap',
  'sheenColorMap',
  'sheenRoughnessMap',
  'transmissionMap',
  'thicknessMap',
  'iridescenceMap',
  'anisotropyMap',
] as const;

/**
 * What each renderer has been sent. Per renderer, because after a lost WebGL
 * context the room builds a new one, and the cached models' textures have to
 * go up again to that one.
 */
const sentTo = new WeakMap<object, WeakSet<THREE.Texture>>();
const noRenderer = {};
function sentSet(gl?: THREE.WebGLRenderer) {
  const key = gl ?? noRenderer;
  let set = sentTo.get(key);
  if (!set) {
    set = new WeakSet();
    sentTo.set(key, set);
  }
  return set;
}

/** Textures the object's materials use that have not been sent to `gl` yet. */
export function pendingTextures(root: THREE.Object3D, gl?: THREE.WebGLRenderer): THREE.Texture[] {
  const uploaded = sentSet(gl);
  const out = new Set<THREE.Texture>();
  root.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      const rec = mat as unknown as Record<string, unknown>;
      for (const key of MAP_KEYS) {
        const tex = rec[key];
        if (!(tex instanceof THREE.Texture) || uploaded.has(tex)) continue;
        // Video re-uploads every frame anyway. Canvases are sent: most are
        // painted once, and a live one simply goes up again when it changes.
        if ((tex as THREE.VideoTexture).isVideoTexture) continue;
        const img = tex.image as { width?: number; data?: unknown } | undefined;
        if (!img || (!img.width && !img.data && !(tex as THREE.CompressedTexture).isCompressedTexture)) continue;
        out.add(tex);
      }
    }
  });
  return [...out];
}

const nextTick = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/** Uploads a few textures per task so no single task runs long. */
export async function uploadTextures(gl: THREE.WebGLRenderer, textures: THREE.Texture[], signal?: AbortSignal, perTick = 3) {
  const uploaded = sentSet(gl);
  for (let i = 0; i < textures.length; i++) {
    if (signal?.aborted) return;
    const tex = textures[i];
    if (!uploaded.has(tex)) {
      try {
        gl.initTexture(tex);
      } catch {
        // A texture that fails here uploads (or fails) on first draw, as before.
      }
      uploaded.add(tex);
    }
    if (i % perTick === perTick - 1) await nextTick();
  }
}

interface Budget {
  budget: number;
  spares: THREE.PointLight[];
  group: THREE.Object3D;
}

const byKeep: (a: THREE.Object3D, b: THREE.Object3D) => number = (a, b) =>
  (b.userData.expendable as number) - (a.userData.expendable as number);
const scratch: THREE.Object3D[] = [];

/**
 * Holds the scene at exactly LightBudget's number of point lights. Lights
 * marked `userData.expendable` (a number: lower goes first) are the little
 * glows that can step out while a game's own lamps are in, and the dark
 * spares fill any gap. Runs before every frame, and before a warm-up so the
 * shaders are built for the count they will be drawn with.
 *
 * A light steps out by leaving layer 0, which three's renderer skips, rather
 * than by `visible`, which its owner may be animating.
 */
export function balanceLights(scene: THREE.Scene) {
  const b = scene.userData.lightBudget as Budget | undefined;
  if (!b) return;
  let real = 0;
  scratch.length = 0;
  scene.traverseVisible(obj => {
    if (!(obj as THREE.PointLight).isPointLight || obj.parent === b.group) return;
    if (typeof obj.userData.expendable === 'number') scratch.push(obj);
    else real += 1;
  });
  let room = b.budget - real;
  if (scratch.length > 1) scratch.sort(byKeep);
  for (const light of scratch) {
    if (room > 0) {
      light.layers.enable(0);
      room -= 1;
    } else light.layers.disable(0);
  }
  for (let i = 0; i < b.spares.length; i++) b.spares[i].visible = i < room;
  scratch.length = 0;
}

interface ProgramLike {
  isReady: () => boolean;
  getUniforms: () => unknown;
}

const finished = new WeakSet<object>();

/**
 * Splits `root` into subtrees of at most `max` materials that hold no lights.
 * three's compile() builds every material it is given before it returns, so
 * one call on the whole room is one long task; a piece at a time lets the
 * page breathe in between. No lights, because compile() counts a piece's own
 * lights on top of the scene's, and the shaders would be built for the wrong
 * number. (A mesh that has lights or too many children below it leaves its
 * own material to its first draw.)
 */
export function compileChunks(root: THREE.Object3D, max = 24): THREE.Object3D[] {
  const info = new Map<THREE.Object3D, { mats: number; lit: boolean }>();
  const measure = (node: THREE.Object3D): { mats: number; lit: boolean } => {
    const mesh = node as THREE.Mesh;
    let mats = mesh.material ? (Array.isArray(mesh.material) ? mesh.material.length : 1) : 0;
    let lit = (node as THREE.Light).isLight === true;
    for (const child of node.children) {
      const c = measure(child);
      mats += c.mats;
      lit = lit || c.lit;
    }
    const rec = { mats, lit };
    info.set(node, rec);
    return rec;
  };
  measure(root);
  const out: THREE.Object3D[] = [];
  const split = (node: THREE.Object3D) => {
    const rec = info.get(node)!;
    if (rec.mats === 0) return;
    if (!rec.lit && (rec.mats <= max || node.children.length === 0)) {
      out.push(node);
      return;
    }
    for (const child of node.children) split(child);
  };
  split(root);
  return out;
}

/**
 * Like WebGLRenderer.compileAsync, a piece at a time. Where the browser has
 * KHR_parallel_shader_compile the driver builds the shaders on its own
 * threads and this only polls. Without it (some GPUs, software rendering)
 * the wait for each shader is unavoidable, but here it is taken one shader
 * per task, and before the object is shown rather than in its first frames.
 */
async function compileSpread(gl: THREE.WebGLRenderer, root: THREE.Object3D, camera: THREE.Camera, scene: THREE.Scene, signal?: AbortSignal) {
  const props = gl.properties as unknown as { get: (m: THREE.Material) => { currentProgram?: ProgramLike } };
  const parallel = gl.extensions.has('KHR_parallel_shader_compile');
  const programs = new Set<ProgramLike>();
  for (const piece of compileChunks(root)) {
    if (signal?.aborted) return;
    const materials = gl.compile(piece, camera, scene);
    const fresh: ProgramLike[] = [];
    materials.forEach(m => {
      const prog = props.get(m).currentProgram;
      if (prog && !finished.has(prog) && !programs.has(prog)) {
        programs.add(prog);
        fresh.push(prog);
      }
    });
    if (!parallel) {
      for (const p of fresh) {
        if (signal?.aborted) return;
        // First use: links and checks the program, waiting for the driver.
        p.getUniforms();
        finished.add(p);
        await nextTick();
      }
    }
    await nextTick();
  }
  while (parallel && programs.size && !signal?.aborted) {
    programs.forEach(p => {
      if (p.isReady()) {
        finished.add(p);
        programs.delete(p);
      }
    });
    if (programs.size) await new Promise(resolve => setTimeout(resolve, 16));
  }
}

/**
 * Compiles every material under `root` against the scene's lights and
 * uploads its textures. Resolves when the shaders are ready, or after
 * `timeoutMs` at the latest, so a slow driver can delay a reveal but never
 * hold it forever.
 */
export async function warmObject(
  gl: THREE.WebGLRenderer,
  root: THREE.Object3D,
  camera: THREE.Camera,
  scene: THREE.Scene,
  { signal, timeoutMs = 4000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<void> {
  balanceLights(scene);
  const work = (async () => {
    try {
      await compileSpread(gl, root, camera, scene, signal);
    } catch {
      // Compile errors surface on first draw exactly as they would have.
    }
    await uploadTextures(gl, pendingTextures(root, gl), signal);
  })();
  let timer = 0;
  const timeout = new Promise<void>(resolve => {
    timer = window.setTimeout(resolve, timeoutMs);
  });
  await Promise.race([work, timeout]);
  window.clearTimeout(timer);
}

/** A cheap fingerprint of the scene graph: changes when models mount or unmount. */
export function sceneFingerprint(scene: THREE.Object3D): number {
  let n = 0;
  let mats = 0;
  scene.traverse(obj => {
    n += 1;
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) mats += Array.isArray(mesh.material) ? mesh.material.length : 1;
  });
  return n * 4099 + mats;
}
