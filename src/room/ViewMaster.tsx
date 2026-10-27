import React, { useEffect, useState } from 'react';
import { sound } from '../utils/audio';
import { REELS, databasePage } from './viewmasterReels';
import './viewMaster.css';

/**
 * The View-Master off the high shelf. The lever steps through packets that
 * the public View-Master Database actually lists, and the window is that page.
 */

export function ViewMaster({ onClose }: { onClose: () => void }) {
  const [reel, setReel] = useState(0);
  const [down, setDown] = useState(false);
  const busy = React.useRef(false);
  const current = REELS[reel];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const advance = () => {
    if (busy.current) return;
    busy.current = true;
    setDown(true);
    sound.playButtonClick();
    window.setTimeout(() => {
      setReel(value => (value + 1) % REELS.length);
      setDown(false);
      busy.current = false;
    }, 150);
  };

  const insert = (index: number) => {
    sound.playButtonClick();
    setReel(index);
  };

  return (
    <div data-ui="viewmaster" className="vm-root">
      <div className="vm-top">
        <div>
          <p className="vm-kicker">View-Master Database</p>
          <h2 className="vm-title font-display">{current.title}</h2>
        </div>
        <button type="button" className="vm-close" onClick={onClose}>
          Put it down
        </button>
      </div>
      <div className="vm-body">
        <iframe
          className="vm-screen"
          title={current.title}
          src={databasePage(current.title)}
        />
        <div className="vm-side">
          <div className="vm-slot">{current.year}</div>
          <button type="button" className="vm-lever" data-down={down ? '1' : '0'} aria-label="Advance the reel" onClick={advance} />
        </div>
      </div>
      <div className="vm-caption">
        <p className="font-display">{current.title}</p>
        <span className="vm-count">
          {reel + 1} / {REELS.length}
        </span>
      </div>
      <div className="vm-reels" role="listbox" aria-label="Reels">
        {REELS.map((item, index) => (
          <button key={item.title} type="button" className="vm-reel" data-on={index === reel ? '1' : '0'} onClick={() => insert(index)}>
            {item.title}
          </button>
        ))}
      </div>
    </div>
  );
}
