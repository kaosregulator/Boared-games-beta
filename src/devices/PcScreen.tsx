import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { GlassAnchor, GlassSurface } from './GlassScreen';
import { SafeRoomModel } from '../room/RoomModel';
import { audio } from '../tv/noise';
import { speakerInput } from '../tv/surround';
import { SandwichDesk } from './sandwich/SandwichDesk';
import { startSandwich, useSandwichStage } from './sandwich/store';

/**
 * The family computer on the desk. Its Windows 98 (pc.html, src/pc/) runs in
 * an iframe laid onto the CRT's glass the same way the TV picture is: live
 * DOM glued to the 3D surface with a CSS transform (GlassScreen).
 *
 * Across the room the picture sits under the canvas and shows through a hole
 * cut in the monitor (RoomPcGlass), so it glows on the desk and anything in
 * front of it still hides it. Leaning in (device 'pc') swaps to a close-up
 * of the desk with the glass on top, where the mouse and keys reach Windows.
 */

/**
 * The monitor's glass in the desk's placed frame (metres, floor at y = 0,
 * +z toward the front), picked off pcdesk.glb with ?pick-probe=desk. The
 * tube leans back about 10°, so the plane tilts with it.
 */
export const MONITOR = { x: -0.156, y: 0.879, z: 0.019, w: 0.33, h: 0.2475, tilt: -0.18 };
const SCREEN_PX = 800;
/**
 * The build id in the URL makes each deploy a new address, so a browser that
 * still holds an older pc.html (it used to be cached for a day) can't keep
 * showing the old Windows.
 */
const PC_SRC = `/pc.html?boot&v=${import.meta.env?.VITE_BUILD_ID ?? 'dev'}`;

// ---------- power and messages ----------

interface PcState {
  /** Windows is running (or booting), so the screen glows. */
  on: boolean;
  /** Leaning in at the desk: the studio copy carries the glass, not the room's. */
  near: boolean;
}

let state: PcState = { on: false, near: false };
const listeners = new Set<() => void>();
let onEscape: (() => void) | null = null;
let onBig: (() => void) | null = null;

function set(next: PcState) {
  state = next;
  listeners.forEach(l => l());
}

export function usePc() {
  return useSyncExternalStore(
    l => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

/** Switch the computer on: the iframe mounts and boots straight into the BIOS. */
export function powerOnPc() {
  // The click that got us here is the room's, so hand Windows the room's
  // audio context: it's allowed to play now, and the iframe's own wouldn't be.
  const w = window as Window & { __pcAudio?: AudioContext; __pcAudioOut?: AudioNode };
  const ctx = audio();
  if (ctx) {
    w.__pcAudio = ctx;
    // Out of the PC's own spot in the room's surround (SpeakerAnchor 'pc' sits in the monitor).
    w.__pcAudioOut = speakerInput('pc') ?? ctx.destination;
  }
  if (!state.on) set({ ...state, on: true });
}

/** Escape pressed inside Windows (the iframe has the keyboard), so the room steps back. */
export function setPcEscape(fn: (() => void) | null) {
  onEscape = fn;
}

/** F pressed inside Windows (and not into a text box): the room toggles big screen. */
export function setPcBig(fn: (() => void) | null) {
  onBig = fn;
}

if (typeof window !== 'undefined') {
  window.addEventListener('message', e => {
    if (e.origin !== location.origin) return;
    const d = e.data as { source?: string; evt?: string; on?: boolean } | undefined;
    if (d?.source !== 'pc98') return;
    if (d.evt === 'escape') onEscape?.();
    else if (d.evt === 'big') onBig?.();
    // Sandwich Stacker's icon: the game comes out onto the desk (only while sat at it).
    else if (d.evt === 'sandwich' && state.near) startSandwich();
    else if (d.evt === 'power' && d.on === false && state.on) set({ ...state, on: false });
  });
}

let frame: HTMLIFrameElement | null = null;

function tellPc(msg: Record<string, unknown>) {
  frame?.contentWindow?.postMessage({ source: 'pc98-room', ...msg }, location.origin);
}

// ---------- canvas side ----------

const GLASS_POS: [number, number, number] = [MONITOR.x, MONITOR.y, MONITOR.z];
const GLASS_ROT: [number, number, number] = [MONITOR.tilt, 0, 0];

/**
 * In the room, inside the desk's PlacedModel: when the computer is on, a
 * see-through hole the picture shows through; when it's off, dark glass over
 * the desktop picture baked into the model, so it reads as switched off.
 */
export function RoomPcGlass() {
  const { on, near } = usePc();
  const hole = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#000', opacity: 0, blending: THREE.NoBlending, fog: false, toneMapped: false }),
    [],
  );
  const dark = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 48;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(22, 14, 2, 32, 24, 44);
    grd.addColorStop(0, '#2a3236');
    grd.addColorStop(0.5, '#111618');
    grd.addColorStop(1, '#050606');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 48);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  }, []);
  useEffect(
    () => () => {
      hole.dispose();
      dark.map?.dispose();
      dark.dispose();
    },
    [hole, dark],
  );
  return (
    <group position={GLASS_POS} rotation={GLASS_ROT}>
      {on && !near && <GlassAnchor id="pc" position={[0, 0, 0]} width={MONITOR.w} widthPx={SCREEN_PX} />}
      <mesh material={on ? hole : dark} position={[0, 0, on ? 0 : 0.001]}>
        <planeGeometry args={[MONITOR.w * (on ? 1 : 1.03), MONITOR.h * (on ? 1 : 1.04)]} />
      </mesh>
      {on && (
        // the tube's glow spilling onto the desk and keyboard
        <pointLight position={[0, -0.05, 0.25]} color="#9cc8ff" intensity={0.35} distance={1.4} decay={2} />
      )}
    </group>
  );
}

