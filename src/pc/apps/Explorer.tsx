import React, { useState } from 'react';
import { Icon, type IconName } from '../os/icons';
import { launch } from '../os/launch';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, updateWindow, type WinState } from '../os/wm';

/**
 * My Computer / Windows Explorer: drives, folders and files you can open,
 * the Recycle Bin you can empty, the Control Panel, and a floppy drive that
 * grinds and tells you the device is not ready.
 */

interface Item {
  name: string;
  icon: IconName;
  /** Folder to open, or an action. */
  to?: string;
  open?: () => void;
  info?: string;
}

const binFiles: Item[] = [
  { name: 'homework_FINAL_v3.doc', icon: 'docfile', info: 'Deleted 10/25/98' },
  { name: 'report_card.txt', icon: 'textfile', info: 'Deleted 10/24/98. Nobody needs to see this.' },
  { name: 'my_band_logo.bmp', icon: 'imagefile', info: 'Deleted 10/20/98' },
];

function floppy() {
  sfx.floppy();
  window.setTimeout(
    () =>
      messageBox('Error', {
        icon: 'error',
        text: 'A:\\ is not accessible.\n\nThe device is not ready.',
        buttons: ['Retry', 'Cancel'],
        sound: 'chord',
        onButton: b => b === 'Retry' && floppy(),
      }),
    900,
  );
}

