import * as THREE from 'three';
import { sceneVersion } from './sceneGraph';

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

const uploaded = new WeakSet<THREE.Texture>();

function addPending(mesh: THREE.Mesh, out: Set<THREE.Texture>) {
  if (!mesh.material) return;
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const mat of mats) {
    const rec = mat as unknown as Record<string, unknown>;
    for (const key of MAP_KEYS) {
      const tex = rec[key];
      if (!(tex instanceof THREE.Texture) || uploaded.has(tex)) continue;
      // Video and canvas pictures re-upload every frame anyway.
      if ((tex as THREE.VideoTexture).isVideoTexture || (tex as THREE.CanvasTexture).isCanvasTexture) continue;
      const img = tex.image as { width?: number; data?: unknown } | undefined;
      if (!img || (!img.width && !img.data && !(tex as THREE.CompressedTexture).isCompressedTexture)) continue;
      out.add(tex);
    }
  }
}

/** Textures the object's materials use that have not been sent to the GPU yet. */
export function pendingTextures(root: THREE.Object3D): THREE.Texture[] {
  const out = new Set<THREE.Texture>();
  root.traverse(obj => addPending(obj as THREE.Mesh, out));
  return [...out];
}

/** The same, for a list of drawn things (only their own materials, not their children's). */
export function pendingTexturesOf(list: readonly THREE.Object3D[]): THREE.Texture[] {
  const out = new Set<THREE.Texture>();
  for (const obj of list) addPending(obj as THREE.Mesh, out);
  return [...out];
}

const nextTick = () => new Promise<void>(resolve => setTimeout(resolve, 0));
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/**
 * How long one task may spend sending textures to the GPU before it lets the
 * page (the title reel, the next frame) have the thread back. At least one
 * texture always goes per task. A fixed three per task could put three large
 * uploads (and their mipmaps) back to back in one task on a phone.
 */
export const UPLOAD_SLICE_MS = 6;

/** Sends one texture to the GPU now (it is then never re-sent by the warm-up). */
export function uploadNow(gl: THREE.WebGLRenderer, tex: THREE.Texture) {
  if (uploaded.has(tex)) return;
  try {
    gl.initTexture(tex);
  } catch {
    // A texture that fails here uploads (or fails) on first draw, as before.
  }
  uploaded.add(tex);
}

/** Uploads textures between tasks, a time slice at a time, so no single task runs long. */
export async function uploadTextures(gl: THREE.WebGLRenderer, textures: THREE.Texture[], signal?: AbortSignal, sliceMs = UPLOAD_SLICE_MS) {
  let sliceStart = clock();
  for (let i = 0; i < textures.length; i++) {
    if (signal?.aborted) return;
    uploadNow(gl, textures[i]);
    if (i < textures.length - 1 && clock() - sliceStart >= sliceMs) {
      await nextTick();
      sliceStart = clock();
    }
  }
}

interface Budget {
  budget: number;
  spares: THREE.PointLight[];
  /** Dark spot lights standing in for a game's spot (the Hot Wheels headlight, the board game lamp). */
  spotSpares?: THREE.SpotLight[];
  group: THREE.Object3D;
}

const byKeep: (a: THREE.Object3D, b: THREE.Object3D) => number = (a, b) =>
  (b.userData.expendable as number) - (a.userData.expendable as number);
const scratch: THREE.Object3D[] = [];

/** Whether a model carries a point light of its own. Ones that don't can be marked `noPointLights`. */
export function hasPointLight(root: THREE.Object3D) {
  let found = false;
  root.traverse(obj => {
    if ((obj as THREE.PointLight).isPointLight) found = true;
  });
  return found;
}

/** Point and spot lights under `scene` that count toward the budget (any visibility), in scene order. */
function collectLights(scene: THREE.Object3D, b: Budget): THREE.Light[] {
  const out: THREE.Light[] = [];
  // Furniture clones are marked noPointLights: walking into every mesh of every
  // model was a steady cost on the same thread as the picture.
  // Lights live beside those models, not inside them.
  const walk = (obj: THREE.Object3D) => {
    if (obj.userData.noPointLights || obj === b.group) return;
    if ((obj as THREE.PointLight).isPointLight || (obj as THREE.SpotLight).isSpotLight) out.push(obj as THREE.Light);
    const kids = obj.children;
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  walk(scene);
  return out;
}

/** Drawn by three: it and every parent up to the scene are visible. */
function shownIn(obj: THREE.Object3D, scene: THREE.Object3D) {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) {
    if (!o.visible) return false;
    if (o === scene) return true;
  }
  return false;
}

