import React from 'react';

/**
 * Desktop and menu icons. Where Windows had one, it's the real Microsoft icon
 * (public/pc/icons, extracted by the wieslawsoltes/Win95 project, 16 and 32 px).
 * Everything else is hand drawn here in the same late-90s style: hard pixel
 * edges, light from the top left, a black outline.
 */

export type IconName =
  | 'computer'
  | 'documents'
  | 'ie'
  | 'recycle'
  | 'recycleFull'
  | 'network'
  | 'mine'
  | 'pinball'
  | 'paint'
  | 'wordart'
  | 'wordpad'
  | 'media'
  | 'notepad'
  | 'folder'
  | 'folderOpen'
  | 'drive'
  | 'floppy'
  | 'cd'
  | 'control'
  | 'display'
  | 'help'
  | 'run'
  | 'find'
  | 'shutdown'
  | 'programs'
  | 'settings'
  | 'logoff'
  | 'textfile'
  | 'docfile'
  | 'imagefile'
  | 'speaker'
  | 'warning'
  | 'error'
  | 'info'
  | 'question'
  | 'dialup'
  | 'solitaire'
  | 'pipes'
  | 'freecell'
  | 'hearts'
  | 'spider'
  | 'tetris'
  | 'taipei'
  | 'pegged'
  | 'arcade'
  | 'sandwich'
  | 'crunch'
  | 'thing'
  | 'dos';

/** The real Windows icon for a name, by file stem in public/pc/icons. */
const REAL: Partial<Record<IconName, string>> = {
  computer: 'my-computer',
  documents: 'documents',
  recycle: 'recycle-bin-empty',
  recycleFull: 'recycle-bin-full',
  network: 'network-neighborhood',
  mine: 'minesweeper',
  paint: 'paint',
  wordpad: 'wordpad',
  media: 'media-player',
  notepad: 'notepad',
  folder: 'folder',
  folderOpen: 'folder-open',
  drive: 'hard-drive',
  floppy: 'floppy',
  cd: 'cd-drive',
  control: 'control-panel',
  display: 'display',
  help: 'help',
  run: 'run',
  find: 'find',
  shutdown: 'shut-down',
  programs: 'programs',
  settings: 'settings',
  textfile: 'text-document',
  docfile: 'document',
  speaker: 'volume',
  solitaire: 'solitaire',
  freecell: 'freecell',
  hearts: 'hearts',
  dos: 'dos-prompt',
};

const O = '#000';

function Svg({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" shapeRendering="crispEdges" style={{ display: 'block', imageRendering: 'pixelated' }}>
      {children}
    </svg>
  );
}

function Monitor({ x = 2, y = 2, screen = '#008080' }: { x?: number; y?: number; screen?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={1} y={0} width={24} height={19} fill="#c0c0c0" stroke={O} strokeWidth={1} />
      <rect x={2} y={1} width={22} height={1} fill="#fff" />
      <rect x={4} y={3} width={18} height={13} fill={O} />
      <rect x={5} y={4} width={16} height={11} fill={screen} />
      <rect x={6} y={5} width={4} height={1} fill="#7ff" opacity={0.6} />
      <rect x={9} y={19} width={8} height={2} fill="#808080" />
      <rect x={5} y={21} width={16} height={3} fill="#c0c0c0" stroke={O} strokeWidth={1} />
    </g>
  );
}

function FolderShape({ open = false, color = '#ffdf6f' }: { open?: boolean; color?: string }) {
  return (
    <g>
      <path d="M3 8h9l2 3h15v16H3z" fill="#c8a43a" stroke={O} />
      {open ? <path d="M6 14h25l-3 13H3z" fill={color} stroke={O} /> : <rect x={3} y={12} width={26} height={15} fill={color} stroke={O} />}
      <rect x={4} y={13} width={24} height={1} fill="#fff6c0" />
    </g>
  );
}

function Page({ x = 7, y = 3, lines = true, fold = true }: { x?: number; y?: number; lines?: boolean; fold?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={fold ? 'M0 0h13l5 5v21H0z' : 'M0 0h18v26H0z'} fill="#fff" stroke={O} />
      {fold && <path d="M13 0v5h5" fill="#c0c0c0" stroke={O} />}
      {lines && [8, 11, 14, 17, 20].map(ly => <rect key={ly} x={3} y={ly} width={ly === 20 ? 7 : 12} height={1} fill="#808080" />)}
    </g>
  );
}

