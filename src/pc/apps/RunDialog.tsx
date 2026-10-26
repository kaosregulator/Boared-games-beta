import React, { useState } from 'react';
import { Icon } from '../os/icons';
import { runCommand } from '../os/launch';
import { readStore, writeStore } from '../os/settings';
import { closeWindow, type WinState } from '../os/wm';

/** Start > Run...: type a program name (pinball, mspaint, winmine...) or a web address. */
export function RunDialog({ win }: { win: WinState }) {
  const [history] = useState(() => readStore<string[]>('run.history', ['pinball', 'mspaint', 'winmine', 'www.spacejam.com']));
  const [value, setValue] = useState(history[0] ?? '');
  const submit = () => {
    if (!value.trim()) return;
    writeStore('run.history', [value, ...history.filter(h => h !== value)].slice(0, 8));
    closeWindow(win.id);
    runCommand(value);
  };
  return (
    <form
      style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}
      onSubmit={e => {
        e.preventDefault();
        submit();
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <Icon name="run" />
        <p style={{ margin: 0 }}>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
      </div>
      <div className="field-row">
        <label htmlFor="run-in">
          <u>O</u>pen:
        </label>
        <input id="run-in" list="run-list" autoFocus value={value} onChange={e => setValue(e.target.value)} style={{ flex: 1 }} />
        <datalist id="run-list">
          {history.map(h => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button type="submit">OK</button>
        <button type="button" onClick={() => closeWindow(win.id)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