/** Sets the expendable lights and the spares for the lights that are showing now. */
function balanceFrom(lights: readonly THREE.Light[], shown: (light: THREE.Light, index: number) => boolean, b: Budget) {
  let real = 0;
  let spots = 0;
  scratch.length = 0;
  for (let i = 0; i < lights.length; i++) {
    const light = lights[i];
    if (!shown(light, i)) continue;
    if ((light as THREE.SpotLight).isSpotLight) spots += 1;
    else if (typeof light.userData.expendable === 'number') scratch.push(light);
    else real += 1;
  }
  let room = b.budget - real;
  if (scratch.length > 1) scratch.sort(byKeep);
  for (const light of scratch) {
    if (room > 0) {
      light.layers.enable(0);
      room -= 1;
    } else light.layers.disable(0);
  }
  for (let i = 0; i < b.spares.length; i++) b.spares[i].visible = i < room;
  const spotSpares = b.spotSpares ?? [];
  for (let i = 0; i < spotSpares.length; i++) spotSpares[i].visible = i < spotSpares.length - spots;
  scratch.length = 0;
}

/**
 * Holds the scene at exactly LightBudget's number of point lights. Lights
 * marked `userData.expendable` (a number: lower goes first) are the little
 * glows that can step out while a game's own lamps are in, and the dark
 * spares fill any gap. Also runs before a warm-up so the shaders are built
 * for the count they will be drawn with.
 *
 * A light steps out by leaving layer 0, which three's renderer skips, rather
 * than by `visible`, which its owner may be animating.
 *
 * This always looks through the whole scene. Before each frame the room uses
 * syncLights(), which only does so when something was added or removed.
 */
export function balanceLights(scene: THREE.Scene) {
  const b = scene.userData.lightBudget as Budget | undefined;
  if (!b) return;
  balanceFrom(collectLights(scene, b), light => shownIn(light, scene), b);
}

interface LightWatch {
  version: number;
  budget: Budget;
  lights: THREE.Light[];
  shown: boolean[];
}

const watches = new WeakMap<THREE.Scene, LightWatch>();

/**
 * balanceLights, driven by what actually changes. The list of lights is
 * rebuilt only when the scene graph changes (sceneGraph.ts); each frame
 * otherwise only checks whether any of those ~20 lights was shown or hidden
 * (a walk up its few parents), and rebalances only if one was. Exactly the
 * same lights end up on as with balanceLights. Returns true if it rebalanced.
 */
export function syncLights(scene: THREE.Scene): boolean {
  const b = scene.userData.lightBudget as Budget | undefined;
  if (!b) return false;
  const version = sceneVersion(scene);
  let w = watches.get(scene);
  let dirty = false;
  if (!w || w.version !== version || w.budget !== b) {
    w = { version, budget: b, lights: collectLights(scene, b), shown: [] };
    watches.set(scene, w);
    dirty = true;
  }
  const { lights, shown } = w;
  for (let i = 0; i < lights.length; i++) {
    const on = shownIn(lights[i], scene);
    if (shown[i] !== on) {
      shown[i] = on;
      dirty = true;
    }
  }
  if (dirty) balanceFrom(lights, (_, i) => shown[i], b);
  return dirty;
}

export interface ProgramLike {
  isReady: () => boolean;
  getUniforms: () => unknown;
}

/** Programs known to be linked, so asking for their uniforms won't wait on the driver. */
export const finished = new WeakSet<object>();

/**
 * gl.compile() for a list of drawn things, in one call. three's compile()
 * walks the whole scene to gather its lights each time it is called, so
 * calling it once per new mesh (a model with a hundred meshes) walked the
 * scene a hundred times in one frame. This hands it a stand-in root whose
 * traverse visits exactly the given things (not their children), so the
 * lights are gathered once and only those materials are prepared.
 */
const batchRoot = new THREE.Object3D();
let batchList: readonly THREE.Object3D[] = [];
batchRoot.traverse = (callback: (object: THREE.Object3D) => void) => {
  for (let i = 0; i < batchList.length; i++) callback(batchList[i]);
};
// The scene passed as target is where compile() gathers the lights.
batchRoot.traverseVisible = () => {};

export function compileBatch(gl: THREE.WebGLRenderer, list: readonly THREE.Object3D[], camera: THREE.Camera, scene: THREE.Scene): Set<THREE.Material> {
  if (!list.length) return new Set();
  batchList = list;
  try {
    return gl.compile(batchRoot, camera, scene) as Set<THREE.Material>;
  } finally {
    batchList = [];
  }
}

/** Waits for the programs behind these materials: polled with parallel compile, one link per task without it. */
async function finishPrograms(gl: THREE.WebGLRenderer, materials: Iterable<THREE.Material>, signal?: AbortSignal) {
  const props = gl.properties as unknown as { get: (m: THREE.Material) => { currentProgram?: ProgramLike } };
  const programs = new Set<ProgramLike>();
  for (const m of materials) {
    const prog = props.get(m).currentProgram;
    if (prog && !finished.has(prog)) programs.add(prog);
  }
  const parallel = gl.extensions.has('KHR_parallel_shader_compile');
  if (parallel) {
    while (programs.size && !signal?.aborted) {
      programs.forEach(p => {
        if (p.isReady()) {
          finished.add(p);
          programs.delete(p);
        }
      });
      if (programs.size) await new Promise(resolve => setTimeout(resolve, 16));
    }
    return;
  }
  for (const p of programs) {
    if (signal?.aborted) return;
    // First use: links and checks the program, waiting for the driver.
    p.getUniforms();
    finished.add(p);
    await nextTick();
  }
}