const FOLDERS: Record<string, () => Item[]> = {
  'My Computer': () => [
    { name: '3½ Floppy (A:)', icon: 'floppy', open: floppy, info: '3½ Floppy Disk' },
    { name: 'Boared98 (C:)', icon: 'drive', to: 'C:\\', info: 'Local Disk. 2.0GB free of 6.4GB' },
    { name: '(D:)', icon: 'cd', open: () => messageBox('D:\\', { icon: 'warning', text: 'Please insert a disc into drive D:.\n\n(The Encarta disc is in the case under the desk.)', buttons: ['OK'], sound: 'exclaim' }), info: 'CD-ROM Disc' },
    { name: 'Control Panel', icon: 'control', to: 'Control Panel', info: 'Use the settings in Control Panel to personalize your computer.' },
    { name: 'Printers', icon: 'folder', open: () => messageBox('Printers', { icon: 'warning', text: 'Inkjet printer: out of cyan.', sound: 'exclaim' }) },
    { name: 'Dial-Up Networking', icon: 'dialup', open: () => launch('ie') },
  ],
  'C:\\': () => [
    { name: 'My Documents', icon: 'folder', to: 'My Documents' },
    { name: 'Program Files', icon: 'folder', to: 'C:\\Program Files' },
    { name: 'Games', icon: 'folder', to: 'C:\\Games' },
    { name: 'Windows', icon: 'folder', to: 'C:\\Windows' },
    { name: 'AUTOEXEC.BAT', icon: 'textfile', open: () => launch('notepad', 'readme', 'AUTOEXEC - Notepad') },
    { name: 'CONFIG.SYS', icon: 'textfile', open: () => messageBox('CONFIG.SYS', { icon: 'warning', text: 'DEVICE=C:\\WINDOWS\\HIMEM.SYS\nDOS=HIGH,UMB\nFILES=40\n\nBetter not touch this.', sound: 'exclaim' }) },
  ],
  'C:\\Games': () => [
    { name: 'Pinball', icon: 'pinball', open: () => launch('pinball') },
    { name: 'Minesweeper', icon: 'mine', open: () => launch('minesweeper') },
    { name: 'Solitaire', icon: 'solitaire', open: () => launch('solitaire') },
  ],
  'C:\\Program Files': () => [
    { name: 'Accessories', icon: 'folder', to: 'C:\\Program Files\\Accessories' },
    { name: 'Internet Explorer', icon: 'ie', open: () => launch('ie') },
    { name: 'Windows Media Player', icon: 'media', open: () => launch('media') },
  ],
  'C:\\Program Files\\Accessories': () => [
    { name: 'Paint', icon: 'paint', open: () => launch('paint') },
    { name: 'WordPad', icon: 'wordpad', open: () => launch('wordpad') },
    { name: 'WordArt', icon: 'wordart', open: () => launch('wordpad', { wordart: true }, 'WordArt - WordPad') },
    { name: 'Notepad', icon: 'notepad', open: () => launch('notepad') },
  ],
  'C:\\Windows': () =>
    ['System', 'Fonts', 'Cursors', 'Media', 'Temp', 'Desktop'].map(n => ({
      name: n,
      icon: 'folder' as IconName,
      open: () =>
        messageBox(n, {
          icon: 'warning',
          text: 'This folder contains files that keep your computer working properly. You should not modify its contents.\n\n(Mom said so too.)',
          sound: 'exclaim',
        }),
    })),
  'My Documents': () => [
    { name: 'My Music', icon: 'folder', to: 'My Documents\\My Music' },
    { name: 'book_report_FINAL.doc', icon: 'docfile', open: () => launch('wordpad', { file: 'book_report' }, 'book_report_FINAL - WordPad') },
    { name: 'readme.txt', icon: 'textfile', open: () => launch('notepad', 'readme', 'readme - Notepad') },
    { name: 'cheat_codes.txt', icon: 'textfile', open: () => launch('notepad', 'cheats', 'cheat_codes - Notepad') },
    { name: 'my_drawing.bmp', icon: 'imagefile', open: () => launch('paint') },
  ],
  'My Documents\\My Music': () => [{ name: 'Brahe.mp3', icon: 'media', open: () => launch('media'), info: 'Punch Deck. CC BY 4.0' }],
  'Network Neighborhood': () => [
    {
      name: 'Entire Network',
      icon: 'network',
      open: () => messageBox('Network Neighborhood', { icon: 'error', text: 'Unable to browse the network.\n\nThe network is not accessible. It is a family computer.', sound: 'chord' }),
    },
  ],
  'Control Panel': () => [
    { name: 'Display', icon: 'display', open: () => launch('display') },
    { name: 'Sounds', icon: 'speaker', open: () => messageBox('Sounds', { icon: 'info', text: 'Use the speaker in the corner of the taskbar to change the volume.', sound: 'ding' }) },
    { name: 'Mouse', icon: 'control', open: () => messageBox('Mouse', { icon: 'info', text: 'The mouse ball is full of lint. Clean it with your fingernail.', sound: 'ding' }) },
    { name: 'Date/Time', icon: 'control', open: () => messageBox('Date/Time', { icon: 'info', text: new Date().toLocaleString(), sound: 'ding' }) },
    { name: 'Add/Remove Programs', icon: 'control', open: () => messageBox('Add/Remove Programs', { icon: 'warning', text: 'You do not have permission to remove Pinball. Nobody does.', sound: 'exclaim' }) },
    { name: 'Fonts', icon: 'folder', open: () => launch('wordpad', { wordart: true }, 'WordArt - WordPad') },
  ],
};

