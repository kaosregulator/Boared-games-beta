import React, { useEffect, useRef, useState } from 'react';
import { Icon, Flag } from '../os/icons';
import { COMMANDS } from '../os/launch';
import { getSettings } from '../os/settings';
import { sfx } from '../os/sound';
import { MenuBar } from '../os/Window';
import { closeWindow, messageBox, type WinState } from '../os/wm';
import { popupStorm, speak } from '../os/gags';
import { noise, tone } from '../os/sound';

/**
 * Internet Explorer. First it has to dial up (with the screech). Then it
 * opens the home page made on this computer, and any real address you type
 * opens as it looked in 1998, through the Internet Archive's Wayback Machine.
 */

let connected = false;
let poppedUp = false;
let mailRead = false;

const BOOKMARKS: [string, string][] = [
  ['Yahoo!', 'http://www.yahoo.com/'],
  ['Space Jam', 'https://www.spacejam.com/1996/'],
  ['Hampster Dance', 'http://www.hampsterdance.com/'],
  ['Ask Jeeves', 'http://www.askjeeves.com/'],
  ['GeoCities', 'http://www.geocities.com/'],
  ['Nintendo', 'http://www.nintendo.com/'],
  ['Cartoon Network', 'http://www.cartoonnetwork.com/'],
  ['Neopets', 'http://www.neopets.com/'],
];

type Page = { kind: 'local'; id: string } | { kind: 'web'; url: string };

function pageFor(arg: unknown): Page {
  if (typeof arg === 'string' && /^(https?:|www\.)/.test(arg)) return { kind: 'web', url: arg };
  if (arg === 'update') return { kind: 'local', id: 'update' };
  if (arg === 'cool' || arg === 'channels') return { kind: 'local', id: 'cool' };
  if (arg === 'search') return { kind: 'local', id: 'search' };
  if (arg === 'mail' || arg === 'capsule') return { kind: 'local', id: arg };
  return { kind: 'local', id: 'home' };
}

function wayback(url: string) {
  const u = url.startsWith('http') ? url : `http://${url}`;
  if (u.includes('spacejam.com/1996')) return u;
  return `https://web.archive.org/web/1998if_/${u}`;
}

function addressOf(p: Page) {
  if (p.kind === 'web') return p.url;
  return p.id === 'home' ? 'http://www.geocities.com/Area51/Rad/home.html' : `http://www.geocities.com/Area51/Rad/${p.id}.html`;
}