function Bubble({ color, glyph }: { color: string; glyph: React.ReactNode }) {
  return (
    <g>
      <circle cx={16} cy={16} r={13} fill={color} stroke={O} shapeRendering="auto" />
      <circle cx={12} cy={11} r={4} fill="#fff" opacity={0.35} shapeRendering="auto" />
      {glyph}
    </g>
  );
}

const DRAW: Record<IconName, () => React.ReactNode> = {
  computer: () => (
    <>
      <Monitor />
      <rect x={26} y={9} width={5} height={18} fill="#c0c0c0" stroke={O} />
      <rect x={27} y={12} width={3} height={1} fill="#404040" />
      <rect x={27} y={24} width={2} height={1} fill="#0f0" />
    </>
  ),
  documents: () => (
    <>
      <FolderShape />
      <Page x={9} y={4} />
    </>
  ),
  ie: () => (
    <>
      <circle cx={16} cy={17} r={11} fill="#1d6fd8" stroke={O} shapeRendering="auto" />
      <path d="M10 17h13c0-4-3-6-6.5-6S10 13.5 10 17zm0 1c0 4 3 6 6.5 6 2.5 0 4.5-1 5.5-3" fill="none" stroke="#bfe3ff" strokeWidth={3} shapeRendering="auto" />
      <ellipse cx={16} cy={16} rx={15} ry={6} fill="none" stroke="#f5c400" strokeWidth={2} transform="rotate(-25 16 16)" shapeRendering="auto" />
    </>
  ),
  recycle: () => (
    <>
      <path d="M7 9h18l-2 20H9z" fill="#d8d8d8" stroke={O} />
      <rect x={6} y={6} width={20} height={3} fill="#b0b0b0" stroke={O} />
      {[11, 15, 19].map(x => <rect key={x} x={x} y={12} width={1} height={14} fill="#808080" />)}
      <path d="M13 16l3-3 3 3m-3-3v7" stroke="#0a8a2a" strokeWidth={1.5} fill="none" shapeRendering="auto" />
    </>
  ),
  recycleFull: () => (
    <>
      <path d="M8 3l5 2-3 4zM19 2l4 4-6 2zM14 1h4v5h-4z" fill="#fff" stroke={O} />
      {DRAW.recycle()}
    </>
  ),
  network: () => (
    <>
      <g transform="scale(.7) translate(-1 0)">
        <Monitor />
      </g>
      <g transform="scale(.7) translate(17 14)">
        <Monitor />
      </g>
      <path d="M9 24v5h14v-5" fill="none" stroke={O} />
    </>
  ),
  mine: () => (
    <>
      <rect x={1} y={1} width={30} height={30} fill="#c0c0c0" stroke="#808080" />
      <g stroke={O} strokeWidth={2}>
        <path d="M16 4v24M4 16h24M8 8l16 16M24 8L8 24" />
      </g>
      <circle cx={16} cy={16} r={8} fill={O} shapeRendering="auto" />
      <rect x={12} y={12} width={3} height={3} fill="#fff" />
    </>
  ),
  pinball: () => (
    <>
      <path d="M4 2h24l2 28H2z" fill="#140b4a" stroke={O} />
      <circle cx={10} cy={9} r={3} fill="#ff3cac" stroke="#fff" shapeRendering="auto" />
      <circle cx={21} cy={11} r={3} fill="#2bd2ff" stroke="#fff" shapeRendering="auto" />
      <circle cx={15} cy={16} r={2.5} fill="#e0e0e0" stroke="#666" shapeRendering="auto" />
      <path d="M6 26l7 2M26 26l-7 2" stroke="#ffcc00" strokeWidth={3} shapeRendering="auto" />
      <path d="M8 5h3M20 4h4" stroke="#ffd" />
    </>
  ),
  paint: () => (
    <>
      <path d="M3 15c0-8 7-12 14-12s13 4 13 11c0 4-3 5-6 5h-3c-2 0-3 2-2 4 1 3-1 5-5 5C7 28 3 22 3 15z" fill="#e8d3a0" stroke={O} shapeRendering="auto" />
      <circle cx={9} cy={13} r={2.4} fill="#e00" shapeRendering="auto" />
      <circle cx={14} cy={8} r={2.4} fill="#00c" shapeRendering="auto" />
      <circle cx={21} cy={8} r={2.4} fill="#0a0" shapeRendering="auto" />
      <circle cx={10} cy={20} r={2.4} fill="#ff0" stroke="#aa0" shapeRendering="auto" />
      <path d="M18 30l10-17 2 1-9 17z" fill="#8b4a12" stroke={O} />
      <path d="M27 12l2-4 2 1-1 5z" fill="#333" />
    </>
  ),
  wordart: () => (
    <>
      <defs>
        <linearGradient id="wa-g" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#ff0" />
          <stop offset=".5" stopColor="#f60" />
          <stop offset="1" stopColor="#c0f" />
        </linearGradient>
      </defs>
      <text x={18} y={27} fontFamily="Times New Roman, serif" fontWeight="bold" fontStyle="italic" fontSize={30} fill="#333" textAnchor="middle" shapeRendering="auto">A</text>
      <text x={16} y={25} fontFamily="Times New Roman, serif" fontWeight="bold" fontStyle="italic" fontSize={30} fill="url(#wa-g)" stroke={O} strokeWidth={0.8} textAnchor="middle" shapeRendering="auto">A</text>
    </>
  ),
  wordpad: () => (
    <>
      <Page x={6} y={3} />
      <path d="M17 24l11-14 3 2-11 14-4 1z" fill="#ffd040" stroke={O} />
      <path d="M16 27l1-3 3 2z" fill={O} />
    </>
  ),
  media: () => (
    <>
      <circle cx={16} cy={16} r={13} fill="#1a2a6a" stroke={O} shapeRendering="auto" />
      <circle cx={16} cy={16} r={10} fill="#3e7bd6" shapeRendering="auto" />
      <path d="M13 10v12l10-6z" fill="#fff" stroke={O} />
      <path d="M6 12a11 11 0 0 1 6-6" stroke="#9cf" fill="none" shapeRendering="auto" />
    </>
  ),
  notepad: () => (
    <>
      <rect x={6} y={4} width={20} height={25} fill="#fff" stroke={O} />
      <rect x={6} y={4} width={20} height={4} fill="#4b7bd8" stroke={O} />
      {[6, 10, 14, 18, 22].map(x => <rect key={x} x={x} y={2} width={2} height={4} fill="#808080" />)}
      {[12, 15, 18, 21, 24].map(y => <rect key={y} x={9} y={y} width={14} height={1} fill="#9ab" />)}
    </>
  ),
  folder: () => <FolderShape />,
  folderOpen: () => <FolderShape open />,
  drive: () => (
    <>
      <rect x={2} y={11} width={28} height={12} fill="#c0c0c0" stroke={O} />
      <rect x={3} y={12} width={26} height={1} fill="#fff" />
      <rect x={5} y={17} width={14} height={2} fill="#606060" />
      <rect x={24} y={17} width={3} height={2} fill="#0f0" />
    </>
  ),
  floppy: () => (
    <>
      <path d="M4 4h22l3 3v21H4z" fill="#2b2b2b" stroke={O} />
      <rect x={9} y={4} width={13} height={9} fill="#d0d0d0" />
      <rect x={17} y={6} width={3} height={5} fill="#2b2b2b" />
      <rect x={8} y={17} width={17} height={11} fill="#f4f4f4" />
      <rect x={10} y={20} width={13} height={1} fill="#c00" />
    </>
  ),
  cd: () => (
    <>
      <rect x={2} y={14} width={28} height={10} fill="#c0c0c0" stroke={O} />
      <circle cx={16} cy={11} r={9} fill="#d8e8f0" stroke={O} shapeRendering="auto" />
      <circle cx={16} cy={11} r={9} fill="url(#cd-r)" opacity={0.6} shapeRendering="auto" />
      <defs>
        <linearGradient id="cd-r" x1="0" x2="1">
          <stop offset="0" stopColor="#f0f" />
          <stop offset=".5" stopColor="#0ff" />
          <stop offset="1" stopColor="#ff0" />
        </linearGradient>
      </defs>
      <circle cx={16} cy={11} r={2} fill="#fff" stroke={O} shapeRendering="auto" />
    </>
  ),
  control: () => (
    <>
      <FolderShape />
      <rect x={9} y={14} width={7} height={8} fill="#c0c0c0" stroke={O} />
      <circle cx={21} cy={19} r={4} fill="#e33" stroke={O} shapeRendering="auto" />
      <rect x={11} y={16} width={3} height={2} fill="#0a0" />
    </>
  ),
  display: () => <Monitor screen="#3a6ea5" />,
  help: () => (
    <>
      <path d="M5 4h18l4 3v22H9l-4-3z" fill="#2a5aa8" stroke={O} />
      <rect x={9} y={7} width={18} height={22} fill="#3d78d0" stroke={O} />
      <text x={18} y={24} fontFamily="Times New Roman, serif" fontWeight="bold" fontSize={16} fill="#ff0" textAnchor="middle" shapeRendering="auto">?</text>
    </>
  ),
  run: () => (
    <>
      <rect x={3} y={6} width={26} height={20} fill="#c0c0c0" stroke={O} />
      <rect x={3} y={6} width={26} height={4} fill="#000080" />
      <rect x={7} y={15} width={18} height={5} fill="#fff" stroke="#808080" />
      <path d="M22 26l6-6 2 2-6 6z" fill="#ff0" stroke={O} />
    </>
  ),
  find: () => (
    <>
      <Page x={4} y={3} />
      <circle cx={20} cy={18} r={6} fill="#bfe8ff" stroke={O} strokeWidth={2} shapeRendering="auto" />
      <path d="M24 23l5 5" stroke="#5a3a10" strokeWidth={3} shapeRendering="auto" />
    </>
  ),
  shutdown: () => (
    <>
      <Monitor screen="#000" />
      <path d="M12 9a5 5 0 1 0 6 0M15 6v6" stroke="#f33" strokeWidth={1.5} fill="none" shapeRendering="auto" />
    </>
  ),
  programs: () => (
    <>
      <FolderShape />
      <rect x={10} y={15} width={12} height={9} fill="#c0c0c0" stroke={O} />
      <rect x={10} y={15} width={12} height={2} fill="#000080" />
    </>
  ),
  settings: () => (
    <>
      <FolderShape />
      <circle cx={16} cy={20} r={5} fill="#808080" stroke={O} shapeRendering="auto" />
      <circle cx={16} cy={20} r={2} fill="#ffdf6f" stroke={O} shapeRendering="auto" />
    </>
  ),
  logoff: () => (
    <>
      <rect x={6} y={3} width={16} height={26} fill="#5a7ad8" stroke={O} />
      <rect x={8} y={5} width={12} height={22} fill="#90b0ff" />
      <path d="M18 16h12m-4-4l4 4-4 4" stroke="#0a0" strokeWidth={2} fill="none" />
    </>
  ),
  textfile: () => <Page />,
  docfile: () => (
    <>
      <Page />
      <rect x={4} y={14} width={12} height={12} fill="#1d4aa8" stroke={O} />
      <text x={10} y={24} fontFamily="Times New Roman, serif" fontWeight="bold" fontSize={11} fill="#fff" textAnchor="middle" shapeRendering="auto">W</text>
    </>
  ),
  imagefile: () => (
    <>
      <Page lines={false} />
      <rect x={9} y={10} width={13} height={12} fill="#6cf" />
      <path d="M9 22l5-6 3 3 2-2 3 5z" fill="#2a2" />
      <circle cx={19} cy={13} r={2} fill="#ff0" />
    </>
  ),
  speaker: () => (
    <>
      <path d="M4 12h6l8-7v22l-8-7H4z" fill="#c0c0c0" stroke={O} />
      <path d="M22 11c2 2 2 8 0 10M25 8c4 4 4 12 0 16" stroke={O} strokeWidth={1.5} fill="none" shapeRendering="auto" />
    </>
  ),
  warning: () => (
    <>
      <path d="M16 2L30 29H2z" fill="#ff0" stroke={O} strokeLinejoin="round" shapeRendering="auto" />
      <rect x={15} y={10} width={3} height={11} fill={O} />
      <rect x={15} y={23} width={3} height={3} fill={O} />
    </>
  ),
  error: () => <Bubble color="#e00" glyph={<path d="M10 10l12 12M22 10L10 22" stroke="#fff" strokeWidth={3.5} shapeRendering="auto" />} />,
  info: () => (
    <Bubble
      color="#fff"
      glyph={
        <>
          <rect x={14} y={13} width={4} height={11} fill="#00c" />
          <rect x={14} y={7} width={4} height={4} fill="#00c" />
        </>
      }
    />
  ),
  question: () => (
    <Bubble color="#fff" glyph={<text x={16} y={23} fontFamily="Times New Roman, serif" fontWeight="bold" fontSize={19} fill="#00c" textAnchor="middle" shapeRendering="auto">?</text>} />
  ),
  dialup: () => (
    <>
      <g transform="scale(.8)">
        <Monitor />
      </g>
      <path d="M20 22c3-3 8-3 10 0l-2 2h-6z" fill="#333" stroke={O} />
      <path d="M22 18c2-2 4-2 6 0M20 15c4-4 8-4 11 0" stroke="#0a0" fill="none" shapeRendering="auto" />
    </>
  ),
  solitaire: () => (
    <>
      <rect x={3} y={5} width={16} height={22} rx={2} fill="#fff" stroke={O} shapeRendering="auto" />
      <rect x={12} y={3} width={16} height={22} rx={2} fill="#fff" stroke={O} shapeRendering="auto" />
      <text x={20} y={19} fontSize={14} fill="#c00" textAnchor="middle" shapeRendering="auto">♥</text>
      <text x={7} y={14} fontSize={9} fill="#000" textAnchor="middle" shapeRendering="auto">♠</text>
    </>
  ),
  freecell: () => DRAW.solitaire(),
  hearts: () => DRAW.solitaire(),
  spider: () => (
    <>
      <rect x={3} y={5} width={16} height={22} rx={2} fill="#fff" stroke={O} shapeRendering="auto" />
      <rect x={12} y={3} width={16} height={22} rx={2} fill="#fff" stroke={O} shapeRendering="auto" />
      <circle cx={20} cy={14} r={4} fill="#000" />
      <path d="M14 10l3 3M14 18l3-2M26 10l-3 3M26 18l-3-2M15 14h-2M25 14h2" stroke="#000" />
    </>
  ),
  tetris: () => (
    <>
      <rect x={2} y={18} width={8} height={8} fill="#e33" stroke={O} />
      <rect x={10} y={18} width={8} height={8} fill="#e33" stroke={O} />
      <rect x={10} y={10} width={8} height={8} fill="#e33" stroke={O} />
      <rect x={18} y={18} width={8} height={8} fill="#36d" stroke={O} />
      <rect x={18} y={10} width={8} height={8} fill="#fc3" stroke={O} />
      <rect x={18} y={2} width={8} height={8} fill="#fc3" stroke={O} />
      <rect x={2} y={26} width={28} height={4} fill="#808080" stroke={O} />
    </>
  ),
  taipei: () => (
    <>
      <rect x={7} y={4} width={18} height={24} fill="#f4ecd0" stroke={O} />
      <rect x={4} y={7} width={18} height={24} fill="#fffbe8" stroke={O} />
      <text x={13} y={24} fontSize={14} fill="#a00" textAnchor="middle" shapeRendering="auto">中</text>
    </>
  ),
  pegged: () => (
    <>
      <rect x={2} y={2} width={28} height={28} fill="#a0522d" stroke={O} />
      {[7, 13, 19, 25].flatMap(x => [7, 13, 19, 25].map(y => <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill={(x + y) % 12 === 2 ? '#3a1d0c' : '#fd4'} stroke={O} strokeWidth={0.6} shapeRendering="auto" />))}
    </>
  ),
  arcade: () => (
    <>
      <rect x={2} y={2} width={28} height={28} fill="#fff" stroke={O} />
      {[0, 1, 2, 3].flatMap(i => [0, 1, 2, 3].map(j => ((i + j) % 2 ? <rect key={`${i}${j}`} x={2 + i * 7} y={2 + j * 7} width={7} height={7} fill="#000" /> : null)))}
      <rect x={6} y={10} width={20} height={12} fill="#fff" stroke={O} />
      <text x={16} y={20} fontSize={10} fontWeight="bold" fill="#000" textAnchor="middle" shapeRendering="auto">CN</text>
    </>
  ),
  sandwich: () => (
    <>
      <path d="M3 9c0-5 26-5 26 0z" fill="#e3a857" stroke={O} />
      <rect x={3} y={9} width={26} height={3} fill="#5c3" />
      <rect x={3} y={12} width={26} height={3} fill="#e44" />
      <rect x={3} y={15} width={26} height={3} fill="#fd3" />
      <rect x={3} y={18} width={26} height={4} fill="#a0522d" />
      <rect x={3} y={22} width={26} height={5} fill="#e3a857" stroke={O} />
    </>
  ),
  // A cereal box with a crunchling peeking over the top.
  crunch: () => (
    <>
      <rect x={7} y={6} width={18} height={24} fill="#1f4fbf" stroke={O} />
      <rect x={9} y={10} width={14} height={7} fill="#f2c200" stroke={O} />
      <rect x={9} y={19} width={14} height={8} fill="#e33" />
      <circle cx={13} cy={23} r={1.6} fill="#fd3" />
      <circle cx={18} cy={22} r={1.6} fill="#fd3" />
      <circle cx={16} cy={25} r={1.6} fill="#fd3" />
      <circle cx={16} cy={5} r={4} fill="#7c3" stroke={O} />
      <circle cx={14.5} cy={4} r={0.9} fill="#000" />
      <circle cx={17.5} cy={4} r={0.9} fill="#000" />
    </>
  ),
  thing: () => (
    <>
      <rect x={1} y={1} width={30} height={30} fill="#222" />
      <circle cx={16} cy={8} r={4} fill="#fff" />
      <path d="M16 12v9M16 21l-5 8M16 21l5 8M16 15l-7 3M16 15l9-4" stroke="#fff" strokeWidth={2} fill="none" />
      <rect x={24} y={9} width={6} height={2} fill="#c00" />
    </>
  ),
  dos: () => (
    <>
      <rect x={2} y={4} width={28} height={22} fill="#000" stroke="#808080" />
      <text x={5} y={16} fontSize={8} fill="#c0c0c0" fontFamily="monospace" shapeRendering="auto">C:\&gt;_</text>
    </>
  ),
  pipes: () => (
    <>
      <rect x={1} y={1} width={30} height={30} fill="#000" />
      <path d="M4 24h10V8h14" stroke="#3c6" strokeWidth={4} fill="none" />
      <path d="M8 4v12h18v12" stroke="#e44" strokeWidth={4} fill="none" />
      <circle cx={14} cy={24} r={3} fill="#5e8" />
    </>
  ),
};

export function Icon({ name, size = 32 }: { name: IconName; size?: number }) {
  const real = REAL[name];
  if (real) {
    const px = size <= 20 ? 16 : 32;
    return <img src={`/pc/icons/${real}-${px}.png`} width={size} height={size} alt="" draggable={false} style={{ display: 'block', imageRendering: 'pixelated' }} />;
  }
  return <Svg size={size}>{DRAW[name]()}</Svg>;
}

/** The waving four-colour flag on the Start button and the splash screen. */
export function Flag({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ display: 'block' }}>
      <g transform="skewY(-8) translate(0 4)">
        <path d="M2 6c4-2 8-2 13 0v11c-5-2-9-2-13 0z" fill="#f24f1c" />
        <path d="M17 6.5c5 2 9 2 13 0v11c-4 2-8 2-13 0z" fill="#80bb00" />
        <path d="M2 19c4-2 8-2 13 0v11c-5-2-9-2-13 0z" fill="#00a2ed" />
        <path d="M17 19.5c5 2 9 2 13 0v11c-4 2-8 2-13 0z" fill="#ffb900" />
      </g>
    </svg>
  );
}
