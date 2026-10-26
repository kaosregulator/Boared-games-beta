import React, { useState } from 'react';
import { readStore, writeStore } from '../os/settings';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, updateWindow, type WinState } from '../os/wm';

const DOCS: Record<string, string> = {
  readme: `WELCOME TO THE FAMILY COMPUTER!!!

House rules (from Mom):
 1. No food on the keyboard. That means you.
 2. Get off the Internet if somebody needs the phone.
 3. Do NOT delete anything in C:\\WINDOWS. I mean it.
 4. Homework before Pinball.

Fun stuff on the desktop:
 - Pinball: hold SPACE to launch, Z and / for the flippers
 - Minesweeper: right click to put a flag down
 - Paint: File > Set As Wallpaper to show off your art
 - WordArt: make your book report title look AMAZING
 - Media Player: click the picture to change the visualization

Have fun!!!`,
  cheats: `CHEAT CODES (DO NOT LOSE THIS)

Contra ............ Up Up Down Down Left Right Left Right B A Start
Mortal Kombat ..... A B A C A B B on the code screen (Genesis)
Street Fighter II . Down R Up L Y B on the Capcom logo (turbo)
Sonic 2 ........... Sound test 19, 65, 9, 17 then Start + A
Pinball ........... (there is one but I forgot it)
Minesweeper ....... just click the corners first, trust me`,
};

/** Notepad. Untitled notes are kept on this computer between visits. */
export function Notepad({ win }: { win: WinState }) {
  const doc = typeof win.arg === 'string' ? win.arg : null;
  const [text, setText] = useState(() => (doc ? DOCS[doc] ?? '' : readStore<string>('notepad.untitled', '')));
  const [wrap, setWrap] = useState(true);

  const update = (v: string) => {
    setText(v);
    if (!doc) writeStore('notepad.untitled', v);
  };

  const save = () => {
    const a = document.createElement('a');
    a.download = `${doc ?? 'Untitled'}.txt`;
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.click();
  };

  const menus = [
    {
      label: 'File',
      items: [
        {
          label: 'New',
          onClick: () => {
            update('');
            updateWindow(win.id, { title: 'Untitled - Notepad' });
          },
        },
        { label: 'Save As...', onClick: save },
        { label: '', divider: true },
        { label: 'Exit', onClick: () => closeWindow(win.id) },
      ],
    },
    { label: 'Edit', items: [{ label: 'Time/Date      F5', onClick: () => update(`${text}${new Date().toLocaleString()}`) }] },
    { label: 'Search', items: [{ label: 'Find...', onClick: () => messageBox('Notepad', { icon: 'info', text: 'Cannot find "homework"', sound: 'ding' }) }] },
    { label: 'Help', items: [{ label: 'Word Wrap', checked: wrap, onClick: () => setWrap(w => !w) }] },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <MenuBar menus={menus} />
      <textarea
        className="notepad-text"
        value={text}
        spellCheck={false}
        onChange={e => update(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'F5') {
            e.preventDefault();
            update(`${text}${new Date().toLocaleString()}`);
          }
        }}
        style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', overflowWrap: wrap ? 'break-word' : 'normal' }}
      />
    </div>
  );
}
