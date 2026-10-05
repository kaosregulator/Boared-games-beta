import {
  Card,
  RoomName,
  ROOMS,
  START_TILES,
  SUSPECTS,
  SECRET_PASSAGES,
  Suspect,
  WEAPONS,
  Weapon,
  allCards,
  cardKey,
  corridorDistance,
  doorsOf,
  isCorridor,
  roomAt,
} from './clueData';

export interface Suggestion {
  suspect: Suspect;
  weapon: Weapon;
  room: RoomName;
}

export interface ClueDetective {
  /** Cards this player has been shown or holds, so they are cleared. */
  cleared: Set<string>;
  /**
   * Suggestions that were refuted without revealing which card did it, from
   * this player's point of view. Used to narrow down by elimination.
   */
  maybes: { by: number; cards: Card[] }[];
}

export interface CluePlayer {
  id: number;
  suspect: Suspect;
  name: string;
  isAI: boolean;
  hand: Card[];
  at: [number, number];
  room: RoomName | null;
  outOfGame: boolean;
  detective: ClueDetective;
}

export interface ClueState {
  players: CluePlayer[];
  turn: number;
  solution: Suggestion;
  /** Where each weapon currently sits. */
  weaponRooms: Record<Weapon, RoomName>;
  die: number;
  stepsLeft: number;
  stage: 'roll' | 'move' | 'suggest' | 'reveal' | 'over';
  lastSuggestion: (Suggestion & { by: number }) | null;
  /** Who refuted and, if the viewer is entitled to see it, with what. */
  lastRefutation: { by: number; card: Card | null; hidden: boolean } | null;
  log: string[];
  winner: string | null;
}

const shuffle = <T,>(items: T[]) => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

const say = (s: ClueState, line: string) => {
  s.log = [line, ...s.log].slice(0, 40);
};

export function newClueGame(playerName: string): ClueState {
  const solution: Suggestion = {
    suspect: pick(SUSPECTS).id,
    weapon: pick(WEAPONS).id,
    room: pick(ROOMS),
  };

  const deck = shuffle(
    allCards().filter(
      c =>
        !(c.kind === 'suspect' && c.value === solution.suspect) &&
        !(c.kind === 'weapon' && c.value === solution.weapon) &&
        !(c.kind === 'room' && c.value === solution.room),
    ),
  );

  const seats: { suspect: Suspect; name: string; isAI: boolean }[] = [
    { suspect: 'Scarlett', name: playerName, isAI: false },
    { suspect: 'Mustard', name: 'Colonel Mustard', isAI: true },
    { suspect: 'Peacock', name: 'Mrs. Peacock', isAI: true },
    { suspect: 'Plum', name: 'Professor Plum', isAI: true },
  ];

  const players: CluePlayer[] = seats.map((seat, i) => ({
    id: i,
    suspect: seat.suspect,
    name: seat.name,
    isAI: seat.isAI,
    hand: [],
    at: START_TILES[seat.suspect],
    room: null,
    outOfGame: false,
    detective: { cleared: new Set(), maybes: [] },
  }));

  deck.forEach((card, i) => players[i % players.length].hand.push(card));
  players.forEach(p => p.hand.forEach(c => p.detective.cleared.add(cardKey(c))));

  const weaponRooms = WEAPONS.reduce((acc, w, i) => {
    acc[w.id] = ROOMS[i % ROOMS.length];
    return acc;
  }, {} as Record<Weapon, RoomName>);

  return {
    players,
    turn: 0,
    solution,
    weaponRooms,
    die: 0,
    stepsLeft: 0,
    stage: 'roll',
    lastSuggestion: null,
    lastRefutation: null,
    log: ['The body is in the cellar. Roll to start moving.'],
    winner: null,
  };
}

const clone = (s: ClueState): ClueState => ({
  ...s,
  players: s.players.map(p => ({
    ...p,
    hand: [...p.hand],
    detective: { cleared: new Set(p.detective.cleared), maybes: p.detective.maybes.map(m => ({ ...m, cards: [...m.cards] })) },
  })),
  weaponRooms: { ...s.weaponRooms },
});

