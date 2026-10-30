import type { GameMetadata } from '../types';
import type { PropCard } from './propCards';

/**
 * What a time capsule says, laid out the way the card shows it: pages of up to
 * four blocks round the hologram. The card draws these, and the hologram voice
 * reads the same words aloud (scripts/voice), so the two never drift apart.
 */

/** One block of writing round the map: a label and either a line of text or a list. */
export interface CapsuleNode {
  label: string;
  text?: string;
  items?: string[];
  tip?: boolean;
}

/** Up to four nodes, in the order top-left, top-right, bottom-left, bottom-right. */
export type CapsulePage = CapsuleNode[];

/** Board games that already have a real in-room engine vs coming-soon shells. */
export const ONLINE_READY = new Set([
  'monopoly',
  'clue',
  'yahtzee',
  'checkers',
  'chess',
  'connect4',
  'gofish',
  'poker',
  'blackjack',
  'battleship',
  'life',
  'pawnrush',
  'guesswho',
  'mousetrap',
]);

const fact = (f?: { label: string; value: string }): CapsuleNode | undefined => (f ? { label: f.label, text: f.value } : undefined);

/** Four to a page, empty slots closed up, empty pages dropped. */
function paginate(...pages: (CapsuleNode | undefined)[][]): CapsulePage[] {
  return pages.map(p => p.filter((n): n is CapsuleNode => !!n)).filter(p => p.length > 0);
}

export function propKindLine(prop: PropCard): string[] {
  const line = [prop.kind, prop.year ?? prop.era, prop.maker].filter((x): x is string => !!x);
  return line.length ? line : [prop.era];
}

export function propPages(prop: PropCard): CapsulePage[] {
  const facts = prop.facts ?? [];
  const tip: CapsuleNode | undefined = prop.joke ? { label: 'Childhood Pro Tip', text: prop.joke, tip: true } : undefined;
  const memories: CapsuleNode | undefined = prop.memories.length ? { label: 'Word On The Playground', items: prop.memories } : undefined;
  return prop.history
    ? paginate(
        [tip, fact(facts[0]), { label: 'The Real Story', text: prop.history }, fact(facts[1])],
        [{ label: 'Back In The Day', text: prop.story }, fact(facts[2]), memories, fact(facts[3])],
        facts.slice(4).map(fact),
      )
    : paginate([tip, fact(facts[0]), { label: 'The Story', text: prop.story }, fact(facts[1])], [memories, ...facts.slice(2).map(fact)]);
}

export function gameKindLine(game: GameMetadata): string[] {
  return [game.subtitle || 'Board game', ONLINE_READY.has(game.id) ? 'Plays in the room' : 'Coming soon'];
}

export function gamePages(game: GameMetadata): CapsulePage[] {
  const half = Math.ceil(game.rules.length / 2);
  return paginate(
    [
      { label: 'Players', text: game.players },
      { label: 'Takes', text: game.duration },
      { label: 'The Game', text: game.description },
      game.rating ? { label: 'Rated', text: game.rating } : undefined,
    ],
    [
      game.rules.length ? { label: 'How It Plays', items: game.rules.slice(0, half) } : undefined,
      game.rules.length > half ? { label: '…And Then', items: game.rules.slice(half) } : undefined,
    ],
  );
}

/** Said the way you'd read it out loud, not the way it's printed. */
function speakable(text: string) {
  return text
    .replace(/[★☆]+/g, '')
    .replace(/(\d)\s*×\s*(\d)/g, '$1 by $2')
    .replace(/\s*[•·]\s*/g, ', ')
    .replace(/&/g, ' and ')
    .replace(/(\d)\s*MB\b/g, '$1 megabytes')
    .replace(/(\d)\s*kbps\b/g, '$1 kilobits a second')
    .replace(/(\d)\s*MHz\b/g, '$1 megahertz')
    .replace(/\s*[–—]\s*/g, ', ')
    .replace(/…/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const sentence = (text: string) => {
  const t = speakable(text);
  return /[.!?'"’”)]$/.test(t) ? t : `${t}.`;
};

/** The whole card as one script for the hologram voice: name, what it is, then every block, page by page. */
export function narrate(title: string, kindLine: string[], pages: CapsulePage[]): string {
  const parts = [sentence(title), sentence(kindLine.join(', '))];
  for (const page of pages) {
    for (const node of page) {
      const label = node.label.replace(/…/g, '').trim();
      if (node.text) parts.push(`${label}: ${sentence(node.text)}`);
      if (node.items) parts.push(`${label}: ${node.items.map(sentence).join(' ')}`);
    }
  }
  return parts.join(' ');
}

/** The id the voice files use: the prop's card id, or game-<id> for a board game. */
export const voiceKey = (kind: 'prop' | 'game', id: string) => (kind === 'game' ? `game-${id}` : id);
