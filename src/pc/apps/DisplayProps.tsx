import React, { useState } from 'react';
import { wallpaperStyle } from '../os/Desktop';
import { Screensaver } from '../os/Screensaver';
import { getSettings, setSettings, type Saver, type Wallpaper } from '../os/settings';
import { sfx } from '../os/sound';
import { closeWindow, type WinState } from '../os/wm';

const WALLS: [Wallpaper, string][] = [
  ['none', '(None)'],
  ['clouds', 'Clouds'],
  ['setup', 'Windows 98'],
  ['sunset', 'Sunset'],
  ['tiles', 'Red Tiles'],
  ['bubbles', 'Bubbles'],
  ['carved', 'Carved Stone'],
  ['custom', 'My Paint Picture'],
];

const SAVERS: [Saver, string][] = [
  ['none', '(None)'],
  ['pipes', '3D Pipes'],
  ['starfield', 'Starfield Simulation'],
  ['mystify', 'Mystify Your Mind'],
  ['flags', 'Flying Flags'],
];

/** Display Properties: wallpaper and screen saver, with the little monitor preview. */
export function DisplayProps({ win }: { win: WinState }) {
  const start = getSettings();
  const [tab, setTab] = useState<'bg' | 'saver' | 'settings'>('bg');
  const [wall, setWall] = useState<Wallpaper>(start.wallpaper);
  const [saver, setSaver] = useState<Saver>(start.saver);
  const [wait, setWait] = useState(start.saverWait);

  const apply = () => {
    setSettings({ wallpaper: wall, saver, saverWait: wait });
    sfx.click();
  };

  return (
    <div className="display-props">
      <menu role="tablist">
        {(
          [
            ['bg', 'Background'],
            ['saver', 'Screen Saver'],
            ['settings', 'Settings'],
          ] as const
        ).map(([id, label]) => (
          <li key={id} role="tab" aria-selected={tab === id}>
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                setTab(id);
              }}
            >
              {label}
            </a>
          </li>
        ))}
      </menu>
      <div className="window" role="tabpanel" style={{ flex: 1 }}>
        <div className="window-body">
          <div className="monitor-preview">
            <div className="monitor-glass" style={tab === 'saver' ? { background: '#000' } : wallpaperStyle(wall)}>
              {tab === 'saver' && saver !== 'none' && <Screensaver kind={saver} preview />}
            </div>
          </div>
          {tab === 'bg' && (
            <>
              <p style={{ margin: '4px 0' }}>Wallpaper:</p>
              <ul className="tree-view list-box">
                {WALLS.map(([id, label]) => (
                  <li key={id} className={wall === id ? 'picked' : ''} onClick={() => setWall(id)}>
                    {label}
                  </li>
                ))}
              </ul>
              <p className="hint">Tip: draw something in Paint, then File &gt; Set As Wallpaper.</p>
            </>
          )}
          {tab === 'saver' && (
            <>
              <fieldset>
                <legend>Screen Saver</legend>
                <div className="field-row">
                  <select value={saver} onChange={e => setSaver(e.target.value as Saver)} style={{ flex: 1 }}>
                    {SAVERS.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-row">
                  <label htmlFor="sv-wait">Wait:</label>
                  <input id="sv-wait" type="number" min={1} max={30} value={wait} onChange={e => setWait(Math.max(1, Number(e.target.value) || 1))} style={{ width: 44 }} />
                  <span>minutes</span>
                </div>
              </fieldset>
            </>
          )}
          {tab === 'settings' && (
            <fieldset>
              <legend>Display</legend>
              <p>Plug and Play Monitor on S3 Trio64V+ (fictional)</p>
              <div className="field-row">
                <label>Colors:</label>
                <select disabled>
                  <option>High Color (16 bit)</option>
                </select>
              </div>
              <div className="field-row">
                <label>Screen area:</label>
                <b>800 by 600 pixels</b>
              </div>
            </fieldset>
          )}
        </div>
      </div>
      <div className="dlg-buttons">
        <button
          type="button"
          onClick={() => {
            apply();
            closeWindow(win.id);
          }}
        >
          OK
        </button>
        <button type="button" onClick={() => closeWindow(win.id)}>
          Cancel
        </button>
        <button type="button" onClick={apply}>
          Apply
        </button>
      </div>
    </div>
  );
}
