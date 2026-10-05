/**
 * The Game of Life: a real track with a college branch, careers that pay on
 * Pay Day, Life tiles, bank loans at the printed rate, houses you buy and sell,
 * and a retirement tally at the end.
 */

export type SpaceType =
  | 'start'
  | 'payday'
  | 'collect'
  | 'pay'
  | 'life'
  | 'stop-career'
  | 'stop-marry'
  | 'stop-house'
  | 'stop-family'
  | 'stop-retire'
  | 'spin-pay'
  | 'baby'
  | 'tax';

export interface LifeSpace {
  i: number;
  type: SpaceType;
  label: string;
  amount?: number;
  /** College branch spaces sit on the alternate path. */
  branch?: 'college' | 'career';
}

export interface Career {
  name: string;
  salary: number;
  tax: number;
  needsDegree: boolean;
}

export const CAREERS: Career[] = [
  { name: 'Doctor', salary: 100000, tax: 30000, needsDegree: true },
  { name: 'Lawyer', salary: 90000, tax: 25000, needsDegree: true },
  { name: 'Computer Consultant', salary: 80000, tax: 20000, needsDegree: true },
  { name: 'Accountant', salary: 70000, tax: 15000, needsDegree: true },
  { name: 'Teacher', salary: 60000, tax: 10000, needsDegree: true },
  { name: 'Athlete', salary: 70000, tax: 15000, needsDegree: false },
  { name: 'Police Officer', salary: 50000, tax: 10000, needsDegree: false },
  { name: 'Hair Stylist', salary: 40000, tax: 5000, needsDegree: false },
  { name: 'Mechanic', salary: 40000, tax: 5000, needsDegree: false },
  { name: 'Entertainer', salary: 60000, tax: 10000, needsDegree: false },
];

export interface House {
  name: string;
  price: number;
  /** What the bank pays when you sell at retirement. */
  resale: number;
}

export const HOUSES: House[] = [
  { name: 'Mobile Home', price: 50000, resale: 60000 },
  { name: 'Log Cabin', price: 80000, resale: 95000 },
  { name: 'Cozy Condo', price: 100000, resale: 110000 },
  { name: 'Tudor Revival', price: 120000, resale: 135000 },
  { name: 'Dutch Colonial', price: 160000, resale: 180000 },
  { name: 'Victorian', price: 200000, resale: 230000 },
  { name: 'Modern Victorian', price: 240000, resale: 270000 },
  { name: 'Farmhouse', price: 280000, resale: 310000 },
];

export const LIFE_TILE_VALUES = [
  20000, 20000, 20000, 40000, 40000, 60000, 60000, 80000, 100000, 100000, 200000, 240000,
];

export const LOAN_AMOUNT = 20000;
export const LOAN_REPAY = 25000;
export const START_CASH = 10000;
export const COLLEGE_COST = 100000;

const payday = (i: number, branch?: 'college' | 'career'): LifeSpace => ({
  i,
  type: 'payday',
  label: 'PAY DAY',
  branch,
});

/**
 * One shared track. The college branch is longer and costs tuition up front,
 * but it unlocks the degree careers and drops extra Life tiles along the way.
 */