/** Tiles (and room doors) the active player can reach with the steps they have. */
export function reachable(s: ClueState, steps: number) {
  const p = s.players[s.turn];
  const tiles: { x: number; y: number; cost: number }[] = [];
  const rooms: { room: RoomName; cost: number }[] = [];
  const occupied = new Set(
    s.players.filter(o => o.id !== p.id && !o.room).map(o => `${o.at[0]},${o.at[1]}`),
  );

  const origins: [number, number][] = p.room ? doorsOf(p.room) : [p.at];

  origins.forEach(origin => {
    for (let x = 0; x < 15; x += 1) {
      for (let y = 0; y < 15; y += 1) {
        if (!isCorridor(x, y) || occupied.has(`${x},${y}`)) continue;
        const d = corridorDistance(origin, [x, y]);
        if (d === null) continue;
        const cost = p.room ? d + 1 : d;
        if (cost === 0 || cost > steps) continue;
        const existing = tiles.find(t => t.x === x && t.y === y);
        if (!existing || existing.cost > cost) {
          if (existing) existing.cost = cost;
          else tiles.push({ x, y, cost });
        }
      }
    }
  });

  ROOMS.forEach(room => {
    if (room === p.room) return;
    doorsOf(room).forEach(door => {
      origins.forEach(origin => {
        const d = corridorDistance(origin, [door[0], door[1]]);
        if (d === null) return;
        const cost = (p.room ? d + 1 : d) + 1;
        if (cost > steps) return;
        const existing = rooms.find(r => r.room === room);
        if (!existing) rooms.push({ room, cost });
        else existing.cost = Math.min(existing.cost, cost);
      });
    });
  });

  return { tiles, rooms };
}

export function rollClueDie(state: ClueState): ClueState {
  const s = clone(state);
  if (s.stage !== 'roll') return state;
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  s.die = a + b;
  s.stepsLeft = s.die;
  s.stage = 'move';
  s.lastSuggestion = null;
  s.lastRefutation = null;
  say(s, `${s.players[s.turn].name} rolls ${a}+${b} = ${s.die}.`);
  return s;
}

export function moveToTile(state: ClueState, x: number, y: number): ClueState {
  const s = clone(state);
  if (s.stage !== 'move') return state;
  const p = s.players[s.turn];
  const { tiles } = reachable(s, s.stepsLeft);
  const hit = tiles.find(t => t.x === x && t.y === y);
  if (!hit) return state;
  p.at = [x, y];
  p.room = null;
  s.stepsLeft = 0;
  s.stage = 'roll';
  s.turn = nextSeat(s, s.turn);
  say(s, `${p.name} moves into the corridor.`);
  return s;
}

export function moveToRoom(state: ClueState, room: RoomName): ClueState {
  const s = clone(state);
  if (s.stage !== 'move') return state;
  const p = s.players[s.turn];
  const { rooms } = reachable(s, s.stepsLeft);
  const secret = p.room ? SECRET_PASSAGES[p.room] : undefined;
  if (!rooms.some(r => r.room === room) && secret !== room) return state;
  p.room = room;
  const door = doorsOf(room)[0];
  p.at = [door[0], door[1]];
  s.stepsLeft = 0;
  s.stage = 'suggest';
  say(s, `${p.name} enters the ${room}${secret === room ? ' by the secret passage' : ''}.`);
  return s;
}

function nextSeat(s: ClueState, from: number) {
  let next = from;
  for (let i = 0; i < s.players.length; i += 1) {
    next = (next + 1) % s.players.length;
    if (!s.players[next].outOfGame) break;
  }
  return next;
}

export function skipSuggestion(state: ClueState): ClueState {
  const s = clone(state);
  s.stage = 'roll';
  s.turn = nextSeat(s, s.turn);
  return s;
}

/**
 * Make a suggestion. The suspect and weapon are physically moved into the room,
 * then each player in turn order must show one matching card if they hold any.
 */
export function suggest(state: ClueState, suggestion: Suggestion): ClueState {
  const s = clone(state);
  if (s.stage !== 'suggest') return state;
  const asker = s.players[s.turn];

  s.weaponRooms[suggestion.weapon] = suggestion.room;
  const accused = s.players.find(p => p.suspect === suggestion.suspect);
  if (accused) {
    accused.room = suggestion.room;
    const door = doorsOf(suggestion.room)[0];
    accused.at = [door[0], door[1]];
  }

  say(
    s,
    `${asker.name} suggests ${suggestion.suspect} in the ${suggestion.room} with the ${suggestion.weapon}.`,
  );

  s.lastSuggestion = { ...suggestion, by: asker.id };
  s.lastRefutation = null;

  const wanted: Card[] = [
    { kind: 'suspect', value: suggestion.suspect },
    { kind: 'weapon', value: suggestion.weapon },
    { kind: 'room', value: suggestion.room },
  ];

  for (let step = 1; step < s.players.length; step += 1) {
    const responder = s.players[(asker.id + step) % s.players.length];
    const matches = responder.hand.filter(c =>
      wanted.some(w => w.kind === c.kind && w.value === c.value),
    );
    if (matches.length === 0) {
      say(s, `${responder.name} cannot disprove it.`);
      continue;
    }
    // An AI shows the card it has already revealed most often; a human seat
    // shows the first match. Either way the asker learns it.
    const shown = matches[0];
    asker.detective.cleared.add(cardKey(shown));
    s.lastRefutation = { by: responder.id, card: shown, hidden: asker.isAI };
    say(
      s,
      asker.isAI
        ? `${responder.name} shows ${asker.name} a card.`
        : `${responder.name} shows you the ${shown.value}.`,
    );
    s.stage = 'reveal';
    return s;
  }

  // Nobody could refute: everyone learns the whole suggestion is live.
  s.players.forEach(p => {
    if (p.id === asker.id) return;
    p.detective.maybes.push({ by: asker.id, cards: wanted });
  });
  s.lastRefutation = { by: -1, card: null, hidden: false };
  say(s, 'Nobody could disprove that suggestion.');
  s.stage = 'reveal';
  return s;
}

