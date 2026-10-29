import manifest from './assetTiers.json';
import { readEnginePref } from './persist';

/**
 * Which build of each room model to load. The Graphics setting used to change
 * only the pixel ratio, so Low, Balanced and High all drew the same crushed
 * meshes. Now each preset maps to a model tier (scripts/build-asset-tiers.mjs):
 *
 *   Low      -> low     ~10-30k triangles, 1024 px UASTC maps
 *   Balanced -> medium  ~30-110k triangles, 2048 px
 *   High     -> high    ~70-260k triangles, up to 4096 px on furniture and close-ups
 *
 * The device caps the tier so a phone that picks High still gets models it
 * can hold in memory. The tier is chosen once per page load: swapping every
 * model mid-play would stall the room, so a change in the menu applies on the
 * next load (the menu offers a reload, and a reload returns you to the same spot).
 *
 * A model with no build for the tier (or none at all yet) loads the original
 * file in public/models, so nothing breaks before the tiers are built.
 */
export type AssetTier = 'low' | 'medium' | 'high';
export type GraphicsPresetName = 'low' | 'balanced' | 'high';

const ORDER: AssetTier[] = ['low', 'medium', 'high'];

export interface DeviceInfo {
  touch: boolean;
  /** Shorter screen side in CSS px. */
  shortSide: number;
  /** navigator.deviceMemory in GB, when the browser reports it. */
  memoryGb: number | null;
  /** gl.MAX_TEXTURE_SIZE, when known. */
  maxTexture: number | null;
}

interface TierManifest {
  version: number;
  models: Record<string, Partial<Record<AssetTier, { triangles: number; kb: number; colorPx: number }>>>;
}

const built = (manifest as TierManifest).models ?? {};

export function tierForPreset(preset: GraphicsPresetName): AssetTier {
  if (preset === 'low') return 'low';
  if (preset === 'balanced') return 'medium';
  return 'high';
}

/** The best tier this device can carry without running out of graphics memory. */
export function deviceCeiling(d: DeviceInfo): AssetTier {
  let cap: AssetTier = 'high';
  const phone = d.touch && d.shortSide > 0 && d.shortSide < 820;
  if (phone || d.touch) cap = 'medium';
  if (d.memoryGb !== null) {
    if (d.memoryGb <= 2) cap = 'low';
    else if (d.memoryGb <= 4 && cap === 'high') cap = 'medium';
    else if (phone && d.memoryGb <= 3) cap = 'low';
  }
  if (d.maxTexture !== null) {
    if (d.maxTexture < 2048) cap = 'low';
    else if (d.maxTexture < 4096 && cap === 'high') cap = 'medium';
  }
  return cap;
}

export function capTier(wanted: AssetTier, ceiling: AssetTier): AssetTier {
  return ORDER[Math.min(ORDER.indexOf(wanted), ORDER.indexOf(ceiling))];
}

/** `/models/window.glb` -> `/models/high/window.glb` when that build exists, else the original. */
export function resolveModelUrl(url: string, tier: AssetTier, models = built): string {
  const match = /^\/models\/([^/]+\.glb)$/.exec(url);
  if (!match) return url;
  const file = match[1];
  const entry = models[file];
  if (!entry) return url;
  // Missing this tier: use the closest build below it, then above, before the original.
  const start = ORDER.indexOf(tier);
  const order = [...ORDER.slice(0, start + 1).reverse(), ...ORDER.slice(start + 1)];
  for (const t of order) if (entry[t]) return `/models/${t}/${file}`;
  return url;
}

function readPreset(): GraphicsPresetName {
  const p = readEnginePref('graphics-preset');
  return p === 'low' || p === 'balanced' || p === 'high' ? p : 'high';
}

function probeMaxTexture(): number | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;
    const size = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return size;
  } catch {
    return null;
  }
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') return { touch: false, shortSide: 0, memoryGb: null, maxTexture: null };
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    touch: 'ontouchstart' in window || (nav.maxTouchPoints ?? 0) > 0,
    shortSide: Math.min(window.screen?.width ?? 0, window.screen?.height ?? 0),
    memoryGb: typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null,
    maxTexture: probeMaxTexture(),
  };
}

function urlOverride(): AssetTier | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('assets');
  return v === 'low' || v === 'medium' || v === 'high' ? v : null;
}

let active: AssetTier | null = null;
let ceiling: AssetTier | null = null;

function device(): AssetTier {
  if (ceiling === null) ceiling = deviceCeiling(detectDevice());
  return ceiling;
}

/** The tier this page load uses. Fixed after the first call. `?assets=low|medium|high` forces one for testing. */
export function activeAssetTier(): AssetTier {
  if (active === null) active = urlOverride() ?? capTier(tierForPreset(readPreset()), device());
  return active;
}

/** The tier the saved Graphics setting would give on this device; differs from active until the next load. */
export function preferredAssetTier(preset: GraphicsPresetName): AssetTier {
  return urlOverride() ?? capTier(tierForPreset(preset), device());
}

export function modelUrl(url: string): string {
  return resolveModelUrl(url, activeAssetTier());
}

export function hasTieredModels(): boolean {
  return Object.keys(built).length > 0;
}

export function resetAssetTiersForTests() {
  active = null;
  ceiling = null;
}
