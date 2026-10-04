import { Text } from '@react-three/drei';
import { ROOM, PROP_INTERACTABLES } from './roomConfig';
import { GameShelf } from './GameShelf';
import { HoverTarget, Interactable } from './Interactable';

interface BedroomSceneProps {
  activeId: string | null;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: HoverTarget) => void;
  doorOpen?: boolean;
}

function Wall({
  position,
  rotation,
  size,
  color = '#2a1840',
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.92} />
    </mesh>
  );
}

function Poster({
  position,
  rotation,
  color,
  label,
  w = 0.55,
  h = 0.75,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  label: string;
  w?: number;
  h?: number;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={color} roughness={0.7} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      <Text position={[0, 0, 0.01]} fontSize={0.07} color="#fff7ed" anchorX="center" maxWidth={w * 0.85} textAlign="center">
        {label}
      </Text>
    </group>
  );
}

export function BedroomScene({ activeId, onHover, onSelect, doorOpen = false }: BedroomSceneProps) {
  const { width, depth, height } = ROOM;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#1a1224" roughness={0.95} />
      </mesh>
      {/* Wood plank hint strips */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -3.5 + i * 1.05]} receiveShadow>
          <planeGeometry args={[width, 0.03]} />
          <meshStandardMaterial color="#2b1a12" roughness={1} />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, height, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#120818" roughness={1} />
      </mesh>

      {/* Walls */}
      <Wall position={[0, height / 2, -depth / 2]} size={[width, height, 0.12]} color="#241433" />
      <Wall position={[-width / 2, height / 2, 0]} size={[0.12, height, depth]} color="#1f1230" />
      <Wall position={[width / 2, height / 2, 0]} size={[0.12, height, depth]} color="#1f1230" />
      <Wall position={[0, height / 2, depth / 2]} size={[width, height, 0.12]} color="#181022" />

      {/* Circular rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0.02, 0.8]} receiveShadow>
        <circleGeometry args={[1.35, 48]} />
        <meshStandardMaterial color="#4c1d95" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.4, 0.025, 0.8]}>
        <ringGeometry args={[0.55, 0.85, 48]} />
        <meshStandardMaterial color="#7c3aed" roughness={0.85} />
      </mesh>

      {/* Window + night city glow */}
      <mesh position={[-width / 2 + 0.08, 1.7, -1.2]}>
        <planeGeometry args={[0.05, 1.4]} />
        <meshStandardMaterial color="#0ea5e9" emissive="#0284c7" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[-width / 2 + 0.07, 1.7, -1.2]}>
        <planeGeometry args={[1.1, 1.35]} />
        <meshStandardMaterial color="#0b1c3a" emissive="#1d4ed8" emissiveIntensity={0.25} />
      </mesh>
      {/* Blind slats */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[-width / 2 + 0.09, 1.1 + i * 0.16, -1.2]}>
          <boxGeometry args={[0.02, 0.06, 1.05]} />
          <meshStandardMaterial color="#d6d3d1" roughness={0.7} />
        </mesh>
      ))}

      {/* Bed */}
      <group position={[-3.2, 0, -0.4]}>
        <mesh position={[0, 0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.9, 0.35, 2.4]} />
          <meshStandardMaterial color="#4a3424" roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[1.85, 0.18, 2.3]} />
          <meshStandardMaterial color="#7c3aed" roughness={0.75} />
        </mesh>
        {/* Quilt pattern blocks */}
        {[
          [-0.45, 0.4],
          [0.45, 0.4],
          [-0.45, -0.4],
          [0.45, -0.4],
        ].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.65, z]}>
            <boxGeometry args={[0.55, 0.04, 0.55]} />
            <meshStandardMaterial color={i % 2 ? '#f59e0b' : '#ef4444'} roughness={0.8} />
          </mesh>
        ))}
        <mesh position={[0, 0.7, -0.95]} castShadow>
          <boxGeometry args={[0.7, 0.22, 0.4]} />
          <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
        </mesh>
      </group>

      {/* Nightstand + clock + lava lamp */}
      <group position={[-3.5, 0, -2.0]}>
        <mesh position={[0, 0.35, 0]} castShadow>
          <boxGeometry args={[0.55, 0.7, 0.45]} />
          <meshStandardMaterial color="#5b3a22" />
        </mesh>
        <mesh position={[0.05, 0.78, 0.05]}>
          <boxGeometry args={[0.28, 0.14, 0.12]} />
          <meshStandardMaterial color="#111827" emissive="#ef4444" emissiveIntensity={0.4} />
        </mesh>
        <Text position={[0.05, 0.78, 0.12]} fontSize={0.05} color="#fecaca">
          9:47
        </Text>
        <mesh position={[-0.12, 1.05, 0]}>
          <cylinderGeometry args={[0.05, 0.08, 0.45, 12]} />
          <meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={0.7} transparent opacity={0.85} />
        </mesh>
      </group>

      {/* Skateboard */}
      <mesh position={[-2.55, 0.08, -1.9]} rotation={[0, 0.4, Math.PI / 2]} castShadow>
        <boxGeometry args={[0.7, 0.08, 0.22]} />
        <meshStandardMaterial color="#f97316" />
      </mesh>

      {/* Desk / dresser + CRT */}
      <group position={[-1.9, 0, -3.55]}>
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.1, 0.55]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
        <Text position={[0.35, 0.7, 0.29]} fontSize={0.06} color="#f8fafc">
          NO FEAR
        </Text>
        <mesh position={[0, 1.35, 0.05]} castShadow>
          <boxGeometry args={[0.95, 0.7, 0.45]} />
          <meshStandardMaterial color="#374151" roughness={0.55} metalness={0.2} />
        </mesh>
      </group>

      {/* CRT interactable screen */}
      <Interactable
        id="crt-tv"
        label={PROP_INTERACTABLES[0].label}
        hint={PROP_INTERACTABLES[0].hint}
        kind="prop"
        position={[-1.9, 1.35, -3.3]}
        size={[0.85, 0.55, 0.2]}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh>
          <planeGeometry args={[0.72, 0.48]} />
          <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.85} />
        </mesh>
        <Text position={[0, 0.05, 0.02]} fontSize={0.09} color="#67e8f9" outlineWidth={0.004} outlineColor="#000">
          PLAY --:--
        </Text>
      </Interactable>

      {/* Orange lava lamp on dresser */}
      <mesh position={[-1.2, 1.35, -3.45]}>
        <cylinderGeometry args={[0.06, 0.1, 0.5, 12]} />
        <meshStandardMaterial color="#fb923c" emissive="#ea580c" emissiveIntensity={0.85} transparent opacity={0.9} />
      </mesh>

      {/* Door + portal */}
      <group position={[0.15, 0, -depth / 2 + 0.08]}>
        <mesh position={[0, 1.15, doorOpen ? -0.35 : 0]} rotation={[0, doorOpen ? -0.9 : 0, 0]} castShadow>
          <boxGeometry args={[1.05, 2.25, 0.08]} />
          <meshStandardMaterial color="#5b3a22" roughness={0.75} />
        </mesh>
        {doorOpen && (
          <mesh position={[0, 1.15, -0.05]}>
            <planeGeometry args={[1, 2.1]} />
            <meshStandardMaterial color="#a855f7" emissive="#c026ff" emissiveIntensity={1.6} transparent opacity={0.85} />
          </mesh>
        )}
      </group>

      <Interactable
        id="portal-door"
        label={PROP_INTERACTABLES[1].label}
        hint={PROP_INTERACTABLES[1].hint}
        kind="prop"
        position={[0.15, 1.35, -4.0]}
        size={[1.1, 2.2, 0.25]}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh>
          <planeGeometry args={[0.7, 0.5]} />
          <meshStandardMaterial color="#111827" emissive="#22d3ee" emissiveIntensity={0.35} />
        </mesh>
        <Text position={[0, 0, 0.02]} fontSize={0.055} color="#e0f2fe" maxWidth={0.6} textAlign="center">
          I WANT TO{'\n'}BELIEVE
        </Text>
      </Interactable>

      {/* Jacket on hook */}
      <mesh position={[0.85, 1.55, -4.0]} rotation={[0.2, 0, 0.15]} castShadow>
        <boxGeometry args={[0.45, 0.7, 0.12]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.7} />
      </mesh>

      {/* Boombox */}
      <Interactable
        id="boombox"
        label={PROP_INTERACTABLES[2].label}
        hint={PROP_INTERACTABLES[2].hint}
        kind="prop"
        position={[2.1, 0.28, 2.4]}
        size={[0.55, 0.28, 0.3]}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh castShadow>
          <boxGeometry args={[0.5, 0.22, 0.25]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.55} roughness={0.35} emissive="#67e8f9" emissiveIntensity={0.15} />
        </mesh>
      </Interactable>

      {/* Roller skates + bat */}
      <mesh position={[2.55, 0.12, 2.1]} castShadow>
        <boxGeometry args={[0.28, 0.12, 0.45]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>
      <mesh position={[3.1, 0.55, 0.8]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 1.1, 8]} />
        <meshStandardMaterial color="#d6d3d1" />
      </mesh>

      {/* Game Boy on bed */}
      <Interactable
        id="gameboy"
        label={PROP_INTERACTABLES[3].label}
        hint={PROP_INTERACTABLES[3].hint}
        kind="prop"
        position={[-3.4, 0.72, -1.1]}
        size={[0.28, 0.08, 0.4]}
        activeId={activeId}
        onHover={onHover}
        onSelect={onSelect}
      >
        <mesh castShadow rotation={[-0.4, 0.3, 0.1]}>
          <boxGeometry args={[0.22, 0.05, 0.35]} />
          <meshStandardMaterial color="#9ca3af" />
        </mesh>
      </Interactable>

      {/* Floor clutter: VHS + monster truck */}
      <mesh position={[-0.8, 0.06, -2.6]} castShadow>
        <boxGeometry args={[0.22, 0.08, 0.35]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-0.4, 0.1, -2.3]} castShadow>
        <boxGeometry args={[0.35, 0.16, 0.2]} />
        <meshStandardMaterial color="#dc2626" />
      </mesh>

      {/* Posters */}
      <Poster position={[-4.88, 2.1, 0.4]} rotation={[0, Math.PI / 2, 0]} color="#0ea5e9" label="STREET SHARKS" />
      <Poster position={[-4.88, 2.0, 1.3]} rotation={[0, Math.PI / 2, 0]} color="#ef4444" label="RUN DMC" w={0.5} h={0.65} />
      <Poster position={[-3.2, 2.35, -4.38]} color="#1d4ed8" label="SPACE JAM" w={0.7} h={0.5} />
      <Poster position={[1.6, 2.25, -4.38]} color="#7c3aed" label="GAME ROOM" w={0.85} h={0.35} />

      {/* Neon GAME ROOM sign */}
      <Text position={[1.6, 2.25, -4.3]} fontSize={0.14} color="#f0abfc" outlineWidth={0.01} outlineColor="#86198f">
        GAME ROOM
      </Text>
      <Text position={[1.6, 2.05, -4.3]} fontSize={0.07} color="#67e8f9">
        BETA
      </Text>

      {/* Warm lamps */}
      <pointLight position={[-3.5, 1.4, -2]} intensity={1.1} distance={4} color="#fb923c" />
      <pointLight position={[-1.2, 1.6, -3.3]} intensity={0.9} distance={3.5} color="#fdba74" />
      <pointLight position={[3.2, 2.5, 0]} intensity={0.7} distance={4} color="#facc15" />
      <pointLight position={[0.15, 1.4, -3.8]} intensity={doorOpen ? 2.2 : 0.35} distance={5} color="#c026ff" />
      <pointLight position={[-1.9, 1.35, -3.2]} intensity={0.8} distance={3} color="#22d3ee" />

      <ambientLight intensity={0.22} color="#8b5cf6" />
      <hemisphereLight args={['#312e81', '#1c1917', 0.35]} />

      <GameShelf activeId={activeId} onHover={onHover} onSelect={onSelect} />
    </group>
  );
}
