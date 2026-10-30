import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  FRAMES,
  GOOD,
  LAUNCH_X,
  SPRITE_DX,
  SPRITE_H,
  SPRITE_W,
  SPRITE_Y,
  favourites,
  layerY,
  startRound,
  step,
  type Game,
  type Kind,
} from './game';
import { DESK_Y, FIELD_X, INTRO_S, OUTRO_S, PLANE_Z, U, desk, introDone, setHud, stageTime, stopSandwich } from './store';
import { duckMusic, landSound, loadSandwichSounds, sfx, startMusic, stopMusic } from './sound';

/**
 * Sandwich Stacker on the desk: 625 and everything that falls are flat 2D
 * sprites (the original game's art) on a plane standing on the front of the
 * desk, so the monitor, keyboard and desk are the level behind them.
 * Rendered inside PcStudio, in the desk's placed frame.
 */

const IMG = '/sandwich/img/';

function spriteNames() {
  const names: string[] = [];
  for (let i = 1; i <= 8; i += 1) names.push(`walk-${i}`);
  for (let i = 1; i <= 3; i += 1) names.push(`grump-${i}`);
  for (let i = 1; i <= 5; i += 1) names.push(`launch-${i}`);
  for (const k of Object.keys(FRAMES) as Kind[]) for (let i = 1; i <= FRAMES[k]; i += 1) names.push(`${k}-${i}`);
  for (const k of [...GOOD, 'bread']) names.push(`on-${k}`);
  return names;
}

interface Sprite {
  tex: THREE.Texture;
  /** Size in game units once the image is in (the ingredient art is 50 px per unit). */
  w: number;
  h: number;
}

function useSprites() {
  const sprites = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const map = new Map<string, Sprite>();
    for (const name of spriteNames()) {
      const s: Sprite = { tex: null as unknown as THREE.Texture, w: 0, h: 0 };
      s.tex = loader.load(`${IMG}${name}.png`, tex => {
        const img = tex.image as { width: number; height: number };
        s.w = img.width / 50;
        s.h = img.height / 50;
      });
      s.tex.colorSpace = THREE.SRGBColorSpace;
      s.tex.anisotropy = 4;
      map.set(name, s);
    }
    return map;
  }, []);
  useEffect(() => () => sprites.forEach(s => s.tex.dispose()), [sprites]);
  return sprites;
}

const PLANE = new THREE.PlaneGeometry(1, 1);

/** A pool of flat sprite meshes, reused frame to frame by key. */
class SpritePool {
  private meshes = new Map<string, THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>>();
  private used = new Set<string>();
  constructor(private root: THREE.Group) {}

  begin() {
    this.used.clear();
  }

  put(key: string, sprite: Sprite | undefined, x: number, y: number, opts: { w?: number; h?: number; flip?: boolean; order?: number; sx?: number; sy?: number; rot?: number; opacity?: number; z?: number } = {}) {
    if (!sprite || !sprite.w) return;
    let mesh = this.meshes.get(key);
    if (!mesh) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
      mesh = new THREE.Mesh(PLANE, mat);
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.meshes.set(key, mesh);
    }
    this.used.add(key);
    const mat = mesh.material;
    if (mat.map !== sprite.tex) {
      mat.map = sprite.tex;
      mat.needsUpdate = true;
    }
    mat.opacity = opts.opacity ?? 1;
    const w = (opts.w ?? sprite.w) * U * (opts.sx ?? 1);
    const h = (opts.h ?? sprite.h) * U * (opts.sy ?? 1);
    mesh.visible = true;
    mesh.scale.set(opts.flip ? -w : w, h, 1);
    mesh.position.set(FIELD_X + x * U, DESK_Y + y * U, opts.z ?? PLANE_Z + (opts.order ?? 0) * 0.0004);
    mesh.rotation.set(0, 0, opts.rot ?? 0);
    mesh.renderOrder = 20 + (opts.order ?? 0);
  }

  end() {
    for (const [key, mesh] of this.meshes) {
      if (this.used.has(key)) continue;
      if (key.startsWith('keep:')) {
        mesh.visible = false;
        continue;
      }
      mesh.removeFromParent();
      mesh.material.dispose();
      this.meshes.delete(key);
    }
  }

  dispose() {
    for (const mesh of this.meshes.values()) mesh.material.dispose();
    this.meshes.clear();
  }
}

