import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '../os/icons';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, updateWindow, type WinState } from '../os/wm';
import { WA_STYLES, WordArtSvg, type WaObject, type WaShape } from './wordart';

/**
 * WordPad with WordArt. Type in the page, pick fonts and sizes from the
 * toolbar, then Insert > WordArt: choose a style from the gallery, type your
 * text, and it lands on the page where you can drag it, double-click to edit,
 * bend it into another shape, rotate it, or delete it.
 */

const FONTS = ['Times New Roman', 'Arial', 'Arial Black', 'Comic Sans MS', 'Courier New', 'Impact', 'Georgia', 'Verdana', 'Trebuchet MS'];
const SIZES = [8, 10, 12, 14, 18, 24, 36, 48, 72];
const SHAPES: WaShape[] = ['plain', 'arch', 'archDown', 'wave', 'slantUp', 'perspective', 'circle', 'tall', 'bulge'];
const SHAPE_NAMES: Record<WaShape, string> = {
  plain: 'Plain Text',
  arch: 'Arch Up',
  archDown: 'Arch Down',
  wave: 'Wave',
  slantUp: 'Slant Up',
  perspective: 'Fade Away',
  circle: 'Circle',
  tall: 'Stretch',
  bulge: 'Wide',
};

const BOOK_REPORT = `<p><b>Book Report: Goosebumps #1, Welcome to Dead House</b></p><p>By Player, Grade 5</p><p>This book is about a family that moves into a house that is VERY creepy. I would give it 10 out of 10 thumbs up. The end was the best part because I won't spoil it.</p><p>In conclusion, reading is fun. The end.</p>`;

let nextWa = 1;

