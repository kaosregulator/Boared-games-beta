import React, { useEffect } from 'react';
import { Icon } from '../os/icons';
import { sfx } from '../os/sound';
import { closeWindow, useWm, type DialogSpec, type WinState } from '../os/wm';
import { Window } from '../os/Window';
import { Minesweeper } from './Minesweeper';
import { Pinball } from './Pinball';
import { Paint } from './Paint';
import { WordPad } from './WordPad';
import { MediaPlayer } from './MediaPlayer';
import { Notepad } from './Notepad';
import { Explorer } from './Explorer';
import { InternetExplorer } from './InternetExplorer';
import { DisplayProps } from './DisplayProps';
import { RunDialog } from './RunDialog';
import { Help } from './Help';
import { Solitaire } from './Solitaire';
import { CardGame } from './CardGame';
import { Tetris } from './Tetris';
import { TaiPei } from './TaiPei';
import { Pegged } from './Pegged';
import { Arcade } from './Arcade';
import { WebGame } from './WebGame';
import { launch } from '../os/launch';
import { AntiVirus, Popup, Y2KClock, closePopup } from '../os/gags';

/** Every open window, each wrapped in its frame. */
export function AppWindows() {
  const { windows } = useWm();
  return (
    <>
      {windows.map(w => (
        <AppFrame key={w.id} win={w} />
      ))}
    </>
  );
}

function AppFrame({ win }: { win: WinState }) {
  switch (win.app) {
    case 'minesweeper':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <Minesweeper win={win} />
        </Window>
      );
    case 'pinball':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <Pinball win={win} />
        </Window>
      );
    case 'paint':
      return (
        <Window win={win}>
          <Paint win={win} />
        </Window>
      );
    case 'wordpad':
      return (
        <Window win={win}>
          <WordPad win={win} />
        </Window>
      );
    case 'media':
      return (
        <Window win={win}>
          <MediaPlayer win={win} />
        </Window>
      );
    case 'notepad':
      return (
        <Window win={win}>
          <Notepad win={win} />
        </Window>
      );
    case 'explorer':
      return (
        <Window win={win}>
          <Explorer win={win} />
        </Window>
      );
    case 'ie':
      return (
        <Window win={win}>
          <InternetExplorer win={win} />
        </Window>
      );
    case 'display':
      return (
        <Window win={win} resizable={false} maximizable={false} minimizable={false} help>
          <DisplayProps win={win} />
        </Window>
      );
    case 'run':
      return (
        <Window win={win} resizable={false} maximizable={false} minimizable={false} help>
          <RunDialog win={win} />
        </Window>
      );
    case 'help':
      return (
        <Window win={win}>
          <Help />
        </Window>
      );
    case 'solitaire':
      return (
        <Window win={win}>
          <Solitaire win={win} />
        </Window>
      );
    case 'freecell':
    case 'hearts':
    case 'spider':
      return (
        <Window win={win}>
          <CardGame win={win} game={win.app} />
        </Window>
      );
    case 'tetris':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <Tetris win={win} />
        </Window>
      );
    case 'taipei':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <TaiPei win={win} />
        </Window>
      );
    case 'pegged':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <Pegged win={win} />
        </Window>
      );
    case 'arcade':
      return (
        <Window win={win}>
          <Arcade win={win} />
        </Window>
      );
    case 'webgame':
      // Closing a web game lands back online, on the old-school portal page.
      return (
        <Window
          win={win}
          onClose={() => {
            closeWindow(win.id);
            launch('ie', 'portal');
          }}
        >
          <WebGame win={win} />
        </Window>
      );
    case 'popup':
      return (
        <Window win={win} resizable={false} maximizable={false} minimizable={false} onClose={() => closePopup(win.id)}>
          <Popup ad={win.arg as Parameters<typeof Popup>[0]['ad']} id={win.id} />
        </Window>
      );
    case 'antivirus':
      return (
        <Window win={win} resizable={false} maximizable={false} minimizable={false}>
          <AntiVirus id={win.id} />
        </Window>
      );
    case 'y2k':
      return (
        <Window win={win} resizable={false} maximizable={false}>
          <Y2KClock id={win.id} />
        </Window>
      );
    case 'dialog':
      return (
        <Window win={win} resizable={false} maximizable={false} minimizable={false}>
          <MessageBox win={win} />
        </Window>
      );
    default:
      return null;
  }
}

function MessageBox({ win }: { win: WinState }) {
  const spec = win.arg as DialogSpec;
  useEffect(() => {
    const s = spec.sound ?? 'ding';
    if (s !== 'none') sfx[s]();
  }, [spec.sound]);
  const buttons = spec.buttons ?? ['OK'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: '10px 10px 8px' }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1 }}>
        <Icon name={spec.icon ?? 'info'} />
        <p style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>{spec.text}</p>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 8 }}>
        {buttons.map((b, i) => (
          <button
            key={b}
            type="button"
            autoFocus={i === 0}
            onClick={() => {
              closeWindow(win.id);
              spec.onButton?.(b);
            }}
          >
            {b}
          </button>
        ))}
      </div>
    </div>
  );
}
