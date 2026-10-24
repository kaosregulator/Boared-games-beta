import { useMemo } from 'react';
import * as THREE from 'three';
import {
  BLOCK,
  BLOCK_STACKS,
  CABIN,
  FORT,
  HELIPAD,
  HQ,
  JEEPS,
  MAT,
  MAT_TOP,
  SANDBAGS,
  TANKS,
  TOWER,
  TREES,
} from './town';

/**
 * Everything in the army town that doesn't move: the road mat, the shoebox
 * HQ, alphabet-block buildings, a Lincoln Log cabin, a popsicle-stick tower,
 * sandbags, tanks, jeeps, trees and the tan army's fort of books. All of it
 * built from a handful of shapes so it costs almost nothing to draw.
 */

export const GREEN = '#4f7a2b';
export const TAN = '#c9a46a';

export function plastic(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0 });
}

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** World (x, z) to the mat's canvas pixels. */
function matPx(x: number, z: number, W: number, H: number) {
  return [((x - (MAT.x - MAT.w / 2)) / MAT.w) * W, ((z - (MAT.z - MAT.d / 2)) / MAT.d) * H] as const;
}

/** The 90s road rug: grass, roads with dashes, a parade ground and the helipad. */
function matTexture() {
  const W = 1024;
  const H = Math.round((W * MAT.d) / MAT.w);
  return canvasTexture(W, H, g => {
    g.fillStyle = '#6fa14a';
    g.fillRect(0, 0, W, H);
    // Felt blotches.
    for (let i = 0; i < 260; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 40},${90 + Math.random() * 50},${30 + Math.random() * 30},0.25)`;
      g.beginPath();
      g.arc(Math.random() * W, Math.random() * H, 6 + Math.random() * 26, 0, Math.PI * 2);
      g.fill();
    }
    const road = (x0: number, z0: number, x1: number, z1: number, width: number) => {
      const [ax, ay] = matPx(x0, z0, W, H);
      const [bx, by] = matPx(x1, z1, W, H);
      const wpx = (width / MAT.w) * W;
      g.strokeStyle = '#55585e';
      g.lineWidth = wpx;
      g.lineCap = 'square';
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      g.strokeStyle = '#f4f1e6';
      g.lineWidth = 3;
      g.setLineDash([16, 14]);
      g.beginPath();
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
      g.stroke();
      g.setLineDash([]);
    };
    road(MAT.x - MAT.w / 2, -0.145, MAT.x + MAT.w / 2, -0.145, 0.1);
    road(-0.27, -0.6, -0.27, MAT.z + MAT.d / 2, 0.07);
    road(0.31, -0.6, 0.31, MAT.z + MAT.d / 2, 0.07);
    road(-0.27, 0.3, 0.31, 0.3, 0.06);
    // Crosswalk stripes where the roads meet.
    g.fillStyle = '#f4f1e6';
    for (const x of [-0.27, 0.31]) {
      const [cx, cy] = matPx(x, -0.145, W, H);
      for (let i = -3; i <= 3; i++) g.fillRect(cx - 34, cy + i * 9 - 2, 68, 4);
    }
    // Parade ground.
    {
      const [x0, y0] = matPx(-0.66, -0.4, W, H);
      const [x1, y1] = matPx(-0.2, -0.24, W, H);
      g.fillStyle = '#a7a08e';
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
      g.strokeStyle = '#f4f1e6';
      g.lineWidth = 2;
      g.strokeRect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12);
    }
    // Helipad.
    {
      const [cx, cy] = matPx(HELIPAD.x, HELIPAD.z, W, H);
      const r = (HELIPAD.r / MAT.w) * W;
      g.fillStyle = '#3c3f44';
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#ffd23f';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#f4f1e6';
      g.font = `900 ${Math.round(r * 1.1)}px Arial, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('H', cx, cy + 2);
    }
    // A pond and some crayon tire tracks, because somebody drew on it.
    {
      const [cx, cy] = matPx(0.98, -0.52, W, H);
      g.fillStyle = '#4c8fd0';
      g.beginPath();
      g.ellipse(cx, cy, 38, 24, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(60,40,20,0.35)';
    g.lineWidth = 3;
    g.beginPath();
    const [tx, ty] = matPx(-0.6, 0.36, W, H);
    g.moveTo(tx, ty);
    g.bezierCurveTo(tx + 80, ty - 40, tx + 140, ty + 30, tx + 220, ty - 10);
    g.stroke();
    // Border and title.
    g.strokeStyle = '#f2c230';
    g.lineWidth = 14;
    g.strokeRect(7, 7, W - 14, H - 14);
    g.fillStyle = '#f2c230';
    g.font = '900 30px Arial Black, Arial, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'alphabetic';
    g.fillText('ARMY TOWN', 26, H - 24);
  });
}