/**
 * Close-up: the desk in the studio, with the glass on its monitor. While
 * Sandwich Stacker is out on the desk, Windows goes under the canvas and shows
 * through a hole (as in the room), so the food can fall in front of the screen.
 */
export function PcStudio() {
  const game = useSandwichStage() !== 'off';
  const hole = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#000', opacity: 0, blending: THREE.NoBlending, fog: false, toneMapped: false }),
    [],
  );
  useEffect(() => () => hole.dispose(), [hole]);
  return (
    <group>
      <SafeRoomModel id="desk" position={[0, 0, 0]} axis="x" meters={1.65} tintAmount={0} />
      <group position={GLASS_POS} rotation={GLASS_ROT}>
        <GlassAnchor id="pc" position={[0, 0, 0]} width={MONITOR.w} widthPx={SCREEN_PX} />
        {game && (
          <mesh material={hole}>
            <planeGeometry args={[MONITOR.w, MONITOR.h]} />
          </mesh>
        )}
      </group>
      {game && <SandwichDesk glass={MONITOR} />}
    </group>
  );
}

/** What the close-up keeps in frame (half extents): the glass and a sliver of beige bezel. */
export const PC_SUBJECT = { centre: [MONITOR.x, MONITOR.y, MONITOR.z] as [number, number, number], w: MONITOR.w * 0.58, h: MONITOR.h * 0.6 };

// ---------- DOM side ----------

/**
 * Windows itself. Mounted once the computer is on, and kept mounted while it
 * stays on so nothing restarts when you lean in or step back.
 */
export function PcGlass({ inRoom }: { inRoom: boolean }) {
  const ref = useRef<HTMLIFrameElement>(null);
  // Sandwich Stacker on the desk has the keys and draws over the screen.
  const game = useSandwichStage() !== 'off';
  const under = inRoom || game;

  useEffect(() => {
    frame = ref.current;
    return () => {
      if (frame === ref.current) frame = null;
    };
  }, []);

  useEffect(() => {
    set({ ...state, near: !inRoom });
    return () => set({ ...state, near: false });
  }, [inRoom]);

  useEffect(() => {
    tellPc({ cmd: 'focus', on: !under });
    if (!under) {
      // hand Windows the keyboard
      const id = window.setTimeout(() => ref.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
    ref.current?.blur();
    window.focus();
  }, [under]);

  return (
    // in the room it sits under the canvas and shows through RoomPcGlass's hole
    <GlassSurface id="pc" zIndex={under ? -1 : 10}>
      <iframe
        ref={ref}
        title="Windows 98"
        src={PC_SRC}
        width={SCREEN_PX}
        height={600}
        allow="autoplay; fullscreen"
        onLoad={() => tellPc({ cmd: 'focus', on: !under })}
        style={{ display: 'block', width: SCREEN_PX, height: 600, border: 0, background: '#000', pointerEvents: under ? 'none' : 'auto' }}
      />
    </GlassSurface>
  );
}
