import React, { Suspense, useEffect, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { pushHud, type HudAction } from '../table/tableHud';
import { setTableView } from '../table/tableCam';
import { PoochiToy, newDrive, useToyBone, type PoochiDrive } from './PoochiToy';
import { loadPoochiVoice, poochiSay, voiceAt, voiceOver, type PoochiVoice } from './poochiAudio';
import { poochiBus } from './poochiGame';

/**
 * Poo-Chi at the card table. He comes out lying down with his eyes dark,
 * the way he sat in the box. Press his head (click it, or the button) and he
 * starts the way the real one did in the user's recording: the click of the
 * head button, then his eyes come on and he barks.
 *
 * Then he does what the toy did: sings his six songs (two beeps, then the
 * song, with heart eyes and a little dance), barks, sits up to beg, chews his
 * bone, naps. "Call a friend" is the bit everybody remembers: the box said
 * Poo-Chis could talk to each other, and ours never did.
 *
 * "Find my bones" shrinks you down into him (see BoneHunt.tsx).
 *
 * Children of the table top: y 0 is the table surface, you sit at +z.
 */

const AT = new THREE.Vector3(0.0, 0, 0.1);
/** High enough to see his eyes behind the visor on top of his head. */
const CLOSE = { target: [0.0, 0.1, 0.1] as [number, number, number], yaw: 0.3, pitch: 0.55, dist: 0.5 };

type Mood = 'off' | 'waking' | 'idle' | 'song' | 'bark' | 'beg' | 'bone' | 'call' | 'nap';

export function PoochiTable({
  phase,
  onUnfolded,
  onPacked,
  onLeave,
}: {
  phase: 'unfold' | 'play' | 'pack';
  onUnfolded: () => void;
  onPacked: () => void;
  onLeave: () => void;
}) {
  const drive = useRef<PoochiDrive>(newDrive());
  const toy = useRef<THREE.Group>(null);
  const boneRef = useRef<THREE.Group>(null);
  const bone = useToyBone();
  const t = useRef(0);
  const done = useRef(false);
  const mood = useRef<Mood>('off');
  const moodT = useRef(0);
  const song = useRef(0);
  const queued = useRef<{ at: number; fn: () => void }[]>([]);
  const [, setTick] = React.useState(0);
  const awake = useRef(false);

  useEffect(() => {
    void loadPoochiVoice();
    t.current = 0;
    done.current = false;
  }, [phase]);

  function say(id: string, delay = 0): PoochiVoice | null {
    drive.current.voice?.stop();
    const v = poochiSay(id, { delay });
    drive.current.voice = v;
    return v;
  }

  function later(seconds: number, fn: () => void) {
    queued.current.push({ at: moodT.current + seconds, fn });
  }

  function setMood(next: Mood) {
    mood.current = next;
    moodT.current = 0;
    queued.current = [];
    const d = drive.current;
    d.dance = 0;
    d.walk = 0;
    if (next !== 'bone' && boneRef.current) boneRef.current.visible = false;
    setTick(n => n + 1);
  }

  function pressHead() {
    if (awake.current) {
      // Pressed while he's on: he answers with a bark, like the toy.
      if (mood.current === 'nap') wake();
      else bark();
      return;
    }
    wake();
  }

  function wake() {
    awake.current = true;
    setMood('waking');
    say('press');
    const d = drive.current;
    later(0.4, () => {
      d.eyes = 'open';
      d.pose = 'stand';
    });
    later(0.9, () => {
      say('bark4');
      d.eyes = 'happy';
    });
    later(2.2, () => {
      d.eyes = 'open';
      setMood('idle');
    });
  }

  function sing() {
    setMood('song');
    const n = (song.current % 6) + 1;
    song.current += 1;
    const d = drive.current;
    d.pose = 'stand';
    d.eyes = 'open';
    say('beep');
    later(0.75, () => {
      const v = say(`song${n}`);
      d.eyes = 'heart';
      d.dance = 1;
      if (!v) later(3, () => setMood('idle'));
    });
  }

  function bark() {
    setMood('bark');
    const d = drive.current;
    d.pose = 'stand';
    d.eyes = 'happy';
    say('bark');
    later(1.0, () => {
      d.eyes = 'open';
      setMood('idle');
    });
  }

  function beg() {
    setMood('beg');
    const d = drive.current;
    d.pose = 'beg';
    d.eyes = 'heart';
    say('bark2');
    later(3.2, () => {
      d.pose = 'stand';
      d.eyes = 'open';
      setMood('idle');
    });
  }

  function giveBone() {
    setMood('bone');
    const d = drive.current;
    d.pose = 'beg';
    d.eyes = 'happy';
    if (boneRef.current) boneRef.current.visible = true;
    say('bark4');
    later(2.6, () => {
      d.pose = 'stand';
      d.eyes = 'open';
    });
  }

  function callFriend() {
    setMood('call');
    const d = drive.current;
    d.pose = 'stand';
    d.eyes = 'open';
    say('beep');
    later(1.0, () => say('beep'));
    later(1.6, () => {
      d.eyes = 'closed';
    });
    later(3.2, () => {
      d.eyes = 'open';
      say('bark-a');
      setMood('idle');
    });
  }

  function nap() {
    setMood('nap');
    const d = drive.current;
    d.voice?.stop();
    d.eyes = 'closed';
    d.pose = 'lie';
  }

  useEffect(() => {
    if (phase !== 'play') return;
    setTableView(CLOSE, true);
  }, [phase]);

  // The HUD changes with what he's doing.
  useEffect(() => {
    if (phase !== 'play') return;
    const m = mood.current;
    const hunt: HudAction = { label: 'Find my bones', tone: 'amber', onClick: () => poochiBus.hunt?.() };
    if (!awake.current) {
      pushHud({
        title: 'Poo-Chi',
        note: 'Lying there with his eyes dark. Press his head to turn him on.',
        detail: 'Tap his head, or the button.',
        onLeave,
        dock: 'bottom',
        actions: [{ label: 'Press his head', tone: 'amber', onClick: pressHead }],
      });
      return () => pushHud(null);
    }
    const notes: Record<Mood, string> = {
      off: '',
      waking: 'Click. His eyes light up…',
      idle: 'He\'s on. Sing, bark, beg, give him his bone, or help him find his bones.',
      song: `Song ${((song.current - 1) % 6) + 1} of 6. Heart eyes, and he's dancing.`,
      bark: 'Arf!',
      beg: 'Sitting up, begging. Who could say no to that face?',
      bone: 'His bone! He loves it. The rest of his bones are lost all over the room…',
      call: 'Calling your friend\'s Poo-Chi… beep… beep… no answer. We never got the update that let them talk.',
      nap: 'Night night. Press his head to wake him.',
    };
    pushHud({
      title: 'Poo-Chi',
      note: notes[m],
      detail: m === 'call' ? 'The box promised. The box lied.' : undefined,
      onLeave,
      dock: 'bottom',
      actions: [
        { label: song.current ? 'Next song' : 'Sing', onClick: sing },
        { label: 'Bark', onClick: bark },
        { label: 'Beg', onClick: beg },
        { label: 'Give bone', onClick: giveBone },
        { label: 'Call a friend', onClick: callFriend },
        { label: m === 'nap' ? 'Wake up' : 'Nap', onClick: m === 'nap' ? wake : nap },
        hunt,
      ],
    });
    return () => pushHud(null);
    // The actions read refs; the HUD is rebuilt on every mood change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, onLeave, mood.current]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    t.current += dt;
    moodT.current += dt;
    const due = queued.current.filter(q => q.at <= moodT.current);
    if (due.length) {
      queued.current = queued.current.filter(q => q.at > moodT.current);
      due.forEach(q => q.fn());
    }
    const d = drive.current;
    // A song ends on its own: back to standing.
    if (mood.current === 'song' && moodT.current > 1.5 && voiceOver(d.voice)) setMood('idle');
    if (mood.current === 'song' && voiceAt(d.voice) > 0) d.eyes = Math.floor(voiceAt(d.voice) / 4) % 3 === 2 ? 'happy' : 'heart';

    const g = toy.current;
    if (!g) return;
    let s = 1;
    if (phase === 'unfold') {
      // He drops onto the table.
      const k = Math.min(1, t.current / 0.6);
      g.position.set(AT.x, (1 - k * k) * 0.25, AT.z);
      if (k >= 1 && !done.current && t.current > 0.9) {
        done.current = true;
        onUnfolded();
      }
    } else if (phase === 'pack') {
      d.voice?.stop();
      s = Math.max(0.001, 1 - t.current / 0.5);
      if (t.current > 0.6 && !done.current) {
        done.current = true;
        onPacked();
      }
    } else {
      g.position.copy(AT);
    }
    g.scale.setScalar(s);
    g.rotation.y = 0.25;
  });

  return (
    <group>
      <group ref={toy}>
        <Suspense fallback={null}>
          <PoochiToy drive={drive} />
        </Suspense>
        {/* His head: click it to press the button. */}
        <mesh
          position={[0, 0.13, 0.05]}
          onPointerDown={(e: ThreeEvent<PointerEvent>) => {
            if (phase !== 'play') return;
            e.stopPropagation();
            pressHead();
          }}
        >
          <boxGeometry args={[0.12, 0.08, 0.13]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <group ref={boneRef} visible={false} position={[0.0, 0, 0.16]} rotation={[0, 0.5, 0]}>
          {bone && <primitive object={bone} />}
        </group>
      </group>
    </group>
  );
}