export function InternetExplorer({ win }: { win: WinState }) {
  const [online, setOnline] = useState(connected);
  const [history, setHistory] = useState<Page[]>([pageFor(win.arg)]);
  const [pos, setPos] = useState(0);
  const [address, setAddress] = useState(addressOf(history[0]));
  const [loading, setLoading] = useState(false);
  const page = history[pos];
  const [dropped, setDropped] = useState(false);

  // Sooner or later, somebody picks up the phone.
  useEffect(() => {
    if (!online || dropped) return;
    const id = window.setTimeout(() => {
      noise(0, 0.08, 0.4, 'bandpass', 900, 2);
      tone(350, 0.3, 2.4, { gain: 0.05 });
      tone(440, 0.3, 2.4, { gain: 0.05 });
      window.setTimeout(() => speak("Hello? Hello? Who's on the internet? Get off, I need to use the phone!", { pitch: 0.9, rate: 1.05 }), 500);
      connected = false;
      setDropped(true);
    }, 70_000 + Math.random() * 60_000);
    return () => window.clearTimeout(id);
  }, [online, dropped]);

  // The first trip to the home page brings friends.
  useEffect(() => {
    if (!online || poppedUp || page.kind !== 'local' || page.id !== 'home') return;
    const id = window.setTimeout(() => {
      poppedUp = true;
      popupStorm(1);
    }, 9000);
    return () => window.clearTimeout(id);
  }, [online, page]);

  // Opening IE again from a link while it's open navigates this window.
  const lastArg = useRef(win.arg);
  useEffect(() => {
    if (win.arg === lastArg.current) return;
    lastArg.current = win.arg;
    navigate(pageFor(win.arg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win.arg]);

  useEffect(() => {
    setAddress(addressOf(page));
  }, [page]);

  const navigate = (p: Page) => {
    setHistory(h => [...h.slice(0, pos + 1), p]);
    setPos(x => x + 1);
    setLoading(true);
    window.setTimeout(() => setLoading(false), p.kind === 'web' ? 2500 : 700);
  };

  const go = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (v.includes('geocities.com/Area51/Rad')) navigate({ kind: 'local', id: v.match(/Rad\/(\w+)/)?.[1] ?? 'home' });
    else navigate({ kind: 'web', url: v });
  };

  if (!online)
    return (
      <DialUp
        onConnected={() => {
          connected = true;
          setOnline(true);
          setLoading(true);
          window.setTimeout(() => setLoading(false), 800);
          if (!mailRead) window.setTimeout(() => speak("Welcome! You've got mail!", { pitch: 1.1 }), 900);
        }}
        onCancel={() => closeWindow(win.id)}
      />
    );

  const menus = [
    { label: 'File', items: [{ label: 'Work Offline', onClick: () => { connected = false; closeWindow(win.id); } }, { label: 'Close', onClick: () => closeWindow(win.id) }] },
    { label: 'Edit', items: [{ label: 'Find (on This Page)...', onClick: () => sfx.ding() }] },
    { label: 'View', items: [{ label: 'Refresh', onClick: () => navigate(page) }] },
    { label: 'Go', items: [{ label: 'Home Page', onClick: () => navigate({ kind: 'local', id: 'home' }) }, { label: 'Search the Web', onClick: () => navigate({ kind: 'local', id: 'search' }) }] },
    { label: 'Favorites', items: BOOKMARKS.map(([name, url]) => ({ label: name, onClick: () => navigate({ kind: 'web', url }) })) },
    { label: 'Help', items: [{ label: 'About Internet Explorer', onClick: () => messageBox('About Internet Explorer', { icon: 'ie', text: 'Internet Explorer 4.0\nReal addresses open as they looked in 1998, from the Internet Archive.', sound: 'none' }) }] },
  ];

  return (
    <div className="ie">
      <MenuBar menus={menus} />
      <div className="ie-toolbar">
        <button type="button" className="ie-btn" disabled={pos === 0} onClick={() => setPos(p => p - 1)}>
          <span className="ie-ico">⇦</span>Back
        </button>
        <button type="button" className="ie-btn" disabled={pos >= history.length - 1} onClick={() => setPos(p => p + 1)}>
          <span className="ie-ico">⇨</span>Forward
        </button>
        <button type="button" className="ie-btn" onClick={() => setLoading(false)}>
          <span className="ie-ico">⨯</span>Stop
        </button>
        <button type="button" className="ie-btn" onClick={() => navigate(page)}>
          <span className="ie-ico">⟳</span>Refresh
        </button>
        <button type="button" className="ie-btn" onClick={() => navigate({ kind: 'local', id: 'home' })}>
          <span className="ie-ico">⌂</span>Home
        </button>
        <button type="button" className="ie-btn" onClick={() => navigate({ kind: 'local', id: 'search' })}>
          <span className="ie-ico">🔍</span>Search
        </button>
        <div className={`ie-throbber${loading ? ' spin' : ''}`}>
          <Flag size={26} />
        </div>
      </div>
      <form
        className="ie-address"
        onSubmit={e => {
          e.preventDefault();
          go(address);
        }}
      >
        <span>Address</span>
        <input value={address} onChange={e => setAddress(e.target.value)} />
        <button type="submit">Go</button>
      </form>
      {dropped && (
        <div className="ie-dropped window">
          <div className="title-bar">
            <div className="title-bar-text">Connection Lost</div>
          </div>
          <div className="window-body" style={{ display: 'flex', gap: 10, padding: 10 }}>
            <Icon name="dialup" />
            <div>
              <p style={{ marginTop: 0 }}>
                The connection to My ISP was lost.
                <br />
                <b>Somebody picked up the phone.</b>
              </p>
              <p>Would you like to reconnect?</p>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setDropped(false);
                    setOnline(false);
                  }}
                >
                  Reconnect
                </button>
                <button type="button" onClick={() => closeWindow(win.id)}>
                  Work Offline
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="ie-view sunken">
        {page.kind === 'web' ? (
          <iframe key={page.url} title="web" src={wayback(page.url)} className="ie-frame" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms" />
        ) : (
          <LocalPage id={page.id} open={url => navigate({ kind: 'web', url })} openLocal={id => navigate({ kind: 'local', id })} />
        )}
      </div>
      <div className="status-bar">
        <p className="status-bar-field">{loading ? `Opening page ${address}...` : 'Done'}</p>
        <p className="status-bar-field" style={{ flex: '0 0 110px', display: 'flex', gap: 4, alignItems: 'center' }}>
          <Icon name="ie" size={16} /> Internet zone
        </p>
      </div>
    </div>
  );
}

function DialUp({ onConnected, onCancel }: { onConnected: () => void; onCancel: () => void }) {
  const [stage, setStage] = useState<'ask' | 'dialing' | 'verify' | 'logon'>('ask');
  const connect = () => {
    setStage('dialing');
    const total = sfx.modem(() => onConnected());
    window.setTimeout(() => setStage('verify'), total * 1000 * 0.55);
    window.setTimeout(() => setStage('logon'), total * 1000 * 0.82);
  };
  return (
    <div className="dialup">
      <div className="dialup-head">
        <Icon name="dialup" />
        <b>Connect To</b>
      </div>
      <div className="dialup-isp">My ISP (56K)</div>
      <div className="field-row">
        <label style={{ width: 90 }}>User name:</label>
        <input value={getSettings().user.toLowerCase()} readOnly style={{ flex: 1 }} />
      </div>
      <div className="field-row">
        <label style={{ width: 90 }}>Password:</label>
        <input type="password" value="hunter2" readOnly style={{ flex: 1 }} />
      </div>
      <div className="field-row">
        <input id="ie-save" type="checkbox" defaultChecked />
        <label htmlFor="ie-save">Save password</label>
      </div>
      <div className="field-row">
        <label style={{ width: 90 }}>Phone number:</label>
        <input value="555-2701" readOnly style={{ flex: 1 }} />
      </div>
      <div className="dialup-status">
        {stage === 'ask' && 'Status: Idle'}
        {stage === 'dialing' && 'Status: Dialing... (nobody pick up the phone!)'}
        {stage === 'verify' && 'Status: Verifying user name and password...'}
        {stage === 'logon' && 'Status: Logging on to network...'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        <button type="button" onClick={connect} disabled={stage !== 'ask'}>
          Connect
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function LocalPage({ id, open, openLocal }: { id: string; open: (url: string) => void; openLocal: (id: string) => void }) {
  const [hits] = useState(() => 1998 + Math.floor(Math.random() * 400));
  const [guest, setGuest] = useState<string[]>(['Sk8rBoi99: cool page!!!', 'xXPinballWizardXx: my high score is 2 million']);
  const [msg, setMsg] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[] | null>(null);

  if (id === 'mail') {
    mailRead = true;
    return <Inbox />;
  }
  if (id === 'capsule') return <TimeCapsule />;
  if (id === 'update') {
    return (
      <div className="web-page web-plain">
        <h1>
          <Flag size={28} /> Windows Update
        </h1>
        <p>Scanning your computer for updates...</p>
        <p>
          <b>Your computer is up to date.</b> It is 1998. There is nothing newer than this.
        </p>
        <p className="web-small">Recommended: a 56K modem, 64 MB of RAM, and staying off the phone line.</p>
      </div>
    );
  }
  if (id === 'cool') {
    return (
      <div className="web-page web-plain">
        <h1>Cool Sites of the Week</h1>
        <p>These open the way they looked in 1998, saved by the Internet Archive.</p>
        <ul>
          {BOOKMARKS.map(([name, url]) => (
            <li key={url}>
              <a href={url} onClick={e => (e.preventDefault(), open(url))}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (id === 'search') {
    return (
      <div className="web-page web-plain">
        <h1 style={{ color: '#c00', fontFamily: 'Georgia, serif' }}>WebScrawler</h1>
        <form
          onSubmit={e => {
            e.preventDefault();
            const q = query.trim();
            setResults(
              q
                ? [`${q} - Official Fan Page (Under Construction)`, `${q} cheat codes and secrets!!`, `My ${q} shrine - best viewed in 800x600`, `${q} at Yahoo!`]
                : [],
            );
          }}
        >
          <input value={query} onChange={e => setQuery(e.target.value)} style={{ width: 260 }} placeholder="Search the Web" /> <button type="submit">Search</button>
        </form>
        {results && (
          <ol>
            {results.map(r => (
              <li key={r}>
                <a href="#" onClick={e => (e.preventDefault(), open(`http://www.yahoo.com/`))}>
                  {r}
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }
  return (
    <div className="web-page web-geo">
      <div className="geo-marquee">
        <span>★ Welcome to {getSettings().user}'s Totally Rad Home Page!!! ★ Sign my guestbook ★ Best viewed in Internet Explorer at 800x600 ★</span>
      </div>
      <h1 className="geo-title">{getSettings().user}'s Home Page</h1>
      <div className="geo-construction">
        <span>🚧</span> UNDER CONSTRUCTION <span>🚧</span>
      </div>
      <table className="geo-table">
        <tbody>
          <tr>
            <td>
              <h3>My Favorite Games</h3>
              <ul>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), COMMANDS.pinball())}>
                    Space Cadet Pinball
                  </a>{' '}
                  <span className="geo-new">NEW!</span>
                </li>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), COMMANDS.winmine())}>
                    Minesweeper
                  </a>
                </li>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), COMMANDS.sol())}>
                    Solitaire
                  </a>
                </li>
              </ul>
              <h3>My Stuff</h3>
              <ul>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), openLocal('mail'))}>
                    📬 My Inbox (3 new!)
                  </a>
                </li>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), openLocal('capsule'))}>
                    What's Hot in '98
                  </a>{' '}
                  <span className="geo-new">HOT!</span>
                </li>
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), COMMANDS.y2k())}>
                    Y2K Countdown Clock
                  </a>
                </li>
              </ul>
              <h3>Cool Links</h3>
              <ul>
                {BOOKMARKS.slice(0, 5).map(([name, url]) => (
                  <li key={url}>
                    <a href={url} onClick={e => (e.preventDefault(), open(url))}>
                      {name}
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#" onClick={e => (e.preventDefault(), openLocal('cool'))}>
                    More cool sites...
                  </a>
                </li>
              </ul>
            </td>
            <td>
              <h3>Guestbook</h3>
              <div className="geo-guest">
                {guest.map((g, i) => (
                  <div key={i}>{g}</div>
                ))}
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (!msg.trim()) return;
                  setGuest(g => [...g, `${getSettings().user}: ${msg.trim()}`]);
                  setMsg('');
                  sfx.ding();
                }}
              >
                <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="Sign it!" style={{ width: 150 }} /> <button type="submit">Sign</button>
              </form>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="geo-counter">
        You are visitor number{' '}
        {String(hits)
          .padStart(6, '0')
          .split('')
          .map((d, i) => (
            <span key={i}>{d}</span>
          ))}
      </div>
      <div className="geo-foot">
        <span className="geo-blink">Email me!</span> · This page made with Notepad · Last updated 10/26/98
        <br />
        Best viewed with Netscape Navigator 4.0 (you are using Internet Explorer, so good luck)
        <div className="geo-badges">
          <span>Netscape NOW!</span>
          <span>Made on a Mac</span>
          <span>AOL Keyword: RAD</span>
          <span>Webring ◀ ▶</span>
        </div>
      </div>
    </div>
  );
}

