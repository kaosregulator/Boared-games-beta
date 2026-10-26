import React, { useEffect, useRef, useState } from 'react';
import { sfx } from './sound';

/**
 * "Restart in MS-DOS mode": a C:\> prompt with just enough commands to poke
 * around. WIN (or EXIT) goes back to Windows.
 */

const DIR = [
  ' Volume in drive C is BOARED98',
  ' Volume Serial Number is 1998-1026',
  ' Directory of C:\\',
  '',
  'WINDOWS        <DIR>        10-26-98  8:00p',
  'MYDOCU~1       <DIR>        10-26-98  8:01p',
  'PROGRA~1       <DIR>        10-26-98  8:01p',
  'GAMES          <DIR>        10-26-98  8:02p',
  'AUTOEXEC BAT           312  10-26-98  8:00p',
  'CONFIG   SYS           188  10-26-98  8:00p',
  'COMMAND  COM        93,890  05-11-98  8:01p',
  'HOMEWORK TXT             0  10-26-98  9:45p',
  '         4 file(s)       94,390 bytes',
  '         4 dir(s)   2,147,155,968 bytes free',
];

const HELP = ['Commands I know: DIR, CLS, VER, MEM, TIME, DATE, ECHO, TYPE, EDIT, DELTREE, WIN, EXIT'];

export function Dos({ onExit }: { onExit: () => void }) {
  const [lines, setLines] = useState<string[]>(['', 'Microsoft(R) Windows 98', '   (C)Copyright Microsoft Corp 1981-1998.', '', "Type HELP if you're lost. Type WIN to go back to Windows.", '']);
  const [cmd, setCmd] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    box.current?.scrollTo(0, box.current.scrollHeight);
  }, [lines]);

  const run = (raw: string) => {
    const [name, ...rest] = raw.trim().split(/\s+/);
    const arg = rest.join(' ');
    const c = (name ?? '').toUpperCase();
    let out: string[] = [];
    if (!c) out = [];
    else if (c === 'DIR') out = DIR;
    else if (c === 'CLS') {
      setLines([]);
      return;
    } else if (c === 'VER') out = ['', 'Windows 98 [Version 4.10.1998]', ''];
    else if (c === 'HELP' || c === '/?') out = HELP;
    else if (c === 'MEM') out = ['', '    655,360 bytes total conventional memory', '    632,912 bytes available to MS-DOS', '    600,000 bytes largest executable program size', '    More than enough for anybody.', ''];
    else if (c === 'TIME') out = [`Current time is ${new Date().toLocaleTimeString()}`];
    else if (c === 'DATE') out = [`Current date is ${new Date().toLocaleDateString()}`];
    else if (c === 'ECHO') out = [arg];
    else if (c === 'TYPE') out = arg.toUpperCase().includes('AUTOEXEC') ? ['@ECHO OFF', 'PROMPT $p$g', 'PATH C:\\WINDOWS;C:\\WINDOWS\\COMMAND', 'SET BLASTER=A220 I5 D1 T4', 'LH C:\\MOUSE\\MOUSE.COM'] : arg.toUpperCase().includes('HOMEWORK') ? ['(the file is empty. it is due tomorrow.)'] : ['File not found'];
    else if (c === 'EDIT') out = ['EDIT needs a bigger screen than your mom is going to let you have tonight.'];
    else if (c === 'DELTREE' || c === 'FORMAT') {
      sfx.chord();
      out = ['Nice try.'];
    } else if (c === 'WIN' || c === 'EXIT') {
      onExit();
      return;
    } else out = ['Bad command or file name'];
    setLines(l => [...l, `C:\\>${raw}`, ...out]);
  };

  return (
    <div className="dos" ref={box} onClick={() => input.current?.focus()}>
      {lines.map((l, i) => (
        <div key={i}>{l || '\u00a0'}</div>
      ))}
      <form
        onSubmit={e => {
          e.preventDefault();
          run(cmd);
          setCmd('');
        }}
        style={{ display: 'flex' }}
      >
        <span>C:\&gt;</span>
        <input ref={input} className="dos-input" value={cmd} onChange={e => setCmd(e.target.value)} spellCheck={false} autoComplete="off" />
      </form>
    </div>
  );
}
