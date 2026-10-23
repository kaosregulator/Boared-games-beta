import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SECRET_PASSAGES, SUSPECTS, corridorPath, type RoomName, type Suspect } from '../../games/clue/clueData';
import { PASSAGE_CORNER, TILE, doorway, rectOf, roomPoint, roomSpots, tilePos } from './clueBoard';

/**
 * The six suspects as little people, about 4 cm tall, built in code so each
 * looks like their card: Miss Scarlett's red dress and black bob, Colonel
 * Mustard's yellow tunic and moustache, Mrs. White's apron and cap, Mr.
 * Green's green suit and white collar, Mrs. Peacock's blue gown and feather,
 * Professor Plum's purple suit, glasses and bow tie. Legs and arms are on
 * pivots, so they walk with a real stride; no rig needed.
 *
 * A figure walks the actual corridor route tile by tile and through the
 * doorway into a room, drops through the trapdoor for a secret passage, and
 * when it's just standing about in a room it wanders a little and turns to
 * face whoever else is in there, like a Sims NPC.
 */

export const FIGURE_H = 0.04;

export interface Spot {
  at: [number, number];
  room: RoomName | null;
}

interface Look {
  female: boolean;
  outfit: string;
  legs: string;
  hair: string;
  style: 'bob' | 'updo' | 'bun' | 'short' | 'sides';
  skin: string;
}

const LOOKS: Record<Suspect, Look> = {
  Scarlett: { female: true, outfit: '#c8102e', legs: '#e9c4a4', hair: '#16110f', style: 'bob', skin: '#f1cfb0' },
  Mustard: { female: false, outfit: '#d9a21b', legs: '#6b5a3a', hair: '#d4cfc4', style: 'short', skin: '#e8b996' },
  White: { female: true, outfit: '#24242a', legs: '#e9d8c4', hair: '#efede6', style: 'bun', skin: '#f3d9c2' },
  Green: { female: false, outfit: '#2e7d4a', legs: '#1e3a28', hair: '#4a3020', style: 'short', skin: '#e9c09c' },
  Peacock: { female: true, outfit: '#1f5fb4', legs: '#e9c4a4', hair: '#5a3418', style: 'updo', skin: '#f1cfb0' },
  Plum: { female: false, outfit: '#6b3fa0', legs: '#3a2550', hair: '#9a9a9a', style: 'sides', skin: '#efc8a6' },
};

export const SUSPECT_COLOUR = Object.fromEntries(SUSPECTS.map(s => [s.id, s.colour])) as Record<Suspect, string>;

interface Rig {
  root: THREE.Group;
  body: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  head: THREE.Group;
  bob: THREE.Mesh;
}

function m(color: string, roughness = 0.62, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, ...extra });
}

