import * as THREE from 'three';

/**
 * A little comic speech bubble pinned over a soldier's head. The 3D side
 * projects the head to the screen a few times a second; this draws it.
 */

export interface Bubble {
  /** Screen position of the head, 0..1 from the top left. */
  x: number;
  y: number;
  who: string;
  text: string;
  /** Shown under the line: "F next", "Talk here"… */
  hint?: string;
}

const _p = new THREE.Vector3();

/** Head position to screen, or null when it is behind the camera. */
export function headOnScreen(camera: THREE.Camera, x: number, y: number, z: number) {
  _p.set(x, y, z).project(camera);
  if (_p.z > 1 || _p.z < -1) return null;
  return { x: THREE.MathUtils.clamp((_p.x + 1) / 2, 0.06, 0.94), y: THREE.MathUtils.clamp((1 - _p.y) / 2, 0.12, 0.9) };
}

export function SpeechBubble({ bubble, onNext, tone = 'green' }: { bubble: Bubble; onNext?: () => void; tone?: 'green' | 'thought' }) {
  const thought = tone === 'thought';
  return (
    <div
      data-army-bubble={thought ? 'thought' : 'talk'}
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
      style={{ left: `${bubble.x * 100}%`, top: `calc(${bubble.y * 100}% - 14px)` }}
    >
      <button
        type="button"
        onClick={onNext}
        className={`${onNext ? 'pointer-events-auto' : 'pointer-events-none'} relative block w-[min(19rem,80vw)] rounded-2xl border-2 px-3 py-2 text-left shadow-[3px_4px_0_rgba(0,0,0,0.55)] ${
          thought ? 'border-white/70 bg-white/90 text-[#1d2a12]' : 'border-[#2f3d1a] bg-[#f3f7e4] text-[#1d2a12]'
        }`}
      >
        <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-[#4f7a1f]">{bubble.who}</span>
        <span className="block text-[13px] font-bold leading-snug">{bubble.text}</span>
        {bubble.hint && <span className="mt-1 block text-[9px] font-black uppercase tracking-[0.18em] text-[#1d2a12]/55">{bubble.hint}</span>}
        <span
          className={`absolute -bottom-[9px] left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 ${
            thought ? 'border-white/70 bg-white/90' : 'border-[#2f3d1a] bg-[#f3f7e4]'
          }`}
        />
      </button>
    </div>
  );
}
