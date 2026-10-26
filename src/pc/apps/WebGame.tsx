import React, { useEffect, useRef, useState } from 'react';
import { MenuBar } from '../os/Window';
import { messageBox, type WinState } from '../os/wm';
import { markOnline } from './InternetExplorer';
import type { WebGameSpec } from './webgames';

/**
 * A game from the real internet in a window (see webgames.ts for the list).
 * When the page has a fixed size it is scaled to fit, like a Flash movie in
 * a browser. Game > Backup copy and Game > Pop out cover hosts that are down
 * or refuse to be framed. Closing the window goes back online to the portal
 * page (wired in apps/index.tsx).
 */
export function WebGame({ win }: { win: WinState }) {
  const spec = win.arg as WebGameSpec;
  const [src, setSrc] = useState(spec.url);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const view = useRef<HTMLDivElement>(null);

  // Playing a web game means the modem is already connected.
  useEffect(markOnline, []);

  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = spec.native && box.w ? Math.min(box.w / spec.native.w, box.h / spec.native.h) : 1;
  const frameStyle: React.CSSProperties = spec.native
    ? { width: spec.native.w, height: spec.native.h, transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', left: (box.w - spec.native.w * scale) / 2, top: (box.h - spec.native.h * scale) / 2 }
    : { width: '100%', height: '100%' };

  const restart = () => {
    setLoaded(false);
    setReload(r => r + 1);
  };

  const menus = [
    {
      label: 'Game',
      items: [
        { label: 'Restart', onClick: restart },
        ...(spec.backup
          ? [
              {
                label: src === spec.backup ? 'Main copy' : 'Backup copy',
                onClick: () => {
                  setSrc(src === spec.backup ? spec.url : spec.backup!);
                  setLoaded(false);
                },
              },
            ]
          : []),
        { label: '', divider: true },
        { label: 'Pop out (open in a new browser tab)', onClick: () => window.open(src, '_blank', 'noopener') },
      ],
    },
    {
      label: 'Help',
      items: [{ label: `About ${spec.title}`, onClick: () => messageBox(`About ${spec.title}`, { icon: spec.icon, text: `${spec.credit ?? spec.title}\n\nPlayed from the internet. If it stays blank, try Game > ${spec.backup ? 'Backup copy or ' : ''}Pop out.`, sound: 'none' }) }],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <MenuBar menus={menus} />
      <div ref={view} className="webgame-view" data-cursor="arrow">
        <iframe
          key={`${src}#${reload}`}
          title={spec.title}
          src={src}
          style={frameStyle}
          className="webgame-frame"
          allow="autoplay; fullscreen; gamepad"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <div className="webgame-loading">
            <div>Connecting to the Internet...</div>
            <small>If nothing shows up, try Game &gt; {spec.backup ? 'Backup copy, or ' : ''}Pop out.</small>
          </div>
        )}
      </div>
    </div>
  );
}