export const TRACK: LifeSpace[] = [
  { i: 0, type: 'start', label: 'Start' },
  { i: 1, type: 'collect', label: 'Win a talent show', amount: 10000 },
  { i: 2, type: 'life', label: 'Life tile: help a neighbour' },
  payday(3),
  { i: 4, type: 'stop-career', label: 'Choose a career' },
  { i: 5, type: 'pay', label: 'Buy a used car', amount: 10000 },
  { i: 6, type: 'life', label: 'Life tile: save a stray' },
  payday(7),
  { i: 8, type: 'stop-marry', label: 'Get married' },
  { i: 9, type: 'collect', label: 'Wedding gifts', amount: 20000 },
  { i: 10, type: 'tax', label: 'Pay taxes', amount: 15000 },
  { i: 11, type: 'spin-pay', label: 'Spin: pay $5,000 per number' },
  payday(12),
  { i: 13, type: 'stop-house', label: 'Buy a house' },
  { i: 14, type: 'life', label: 'Life tile: run a marathon' },
  { i: 15, type: 'pay', label: 'Furnish the house', amount: 20000 },
  payday(16),
  { i: 17, type: 'baby', label: 'Baby!' },
  { i: 18, type: 'collect', label: 'Tax refund', amount: 10000 },
  { i: 19, type: 'life', label: 'Life tile: coach the team' },
  payday(20),
  { i: 21, type: 'stop-family', label: 'Family photo: collect per child' },
  { i: 22, type: 'pay', label: 'Hospital bill', amount: 25000 },
  { i: 23, type: 'collect', label: 'Sell an invention', amount: 50000 },
  payday(24),
  { i: 25, type: 'baby', label: 'Twins!' },
  { i: 26, type: 'life', label: 'Life tile: write a novel' },
  { i: 27, type: 'pay', label: 'Buy a boat', amount: 40000 },
  payday(28),
  { i: 29, type: 'collect', label: 'Lucky investment', amount: 60000 },
  { i: 30, type: 'tax', label: 'Pay taxes', amount: 25000 },
  { i: 31, type: 'life', label: 'Life tile: build a school' },
  payday(32),
  { i: 33, type: 'pay', label: 'Kids go to college', amount: 50000 },
  { i: 34, type: 'collect', label: 'Win the lottery', amount: 100000 },
  { i: 35, type: 'life', label: 'Life tile: find a cure' },
  payday(36),
  { i: 37, type: 'spin-pay', label: 'Spin: pay $10,000 per number' },
  { i: 38, type: 'collect', label: 'Retirement bonus', amount: 50000 },
  { i: 39, type: 'stop-retire', label: 'Retire' },
];

export interface LifePlayer {
  id: number;
  name: string;
  isAI: boolean;
  colour: string;
  at: number;
  cash: number;
  loans: number;
  career: Career | null;
  degree: boolean;
  married: boolean;
  children: number;
  house: House | null;
  lifeTiles: number[];
  retired: boolean;
  /** Which retirement home they reached. */
  retirement: 'Countryside Acres' | 'Millionaire Estates' | null;
}