function MatRug() {
  const tex = useMemo(matTexture, []);
  return (
    <group>
      <mesh position={[MAT.x, MAT_TOP, MAT.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[MAT.w, MAT.d]} />
        <meshStandardMaterial map={tex} roughness={0.95} />
      </mesh>
      {/* The mat has a little thickness, and sits on top of the round rug. */}
      <mesh position={[MAT.x, MAT_TOP / 2, MAT.z]}>
        <boxGeometry args={[MAT.w + 0.01, MAT_TOP - 0.0005, MAT.d + 0.01]} />
        <meshStandardMaterial color="#2f4d22" roughness={1} />
      </mesh>
    </group>
  );
}

function ShoeboxHQ() {
  const side = useMemo(
    () =>
      canvasTexture(512, 196, g => {
        g.fillStyle = '#c99c66';
        g.fillRect(0, 0, 512, 196);
        g.fillStyle = 'rgba(120,80,40,0.25)';
        for (let i = 0; i < 40; i++) g.fillRect(0, Math.random() * 196, 512, 1);
        g.fillStyle = '#1b1b1b';
        g.font = '900 64px "Comic Sans MS", "Marker Felt", cursive';
        g.textAlign = 'center';
        g.fillText('ARMY HQ', 256, 84);
        g.font = '700 26px "Comic Sans MS", "Marker Felt", cursive';
        g.fillText('KEEP OUT (except soldiers)', 256, 130);
        // The door somebody cut with scissors.
        g.fillStyle = '#2a1a0e';
        g.fillRect(340, 140, 46, 56);
      }),
    [],
  );
  const plain = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c99c66', roughness: 0.9 }), []);
  const front = useMemo(() => new THREE.MeshStandardMaterial({ map: side, roughness: 0.9 }), [side]);
  // Box faces: +x, -x, +y, -y, +z (south, toward the player), -z.
  const mats = useMemo(() => [plain, plain, plain, plain, front, plain], [plain, front]);
  return (
    <group position={[HQ.x, 0, HQ.z]}>
      <mesh position={[0, HQ.h / 2, 0]} material={mats} castShadow receiveShadow>
        <boxGeometry args={[HQ.w, HQ.h, HQ.d]} />
      </mesh>
      {/* Lid, pushed back a bit. */}
      <mesh position={[0.01, HQ.h + 0.004, -0.008]} rotation={[0, 0.03, 0]} castShadow>
        <boxGeometry args={[HQ.w + 0.012, 0.008, HQ.d + 0.012]} />
        <meshStandardMaterial color="#b98a55" roughness={0.9} />
      </mesh>
      {/* Flag: a pencil and a green paper flag. */}
      <mesh position={[HQ.w / 2 - 0.04, HQ.h + 0.06, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.12, 6]} />
        <meshStandardMaterial color="#f2c230" />
      </mesh>
      <mesh position={[HQ.w / 2 - 0.04 + 0.022, HQ.h + 0.1, 0]}>
        <planeGeometry args={[0.044, 0.028]} />
        <meshStandardMaterial color="#3f7d2a" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

const LETTERS = 'ABCDEFGHJKLMNPRSTWXYZ';
const BLOCK_COLORS = ['#e53935', '#1e88e5', '#fdd835', '#43a047', '#fb8c00', '#8e24aa'];

function letterMaterial(letter: string, color: string) {
  const t = canvasTexture(64, 64, g => {
    g.fillStyle = '#f3e3c3';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = color;
    g.lineWidth = 6;
    g.strokeRect(5, 5, 54, 54);
    g.fillStyle = color;
    g.font = '900 40px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(letter, 32, 35);
  });
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
}

function AlphabetBlocks() {
  const mats = useMemo(() => LETTERS.split('').map((l, i) => letterMaterial(l, BLOCK_COLORS[i % BLOCK_COLORS.length])), []);
  const geo = useMemo(() => new THREE.BoxGeometry(BLOCK, BLOCK, BLOCK), []);
  return (
    <group>
      {BLOCK_STACKS.flatMap(([x, z, n, seed], s) =>
        Array.from({ length: n }, (_, k) => {
          const pick = (f: number) => mats[(seed * 7 + k * 5 + f * 3 + s) % mats.length];
          return (
            <mesh
              key={`${s}-${k}`}
              geometry={geo}
              material={[0, 1, 2, 3, 4, 5].map(pick)}
              position={[x, BLOCK / 2 + k * BLOCK, z]}
              rotation={[0, ((seed + k) % 3) * 0.12 - 0.1, 0]}
              castShadow
              receiveShadow
            />
          );
        }),
      )}
    </group>
  );
}

function LincolnCabin() {
  const logs = useMemo(() => {
    const out: { p: [number, number, number]; along: 'x' | 'z'; len: number }[] = [];
    const r = 0.0075;
    for (let i = 0; i < 5; i++) {
      const y = r + i * r * 2 * 0.86;
      const xAxis = i % 2 === 0;
      if (xAxis) {
        out.push({ p: [0, y, -CABIN.d / 2 + r], along: 'x', len: CABIN.w });
        out.push({ p: [0, y, CABIN.d / 2 - r], along: 'x', len: CABIN.w });
      } else {
        out.push({ p: [-CABIN.w / 2 + r, y, 0], along: 'z', len: CABIN.d });
        out.push({ p: [CABIN.w / 2 - r, y, 0], along: 'z', len: CABIN.d });
      }
    }
    return out;
  }, []);
  return (
    <group position={[CABIN.x, 0, CABIN.z]}>
      {logs.map((l, i) => (
        <mesh key={i} position={l.p} rotation={l.along === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.0075, 0.0075, l.len + 0.012, 8]} />
          <meshStandardMaterial color={i % 4 < 2 ? '#8a5a32' : '#9b6a3e'} roughness={0.8} />
        </mesh>
      ))}
      {/* Green roof slats, like the real set. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, 0.07, (s * CABIN.d) / 4]} rotation={[s * 0.55, 0, 0]} castShadow>
          <boxGeometry args={[CABIN.w + 0.02, 0.004, CABIN.d * 0.6]} />
          <meshStandardMaterial color="#2f6b3a" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function PopsicleTower() {
  const wood = '#e4c48a';
  const half = TOWER.w / 2 - 0.006;
  return (
    <group position={[TOWER.x, 0, TOWER.z]}>
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * half, TOWER.h / 2, sz * half]} castShadow>
            <boxGeometry args={[0.006, TOWER.h, 0.009]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
        )),
      )}
      {/* Cross braces. */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map(r => (
        <group key={r} rotation={[0, r, 0]}>
          <mesh position={[0, TOWER.h * 0.45, half]} rotation={[0, 0, 0.9]}>
            <boxGeometry args={[0.005, TOWER.h * 0.9, 0.002]} />
            <meshStandardMaterial color={wood} roughness={0.8} />
          </mesh>
        </group>
      ))}
      {/* The deck: popsicle sticks side by side. */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, TOWER.h - 0.003, -TOWER.w / 2 + 0.008 + i * ((TOWER.w - 0.016) / 5)]} castShadow receiveShadow>
          <boxGeometry args={[TOWER.w + 0.01, 0.003, 0.016]} />
          <meshStandardMaterial color={i % 2 ? '#dcb97a' : wood} roughness={0.8} />
        </mesh>
      ))}
      {/* Railing. */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[0, TOWER.h + 0.02, (s * TOWER.w) / 2]}>
          <boxGeometry args={[TOWER.w, 0.004, 0.003]} />
          <meshStandardMaterial color={wood} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Sandbags() {
  const { geo, mat, mats } = useMemo(() => {
    const geo = new THREE.CapsuleGeometry(0.008, 0.02, 3, 8);
    geo.rotateZ(Math.PI / 2);
    geo.scale(1, 0.75, 1);
    const mat = plastic('#6d7d3e');
    const list: THREE.Matrix4[] = [];
    for (const [x0, x1, z] of SANDBAGS) {
      const n = Math.max(2, Math.round((x1 - x0) / 0.034));
      for (let layer = 0; layer < 2; layer++) {
        const m = layer ? n - 1 : n;
        for (let i = 0; i < m; i++) {
          const t = (i + 0.5 + layer * 0.5) / n;
          const x = x0 + t * (x1 - x0);
          const curve = Math.sin(t * Math.PI) * 0.012;
          list.push(new THREE.Matrix4().makeTranslation(x, 0.007 + layer * 0.013, z - curve));
        }
      }
    }
    return { geo, mat, mats: list };
  }, []);
  return (
    <instancedMesh
      args={[geo, mat, mats.length]}
      castShadow
      ref={m => {
        if (!m) return;
        mats.forEach((mx, i) => m.setMatrixAt(i, mx));
        m.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}

function Tank({ x, z, heading, color }: { x: number; z: number; heading: number; color: string }) {
  const mat = useMemo(() => plastic(color), [color]);
  const dark = useMemo(() => plastic('#33501c'), []);
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI + heading, 0]}>
      <mesh position={[0, 0.02, 0]} material={mat} castShadow>
        <boxGeometry args={[0.06, 0.018, 0.085]} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.036, 0.011, 0]} material={dark} castShadow>
          <boxGeometry args={[0.016, 0.022, 0.09]} />
        </mesh>
      ))}
      <mesh position={[0, 0.036, -0.005]} material={mat} castShadow>
        <cylinderGeometry args={[0.02, 0.024, 0.015, 12]} />
      </mesh>
      <mesh position={[0, 0.038, 0.035]} rotation={[Math.PI / 2 - 0.05, 0, 0]} material={mat} castShadow>
        <cylinderGeometry args={[0.0035, 0.0035, 0.055, 8]} />
      </mesh>
    </group>
  );
}

