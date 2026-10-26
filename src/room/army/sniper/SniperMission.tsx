import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { fitFov } from '../../input';
import { HELI, placeHeli, type HeliState } from '../flight';
import { rotorOff, rotorOn, wakeArmyAudio } from '../armyAudio';
import {
  AIM_HOME,
  DUCKS_PER_WAVE,
  FIELD,
  HIT_RADIUS,
  PERFECT_BONUS,
  SHELLS,
  SQUAD,
  WAVES_PER_ROUND,
  aimDir,
  clampAim,
  duckPoints,
  launchDuck,
  missPoint,
  muzzle,
  rayHit,
  roundResult,
  scatter,
  scopeEye,
  shoot,
  stepDuck,
  waveOver,
  type Duck,
  type DuckKind,
  type V3,
} from './range';
import { DUCK_ASPECT, DUCK_FRAMES, duckSheet, flashTexture, grassTexture, skyTexture } from './duckArt';
import { sniperSfx } from './sniperAudio';
import { DUCK_STORY_TAIL, RADIO_BRIEF, SNIPER_PITCH, emitSniper, sniper, sniperControls, zoomFov, type Zoom } from './state';
import { DUCK_STORY, loadSarge, sargeClips, sargePlay, sargeReady, sargeSay, sargeStop, type SargeClip, type SargeTag } from '../sargeVoice';
import { headOnScreen } from '../SpeechBubble';
import { lineSeconds } from '../tutorial';
import { Quipper, quipSeconds } from '../../roomQuips';

/**
 * The shelf sniper mission. Land the chopper on the shelf over the TV and the
 * radio man calls you over: the ducks have taken over the other side of the
 * room. Take the rifle and the camera slides into the scope while a pop-up
 * duck range folds up out of the carpet. Ducks come two at a time, three
 * shells a wave, five waves a round. A hit plays the bullet cam: the bullet
 * leaves the barrel and crawls across the room in slow motion into the duck.
 */

const BEST_KEY = 'shelf-sniper-best';

const LINES = {
  start: ['They took the beanbag. Take it back.', 'Ducks at twelve o’clock. And at one. And two…', 'Quiet. Mom thinks we’re asleep.'],
  hit: ['Duck down! Literally.', 'Feathers everywhere. Mom’s gonna vacuum that.', 'Good shot. Quack quiet.', 'That one’s going in the toy box.'],
  miss: ['That one’s laughing at you.', 'Wind check: there is no wind. It’s a bedroom.', 'Mom’s gonna hear that.', 'Aim where the duck is, not where it was.'],
  away: ['It flew off toward the closet.', 'That one went for the window.', 'Get back here, you feathery punk!'],
  out: ['Out of shells! They saw you reloading.'],
  perfect: ['Perfect round. Tell nobody, it’s classified.'],
  over: ['The ducks win. They’ve taken the beanbag.', 'Retreat! They’ve got the high ground… the beanbag.'],
};

/** Sarge's moment for each kind of line on the range, where he has one. */
const VOICE: Partial<Record<keyof typeof LINES, SargeTag>> = {
  start: 'duck-start',
  hit: 'duck-hit',
  miss: 'duck-miss',
  perfect: 'duck-perfect',
  over: 'duck-over',
};

function line(kind: keyof typeof LINES, seconds = 2.6) {
  // Sarge says it when he's got a line for it and has been quiet long enough; otherwise the radio man's written one.
  const tag = VOICE[kind];
  const said = tag ? sargeSay(tag, { quiet: kind === 'start' || kind === 'over' || kind === 'perfect' ? 1 : 5, cool: kind === 'hit' || kind === 'miss' ? 8 : 0 }) : null;
  if (said?.text) {
    sniper.radio = { text: said.text, who: 'Sarge', until: performance.now() + Math.max(seconds, said.dur + 0.6) * 1000 };
    return;
  }
  const pool = LINES[kind];
  sniper.radio = { text: pool[Math.floor(Math.random() * pool.length)], until: performance.now() + seconds * 1000 };
}

function banner(text: string, sub?: string, seconds = 2.2) {
  sniper.banner = { text, sub, until: performance.now() + seconds * 1000 };
}

function readBest() {
  try {
    const n = Number(window.localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(n));
  } catch {
    // shown for this visit anyway
  }
}

const v = (p: V3) => new THREE.Vector3(p.x, p.y, p.z);
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
/** Pops up past flat and settles, like a pop-up book page. */
const popUp = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  const s = 1.7;
  return 1 + (s + 1) * Math.pow(c - 1, 3) + s * Math.pow(c - 1, 2);
};
const span = (r: number, a: number, b: number) => Math.max(0, Math.min(1, (r - a) / (b - a)));

// ---------------------------------------------------------------------------
// The range and its effects, built once and moved by hand each frame.

const MAX_DUCKS = 4;
const FEATHERS = 18;
const RIPPLES = 8;

