import React, { useId } from 'react';

/**
 * WordArt styles and the SVG that draws them: gradient fills, outlines,
 * stacked 3D extrusions, drop shadows, and text bent along arches, waves,
 * circles and slopes.
 */

export type WaShape = 'plain' | 'arch' | 'archDown' | 'wave' | 'slantUp' | 'perspective' | 'circle' | 'tall' | 'bulge';

export interface WaStyle {
  id: number;
  fill: string[];
  /** Gradient direction: across the letters or top to bottom. */
  dir?: 'h' | 'v';
  stroke: string;
  strokeW: number;
  /** 3D extrusion: colour and depth in px, toward the bottom right. */
  extrude?: { color: string; depth: number };
  shadow?: string;
  shape: WaShape;
  font: string;
  italic?: boolean;
  bold?: boolean;
}

const IMPACT = 'Impact, "Arial Black", sans-serif';
const TIMES = '"Times New Roman", Times, serif';
const ARIAL = '"Arial Black", Arial, sans-serif';
const COMIC = '"Comic Sans MS", "Comic Sans", cursive';

export const WA_STYLES: WaStyle[] = [
  { id: 0, fill: ['#000'], stroke: 'none', strokeW: 0, shape: 'plain', font: ARIAL },
  { id: 1, fill: ['#ff0000', '#ff8000', '#ffff00', '#00c000', '#0000ff', '#8000ff'], dir: 'h', stroke: '#000', strokeW: 1, shape: 'slantUp', font: ARIAL, extrude: { color: '#555', depth: 3 } },
  { id: 2, fill: ['#ffd700', '#b8860b'], dir: 'v', stroke: '#5a3a00', strokeW: 1.2, shape: 'plain', font: TIMES, bold: true, extrude: { color: '#7a5200', depth: 6 } },
  { id: 3, fill: ['#c0c0ff', '#2020a0'], dir: 'v', stroke: '#000040', strokeW: 1, shape: 'arch', font: IMPACT },
  { id: 4, fill: ['#ff66cc', '#9900cc'], dir: 'v', stroke: '#330033', strokeW: 1, shape: 'wave', font: COMIC, bold: true, shadow: '#999' },
  { id: 5, fill: ['#e0e0e0', '#808080', '#ffffff', '#606060'], dir: 'v', stroke: '#202020', strokeW: 1, shape: 'perspective', font: ARIAL, extrude: { color: '#303030', depth: 4 } },
  { id: 6, fill: ['#00ff66', '#006633'], dir: 'v', stroke: '#002211', strokeW: 1, shape: 'tall', font: IMPACT },
  { id: 7, fill: ['#ffffff'], stroke: '#0000c0', strokeW: 2, shape: 'archDown', font: TIMES, italic: true, bold: true, shadow: '#0000c0' },
  { id: 8, fill: ['#ff0000', '#800000'], dir: 'v', stroke: '#ffff00', strokeW: 1.5, shape: 'bulge', font: IMPACT, extrude: { color: '#400000', depth: 5 } },
  { id: 9, fill: ['#00ccff', '#ffffff', '#00ccff'], dir: 'v', stroke: '#003366', strokeW: 1, shape: 'circle', font: ARIAL },
  { id: 10, fill: ['#ff9900', '#ffff00'], dir: 'v', stroke: '#cc3300', strokeW: 1.5, shape: 'arch', font: COMIC, bold: true, extrude: { color: '#993300', depth: 3 } },
  { id: 11, fill: ['#9933ff', '#ff33cc', '#ffcc00'], dir: 'h', stroke: '#000', strokeW: 1, shape: 'wave', font: ARIAL, shadow: '#444' },
  { id: 12, fill: ['#ffffff'], stroke: '#000', strokeW: 1.2, shape: 'plain', font: TIMES, italic: true, shadow: '#808080' },
  { id: 13, fill: ['#66ff66', '#ffff66', '#66ffff'], dir: 'h', stroke: '#006600', strokeW: 1, shape: 'perspective', font: IMPACT, extrude: { color: '#004400', depth: 5 } },
  { id: 14, fill: ['#000080', '#4040ff', '#000080'], dir: 'v', stroke: '#ffffff', strokeW: 0.8, shape: 'slantUp', font: TIMES, bold: true, italic: true, extrude: { color: '#000030', depth: 4 } },
];

export interface WaObject {
  id: number;
  text: string;
  style: number;
  shape?: WaShape;
  font?: string;
  size: number;
  bold: boolean;
  italic: boolean;
  x: number;
  y: number;
  rotate: number;
}