export function WordPad({ win }: { win: WinState }) {
  const arg = (win.arg ?? {}) as { wordart?: boolean; file?: string };
  const page = useRef<HTMLDivElement>(null);
  const [font, setFont] = useState('Times New Roman');
  const [fontSize, setFontSize] = useState(12);
  const [arts, setArts] = useState<WaObject[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [gallery, setGallery] = useState<{ editing?: number } | null>(arg.wordart ? {} : null);
  const [editText, setEditText] = useState<{ style: number; editing?: number } | null>(null);
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!page.current) return;
    page.current.innerHTML = arg.file === 'book_report' ? BOOK_REPORT : arg.wordart ? '<p><br></p>' : '<p><br></p>';
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected === null) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if ((e.target as HTMLElement)?.closest('[contenteditable="true"], input, textarea')) return;
        setArts(a => a.filter(x => x.id !== selected));
        setSelected(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const exec = (cmd: string, value?: string) => {
    page.current?.focus();
    document.execCommand(cmd, false, value);
  };

  const insertWordArt = (style: number, text: string, f: string | undefined, size: number, bold: boolean, italic: boolean, editing?: number) => {
    if (editing !== undefined) {
      setArts(a => a.map(x => (x.id === editing ? { ...x, style, text, font: f, size, bold, italic } : x)));
      setSelected(editing);
      return;
    }
    const scroll = page.current?.parentElement?.scrollTop ?? 0;
    const id = nextWa++;
    setArts(a => [...a, { id, text, style, font: f, size, bold, italic, x: 40 + (a.length % 4) * 20, y: 30 + scroll + (a.length % 4) * 30, rotate: 0 }]);
    setSelected(id);
    sfx.click();
  };

  const sel = arts.find(a => a.id === selected) ?? null;
  const patchSel = (patch: Partial<WaObject>) => selected !== null && setArts(a => a.map(x => (x.id === selected ? { ...x, ...patch } : x)));

  const save = () => {
    const html = `<html><body style="font-family:'${font}'">${page.current?.innerHTML ?? ''}</body></html>`;
    const a = document.createElement('a');
    a.download = 'Document.html';
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.click();
  };

  const menus = [
    {
      label: 'File',
      items: [
        {
          label: 'New',
          onClick: () => {
            if (page.current) page.current.innerHTML = '<p><br></p>';
            setArts([]);
            updateWindow(win.id, { title: 'Document - WordPad' });
          },
        },
        { label: 'Save As...', onClick: save },
        { label: 'Print...', onClick: () => messageBox('Print', { icon: 'warning', text: 'The printer is out of cyan. It is always out of cyan.', sound: 'exclaim' }) },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', onClick: () => exec('undo') },
        { label: 'Select All', onClick: () => exec('selectAll') },
      ],
    },
    {
      label: 'Insert',
      items: [
        { label: 'WordArt...', onClick: () => setGallery({}) },
        { label: 'Date and Time...', onClick: () => exec('insertText', new Date().toLocaleString()) },
      ],
    },
    {
      label: 'Format',
      items: [
        { label: 'Bold', onClick: () => exec('bold') },
        { label: 'Italic', onClick: () => exec('italic') },
        { label: 'Underline', onClick: () => exec('underline') },
        { label: 'Bullet Style', onClick: () => exec('insertUnorderedList') },
      ],
    },
    { label: 'Help', items: [{ label: 'About WordPad', onClick: () => messageBox('About WordPad', { icon: 'wordpad', text: 'WordPad with WordArt.\nInsert > WordArt to make your words amazing.', sound: 'none' }) }] },
  ];

  return (
    <div className="wordpad" onPointerDown={e => !(e.target as HTMLElement).closest('.wa-obj, .wa-toolbar, .wa-dialog') && setSelected(null)}>
      <MenuBar menus={menus} />
      <div className="wp-toolbar">
        <select value={font} onChange={e => { setFont(e.target.value); exec('fontName', e.target.value); }} style={{ width: 130 }}>
          {FONTS.map(f => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          value={fontSize}
          onChange={e => {
            const v = Number(e.target.value);
            setFontSize(v);
            const level = v <= 8 ? 1 : v <= 10 ? 2 : v <= 12 ? 3 : v <= 14 ? 4 : v <= 18 ? 5 : v <= 24 ? 6 : 7;
            exec('fontSize', String(level));
          }}
          style={{ width: 48 }}
        >
          {SIZES.map(s => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button type="button" className="tb" onClick={() => exec('bold')}>
          <b>B</b>
        </button>
        <button type="button" className="tb" onClick={() => exec('italic')}>
          <i>I</i>
        </button>
        <button type="button" className="tb" onClick={() => exec('underline')}>
          <u>U</u>
        </button>
        <input type="color" className="tb-color" title="Color" onChange={e => exec('foreColor', e.target.value)} />
        <button type="button" className="tb" onClick={() => exec('justifyLeft')}>⯇</button>
        <button type="button" className="tb" onClick={() => exec('justifyCenter')}>≡</button>
        <button type="button" className="tb" onClick={() => exec('justifyRight')}>⯈</button>
        <button type="button" className="tb wa-insert" title="Insert WordArt" onClick={() => setGallery({})}>
          <Icon name="wordart" size={16} />
          <span>WordArt</span>
        </button>
      </div>
      <div className="wp-ruler" />
      <div className="wp-scroll">
        <div className="wp-page">
          <div
            ref={page}
            className="wp-text"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            style={{ fontFamily: font, fontSize }}
          />
          {arts.map(a => (
            <div
              key={a.id}
              className={`wa-obj${selected === a.id ? ' selected' : ''}`}
              data-cursor={selected === a.id ? 'resize' : undefined}
              style={{ left: a.x, top: a.y, transform: `rotate(${a.rotate}deg)` }}
              onPointerDown={e => {
                e.stopPropagation();
                setSelected(a.id);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = { id: a.id, dx: e.clientX - a.x, dy: e.clientY - a.y };
              }}
              onPointerMove={e => {
                const d = drag.current;
                if (!d) return;
                setArts(list => list.map(x => (x.id === d.id ? { ...x, x: e.clientX - d.dx, y: e.clientY - d.dy } : x)));
              }}
              onPointerUp={() => (drag.current = null)}
              onDoubleClick={() => setEditText({ style: a.style, editing: a.id })}
            >
              <WordArtSvg obj={a} />
            </div>
          ))}
        </div>
      </div>
      {sel && (
        <div className="wa-toolbar window">
          <div className="title-bar">
            <div className="title-bar-text">WordArt</div>
          </div>
          <div className="wa-tools">
            <button type="button" onClick={() => setEditText({ style: sel.style, editing: sel.id })}>Edit Text...</button>
            <button type="button" title="WordArt Gallery" onClick={() => setGallery({ editing: sel.id })}>
              Gallery
            </button>
            <select value={sel.shape ?? WA_STYLES[sel.style].shape} onChange={e => patchSel({ shape: e.target.value as WaShape })} title="WordArt Shape">
              {SHAPES.map(s => (
                <option key={s} value={s}>
                  {SHAPE_NAMES[s]}
                </option>
              ))}
            </select>
            <button type="button" title="Rotate" onClick={() => patchSel({ rotate: (sel.rotate + 15) % 360 })}>
              ↻
            </button>
            <button type="button" title="Bigger" onClick={() => patchSel({ size: Math.min(110, sel.size + 6) })}>
              A+
            </button>
            <button type="button" title="Smaller" onClick={() => patchSel({ size: Math.max(14, sel.size - 6) })}>
              A−
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => {
                setArts(list => list.filter(x => x.id !== sel.id));
                setSelected(null);
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="status-bar">
        <p className="status-bar-field">{sel ? 'Drag WordArt to move it. Double-click to edit the text.' : 'For Help, press F1'}</p>
        <p className="status-bar-field" style={{ flex: '0 0 50px' }}>NUM</p>
      </div>
      <Paperclip onWordArt={() => setGallery({})} report={arg.file === 'book_report'} />
      {gallery && (
        <Gallery
          onCancel={() => setGallery(null)}
          onPick={style => {
            const editing = gallery.editing;
            setGallery(null);
            if (editing !== undefined) {
              setArts(list => list.map(x => (x.id === editing ? { ...x, style, shape: undefined } : x)));
              return;
            }
            setEditText({ style });
          }}
        />
      )}
      {editText && (
        <EditText
          initial={editText.editing !== undefined ? arts.find(a => a.id === editText.editing) : undefined}
          style={editText.style}
          onCancel={() => setEditText(null)}
          onOk={(text, f, size, bold, italic) => {
            insertWordArt(editText.style, text, f, size, bold, italic, editText.editing);
            setEditText(null);
          }}
        />
      )}
    </div>
  );
}

function Gallery({ onPick, onCancel }: { onPick: (style: number) => void; onCancel: () => void }) {
  const [pick, setPick] = useState(1);
  return (
    <div className="wa-modal">
      <div className="window wa-dialog" style={{ width: 430 }}>
        <div className="title-bar">
          <div className="title-bar-text">WordArt Gallery</div>
          <div className="title-bar-controls">
            <button aria-label="Help" />
            <button aria-label="Close" onClick={onCancel} />
          </div>
        </div>
        <div className="window-body">
          <p style={{ margin: '2px 0 6px' }}>
            Select a <u>W</u>ordArt style:
          </p>
          <div className="wa-grid sunken">
            {WA_STYLES.map(s => (
              <button
                key={s.id}
                type="button"
                className={`wa-cell${pick === s.id ? ' picked' : ''}`}
                onClick={() => setPick(s.id)}
                onDoubleClick={() => onPick(s.id)}
              >
                <WordArtSvg obj={{ text: 'WordArt', style: s.id, size: 15, bold: false, italic: false }} preview />
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => onPick(pick)}>
              OK
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditText({
  initial,
  style,
  onOk,
  onCancel,
}: {
  initial?: WaObject;
  style: number;
  onOk: (text: string, font: string | undefined, size: number, bold: boolean, italic: boolean) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(initial?.text ?? 'Your Text Here');
  const [font, setFont] = useState(initial?.font ?? '');
  const [size, setSize] = useState(initial?.size ?? 40);
  const [bold, setBold] = useState(initial?.bold ?? false);
  const [italic, setItalic] = useState(initial?.italic ?? false);
  const area = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    area.current?.focus();
    area.current?.select();
  }, []);
  return (
    <div className="wa-modal">
      <div className="window wa-dialog" style={{ width: 400 }}>
        <div className="title-bar">
          <div className="title-bar-text">Edit WordArt Text</div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onCancel} />
          </div>
        </div>
        <div className="window-body">
          <div className="field-row" style={{ gap: 6 }}>
            <label>
              <u>F</u>ont:
            </label>
            <select value={font} onChange={e => setFont(e.target.value)} style={{ flex: 1 }}>
              <option value="">(style's own)</option>
              {FONTS.map(f => (
                <option key={f} value={`"${f}"`}>
                  {f}
                </option>
              ))}
            </select>
            <label>
              <u>S</u>ize:
            </label>
            <select value={size} onChange={e => setSize(Number(e.target.value))} style={{ width: 52 }}>
              {[20, 28, 36, 40, 48, 60, 72, 96].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <button type="button" className={`tb${bold ? ' on' : ''}`} onClick={() => setBold(b => !b)}>
              <b>B</b>
            </button>
            <button type="button" className={`tb${italic ? ' on' : ''}`} onClick={() => setItalic(b => !b)}>
              <i>I</i>
            </button>
          </div>
          <p style={{ margin: '8px 0 2px' }}>
            <u>T</u>ext:
          </p>
          <textarea ref={area} value={text} onChange={e => setText(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', fontSize: 16 }} />
          <div className="wa-preview sunken">
            <WordArtSvg obj={{ text, style, size: 30, bold, italic, font: font || undefined }} preview />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 8 }}>
            <button type="button" onClick={() => onOk(text, font || undefined, size, bold, italic)}>
              OK
            </button>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The paperclip who always knew what you were writing. Drawn for this project. */
function Paperclip({ onWordArt, report }: { onWordArt: () => void; report: boolean }) {
  const [shown, setShown] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setShown(true);
      sfx.exclaim();
    }, 5000);
    return () => window.clearTimeout(id);
  }, []);
  if (!shown) return null;
  return (
    <div className="paperclip">
      <div className="paperclip-bubble">
        {line ? (
          <>
            <p>{line}</p>
            <button type="button" onClick={() => setShown(false)}>
              OK
            </button>
          </>
        ) : (
          <>
            <p>It looks like you're writing {report ? 'a book report' : 'a letter'}. Would you like help?</p>
            <button
              type="button"
              onClick={() => {
                setLine("Tip: nothing says 'A+' like a WordArt title. Teachers LOVE rainbow letters.");
                onWordArt();
              }}
            >
              • Get help with writing it
            </button>
            <button type="button" onClick={() => setShown(false)}>
              • Just type without help
            </button>
            <button type="button" onClick={() => setLine("I'll be back. I'm always back.")}>
              • Don't show me this tip again
            </button>
          </>
        )}
      </div>
      <svg width="46" height="70" viewBox="0 0 46 70" aria-hidden>
        <path d="M14 66V18a9 9 0 0 1 18 0v40a5 5 0 0 1-10 0V22" fill="none" stroke="#9aa0ac" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 66V18a9 9 0 0 1 18 0v40a5 5 0 0 1-10 0V22" fill="none" stroke="#e8ecf4" strokeWidth="1.5" strokeLinecap="round" />
        <ellipse cx="17" cy="26" rx="5" ry="6" fill="#fff" stroke="#000" />
        <ellipse cx="30" cy="26" rx="5" ry="6" fill="#fff" stroke="#000" />
        <circle cx="18.5" cy="27" r="2.2" fill="#000" />
        <circle cx="31.5" cy="27" r="2.2" fill="#000" />
        <path d="M11 17q6-5 10 0M26 17q6-5 10 0" stroke="#000" fill="none" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