function Jeep({ x, z, heading }: { x: number; z: number; heading: number }) {
  const mat = useMemo(() => plastic(GREEN), []);
  const tire = useMemo(() => plastic('#2c3a1a'), []);
  return (
    <group position={[x, 0, z]} rotation={[0, heading, 0]}>
      <mesh position={[0, 0.015, 0]} material={mat} castShadow>
        <boxGeometry args={[0.032, 0.012, 0.056]} />
      </mesh>
      <mesh position={[0, 0.027, -0.004]} material={mat}>
        <boxGeometry args={[0.03, 0.002, 0.012]} />
      </mesh>
      {[-1, 1].flatMap(sx =>
        [-1, 1].map(sz => (
          <mesh key={`${sx}${sz}`} position={[sx * 0.018, 0.008, sz * 0.018]} rotation={[0, 0, Math.PI / 2]} material={tire}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 10]} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Trees() {
  const leaf = useMemo(() => plastic('#3d8a2f'), []);
  const trunk = useMemo(() => plastic('#7a5230'), []);
  const base = useMemo(() => plastic('#3d8a2f'), []);
  return (
    <group>
      {TREES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]} scale={0.85 + (i % 3) * 0.12}>
          <mesh position={[0, 0.002, 0]} material={base}>
            <cylinderGeometry args={[0.016, 0.018, 0.004, 12]} />
          </mesh>
          <mesh position={[0, 0.025, 0]} material={trunk}>
            <cylinderGeometry args={[0.003, 0.004, 0.05, 6]} />
          </mesh>
          <mesh position={[0, 0.065, 0]} material={leaf} castShadow>
            <coneGeometry args={[0.024, 0.06, 9]} />
          </mesh>
          <mesh position={[0, 0.09, 0]} material={leaf} castShadow>
            <coneGeometry args={[0.018, 0.045, 9]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Five books stacked flat, spines toward the town, a tan flag on top. */
function BookFort() {
  const books = useMemo(
    () => [
      { h: 0.024, c: '#8e2b2b', w: 1, off: 0 },
      { h: 0.02, c: '#2b4f8e', w: 0.94, off: 0.01 },
      { h: 0.026, c: '#2f6b3a', w: 0.97, off: -0.008 },
      { h: 0.018, c: '#d9a62e', w: 0.9, off: 0.015 },
      { h: 0.022, c: '#5a3d7a', w: 0.95, off: -0.01 },
    ],
    [],
  );
  let y = 0;
  return (
    <group position={[FORT.x, 0, FORT.z]} rotation={[0, 0.02, 0]}>
      {books.map((b, i) => {
        const at = y + b.h / 2;
        y += b.h;
        return (
          <group key={i} position={[b.off, at, (i % 2) * 0.006]} rotation={[0, (i % 2 ? 1 : -1) * 0.025, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[FORT.w * b.w, b.h, FORT.d]} />
              <meshStandardMaterial color={b.c} roughness={0.75} />
            </mesh>
            {/* Page edges on the north side. */}
            <mesh position={[0, 0, -FORT.d / 2 - 0.0005]}>
              <planeGeometry args={[FORT.w * b.w - 0.01, b.h * 0.8]} />
              <meshStandardMaterial color="#f1ead8" side={THREE.BackSide} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[-FORT.w / 2 + 0.06, FORT.h + 0.05, 0]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.1, 6]} />
        <meshStandardMaterial color="#e8e1cf" />
      </mesh>
      <mesh position={[-FORT.w / 2 + 0.06 + 0.02, FORT.h + 0.085, 0]}>
        <planeGeometry args={[0.04, 0.026]} />
        <meshStandardMaterial color={TAN} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function ArmyProps() {
  return (
    <group>
      <MatRug />
      <ShoeboxHQ />
      <AlphabetBlocks />
      <LincolnCabin />
      <PopsicleTower />
      <Sandbags />
      {TANKS.map(([x, z, h], i) => (
        <Tank key={i} x={x} z={z} heading={h} color={GREEN} />
      ))}
      {JEEPS.map(([x, z, h], i) => (
        <Jeep key={i} x={x} z={z} heading={h} />
      ))}
      <Trees />
      <BookFort />
    </group>
  );
}