/**
 * Like WebGLRenderer.compileAsync, and where the browser has
 * KHR_parallel_shader_compile it is the same thing: the driver builds the
 * shaders on its own threads and this only polls. Without it (some GPUs,
 * software rendering) the wait for each shader is unavoidable, but here it
 * is taken one shader per task, so the page keeps breathing, and before the
 * object is shown rather than in the middle of its first frames.
 */
async function compileSpread(
  gl: THREE.WebGLRenderer,
  root: THREE.Object3D,
  camera: THREE.Camera,
  target: THREE.Scene | null,
  signal?: AbortSignal,
) {
  await finishPrograms(gl, gl.compile(root, camera, target) as Set<THREE.Material>, signal);
}

async function withTimeout(work: Promise<void>, timeoutMs: number) {
  let timer = 0;
  const timeout = new Promise<void>(resolve => {
    timer = window.setTimeout(resolve, timeoutMs);
  });
  await Promise.race([work, timeout]);
  window.clearTimeout(timer);
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
  syncLights(scene);
  const work = (async () => {
    try {
      await compileSpread(gl, root, camera, root === scene ? null : scene, signal);
    } catch {
      // Compile errors surface on first draw exactly as they would have.
    }
    await uploadTextures(gl, pendingTextures(root), signal);
  })();
  await withTimeout(work, timeoutMs);
}

/** A layer nothing in the room uses, for drawing only the things being warmed. */
const WARM_LAYER = 31;

/**
 * Draws just `list` once, with the scene's lights, so three sends their
 * vertex buffers to the GPU now. compile() and initTexture() cover shaders
 * and textures, but geometry only goes up on a mesh's first draw: pressing
 * Play used to send the whole room's vertex data (about 36 MB) in its first
 * frame. Only for while nothing is showing the canvas (behind the title):
 * the drawing itself is thrown away by the next real frame.
 *
 * The same lights take part (each light that passes the camera's layer test
 * now also passes for the warm layer), so every material is drawn with the
 * program it already has and nothing new is built.
 */
export function drawHidden(gl: THREE.WebGLRenderer, list: readonly THREE.Object3D[], camera: THREE.Camera, scene: THREE.Scene) {
  if (!list.length) return;
  const restore: [THREE.Object3D, number, boolean][] = [];
  scene.traverse(obj => {
    if ((obj as THREE.Light).isLight && obj.layers.test(camera.layers)) {
      restore.push([obj, obj.layers.mask, obj.frustumCulled]);
      obj.layers.enable(WARM_LAYER);
    }
  });
  for (const obj of list) {
    restore.push([obj, obj.layers.mask, obj.frustumCulled]);
    obj.layers.enable(WARM_LAYER);
    // Out of view or not, it should go up now.
    obj.frustumCulled = false;
  }
  const cameraMask = camera.layers.mask;
  camera.layers.set(WARM_LAYER);
  try {
    gl.render(scene, camera);
  } catch {
    // It goes up on its first real draw instead, as before.
  } finally {
    camera.layers.mask = cameraMask;
    for (const [obj, mask, culled] of restore) {
      obj.layers.mask = mask;
      obj.frustumCulled = culled;
    }
  }
}

/**
 * warmObject for just the drawn things that are new, rather than every
 * material in the scene: one batched compile of their materials, then the
 * textures still waiting for the GPU (`textures`; by default theirs). With
 * `geometry` (only while the canvas is hidden), their vertex buffers go up
 * too, once their shaders are built.
 */
export async function warmDrawables(
  gl: THREE.WebGLRenderer,
  list: readonly THREE.Object3D[],
  camera: THREE.Camera,
  scene: THREE.Scene,
  {
    signal,
    timeoutMs = 4000,
    textures,
    geometry,
  }: { signal?: AbortSignal; timeoutMs?: number; textures?: THREE.Texture[]; geometry?: () => boolean } = {},
): Promise<void> {
  syncLights(scene);
  let timedOut = false;
  const work = (async () => {
    try {
      await finishPrograms(gl, compileBatch(gl, list, camera, scene), signal);
    } catch {
      // Compile errors surface on first draw exactly as they would have.
    }
    await uploadTextures(gl, textures ?? pendingTexturesOf(list), signal);
    // Not after a timeout: an unfinished shader would be linked on the spot.
    if (!timedOut && !signal?.aborted && geometry?.()) {
      await nextTick();
      if (!timedOut && !signal?.aborted && geometry()) drawHidden(gl, list, camera, scene);
    }
  })();
  await withTimeout(work, timeoutMs);
  timedOut = true;
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
