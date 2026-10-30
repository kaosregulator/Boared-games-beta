import React, { useMemo, useState } from 'react';
import { clouds, sunset, tile } from './art';
import { Icon, type IconName } from './icons';
import { launch } from './launch';
import { CRUNCHLING, openWebGame, playSandwich, THING_THING } from '../apps/webgames';
import { readStore, useSettings, type Wallpaper } from './settings';
import { sfx } from './sound';
import { focusWindow, messageBox } from './wm';

interface DeskIcon {
  id: string;
  label: string;
  icon: IconName;
  open: () => void;
}

export const DESK_ICONS: DeskIcon[] = [
  { id: 'computer', label: 'My Computer', icon: 'computer', open: () => launch('explorer', 'My Computer') },
  { id: 'documents', label: 'My Documents', icon: 'documents', open: () => launch('explorer', 'My Documents', 'My Documents') },
  { id: 'ie', label: 'Internet Explorer', icon: 'ie', open: () => launch('ie') },
  { id: 'network', label: 'Network Neighborhood', icon: 'network', open: () => launch('explorer', 'Network Neighborhood', 'Network Neighborhood') },
  { id: 'recycle', label: 'Recycle Bin', icon: 'recycleFull', open: () => launch('explorer', 'Recycle Bin', 'Recycle Bin') },
  { id: 'media', label: 'Media Player', icon: 'media', open: () => launch('media') },
  { id: 'pinball', label: 'Pinball', icon: 'pinball', open: () => launch('pinball') },
  { id: 'sandwich', label: 'Sandwich Stacker', icon: 'sandwich', open: () => playSandwich() },
  { id: 'thing', label: 'Thing-Thing', icon: 'thing', open: () => openWebGame(THING_THING) },
  { id: 'crunch', label: "Cap'n Crunch", icon: 'crunch', open: () => openWebGame(CRUNCHLING) },
  { id: 'arcade', label: 'CN Arcade', icon: 'arcade', open: () => launch('arcade') },
  { id: 'tetris', label: 'Tetris', icon: 'tetris', open: () => launch('tetris') },
  { id: 'mine', label: 'Minesweeper', icon: 'mine', open: () => launch('minesweeper') },
  { id: 'paint', label: 'Paint', icon: 'paint', open: () => launch('paint') },
  { id: 'wordart', label: 'WordArt', icon: 'wordart', open: () => launch('wordpad', { wordart: true }, 'WordArt - WordPad') },
  { id: 'solitaire', label: 'Solitaire', icon: 'solitaire', open: () => launch('solitaire') },
  { id: 'notepad', label: 'Notepad', icon: 'notepad', open: () => launch('notepad') },
  { id: 'y2k', label: 'Y2K_COUNTDOWN.EXE', icon: 'warning', open: () => launch('y2k') },
];

const ROWS = 7;

export function wallpaperStyle(w: Wallpaper): React.CSSProperties {
  switch (w) {
    case 'clouds':
      return { backgroundImage: `url(${clouds(400, 300, 4, { deep: '#3a76c8', light: '#a8d0f2' })})`, backgroundSize: '100% 100%' };
    case 'setup':
      return { background: 'radial-gradient(ellipse at 50% 40%, #1f5aa8 0%, #0a2a68 55%, #020a28 100%)' };
    case 'tiles':
    case 'bubbles':
    case 'carved':
      return { backgroundImage: `url(${tile(w)})`, backgroundRepeat: 'repeat' };
    case 'custom': {
      const img = readStore<string>('wallpaper.custom', '');
      return img ? { background: `#008080 url(${img}) center / contain no-repeat` } : { background: '#008080' };
    }
    case 'sunset':
      return { backgroundImage: `url(${sunset()})`, backgroundSize: '100% 100%' };
    default:
      return { background: '#008080' };
  }
}

export function Desktop() {
  const { wallpaper } = useSettings();
  const [selected, setSelected] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const bg = useMemo(() => wallpaperStyle(wallpaper), [wallpaper]);

  return (
    <div
      className="desktop"
      style={bg}
      onPointerDown={e => {
        if (e.target === e.currentTarget) {
          setSelected(null);
          setMenu(null);
          focusWindow(null);
        }
      }}
      onContextMenu={e => {
        e.preventDefault();
        if (e.target === e.currentTarget) setMenu({ x: e.clientX, y: e.clientY });
      }}
    >
      {wallpaper === 'setup' && (
        <div className="setup-wall">
          <div>Windows 98</div>
          <small>Welcome to the future. It's 1998.</small>
        </div>
      )}
      {DESK_ICONS.map((d, i) => (
        <button
          key={d.id}
          type="button"
          className={`desk-icon${selected === d.id ? ' selected' : ''}`}
          style={{ left: 6 + Math.floor(i / ROWS) * 78, top: 6 + (i % ROWS) * 72 }}
          onPointerDown={() => {
            setSelected(d.id);
            setMenu(null);
          }}
          onDoubleClick={() => {
            sfx.click();
            d.open();
          }}
          onKeyDown={e => e.key === 'Enter' && d.open()}
        >
          <span className="desk-icon-img">
            <Icon name={d.icon} />
          </span>
          <span className="desk-icon-label">{d.label}</span>
        </button>
      ))}
      {menu && (
        <div className="context-menu" style={{ left: Math.min(menu.x, 640), top: Math.min(menu.y, 420) }} onPointerLeave={() => setMenu(null)}>
          {[
            ['Arrange Icons', () => sfx.ding()],
            ['Line up Icons', () => sfx.ding()],
            ['', null],
            ['Refresh', () => sfx.click()],
            ['', null],
            ['Paste', null],
            ['New ▸', () => launch('notepad')],
            ['', null],
            ['Active Desktop ▸', () => messageBox('Active Desktop', { icon: 'info', text: 'Active Desktop needs a 56K modem and a lot of patience.', sound: 'ding' })],
            ['Properties', () => launch('display')],
          ].map(([label, fn], i) =>
            label ? (
              <button
                key={i}
                type="button"
                className="dropdown-item"
                disabled={!fn}
                onClick={() => {
                  setMenu(null);
                  (fn as () => void)();
                }}
              >
                <span className="check" />
                {label as string}
              </button>
            ) : (
              <div key={i} className="dropdown-divider" />
            ),
          )}
        </div>
      )}
    </div>
  );
}
