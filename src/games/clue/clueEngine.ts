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
  /** Pulled into a room by someone else's suggestion since their last move. */
  pulled?: boolean;
  detective: ClueDetective;
}

/** A suspect nobody is playing: their piece still stands on the board. */
export interface ClueBystander {
  suspect: Suspect;
  at: [number, number];
  room: RoomName | null;
}

export interface ClueOptions {
  /** Which suspect the player is. Defaults to Miss Scarlett. */
  me?: Suspect;
  /** 3 to 6 seats. Defaults to the classic four. */
  seats?: number;
  /** A human refuter picks which matching card to show. */
  refuterChooses?: boolean;
}

export interface ClueState {
  players: CluePlayer[];
  turn: number;
  solution: Suggestion;
  /** Where each weapon currently sits. */
  weaponRooms: Record<Weapon, RoomName>;
  die: number;
  stepsLeft: number;
  stage: 'roll' | 'move' | 'suggest' | 'refute' | 'reveal' | 'over';
  /** Unplayed suspects, still on the board so a suggestion can call them in. */
  bystanders: ClueBystander[];
  refuterChooses: boolean;
  /** A human refuter holding more than one match, choosing which to show. */
  pendingRefute: { by: number; options: Card[] } | null;
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

/** Classic turn order: Miss Scarlett always goes first, then round the table. */
const TURN_ORDER: Suspect[] = ['Scarlett', 'Mustard', 'White', 'Green', 'Peacock', 'Plum'];

export function newClueGame(playerName: string, opts: ClueOptions = {}): ClueState {
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

  const fullName = (id: Suspect) => SUSPECTS.find(x => x.id === id)!.full;
  let seats: { suspect: Suspect; name: string; isAI: boolean }[] = [
    { suspect: 'Scarlett', name: playerName, isAI: false },
    { suspect: 'Mustard', name: 'Colonel Mustard', isAI: true },
    { suspect: 'Peacock', name: 'Mrs. Peacock', isAI: true },
    { suspect: 'Plum', name: 'Professor Plum', isAI: true },
  ];
  if (opts.me || opts.seats) {
    const me = opts.me ?? 'Scarlett';
    const count = Math.max(3, Math.min(6, opts.seats ?? 4));
    const others = shuffle(TURN_ORDER.filter(id => id !== me)).slice(0, count - 1);
    seats = TURN_ORDER.filter(id => id === me || others.includes(id)).map(id => ({
      suspect: id,
      name: id === me ? playerName : fullName(id),
      isAI: id !== me,
    }));
  }

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

  const bystanders: ClueBystander[] = TURN_ORDER.filter(id => !seats.some(seat => seat.suspect === id)).map(id => ({
    suspect: id,
    at: START_TILES[id],
    room: null,
  }));

  return {
    players,
    turn: 0,
    solution,
    weaponRooms,
    bystanders,
    refuterChooses: Boolean(opts.refuterChooses),
    pendingRefute: null,
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
  bystanders: (s.bystanders ?? []).map(b => ({ ...b })),
  pendingRefute: s.pendingRefute ? { ...s.pendingRefute, options: [...s.pendingRefute.options] } : null,
});

/** Tiles (and room doors) the active player can reach with the steps they have. */
export function reachable(s: ClueState, steps: number) {
  const p = s.players[s.turn];
  const tiles: { x: number; y: number; cost: number }[] = [];
  const rooms: { room: RoomName; cost: number }[] = [];
  const occupied = new Set([
    ...s.players.filter(o => o.id !== p.id && !o.room).map(o => `${o.at[0]},${o.at[1]}`),
    ...(s.bystanders ?? []).filter(b => !b.room).map(b => `${b.at[0]},${b.at[1]}`),
  ]);

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

/** Roll two dice; the 3D table passes in what its thrown dice show. */
export function rollClueDie(state: ClueState, values?: [number, number]): ClueState {
  const s = clone(state);
  if (s.stage !== 'roll') return state;
  const a = values?.[0] ?? 1 + Math.floor(Math.random() * 6);
  const b = values?.[1] ?? 1 + Math.floor(Math.random() * 6);
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
  p.pulled = false;
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
  p.pulled = false;
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

/** Take the secret passage out of this room instead of rolling. */
export function takePassage(state: ClueState): ClueState {
  if (state.stage !== 'roll') return state;
  const p = state.players[state.turn];
  const to = p.room ? SECRET_PASSAGES[p.room] : undefined;
  if (!to) return state;
  const s = clone(state);
  const me = s.players[s.turn];
  me.room = to;
  me.pulled = false;
  const door = doorsOf(to)[0];
  me.at = [door[0], door[1]];
  s.stage = 'suggest';
  s.lastSuggestion = null;
  s.lastRefutation = null;
  say(s, `${me.name} takes the secret passage to the ${to}.`);
  return s;
}

/** Called into a room by someone else's suggestion: suggest there without moving. */
export function suggestHere(state: ClueState): ClueState {
  const p = state.players[state.turn];
  if (state.stage !== 'roll' || !p.pulled || !p.room) return state;
  const s = clone(state);
  s.players[s.turn].pulled = false;
  s.stage = 'suggest';
  s.lastSuggestion = null;
  s.lastRefutation = null;
  return s;
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
  const door = doorsOf(suggestion.room)[0];
  if (accused) {
    if (accused.id !== asker.id && accused.room !== suggestion.room) accused.pulled = true;
    accused.room = suggestion.room;
    accused.at = [door[0], door[1]];
  }
  const bystander = s.bystanders.find(b => b.suspect === suggestion.suspect);
  if (bystander) {
    bystander.room = suggestion.room;
    bystander.at = [door[0], door[1]];
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
    // A human seat at the table picks which match to show; otherwise the
    // first match goes. Either way the asker learns it.
    if (s.refuterChooses && !responder.isAI && matches.length > 1) {
      s.pendingRefute = { by: responder.id, options: matches };
      s.stage = 'refute';
      say(s, `${responder.name} can disprove it and is choosing a card.`);
      return s;
    }
    return reveal(s, responder.id, matches[0]);
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

function reveal(s: ClueState, by: number, shown: Card): ClueState {
  const asker = s.players[s.turn];
  const responder = s.players[by];
  asker.detective.cleared.add(cardKey(shown));
  s.lastRefutation = { by, card: shown, hidden: asker.isAI };
  s.pendingRefute = null;
  say(
    s,
    asker.isAI
      ? `${responder.name} shows ${asker.name} a card.`
      : `${responder.name} shows you the ${shown.value}.`,
  );
  s.stage = 'reveal';
  return s;
}

/** The human refuter's pick from their matching cards. */
export function showCard(state: ClueState, card: Card): ClueState {
  if (state.stage !== 'refute' || !state.pendingRefute) return state;
  if (!state.pendingRefute.options.some(c => cardKey(c) === cardKey(card))) return state;
  const s = clone(state);
  return reveal(s, s.pendingRefute!.by, card);
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

/** Before rolling: take a passage, or suggest where they were pulled, if it helps. */
export function aiBeforeRoll(s: ClueState): 'passage' | 'suggest' | null {
  const p = s.players[s.turn];
  if (!p.room) return null;
  const open = openCards(p).rooms;
  if (p.pulled && open.includes(p.room)) return 'suggest';
  const to = SECRET_PASSAGES[p.room];
  if (to && open.includes(to)) return 'passage';
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
