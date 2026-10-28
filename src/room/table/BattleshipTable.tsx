import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useFBX, useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { pushHud } from './tableHud';
import { followAction, setTableView, wasDrag, type Shot } from './tableCam';
import {
  FLEET,
  SIZE,
  aiPick,
  canPlace,
  cells,
  key,
  randomFleet,
  ringAround,
  shipAt,
  sunk,
  type Ship,
  type Shots,
} from './battleshipFleet';
import { MARKER_H, MARKER_KINDS, MARKER_W, drawMarker, markerCanvas, markersFor, onMarkerArt, type MarkerKind } from './battleshipMarkers';

/**
 * Battleship live on the card table, built from Arrq54's
 * threejs-3d-game-battleships: their ships, island, water, field textures,
 * and sounds. Your ocean is the left half of the opened case, theirs the right.
 */

const A = '/games/battleship/';
const CELL = 0.038;
const SEA_Y = 0.0075;
/** Centres of the two oceans on the table (the opened case halves). */
const MINE = new THREE.Vector3(-0.22, 0, 0);
const THEIRS = new THREE.Vector3(0.22, 0, 0);

/**
 * Camera views. Placing: a three-quarter look down onto your own ocean, close
 * enough to set each hull, never flat overhead. Battle: from behind your
 * fleet, looking across both oceans to their waters.
 */
const PLACE_VIEW: Shot = { target: [MINE.x, 0, MINE.z + 0.01], yaw: -0.22, pitch: 0.95, dist: 0.5 };
const BATTLE_VIEW: Shot = { target: [0.06, 0, 0], yaw: -0.38, pitch: 0.8, dist: 0.66 };
const OVER_VIEW: Shot = { target: [0, 0, -0.02], yaw: 0, pitch: 1.0, dist: 0.8 };

const cellPos = (ocean: THREE.Vector3, x: number, y: number) =>
  new THREE.Vector3(ocean.x + (x - (SIZE - 1) / 2) * CELL, SEA_Y, ocean.z + (y - (SIZE - 1) / 2) * CELL);

function play(name: string, volume = 0.6) {
  const a = new Audio(`${A}sound/${name}.mp3`);
  a.volume = volume;
  void a.play().catch(() => {});
}

/** One model per hull size, as in the original Ship class. */
function useHulls() {
  const raft = useGLTF(`${A}raft.glb`).scene;
  const pirate = useGLTF(`${A}pirate.glb`).scene;
  const small = useFBX(`${A}smallShip.fbx`);
  const large = useFBX(`${A}largeShip2.fbx`);
  return useMemo(() => {
    const fit = (src: THREE.Object3D, size: number) => {
      const root = src.clone(true);
      // Own materials per hull, so a ghost or a sinking ship never tints the others.
      root.traverse(o => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.material = Array.isArray(m.material) ? m.material.map(mat => mat.clone()) : m.material.clone();
      });
      const box = new THREE.Box3().setFromObject(root);
      const dims = box.getSize(new THREE.Vector3());
      const alongZ = dims.z > dims.x;
      const length = alongZ ? dims.z : dims.x;
      const s = (size * CELL * 0.92) / length;
      const holder = new THREE.Group();
      const centre = box.getCenter(new THREE.Vector3());
      root.position.set(-centre.x, -box.min.y, -centre.z);
      const inner = new THREE.Group();
      inner.add(root);
      // Lay every hull bow-along +X so placement only has to rotate by 0 or 90 degrees.
      inner.rotation.y = alongZ ? Math.PI / 2 : 0;
      inner.scale.setScalar(s);
      holder.add(inner);
      return holder;
    };
    return {
      1: () => fit(raft, 1),
      2: () => fit(small, 2),
      3: () => fit(large, 3),
      4: () => fit(pirate, 4),
    } as Record<number, () => THREE.Group>;
  }, [large, pirate, raft, small]);
}

