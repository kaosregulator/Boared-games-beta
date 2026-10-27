import {
  BOARD,
  CHANCE,
  CHEST,
  Card,
  GO_SALARY,
  GROUP_SIZE,
  JAIL_FINE,
  JAIL_INDEX,
  RAILROAD_RENT,
  START_CASH,
  Space,
} from './monopolyData';

export interface Player {
  id: number;
  name: string;
  token: string;
  glyph: string;
  colour: string;
  isAI: boolean;
  cash: number;
  at: number;
  inJail: boolean;
  jailTurns: number;
  getOutCards: number;
  bankrupt: boolean;
}

export interface Holding {
  owner: number;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface GameState {
  players: Player[];
  turn: number;
  /** Space index -> ownership record. */
  deeds: Record<number, Holding>;
  dice: [number, number];
  doublesRun: number;
  /** 'roll' waits for a throw, 'resolve' waits for a decision, 'auction' is a bid, 'end' waits for the hand-off. */
  stage: 'roll' | 'resolve' | 'auction' | 'end' | 'over';
  pendingPurchase: number | null;
  /** A property nobody bought outright. Null unless stage is 'auction'. */
  auction: null | { space: number; high: number; leader: number | null; seat: number; passed: boolean[] };
  drawnCard: Card | null;
  log: string[];
  chanceDeck: number[];
  chestDeck: number[];
  freeParkingPot: number;
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

const deckIndices = (len: number) => shuffle(Array.from({ length: len }, (_, i) => i));

export const PLAYER_COLOURS = ['#f0b429', '#38bdf8', '#f87171', '#4ade80'];

export function newGame(names: { name: string; isAI: boolean; token: string; glyph: string }[]): GameState {
  return {
    players: names.map((n, i) => ({
      id: i,
      name: n.name,
      token: n.token,
      glyph: n.glyph,
      colour: PLAYER_COLOURS[i % PLAYER_COLOURS.length],
      isAI: n.isAI,
      cash: START_CASH,
      at: 0,
      inJail: false,
      jailTurns: 0,
      getOutCards: 0,
      bankrupt: false,
    })),
    turn: 0,
    deeds: {},
    dice: [1, 1],
    doublesRun: 0,
    stage: 'roll',
    pendingPurchase: null,
    auction: null,
    drawnCard: null,
    log: ['Roll to leave GO.'],
    chanceDeck: deckIndices(CHANCE.length),
    chestDeck: deckIndices(CHEST.length),
    freeParkingPot: 0,
    winner: null,
  };
}

const say = (s: GameState, line: string) => {
  s.log = [line, ...s.log].slice(0, 40);
};

export const spaceAt = (i: number): Space => BOARD[i];

export function ownedCountInGroup(s: GameState, owner: number, group: string) {
  return BOARD.filter(sp => sp.group === group && s.deeds[sp.i]?.owner === owner).length;
}

export function hasMonopoly(s: GameState, owner: number, group?: string) {
  if (!group) return false;
  return ownedCountInGroup(s, owner, group) === GROUP_SIZE[group];
}

/** Rent owed for landing on a space, given the roll that got you there. */
export function rentFor(s: GameState, i: number, roll: number): number {
  const space = spaceAt(i);
  const deed = s.deeds[i];
  if (!deed || deed.mortgaged) return 0;

  if (space.kind === 'railroad') {
    return RAILROAD_RENT[ownedCountInGroup(s, deed.owner, 'rail')];
  }
  if (space.kind === 'utility') {
    const owned = ownedCountInGroup(s, deed.owner, 'util');
    return roll * (owned >= 2 ? 10 : 4);
  }
  if (space.kind === 'street' && space.rent) {
    if (deed.hotel) return space.rent[5];
    if (deed.houses > 0) return space.rent[deed.houses];
    return hasMonopoly(s, deed.owner, space.group) ? space.rent[0] * 2 : space.rent[0];
  }
  return 0;
}

export function netWorth(s: GameState, p: Player) {
  let worth = p.cash;
  BOARD.forEach(sp => {
    const deed = s.deeds[sp.i];
    if (deed?.owner !== p.id) return;
    worth += sp.price ?? 0;
    worth += deed.houses * (sp.houseCost ?? 0);
    if (deed.hotel) worth += 5 * (sp.houseCost ?? 0);
  });
  return worth;
}

/** True once only one solvent player is left. */
function checkWinner(s: GameState) {
  const alive = s.players.filter(p => !p.bankrupt);
  if (alive.length <= 1) {
    s.stage = 'over';
    s.winner = alive[0]?.name ?? 'Nobody';
    say(s, `${s.winner} owns the board.`);
    return true;
  }
  return false;
}

function pay(s: GameState, from: Player, amount: number, to?: Player) {
  const owed = Math.min(amount, Math.max(amount, 0));
  from.cash -= owed;
  if (to) to.cash += owed;

  if (from.cash < 0) {
    // Sell buildings and hand the deeds over, then drop out.
    BOARD.forEach(sp => {
      const deed = s.deeds[sp.i];
      if (deed?.owner !== from.id) return;
      from.cash += Math.floor(((deed.houses + (deed.hotel ? 5 : 0)) * (sp.houseCost ?? 0)) / 2);
      if (to) {
        s.deeds[sp.i] = { owner: to.id, houses: 0, hotel: false, mortgaged: false };
      } else {
        delete s.deeds[sp.i];
      }
    });
    if (from.cash < 0) {
      from.bankrupt = true;
      from.cash = 0;
      say(s, `${from.name} is bankrupt${to ? ` to ${to.name}` : ''}.`);
      checkWinner(s);
    }
  }
}

function drawCard(s: GameState, deck: 'chance' | 'chest'): Card {
  const list = deck === 'chance' ? CHANCE : CHEST;
  const key = deck === 'chance' ? 'chanceDeck' : 'chestDeck';
  if (s[key].length === 0) s[key] = deckIndices(list.length);
  const idx = s[key].shift()!;
  return list[idx];
}

function passGo(s: GameState, p: Player, from: number, to: number) {
  if (to < from) {
    p.cash += GO_SALARY;
    say(s, `${p.name} passed GO and collected $${GO_SALARY}.`);
  }
}

function sendToJail(s: GameState, p: Player) {
  p.at = JAIL_INDEX;
  p.inJail = true;
  p.jailTurns = 0;
  s.doublesRun = 0;
  say(s, `${p.name} goes to jail.`);
}

function applyCard(s: GameState, p: Player, card: Card, roll: number) {
  s.drawnCard = card;
  say(s, `${p.name}: ${card.text}`);
  const e = card.effect;
  switch (e.type) {
    case 'move': {
      const from = p.at;
      p.at = e.to;
      passGo(s, p, from, e.to);
      land(s, p, roll, true);
      break;
    }
    case 'moveBy': {
      p.at = (p.at + e.steps + 40) % 40;
      land(s, p, roll, true);
      break;
    }
    case 'nearest': {
      const from = p.at;
      let i = p.at;
      do {
        i = (i + 1) % 40;
      } while (spaceAt(i).group !== e.group);
      p.at = i;
      passGo(s, p, from, i);
      const deed = s.deeds[i];
      if (!deed) {
        s.pendingPurchase = i;
        s.stage = 'resolve';
      } else if (deed.owner !== p.id && !deed.mortgaged) {
        const owner = s.players[deed.owner];
        const base = e.group === 'rail' ? RAILROAD_RENT[ownedCountInGroup(s, deed.owner, 'rail')] * 2 : roll * 10;
        pay(s, p, base, owner);
        say(s, `${p.name} pays ${owner.name} $${base}.`);
      }
      break;
    }
    case 'cash':
      p.cash += e.amount;
      if (p.cash < 0) pay(s, p, 0);
      break;
    case 'collectEach':
      s.players.forEach(other => {
        if (other.id === p.id || other.bankrupt) return;
        pay(s, other, e.amount, p);
      });
      break;
    case 'payEach':
      s.players.forEach(other => {
        if (other.id === p.id || other.bankrupt) return;
        pay(s, p, e.amount, other);
      });
      break;
    case 'jail':
      sendToJail(s, p);
      break;
    case 'getOutFree':
      p.getOutCards += 1;
      break;
    case 'repairs': {
      let bill = 0;
      BOARD.forEach(sp => {
        const deed = s.deeds[sp.i];
        if (deed?.owner !== p.id) return;
        bill += deed.hotel ? e.perHotel : deed.houses * e.perHouse;
      });
      if (bill > 0) {
        pay(s, p, bill);
        say(s, `${p.name} pays $${bill} in repairs.`);
      }
      break;
    }
    default:
      break;
  }
}

/** Resolve whatever the square the player is standing on does. */
function land(s: GameState, p: Player, roll: number, fromCard = false) {
  const space = spaceAt(p.at);
  s.stage = 'resolve';

  switch (space.kind) {
    case 'street':
    case 'railroad':
    case 'utility': {
      const deed = s.deeds[p.at];
      if (!deed) {
        s.pendingPurchase = p.at;
        return;
      }
      if (deed.owner === p.id || deed.mortgaged) return;
      const owner = s.players[deed.owner];
      const rent = rentFor(s, p.at, roll);
      pay(s, p, rent, owner);
      say(s, `${p.name} pays ${owner.name} $${rent} for ${space.short}.`);
      return;
    }
    case 'tax': {
      const amount = space.tax ?? 0;
      pay(s, p, amount);
      s.freeParkingPot += amount;
      say(s, `${p.name} pays $${amount} ${space.name}.`);
      return;
    }
    case 'parking':
      if (s.freeParkingPot > 0) {
        p.cash += s.freeParkingPot;
        say(s, `${p.name} sweeps $${s.freeParkingPot} off Free Parking.`);
        s.freeParkingPot = 0;
      }
      return;
    case 'gotojail':
      sendToJail(s, p);
      return;
    case 'chance':
      if (!fromCard) applyCard(s, p, drawCard(s, 'chance'), roll);
      return;
    case 'chest':
      if (!fromCard) applyCard(s, p, drawCard(s, 'chest'), roll);
      return;
    default:
      return;
  }
}

export function rollDice(state: GameState, forced?: [number, number]): GameState {
  const s: GameState = { ...state, players: state.players.map(p => ({ ...p })), deeds: { ...state.deeds } };
  if (s.stage !== 'roll' || s.stage === undefined) return state;
  const p = s.players[s.turn];
  const d: [number, number] = forced ?? [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
  s.dice = d;
  s.drawnCard = null;
  s.pendingPurchase = null;
  const total = d[0] + d[1];
  const doubles = d[0] === d[1];

  if (p.inJail) {
    p.jailTurns += 1;
    if (doubles) {
      p.inJail = false;
      p.jailTurns = 0;
      say(s, `${p.name} rolls doubles and walks out of jail.`);
    } else if (p.getOutCards > 0) {
      p.getOutCards -= 1;
      p.inJail = false;
      p.jailTurns = 0;
      say(s, `${p.name} uses a Get Out Of Jail Free card.`);
    } else if (p.jailTurns >= 3) {
      pay(s, p, JAIL_FINE);
      p.inJail = false;
      p.jailTurns = 0;
      say(s, `${p.name} pays the $${JAIL_FINE} fine after three turns.`);
    } else {
      say(s, `${p.name} stays in jail (${d[0]}+${d[1]}).`);
      s.stage = 'end';
      return s;
    }
  }

  if (doubles) {
    s.doublesRun += 1;
    if (s.doublesRun >= 3) {
      say(s, `${p.name} rolls a third double and is caught speeding.`);
      sendToJail(s, p);
      s.stage = 'end';
      return s;
    }
  } else {
    s.doublesRun = 0;
  }

  const from = p.at;
  p.at = (p.at + total) % 40;
  say(s, `${p.name} rolls ${d[0]}+${d[1]} to ${spaceAt(p.at).short}.`);
  passGo(s, p, from, p.at);
  land(s, p, total);
  return s;
}

export function buyPending(state: GameState, buy: boolean): GameState {
  const s: GameState = { ...state, players: state.players.map(p => ({ ...p })), deeds: { ...state.deeds } };
  const i = s.pendingPurchase;
  if (i === null) return state;
  const p = s.players[s.turn];
  const space = spaceAt(i);
  s.pendingPurchase = null;

  if (buy && space.price !== undefined && p.cash >= space.price) {
    p.cash -= space.price;
    s.deeds[i] = { owner: p.id, houses: 0, hotel: false, mortgaged: false };
    say(s, `${p.name} buys ${space.short} for $${space.price}.`);
    s.stage = 'end';
    return s;
  }
  if (buy) say(s, `${p.name} cannot afford ${space.short}.`);
  else say(s, `${p.name} passes on ${space.short}.`);

  const others = s.players.filter(pl => !pl.bankrupt && pl.id !== p.id);
  if (!buy && others.length > 0 && space.price !== undefined) {
    s.auction = { space: i, high: 0, leader: null, seat: p.id, passed: s.players.map(pl => pl.bankrupt) };
    s.stage = 'auction';
    say(s, `${space.short} is up for auction.`);
    return advanceAuction(s);
  }
  s.stage = 'end';
  return s;
}

function clonePlay(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map(p => ({ ...p })),
    deeds: { ...state.deeds },
    auction: state.auction ? { ...state.auction, passed: [...state.auction.passed] } : null,
  };
}

function closeAuction(s: GameState): GameState {
  const a = s.auction;
  s.auction = null;
  s.stage = 'end';
  if (!a || a.leader === null || a.high <= 0) {
    say(s, 'Nobody bids. The bank keeps it.');
    return s;
  }
  const winner = s.players[a.leader];
  const price = Math.min(a.high, winner.cash);
  winner.cash -= price;
  s.deeds[a.space] = { owner: winner.id, houses: 0, hotel: false, mortgaged: false };
  say(s, `${winner.name} wins ${spaceAt(a.space).short} for $${price}.`);
  return s;
}

/** Move the bid to the next player who has not passed. Close when only the leader is left. */
function advanceAuction(s: GameState): GameState {
  const a = s.auction;
  if (!a) return s;
  const live = s.players.filter(p => !p.bankrupt && !a.passed[p.id]);
  if (live.length === 0 || (a.leader !== null && live.every(p => p.id === a.leader))) return closeAuction(s);
  let n = a.seat;
  for (let i = 0; i < s.players.length; i += 1) {
    n = (n + 1) % s.players.length;
    if (!s.players[n].bankrupt && !a.passed[n]) {
      a.seat = n;
      return s;
    }
  }
  return closeAuction(s);
}

export function auctionBid(state: GameState): GameState {
  if (state.stage !== 'auction' || !state.auction) return state;
  const s = clonePlay(state);
  const a = s.auction!;
  const p = s.players[a.seat];
  const next = a.high + 10;
  if (p.cash < next) return auctionPass(state);
  a.high = next;
  a.leader = p.id;
  say(s, `${p.name} bids $${next}.`);
  return advanceAuction(s);
}

export function auctionPass(state: GameState): GameState {
  if (state.stage !== 'auction' || !state.auction) return state;
  const s = clonePlay(state);
  const a = s.auction!;
  const p = s.players[a.seat];
  a.passed[p.id] = true;
  say(s, `${p.name} passes.`);
  return advanceAuction(s);
}

function groupLevels(s: GameState, group: string) {
  return BOARD.filter(sp => sp.group === group).map(sp => {
    const d = s.deeds[sp.i];
    return d?.hotel ? 5 : (d?.houses ?? 0);
  });
}

export function canSellBuilding(s: GameState, i: number, owner: number) {
  const space = spaceAt(i);
  const deed = s.deeds[i];
  if (!deed || deed.owner !== owner || (!deed.hotel && deed.houses <= 0)) return false;
  if (space.kind !== 'street' || !space.group) return false;
  const mine = deed.hotel ? 5 : deed.houses;
  return mine >= Math.max(...groupLevels(s, space.group));
}

export function sellBuilding(state: GameState, i: number): GameState {
  const s = clonePlay(state);
  const p = s.players[s.turn];
  if (!canSellBuilding(s, i, p.id)) return state;
  const space = spaceAt(i);
  const deed = { ...s.deeds[i] };
  const back = Math.floor((space.houseCost ?? 0) / 2);
  p.cash += back;
  if (deed.hotel) {
    deed.hotel = false;
    deed.houses = 4;
    say(s, `${p.name} sells the hotel on ${space.short} for $${back}.`);
  } else {
    deed.houses -= 1;
    say(s, `${p.name} sells a house on ${space.short} for $${back}.`);
  }
  s.deeds[i] = deed;
  return s;
}

export function canMortgage(s: GameState, i: number, owner: number) {
  const deed = s.deeds[i];
  const space = spaceAt(i);
  if (!deed || deed.owner !== owner || deed.mortgaged || deed.houses > 0 || deed.hotel) return false;
  if (space.kind === 'street' && space.group) {
    const built = BOARD.filter(sp => sp.group === space.group).some(sp => {
      const d = s.deeds[sp.i];
      return Boolean(d && (d.houses > 0 || d.hotel));
    });
    if (built) return false;
  }
  return true;
}

export function mortgage(state: GameState, i: number): GameState {
  const s = clonePlay(state);
  const p = s.players[s.turn];
  if (!canMortgage(s, i, p.id)) return state;
  const space = spaceAt(i);
  const back = Math.floor((space.price ?? 0) / 2);
  p.cash += back;
  s.deeds[i] = { ...s.deeds[i], mortgaged: true };
  say(s, `${p.name} mortgages ${space.short} for $${back}.`);
  return s;
}

/** Offer your cheapest open street to the next player, at 80% of the price. */
export function offerTrade(state: GameState): GameState {
  const s = clonePlay(state);
  const me = s.players[s.turn];
  const them = s.players.find(p => p.id !== me.id && !p.bankrupt);
  const mine = BOARD.filter(sp => sp.kind === 'street' && canMortgage(s, sp.i, me.id)).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (!them || mine.length === 0) {
    say(s, `${me.name} has nothing free to trade.`);
    return s;
  }
  const sp = mine[0];
  const price = Math.floor((sp.price ?? 0) * 0.8);
  const wants = them.cash >= price && (aiWantsToBuy({ ...s, turn: them.id }, sp.i) || price <= (sp.price ?? 0));
  if (!wants) {
    say(s, `${them.name} passes on ${sp.short}.`);
    return s;
  }
  them.cash -= price;
  me.cash += price;
  s.deeds[sp.i] = { ...s.deeds[sp.i], owner: them.id };
  say(s, `${me.name} sells ${sp.short} to ${them.name} for $${price}.`);
  return s;
}

export function canBuild(s: GameState, i: number, owner: number) {
  const space = spaceAt(i);
  if (space.kind !== 'street' || !space.group) return false;
  const deed = s.deeds[i];
  if (!deed || deed.owner !== owner || deed.mortgaged || deed.hotel) return false;
  if (!hasMonopoly(s, owner, space.group)) return false;
  // Even build rule: never more than one ahead of the lowest in the group.
  const group = BOARD.filter(sp => sp.group === space.group);
  const levels = group.map(sp => {
    const d = s.deeds[sp.i];
    return d?.hotel ? 5 : (d?.houses ?? 0);
  });
  const mine = deed.hotel ? 5 : deed.houses;
  if (mine > Math.min(...levels)) return false;
  return s.players[owner].cash >= (space.houseCost ?? 0);
}

export function build(state: GameState, i: number): GameState {
  const s: GameState = { ...state, players: state.players.map(p => ({ ...p })), deeds: { ...state.deeds } };
  const p = s.players[s.turn];
  if (!canBuild(s, i, p.id)) return state;
  const space = spaceAt(i);
  const deed = { ...s.deeds[i] };
  p.cash -= space.houseCost ?? 0;
  if (deed.houses >= 4) {
    deed.houses = 0;
    deed.hotel = true;
    say(s, `${p.name} puts a hotel on ${space.short}.`);
  } else {
    deed.houses += 1;
    say(s, `${p.name} builds house ${deed.houses} on ${space.short}.`);
  }
  s.deeds[i] = deed;
  return s;
}

export function endTurn(state: GameState): GameState {
  const s: GameState = { ...state, players: state.players.map(p => ({ ...p })), deeds: { ...state.deeds } };
  if (s.stage === 'over') return state;
  const p = s.players[s.turn];
  s.pendingPurchase = null;
  s.drawnCard = null;

  // Another throw after doubles, unless jail ended the turn.
  if (s.doublesRun > 0 && !p.inJail && !p.bankrupt) {
    s.stage = 'roll';
    say(s, `${p.name} rolled doubles and goes again.`);
    return s;
  }

  s.doublesRun = 0;
  let next = s.turn;
  for (let step = 0; step < s.players.length; step += 1) {
    next = (next + 1) % s.players.length;
    if (!s.players[next].bankrupt) break;
  }
  s.turn = next;
  s.stage = 'roll';
  return s;
}

/* -------------------------------- opponent -------------------------------- */

/** Buy when it is affordable and either cheap, a set-completer, or high value. */
export function aiWantsToBuy(s: GameState, i: number) {
  const p = s.players[s.turn];
  const space = spaceAt(i);
  const price = space.price ?? 0;
  if (p.cash - price < 120) return false;
  if (space.kind === 'railroad' || space.kind === 'utility') return true;
  if (space.group && ownedCountInGroup(s, p.id, space.group) > 0) return true;
  return p.cash - price > 350;
}

/** Build out the strongest complete colour group the opponent can afford. */
export function aiBuildTarget(s: GameState): number | null {
  const p = s.players[s.turn];
  if (p.cash < 400) return null;
  const options = BOARD.filter(sp => canBuild(s, sp.i, p.id));
  if (options.length === 0) return null;
  options.sort((a, b) => (b.rent?.[1] ?? 0) - (a.rent?.[1] ?? 0));
  return options[0].i;
}