function add(parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

/** One suspect, in units of their height (1 = 4 cm on the board). */
export function buildFigure(id: Suspect): Rig {
  const L = LOOKS[id];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const skin = m(L.skin, 0.55);
  const outfit = m(L.outfit, 0.58);
  const legMat = m(L.legs, 0.6);
  const shoe = m('#151210', 0.4);
  const hair = m(L.hair, 0.7);
  const white = m('#f6f2ea', 0.5);
  const gold = m('#d4a94a', 0.3, { metalness: 0.7 });

  // a round base in the suspect's colour, like the real pawns, so you can
  // tell who's who from straight above
  add(root, new THREE.CylinderGeometry(0.15, 0.16, 0.025, 24), m(SUSPECT_COLOUR[id], 0.35), 0, 0.0125, 0);

  const legs = (side: number) => {
    const g = new THREE.Group();
    g.position.set(0.065 * side, 0.45, 0);
    add(g, new THREE.CylinderGeometry(L.female ? 0.038 : 0.058, L.female ? 0.03 : 0.052, 0.38, 10), legMat, 0, -0.2, 0);
    add(g, new THREE.BoxGeometry(0.085, 0.05, 0.15), shoe, 0, -0.4, 0.025);
    body.add(g);
    return g;
  };
  const legL = legs(-1);
  const legR = legs(1);

  if (L.female) {
    // gown: a flared skirt and a fitted bodice
    add(body, new THREE.CylinderGeometry(0.105, 0.2, 0.36, 20), outfit, 0, 0.36, 0);
    add(body, new THREE.CylinderGeometry(0.115, 0.1, 0.22, 16), outfit, 0, 0.62, 0);
    if (id === 'White') {
      add(body, new THREE.BoxGeometry(0.2, 0.36, 0.02), white, 0, 0.4, 0.15).rotation.x = -0.22;
      add(body, new THREE.BoxGeometry(0.14, 0.12, 0.02), white, 0, 0.64, 0.105);
    }
  } else {
    // suit or tunic: trousers show below a jacket
    add(body, new THREE.CylinderGeometry(0.14, 0.135, 0.36, 16), outfit, 0, 0.56, 0);
    add(body, new THREE.CylinderGeometry(0.142, 0.142, 0.03, 16), m(id === 'Mustard' ? '#5a3a1a' : '#1a1410', 0.5), 0, 0.46, 0);
    if (id === 'Mustard') {
      add(body, new THREE.BoxGeometry(0.08, 0.025, 0.12), gold, -0.14, 0.73, 0);
      add(body, new THREE.BoxGeometry(0.08, 0.025, 0.12), gold, 0.14, 0.73, 0);
      for (let i = 0; i < 3; i += 1) add(body, new THREE.SphereGeometry(0.013, 6, 4), gold, 0, 0.66 - i * 0.07, 0.138);
    } else {
      // shirt front and tie or bow
      add(body, new THREE.BoxGeometry(0.07, 0.14, 0.02), white, 0, 0.67, 0.128);
      if (id === 'Plum') {
        const bow = m('#d4a94a', 0.5);
        add(body, new THREE.ConeGeometry(0.03, 0.05, 8), bow, -0.025, 0.73, 0.14).rotation.z = Math.PI / 2;
        add(body, new THREE.ConeGeometry(0.03, 0.05, 8), bow, 0.025, 0.73, 0.14).rotation.z = -Math.PI / 2;
      } else {
        add(body, new THREE.BoxGeometry(0.03, 0.12, 0.012), m('#1e2a22', 0.5), 0, 0.66, 0.14);
      }
    }
  }

  const arms = (side: number) => {
    const g = new THREE.Group();
    g.position.set(0.15 * side, 0.71, 0);
    const sleeve = L.female && id !== 'White' ? skin : outfit;
    add(g, new THREE.SphereGeometry(0.045, 8, 6), outfit, 0, 0, 0);
    add(g, new THREE.CylinderGeometry(0.036, 0.032, 0.27, 8), sleeve, 0, -0.15, 0);
    add(g, new THREE.SphereGeometry(0.04, 8, 6), skin, 0, -0.3, 0);
    g.rotation.z = 0.08 * side;
    body.add(g);
    return g;
  };
  const armL = arms(-1);
  const armR = arms(1);

  add(body, new THREE.CylinderGeometry(0.04, 0.045, 0.06, 8), skin, 0, 0.76, 0);
  if (id === 'Green') add(body, new THREE.TorusGeometry(0.048, 0.014, 6, 14), white, 0, 0.765, 0).rotation.x = Math.PI / 2;
  if (id === 'Peacock' || id === 'Scarlett') {
    add(body, new THREE.TorusGeometry(0.06, 0.009, 6, 18), white, 0, 0.745, 0.01).rotation.x = Math.PI / 2 - 0.25;
  }

  // a big friendly head, mini-Sims style
  const head = new THREE.Group();
  head.position.set(0, 0.89, 0);
  body.add(head);
  add(head, new THREE.SphereGeometry(0.135, 18, 14), skin);
  const eye = m('#1a1210', 0.3);
  add(head, new THREE.SphereGeometry(0.017, 6, 5), eye, -0.048, 0.012, 0.122);
  add(head, new THREE.SphereGeometry(0.017, 6, 5), eye, 0.048, 0.012, 0.122);
  add(head, new THREE.SphereGeometry(0.018, 6, 5), skin, 0, -0.022, 0.134);
  if (L.female) add(head, new THREE.BoxGeometry(0.045, 0.012, 0.01), m('#b0182a', 0.4), 0, -0.065, 0.124);

  // hair: a cap tipped back off the face, plus each one's style
  const cap = add(head, new THREE.SphereGeometry(0.143, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.008, -0.01);
  cap.rotation.x = -0.42;
  if (L.style === 'bob') {
    add(head, new THREE.CylinderGeometry(0.148, 0.155, 0.13, 18, 1, true, Math.PI * 0.62, Math.PI * 1.76), hair, 0, -0.02, -0.005);
  } else if (L.style === 'updo') {
    add(head, new THREE.SphereGeometry(0.075, 10, 8), hair, 0, 0.13, -0.05);
    const feather = add(head, new THREE.ConeGeometry(0.022, 0.2, 6), m('#1a8a8a', 0.5), 0.09, 0.2, -0.04);
    feather.rotation.z = -0.5;
    add(head, new THREE.SphereGeometry(0.022, 6, 5), m('#2a4fd4', 0.4), 0.135, 0.28, -0.04);
  } else if (L.style === 'bun') {
    add(head, new THREE.SphereGeometry(0.06, 10, 8), hair, 0, 0.06, -0.13);
    add(head, new THREE.CylinderGeometry(0.1, 0.11, 0.035, 14), white, 0, 0.13, -0.01).rotation.x = -0.3;
  } else if (L.style === 'sides') {
    add(head, new THREE.SphereGeometry(0.05, 8, 6), hair, -0.12, 0.0, -0.03);
    add(head, new THREE.SphereGeometry(0.05, 8, 6), hair, 0.12, 0.0, -0.03);
    cap.material = skin;
  }
  if (id === 'Mustard') add(head, new THREE.BoxGeometry(0.1, 0.026, 0.03), hair, 0, -0.045, 0.125);
  if (id === 'Plum') {
    const frame = m('#1a1210', 0.3);
    add(head, new THREE.TorusGeometry(0.033, 0.007, 6, 14), frame, -0.048, 0.012, 0.132);
    add(head, new THREE.TorusGeometry(0.033, 0.007, 6, 14), frame, 0.048, 0.012, 0.132);
    add(head, new THREE.BoxGeometry(0.03, 0.007, 0.007), frame, 0, 0.018, 0.134);
  }

  // the Sims-style diamond over whoever's turn it is
  const bob = add(root, new THREE.OctahedronGeometry(0.06, 0), m('#3fe05a', 0.3, { emissive: '#1f8a2a', emissiveIntensity: 0.9 }), 0, 1.25, 0) as THREE.Mesh;
  bob.scale.set(0.8, 1.5, 0.8);
  bob.visible = false;

  root.scale.setScalar(FIGURE_H);
  return { root, body, legL, legR, armL, armR, head, bob };
}

/* -------------------------------- routes --------------------------------- */

interface Waypoint {
  p: THREE.Vector3;
  /** Drop through the trapdoor and come up here. */
  warp?: boolean;
}

/** Which floor spots in each room are taken, so two people never stand in one. */
const claimed = new Map<RoomName, Map<Suspect, number>>();
/** Where everyone is right now, so idlers can turn to each other. */
export const FIGURES = new Map<Suspect, { pos: THREE.Vector3; room: RoomName | null }>();

function claim(room: RoomName, who: Suspect, prefer: number) {
  const spots = roomSpots(room);
  let taken = claimed.get(room);
  if (!taken) {
    taken = new Map();
    claimed.set(room, taken);
  }
  taken.delete(who);
  const used = new Set(taken.values());
  let pick = prefer % spots.length;
  for (let i = 0; i < spots.length && used.has(pick); i += 1) pick = (prefer + i + 1) % spots.length;
  taken.set(who, pick);
  return pick;
}

function release(room: RoomName | null, who: Suspect) {
  if (room) claimed.get(room)?.delete(who);
}

function spotPos(room: RoomName, i: number) {
  const [u, v] = roomSpots(room)[i];
  return roomPoint(rectOf(room), u, v);
}

function cornerPos(room: RoomName) {
  const c = PASSAGE_CORNER[room]!;
  return roomPoint(rectOf(room), c[0], c[1]);
}

function route(from: Spot, to: Spot, who: Suspect, slot: number): Waypoint[] {
  if (from.room && to.room && from.room === to.room) return [];
  if (from.room && to.room && SECRET_PASSAGES[from.room] === to.room) {
    release(from.room, who);
    const i = claim(to.room, who, slot);
    return [{ p: cornerPos(from.room) }, { p: cornerPos(to.room), warp: true }, { p: spotPos(to.room, i) }];
  }
  const out: Waypoint[] = [];
  let start = from.at;
  if (from.room) {
    const d = doorway(from.room);
    release(from.room, who);
    out.push({ p: tilePos(d.inside[0], d.inside[1]) });
    start = d.door;
  }
  const end = to.room ? doorway(to.room).door : to.at;
  const tiles = corridorPath(start, end) ?? [start, end];
  tiles.forEach(([x, y], k) => {
    if (k === 0 && !from.room) return;
    out.push({ p: tilePos(x, y) });
  });
  if (to.room) {
    const d = doorway(to.room);
    out.push({ p: tilePos(d.inside[0], d.inside[1]) });
    out.push({ p: spotPos(to.room, claim(to.room, who, slot)) });
  }
  return out;
}

function placeOf(spot: Spot, who: Suspect, slot: number) {
  if (spot.room) return spotPos(spot.room, claim(spot.room, who, slot));
  return tilePos(spot.at[0], spot.at[1]);
}

/* -------------------------------- figure --------------------------------- */

export interface FigureProps {
  id: Suspect;
  spot: Spot;
  /** Preferred floor spot in a room. */
  slot: number;
  active: boolean;
  /** Hurried: called into a room by a suggestion. */
  fast?: boolean;
  /** Where the figure is right now, for the camera. */
  live?: THREE.Vector3;
  /** A walk begins, `stops` waypoints long. */
  onStart?: (stops: number) => void;
  onArrive?: () => void;
  onStep?: () => void;
  onClick?: () => void;
  /** Bigger and bouncing: picked in the suspect chooser. */
  chosen?: boolean;
}

export function ClueFigure({ id, spot, slot, active, fast, live, onStart, onArrive, onStep, onClick, chosen }: FigureProps) {
  const rig = useMemo(() => buildFigure(id), [id]);
  const pos = useRef<THREE.Vector3 | null>(null);
  const was = useRef<Spot | null>(null);
  const queue = useRef<Waypoint[]>([]);
  const travelling = useRef(false);
  const heading = useRef(0);
  const phase = useRef(0);
  const stride = useRef(0);
  const warp = useRef<{ k: number; to: THREE.Vector3 } | null>(null);
  const idleFor = useRef(2 + Math.random() * 5);
  const wandering = useRef(false);
  const lastTile = useRef(0);
  const cb = useRef({ onStart, onArrive, onStep });
  cb.current = { onStart, onArrive, onStep };

  useEffect(() => {
    rig.root.traverse(o => {
      o.userData.suspect = id;
    });
    return () => {
      FIGURES.delete(id);
      release(was.current?.room ?? null, id);
    };
  }, [rig, id]);

  // A new place in the game: work out the walk there.
  const key = `${spot.room ?? ''}|${spot.at[0]},${spot.at[1]}`;
  useEffect(() => {
    if (!pos.current || !was.current) {
      pos.current = placeOf(spot, id, slot);
      was.current = spot;
      return;
    }
    const path = route(was.current, spot, id, slot);
    was.current = spot;
    if (path.length === 0) return;
    queue.current = path;
    wandering.current = false;
    travelling.current = true;
    cb.current.onStart?.(path.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useFrame(({ clock }, dtRaw) => {
    const p = pos.current;
    if (!p) return;
    const dt = Math.min(dtRaw, 0.1);
    const t = clock.elapsedTime;
    const g = rig.root;
    let moving = false;

    if (warp.current) {
      // down through the trapdoor, along the passage, up the other end
      const w = warp.current;
      w.k += dt / 0.9;
      if (w.k >= 0.5 && p.distanceToSquared(w.to) > 1e-8) p.copy(w.to);
      const depth = Math.sin(Math.PI * Math.min(1, w.k)) * FIGURE_H * 1.25;
      g.position.set(p.x, p.y - depth, p.z);
      if (w.k >= 1) warp.current = null;
    } else if (queue.current.length > 0) {
      const next = queue.current[0];
      if (next.warp) {
        warp.current = { k: 0, to: next.p.clone() };
        queue.current.shift();
      } else {
        const speed = wandering.current ? TILE / 0.6 : TILE / (fast ? 0.12 : 0.21);
        const dx = next.p.x - p.x;
        const dz = next.p.z - p.z;
        const dist = Math.hypot(dx, dz);
        const stepLen = speed * dt;
        if (dist <= stepLen) {
          p.copy(next.p);
          queue.current.shift();
          if (!wandering.current && t - lastTile.current > 0.08) {
            lastTile.current = t;
            cb.current.onStep?.();
          }
        } else {
          p.x += (dx / dist) * stepLen;
          p.z += (dz / dist) * stepLen;
        }
        if (dist > 1e-5) {
          const want = Math.atan2(dx, dz);
          let d = want - heading.current;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          heading.current += d * Math.min(1, dt * 12);
        }
        phase.current += stepLen / 0.0065;
        moving = true;
      }
      g.position.copy(p);
    } else {
      g.position.copy(p);
      if (travelling.current) {
        travelling.current = false;
        cb.current.onArrive?.();
      }
      wandering.current = false;
      // idle: now and then stroll to another spot in the room
      const room = was.current?.room;
      if (room) {
        idleFor.current -= dt;
        if (idleFor.current <= 0) {
          idleFor.current = 4 + Math.random() * 7;
          const spots = roomSpots(room);
          const here = claimed.get(room)?.get(id) ?? 0;
          const [hu, hv] = spots[here];
          const near = spots.map((s, i) => ({ i, d: Math.hypot(s[0] - hu, s[1] - hv) })).filter(s => s.d > 0.3 && s.d < 1.3);
          if (near.length > 0 && !active) {
            const pick = near[Math.floor(Math.random() * near.length)].i;
            const used = new Set(claimed.get(room)?.values() ?? []);
            if (!used.has(pick)) {
              claim(room, id, pick);
              queue.current = [{ p: spotPos(room, pick) }];
              wandering.current = true;
            }
          }
        }
        // turn to face the nearest person in the same room
        let best: THREE.Vector3 | null = null;
        let bestD = Infinity;
        FIGURES.forEach((o, who) => {
          if (who === id || o.room !== room) return;
          const d = o.pos.distanceToSquared(p);
          if (d < bestD) {
            bestD = d;
            best = o.pos;
          }
        });
        if (best) {
          const b = best as THREE.Vector3;
          const want = Math.atan2(b.x - p.x, b.z - p.z);
          let d = want - heading.current;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          heading.current += d * Math.min(1, dt * 2.5);
        }
      } else {
        // in the corridor: face into the board, or out at you when picked
        const want = chosen ? 0 : Math.atan2(-p.x, -p.z);
        let d = want - heading.current;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        heading.current += d * Math.min(1, dt * 2);
      }
    }

    // stride and arm swing, eased in and out
    stride.current += ((moving ? 1 : 0) - stride.current) * Math.min(1, dt * 10);
    const s = stride.current;
    const swing = Math.sin(phase.current);
    rig.legL.rotation.x = swing * 0.6 * s;
    rig.legR.rotation.x = -swing * 0.6 * s;
    rig.armL.rotation.x = -swing * 0.5 * s + Math.sin(t * 1.3 + slot) * 0.04 * (1 - s);
    rig.armR.rotation.x = swing * 0.5 * s - Math.sin(t * 1.3 + slot) * 0.04 * (1 - s);
    rig.body.position.y = Math.abs(Math.cos(phase.current)) * 0.03 * s + Math.sin(t * 2 + slot) * 0.004 * (1 - s);
    rig.head.rotation.y = (1 - s) * Math.sin(t * 0.4 + slot * 1.7) * 0.35;
    g.rotation.y = heading.current;

    const lift = chosen ? 0.006 + Math.abs(Math.sin(t * 3)) * 0.004 : 0;
    g.position.y += lift;
    const scale = FIGURE_H * (chosen ? 1.25 : 1);
    g.scale.setScalar(g.scale.x + (scale - g.scale.x) * Math.min(1, dt * 8));

    rig.bob.visible = active;
    if (active) {
      rig.bob.rotation.y = t * 2;
      rig.bob.position.y = 1.25 + Math.sin(t * 2.4) * 0.05;
    }

    FIGURES.set(id, { pos: p, room: was.current?.room ?? null });
    live?.set(g.position.x, g.position.y + FIGURE_H * 0.5, g.position.z);
  });

  return (
    <primitive
      object={rig.root}
      onClick={
        onClick
          ? (e: { stopPropagation: () => void }) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    />
  );
}
