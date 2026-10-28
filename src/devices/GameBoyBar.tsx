import React from 'react';
import { LAYOUT } from './viewRig';

/**
 * The two big glowing buttons under the Game Boy while you sit in the bean
 * bag: Big Screen (V) and Stand Up (Esc). On a keyboard they sit along the
 * bottom (viewRig keeps the Game Boy above them, LAYOUT.gbBar); on a phone in
 * portrait they sit just above the thumb pad, and in landscape at the bottom
 * of the two thumb columns, so they never cover the screen or the pad.
 */
const TONES = {
  cyan: { ink: '#e6fdff', sub: 'rgba(207,250,254,0.75)', edge: 'rgba(103,232,249,0.85)', glow: 'rgba(34,211,238,0.55)', fill: 'rgba(8,47,73,0.82)' },
  pink: { ink: '#fff0fb', sub: 'rgba(250,232,255,0.75)', edge: 'rgba(240,171,252,0.85)', glow: 'rgba(217,70,239,0.55)', fill: 'rgba(59,7,62,0.82)' },
} as const;

function BarButton({
  tone,
  icon,
  title,
  sub,
  keyCap,
  compact,
  onClick,
  style,
}: {
  tone: keyof typeof TONES;
  icon: string;
  title: string;
  sub: string;
  keyCap: string | null;
  compact: boolean;
  onClick: () => void;
  style?: React.CSSProperties;
}) {
  const t = TONES[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex items-center gap-3 rounded-2xl border-2 text-left transition hover:brightness-125 active:scale-[0.98]"
      style={{
        height: compact ? 52 : 64,
        padding: compact ? '0 12px' : '0 16px',
        minWidth: compact ? 0 : 236,
        color: t.ink,
        background: t.fill,
        borderColor: t.edge,
        boxShadow: `0 0 18px ${t.glow}, 0 0 42px ${t.glow.replace('0.55', '0.25')}, inset 0 0 14px ${t.glow.replace('0.55', '0.3')}`,
        textShadow: `0 0 8px ${t.glow}`,
        ...style,
      }}
    >
      <span aria-hidden className={compact ? 'text-lg' : 'text-2xl'}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block whitespace-nowrap font-black uppercase tracking-[0.14em] ${compact ? 'text-[13px]' : 'text-[16px]'}`}>
          {title}
        </span>
        <span
          className={`block whitespace-nowrap font-bold uppercase ${compact ? 'text-[9px] tracking-[0.06em]' : 'text-[11px] tracking-[0.12em]'}`}
          style={{ color: t.sub }}
        >
          {sub}
        </span>
      </span>
      {keyCap && (
        <kbd
          className="rounded-md border px-2 py-1 font-mono text-[12px] font-black"
          style={{ borderColor: t.edge, boxShadow: `0 2px 0 ${t.edge}`, color: t.ink }}
        >
          {keyCap}
        </kbd>
      )}
    </button>
  );
}

export function GameBoyBar({
  big,
  touch,
  landscape,
  onBig,
  onStand,
}: {
  big: boolean;
  touch: boolean;
  landscape: boolean;
  onBig: () => void;
  onStand: () => void;
}) {
  const compact = touch;
  const bigButton = (style?: React.CSSProperties) => (
    <BarButton
      tone="cyan"
      icon="▣"
      title={big ? 'Small screen' : 'Big screen'}
      sub={big ? 'Back to the Game Boy' : 'View fullscreen'}
      keyCap={touch ? null : 'V'}
      compact={compact}
      onClick={onBig}
      style={style}
    />
  );
  const standButton = (style?: React.CSSProperties) => (
    <BarButton
      tone="pink"
      icon="⬆"
      title="Stand up"
      sub="Exit and stand up"
      keyCap={touch ? null : 'ESC'}
      compact={compact}
      onClick={onStand}
      style={style}
    />
  );

  if (touch && landscape) {
    // One under each thumb column, below the D-pad and below A/B.
    const col: React.CSSProperties = { width: LAYOUT.padSide - 16 };
    return (
      <div data-ui="device" className="pointer-events-none absolute inset-0 z-[55]">
        <div className="absolute bottom-3 left-2 pl-[env(safe-area-inset-left)]">{bigButton(col)}</div>
        <div className="absolute bottom-3 right-2 pr-[env(safe-area-inset-right)]">{standButton(col)}</div>
      </div>
    );
  }

  return (
    <div data-ui="device" className="pointer-events-none absolute inset-0 z-40">
      <div
        className="absolute inset-x-0 flex justify-center gap-3 px-4"
        style={{ bottom: touch ? LAYOUT.padPortrait : 16 }}
      >
        {bigButton(touch ? { flex: 1, maxWidth: 220 } : undefined)}
        {standButton(touch ? { flex: 1, maxWidth: 220 } : undefined)}
      </div>
    </div>
  );
}
