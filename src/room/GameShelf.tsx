import { Text } from '@react-three/drei';
import { ROOM, SHELF_GAMES } from './roomConfig';
import { HoverTarget, Interactable } from './Interactable';

interface GameShelfProps {
  activeId: string | null;
  onHover: (target: HoverTarget | null) => void;
  onSelect: (target: HoverTarget) => void;
}

function GameBox({
  color,
  accent,
  shortLabel,
}: {
  color: string;
  accent: string;
  shortLabel: string;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.32, 0.42, 0.1]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.08} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      {/* Spine edge accent */}
      <mesh position={[-0.155, 0, 0]} castShadow>
        <boxGeometry args={[0.02, 0.42, 0.1]} />
        <meshStandardMaterial color={accent} roughness={0.4} emissive={accent} emissiveIntensity={0.25} />
      </mesh>
      <Text
        position={[0, 0.02, 0.056]}
        fontSize={0.055}
        color={accent}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.28}
        textAlign="center"
        outlineWidth={0.004}
        outlineColor="#000000"
      >
        {shortLabel}
      </Text>
    </group>
  );
}

export function GameShelf({ activeId, onHover, onSelect }: GameShelfProps) {
  const [sx, sy, sz] = ROOM.shelf.position;
  const { width, height, depth } = ROOM.shelf;

  return (
    <group position={[sx, sy, sz]}>
      {/* Cabinet body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color="#5b3a22" roughness={0.85} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, height / 2, -depth / 2 + 0.02]}>
        <boxGeometry args={[width - 0.08, height - 0.1, 0.04]} />
        <meshStandardMaterial color="#3b2414" roughness={0.9} />
      </mesh>

      {/* Shelves */}
      {[0.55, 1.1, 1.65, 2.15].map((y, i) => (
        <mesh key={i} position={[0, y, 0.02]} receiveShadow>
          <boxGeometry args={[width - 0.12, 0.05, depth - 0.08]} />
          <meshStandardMaterial color="#6b4423" roughness={0.8} />
        </mesh>
      ))}

      {/* Top ornaments */}
      <mesh position={[-0.35, height + 0.12, 0.05]} castShadow>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0.35, height + 0.18, 0]} castShadow>
        <boxGeometry args={[0.28, 0.22, 0.22]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.45} metalness={0.35} />
      </mesh>

      {/* Neon planet sign above shelf */}
      <mesh position={[-0.9, 2.55, 0.1]}>
        <torusGeometry args={[0.18, 0.035, 8, 24]} />
        <meshStandardMaterial color="#c026ff" emissive="#c026ff" emissiveIntensity={1.2} />
      </mesh>

      {SHELF_GAMES.map(game => {
        const x = (game.shelfCol - 1) * 0.38;
        const y = 0.82 + game.shelfRow * 0.55;
        const z = 0.12;
        return (
          <Interactable
            key={game.id}
            id={`game-${game.id}`}
            label={game.label}
            hint="Walk up and click to pull this box off the shelf"
            kind="game"
            gameId={game.id}
            position={[x, y, z]}
            size={[0.36, 0.46, 0.14]}
            activeId={activeId}
            onHover={onHover}
            onSelect={onSelect}
          >
            <GameBox color={game.color} accent={game.accent} shortLabel={game.shortLabel} />
          </Interactable>
        );
      })}
    </group>
  );
}