function useRange() {
  return useMemo(() => {
    const root = new THREE.Group();
    root.visible = false;
    const flat = (map: THREE.Texture, w: number, h: number) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }),
      );
      m.position.y = h / 2;
      // Art faces north, toward the shelf.
      m.rotation.y = Math.PI;
      return m;
    };
    // Felt board the range stands on.
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(FIELD.w + 0.34, FIELD.backZ - FIELD.grassZ[0] + 0.22),
      new THREE.MeshLambertMaterial({ color: '#4d8a33', emissive: '#1d3a12' }),
    );
    board.rotation.x = -Math.PI / 2;
    board.position.set(FIELD.x, 0.009, (FIELD.backZ + FIELD.grassZ[0]) / 2);
    root.add(board);

    const hinge = (z: number, child: THREE.Object3D) => {
      const g = new THREE.Group();
      g.position.set(FIELD.x, 0.01, z);
      g.add(child);
      root.add(g);
      return g;
    };
    const skyW = FIELD.w + 0.26;
    const sky = flat(skyTexture(), skyW, FIELD.skyH);
    (sky.material as THREE.MeshBasicMaterial).transparent = false;
    (sky.material as THREE.MeshBasicMaterial).side = THREE.FrontSide;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(skyW, FIELD.skyH), new THREE.MeshLambertMaterial({ color: '#b8915a' }));
    back.position.set(0, FIELD.skyH / 2, 0.003);
    const skyGroup = new THREE.Group();
    skyGroup.add(sky, back);
    const skyHinge = hinge(FIELD.backZ, skyGroup);

    const grassHinges = FIELD.grassZ.map((z, i) => {
      const w = FIELD.w + 0.1;
      const h = FIELD.grassH[i];
      const tex = grassTexture(11 + i * 17, i === 0);
      tex.repeat.x = w / h / (1024 / 192);
      return hinge(z, flat(tex, w, h));
    });

    // The cartoon tree: striped trunk, puffy leaves.
    const tree = new THREE.Group();
    tree.position.set(FIELD.tree.x, 0.01, FIELD.tree.z);
    const H = FIELD.tree.h;
    const bark = new THREE.MeshLambertMaterial({ color: '#7b2416', emissive: '#3a0f08' });
    const band = new THREE.MeshLambertMaterial({ color: '#d27b3a', emissive: '#5a2c0c' });
    const leaf = new THREE.MeshLambertMaterial({ color: '#7fe356', emissive: '#2c6a1a' });
    const leafDark = new THREE.MeshLambertMaterial({ color: '#4fb83a', emissive: '#1d4d12' });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.05, H * 0.66, 12), bark);
    trunk.position.y = H * 0.33;
    tree.add(trunk);
    for (const f of [0.14, 0.3, 0.46]) {
      const r = 0.05 - (0.018 * f) / 0.66 + 0.004;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.002, 0.03, 12), band);
      b.position.y = H * f;
      tree.add(b);
    }
    for (const [x, y, rz] of [
      [0.08, 0.5, -0.9],
      [-0.07, 0.56, 0.9],
    ] as const) {
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.2, 8), bark);
      br.position.set(x, H * y, 0);
      br.rotation.z = rz;
      tree.add(br);
    }
    const puffs: [number, number, number, number, THREE.Material][] = [
      [0, 0.8, 0, 0.19, leaf],
      [-0.15, 0.72, 0.02, 0.13, leaf],
      [0.16, 0.74, 0.01, 0.14, leaf],
      [0.04, 0.96, 0, 0.14, leaf],
      [-0.1, 0.9, 0.03, 0.12, leafDark],
      [0.1, 0.86, 0.05, 0.12, leafDark],
      [0.19, 0.53, 0, 0.07, leaf],
      [-0.17, 0.6, 0, 0.065, leaf],
    ];
    for (const [x, y, z, r, m] of puffs) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m);
      s.position.set(x, H * y, z);
      tree.add(s);
    }
    root.add(tree);

    const light = new THREE.PointLight('#fff4dc', 0, 3.6, 2);
    light.position.set(FIELD.x, 1.55, 0.45);
    root.add(light);

    // Ducks: one material per colour per slot, so each can show its own frame.
    const duckGeo = new THREE.PlaneGeometry(0.13, 0.13 / DUCK_ASPECT);
    const ducks = Array.from({ length: MAX_DUCKS }, () => {
      const mats = {} as Record<DuckKind, THREE.MeshBasicMaterial>;
      for (const kind of ['mallard', 'blue', 'red'] as DuckKind[]) {
        const map = duckSheet(kind).clone();
        map.repeat.set(1 / DUCK_FRAMES, 1);
        mats[kind] = new THREE.MeshBasicMaterial({ map, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
      }
      const mesh = new THREE.Mesh(duckGeo, mats.mallard);
      mesh.visible = false;
      root.add(mesh);
      return { mesh, mats };
    });

    const featherGeo = new THREE.PlaneGeometry(0.014, 0.006);
    const feathers = Array.from({ length: FEATHERS }, (_, i) => {
      const mesh = new THREE.Mesh(featherGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? '#f5f2ea' : '#5a5a5a', side: THREE.DoubleSide, transparent: true }));
      mesh.visible = false;
      root.add(mesh);
      return { mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0 };
    });

    const flashTex = flashTexture();
    const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: '#e8e8e8', transparent: true, depthWrite: false }));
    puff.visible = false;
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    flash.visible = false;
    const smoke = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, color: '#9a9a9a', transparent: true, depthWrite: false }));
    smoke.visible = false;

    // The bullet: a brass slug with a streak of air behind it.
    const bullet = new THREE.Group();
    const slugGeo = new THREE.CylinderGeometry(0.0014, 0.0016, 0.006, 10);
    slugGeo.rotateX(Math.PI / 2);
    const slug = new THREE.Mesh(slugGeo, new THREE.MeshStandardMaterial({ color: '#c9973a', metalness: 0.8, roughness: 0.3, emissive: '#3a2508' }));
    const tipGeo = new THREE.ConeGeometry(0.0014, 0.004, 10);
    tipGeo.rotateX(Math.PI / 2);
    const tip = new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color: '#b07a3a', metalness: 0.7, roughness: 0.35 }));
    tip.position.z = 0.005;
    const trailGeo = new THREE.CylinderGeometry(0.0003, 0.0013, 0.09, 8, 1, true);
    trailGeo.rotateX(Math.PI / 2);
    trailGeo.translate(0, 0, -0.048);
    const trail = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    bullet.add(slug, tip, trail);
    bullet.visible = false;
    const ringGeo = new THREE.TorusGeometry(0.004, 0.0004, 6, 20);
    const ripples = Array.from({ length: RIPPLES }, () => {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
      mesh.visible = false;
      return { mesh, life: 0 };
    });

    const tracerGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const tracer = new THREE.Line(tracerGeo, new THREE.LineBasicMaterial({ color: '#ffe680', transparent: true }));
    tracer.frustumCulled = false;
    tracer.visible = false;

    // A little lamp on the squad while you're up there talking.
    const squadLight = new THREE.PointLight('#ffe9c4', 0, 0.9, 2);
    squadLight.position.set((SQUAD.sniper.x + SQUAD.radio.x) / 2, SQUAD.top + 0.16, SQUAD.radio.z + 0.22);
    const fx = new THREE.Group();
    fx.add(squadLight, puff, flash, smoke, bullet, tracer, ...ripples.map(r => r.mesh));

    return { root, fx, squadLight, skyHinge, grassHinges, tree, light, ducks, feathers, puff, flash, smoke, bullet, ripples, tracer };
  }, []);
}

type Range = ReturnType<typeof useRange>;

interface BulletRun {
  from: THREE.Vector3;
  end: THREE.Vector3;
  duck: Duck | null;
  /** Real seconds. */
  t: number;
  travel: number;
  done: boolean;
  tail: number;
  ripple: number;
}

