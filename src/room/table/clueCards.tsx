import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOMS, SUSPECTS, WEAPONS, cardKey, type Card } from '../../games/clue/clueData';
import type { CluePlayer } from '../../games/clue/clueEngine';
import { CLUE_CARD, clueCardTexture } from './clueArt';
import { wasDrag } from './tableCam';

/**
 * Every bit of Clue's paperwork is a thing in the room, not a panel on the
 * screen: your hand lies face up at your edge of the table, the cards you
 * choose a suggestion from pop up and stand in front of you, the card someone
 * shows you flips over in front of your eyes, and your detective notebook is
 * a pad beside the board you can lift up to read.
 */

const T = 0.0006;
const noRay = () => null;

function cardMaterials(card: Card | null) {
  const edge = new THREE.MeshStandardMaterial({ color: '#efe6d0', roughness: 0.9 });
  // unlit, like printed card under a reading lamp, so the art stays readable
  const face = new THREE.MeshBasicMaterial({ map: clueCardTexture(card), color: '#e9e4da', toneMapped: false });
  const back = new THREE.MeshBasicMaterial({ map: clueCardTexture(null), color: '#e9e4da', toneMapped: false });
  // box faces: +x, -x, +y, -y, +z face, -z back
  return [edge, edge, edge, edge, face, back];
}

export function useCardMats(card: Card | null) {
  return useMemo(() => cardMaterials(card), [card ? cardKey(card) : 'back']);
}

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const flipQ = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * A card that rises off the table and hangs in front of the camera at
 * (x, y) in screen-ish metres, `dist` ahead, whatever angle you look from.
 * `faceUp` turns it over with a real flip.
 */
