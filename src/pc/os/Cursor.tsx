import React, { useEffect, useRef, useState } from 'react';
import { useBusy } from './settings';

/**
 * The mouse pointer is drawn on the screen itself, so it's part of the
 * picture on the monitor (you can see it from across the room) and scales
 * with the glass. The real pointer is hidden over the computer.
 */

type Kind = 'arrow' | 'wait' | 'busy' | 'text' | 'hand' | 'cross' | 'resize';

const ARROW = 'M1 1v16l4-4 3 7 2-1-3-7h6z';

function Shape({ kind }: { kind: Kind }) {
  switch (kind) {
    case 'wait':
      return (
        <svg width="16" height="24" viewBox="0 0 16 24" shapeRendering="crispEdges" style={{ transform: 'translate(-8px,-12px)' }}>
          <rect x="1" y="1" width="14" height="2" fill="#000" />
          <rect x="1" y="21" width="14" height="2" fill="#000" />
          <path d="M3 3h10v3l-4 5v2l4 5v3H3v-3l4-5v-2L3 6z" fill="#fff" stroke="#000" />
          <path className="sand-top" d="M5 6h6l-3 4z" fill="#c08000" />
          <path className="sand-bottom" d="M4 20h8l-4-3z" fill="#c08000" />
        </svg>
      );
    case 'busy':
      return (
        <svg width="28" height="24" viewBox="0 0 28 24" shapeRendering="crispEdges">
          <path d={ARROW} fill="#fff" stroke="#000" />
          <g transform="translate(13 6) scale(.6)">
            <rect x="1" y="1" width="14" height="2" fill="#000" />
            <rect x="1" y="21" width="14" height="2" fill="#000" />
            <path d="M3 3h10v3l-4 5v2l4 5v3H3v-3l4-5v-2L3 6z" fill="#fff" stroke="#000" />
            <path className="sand-top" d="M5 6h6l-3 4z" fill="#c08000" />
          </g>
        </svg>
      );
    case 'text':
      return (
        <svg width="9" height="18" viewBox="0 0 9 18" shapeRendering="crispEdges" style={{ transform: 'translate(-4px,-9px)' }}>
          <path d="M1 1h3v1h1V1h3M4.5 2v14M1 17h3v-1h1v1h3" stroke="#000" strokeWidth="1.5" fill="none" />
        </svg>
      );
    case 'hand':
      return (
        <svg width="18" height="22" viewBox="0 0 18 22" shapeRendering="crispEdges" style={{ transform: 'translate(-5px,0)' }}>
          <path d="M5 1h2v8h1V7h2v2h1V8h2v2h1V9h2v7l-2 4H6l-4-6V11h2v2h1z" fill="#fff" stroke="#000" />
        </svg>
      );
    case 'cross':
      return (
        <svg width="21" height="21" viewBox="0 0 21 21" shapeRendering="crispEdges" style={{ transform: 'translate(-10px,-10px)', mixBlendMode: 'difference' }}>
          <path d="M10.5 0v8M10.5 13v8M0 10.5h8M13 10.5h8" stroke="#fff" strokeWidth="1" />
        </svg>
      );
    case 'resize':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges" style={{ transform: 'translate(-8px,-8px)' }}>
          <path d="M1 1h5L4 3l9 9 2-2v5h-5l2-2-9-9-2 2z" fill="#fff" stroke="#000" />
        </svg>
      );
    default:
      return (
        <svg width="13" height="21" viewBox="0 0 13 21" shapeRendering="crispEdges">
          <path d={ARROW} fill="#fff" stroke="#000" strokeLinejoin="miter" />
        </svg>
      );
  }
}

function kindAt(el: Element | null): Kind {
  if (!el) return 'arrow';
  const marked = el.closest('[data-cursor]') as HTMLElement | null;
  if (marked) return marked.dataset.cursor as Kind;
  if (el.closest('input[type="text"], input[type="password"], input:not([type]), textarea, [contenteditable="true"]')) return 'text';
  if (el.closest('a[href], .link')) return 'hand';
  return 'arrow';
}

export function Cursor({ forced }: { forced?: Kind }) {
  const busy = useBusy();
  const ref = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<Kind>('arrow');

  useEffect(() => {
    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
      setKind(kindAt(document.elementFromPoint(e.clientX, e.clientY)));
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', move);
    };
  }, []);

  const show: Kind = forced ?? (busy ? (kind === 'arrow' ? 'busy' : 'wait') : kind);
  return (
    <div ref={ref} className="soft-cursor" style={{ transform: 'translate(400px, 300px)' }} aria-hidden>
      <Shape kind={show} />
    </div>
  );
}
