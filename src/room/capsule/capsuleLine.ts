/** The big word on the capsule's lid: the console or brand, short enough to shout. */
export function capsuleLine(id: string, title: string, era?: string): { line: string; movie: boolean; bananas: boolean } {
  if (id === 'cd-vhs') return { line: 'The Movie Row', movie: true, bananas: false };
  if (id === 'cd-snes') return { line: 'SNES', movie: false, bananas: true };
  const head = era?.split('·')[0]?.trim() ?? '';
  if (head && head.length <= 16 && !/^\d/.test(head)) return { line: head, movie: false, bananas: false };
  const words = title.split(/\s+/);
  return { line: words.slice(0, words[0].length > 9 ? 1 : 2).join(' '), movie: false, bananas: false };
}