export function CameraCard({
  card,
  from,
  x,
  y,
  dist = 0.2,
  scale = 1,
  faceUp = true,
  delay = 0,
  glow = false,
  onClick,
}: {
  card: Card | null;
  from: THREE.Vector3;
  x: number;
  y: number;
  dist?: number;
  scale?: number;
  faceUp?: boolean;
  delay?: number;
  glow?: boolean;
  onClick?: () => void;
}) {
  const { camera } = useThree();
  const g = useRef<THREE.Group>(null);
  const k = useRef(-delay);
  const flip = useRef(Math.PI);
  const hover = useRef(false);
  const mats = useCardMats(card);
  const inv = useRef(new THREE.Matrix4());
  useFrame((_, dtRaw) => {
    const n = g.current;
    if (!n || !n.parent) return;
    const dt = Math.min(dtRaw, 0.05);
    k.current = Math.min(1, k.current + dt / 0.45);
    const kk = Math.max(0, k.current);
    const e = 1 - (1 - kk) ** 3;
    const fwd = camera.getWorldDirection(tmpV.set(0, 0, 0)).clone();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const lift = hover.current ? 0.006 : 0;
    const goal = camera.position
      .clone()
      .add(fwd.multiplyScalar(dist))
      .add(right.multiplyScalar(x))
      .add(up.multiplyScalar(y + lift));
    n.parent.updateMatrixWorld();
    inv.current.copy(n.parent.matrixWorld).invert();
    goal.applyMatrix4(inv.current);
    n.position.copy(from).lerp(goal, e);
    // arc up off the table on the way
    n.position.y += Math.sin(Math.PI * e) * 0.03;
    flip.current += ((faceUp ? 0 : Math.PI) - flip.current) * Math.min(1, dt * 7);
    n.parent.getWorldQuaternion(tmpQ);
    n.quaternion.copy(tmpQ.invert()).multiply(camera.quaternion).multiply(flipQ.setFromAxisAngle(Y, flip.current));
    const s = (0.3 + 0.7 * e) * scale * (hover.current ? 1.08 : 1);
    n.scale.setScalar(Math.max(0.001, s));
    n.visible = k.current > 0;
  });
  return (
    <group
      ref={g}
      visible={false}
      onClick={
        onClick
          ? e => {
              e.stopPropagation();
              if (!wasDrag()) onClick();
            }
          : undefined
      }
      onPointerOver={onClick ? () => (hover.current = true) : undefined}
      onPointerOut={onClick ? () => (hover.current = false) : undefined}
    >
      <mesh material={mats}>
        <boxGeometry args={[CLUE_CARD.w, CLUE_CARD.h, T]} />
      </mesh>
      {glow && (
        <mesh position={[0, 0, -0.0005]} raycast={noRay}>
          <planeGeometry args={[CLUE_CARD.w + 0.004, CLUE_CARD.h + 0.004]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/** Cards to choose from, standing in a row (or two) in front of you. */
export function CardFan({ cards, from, onPick, title }: { cards: Card[]; from: THREE.Vector3; onPick: (c: Card) => void; title?: string }) {
  const { camera, size } = useThree();
  const persp = camera as THREE.PerspectiveCamera;
  const dist = 0.2;
  const viewH = 2 * dist * Math.tan(THREE.MathUtils.degToRad((persp.fov ?? 50) / 2));
  const viewW = viewH * (size.width / Math.max(1, size.height));
  const rows = cards.length > 6 ? 2 : 1;
  const perRow = Math.ceil(cards.length / rows);
  // leave the right edge clear for the status panel
  const usable = viewW * 0.66;
  const scale = Math.min(1.1, usable / (perRow * CLUE_CARD.w * 1.12), (viewH * 0.36) / (rows * CLUE_CARD.h * 1.1));
  const step = CLUE_CARD.w * 1.12 * scale;
  const left = -viewW * 0.12;
  return (
    <group>
      {title && <FanTitle text={title} y={rows === 2 ? CLUE_CARD.h * scale * 1.15 : CLUE_CARD.h * scale * 0.7} x={left} dist={dist} />}
      {cards.map((c, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        const inRow = row === rows - 1 ? cards.length - perRow * (rows - 1) : perRow;
        return (
          <CameraCard
            key={cardKey(c)}
            card={c}
            from={from}
            x={left + (col - (inRow - 1) / 2) * step}
            y={-viewH * 0.12 - (row - (rows - 1) / 2) * CLUE_CARD.h * scale * 1.1}
            dist={dist}
            scale={scale}
            delay={i * 0.05}
            onClick={() => onPick(c)}
          />
        );
      })}
    </group>
  );
}

/** A printed label floating over the fan: "Who did it?" */
function FanTitle({ text, x, y, dist }: { text: string; x: number; y: number; dist: number }) {
  const { camera } = useThree();
  const g = useRef<THREE.Sprite>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 768;
    c.height = 96;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'rgba(244,236,216,0.95)';
    ctx.beginPath();
    ctx.roundRect(4, 8, 760, 80, 18);
    ctx.fill();
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#14532d';
    ctx.font = '700 46px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 384, 50);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [text]);
  const inv = useRef(new THREE.Matrix4());
  useFrame(() => {
    const s = g.current;
    if (!s || !s.parent) return;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const goal = camera.position.clone().add(fwd.multiplyScalar(dist * 1.02)).add(right.multiplyScalar(x)).add(up.multiplyScalar(y));
    s.parent.updateMatrixWorld();
    inv.current.copy(s.parent.matrixWorld).invert();
    s.position.copy(goal.applyMatrix4(inv.current));
  });
  return (
    <sprite ref={g} scale={[0.08, 0.01, 1]} raycast={noRay}>
      <spriteMaterial map={tex} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}

/** Your hand, face up along your edge of the table. Glowing cards can be shown. */
export function Hand({ cards, glowing, onPick }: { cards: Card[]; glowing: Set<string>; onPick?: (c: Card) => void }) {
  const step = CLUE_CARD.w * 1.12;
  return (
    <group position={[-((cards.length - 1) * step) / 2 - 0.02, 0.0006, 0.305]}>
      {cards.map((c, i) => (
        <HandCard key={cardKey(c)} card={c} x={i * step} glow={glowing.has(cardKey(c))} onPick={onPick && glowing.has(cardKey(c)) ? () => onPick(c) : undefined} />
      ))}
    </group>
  );
}

function HandCard({ card, x, glow, onPick }: { card: Card; x: number; glow: boolean; onPick?: () => void }) {
  const mats = useCardMats(card);
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }, dt) => {
    const n = g.current;
    if (!n) return;
    const want = glow ? 0.012 + Math.sin(clock.elapsedTime * 4) * 0.003 : 0;
    n.position.y += (want - n.position.y) * Math.min(1, dt * 8);
    n.rotation.x = -Math.PI / 2 + (glow ? 0.5 : 0);
  });
  return (
    <group
      ref={g}
      position={[x, 0, 0]}
      onClick={
        onPick
          ? e => {
              e.stopPropagation();
              if (!wasDrag()) onPick();
            }
          : undefined
      }
    >
      <mesh material={mats} position={[0, 0, 0]}>
        <boxGeometry args={[CLUE_CARD.w, CLUE_CARD.h, T]} />
      </mesh>
      {glow && (
        <mesh position={[0, 0, -0.0006]} raycast={noRay}>
          <planeGeometry args={[CLUE_CARD.w + 0.005, CLUE_CARD.h + 0.005]} />
          <meshBasicMaterial color="#ffd36b" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

/* -------------------------------- notebook -------------------------------- */

export function notebookCanvas() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 800;
  return c;
}

/** Your detective notes: ■ in your hand, ✗ shown to you, blank still open. */
export function drawNotebook(c: HTMLCanvasElement, me: CluePlayer | null) {
  const g = c.getContext('2d')!;
  g.fillStyle = '#fbf7ea';
  g.fillRect(0, 0, c.width, c.height);
  // ruled lines and a margin, like a real pad
  g.strokeStyle = '#b9d0e6';
  g.lineWidth = 2;
  for (let y = 70; y < c.height; y += 28) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
  }
  g.strokeStyle = '#e8a0a0';
  g.beginPath();
  g.moveTo(60, 0);
  g.lineTo(60, c.height);
  g.stroke();
  g.fillStyle = '#14532d';
  g.fillRect(0, 0, c.width, 50);
  g.fillStyle = '#f4ecd8';
  g.font = '700 30px Georgia, serif';
  g.textAlign = 'center';
  g.fillText('DETECTIVE NOTES', c.width / 2, 36);
  const held = new Set(me?.hand.map(cardKey) ?? []);
  const cleared = me?.detective.cleared ?? new Set<string>();
  let y = 70 + 22;
  const section = (title: string, rows: Card[]) => {
    g.textAlign = 'left';
    g.fillStyle = '#7a1f24';
    g.font = '700 22px Georgia, serif';
    g.fillText(title, 70, y);
    y += 28;
    rows.forEach(card => {
      const k = cardKey(card);
      const name = card.kind === 'suspect' ? SUSPECTS.find(s => s.id === card.value)!.full : String(card.value);
      const mine = held.has(k);
      const out = cleared.has(k);
      g.fillStyle = out ? '#8a8a8a' : '#1a1a2a';
      g.font = '20px "Comic Sans MS", "Segoe Print", cursive';
      g.fillText(name, 76, y);
      if (out) {
        g.strokeStyle = '#555';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(72, y - 7);
        g.lineTo(76 + g.measureText(name).width + 4, y - 7);
        g.stroke();
      }
      g.textAlign = 'center';
      g.font = '700 22px Arial';
      g.fillStyle = mine ? '#1f5fb4' : '#b0182a';
      g.fillText(mine ? '■' : out ? '✗' : '', 30, y);
      g.textAlign = 'left';
      y += 28;
    });
    y += 6;
  };
  section('Suspects', SUSPECTS.map(s => ({ kind: 'suspect', value: s.id }) as Card));
  section('Weapons', WEAPONS.map(w => ({ kind: 'weapon', value: w.id }) as Card));
  section('Rooms', ROOMS.map(r => ({ kind: 'room', value: r }) as Card));
}

/** The pad on the table, or held up in front of you when tapped. */
export function Notebook({ me, version, lifted, onToggle }: { me: CluePlayer | null; version: string; lifted: boolean; onToggle: () => void }) {
  const { camera } = useThree();
  const cnv = useMemo(notebookCanvas, []);
  const tex = useMemo(() => {
    const t = new THREE.CanvasTexture(cnv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [cnv]);
  useMemo(() => {
    drawNotebook(cnv, me);
    tex.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, cnv, tex]);
  const g = useRef<THREE.Group>(null);
  const k = useRef(0);
  const rest = useMemo(() => new THREE.Vector3(0.33, 0.0015, 0.17), []);
  const inv = useRef(new THREE.Matrix4());
  const restQ = useMemo(() => new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.25)), []);
  useFrame((_, dt) => {
    const n = g.current;
    if (!n || !n.parent) return;
    k.current += ((lifted ? 1 : 0) - k.current) * Math.min(1, dt * 6);
    const e = k.current;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const goal = camera.position.clone().add(fwd.multiplyScalar(0.17)).add(right.multiplyScalar(-0.03));
    n.parent.updateMatrixWorld();
    inv.current.copy(n.parent.matrixWorld).invert();
    goal.applyMatrix4(inv.current);
    n.position.copy(rest).lerp(goal, e);
    const pq = new THREE.Quaternion();
    n.parent.getWorldQuaternion(pq);
    const held = pq.invert().multiply(camera.quaternion);
    n.quaternion.copy(restQ).slerp(held, e);
  });
  const w = 0.075;
  const h = w * (800 / 512);
  return (
    <group
      ref={g}
      onClick={e => {
        e.stopPropagation();
        if (!wasDrag()) onToggle();
      }}
    >
      <mesh>
        <boxGeometry args={[w, h, 0.003]} />
        <meshStandardMaterial attach="material-0" color="#e8e0c8" />
        <meshStandardMaterial attach="material-1" color="#e8e0c8" />
        <meshStandardMaterial attach="material-2" color="#e8e0c8" />
        <meshStandardMaterial attach="material-3" color="#e8e0c8" />
        <meshBasicMaterial attach="material-4" map={tex} color="#e9e4da" toneMapped={false} />
        <meshStandardMaterial attach="material-5" color="#14532d" />
      </mesh>
      {/* spiral binding along the top */}
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-w / 2 + 0.006 + i * ((w - 0.012) / 8), h / 2, 0]} rotation={[0, Math.PI / 2, 0]} raycast={noRay}>
          <torusGeometry args={[0.0025, 0.0006, 6, 12]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