const ease = (t: number) => 1 - (1 - t) * (1 - t);

export function SandwichDesk({ glass }: { glass: { x: number; y: number; z: number } }) {
  const sprites = useSprites();
  const root = useRef<THREE.Group>(null);
  const pool = useRef<SpritePool | null>(null);
  const landed = useRef(false);
  const shoutKey = useRef(0);
  const hudKey = useRef('');

  useEffect(() => {
    void loadSandwichSounds()?.then(() => {
      sfx('woosh');
    });
    return () => {
      stopMusic();
      pool.current?.dispose();
      pool.current = null;
    };
  }, []);

  useFrame((_, rawDt) => {
    const group = root.current;
    const g = desk.game;
    if (!group || !g) return;
    pool.current ??= new SpritePool(group);
    const p = pool.current;
    const dt = Math.min(0.05, rawDt);
    const t = stageTime();

    // 625 jumps out of the monitor, or back into it.
    let hop: { x: number; y: number; z: number; s: number; rot: number } | null = null;
    if (desk.stage === 'intro') {
      const k = Math.min(1, Math.max(0, (t - 0.35) / (INTRO_S - 0.45)));
      if (k >= 1 && !landed.current) {
        landed.current = true;
        desk.shake = Math.max(desk.shake, 0.55);
        sfx('thud');
      }
      if (t >= INTRO_S) {
        introDone();
        startRound(g);
        startMusic();
      } else if (t < 0.35) {
        hop = { x: glass.x, y: glass.y, z: glass.z + 0.01, s: 0.001, rot: 0 };
      } else {
        hop = hopPose(g, glass, ease(k), k);
      }
    } else if (desk.stage === 'outro') {
      const k = Math.min(1, t / (OUTRO_S - 0.1));
      if (t >= OUTRO_S) {
        stopSandwich();
        return;
      }
      hop = hopPose(g, glass, 1 - k * k, 1 - k);
    } else if (desk.stage === 'on') {
      const move = (desk.keys.right ? 1 : 0) - (desk.keys.left ? 1 : 0) || desk.touchMove;
      step(g, dt, { move: Math.sign(move) });
      drain(g);
    }

    p.begin();
    draw(p, sprites, g, hop, performance.now() / 1000);
    p.end();
    syncHud(g);
  });

  function drain(g: Game) {
    for (const e of g.events) {
      if (e.type === 'land') landSound(e.kind);
      else if (e.type === 'icky') {
        sfx('icky');
        sfx('bleh');
        desk.shake = Math.max(desk.shake, 0.5);
        setHud({ shout: { text: e.text, key: ++shoutKey.current, tone: 'ick' } });
      } else if (e.type === 'toaster') window.setTimeout(() => sfx('toaster'), 1100);
      else if (e.type === 'eat') {
        sfx('eat', { rate: 1 + 0.05 * Math.min(e.n, 15) });
        setHud({ points: { n: e.points, key: ++shoutKey.current } });
      } else if (e.type === 'level') {
        sfx('thud');
        duckMusic(false);
        setHud({ shout: { text: `Level ${e.round}`, key: ++shoutKey.current, tone: 'level' } });
      } else if (e.type === 'won') {
        sfx('woosh');
        sfx('bell');
      } else if (e.type === 'lost') {
        sfx('bleh', { volume: 0.8 });
        duckMusic(true);
        desk.shake = Math.max(desk.shake, 0.8);
      }
    }
    g.events.length = 0;
  }

  function syncHud(g: Game) {
    const key = `${g.round}|${g.score}|${g.ick}|${g.phase}|${g.paused}|${g.totalCaught}`;
    if (key === hudKey.current) return;
    hudKey.current = key;
    setHud({
      round: g.round,
      score: g.score,
      ick: g.ick,
      phase: g.phase,
      paused: g.paused,
      caught: g.totalCaught,
      flavor: g.flavor,
      favs: g.phase === 'lost' ? favourites(g) : [],
    });
  }

  return <group ref={root} />;
}

