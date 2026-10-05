/** The standard 40 space board, with the real price and rent tables. */

export type SpaceKind =
  | 'go'
  | 'street'
  | 'railroad'
  | 'utility'
  | 'chest'
  | 'chance'
  | 'tax'
  | 'jail'
  | 'gotojail'
  | 'parking';

export type ColorGroup =
  | 'brown'
  | 'lightblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkblue'
  | 'rail'
  | 'util';

export interface Space {
  i: number;
  name: string;
  short: string;
  kind: SpaceKind;
  group?: ColorGroup;
  price?: number;
  /** Rent with 0,1,2,3,4 houses then a hotel. */
  rent?: [number, number, number, number, number, number];
  houseCost?: number;
  /** Fixed charge for the tax squares. */
  tax?: number;
}

const street = (
  i: number,
  name: string,
  short: string,
  group: ColorGroup,
  price: number,
  rent: [number, number, number, number, number, number],
  houseCost: number,
): Space => ({ i, name, short, kind: 'street', group, price, rent, houseCost });

export const BOARD: Space[] = [
  { i: 0, name: 'GO', short: 'GO', kind: 'go' },
  street(1, 'Mediterranean Avenue', 'Mediterranean', 'brown', 60, [2, 10, 30, 90, 160, 250], 50),
  { i: 2, name: 'Community Chest', short: 'Chest', kind: 'chest' },
  street(3, 'Baltic Avenue', 'Baltic', 'brown', 60, [4, 20, 60, 180, 320, 450], 50),
  { i: 4, name: 'Income Tax', short: 'Income Tax', kind: 'tax', tax: 200 },
  { i: 5, name: 'Reading Railroad', short: 'Reading RR', kind: 'railroad', group: 'rail', price: 200 },
  street(6, 'Oriental Avenue', 'Oriental', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  { i: 7, name: 'Chance', short: 'Chance', kind: 'chance' },
  street(8, 'Vermont Avenue', 'Vermont', 'lightblue', 100, [6, 30, 90, 270, 400, 550], 50),
  street(9, 'Connecticut Avenue', 'Connecticut', 'lightblue', 120, [8, 40, 100, 300, 450, 600], 50),
  { i: 10, name: 'Jail / Just Visiting', short: 'Jail', kind: 'jail' },
  street(11, 'St. Charles Place', 'St. Charles', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  { i: 12, name: 'Electric Company', short: 'Electric Co.', kind: 'utility', group: 'util', price: 150 },
  street(13, 'States Avenue', 'States', 'pink', 140, [10, 50, 150, 450, 625, 750], 100),
  street(14, 'Virginia Avenue', 'Virginia', 'pink', 160, [12, 60, 180, 500, 700, 900], 100),
  { i: 15, name: 'Pennsylvania Railroad', short: 'Penn RR', kind: 'railroad', group: 'rail', price: 200 },
  street(16, 'St. James Place', 'St. James', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  { i: 17, name: 'Community Chest', short: 'Chest', kind: 'chest' },
  street(18, 'Tennessee Avenue', 'Tennessee', 'orange', 180, [14, 70, 200, 550, 750, 950], 100),
  street(19, 'New York Avenue', 'New York', 'orange', 200, [16, 80, 220, 600, 800, 1000], 100),
  { i: 20, name: 'Free Parking', short: 'Free Parking', kind: 'parking' },
  street(21, 'Kentucky Avenue', 'Kentucky', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  { i: 22, name: 'Chance', short: 'Chance', kind: 'chance' },
  street(23, 'Indiana Avenue', 'Indiana', 'red', 220, [18, 90, 250, 700, 875, 1050], 150),
  street(24, 'Illinois Avenue', 'Illinois', 'red', 240, [20, 100, 300, 750, 925, 1100], 150),
  { i: 25, name: 'B. & O. Railroad', short: 'B&O RR', kind: 'railroad', group: 'rail', price: 200 },
  street(26, 'Atlantic Avenue', 'Atlantic', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  street(27, 'Ventnor Avenue', 'Ventnor', 'yellow', 260, [22, 110, 330, 800, 975, 1150], 150),
  { i: 28, name: 'Water Works', short: 'Water Works', kind: 'utility', group: 'util', price: 150 },
  street(29, 'Marvin Gardens', 'Marvin Gdns', 'yellow', 280, [24, 120, 360, 850, 1025, 1200], 150),
  { i: 30, name: 'Go To Jail', short: 'Go To Jail', kind: 'gotojail' },
  street(31, 'Pacific Avenue', 'Pacific', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  street(32, 'North Carolina Avenue', 'N. Carolina', 'green', 300, [26, 130, 390, 900, 1100, 1275], 200),
  { i: 33, name: 'Community Chest', short: 'Chest', kind: 'chest' },
  street(34, 'Pennsylvania Avenue', 'Pennsylvania', 'green', 320, [28, 150, 450, 1000, 1200, 1400], 200),
  { i: 35, name: 'Short Line', short: 'Short Line', kind: 'railroad', group: 'rail', price: 200 },
  { i: 36, name: 'Chance', short: 'Chance', kind: 'chance' },
  street(37, 'Park Place', 'Park Place', 'darkblue', 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { i: 38, name: 'Luxury Tax', short: 'Luxury Tax', kind: 'tax', tax: 100 },
  street(39, 'Boardwalk', 'Boardwalk', 'darkblue', 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

export const GROUP_COLORS: Record<ColorGroup, string> = {
  brown: '#8b5a2b',
  lightblue: '#a9dcf0',
  pink: '#d6388b',
  orange: '#f08a24',
  red: '#e0252b',
  yellow: '#f3d723',
  green: '#1d9a52',
  darkblue: '#2447a8',
  rail: '#2b2b2b',
  util: '#8ea0ad',
};

/** How many streets are in each colour group, for monopoly and build checks. */
export const GROUP_SIZE: Record<string, number> = BOARD.reduce((acc, s) => {
  if (s.kind === 'street' && s.group) acc[s.group] = (acc[s.group] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);

export const RAILROAD_RENT = [0, 25, 50, 100, 200];

export type CardEffect =
  | { type: 'move'; to: number }
  | { type: 'moveBy'; steps: number }
  | { type: 'nearest'; group: 'rail' | 'util' }
  | { type: 'cash'; amount: number }
  | { type: 'collectEach'; amount: number }
  | { type: 'payEach'; amount: number }
  | { type: 'jail' }
  | { type: 'getOutFree' }
  | { type: 'repairs'; perHouse: number; perHotel: number };

export interface Card {
  text: string;
  effect: CardEffect;
}

export const CHANCE: Card[] = [
  { text: 'Advance to GO. Collect $200.', effect: { type: 'move', to: 0 } },
  { text: 'Advance to Illinois Avenue.', effect: { type: 'move', to: 24 } },
  { text: 'Advance to St. Charles Place.', effect: { type: 'move', to: 11 } },
  { text: 'Advance to the nearest Utility. Pay ten times the dice.', effect: { type: 'nearest', group: 'util' } },
  { text: 'Advance to the nearest Railroad. Pay double rent.', effect: { type: 'nearest', group: 'rail' } },
  { text: 'Bank pays you a dividend of $50.', effect: { type: 'cash', amount: 50 } },
  { text: 'Get out of jail free. Keep this card.', effect: { type: 'getOutFree' } },
  { text: 'Go back three spaces.', effect: { type: 'moveBy', steps: -3 } },
  { text: 'Go directly to Jail. Do not pass GO.', effect: { type: 'jail' } },
  { text: 'Make general repairs: $25 per house, $100 per hotel.', effect: { type: 'repairs', perHouse: 25, perHotel: 100 } },
  { text: 'Speeding fine. Pay $15.', effect: { type: 'cash', amount: -15 } },
  { text: 'Take a trip to Reading Railroad.', effect: { type: 'move', to: 5 } },
  { text: 'Advance to Boardwalk.', effect: { type: 'move', to: 39 } },
  { text: 'You have been elected chairman. Pay each player $50.', effect: { type: 'payEach', amount: 50 } },
  { text: 'Your building loan matures. Collect $150.', effect: { type: 'cash', amount: 150 } },
];

export const CHEST: Card[] = [
  { text: 'Advance to GO. Collect $200.', effect: { type: 'move', to: 0 } },
  { text: 'Bank error in your favour. Collect $200.', effect: { type: 'cash', amount: 200 } },
  { text: "Doctor's fee. Pay $50.", effect: { type: 'cash', amount: -50 } },
  { text: 'From sale of stock you get $50.', effect: { type: 'cash', amount: 50 } },
  { text: 'Get out of jail free. Keep this card.', effect: { type: 'getOutFree' } },
  { text: 'Go directly to Jail. Do not pass GO.', effect: { type: 'jail' } },
  { text: 'Holiday fund matures. Collect $100.', effect: { type: 'cash', amount: 100 } },
  { text: 'Income tax refund. Collect $20.', effect: { type: 'cash', amount: 20 } },
  { text: 'It is your birthday. Collect $10 from every player.', effect: { type: 'collectEach', amount: 10 } },
  { text: 'Life insurance matures. Collect $100.', effect: { type: 'cash', amount: 100 } },
  { text: 'Hospital fees. Pay $100.', effect: { type: 'cash', amount: -100 } },
  { text: 'School fees. Pay $50.', effect: { type: 'cash', amount: -50 } },
  { text: 'Receive $25 consultancy fee.', effect: { type: 'cash', amount: 25 } },
  { text: 'Street repairs: $40 per house, $115 per hotel.', effect: { type: 'repairs', perHouse: 40, perHotel: 115 } },
  { text: 'You won second prize in a beauty contest. Collect $10.', effect: { type: 'cash', amount: 10 } },
  { text: 'You inherit $100.', effect: { type: 'cash', amount: 100 } },
];

export const TOKENS = [
  { id: 'hat', label: 'Top hat', glyph: '🎩' },
  { id: 'car', label: 'Roadster', glyph: '🚗' },
  { id: 'dog', label: 'Scottie', glyph: '🐕' },
  { id: 'ship', label: 'Battleship', glyph: '🚢' },
  { id: 'boot', label: 'Boot', glyph: '👢' },
  { id: 'thimble', label: 'Thimble', glyph: '🪡' },
];

export const START_CASH = 1500;
export const GO_SALARY = 200;
export const JAIL_INDEX = 10;
export const JAIL_FINE = 50;

/**
 * Screen position of each board space on an 11x11 grid, walking anticlockwise
 * from GO in the bottom-right corner, exactly like the printed board.
 */
export function gridCell(i: number): { col: number; row: number } {
  if (i <= 10) return { col: 11 - i, row: 11 };
  if (i <= 20) return { col: 1, row: 11 - (i - 10) };
  if (i <= 30) return { col: 1 + (i - 20), row: 1 };
  return { col: 11, row: 1 + (i - 30) };
}

/** Which board edge a space sits on, so its colour bar faces inwards. */
export function edgeOf(i: number): 'bottom' | 'left' | 'top' | 'right' {
  if (i <= 10) return 'bottom';
  if (i <= 20) return 'left';
  if (i <= 30) return 'top';
  return 'right';
}
