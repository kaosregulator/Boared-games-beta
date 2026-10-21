/**
 * The FM dial. Live stations are SomaFM's listener-supported streams (all
 * confirmed on air via somafm.com/channels.json). The archive stations are real
 * broadcast airchecks on the Internet Archive, played from wherever they would
 * be "live" right now so tuning in drops you mid-song like real radio.
 */

export type StationSource = { kind: 'stream'; mount: string } | { kind: 'archive'; id: string };

export interface Station {
  id: string;
  freq: number;
  call: string;
  name: string;
  source: StationSource;
}

export const FM_MIN = 87.9;
export const FM_MAX = 107.9;

export const STATIONS: Station[] = [
  { id: 'seventies', freq: 88.5, call: 'SOMA', name: 'Left Coast 70s', source: { kind: 'stream', mount: 'seventies-128-mp3' } },
  { id: 'z100-88', freq: 90.3, call: 'Z100', name: 'Z100 New York · Aug 11 1988', source: { kind: 'archive', id: 'cftp-z100-1988-08-11' } },
  { id: 'u80s', freq: 92.7, call: 'SOMA', name: 'Underground 80s', source: { kind: 'stream', mount: 'u80s-128-mp3' } },
  { id: 'wplj-89', freq: 94.1, call: 'WPLJ', name: 'WPLJ New York · Dec 12 1989', source: { kind: 'archive', id: 'cftp-wplj-1989-12-12' } },
  { id: '7soul', freq: 96.5, call: 'SOMA', name: 'Seven Inch Soul', source: { kind: 'stream', mount: '7soul-128-mp3' } },
  { id: 'kmel-84', freq: 98.3, call: 'KMEL', name: 'KMEL San Francisco · Aug 25 1984', source: { kind: 'archive', id: 'KMEL_San_Francisco_08-25-84' } },
  { id: 'poptron', freq: 100.3, call: 'SOMA', name: 'PopTron', source: { kind: 'stream', mount: 'poptron-128-mp3' } },
  { id: 'foxkids-97', freq: 101.9, call: 'FOX', name: 'Fox Kids Countdown · Feb 23 1997', source: { kind: 'archive', id: 'fk-countdown-2-23-97' } },
  { id: 'secretagent', freq: 103.7, call: 'SOMA', name: 'Secret Agent', source: { kind: 'stream', mount: 'secretagent-128-mp3' } },
  { id: 'kfrc-86', freq: 105.1, call: 'KFRC', name: 'KFRC San Francisco · Aug 11 1986', source: { kind: 'archive', id: 'KFRC_San_Francisco_08-11-86' } },
  { id: 'groovesalad', freq: 106.7, call: 'SOMA', name: 'Groove Salad', source: { kind: 'stream', mount: 'groovesalad-128-mp3' } },
  { id: 'whtz-87', freq: 107.5, call: 'WHTZ', name: 'WHTZ New York · Dec 4 1987', source: { kind: 'archive', id: 'WHTZ_New_York_12-04-87' } },
];

/** SomaFM serves every mount from several Icecast hosts; try each. */
export function streamUrls(mount: string) {
  return ['ice2', 'ice4', 'ice6', 'ice1'].map(host => `https://${host}.somafm.com/${mount}`);
}
