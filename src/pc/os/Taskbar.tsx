import React, { useEffect, useState } from 'react';
import { Flag, Icon, type IconName } from './icons';
import { launch } from './launch';
import { getSettings, setSettings, useSettings } from './settings';
import { getVolume, setVolume, sfx } from './sound';
import { messageBox, minimizeWindow, toggleFromTaskbar, useWm } from './wm';

export interface StartItem {
  label: string;
  icon?: IconName;
  big?: boolean;
  divider?: boolean;
  onClick?: () => void;
  children?: StartItem[];
}

function buildStart(onShutDown: () => void, onLogOff: () => void): StartItem[] {
  const user = getSettings().user;
  return [
    { label: 'Windows Update', icon: 'ie', big: true, onClick: () => launch('ie', 'update') },
    { label: '', divider: true },
    {
      label: 'Programs',
      icon: 'programs',
      big: true,
      children: [
        {
          label: 'Accessories',
          icon: 'programs',
          children: [
            { label: 'Entertainment', icon: 'programs', children: [{ label: 'Windows Media Player', icon: 'media', onClick: () => launch('media') }] },
            {
              label: 'Games',
              icon: 'programs',
              children: [
                { label: 'Minesweeper', icon: 'mine', onClick: () => launch('minesweeper') },
                { label: 'Pinball', icon: 'pinball', onClick: () => launch('pinball') },
                { label: 'Solitaire', icon: 'solitaire', onClick: () => launch('solitaire') },
              ],
            },
            { label: 'Notepad', icon: 'notepad', onClick: () => launch('notepad') },
            { label: 'Paint', icon: 'paint', onClick: () => launch('paint') },
            { label: 'WordPad', icon: 'wordpad', onClick: () => launch('wordpad') },
            { label: 'WordArt', icon: 'wordart', onClick: () => launch('wordpad', { wordart: true }, 'WordArt - WordPad') },
          ],
        },
        { label: 'Internet Explorer', icon: 'ie', onClick: () => launch('ie') },
        { label: 'MS-DOS Prompt', icon: 'run', onClick: onShutDown },
        { label: 'Windows Explorer', icon: 'folderOpen', onClick: () => launch('explorer', 'My Computer') },
      ],
    },
    {
      label: 'Favorites',
      icon: 'folder',
      big: true,
      children: [
        { label: 'Channels', icon: 'folder', onClick: () => launch('ie', 'channels') },
        { label: 'Cool Sites', icon: 'ie', onClick: () => launch('ie', 'cool') },
        { label: 'Under Construction', icon: 'ie', onClick: () => launch('ie') },
      ],
    },
    {
      label: 'Documents',
      icon: 'documents',
      big: true,
      children: [
        { label: 'book_report_FINAL.doc', icon: 'docfile', onClick: () => launch('wordpad', { file: 'book_report' }, 'book_report_FINAL - WordPad') },
        { label: 'readme.txt', icon: 'textfile', onClick: () => launch('notepad', 'readme', 'readme - Notepad') },
        { label: 'cheat_codes.txt', icon: 'textfile', onClick: () => launch('notepad', 'cheats', 'cheat_codes - Notepad') },
      ],
    },
    {
      label: 'Settings',
      icon: 'settings',
      big: true,
      children: [
        { label: 'Control Panel', icon: 'control', onClick: () => launch('explorer', 'Control Panel', 'Control Panel') },
        { label: 'Display', icon: 'display', onClick: () => launch('display') },
        {
          label: 'Taskbar & Start Menu...',
          icon: 'settings',
          onClick: () => messageBox('Taskbar Properties', { icon: 'info', text: 'The taskbar is perfect the way it is.', sound: 'ding' }),
        },
      ],
    },
    {
      label: 'Find',
      icon: 'find',
      big: true,
      children: [
        { label: 'Files or Folders...', icon: 'find', onClick: () => launch('explorer', 'My Documents', 'Find: All Files') },
        { label: 'On the Internet...', icon: 'ie', onClick: () => launch('ie', 'search') },
        { label: 'People...', icon: 'find', onClick: () => messageBox('Find People', { icon: 'info', text: 'Everybody is outside playing. Try the backyard.', sound: 'ding' }) },
      ],
    },
    { label: 'Help', icon: 'help', big: true, onClick: () => launch('help') },
    { label: 'Run...', icon: 'run', big: true, onClick: () => launch('run') },
    { label: '', divider: true },
    { label: `Log Off ${user}...`, icon: 'logoff', big: true, onClick: onLogOff },
    { label: 'Shut Down...', icon: 'shutdown', big: true, onClick: onShutDown },
  ];
}