export function closeReveal(state: ClueState): ClueState {
  const s = clone(state);
  s.stage = 'roll';
  s.turn = nextSeat(s, s.turn);
  s.lastRefutation = null;
  return s;
}

export function accuse(state: ClueState, guess: Suggestion): ClueState {
  const s = clone(state);
  const p = s.players[s.turn];
  const right =
    guess.suspect === s.solution.suspect &&
    guess.weapon === s.solution.weapon &&
    guess.room === s.solution.room;

  say(
    s,
    `${p.name} accuses ${guess.suspect} in the ${guess.room} with the ${guess.weapon}.`,
  );

  if (right) {
    s.stage = 'over';
    s.winner = p.name;
    say(s, `Correct. ${p.name} cracks the case.`);
    return s;
  }

  p.outOfGame = true;
  say(s, `Wrong. ${p.name} is out of the game but keeps showing cards.`);
  const remaining = s.players.filter(x => !x.outOfGame);
  if (remaining.length <= 1) {
    s.stage = 'over';
    s.winner = remaining[0]?.name ?? 'Nobody';
    say(s, `${s.winner} is the last detective standing.`);
    return s;
  }
  s.stage = 'roll';
  s.turn = nextSeat(s, s.turn);
  return s;
}

/* -------------------------------- opponent -------------------------------- */

/** Everything a detective has not ruled out, split by category. */
export function openCards(p: CluePlayer) {
  const isOpen = (c: Card) => !p.detective.cleared.has(cardKey(c));
  return {
    suspects: SUSPECTS.map(s => s.id).filter(v => isOpen({ kind: 'suspect', value: v })),
    weapons: WEAPONS.map(w => w.id).filter(v => isOpen({ kind: 'weapon', value: v })),
    rooms: ROOMS.filter(v => isOpen({ kind: 'room', value: v })),
  };
}

export function aiSuggestion(s: ClueState): Suggestion {
  const p = s.players[s.turn];
  const open = openCards(p);
  return {
    suspect: open.suspects.length > 0 ? pick(open.suspects) : pick(SUSPECTS).id,
    weapon: open.weapons.length > 0 ? pick(open.weapons) : pick(WEAPONS).id,
    room: p.room!,
  };
}

/** An opponent accuses only once a single option is left in every category. */
export function aiShouldAccuse(s: ClueState): Suggestion | null {
  const p = s.players[s.turn];
  const open = openCards(p);
  if (open.suspects.length === 1 && open.weapons.length === 1 && open.rooms.length === 1) {
    return { suspect: open.suspects[0], weapon: open.weapons[0], room: open.rooms[0] };
  }
  return null;
}

/** Head for whichever unruled-out room is closest. */
export function aiRoomChoice(s: ClueState): RoomName | null {
  const p = s.players[s.turn];
  const { rooms } = reachable(s, s.stepsLeft);
  if (rooms.length === 0) return null;
  const open = openCards(p).rooms;
  const wanted = rooms.filter(r => open.includes(r.room));
  const list = wanted.length > 0 ? wanted : rooms;
  list.sort((a, b) => a.cost - b.cost);
  return list[0].room;
}

export function aiTileChoice(s: ClueState): [number, number] | null {
  const { tiles } = reachable(s, s.stepsLeft);
  if (tiles.length === 0) return null;
  // Drift towards the middle of the board so a room is in range next turn.
  tiles.sort(
    (a, b) =>
      Math.abs(a.x - 7) + Math.abs(a.y - 7) - (Math.abs(b.x - 7) + Math.abs(b.y - 7)),
  );
  return [tiles[0].x, tiles[0].y];
}

export { roomAt };