function Hull({
  ship,
  ocean,
  make,
  visible,
  ghost = false,
  bad = false,
}: {
  ship: Ship;
  ocean: THREE.Vector3;
  make: Record<number, () => THREE.Group>;
  visible: boolean;
  ghost?: boolean;
  bad?: boolean;
}) {
  const obj = useMemo(() => make[ship.size](), [make, ship.size]);
  const g = useRef<THREE.Group>(null);
  const sinkStart = useRef<number | null>(null);
  const isSunk = sunk(ship);
  useEffect(() => {
    obj.traverse(o => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[];
      mats.forEach(mat => {
        mat.transparent = ghost;
        mat.opacity = ghost ? 0.55 : 1;
        if (mat.emissive) mat.emissive.set(ghost ? (bad ? '#ff2020' : '#2060ff') : '#000000');
      });
    });
  }, [obj, ghost, bad]);
  const first = cellPos(ocean, ship.x, ship.y);
  const last = cellPos(ocean, ship.horizontal ? ship.x + ship.size - 1 : ship.x, ship.horizontal ? ship.y : ship.y + ship.size - 1);
  const mid = first.clone().add(last).multiplyScalar(0.5);
  useFrame(({ clock }) => {
    const n = g.current;
    if (!n) return;
    const t = clock.elapsedTime + ship.id;
    n.position.set(mid.x, mid.y + Math.sin(t * 1.6) * 0.0012, mid.z);
    n.rotation.set(Math.sin(t * 1.3) * 0.03, ship.horizontal ? 0 : -Math.PI / 2, Math.sin(t * 1.1) * 0.02);
    if (isSunk && !ghost) {
      // their sink: roll over, then slip under
      if (sinkStart.current === null) sinkStart.current = clock.elapsedTime;
      const k = Math.min(1, (clock.elapsedTime - sinkStart.current) / 3);
      n.rotation.x = k * Math.PI * 0.55;
      n.position.y = mid.y - Math.max(0, k - 0.55) * 0.06;
      n.visible = k < 1 || visible;
    }
  });
  return <group ref={g} visible={visible}><primitive object={obj} /></group>;
}

