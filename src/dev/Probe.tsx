import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, useGLTF, Center, Bounds } from '@react-three/drei';
import { Suspense } from 'react';
import { withKtx2 } from '../room/ktx2';

function Url({ url }: { url: string }) {
  const { scene } = useGLTF(url, false, true, withKtx2);
  return <Bounds fit clip observe margin={1.1}><Center>{<primitive object={scene} />}</Center></Bounds>;
}
import { SafeRoomModel, type ModelId } from '../room/RoomModel';

export function Probe() {
  const q = new URLSearchParams(location.search);
  const id = q.get('probe') as ModelId;
  const view = q.get('view') ?? 'front';
  const pos: [number, number, number] = view === 'side' ? [3, 0.5, 0] : view === 'top' ? [0, 3, 0.001] : view === 'iso' ? [1.6, 1.6, 2.6] : view === 'back' ? [0, 0.5, -3] : [0, 0.5, 3];
  const lines = [];
  for (let i = -10; i <= 10; i += 1) {
    lines.push(
      <mesh key={'v' + i} position={view === 'side' ? [0.8, 0.5, i / 10] : [i / 10, 0.5, 0.8]} rotation={view === 'side' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <planeGeometry args={[0.003, 2]} />
        <meshBasicMaterial color={i === 0 ? '#ff0' : '#0f0'} transparent opacity={0.6} />
      </mesh>,
      <mesh key={'h' + i} position={view === 'side' ? [0.8, 0.5 + i / 10, 0] : [0, 0.5 + i / 10, 0.8]} rotation={view === 'side' ? [0, Math.PI / 2, 0] : [0, 0, 0]}>
        <planeGeometry args={[2, 0.003]} />
        <meshBasicMaterial color={i === 0 ? '#ff0' : '#0f0'} transparent opacity={0.6} />
      </mesh>,
    );
  }
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#222' }}>
      <Canvas>
        <OrthographicCamera makeDefault position={pos} zoom={Number(q.get('zoom') ?? 600)} onUpdate={c => c.lookAt(0, view === 'top' ? 0 : 0.5, 0)} />
        <ambientLight intensity={2} />
        <directionalLight position={[1, 2, 3]} intensity={2} />
        {q.get('glb') ? <Suspense fallback={null}><Url url={'/' + q.get('glb')! + '.glb'} /></Suspense> : <SafeRoomModel id={id} position={[0, 0, 0]} axis={(q.get('axis') as 'x' | 'y') ?? 'y'} meters={Number(q.get('m') ?? 1)} tintAmount={0} />}
        {view !== 'top' && view !== 'iso' && view !== 'back' && !q.has('nogrid') && lines}
      </Canvas>
    </div>
  );
}
