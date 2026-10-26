import React, { useEffect, useRef, useState } from 'react';
import { getSettings, setSettings } from './settings';
import { sfx } from './sound';

/**
 * "Welcome to Windows": user name and password. Any password works, and so
 * does Cancel, exactly like it did in 1998.
 */
export function Login({ onDone }: { onDone: () => void }) {
  const [user, setUser] = useState(getSettings().user);
  const [pass, setPass] = useState('');
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    passRef.current?.focus();
  }, []);

  const go = () => {
    sfx.click();
    setSettings({ user: user.trim() || 'Player' });
    onDone();
  };

  return (
    <div className="login-backdrop">
      <div className="window login" role="dialog">
        <div className="title-bar">
          <div className="title-bar-text">Welcome to Windows</div>
          <div className="title-bar-controls">
            <button aria-label="Help" />
            <button aria-label="Close" onClick={go} />
          </div>
        </div>
        <div className="window-body login-body">
          <div className="login-keys" aria-hidden>
            <svg width="48" height="48" viewBox="0 0 48 48" shapeRendering="crispEdges">
              <rect x="4" y="18" width="40" height="22" fill="#c0c0c0" stroke="#000" />
              <rect x="8" y="22" width="32" height="2" fill="#808080" />
              {[0, 1, 2, 3, 4, 5, 6].map(i => (
                <rect key={i} x={8 + i * 4.6} y={27} width={3} height={3} fill="#fff" stroke="#404040" />
              ))}
              <rect x={14} y={33} width={20} height={3} fill="#fff" stroke="#404040" />
              <circle cx="34" cy="10" r="7" fill="#ffd040" stroke="#000" shapeRendering="auto" />
              <rect x="20" y="8" width="10" height="4" fill="#ffd040" stroke="#000" />
              <rect x="20" y="12" width="3" height="3" fill="#ffd040" stroke="#000" />
              <circle cx="35" cy="9" r="2" fill="#fff" shapeRendering="auto" />
            </svg>
          </div>
          <form
            className="login-form"
            onSubmit={e => {
              e.preventDefault();
              go();
            }}
          >
            <p>Type a user name and password to log on to Windows.</p>
            <div className="field-row">
              <label htmlFor="pc-user" style={{ width: 70 }}>
                <u>U</u>ser name:
              </label>
              <input id="pc-user" type="text" value={user} onChange={e => setUser(e.target.value)} style={{ flex: 1 }} />
            </div>
            <div className="field-row">
              <label htmlFor="pc-pass" style={{ width: 70 }}>
                <u>P</u>assword:
              </label>
              <input id="pc-pass" ref={passRef} type="password" value={pass} onChange={e => setPass(e.target.value)} style={{ flex: 1 }} />
            </div>
            <p className="login-tip">Psst: any password works. Even none.</p>
            <div className="login-buttons">
              <button type="submit">OK</button>
              <button type="button" onClick={go}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