const MAIL: { from: string; subject: string; body: string }[] = [
  {
    from: 'Grandma',
    subject: 'FW: FW: FW: FW: cute!!!!',
    body: "I DONT KNOW HOW TO TURN OFF THE CAPS. HERE IS A PICTURE OF A CAT. FORWARD TO 10 PEOPLE OR YOU WILL HAVE BAD LUCK FOR 7 YEARS. LOVE GRANDMA. P.S. HOW DO I GET OFF THE INTERNET",
  },
  {
    from: 'Bill Gates (really!!)',
    subject: 'Microsoft is giving away $$$',
    body: 'Microsoft is testing a new email tracking program. Forward this to everyone you know and Bill Gates will pay you $245 for every person. My cousin did this and got a check for $4,000. This is NOT a hoax!!!',
  },
  {
    from: 'your best friend',
    subject: 'dancing_baby.avi',
    body: 'dude you HAVE to see this. its a baby. dancing. 3D. it took me 45 minutes to download. ooga chaka ooga ooga',
  },
];

function Inbox() {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="web-page web-plain mail">
      <h1>📬 Inbox</h1>
      <table className="mail-list">
        <tbody>
          {MAIL.map((m, i) => (
            <tr key={i} className={open === i ? 'on' : ''} onClick={() => setOpen(i)}>
              <td>{m.from}</td>
              <td>{m.subject}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mail-body">
        <b>From:</b> {MAIL[open].from}
        <br />
        <b>Subject:</b> {MAIL[open].subject}
        <p>{MAIL[open].body}</p>
      </div>
    </div>
  );
}

const HOT: [string, string][] = [
  ['🎬', 'Titanic is STILL in theaters. Everybody has seen it four times.'],
  ['💿', 'Windows 98 came out June 25. The computer on this desk has it. Obviously.'],
  ['🐣', 'Furby is the #1 toy for Christmas. Good luck finding one.'],
  ['⚡', 'Pokémon Red and Blue just came out in America. Gotta catch \'em all.'],
  ['🖥️', 'The new iMac comes in Bondi Blue. It has no floppy drive. Is that legal?'],
  ['🔍', 'Two guys started a search engine called Google. Weird name. It\'ll never catch on.'],
  ['📺', 'Seinfeld ended. Nobody knows what to do on Thursday nights.'],
  ['🎵', 'Everybody is Gettin\' Jiggy wit It.'],
  ['📟', 'Pagers are cool. 143 means I love you. 911 means call home NOW.'],
  ['💾', 'A 100 MB Zip disk holds SEVENTY floppies. The future is here.'],
];

function TimeCapsule() {
  return (
    <div className="web-page web-hot">
      <h1>🔥 What's Hot in '98 🔥</h1>
      <ul>
        {HOT.map(([e, t]) => (
          <li key={t}>
            <span>{e}</span> {t}
          </li>
        ))}
      </ul>
      <p className="web-small">This page has been visited by 1,337 people since 1997.</p>
    </div>
  );
}
