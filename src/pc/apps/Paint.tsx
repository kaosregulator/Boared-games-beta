import React, { useEffect, useRef, useState } from 'react';
import { setSettings, writeStore } from '../os/settings';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, updateWindow, type WinState } from '../os/wm';

/**
 * Paint: pencil, brush, airbrush, eraser, fill bucket, colour picker, text,
 * line, rectangle, ellipse and rounded rectangle; 28-colour palette with left
 * (foreground) and right (background) colours; undo; flip, invert, zoom;
 * save as PNG; and "Set As Wallpaper", which puts your drawing on the desktop.
 */

type Tool = 'pencil' | 'brush' | 'airbrush' | 'eraser' | 'fill' | 'pick' | 'text' | 'line' | 'rect' | 'ellipse' | 'rrect' | 'zoom' | 'select' | 'curve';
type FillMode = 'outline' | 'both' | 'fill';

const PALETTE = [
  '#000000', '#808080', '#800000', '#808000', '#008000', '#008080', '#000080', '#800080', '#808040', '#004040', '#0080ff', '#004080', '#8000ff', '#804000',
  '#ffffff', '#c0c0c0', '#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffff80', '#00ff80', '#80ffff', '#8080ff', '#ff0080', '#ff8040',
];

const TOOLS: { id: Tool; tip: string; glyph: React.ReactNode }[] = [
  { id: 'select', tip: 'Free-Form Select', glyph: <path d="M3 4l3-2 4 1 4-1 1 4-2 3 1 4-4 1-3-2-3 1-2-4 2-2z" fill="none" stroke="#000" strokeDasharray="2 1" /> },
  { id: 'select', tip: 'Select', glyph: <rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" strokeDasharray="2 1" /> },
  { id: 'eraser', tip: 'Eraser/Color Eraser', glyph: <path d="M3 10l5-6h6l-5 6zm0 0v3h6l5-6v-3" fill="#ff8" stroke="#000" /> },
  { id: 'fill', tip: 'Fill With Color', glyph: <path d="M3 8l5-5 5 5-5 5zm10 0c1 2 2 3 1 5-1 0-2-1-1-5" fill="#ccc" stroke="#000" /> },
  { id: 'pick', tip: 'Pick Color', glyph: <path d="M3 13l7-7 2 2-7 7H3zm8-9l2-2 2 2-2 2z" fill="#ccc" stroke="#000" /> },
  { id: 'zoom', tip: 'Magnifier', glyph: <path d="M7 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm3 7l4 4" fill="#cef" stroke="#000" strokeWidth="1.5" /> },
  { id: 'pencil', tip: 'Pencil', glyph: <path d="M3 13l1-3 8-8 2 2-8 8zm1-3l2 2" fill="#fc6" stroke="#000" /> },
  { id: 'brush', tip: 'Brush', glyph: <path d="M9 2l5 5-4 3-4-4zM6 6l4 4-3 1-3 3-2-2 3-3z" fill="#963" stroke="#000" /> },
  { id: 'airbrush', tip: 'Airbrush', glyph: <path d="M6 7h4v7H6zM7 4h2v3H7zM3 2h1v1H3zm1 2h1v1H4zm-2 1h1v1H2zm9-3h1v1h-1zm1 2h1v1h-1z" fill="#999" stroke="#000" strokeWidth=".5" /> },
  { id: 'text', tip: 'Text', glyph: <text x="8" y="13" textAnchor="middle" fontSize="13" fontFamily="Times New Roman" fontWeight="bold">A</text> },
  { id: 'line', tip: 'Line', glyph: <path d="M2 13L14 3" stroke="#000" strokeWidth="1.5" /> },
  { id: 'curve', tip: 'Curve', glyph: <path d="M2 13C5 0 10 16 14 3" stroke="#000" fill="none" strokeWidth="1.5" /> },
  { id: 'rect', tip: 'Rectangle', glyph: <rect x="2.5" y="3.5" width="11" height="9" fill="none" stroke="#000" /> },
  { id: 'rrect', tip: 'Polygon', glyph: <path d="M3 13l2-9 5 3 4-3-1 9z" fill="none" stroke="#000" /> },
  { id: 'ellipse', tip: 'Ellipse', glyph: <ellipse cx="8" cy="8" rx="6" ry="4.5" fill="none" stroke="#000" /> },
  { id: 'rrect', tip: 'Rounded Rectangle', glyph: <rect x="2.5" y="3.5" width="11" height="9" rx="3" fill="none" stroke="#000" /> },
];

const W = 520;
const H = 340;

function hexToRgb(hex: string) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function floodFill(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const at = (y * W + x) * 4;
  const target = [d[at], d[at + 1], d[at + 2], d[at + 3]];
  const [r, g, b] = hexToRgb(color);
  if (target[0] === r && target[1] === g && target[2] === b && target[3] === 255) return;
  const same = (i: number) => Math.abs(d[i] - target[0]) < 8 && Math.abs(d[i + 1] - target[1]) < 8 && Math.abs(d[i + 2] - target[2]) < 8 && Math.abs(d[i + 3] - target[3]) < 8;
  const stack = [[x, y]];
  while (stack.length) {
    const [sx, sy] = stack.pop()!;
    let lx = sx;
    while (lx >= 0 && same((sy * W + lx) * 4)) lx -= 1;
    lx += 1;
    let up = false;
    let down = false;
    for (let cx = lx; cx < W && same((sy * W + cx) * 4); cx += 1) {
      const i = (sy * W + cx) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      if (sy > 0) {
        const s = same(((sy - 1) * W + cx) * 4);
        if (s && !up) stack.push([cx, sy - 1]);
        up = s;
      }
      if (sy < H - 1) {
        const s = same(((sy + 1) * W + cx) * 4);
        if (s && !down) stack.push([cx, sy + 1]);
        down = s;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function Paint({ win }: { win: WinState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const overlay = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('pencil');
  const [toolIndex, setToolIndex] = useState(6);
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [size, setSize] = useState(2);
  const [fillMode, setFillMode] = useState<FillMode>('outline');
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [text, setText] = useState<{ x: number; y: number; value: string } | null>(null);
  const undo = useRef<ImageData[]>([]);
  const drag = useRef<{ x: number; y: number; color: string; alt: string; lx: number; ly: number } | null>(null);
  const spray = useRef<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const ctx = () => canvas.current!.getContext('2d', { willReadFrequently: true })!;

  useEffect(() => {
    const c = ctx();
    c.fillStyle = '#fff';
    c.fillRect(0, 0, W, H);
    // a little doodle so the canvas isn't empty the first time
    c.font = 'bold 22px "Comic Sans MS", cursive';
    c.fillStyle = '#c0c0c0';
    c.fillText('draw something rad', 140, 175);
  }, []);

  const snapshot = () => {
    undo.current.push(ctx().getImageData(0, 0, W, H));
    if (undo.current.length > 30) undo.current.shift();
  };
  const doUndo = () => {
    const img = undo.current.pop();
    if (img) ctx().putImageData(img, 0, 0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        doUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const local = (e: React.PointerEvent) => {
    const rect = canvas.current!.getBoundingClientRect();
    return [Math.floor(((e.clientX - rect.left) / rect.width) * W), Math.floor(((e.clientY - rect.top) / rect.height) * H)] as const;
  };

  const shape = (c: CanvasRenderingContext2D, t: Tool, x0: number, y0: number, x1: number, y1: number, color: string, alt: string) => {
    c.lineWidth = t === 'line' || t === 'curve' ? size : Math.max(1, size - 1);
    c.strokeStyle = color;
    c.fillStyle = fillMode === 'fill' ? color : alt;
    c.lineCap = 'round';
    c.beginPath();
    if (t === 'line' || t === 'curve') {
      c.moveTo(x0 + 0.5, y0 + 0.5);
      c.lineTo(x1 + 0.5, y1 + 0.5);
      c.stroke();
      return;
    }
    const x = Math.min(x0, x1) + 0.5;
    const y = Math.min(y0, y1) + 0.5;
    const w = Math.abs(x1 - x0);
    const h = Math.abs(y1 - y0);
    if (t === 'rect') c.rect(x, y, w, h);
    else if (t === 'ellipse') c.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else c.roundRect(x, y, w, h, Math.min(12, w / 4, h / 4));
    if (fillMode !== 'outline') c.fill();
    if (fillMode !== 'fill') c.stroke();
  };

  const stroke = (c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string) => {
    if (tool === 'pencil') {
      c.fillStyle = color;
      const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
      for (let i = 0; i <= steps; i += 1) c.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1);
    } else {
      c.strokeStyle = color;
      c.lineWidth = tool === 'eraser' ? size * 4 + 4 : size * 2 + 1;
      c.lineCap = tool === 'eraser' ? 'square' : 'round';
      c.beginPath();
      c.moveTo(x0 + 0.5, y0 + 0.5);
      c.lineTo(x1 + 0.5, y1 + 0.5);
      c.stroke();
    }
  };

  const sprayAt = (x: number, y: number, color: string) => {
    const c = ctx();
    c.fillStyle = color;
    const r = size * 4 + 4;
    for (let i = 0; i < 14; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * r;
      c.fillRect(Math.round(x + Math.cos(a) * d), Math.round(y + Math.sin(a) * d), 1, 1);
    }
  };

  const onDown = (e: React.PointerEvent) => {
    if (text) commitText();
    const [x, y] = local(e);
    const right = e.button === 2;
    const color = right ? bg : fg;
    const alt = right ? fg : bg;
    const c = ctx();
    if (tool === 'pick') {
      const d = c.getImageData(x, y, 1, 1).data;
      const hex = `#${[d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`;
      if (right) setBg(hex);
      else setFg(hex);
      setTool('pencil');
      setToolIndex(6);
      return;
    }
    if (tool === 'zoom') {
      setZoom(z => (z === 1 ? 2 : 1));
      return;
    }
    if (tool === 'select') {
      sfx.ding();
      return;
    }
    snapshot();
    if (tool === 'fill') {
      floodFill(c, x, y, color);
      return;
    }
    if (tool === 'text') {
      setText({ x, y, value: '' });
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x, y, color: tool === 'eraser' ? bg : color, alt, lx: x, ly: y };
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') stroke(c, x, y, x, y, drag.current.color);
    if (tool === 'airbrush') {
      sprayAt(x, y, color);
      spray.current = window.setInterval(() => drag.current && sprayAt(drag.current.lx, drag.current.ly, color), 30);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const [x, y] = local(e);
    setPos([x, y]);
    const d = drag.current;
    if (!d) return;
    if (tool === 'pencil' || tool === 'brush' || tool === 'eraser') {
      stroke(ctx(), d.lx, d.ly, x, y, d.color);
    } else if (tool === 'airbrush') {
      sprayAt(x, y, d.color);
    } else {
      const o = overlay.current!.getContext('2d')!;
      o.clearRect(0, 0, W, H);
      let x1 = x;
      let y1 = y;
      if (e.shiftKey && tool !== 'line') {
        const s = Math.max(Math.abs(x - d.x), Math.abs(y - d.y));
        x1 = d.x + Math.sign(x - d.x) * s;
        y1 = d.y + Math.sign(y - d.y) * s;
      }
      shape(o, tool, d.x, d.y, x1, y1, d.color, d.alt);
    }
    d.lx = x;
    d.ly = y;
  };

  const onUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (spray.current) window.clearInterval(spray.current);
    spray.current = null;
    drag.current = null;
    if (!d) return;
    if (['line', 'curve', 'rect', 'ellipse', 'rrect'].includes(tool)) {
      overlay.current!.getContext('2d')!.clearRect(0, 0, W, H);
      const [x, y] = local(e);
      let x1 = x;
      let y1 = y;
      if (e.shiftKey && tool !== 'line') {
        const s = Math.max(Math.abs(x - d.x), Math.abs(y - d.y));
        x1 = d.x + Math.sign(x - d.x) * s;
        y1 = d.y + Math.sign(y - d.y) * s;
      }
      shape(ctx(), tool, d.x, d.y, x1, y1, d.color, d.alt);
    }
  };

  const commitText = () => {
    if (!text) return;
    if (text.value) {
      const c = ctx();
      c.fillStyle = fg;
      c.font = `${12 + size * 3}px "Times New Roman", serif`;
      c.textBaseline = 'top';
      text.value.split('\n').forEach((line, i) => c.fillText(line, text.x, text.y + i * (14 + size * 3)));
    }
    setText(null);
  };

  const newImage = () => {
    snapshot();
    const c = ctx();
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    updateWindow(win.id, { title: 'untitled - Paint' });
  };

  const save = () => {
    const a = document.createElement('a');
    a.download = 'my_drawing.png';
    a.href = canvas.current!.toDataURL('image/png');
    a.click();
  };

  const asWallpaper = () => {
    writeStore('wallpaper.custom', canvas.current!.toDataURL('image/png'));
    setSettings({ wallpaper: 'custom' });
    sfx.ding();
  };

  const transform = (fn: (c: CanvasRenderingContext2D, src: HTMLCanvasElement) => void) => {
    snapshot();
    const copy = document.createElement('canvas');
    copy.width = W;
    copy.height = H;
    copy.getContext('2d')!.drawImage(canvas.current!, 0, 0);
    const c = ctx();
    c.save();
    fn(c, copy);
    c.restore();
  };

  const invert = () => {
    snapshot();
    const c = ctx();
    const img = c.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = 255 - img.data[i];
      img.data[i + 1] = 255 - img.data[i + 1];
      img.data[i + 2] = 255 - img.data[i + 2];
    }
    c.putImageData(img, 0, 0);
  };

  const open = (file: File) => {
    const img = new Image();
    img.onload = () => {
      snapshot();
      const c = ctx();
      c.fillStyle = '#fff';
      c.fillRect(0, 0, W, H);
      const k = Math.min(W / img.width, H / img.height, 1);
      c.drawImage(img, 0, 0, img.width * k, img.height * k);
      updateWindow(win.id, { title: `${file.name} - Paint` });
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
  };

  const menus = [
    {
      label: 'File',
      items: [
        { label: 'New', onClick: newImage },
        { label: 'Open...', onClick: () => fileInput.current?.click() },
        { label: 'Save As...', onClick: save },
        { label: '', divider: true },
        { label: 'Set As Wallpaper', onClick: asWallpaper },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo           Ctrl+Z', onClick: doUndo },
        { label: '', divider: true },
        { label: 'Clear Image', onClick: newImage },
      ],
    },
    { label: 'View', items: [{ label: 'Normal Size', checked: zoom === 1, onClick: () => setZoom(1) }, { label: 'Large Size', checked: zoom === 2, onClick: () => setZoom(2) }] },
    {
      label: 'Image',
      items: [
        {
          label: 'Flip Horizontal',
          onClick: () =>
            transform((c, src) => {
              c.translate(W, 0);
              c.scale(-1, 1);
              c.drawImage(src, 0, 0);
            }),
        },
        {
          label: 'Flip Vertical',
          onClick: () =>
            transform((c, src) => {
              c.translate(0, H);
              c.scale(1, -1);
              c.drawImage(src, 0, 0);
            }),
        },
        { label: 'Invert Colors', onClick: invert },
        { label: 'Clear Image', onClick: newImage },
      ],
    },
    { label: 'Colors', items: [{ label: 'Swap Colors', onClick: () => (setFg(bg), setBg(fg)) }] },
    { label: 'Help', items: [{ label: 'About Paint', onClick: () => messageBox('About Paint', { icon: 'paint', text: 'Paint\nLeft click draws in the front colour, right click in the back colour.\nFile > Set As Wallpaper puts it on your desktop.', sound: 'none' }) }] },
  ];

  const showSize = ['brush', 'eraser', 'airbrush', 'line', 'curve', 'text'].includes(tool);
  const showFill = ['rect', 'ellipse', 'rrect'].includes(tool);

  return (
    <div className="paint" onContextMenu={e => e.preventDefault()}>
      <MenuBar menus={menus} />
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => e.target.files?.[0] && open(e.target.files[0])} />
      <div className="paint-main">
        <div className="paint-tools">
          <div className="paint-toolgrid">
            {TOOLS.map((t, i) => (
              <button
                key={i}
                type="button"
                title={t.tip}
                className={`paint-tool${toolIndex === i ? ' active' : ''}`}
                onClick={() => {
                  if (text) commitText();
                  setTool(t.id);
                  setToolIndex(i);
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16">
                  {t.glyph}
                </svg>
              </button>
            ))}
          </div>
          <div className="paint-options sunken">
            {showSize &&
              [1, 2, 3, 4].map(s => (
                <button key={s} type="button" className={`paint-size${size === s ? ' active' : ''}`} onClick={() => setSize(s)}>
                  <span style={{ width: tool === 'airbrush' ? s * 5 : 14, height: tool === 'airbrush' ? s * 5 : s * 1.5 + 0.5, borderRadius: tool === 'airbrush' ? '50%' : 0 }} />
                </button>
              ))}
            {showFill &&
              (['outline', 'both', 'fill'] as FillMode[]).map(m => (
                <button key={m} type="button" className={`paint-size${fillMode === m ? ' active' : ''}`} onClick={() => setFillMode(m)}>
                  <span className={`fillmode ${m}`} />
                </button>
              ))}
          </div>
        </div>
        <div className="paint-work">
          <div className="paint-canvas-wrap" style={{ width: W * zoom, height: H * zoom }}>
            <canvas
              ref={canvas}
              width={W}
              height={H}
              style={{ width: W * zoom, height: H * zoom }}
              data-cursor={tool === 'text' ? 'text' : 'cross'}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={() => setPos(null)}
            />
            <canvas ref={overlay} width={W} height={H} className="paint-overlay" style={{ width: W * zoom, height: H * zoom }} />
            {text && (
              <textarea
                autoFocus
                className="paint-text"
                style={{ left: text.x * zoom, top: text.y * zoom, color: fg, font: `${(12 + size * 3) * zoom}px "Times New Roman", serif` }}
                value={text.value}
                onChange={e => setText({ ...text, value: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Escape') {
                    e.stopPropagation();
                    commitText();
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="paint-palette">
        <div className="paint-current">
          <span className="bgc" style={{ background: bg }} />
          <span className="fgc" style={{ background: fg }} />
        </div>
        <div className="paint-colors">
          {PALETTE.map(c => (
            <button
              key={c}
              type="button"
              className="paint-color"
              style={{ background: c }}
              onClick={() => setFg(c)}
              onContextMenu={e => {
                e.preventDefault();
                setBg(c);
              }}
            />
          ))}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">For Help, click Help Topics on the Help Menu.</p>
        <p className="status-bar-field" style={{ flex: '0 0 80px' }}>
          {pos ? `${pos[0]},${pos[1]}` : ''}
        </p>
      </div>
    </div>
  );
}
