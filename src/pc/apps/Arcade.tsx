import React, { useState } from 'react';
import { Icon } from '../os/icons';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';
import { CN_ARCADE, cnGame, FLASHPOINT_BROWSE, openWebGame } from './webgames';

/**
 * Cartoon Network Arcade: the Cartoon Network web games of 1999 to 2007,
 * preserved by Flashpoint Archive and played through its web player. The
 * list is in webgames.ts; "More games" opens the Flashpoint catalogue.
 */
export function Arcade({ win }: { win: WinState }) {
  const [sel, setSel] = useState<string | null>(null);
  const all = CN_ARCADE.flatMap(s => s.games.map(([title, id]) => ({ show: s.show, title, id })));
  const play = (g: (typeof all)[number]) => openWebGame(cnGame(g.show, g.title, g.id));
  const more = () => openWebGame({ title: 'Flashpoint Archive - Cartoon Network', icon: 'arcade', url: FLASHPOINT_BROWSE, w: 720, h: 520, credit: 'The Flashpoint Archive catalogue, through the 9o3o web player.' });

  const menus = [
    { label: 'File', items: [{ label: 'Play', disabled: !sel, onClick: () => { const g = all.find(x => x.id === sel); if (g) play(g); } }, { label: 'More games from Flashpoint...', onClick: more }, { label: '', divider: true }, { label: 'Close', onClick: () => closeWindow(win.id) }] },
    { label: 'Help', items: [{ label: 'About Cartoon Network Arcade', onClick: () => messageBox('Cartoon Network Arcade', { icon: 'arcade', text: 'Cartoon Network web games from 1999 to 2007.\nPreserved by Flashpoint Archive (flashpointarchive.org) and played with the 9o3o web player.', sound: 'none' }) }] },
  ];

  return (
    <div className="arcade">
      <MenuBar menus={menus} />
      <div className="arcade-banner">
        <span className="arcade-cn">
          <b>C</b>
          <b>N</b>
        </span>
        <div>
          <div className="arcade-title">Cartoon Network Games</div>
          <div className="arcade-sub">The good stuff, 1999 to 2007. Double-click a game to play.</div>
        </div>
      </div>
      <div className="arcade-list sunken" data-cursor="arrow">
        {CN_ARCADE.map(s => (
          <div key={s.show}>
            <div className="arcade-show">{s.show}</div>
            {s.games.map(([title, id]) => (
              <button
                key={id}
                type="button"
                className={`arcade-game${sel === id ? ' on' : ''}`}
                onClick={() => setSel(id)}
                onDoubleClick={() => play({ show: s.show, title, id })}
                onKeyDown={e => e.key === 'Enter' && play({ show: s.show, title, id })}
              >
                <Icon name="arcade" size={16} /> {title}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="arcade-foot">
        <button type="button" disabled={!sel} onClick={() => { const g = all.find(x => x.id === sel); if (g) play(g); }}>
          Play
        </button>
        <button type="button" onClick={more}>
          More games...
        </button>
        <span className="arcade-count">{all.length} games</span>
      </div>
    </div>
  );
}