export interface LifeState {
  players: LifePlayer[];
  turn: number;
  spin: number;
  stage: 'spin' | 'choose-path' | 'choose-career' | 'choose-house' | 'resolve' | 'over';
  /** Careers and houses currently on offer at a stop. */
  careerOffer: Career[];
  houseOffer: House[];
  lifeTilePool: number[];
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

export const PLAYER_COLOURS = ['#2f7bb5', '#d94f6a', '#3fa661', '#d9a21b'];

export function newLifeGame(playerName: string): LifeState {
  const names: { name: string; isAI: boolean }[] = [
    { name: playerName, isAI: false },
    { name: 'Valkyrie_99', isAI: true },
    { name: 'PondFisher_99', isAI: true },
  ];
  return {
    players: names.map((n, i) => ({
      id: i,
      name: n.name,
      isAI: n.isAI,
      colour: PLAYER_COLOURS[i],
      at: 0,
      cash: START_CASH,
      loans: 0,
      career: null,
      degree: false,
      married: false,
      children: 0,
      house: null,
      lifeTiles: [],
      retired: false,
      retirement: null,
    })),
    turn: 0,
    spin: 0,
    stage: 'choose-path',
    careerOffer: [],
    houseOffer: [],
    lifeTilePool: shuffle(LIFE_TILE_VALUES),
    log: ['College or straight to work?'],
    winner: null,
  };
}

const clone = (s: LifeState): LifeState => ({
  ...s,
  players: s.players.map(p => ({ ...p, lifeTiles: [...p.lifeTiles] })),
  careerOffer: [...s.careerOffer],
  houseOffer: [...s.houseOffer],
  lifeTilePool: [...s.lifeTilePool],
});

const say = (s: LifeState, line: string) => {
  s.log = [line, ...s.log].slice(0, 40);
};

function takeLoan(s: LifeState, p: LifePlayer) {
  while (p.cash < 0) {
    p.cash += LOAN_AMOUNT;
    p.loans += 1;
    say(s, `${p.name} takes a $${LOAN_AMOUNT.toLocaleString()} bank loan.`);
  }
}

function drawLifeTile(s: LifeState, p: LifePlayer) {
  if (s.lifeTilePool.length === 0) s.lifeTilePool = shuffle(LIFE_TILE_VALUES);
  const tile = s.lifeTilePool.shift()!;
  p.lifeTiles.push(tile);
  say(s, `${p.name} collects a Life tile.`);
}

export function netWorth(p: LifePlayer) {
  return (
    p.cash + (p.house?.resale ?? 0) + p.lifeTiles.reduce((a, b) => a + b, 0) - p.loans * LOAN_REPAY
  );
}

function nextTurn(s: LifeState) {
  if (s.players.every(p => p.retired)) {
    s.stage = 'over';
    const ranked = [...s.players].sort((a, b) => netWorth(b) - netWorth(a));
    s.winner = ranked[0].name;
    say(s, `${s.winner} retires richest with $${netWorth(ranked[0]).toLocaleString()}.`);
    return;
  }
  let next = s.turn;
  for (let i = 0; i < s.players.length; i += 1) {
    next = (next + 1) % s.players.length;
    if (!s.players[next].retired) break;
  }
  s.turn = next;
  s.stage = 'spin';
}

export function choosePath(state: LifeState, college: boolean): LifeState {
  const s = clone(state);
  const p = s.players[s.turn];
  if (college) {
    p.degree = true;
    p.cash -= COLLEGE_COST;
    takeLoan(s, p);
    say(s, `${p.name} goes to college for $${COLLEGE_COST.toLocaleString()} and earns a degree.`);
  } else {
    say(s, `${p.name} starts work straight away.`);
  }
  s.stage = 'spin';
  return s;
}

/** Resolve the space a player stops on. */
function resolve(s: LifeState, p: LifePlayer): void {
  const space = TRACK[Math.min(p.at, TRACK.length - 1)];
  s.stage = 'resolve';

  switch (space.type) {
    case 'payday': {
      const pay = p.career?.salary ?? 20000;
      p.cash += pay;
      say(s, `${p.name} collects $${pay.toLocaleString()} on Pay Day.`);
      break;
    }
    case 'collect':
      p.cash += space.amount ?? 0;
      say(s, `${p.name}: ${space.label} (+$${(space.amount ?? 0).toLocaleString()}).`);
      break;
    case 'pay':
      p.cash -= space.amount ?? 0;
      say(s, `${p.name}: ${space.label} (-$${(space.amount ?? 0).toLocaleString()}).`);
      takeLoan(s, p);
      break;
    case 'tax': {
      const bill = (space.amount ?? 0) + (p.career?.tax ?? 0);
      p.cash -= bill;
      say(s, `${p.name} pays $${bill.toLocaleString()} in taxes.`);
      takeLoan(s, p);
      break;
    }
    case 'spin-pay': {
      const rate = space.label.includes('10,000') ? 10000 : 5000;
      const n = 1 + Math.floor(Math.random() * 10);
      p.cash -= n * rate;
      say(s, `${p.name} spins ${n} and pays $${(n * rate).toLocaleString()}.`);
      takeLoan(s, p);
      break;
    }
    case 'life':
      drawLifeTile(s, p);
      break;
    case 'baby':
      p.children += space.label.includes('Twins') ? 2 : 1;
      say(s, `${p.name}: ${space.label} Now ${p.children} in the car.`);
      break;
    case 'stop-career':
      s.careerOffer = shuffle(CAREERS.filter(c => !c.needsDegree || p.degree)).slice(0, 3);
      s.stage = 'choose-career';
      return;
    case 'stop-marry':
      p.married = true;
      say(s, `${p.name} gets married.`);
      break;
    case 'stop-house':
      s.houseOffer = shuffle(HOUSES).slice(0, 3);
      s.stage = 'choose-house';
      return;
    case 'stop-family': {
      const gift = p.children * 10000 + (p.married ? 10000 : 0);
      p.cash += gift;
      say(s, `${p.name} collects $${gift.toLocaleString()} from family.`);
      break;
    }
    case 'stop-retire': {
      p.retired = true;
      const rich = netWorth(p) > 400000;
      p.retirement = rich ? 'Millionaire Estates' : 'Countryside Acres';
      if (rich) {
        drawLifeTile(s, p);
        say(s, `${p.name} retires to Millionaire Estates.`);
      } else {
        p.cash += 100000;
        say(s, `${p.name} retires to Countryside Acres and collects $100,000.`);
      }
      break;
    }
    default:
      break;
  }

  nextTurn(s);
}

export function spin(state: LifeState): LifeState {
  const s = clone(state);
  if (s.stage !== 'spin') return state;
  const p = s.players[s.turn];
  const n = 1 + Math.floor(Math.random() * 10);
  s.spin = n;
  let target = Math.min(p.at + n, TRACK.length - 1);

  // A Stop space halts the car even if the spin would carry it further.
  for (let i = p.at + 1; i <= target; i += 1) {
    if (TRACK[i].type.startsWith('stop-')) {
      target = i;
      break;
    }
  }

  // Pay Days are collected when passed, not only when landed on.
  for (let i = p.at + 1; i < target; i += 1) {
    if (TRACK[i].type === 'payday') {
      const pay = p.career?.salary ?? 20000;
      p.cash += pay;
      say(s, `${p.name} passes Pay Day and collects $${pay.toLocaleString()}.`);
    }
  }

  p.at = target;
  say(s, `${p.name} spins ${n} to ${TRACK[target].label}.`);
  resolve(s, p);
  return s;
}

export function chooseCareer(state: LifeState, career: Career): LifeState {
  const s = clone(state);
  const p = s.players[s.turn];
  p.career = career;
  say(s, `${p.name} becomes a ${career.name} on $${career.salary.toLocaleString()}.`);
  nextTurn(s);
  return s;
}

export function chooseHouse(state: LifeState, house: House | null): LifeState {
  const s = clone(state);
  const p = s.players[s.turn];
  if (house) {
    p.house = house;
    p.cash -= house.price;
    takeLoan(s, p);
    say(s, `${p.name} buys the ${house.name} for $${house.price.toLocaleString()}.`);
  } else {
    say(s, `${p.name} keeps renting.`);
  }
  nextTurn(s);
  return s;
}

export function repayLoan(state: LifeState): LifeState {
  const s = clone(state);
  const p = s.players[s.turn];
  if (p.loans === 0 || p.cash < LOAN_REPAY) return state;
  p.loans -= 1;
  p.cash -= LOAN_REPAY;
  say(s, `${p.name} repays a loan for $${LOAN_REPAY.toLocaleString()}.`);
  return s;
}

/* -------------------------------- opponent -------------------------------- */

export function aiCareerChoice(s: LifeState): Career {
  return [...s.careerOffer].sort((a, b) => b.salary - b.tax - (a.salary - a.tax))[0];
}

export function aiHouseChoice(s: LifeState): House | null {
  const p = s.players[s.turn];
  const affordable = s.houseOffer.filter(h => h.price <= p.cash);
  if (affordable.length === 0) return s.houseOffer.sort((a, b) => a.price - b.price)[0];
  return affordable.sort((a, b) => b.resale - b.price - (a.resale - a.price))[0];
}

export function aiTakesCollege() {
  return Math.random() > 0.35;
}