const BARREL_SHOT = 0.45;
/** Walk this close to the squad on foot and they'll talk. */
const SQUAD_TALK = 0.14;
const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _pos = new THREE.Vector3();
const _look = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

interface Boot {
  stage: 'talk' | 'play' | null;
}

function readBoot(): Boot {
  if (typeof window === 'undefined') return { stage: null };
  const s = new URLSearchParams(window.location.search).get('sniper');
  return { stage: s === 'talk' ? 'talk' : s === 'play' || s === '1' ? 'play' : null };
}

export function SniperMission({
  heli,
  flying,
  walker,
}: {
  heli: React.MutableRefObject<HeliState>;
  flying: () => boolean;
  /** Where you're standing when you're on foot (null in the chopper). */
  walker: () => THREE.Vector3 | null;
}) {
  const { camera, gl, size } = useThree();
  const range = useRange();
  const boot = useMemo(readBoot, []);
  const run = useRef({
    /** Seconds in the current phase (real time). */
    t: 0,
    fromPos: new THREE.Vector3(),
    fromLook: new THREE.Vector3(),
    stageT: 0,
    bullet: null as BulletRun | null,
    scale: 1,
    kick: 0,
    cooldown: 0,
    clock: 0,
    nextId: 0,
    roundHits: 0,
    lastEmit: 0,
    saved: null as null | { near: number; fov: number },
    tracer: 0,
    puff: 0,
    flash: 0,
    pending: boot.stage,
    leaveAt: 0,
    /** Seconds the current briefing line has been up. */
    briefT: 0,
    /** Sarge's voice for the briefing, one clip per bubble (empty without the voice). */
    story: [] as SargeClip[],
  });
  const keys = useRef<Record<string, boolean>>({});
  const scopeQuips = useMemo(() => new Quipper({ gap: 22, cooldown: 0, chance: 0.12 }), []);
  const pointer = useRef({ down: false, x: 0, y: 0, moved: 0, locked: false, noLock: false, type: 'mouse' });

  const rand = Math.random;

  function lookNow(out: THREE.Vector3) {
    camera.getWorldDirection(out);
    return out.multiplyScalar(0.5).add(camera.position);
  }

  function setPhase(p: typeof sniper.phase) {
    sniper.phase = p;
    run.current.t = 0;
    run.current.fromPos.copy(camera.position);
    lookNow(run.current.fromLook);
    emitSniper();
  }

  function resetGame() {
    sniper.round = 1;
    sniper.wave = 0;
    sniper.stage = 'launch';
    sniper.shells = SHELLS;
    sniper.score = 0;
    sniper.best = readBest();
    sniper.tally = Array(WAVES_PER_ROUND * DUCKS_PER_WAVE).fill(null);
    sniper.ducks = [];
    sniper.breath = 1;
    sniper.yaw = AIM_HOME.yaw;
    sniper.pitch = AIM_HOME.pitch;
    run.current.stageT = -1.4;
    run.current.roundHits = 0;
    run.current.nextId = 0;
    run.current.bullet = null;
  }

  function saveLens() {
    if (!run.current.saved) {
      const p = camera as THREE.PerspectiveCamera;
      run.current.saved = { near: p.near, fov: p.fov };
    }
  }

  function restoreLens() {
    const p = camera as THREE.PerspectiveCamera;
    if (run.current.saved) {
      p.near = run.current.saved.near;
      p.fov = run.current.saved.fov;
      p.updateProjectionMatrix();
    }
  }

  /** F by the squad on foot: the radio man briefs you first, then the sniper offers his rifle. */
  function talk() {
    if (sniper.phase !== 'near' || sniper.near === 'land' || sniper.near === null) return;
    wakeArmyAudio();
    rotorOff();
    saveLens();
    sniperSfx.hail();
    if (sniper.near === 'radio') {
      sniper.briefLine = 0;
      const story = sargeReady() ? sargeClips(DUCK_STORY) : [];
      run.current.story = story.length === DUCK_STORY.length ? story : [];
      voiceBrief();
      setPhase('brief');
    } else setPhase('talk');
  }

  /** Sarge says this bubble's line of the story. */
  function voiceBrief() {
    const clip = run.current.story[sniper.briefLine];
    if (clip) sargePlay(clip);
  }

  /** The bubble: Sarge's words, then the bit of the story they leave out (or the written briefing). */
  function briefText(i: number) {
    const clip = run.current.story[i];
    return clip ? `${clip.text} ${DUCK_STORY_TAIL[i]}` : RADIO_BRIEF[i];
  }

  function briefSeconds(i: number) {
    const clip = run.current.story[i];
    return Math.max(lineSeconds(briefText(i)) + 0.6, clip ? clip.dur + 1.2 : 0);
  }

  function nextBrief() {
    if (sniper.phase !== 'brief') return;
    run.current.briefT = 0;
    if (sniper.briefLine + 1 < RADIO_BRIEF.length) {
      sniper.briefLine += 1;
      voiceBrief();
      emitSniper();
    } else endBrief();
  }

  /** He's said his piece: the camera goes back to you, wherever you had it. */
  function endBrief() {
    if (sniper.phase !== 'brief') return;
    sniper.briefed = true;
    sniper.bubble = null;
    if (run.current.story.length) sargeStop();
    restoreLens();
    sniper.phase = 'off';
    sniper.near = null;
    emitSniper();
  }

  function accept() {
    if (sniper.phase !== 'talk') return;
    resetGame();
    setPhase('scope-in');
  }

  function leave() {
    if (sniper.phase === 'off' || sniper.phase === 'near' || sniper.phase === 'leaving') return;
    if (document.pointerLockElement) document.exitPointerLock();
    run.current.bullet = null;
    range.bullet.visible = false;
    sniper.fade = 1;
    run.current.leaveAt = 0.35;
    setPhase('leaving');
  }

  function again() {
    resetGame();
    banner('Round 1', 'Same ducks. Angrier.', 2);
    line('start');
    sniperSfx.round();
    emitSniper();
  }

  function cycleZoom(dir = 1) {
    const z = sniper.zoom + dir;
    sniper.zoom = (z > 3 ? 1 : z < 1 ? 3 : z) as Zoom;
    sniperSfx.zoom();
    emitSniper();
  }

  function cycleBulletCam() {
    sniper.bulletCam = sniper.bulletCam === 'hits' ? 'all' : sniper.bulletCam === 'all' ? 'off' : 'hits';
    emitSniper();
  }

  /** The aim with breathing sway and recoil on top. */
  function liveAim() {
    const r = run.current;
    const calm = sniper.holding ? 0.15 : 1;
    const a = 0.0032 * calm;
    return {
      yaw: sniper.yaw + Math.sin(r.clock * 0.9) * a + Math.sin(r.clock * 2.3) * a * 0.35,
      pitch: sniper.pitch + Math.sin(r.clock * 1.3 + 1) * a * 0.8 + r.kick,
    };
  }

  function hitDuck(d: Duck) {
    if (!shoot(d)) return;
    const pts = duckPoints(d.kind, sniper.round);
    sniper.score += pts;
    sniper.tally[d.id] = true;
    run.current.roundHits += 1;
    sniperSfx.thwack();
    sniperSfx.poof();
    burstFeathers(range, d.pos, d.kind);
    if (Math.random() < 0.55) line('hit');
  }

  function missedAt(p: THREE.Vector3) {
    range.puff.position.copy(p);
    run.current.puff = 0.6;
    if (Math.random() < 0.5) line('miss');
  }

  function outOfShells() {
    if (sniper.shells > 0 || !sniper.ducks.some(d => d.state === 'fly')) return;
    scatter(sniper.ducks);
    for (const d of sniper.ducks) if (d.state === 'away' && sniper.tally[d.id] === null) sniper.tally[d.id] = false;
    sniperSfx.flyAway();
    banner('Out of shells!', 'They saw you reloading', 1.6);
    line('out');
  }

  function fire() {
    const r = run.current;
    if (sniper.phase === 'bullet' && r.bullet && !r.bullet.done) {
      // Skip to the impact.
      r.bullet.t = BARREL_SHOT + r.bullet.travel;
      return;
    }
    if (sniper.phase !== 'play' || sniper.stage !== 'flying' || r.cooldown > 0) return;
    if (sniper.shells <= 0) {
      sniperSfx.dry();
      return;
    }
    wakeArmyAudio();
    sniper.shells -= 1;
    r.cooldown = 0.6;
    sniperSfx.crack();
    sniperSfx.bolt();
    const aim = liveAim();
    const eye = scopeEye(aim.yaw, aim.pitch);
    const dir = aimDir(aim.yaw, aim.pitch);
    let best: Duck | null = null;
    let bestT = Infinity;
    for (const d of sniper.ducks) {
      if (d.state !== 'fly') continue;
      const t = rayHit(eye, dir, d.pos, HIT_RADIUS);
      if (t !== null && t < bestT) {
        best = d;
        bestT = t;
      }
    }
    const from = v(muzzle(aim.yaw, aim.pitch));
    const end = best ? v(best.pos) : v(missPoint(eye, dir));
    r.kick = 0.045;
    range.flash.position.copy(from).addScaledVector(v(dir), 0.006);
    r.flash = 0.12;
    const cine = best ? sniper.bulletCam !== 'off' : sniper.bulletCam === 'all';
    if (cine) {
      const dist = from.distanceTo(end);
      const travel = Math.min(2.4, 1.1 + dist * 0.3);
      r.bullet = { from, end, duck: best, t: 0, travel, done: false, tail: 0, ripple: 0 };
      sniper.scoped = false;
      sniperSfx.slowmo(travel + BARREL_SHOT);
      setPhase('bullet');
      return;
    }
    const pos = range.tracer.geometry.attributes.position as THREE.BufferAttribute;
    pos.setXYZ(0, from.x, from.y, from.z);
    pos.setXYZ(1, end.x, end.y, end.z);
    pos.needsUpdate = true;
    r.tracer = 0.09;
    if (best) hitDuck(best);
    else missedAt(end);
    outOfShells();
    emitSniper();
  }

  // Controls for the HUD, keys and the pointer.
  useEffect(() => {
    void loadSarge();
    sniperControls.talk = talk;
    sniperControls.nextBrief = nextBrief;
    sniperControls.accept = accept;
    sniperControls.leave = leave;
    sniperControls.fire = fire;
    sniperControls.zoom = () => cycleZoom(1);
    sniperControls.cycleBulletCam = cycleBulletCam;
    sniperControls.again = again;
    const canvas = gl.domElement;
    const playing = () => sniper.phase === 'play' || sniper.phase === 'bullet';
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select')) return;
      if (sniper.phase === 'brief') {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Space')) nextBrief();
        if (e.code === 'Escape') endBrief();
        if (e.code === 'Space') e.preventDefault();
        return;
      }
      if (sniper.phase === 'talk') {
        if (e.code === 'Enter' || e.code === 'KeyF' || e.code === 'Space') accept();
        if (e.code === 'Escape') leave();
        return;
      }
      if (!playing()) return;
      keys.current[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'Enter') fire();
      if (e.code === 'KeyZ') cycleZoom(1);
      if (e.code === 'KeyB') cycleBulletCam();
      if (e.code === 'KeyX' || e.code === 'Escape' || e.code === 'KeyF') leave();
      if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const aimBy = (dx: number, dy: number) => {
      const k = 0.0024 * (zoomFov(sniper.zoom) / 30);
      const c = clampAim(sniper.yaw - dx * k, sniper.pitch - dy * k);
      sniper.yaw = c.yaw;
      sniper.pitch = c.pitch;
    };
    const pDown = (e: PointerEvent) => {
      if (!playing() || !(e.target instanceof HTMLCanvasElement)) return;
      const p = pointer.current;
      p.type = e.pointerType;
      if (e.button === 2) {
        cycleZoom(1);
        return;
      }
      if (p.locked) {
        fire();
        return;
      }
      p.down = true;
      p.x = e.clientX;
      p.y = e.clientY;
      p.moved = 0;
    };
    const pMove = (e: PointerEvent) => {
      const p = pointer.current;
      if (!playing()) return;
      if (p.locked) {
        aimBy(e.movementX, e.movementY);
        return;
      }
      if (!p.down) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      p.x = e.clientX;
      p.y = e.clientY;
      // Drag the scope round (slower than a locked mouse: a finger travels further).
      aimBy(dx * 0.7, dy * 0.7);
    };
    const pUp = () => {
      const p = pointer.current;
      if (!p.down) return;
      p.down = false;
      if (p.moved > 8 || !playing()) return;
      if (p.type === 'mouse' && !p.noLock && canvas.requestPointerLock && sniper.phase === 'play') {
        // First click grabs the mouse; after that every click is a shot.
        try {
          const req = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
          req?.catch?.(() => {
            p.noLock = true;
          });
        } catch {
          p.noLock = true;
        }
        return;
      }
      if (p.type === 'mouse') fire();
    };
    const lockChange = () => {
      pointer.current.locked = document.pointerLockElement === canvas;
    };
    const lockError = () => {
      pointer.current.noLock = true;
    };
    const wheel = (e: WheelEvent) => {
      if (!playing()) return;
      cycleZoom(e.deltaY < 0 ? 1 : -1);
    };
    const menu = (e: Event) => {
      if (playing()) e.preventDefault();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('pointerdown', pDown);
    window.addEventListener('pointermove', pMove);
    window.addEventListener('pointerup', pUp);
    document.addEventListener('pointerlockchange', lockChange);
    document.addEventListener('pointerlockerror', lockError);
    canvas.addEventListener('wheel', wheel, { passive: true });
    canvas.addEventListener('contextmenu', menu);
    if (import.meta.env.DEV) {
      (window as unknown as { __sniper: unknown }).__sniper = {
        sniper,
        fire,
        /** Point the rifle at duck i (for tests). */
        aimAtDuck(i: number) {
          const d = sniper.ducks.filter(x => x.state === 'fly')[i];
          if (!d) return false;
          const eye = scopeEye(sniper.yaw, sniper.pitch);
          sniper.yaw = Math.atan2(d.pos.x - eye.x, d.pos.z - eye.z);
          sniper.pitch = Math.atan2(d.pos.y - eye.y, Math.hypot(d.pos.x - eye.x, d.pos.z - eye.z));
          return true;
        },
      };
    }
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerdown', pDown);
      window.removeEventListener('pointermove', pMove);
      window.removeEventListener('pointerup', pUp);
      document.removeEventListener('pointerlockchange', lockChange);
      document.removeEventListener('pointerlockerror', lockError);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('contextmenu', menu);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      for (const k of Object.keys(sniperControls) as (keyof typeof sniperControls)[]) sniperControls[k] = null;
      // Leaving the army town altogether: put everything back.
      sniper.phase = 'off';
      sniper.near = null;
      sniper.briefed = false;
      sniper.bubble = null;
      sniper.scoped = false;
      sniper.rise = 0;
      sniper.hop = 0;
      sniper.fade = 0;
      sniper.ducks = [];
      sniper.yaw = AIM_HOME.yaw;
      sniper.pitch = AIM_HOME.pitch;
      emitSniper();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A test boot: park the chopper on the shelf next to the squad.
  useEffect(() => {
    if (!boot.stage) return;
    placeHeli(heli.current, -0.495, SQUAD.top + HELI.skid, SQUAD.sniper.z - 0.12, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, raw) => {
    try {
      frame(Math.min(raw, 0.05));
    } catch (err) {
      console.error('[sniper] frame failed', err);
    }
  });

  function frame(dt: number) {
    const r = run.current;
    r.t += dt;
    r.clock += dt;
    r.cooldown = Math.max(0, r.cooldown - dt);
    r.kick *= Math.exp(-dt * 9);
    const h = heli.current;

    // --- Who's near the squad ------------------------------------------
    // Land on the shelf, hop out, and walk over: the radio man first, then the sniper.
    const onShelf = flying() && h.grounded && h.pos.y > SQUAD.top - 0.02 && h.pos.y < SQUAD.top + 0.2;
    const landed = onShelf && Math.hypot(h.pos.x - (SQUAD.sniper.x + SQUAD.radio.x) / 2, h.pos.z - SQUAD.radio.z) < SQUAD.reach;
    const w = walker();
    const onFoot = w !== null && Math.abs(w.y - SQUAD.top) < 0.03;
    const dRadio = onFoot ? Math.hypot(w.x - SQUAD.radio.x, w.z - SQUAD.radio.z) : Infinity;
    const dSniper = onFoot ? Math.hypot(w.x - SQUAD.sniper.x, w.z - SQUAD.sniper.z) : Infinity;
    const close = Math.min(dRadio, dSniper) < SQUAD_TALK;
    const who: typeof sniper.near = close ? (sniper.briefed ? 'sniper' : 'radio') : landed ? 'land' : null;
    if (sniper.phase === 'off' && who) {
      sniper.phase = 'near';
      sniper.near = who;
      sniperSfx.hail();
      emitSniper();
    } else if (sniper.phase === 'near' && who !== sniper.near) {
      sniper.near = who;
      if (!who) sniper.phase = 'off';
      emitSniper();
    }
    if (r.pending && sniper.phase === 'near') {
      // Test boots skip the walk.
      const stage = r.pending;
      r.pending = null;
      sniper.briefed = true;
      sniper.near = 'sniper';
      talk();
      if (stage === 'play') accept();
    }
    // Glassing the room between ducks, you can't help noticing the mess.
    if (sniper.phase === 'play' && !sniper.radio) {
      const q = scopeQuips.tick(dt, 'scope', 0, 0, 0);
      if (q) {
        const text = q.then ? `${q.text} ${q.then}` : q.text;
        sniper.radio = { text, who: 'You', until: performance.now() + quipSeconds(text) * 1000 };
      }
    }
    if (sniper.phase === 'brief') {
      r.briefT += dt;
      if (r.briefT > briefSeconds(sniper.briefLine)) nextBrief();
    }

    // The radio man bounces while he's got something to say.
    const talking = sniper.phase === 'near' || sniper.phase === 'brief' || (sniper.radio !== null && performance.now() < sniper.radio.until);
    sniper.hop = talking ? (sniper.hop + dt * 2.4) % 2 : Math.max(0, sniper.hop - dt * 2) % 2;

    // --- The range pops up while you're on the rifle ---------------------
    const want = sniper.phase === 'play' || sniper.phase === 'bullet' || (sniper.phase === 'scope-in' && r.t > 0.6) ? 1 : 0;
    const before = sniper.rise;
    sniper.rise = want ? Math.min(1, sniper.rise + dt / 2.2) : Math.max(0, sniper.rise - dt / 1.1);
    if (before === 0 && sniper.rise > 0) sniperSfx.flap();
    poseRange(range, sniper.rise);
    const lit = sniper.phase === 'talk' || sniper.phase === 'scope-in' || sniper.phase === 'bullet';
    range.squadLight.intensity += ((lit ? 0.6 : 0) - range.squadLight.intensity) * Math.min(1, dt * 4);

    // --- Game clock (slowed for the bullet cam) --------------------------
    const b = r.bullet;
    r.scale = !b ? 1 : !b.done ? 0.025 : b.duck ? 0.3 : 0.6;
    const gdt = dt * r.scale;
    if (sniper.phase === 'play' || sniper.phase === 'bullet') tickGame(gdt);
    tickDucks(range, camera, r.clock);
    tickFx(gdt, dt);

    // Breath: hold Shift to steady the scope, for as long as you've got air.
    const hold = sniper.phase === 'play' && Boolean(keys.current.ShiftLeft || keys.current.ShiftRight || sniper.touchBreath) && sniper.breath > 0.02;
    sniper.holding = hold;
    sniper.breath = hold ? Math.max(0, sniper.breath - dt * 0.28) : Math.min(1, sniper.breath + dt * 0.22);

    // Keys aim too.
    if (sniper.phase === 'play') {
      const k = keys.current;
      const ax = (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0);
      const ay = (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0);
      if (ax || ay) {
        const rate = 0.55 * (zoomFov(sniper.zoom) / 30) * dt;
        const c = clampAim(sniper.yaw - ax * rate, sniper.pitch - ay * rate);
        sniper.yaw = c.yaw;
        sniper.pitch = c.pitch;
      }
    }

    // --- Camera ------------------------------------------------------------
    if (sniper.phase !== 'off' && sniper.phase !== 'near') cameraFor(dt);
    squadBubble();

    const now = performance.now();
    if (now - r.lastEmit > 90) {
      r.lastEmit = now;
      if (sniper.banner && now > sniper.banner.until) sniper.banner = null;
      if (sniper.radio && now > sniper.radio.until) sniper.radio = null;
      emitSniper();
    }
  }

  /** The bubble over whoever's talking: the radio man in his briefing, the sniper with his offer. */
  function squadBubble() {
    const p = sniper.phase;
    const radioHead = () => headOnScreen(camera, SQUAD.radio.x, SQUAD.top + 0.1, SQUAD.radio.z);
    const sniperHead = () => headOnScreen(camera, SQUAD.sniper.x, SQUAD.top + 0.04, SQUAD.sniper.z);
    let next: typeof sniper.bubble = null;
    if (p === 'brief') {
      const at = radioHead();
      if (at) next = { ...at, who: 'Radio man', text: briefText(sniper.briefLine), hint: `F or tap · next (${sniper.briefLine + 1}/${RADIO_BRIEF.length})` };
    } else if (p === 'talk' && run.current.t > 0.7) {
      const at = sniperHead();
      if (at) next = { ...at, who: 'Pvt. Scope', text: SNIPER_PITCH };
    } else if (p === 'near' && (sniper.near === 'radio' || sniper.near === 'sniper')) {
      const at = sniper.near === 'radio' ? radioHead() : sniperHead();
      if (at)
        next = {
          ...at,
          who: sniper.near === 'radio' ? 'Radio man' : 'Pvt. Scope',
          text: sniper.near === 'radio' ? 'Psst! Over here!' : 'Ready when you are, soldier.',
          hint: 'F or tap to talk',
        };
    }
    sniper.bubble = next;
  }

  function tickGame(gdt: number) {
    const r = run.current;
    r.stageT += gdt;
    const ducks = sniper.ducks;
    switch (sniper.stage) {
      case 'launch':
        if (r.stageT >= 0.9) {
          const ducksNow: Duck[] = [];
          for (let i = 0; i < DUCKS_PER_WAVE; i++) ducksNow.push(launchDuck(sniper.wave * DUCKS_PER_WAVE + i, sniper.round, i, rand));
          sniper.ducks = ducksNow;
          sniper.stage = 'flying';
          r.stageT = 0;
          sniperSfx.quack();
          emitSniper();
        }
        break;
      case 'flying': {
        for (const d of ducks) {
          for (const e of stepDuck(d, gdt, sniper.round, rand)) {
            if (e === 'quack' && r.scale === 1) sniperSfx.quack();
            if (e === 'land') sniperSfx.land();
            if (e === 'away') {
              if (sniper.tally[d.id] === null) sniper.tally[d.id] = false;
              sniperSfx.flyAway();
            }
          }
        }
        if (waveOver(ducks) && !r.bullet) {
          sniper.stage = 'tally';
          r.stageT = 0;
          const lost = ducks.filter(d => !d.hit).length;
          if (lost > 0) {
            banner(lost === ducks.length ? 'Fly away!' : 'One got away!', undefined, 1.3);
            line('away');
          }
          emitSniper();
        }
        break;
      }
      case 'tally':
        if (r.stageT > 1.1) {
          sniper.wave += 1;
          if (sniper.wave >= WAVES_PER_ROUND) {
            const res = roundResult(r.roundHits, sniper.round);
            if (res === 'over') {
              sniper.stage = 'over';
              sniperSfx.over();
              line('over', 5);
              if (sniper.score > sniper.best) {
                sniper.best = sniper.score;
                saveBest(sniper.score);
              }
            } else {
              sniper.stage = 'round';
              if (res === 'perfect') {
                sniper.score += PERFECT_BONUS;
                sniperSfx.perfect();
                banner('Perfect!', `+${PERFECT_BONUS} · ${r.roundHits}/10 ducks`, 2.6);
                line('perfect');
              } else {
                sniperSfx.round();
                banner(`Round ${sniper.round} clear`, `${r.roundHits}/10 ducks`, 2.6);
              }
              if (sniper.score > sniper.best) {
                sniper.best = sniper.score;
                saveBest(sniper.score);
              }
            }
          } else {
            sniper.stage = 'launch';
            sniper.shells = SHELLS;
            sniperSfx.bolt();
          }
          r.stageT = 0;
          emitSniper();
        }
        break;
      case 'round':
        if (r.stageT > 2.8) {
          sniper.round += 1;
          sniper.wave = 0;
          sniper.tally = Array(WAVES_PER_ROUND * DUCKS_PER_WAVE).fill(null);
          sniper.shells = SHELLS;
          sniper.stage = 'launch';
          r.roundHits = 0;
          r.stageT = -0.6;
          banner(`Round ${sniper.round}`, 'Faster ducks', 2);
          emitSniper();
        }
        break;
      case 'over':
        // Waiting on Try again or Back to the chopper.
        for (const d of ducks) stepDuck(d, gdt, sniper.round, rand);
        break;
    }
  }

  function tickFx(gdt: number, dt: number) {
    const r = run.current;
    for (const f of range.feathers) {
      if (f.life <= 0) continue;
      f.life -= gdt;
      f.vel.y -= 0.35 * gdt;
      f.vel.multiplyScalar(1 - Math.min(1, gdt * 2.5));
      f.mesh.position.addScaledVector(f.vel, gdt);
      f.mesh.rotation.x += f.spin.x * gdt;
      f.mesh.rotation.y += f.spin.y * gdt;
      f.mesh.rotation.z += f.spin.z * gdt;
      (f.mesh.material as THREE.MeshBasicMaterial).opacity = Math.min(1, f.life * 2);
      f.mesh.visible = f.life > 0;
    }
    r.tracer -= dt;
    range.tracer.visible = r.tracer > 0;
    r.puff -= dt;
    range.puff.visible = r.puff > 0;
    if (r.puff > 0) {
      const k = 1 - r.puff / 0.6;
      range.puff.scale.setScalar(0.03 + k * 0.08);
      range.puff.material.opacity = 0.8 * (1 - k);
    }
    // The flash and smoke run on the slowed clock so the bullet cam sees them.
    r.flash -= r.bullet ? gdt * 6 : dt;
    range.flash.visible = r.flash > 0;
    if (r.flash > 0) range.flash.scale.setScalar(0.012 + (0.12 - r.flash) * 0.25);
    range.smoke.visible = Boolean(r.bullet) && r.bullet!.t < BARREL_SHOT + 0.4;
    if (range.smoke.visible && r.bullet) {
      const k = Math.min(1, r.bullet.t / (BARREL_SHOT + 0.4));
      range.smoke.position.copy(r.bullet.from).addScaledVector(_dir.subVectors(r.bullet.end, r.bullet.from).normalize(), 0.004 + k * 0.012);
      range.smoke.scale.setScalar(0.008 + k * 0.03);
      range.smoke.material.opacity = 0.45 * (1 - k);
    }
    for (const rp of range.ripples) {
      if (rp.life <= 0) continue;
      rp.life -= dt;
      const k = 1 - rp.life / 0.9;
      rp.mesh.scale.setScalar(1 + k * 3);
      (rp.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - k);
      rp.mesh.visible = rp.life > 0;
    }
  }

  function cameraFor(dt: number) {
    const r = run.current;
    const persp = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    let fov = 45;
    let near = 0.003;
    const home = aimDir(AIM_HOME.yaw, AIM_HOME.pitch);
    const flatHome = new THREE.Vector3(home.x, 0, home.z).normalize();
    const shoulder = new THREE.Vector3(SQUAD.sniper.x, SQUAD.top, SQUAD.sniper.z)
      .addScaledVector(flatHome, -0.11)
      .add(new THREE.Vector3(0, 0.17, 0));
    const fieldMid = new THREE.Vector3(FIELD.x, 0.55, (FIELD.fly.z0 + FIELD.fly.z1) / 2);

    switch (sniper.phase) {
      case 'brief': {
        // Close on the radio man, a little off to his side, so the bubble sits over his head.
        const e = smooth(r.t / 1.0);
        _a.set(SQUAD.radio.x + 0.05, SQUAD.top + 0.085, SQUAD.radio.z + 0.13);
        _b.set(SQUAD.radio.x, SQUAD.top + 0.06, SQUAD.radio.z);
        _pos.lerpVectors(r.fromPos, _a, e);
        _look.lerpVectors(r.fromLook, _b, e);
        fov = 42;
        break;
      }
      case 'talk': {
        // Down low by the sniper, who's lying flat behind his rifle; the radio man in the back.
        const e = smooth(r.t / 1.1);
        _a.set(SQUAD.sniper.x - 0.07, SQUAD.top + 0.06, SQUAD.sniper.z + 0.12);
        _b.set(SQUAD.sniper.x + 0.01, SQUAD.top + 0.02, SQUAD.sniper.z);
        _pos.lerpVectors(r.fromPos, _a, e);
        _look.lerpVectors(r.fromLook, _b, e);
        fov = 42;
        break;
      }
      case 'scope-in': {
        // Pull back over the sniper's shoulder to watch the range pop up, then into the scope.
        const aim = liveAim();
        const eye = v(scopeEye(aim.yaw, aim.pitch));
        const eyeLook = eye.clone().add(v(aimDir(aim.yaw, aim.pitch)));
        if (r.t < 1.0) {
          const e = smooth(r.t / 1.0);
          _pos.lerpVectors(r.fromPos, shoulder, e);
          _look.lerpVectors(r.fromLook, fieldMid, e);
          fov = 45;
        } else if (r.t < 2.9) {
          _pos.copy(shoulder);
          _look.copy(fieldMid);
          fov = 45;
        } else {
          const e = smooth((r.t - 2.9) / 0.8);
          _pos.lerpVectors(shoulder, eye, e);
          _look.lerpVectors(fieldMid, eyeLook, e);
          fov = 45 + (zoomFov(sniper.zoom) - 45) * e;
          sniper.scoped = e > 0.85;
          if (e >= 1) {
            sniper.phase = 'play';
            r.t = 0;
            banner(`Round ${sniper.round}`, 'Hit 6 of 10 ducks', 2.2);
            line('start', 3.2);
            sniperSfx.round();
            emitSniper();
          }
        }
        break;
      }
      case 'play': {
        const aim = liveAim();
        _pos.copy(v(scopeEye(aim.yaw, aim.pitch)));
        _look.copy(_pos).add(v(aimDir(aim.yaw, aim.pitch)));
        fov = zoomFov(sniper.zoom);
        near = 0.004;
        sniper.scoped = true;
        break;
      }
      case 'bullet': {
        near = 0.001;
        fov = 50;
        bulletCam(dt);
        break;
      }
      case 'leaving': {
        _pos.copy(camera.position);
        lookNow(_look);
        r.leaveAt -= dt;
        sniper.scoped = false;
        if (r.leaveAt <= 0) {
          sniper.phase = 'off';
          sniper.fade = 0;
          const p = camera as THREE.PerspectiveCamera;
          if (r.saved) {
            p.near = r.saved.near;
            p.fov = r.saved.fov;
            p.updateProjectionMatrix();
          }
          if (flying()) rotorOn();
          emitSniper();
          return;
        }
        break;
      }
    }
    camera.position.copy(_pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(_look);
    // Scope zooms keep their real angle; wider shots widen on a tall phone.
    const want = sniper.phase === 'play' || fov < 20 ? fov : fitFov(fov, aspect, 1.5, 80);
    if (Math.abs(persp.fov - want) > 0.01 || persp.near !== near) {
      persp.fov = want;
      persp.near = near;
      persp.updateProjectionMatrix();
    }
  }

  function bulletCam(dt: number) {
    const r = run.current;
    const b = r.bullet;
    if (!b) return;
    b.t += dt;
    if (b.duck && !b.done) b.end.copy(v(b.duck.pos));
    _dir.subVectors(b.end, b.from);
    const dist = _dir.length();
    _dir.normalize();
    _right.crossVectors(_dir, _up).normalize();
    const along = b.t < BARREL_SHOT ? 0.012 * (b.t / BARREL_SHOT) : 0.012 + (dist - 0.012) * Math.min(1, (b.t - BARREL_SHOT) / b.travel);
    const bulletAt = _a.copy(b.from).addScaledVector(_dir, Math.min(dist, along));
    range.bullet.visible = !b.done;
    range.bullet.position.copy(bulletAt);
    range.bullet.lookAt(_b.copy(bulletAt).add(_dir));
    if (!b.done && b.t > BARREL_SHOT) {
      b.ripple -= dt;
      if (b.ripple <= 0) {
        b.ripple = 0.16;
        const rp = range.ripples.find(x => x.life <= 0);
        if (rp) {
          rp.life = 0.9;
          rp.mesh.position.copy(bulletAt);
          rp.mesh.lookAt(_b.copy(bulletAt).add(_dir));
          rp.mesh.visible = true;
        }
      }
    }
    if (!b.done && along >= dist) {
      b.done = true;
      if (b.duck) hitDuck(b.duck);
      else missedAt(b.end);
      emitSniper();
    }
    if (b.t < BARREL_SHOT) {
      // Beside the barrel: the bullet nosing out of the muzzle.
      _pos.copy(b.from).addScaledVector(_right, 0.032).addScaledVector(_up, 0.01).addScaledVector(_dir, -0.022);
      _look.copy(b.from).addScaledVector(_dir, 0.02);
    } else if (!b.done) {
      // Riding just behind it, until it's close; then hold and watch it go in.
      const stopAt = Math.max(0, dist - 0.32);
      const camAlong = Math.min(along, stopAt);
      const wobble = Math.sin(b.t * 7) * 0.003;
      _pos.copy(b.from).addScaledVector(_dir, camAlong - 0.06).addScaledVector(_up, 0.014).addScaledVector(_right, 0.012 + wobble);
      _look.copy(bulletAt).addScaledVector(_dir, along < stopAt ? 0.25 : 0.02);
    } else {
      // Impact: drift round the duck while the feathers fly.
      b.tail += dt;
      const ang = b.tail * 0.5;
      _b.copy(_dir).multiplyScalar(-0.3).applyAxisAngle(_up, ang);
      _pos.copy(b.end).add(_b).addScaledVector(_up, 0.03);
      _look.copy(b.duck ? v(b.duck.pos) : b.end);
      const tail = b.duck ? 1.2 : 0.6;
      if (b.tail > tail) {
        r.bullet = null;
        range.bullet.visible = false;
        sniper.phase = 'play';
        r.t = 0;
        outOfShells();
        emitSniper();
      }
    }
  }

  return (
    <group>
      <primitive object={range.root} />
      <primitive object={range.fx} />
    </group>
  );
}

function poseRange(range: Range, rise: number) {
  range.root.visible = rise > 0;
  if (rise <= 0) return;
  const fold = (g: THREE.Object3D, a: number, b: number) => {
    g.rotation.x = -(1 - popUp(span(rise, a, b))) * (Math.PI / 2);
  };
  fold(range.skyHinge, 0, 0.5);
  range.grassHinges.forEach((g, i) => fold(g, 0.3 + (2 - i) * 0.1, 0.7 + (2 - i) * 0.1));
  const t = popUp(span(rise, 0.5, 1));
  range.tree.scale.set(Math.max(0.001, t), Math.max(0.001, span(rise, 0.5, 1) > 0 ? t : 0.001), Math.max(0.001, t));
  range.light.intensity = 2.4 * rise;
}

const _camRight = new THREE.Vector3();

function tickDucks(range: Range, camera: THREE.Camera, clock: number) {
  const list = sniper.ducks;
  _camRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  range.ducks.forEach((slot, i) => {
    const d = list[i];
    const show = Boolean(d) && d.state !== 'gone' && sniper.rise > 0.9;
    slot.mesh.visible = show;
    if (!show || !d) return;
    const mat = slot.mats[d.kind];
    if (slot.mesh.material !== mat) slot.mesh.material = mat;
    slot.mesh.position.set(d.pos.x, d.pos.y, d.pos.z);
    slot.mesh.quaternion.copy(camera.quaternion);
    let frame: number;
    if (d.state === 'hit') frame = 3;
    else if (d.state === 'fall') frame = 4;
    else {
      const beat = Math.floor((clock + d.id * 0.37) * (d.state === 'away' ? 16 : 11)) % 4;
      frame = beat === 3 ? 1 : beat;
    }
    mat.map!.offset.x = frame / DUCK_FRAMES;
    const screenVx = d.vel.x * _camRight.x + d.vel.z * _camRight.z;
    const flip = d.state === 'fall' ? (Math.floor(clock * 6) % 2 ? -1 : 1) : screenVx < 0 ? -1 : 1;
    slot.mesh.scale.set(flip, 1, 1);
    mat.opacity = d.state === 'away' ? Math.max(0, Math.min(1, (FIELD.skyH + 0.45 - d.pos.y) / 0.3)) : 1;
    mat.alphaTest = d.state === 'away' ? 0.01 : 0.5;
  });
}

function burstFeathers(range: Range, at: V3, kind: DuckKind) {
  const tint = kind === 'mallard' ? '#3b3b3b' : kind === 'blue' ? '#4d74c9' : '#b2482c';
  range.feathers.forEach((f, i) => {
    f.life = 1.2 + Math.random() * 0.8;
    f.mesh.position.set(at.x, at.y, at.z);
    f.vel.set((Math.random() - 0.5) * 0.7, Math.random() * 0.5, (Math.random() - 0.5) * 0.7);
    f.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
    if (i % 3 === 0) (f.mesh.material as THREE.MeshBasicMaterial).color.set(tint);
    f.mesh.visible = true;
  });
}
