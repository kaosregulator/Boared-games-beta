/**
 * Writes what each time capsule says aloud to scripts/voice/narration.json:
 * the card's own words, in the order the card shows them (src/room/capsuleText.ts).
 *
 *   npx tsx scripts/voice/narration.ts
 */
import fs from 'node:fs';
import { PROP_CARDS, propCardFor } from '../../src/room/propCards';
import { GAME_CATALOG } from '../../src/utils/gameData';
import { gameKindLine, gamePages, narrate, propKindLine, propPages, voiceKey } from '../../src/room/capsuleText';

const out: Record<string, string> = {};
for (const id of Object.keys(PROP_CARDS)) {
  const prop = propCardFor(id)!;
  out[voiceKey('prop', id)] = narrate(prop.title, propKindLine(prop), propPages(prop));
}
for (const game of GAME_CATALOG) out[voiceKey('game', game.id)] = narrate(game.title, gameKindLine(game), gamePages(game));
fs.writeFileSync('scripts/voice/narration.json', JSON.stringify(out, null, 1) + '\n');
console.log(`${Object.keys(out).length} cards, ${Object.values(out).reduce((n, t) => n + t.length, 0)} characters`);