export function Explorer({ win }: { win: WinState }) {
  const start = typeof win.arg === 'string' ? win.arg : 'My Computer';
  const [history, setHistory] = useState<string[]>([start]);
  const [selected, setSelected] = useState<string | null>(null);
  const [binEmpty, setBinEmpty] = useState(false);
  const here = history[history.length - 1];

  const go = (to: string) => {
    sfx.click();
    setHistory(h => [...h, to]);
    setSelected(null);
    updateWindow(win.id, { title: to, icon: iconFor(to) });
  };
  const back = () => {
    if (history.length < 2) return;
    const h = history.slice(0, -1);
    setHistory(h);
    updateWindow(win.id, { title: h[h.length - 1], icon: iconFor(h[h.length - 1]) });
  };
  const up = () => {
    const parent = here.includes('\\') && here.length > 3 ? here.replace(/\\[^\\]+$/, '') || 'C:\\' : here === 'C:\\' ? 'My Computer' : null;
    if (parent) go(parent.endsWith(':') ? `${parent}\\` : parent);
  };

  const items: Item[] = here === 'Recycle Bin' ? (binEmpty ? [] : binFiles) : FOLDERS[here]?.() ?? [];
  const sel = items.find(i => i.name === selected);

  const menus = [
    { label: 'File', items: [{ label: 'Close', onClick: () => closeWindow(win.id) }] },
    { label: 'Edit', items: [{ label: 'Select All', onClick: () => sfx.ding() }] },
    { label: 'View', items: [{ label: 'Large Icons', checked: true }, { label: 'as Web Page', checked: true }] },
    { label: 'Go', items: [{ label: 'Back', onClick: back }, { label: 'Up One Level', onClick: up }, { label: 'My Computer', onClick: () => go('My Computer') }] },
    { label: 'Favorites', items: [{ label: 'Cool Sites', onClick: () => launch('ie', 'cool') }] },
    { label: 'Help', items: [{ label: 'About Windows 98', onClick: () => messageBox('About Windows', { icon: 'computer', text: 'Windows 98\nThis product is licensed to:\nThe whole family\n\nPhysical memory available to Windows: 65,536 KB', sound: 'none' }) }] },
  ];

  return (
    <div className="explorer">
      <MenuBar menus={menus} />
      <div className="ex-toolbar">
        <button type="button" className="ex-btn" disabled={history.length < 2} onClick={back}>
          ◀ Back
        </button>
        <button type="button" className="ex-btn" onClick={up}>
          ⤴ Up
        </button>
        {here === 'Recycle Bin' && (
          <button
            type="button"
            className="ex-btn"
            disabled={binEmpty}
            onClick={() =>
              messageBox('Confirm Multiple File Delete', {
                icon: 'question',
                text: `Are you sure you want to delete these ${binFiles.length} items?`,
                buttons: ['Yes', 'No'],
                sound: 'exclaim',
                onButton: b => {
                  if (b !== 'Yes') return;
                  sfx.crumple();
                  setBinEmpty(true);
                },
              })
            }
          >
            Empty Recycle Bin
          </button>
        )}
      </div>
      <div className="ex-address">
        <span>Address</span>
        <div className="ex-addr-box">
          <Icon name={iconFor(here)} size={16} />
          {here}
        </div>
      </div>
      <div className="ex-body">
        <div className="ex-web">
          <Icon name={iconFor(here)} size={32} />
          <div className="ex-web-title">{here.split('\\').filter(Boolean).pop() || here}</div>
          <div className="ex-web-line" />
          <div className="ex-web-info">
            {sel ? (
              <>
                <b>{sel.name}</b>
                <br />
                {sel.info ?? (sel.to ? 'File Folder' : 'Double-click to open.')}
              </>
            ) : here === 'Recycle Bin' ? (
              'Use this folder to restore files you deleted by mistake. Or to delete your report card for real.'
            ) : (
              'Select an item to view its description.'
            )}
          </div>
        </div>
        <div className="ex-files" onPointerDown={e => e.target === e.currentTarget && setSelected(null)}>
          {items.map(it => (
            <button
              key={it.name}
              type="button"
              className={`ex-item${selected === it.name ? ' selected' : ''}`}
              onClick={() => setSelected(it.name)}
              onDoubleClick={() => {
                if (it.to) go(it.to);
                else if (it.open) {
                  sfx.click();
                  it.open();
                } else messageBox(it.name, { icon: 'info', text: 'This file is in the Recycle Bin. Restore it first. (Or don\'t.)', sound: 'ding' });
              }}
            >
              <Icon name={it.icon} />
              <span>{it.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{items.length} object(s)</p>
        <p className="status-bar-field" style={{ flex: '0 0 110px' }}>
          {here === 'My Computer' ? 'My Computer' : 'Local intranet'}
        </p>
      </div>
    </div>
  );
}

function iconFor(here: string): IconName {
  if (here === 'My Computer') return 'computer';
  if (here === 'Recycle Bin') return 'recycleFull';
  if (here === 'Control Panel') return 'control';
  if (here === 'Network Neighborhood') return 'network';
  if (here === 'C:\\') return 'drive';
  return 'folderOpen';
}