function pathFor(shape: WaShape, w: number, h: number) {
  switch (shape) {
    case 'arch':
      return `M ${w * 0.04} ${h * 0.85} Q ${w / 2} ${-h * 0.55} ${w * 0.96} ${h * 0.85}`;
    case 'archDown':
      return `M ${w * 0.04} ${h * 0.3} Q ${w / 2} ${h * 1.45} ${w * 0.96} ${h * 0.3}`;
    case 'wave':
      return `M 0 ${h * 0.65} C ${w * 0.25} ${h * 0.05}, ${w * 0.25} ${h * 0.05}, ${w * 0.5} ${h * 0.6} S ${w * 0.75} ${h * 1.1}, ${w} ${h * 0.5}`;
    case 'circle': {
      const r = Math.min(w, h) * 0.38;
      const cx = w / 2;
      const cy = h / 2;
      return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;
    }
    default:
      return '';
  }
}

/** One piece of WordArt as an SVG. Width follows the text. */
export function WordArtSvg({ obj, preview = false }: { obj: Pick<WaObject, 'text' | 'style' | 'size' | 'bold' | 'italic'> & { shape?: WaShape; font?: string }; preview?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const st = WA_STYLES[obj.style] ?? WA_STYLES[0];
  const shape = obj.shape ?? st.shape;
  const font = obj.font ?? st.font;
  const size = obj.size;
  const text = obj.text || ' ';
  const longest = Math.max(...text.split('\n').map(l => l.length), 1);
  const curved = ['arch', 'archDown', 'wave', 'circle'].includes(shape);
  let w = Math.max(size * 1.2, longest * size * 0.62 + 20);
  let h = size * 1.45;
  if (curved) {
    h = shape === 'circle' ? w * 0.9 : size * 2.6;
    if (shape === 'circle') w = Math.max(w * 0.55, size * 4);
  }
  if (shape === 'tall') h = size * 2.2;
  const gradId = `wa-${uid}`;
  const pathId = `wap-${uid}`;
  const depth = st.extrude ? Math.max(1, Math.round((st.extrude.depth * size) / 48)) : 0;
  const pad = depth + 6;
  const fill = st.fill.length > 1 ? `url(#${gradId})` : st.fill[0];
  const weight = obj.bold || st.bold ? 900 : 700;
  const fontStyle = obj.italic || st.italic ? 'italic' : 'normal';

  const layer = (dx: number, dy: number, color: string | null, key: string) => {
    const common = {
      fontFamily: font,
      fontSize: size,
      fontWeight: weight,
      fontStyle,
      fill: color ?? fill,
      stroke: color ? 'none' : st.stroke,
      strokeWidth: color ? 0 : (st.strokeW * size) / 40,
      paintOrder: 'stroke' as const,
      transform: `translate(${dx} ${dy})`,
    };
    if (curved) {
      return (
        <text key={key} {...common} textAnchor="middle">
          <textPath href={`#${pathId}`} startOffset="50%" textLength={shape === 'circle' ? undefined : undefined}>
            {text.replace(/\n/g, ' ')}
          </textPath>
        </text>
      );
    }
    const lines = text.split('\n');
    return (
      <text key={key} {...common} textAnchor="middle" x={w / 2} y={h * 0.78 - ((lines.length - 1) * size) / 2} textLength={shape === 'bulge' ? w - 16 : undefined} lengthAdjust="spacingAndGlyphs">
        {lines.map((l, i) => (
          <tspan key={i} x={w / 2} dy={i ? size * 1.05 : 0}>
            {l}
          </tspan>
        ))}
      </text>
    );
  };

  const layers: React.ReactNode[] = [];
  if (st.shadow) layers.push(layer(size / 10, size / 10, st.shadow, 'sh'));
  for (let i = depth; i >= 1; i -= 1) layers.push(layer(i, i, st.extrude!.color, `ex${i}`));
  layers.push(layer(0, 0, null, 'face'));

  let groupTransform = '';
  if (shape === 'slantUp') groupTransform = `skewY(-8) translate(0 ${w * 0.07})`;
  if (shape === 'tall') groupTransform = `translate(0 ${-h * 0.35}) scale(1 1.7)`;
  if (shape === 'bulge') groupTransform = '';

  const totalH = h + (shape === 'slantUp' ? w * 0.15 : 0) + pad;
  const svg = (
    <svg width={w + pad} height={totalH} viewBox={`0 0 ${w + pad} ${totalH}`} style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        {st.fill.length > 1 && (
          <linearGradient id={gradId} x1="0" y1="0" x2={st.dir === 'h' ? 1 : 0} y2={st.dir === 'h' ? 0 : 1}>
            {st.fill.map((c, i) => (
              <stop key={i} offset={i / (st.fill.length - 1)} stopColor={c} />
            ))}
          </linearGradient>
        )}
        {curved && <path id={pathId} d={pathFor(shape, w, h)} />}
      </defs>
      <g transform={groupTransform}>{layers}</g>
    </svg>
  );
  if (shape === 'perspective' && !preview) {
    return <div style={{ transform: 'perspective(220px) rotateX(28deg)', transformOrigin: '50% 100%' }}>{svg}</div>;
  }
  if (shape === 'perspective') return <div style={{ transform: 'perspective(120px) rotateX(24deg)' }}>{svg}</div>;
  return svg;
}