function Submenu({ items, depth, close }: { items: StartItem[]; depth: number; close: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={depth === 0 ? 'start-items' : 'submenu'}>
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="dropdown-divider" />
        ) : (
          <div key={i} className="start-row-wrap" onPointerEnter={() => {
            setOpen(it.children ? i : null);
            if (it.children) sfx.menu();
          }}>
            <button
              type="button"
              className={`start-row${it.big ? ' big' : ''}${open === i ? ' open' : ''}`}
              onClick={() => {
                if (it.children) {
                  setOpen(i);
                  return;
                }
                close();
                sfx.click();
                it.onClick?.();
              }}
            >
              {it.icon && <Icon name={it.icon} size={it.big ? 32 : 16} />}
              <span className="start-label">{it.label}</span>
              {it.children && <span className="start-arrow">▸</span>}
            </button>
            {open === i && it.children && <Submenu items={it.children} depth={depth + 1} close={close} />}
          </div>
        ),
      )}
    </div>
  );
}

export function StartMenu({ onClose, onShutDown, onLogOff }: { onClose: () => void; onShutDown: () => void; onLogOff: () => void }) {
  const items = buildStart(onShutDown, onLogOff);
  return (
    <div className="start-menu window" onPointerDown={e => e.stopPropagation()}>
      <div className="start-banner">
        <span>
          <b>Windows</b>98
        </span>
      </div>
      <Submenu items={items} depth={0} close={onClose} />
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span title={now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}>
      {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
    </span>
  );
}

function VolumeTray() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(getVolume());
  useSettings();
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="tray-btn" onClick={() => setOpen(o => !o)} aria-label="Volume">
        <Icon name="speaker" size={16} />
      </button>
      {open && (
        <div className="volume-pop window" onPointerDown={e => e.stopPropagation()}>
          <div className="window-body" style={{ margin: 6, textAlign: 'center' }}>
            <div>Volume</div>
            <input
              type="range"
              className="has-box-indicator"
              min={0}
              max={100}
              value={Math.round(vol * 100)}
              onChange={e => {
                const v = Number(e.target.value) / 100;
                setVol(v);
                setVolume(v);
                setSettings({ volume: v });
              }}
              onPointerUp={() => sfx.ding()}
              style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 90, width: 24 }}
            />
            <div className="field-row" style={{ justifyContent: 'center' }}>
              <input
                id="pc-mute"
                type="checkbox"
                checked={vol === 0}
                onChange={e => {
                  const v = e.target.checked ? 0 : 0.8;
                  setVol(v);
                  setVolume(v);
                }}
              />
              <label htmlFor="pc-mute">Mute</label>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

export function Taskbar({ startOpen, onStart }: { startOpen: boolean; onStart: () => void }) {
  const { windows, focused } = useWm();
  const tasks = windows;
  return (
    <div className="taskbar">
      <button type="button" className={`start-button${startOpen ? ' pressed' : ''}`} onPointerDown={e => e.stopPropagation()} onClick={onStart}>
        <Flag size={16} />
        <b>Start</b>
      </button>
      <div className="taskbar-sep" />
      <div className="quick-launch">
        <button type="button" className="tray-btn" title="Launch Internet Explorer Browser" onClick={() => launch('ie')}>
          <Icon name="ie" size={16} />
        </button>
        <button type="button" className="tray-btn" title="Show Desktop" onClick={() => windows.forEach(w => minimizeWindow(w.id))}>
          <Icon name="computer" size={16} />
        </button>
        <button type="button" className="tray-btn" title="Windows Media Player" onClick={() => launch('media')}>
          <Icon name="media" size={16} />
        </button>
      </div>
      <div className="taskbar-sep" />
      <div className="tasks">
        {tasks.map(w => (
          <button
            key={w.id}
            type="button"
            className={`task${focused === w.id && !w.minimized ? ' active' : ''}`}
            onClick={() => toggleFromTaskbar(w.id)}
          >
            <Icon name={w.icon} size={16} />
            <span>{w.title}</span>
          </button>
        ))}
      </div>
      <div className="tray">
        <VolumeTray />
        <Clock />
      </div>
    </div>
  );
}