function Ocean({
  center,
  label,
  onCell,
  onHover,
  hover,
  aim,
}: {
  center: THREE.Vector3;
  label: string;
  onCell: (x: number, y: number) => void;
  onHover: (c: { x: number; y: number } | null) => void;
  hover: { x: number; y: number } | null;
  aim: boolean;
}) {
  const [grid, hoverTex, aimTex, water] = useTexture([`${A}fieldToChose.png`, `${A}hoverField.png`, `${A}aim.png`, `${A}water.jpg`]);
  const gridTex = useMemo(() => {
    const t = grid.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(SIZE, SIZE);
    t.needsUpdate = true;
    return t;
  }, [grid]);
  const flow = useMemo(() => {
    const t = water.clone();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.5, 1.5);
    t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  }, [water]);
  const labelTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const g = c.getContext('2d')!;
    g.fillStyle = '#e8f6ff';
    g.font = '800 40px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.fillText(label, 256, 46);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [label]);
  useFrame((_, dt) => {
    flow.offset.x += dt * 0.012;
    flow.offset.y += dt * 0.007;
  });
  const span = CELL * SIZE;
  const pick = (p: THREE.Vector3, parent: THREE.Object3D | null) => {
    const local = parent ? parent.worldToLocal(p.clone()) : p;
    const x = Math.floor((local.x - center.x + span / 2) / CELL);
    const y = Math.floor((local.z - center.z + span / 2) / CELL);
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE ? { x, y } : null;
  };
  return (
    <group>
      {/* moving water over the printed sea */}
      <mesh position={[center.x, SEA_Y - 0.0006, center.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[span, span]} />
        <meshStandardMaterial map={flow} color="#8fd0ff" transparent opacity={0.7} roughness={0.15} metalness={0.1} />
      </mesh>
      <mesh
        position={[center.x, SEA_Y, center.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerMove={e => {
          e.stopPropagation();
          onHover(pick(e.point, e.eventObject.parent ?? null));
        }}
        onPointerOut={() => onHover(null)}
        onClick={e => {
          e.stopPropagation();
          if (wasDrag() || e.delta > 8) return;
          const c = pick(e.point, e.eventObject.parent ?? null);
          if (c) onCell(c.x, c.y);
        }}
      >
        <planeGeometry args={[span, span]} />
        <meshBasicMaterial map={gridTex} transparent opacity={0.32} depthWrite={false} />
      </mesh>
      {hover && (
        <mesh position={cellPos(center, hover.x, hover.y).add(new THREE.Vector3(0, 0.0008, 0))} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[CELL, CELL]} />
          <meshBasicMaterial map={aim ? aimTex : hoverTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      <mesh position={[center.x, SEA_Y, center.z + span / 2 + 0.018]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.2, 0.025]} />
        <meshBasicMaterial map={labelTex} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}

interface Flight {
  id: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  start: number;
  /** Where the ball is now, for the camera to follow. */
  pos: THREE.Vector3;
  done: () => void;
}

/** One shared texture per marker kind, redrawn when the original's burst and skull load. */
function useMarkerTextures() {
  const tex = useMemo(() => {
    const out = {} as Record<MarkerKind, THREE.CanvasTexture>;
    for (const kind of MARKER_KINDS) {
      const t = new THREE.CanvasTexture(markerCanvas(kind));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      out[kind] = t;
    }
    return out;
  }, []);
  useEffect(() => {
    const redraw = () => {
      for (const kind of MARKER_KINDS) {
        drawMarker((tex[kind].image as HTMLCanvasElement).getContext('2d')!, kind);
        tex[kind].needsUpdate = true;
      }
    };
    redraw();
    return onMarkerArt(redraw);
  }, [tex]);
  useEffect(() => () => MARKER_KINDS.forEach(k => tex[k].dispose()), [tex]);
  return tex;
}

/** Peg height on the sea, about one cell: a peg stood in the hole. */
const PEG_H = CELL * 1.05;
const PEG_W = (PEG_H * MARKER_W) / MARKER_H;

/**
 * Pegs stood upright in the shot cells. Each is a billboard (it always faces
 * the camera, so a low look across the water still shows the whole peg) and
 * unlit, so the room's lamps never wash out a white miss or darken a red hit.
 * Hits and sinks sit in a hull, so they draw over it rather than vanish inside.
 */
function Markers({
  shots,
  ocean,
  fleet,
  tex,
}: {
  shots: Shots;
  ocean: THREE.Vector3;
  fleet: Ship[];
  tex: Record<MarkerKind, THREE.CanvasTexture>;
}) {
  return (
    <group>
      {markersFor(shots, fleet).map(m => {
        const p = cellPos(ocean, m.x, m.y);
        const inHull = m.kind !== 'miss';
        return (
          <sprite key={m.key} position={[p.x, p.y + 0.001, p.z]} center={[0.5, 0.04]} scale={[PEG_W, PEG_H, 1]} renderOrder={inHull ? 12 : 11}>
            <spriteMaterial map={tex[m.kind]} transparent alphaTest={0.08} depthWrite={false} depthTest={!inHull} toneMapped={false} />
          </sprite>
        );
      })}
    </group>
  );
}

function Cannonball({ flight }: { flight: Flight }) {
  const m = useRef<THREE.Mesh>(null);
  const fired = useRef(false);
  useFrame(({ clock }) => {
    const k = Math.min(1, (clock.elapsedTime - flight.start) / 0.85);
    if (m.current) {
      const p = flight.from.clone().lerp(flight.to, k);
      p.y += Math.sin(Math.PI * k) * 0.22;
      m.current.position.copy(p);
      flight.pos.copy(p);
    }
    if (k >= 1 && !fired.current) {
      fired.current = true;
      flight.done();
    }
  });
  return (
    <mesh ref={m}>
      <sphereGeometry args={[0.006, 10, 10]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
    </mesh>
  );
}

function Island() {
  const { scene } = useGLTF(`${A}island.glb`);
  const obj = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const dims = box.getSize(new THREE.Vector3());
    const s = 0.12 / Math.max(dims.x, dims.z);
    const c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z);
    const g = new THREE.Group();
    g.add(root);
    g.scale.setScalar(s);
    return g;
  }, [scene]);
  // Off the far edge between the two oceans, the way their scene floats it.
  return <primitive object={obj} position={[0, 0.006, -0.3]} />;
}

type Phase = 'place' | 'battle' | 'over';

export function BattleshipTable({ onLeave }: { onLeave: () => void }) {
  const make = useHulls();
  const markerTex = useMarkerTextures();
  const [mine, setMine] = useState<Ship[]>([]);
  const [theirs, setTheirs] = useState<Ship[]>(() => randomFleet());
  const [myShots, setMyShots] = useState<Shots>({});
  const [theirShots, setTheirShots] = useState<Shots>({});
  const [phase, setPhase] = useState<Phase>('place');
  const [turn, setTurn] = useState<'me' | 'them'>('me');
  const [horizontal, setHorizontal] = useState(true);
  const [hoverMine, setHoverMine] = useState<{ x: number; y: number } | null>(null);
  const [hoverTheirs, setHoverTheirs] = useState<{ x: number; y: number } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [news, setNews] = useState('Place your four-decker. R rotates.');
  const flightId = useRef(0);
  const clockRef = useRef(0);

  const nextSize = FLEET[mine.length];
  const winner = theirs.length && theirs.every(sunk) ? 'me' : mine.length === FLEET.length && mine.every(sunk) ? 'them' : null;

  useFrame(({ clock }) => {
    clockRef.current = clock.elapsedTime;
  });

  useEffect(() => {
    if (phase !== 'place') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') setHorizontal(h => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const fire = (
    target: 'theirs' | 'mine',
    x: number,
    y: number,
    after: (hit: boolean, sank: Ship | null) => void,
  ) => {
    const ocean = target === 'theirs' ? THEIRS : MINE;
    const fromOcean = target === 'theirs' ? MINE : THEIRS;
    play('canonFire', 0.5);
    flightId.current += 1;
    const id = flightId.current;
    const from = new THREE.Vector3(fromOcean.x, 0.03, fromOcean.z);
    const to = cellPos(ocean, x, y);
    const pos = from.clone();
    // Follow the ball across from the side, low, then hang over the splash.
    followAction({ target: [0, 0.08, 0], yaw: target === 'theirs' ? 0.12 : -0.12, pitch: 0.32, dist: 0.5 }, 900, () => pos);
    setFlights(f => [
      ...f,
      {
        id,
        from,
        to,
        start: clockRef.current,
        pos,
        done: () => {
          followAction({ target: [to.x, 0, to.z], yaw: target === 'theirs' ? 0.35 : -0.35, pitch: 0.78, dist: 0.27 }, 1400);
          setFlights(cur => cur.filter(fl => fl.id !== id));
          const fleet = target === 'theirs' ? theirs : mine;
          const ship = shipAt(fleet, x, y);
          const setShots = target === 'theirs' ? setMyShots : setTheirShots;
          if (!ship) {
            play('hitWater', 0.55);
            setShots(s => ({ ...s, [key(x, y)]: 'miss' }));
            after(false, null);
            return;
          }
          play('hitShip', 0.6);
          const updated = fleet.map(s => (s.id === ship.id ? { ...s, hits: s.hits + 1 } : s));
          const hitShip = updated.find(s => s.id === ship.id)!;
          (target === 'theirs' ? setTheirs : setMine)(updated);
          setShots(s => {
            const next: Shots = { ...s, [key(x, y)]: 'hit' };
            if (sunk(hitShip)) for (const c of ringAround(hitShip)) if (!next[key(c.x, c.y)]) next[key(c.x, c.y)] = 'miss';
            return next;
          });
          if (sunk(hitShip)) {
            play('splash', 0.5);
            window.setTimeout(() => play('sinking', 0.5), 1200);
          }
          after(true, sunk(hitShip) ? hitShip : null);
        },
      },
    ]);
  };

  // Their turn: hunt and target, shooting again on every hit.
  useEffect(() => {
    if (phase !== 'battle' || turn !== 'them' || winner) return;
    const t = window.setTimeout(() => {
      const { x, y } = aiPick(theirShots, mine);
      fire('mine', x, y, (hit, sank) => {
        setNews(hit ? (sank ? `They sank your ${sank.size}-decker!` : 'They hit you — and fire again.') : 'They missed. Your shot.');
        window.setTimeout(() => setTurn(hit ? 'them' : 'me'), hit ? 300 : 500);
      });
    }, 900);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn, theirShots, winner]);

  useEffect(() => {
    if (winner && phase !== 'over') setPhase('over');
  }, [phase, winner]);

  useEffect(() => {
    setTableView(phase === 'place' ? PLACE_VIEW : phase === 'battle' ? BATTLE_VIEW : OVER_VIEW);
  }, [phase]);

  const clickMine = (x: number, y: number) => {
    if (phase !== 'place' || nextSize === undefined) return;
    if (!canPlace(mine, nextSize, x, y, horizontal)) return;
    play('splash', 0.35);
    const next = [...mine, { id: mine.length, size: nextSize, x, y, horizontal, hits: 0 }];
    setMine(next);
    const after = FLEET[next.length];
    setNews(after ? `Place a ${after}-decker.` : 'Fleet ready. Start the battle.');
  };

  const clickTheirs = (x: number, y: number) => {
    if (phase !== 'battle' || turn !== 'me' || flights.length || myShots[key(x, y)]) return;
    fire('theirs', x, y, (hit, sank) => {
      setNews(hit ? (sank ? `You sank their ${sank.size}-decker!` : 'Hit! Fire again.') : 'Splash. Their turn.');
      if (!hit) window.setTimeout(() => setTurn('them'), 500);
    });
  };

  // Capture scripts fire on known cells with window.__battleship (dev server only).
  if (import.meta.env.DEV) (window as unknown as { __battleship: unknown }).__battleship = { fire: clickTheirs, theirs, mine, turn, phase };

  const reset = () => {
    setMine([]);
    setTheirs(randomFleet());
    setMyShots({});
    setTheirShots({});
    setTurn('me');
    setPhase('place');
    setNews('Place your four-decker. R rotates.');
  };

  useEffect(() => {
    const actions =
      phase === 'place'
        ? [
            { label: horizontal ? 'Rotate (R) ↕' : 'Rotate (R) ↔', onClick: () => setHorizontal(h => !h), tone: 'ghost' as const },
            { label: 'Random fleet', onClick: () => setMine(randomFleet(FLEET.slice(mine.length), mine)), tone: 'ghost' as const },
            ...(mine.length ? [{ label: 'Clear', onClick: () => setMine([]), tone: 'ghost' as const }] : []),
            ...(mine.length === FLEET.length
              ? [
                  {
                    label: 'Start battle',
                    onClick: () => {
                      setPhase('battle');
                      setNews('Fire on their waters — the right-hand ocean.');
                    },
                  },
                ]
              : []),
          ]
        : phase === 'over'
          ? [{ label: 'New battle', onClick: reset }]
          : [];
    const afloat = (f: Ship[]) => f.filter(s => !sunk(s)).length;
    pushHud({
      title: 'Battleship',
      note: phase === 'over' ? (winner === 'me' ? 'Their whole fleet is on the bottom. You win!' : 'Your fleet is gone. They win.') : news,
      detail: phase === 'place' ? `${mine.length}/${FLEET.length} ships placed` : `Your ships afloat ${afloat(mine)} · theirs ${afloat(theirs)}`,
      legend: 'battleship',
      onLeave,
      actions,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, news, mine, theirs, horizontal, winner, onLeave]);
  useEffect(() => () => pushHud(null), []);

  const ghost: Ship | null =
    phase === 'place' && hoverMine && nextSize !== undefined
      ? { id: 99, size: nextSize, x: hoverMine.x, y: hoverMine.y, horizontal, hits: 0 }
      : null;

  return (
    <group>
      <Ocean center={MINE} label="YOUR FLEET" onCell={clickMine} onHover={setHoverMine} hover={phase === 'place' ? null : hoverMine} aim={false} />
      <Ocean
        center={THEIRS}
        label="ENEMY WATERS"
        onCell={clickTheirs}
        onHover={setHoverTheirs}
        hover={phase === 'battle' && turn === 'me' ? hoverTheirs : null}
        aim
      />
      {mine.map(s => (
        <Hull key={`m${s.id}`} ship={s} ocean={MINE} make={make} visible />
      ))}
      {ghost && (
        <Hull key={`g${ghost.size}${ghost.horizontal}`} ship={ghost} ocean={MINE} make={make} visible ghost bad={!canPlace(mine, ghost.size, ghost.x, ghost.y, ghost.horizontal)} />
      )}
      {/* their hulls only surface once sunk (or when the battle is over) */}
      {theirs.map(s => (
        <Hull key={`t${s.id}`} ship={s} ocean={THEIRS} make={make} visible={sunk(s) || phase === 'over'} />
      ))}
      <Markers shots={myShots} ocean={THEIRS} fleet={theirs} tex={markerTex} />
      <Markers shots={theirShots} ocean={MINE} fleet={mine} tex={markerTex} />
      {flights.map(f => (
        <Cannonball key={f.id} flight={f} />
      ))}
      <Island />
    </group>
  );
}

useGLTF.preload(`${A}raft.glb`);
useGLTF.preload(`${A}pirate.glb`);
useGLTF.preload(`${A}island.glb`);