/** Where 625 is on his hop between the glass (k = 0) and his spot on the desk (k = 1). */
function hopPose(g: Game, glass: { x: number; y: number; z: number }, k: number, raw: number) {
  const endX = FIELD_X + (g.x + SPRITE_DX) * U;
  const endY = DESK_Y + SPRITE_Y * U;
  const arc = Math.sin(Math.PI * Math.min(1, raw)) * 0.16;
  return {
    x: THREE.MathUtils.lerp(glass.x, endX, k),
    y: THREE.MathUtils.lerp(glass.y, endY, k) + arc,
    z: THREE.MathUtils.lerp(glass.z + 0.01, PLANE_Z, k),
    s: THREE.MathUtils.lerp(0.12, 1, k),
    rot: (1 - k) * Math.PI * 1.2,
  };
}

function draw(p: SpritePool, sprites: Map<string, Sprite>, g: Game, hop: { x: number; y: number; z: number; s: number; rot: number } | null, now: number) {
  const grumpy = g.grump > 0 || g.paused || g.phase === 'lost';
  const face = grumpy ? `grump-${1 + (Math.floor(now / 0.1) % 3)}` : `walk-${1 + g.walk}`;
  const body = sprites.get(face);

  if (hop) {
    // Flying: the whole sprite, spinning, sized by distance from the glass.
    if (body?.w) {
      p.put('keep:625', body, (hop.x - FIELD_X) / U, (hop.y - DESK_Y) / U, {
        w: SPRITE_W,
        h: SPRITE_H,
        flip: true,
        sx: hop.s,
        sy: hop.s,
        rot: hop.rot,
        z: hop.z,
        order: 2,
      });
    }
    return;
  }

  p.put('keep:625', body, g.x + SPRITE_DX, SPRITE_Y, { w: SPRITE_W, h: SPRITE_H, flip: true, order: 2 });

  // The sandwich on the plate, bottom up.
  g.stack.forEach((l, i) => {
    const punch = l.punch > 0 ? 1 + 0.5 * Math.sin((l.punch / 0.25) * Math.PI) : 1;
    p.put(`l${l.id}`, sprites.get(`on-${l.kind}`), l.x, layerY(l.h), { flip: l.flip, sx: punch, sy: 1 / Math.sqrt(punch), order: 3 + i * 0.01 });
  });

  for (const f of g.falling) {
    if (f.hidden > 0) continue;
    const frame = 1 + (Math.floor(f.age / 0.1) % FRAMES[f.kind]);
    const pop = f.age < 0.15 ? 0 : Math.min(1, (f.age - 0.15) / 0.25);
    p.put(`f${f.id}`, sprites.get(`${f.kind}-${frame}`), f.x, f.y, { flip: f.flip, sx: pop, sy: pop, order: 5 });
  }

  for (const s of g.splats) {
    const k = s.age / 0.6;
    p.put(`s${s.id}`, sprites.get(`${s.kind}-1`), s.x, s.y, { flip: s.flip, sx: 1 + k * 0.8, sy: Math.max(0.05, 1 - k * 1.2), opacity: 1 - k, order: 4 });
  }

  if (g.launch >= 0 && g.launch < 0.6) {
    const launch = sprites.get(`launch-${1 + Math.min(4, Math.floor(g.launch / 0.12))}`);
    if (launch?.w) p.put('launch', launch, LAUNCH_X, launch.h / 2, { order: 1 });
  }
}
