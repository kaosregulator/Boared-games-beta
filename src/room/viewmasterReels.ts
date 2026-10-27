/**
 * Original View-Master scenes. Drawn here, in the browser. No scans, no
 * serial numbers, no pictures borrowed from a reel database.
 */

export type LayerName = 'sky' | 'ground' | 'subject';

export type Motif =
  | 'rex'
  | 'raptor'
  | 'lion'
  | 'neck'
  | 'jeep'
  | 'pod'
  | 'ship'
  | 'rocket'
  | 'wagon'
  | 'gate'
  | 'palace'
  | 'castle'
  | 'house'
  | 'rock'
  | 'tunnel'
  | 'mermaid'
  | 'cowboy'
  | 'ranger'
  | 'ghost'
  | 'droid'
  | 'turtle'
  | 'cowl'
  | 'lamp'
  | 'rose'
  | 'carpet'
  | 'hoop'
  | 'pizza'
  | 'leaf'
  | 'coin'
  | 'saber'
  | 'sneaker'
  | 'fork'
  | 'flock'
  | 'ants'
  | 'masks';

export interface Slide {
  caption: string;
  sky: [string, string];
  ground: string;
  hill: string;
  accent: string;
  ink: string;
  motif: Motif;
  pose: number;
  night?: boolean;
  rain?: boolean;
  water?: boolean;
}

export interface Reel {
  title: string;
  scenes: Slide[];
}

function slide(
  caption: string,
  sky: [string, string],
  ground: string,
  hill: string,
  accent: string,
  ink: string,
  motif: Motif,
  pose: number,
  flags = '',
): Slide {
  return {
    caption,
    sky,
    ground,
    hill,
    accent,
    ink,
    motif,
    pose,
    night: flags.includes('n'),
    rain: flags.includes('r'),
    water: flags.includes('w'),
  };
}

export const REELS: Reel[] = [
  {
    title: 'Jurassic Park',
    scenes: [
      slide('Rain on the big gate', ['#6d7c86', '#1c2830'], '#3d4a38', '#243028', '#8d9a78', '#1a120c', 'gate', 3, 'r'),
      slide('Rings in a paper cup', ['#8ea0a4', '#314048'], '#5c5344', '#2c3330', '#d7c4a4', '#2a2118', 'fork', 2, 'r'),
      slide('Footprints bigger than the jeep', ['#9aa56a', '#3d4630'], '#6a5a3c', '#3a4030', '#6d7a48', '#1c1810', 'rex', 4),
      slide('The kitchen goes dark', ['#1c2430', '#0c1016'], '#2a2824', '#14181c', '#6a7a55', '#e8e0d0', 'raptor', 2, 'n'),
      slide('Mud up to the axles', ['#7f8a70', '#3a4034'], '#5a4632', '#33362c', '#4c4034', '#1a140e', 'jeep', 3, 'r'),
      slide('The flock turns together', ['#c4b48a', '#6a5a40'], '#8a7a52', '#4a4030', '#5c6a40', '#1a160e', 'flock', 3),
      slide('The island at sunrise', ['#f0b56a', '#c46a4a'], '#3f6a48', '#1e3a28', '#2f6a40', '#1a140c', 'gate', 1),
    ],
  },
  {
    title: 'The Lost World',
    scenes: [
      slide('A ship against the cliffs', ['#8eb4c8', '#3d5a68'], '#6a5a44', '#3a342c', '#c8b8a0', '#2a241c', 'ship', 2),
      slide('A trailer on the cliff edge', ['#d8c8a8', '#8a7058'], '#a08060', '#5a4838', '#8a7048', '#2a2018', 'jeep', 4),
      slide('Tall grass, something moving', ['#b7c48a', '#5a6840'], '#6a7a40', '#3a4428', '#4a5a30', '#1a1810', 'raptor', 1),
      slide('The long neck over the trees', ['#9ec0a0', '#3e5a48'], '#4a6a40', '#2a4030', '#6a8a58', '#1c2418', 'neck', 3),
      slide('Round footprints in camp', ['#c8b898', '#6a5840'], '#8a6a48', '#4a3828', '#6a5038', '#1a140e', 'rex', 5),
      slide('A bridge in the fog', ['#c8d0d4', '#7a868c'], '#6a7070', '#4a5254', '#8a9494', '#2a3030', 'gate', 2),
      slide('Dawn on the high meadow', ['#f2c98a', '#d08050'], '#7a8a48', '#3a4828', '#c06038', '#24180e', 'neck', 0),
    ],
  },
  {
    title: 'The Lion King',
    scenes: [
      slide('The rock at sunrise', ['#f6c27a', '#e07040'], '#c4a15a', '#8a6238', '#c4883a', '#2a1c10', 'rock', 3),
      slide('A cub on the ledge', ['#f8d090', '#e08848'], '#d0b068', '#a07040', '#e0a050', '#3a2410', 'lion', 2),
      slide('The tall grass', ['#e8c878', '#8aaa40'], '#7a9a38', '#3a5818', '#c4a040', '#2a3010', 'lion', 4),
      slide('Stars over the gorge', ['#1a2040', '#070814'], '#2a2418', '#141018', '#e0c070', '#f4efe4', 'rock', 1, 'n'),
      slide('Rain on the savanna', ['#6a7880', '#2a3438'], '#5a6840', '#2a3420', '#8a9a58', '#1a1810', 'lion', 3, 'r'),
      slide('A bird on the horn', ['#f0d8a0', '#c08048'], '#c8a860', '#8a6840', '#5a4030', '#1a140c', 'neck', 5),
      slide('The circle, closed', ['#f6b060', '#c04830'], '#d0a050', '#8a5028', '#e8c070', '#2a180c', 'rock', 3),
    ],
  },
  {
    title: 'Aladdin',
    scenes: [
      slide('A lamp in the sand', ['#f0c48a', '#c07040'], '#e0b070', '#a07040', '#d4a017', '#3a2808', 'lamp', 3),
      slide('The market at dusk', ['#c06080', '#3a2048'], '#8a5040', '#4a2830', '#e8c878', '#2a1820', 'palace', 2),
      slide('A carpet over the roofs', ['#7a9ad0', '#304060'], '#c08060', '#6a4038', '#c04040', '#f4efe4', 'carpet', 3),
      slide('The palace balcony', ['#f2d0a0', '#e08050'], '#d8b080', '#a07048', '#f0e0c0', '#6a4020', 'palace', 4),
      slide('The cave of gold light', ['#3a2810', '#140c08'], '#6a4818', '#2a1c08', '#f0c040', '#fff4c0', 'lamp', 1, 'n'),
      slide('A tiger in the garden', ['#68a060', '#204028'], '#3a6840', '#1a3820', '#e07020', '#1a1408', 'lion', 2),
      slide('Fireworks over the city', ['#1a1840', '#080818'], '#3a3050', '#201830', '#f0d060', '#fff8e0', 'palace', 3, 'n'),
    ],
  },
  {
    title: 'Beauty and the Beast',
    scenes: [
      slide('A rose under glass', ['#1c2040', '#0c1020'], '#2a2430', '#16141c', '#e05070', '#f8e8ee', 'rose', 3, 'n'),
      slide('The castle in the snow', ['#d8e4ee', '#8aa4b8'], '#e8eef2', '#b0c0cc', '#6a7890', '#2a3440', 'castle', 3),
      slide('A ballroom and a chandelier', ['#2a2040', '#140c20'], '#4a3040', '#241820', '#f0d080', '#fff4d0', 'castle', 1, 'n'),
      slide('The library ladders', ['#6a4030', '#2a1810'], '#4a3020', '#2a1c14', '#c8a070', '#3a2818', 'castle', 4),
      slide('A teapot on the table', ['#f0d8b0', '#c09060'], '#8a6040', '#4a3424', '#e8e0d0', '#6a4030', 'lamp', 2),
      slide('Wolves at the gate', ['#4a5870', '#1c2434'], '#3a4450', '#1a2028', '#d8d8e0', '#2a3038', 'flock', 2, 'n'),
      slide('The last petal', ['#f8e0ea', '#e090a8'], '#f0d0c0', '#c09090', '#e04060', '#4a1820', 'rose', 5),
    ],
  },
  {
    title: 'The Little Mermaid',
    scenes: [
      slide('A ship in a storm', ['#4a6070', '#1a2830'], '#2a4a58', '#143040', '#c8b8a0', '#2a241c', 'ship', 2, 'rw'),
      slide('The grotto of things', ['#1a4060', '#082030'], '#0e3048', '#062030', '#e8c878', '#f4efe0', 'fork', 3, 'nw'),
      slide('A fork on a rock', ['#3a88a8', '#145868'], '#1a6070', '#0c3848', '#d8d0c0', '#3a3428', 'fork', 4, 'w'),
      slide('Under the arch', ['#206080', '#083040'], '#104858', '#062838', '#7ec8c0', '#e8fff8', 'castle', 2, 'w'),
      slide('The surface, from below', ['#8ed0e8', '#1a7090'], '#147090', '#084858', '#f4f8ff', '#2a4050', 'ship', 1, 'w'),
      slide('Fireworks on the water', ['#1a1848', '#080818'], '#102848', '#081828', '#f0d060', '#fff8d8', 'ship', 4, 'nw'),
      slide('The lagoon at dusk', ['#f0a0b0', '#c06080'], '#2080a0', '#105060', '#f8e0c8', '#4a2840', 'mermaid', 3, 'w'),
    ],
  },
  {
    title: 'Pocahontas',
    scenes: [
      slide('The river bend', ['#f2d8a0', '#c08050'], '#3a8a58', '#1a5830', '#2a6a88', '#143040', 'ship', 1, 'w'),
      slide('Leaves on the water', ['#e8c080', '#a06040'], '#2a7a68', '#145040', '#c44820', '#3a1808', 'leaf', 3, 'w'),
      slide('Two canoes', ['#8ec0d8', '#3a7890'], '#2a6a58', '#145040', '#8a5a30', '#2a1c10', 'ship', 4, 'w'),
      slide('The tall waterfall', ['#b8d8e8', '#5a90a8'], '#3a7a50', '#1a5030', '#d8eef4', '#2a4048', 'rock', 2, 'w'),
      slide('Wind in the compass pines', ['#a8c8e0', '#4a7890'], '#4a7a40', '#245028', '#2a4030', '#101810', 'leaf', 1),
      slide('Colors in the sky', ['#f6a0c0', '#f0c070'], '#c06040', '#6a3020', '#e05040', '#3a1810', 'leaf', 5),
      slide('The river at peace', ['#f8e0b0', '#e09060'], '#2a8860', '#146040', '#d8c8a0', '#2a2014', 'ship', 3, 'w'),
    ],
  },
  {
    title: 'Toy Story',
    scenes: [
      slide('A cowboy hat on the bed', ['#9ec8e8', '#4a78a8'], '#6a9ad0', '#3a6890', '#c04028', '#f4e8d0', 'cowboy', 3),
      slide('A cardboard spaceship', ['#d0e4f4', '#88b0d0'], '#c8b090', '#8a7050', '#e8e0d0', '#c04028', 'rocket', 2),
      slide('The window to the yard', ['#8ec8f0', '#f0e0a0'], '#6aaa48', '#3a7028', '#f4f4f8', '#3a5070', 'house', 4),
      slide('A rocket painted on a truck', ['#1a2848', '#080c18'], '#2a3040', '#141820', '#f0c040', '#fff4c0', 'rocket', 3, 'n'),
      slide('The claw machine glow', ['#204060', '#100820'], '#1a1830', '#0c0818', '#40e0c0', '#e8fff8', 'hoop', 2, 'n'),
      slide('A moving box', ['#f0e0c0', '#c0a080'], '#a08060', '#6a5040', '#d8c8a8', '#4a3424', 'rocket', 5),
      slide('The shelf, Christmas morning', ['#f8f4ea', '#f0d8a0'], '#c8a878', '#8a6848', '#c04028', '#f8f4ea', 'cowboy', 1),
    ],
  },
  {
    title: "A Bug's Life",
    scenes: [
      slide('The anthill at noon', ['#f4e0a0', '#e0a050'], '#c4a050', '#8a6828', '#a06030', '#2a1808', 'rock', 3),
      slide('A leaf bigger than a street', ['#b8e080', '#4a8a30'], '#3a7a28', '#1a4818', '#2a8a20', '#103010', 'leaf', 2),
      slide('The circus wagon', ['#f0c878', '#e08040'], '#c09050', '#7a5828', '#e04040', '#f8f0d8', 'wagon', 3),
      slide('Grain like a canyon', ['#e8d090', '#c09040'], '#d0b060', '#8a7030', '#e8d8a0', '#4a3818', 'rock', 1),
      slide('Raindrops as big as rooms', ['#7a98a8', '#3a5460'], '#4a6848', '#243828', '#9ec8e0', '#1a2830', 'leaf', 4, 'r'),
      slide("The bird's shadow", ['#c8d8a0', '#6a8850'], '#5a7840', '#2a4020', '#2a3038', '#101418', 'neck', 2),
      slide('Seeds in the sunset', ['#f0a060', '#d06040'], '#c08040', '#7a4820', '#f0d080', '#3a2010', 'ants', 3),
    ],
  },
  {
    title: 'Batman Forever',
    scenes: [
      slide('The signal in the clouds', ['#1a2040', '#080c18'], '#141820', '#0c1018', '#f0d060', '#fff4c0', 'cowl', 3, 'n'),
      slide('A rooftop in the rain', ['#2a3448', '#101820'], '#1a2028', '#0c1014', '#3a4458', '#d0d8e0', 'house', 2, 'nr'),
      slide('A question mark in neon', ['#201040', '#080818'], '#1a1028', '#100818', '#40e060', '#e8ffe8', 'cowl', 1, 'n'),
      slide('The cave of screens', ['#101820', '#080c10'], '#141c20', '#0c1214', '#40c0e0', '#e8fffc', 'droid', 4, 'n'),
      slide('Two capes on a ledge', ['#243048', '#101820'], '#1c2430', '#10141c', '#1a1a22', '#e8e8f0', 'cowl', 5, 'n'),
      slide('The city, straight down', ['#101828', '#080c14'], '#121820', '#0a0e14', '#f0c040', '#fff0c0', 'house', 3, 'n'),
      slide('Dawn on the tower', ['#f0c0a0', '#8060a0'], '#3a3850', '#201e30', '#1a1a24', '#f4efe8', 'castle', 2),
    ],
  },
  {
    title: 'Mighty Morphin Power Rangers',
    scenes: [
      slide('Five colors in a line', ['#8ec8f0', '#f0e080'], '#5aaa48', '#2a6828', '#e04040', '#f8f4ea', 'masks', 3),
      slide('The helmet, visor down', ['#d0e8f8', '#70a8d8'], '#4a90c0', '#206090', '#e8e8f0', '#203040', 'ranger', 3),
      slide('The command table', ['#204060', '#101828'], '#1a3050', '#0c1828', '#40e0c0', '#e8fff8', 'droid', 2, 'n'),
      slide('A dinosaur in the clouds', ['#c8e0f4', '#7090c0'], '#8aa0b0', '#4a6078', '#e0a030', '#3a2810', 'rex', 1),
      slide('Clay figures in the street', ['#f0e0b0', '#c0a070'], '#a09070', '#6a5840', '#c0b0a0', '#3a342c', 'ants', 2),
      slide('The five machines, stacked', ['#9ad0f0', '#4080c0'], '#3a78b0', '#1a4870', '#f0d040', '#3a3010', 'rocket', 3),
      slide('A coin in a palm', ['#f8e8c0', '#e0b070'], '#c09858', '#7a5830', '#f0c040', '#3a2808', 'coin', 4),
    ],
  },
  {
    title: 'TMNT',
    scenes: [
      slide('A shell in the steam', ['#6a8870', '#2a4038'], '#3a5048', '#1a2824', '#3a8a40', '#102010', 'turtle', 3),
      slide('The sewer tunnel', ['#2a4038', '#101810'], '#1a2820', '#0c1410', '#6aaa50', '#e8f0d8', 'tunnel', 2, 'n'),
      slide('A pizza box on a roof', ['#1a2840', '#080c18'], '#2a3038', '#14181c', '#e8c878', '#c04028', 'pizza', 3, 'n'),
      slide('Four masks in a row', ['#204030', '#101810'], '#1a3024', '#0c1810', '#e04040', '#f4efe4', 'masks', 1, 'n'),
      slide('A van at the curb', ['#8aa0b0', '#3a4858'], '#4a545c', '#2a3038', '#3a8a48', '#102010', 'jeep', 4),
      slide('The lair lamp', ['#1a3028', '#0c1814'], '#14201c', '#0c1410', '#f0c060', '#fff4c8', 'lamp', 2, 'n'),
      slide('The moon over the city', ['#101828', '#080c14'], '#141820', '#0c1014', '#e8e8f0', '#c8d0d8', 'turtle', 5, 'n'),
    ],
  },
  {
    title: 'Casper',
    scenes: [
      slide('The house on the hill', ['#c8d4e4', '#6a7890'], '#6a7a58', '#3a4830', '#6a5848', '#2a2018', 'house', 3),
      slide('A sheet with a smile', ['#d8e4f0', '#8aa0b8'], '#b0c0c8', '#708088', '#f4f8ff', '#3a4450', 'ghost', 3),
      slide('The attic window', ['#2a3448', '#141820'], '#2a2830', '#16141c', '#f0d080', '#fff4c8', 'house', 1, 'n'),
      slide('A lantern in the hall', ['#3a3028', '#1a1410'], '#2a221c', '#16110e', '#f0c060', '#fff0c0', 'lamp', 4, 'n'),
      slide('Friends on the stairs', ['#4a4038', '#241c18'], '#3a3028', '#1c1612', '#f4f8ff', '#3a4450', 'ghost', 2, 'n'),
      slide('The kitchen at midnight', ['#1c2430', '#0c1018'], '#201c18', '#12100e', '#e8e0d0', '#3a342c', 'lamp', 1, 'n'),
      slide('Morning through the ghost', ['#f8f0e0', '#f0d0a0'], '#d8d0c0', '#a0a098', '#f4f8ff', '#4a545c', 'ghost', 4),
    ],
  },
  {
    title: 'Space Jam',
    scenes: [
      slide('A hoop in a backyard', ['#8ec8f0', '#f0e8a0'], '#4a9a40', '#2a6820', '#e04028', '#f4f4f4', 'hoop', 3),
      slide('A hole in the green', ['#7ad0a0', '#2a8a58'], '#1a6a40', '#0c4028', '#101814', '#06100c', 'hoop', 1),
      slide('The bench in bright colors', ['#f0c878', '#e08040'], '#d07830', '#8a4018', '#f0d040', '#3a2808', 'masks', 2),
      slide('Sneakers bigger than the players', ['#f4e0c0', '#e0a060'], '#c08040', '#7a4820', '#f4f4f8', '#c04028', 'sneaker', 3),
      slide('The scoreboard', ['#1a2040', '#080c18'], '#202840', '#101828', '#f0d040', '#fff4c0', 'hoop', 4, 'n'),
      slide('Stars in the arena', ['#101830', '#080814'], '#1a2030', '#0c1018', '#f4f4f8', '#e8e8f0', 'flock', 2, 'n'),
      slide('One last shot', ['#f0a060', '#c04830'], '#d06828', '#8a3010', '#f4f4f4', '#e04020', 'hoop', 5),
    ],
  },
  {
    title: 'Star Wars Episode I',
    scenes: [
      slide('Two engines on the sand', ['#f0c890', '#e08040'], '#e0b070', '#a07040', '#c04028', '#f0e0c0', 'pod', 3),
      slide('Two suns over the dunes', ['#f8d0a0', '#e07050'], '#e0a060', '#a06830', '#f4e0b0', '#6a3018', 'rock', 2),
      slide('A silver ship over water', ['#9ad0e8', '#3a88b0'], '#2a78a0', '#105070', '#d8e0e8', '#2a3840', 'ship', 3, 'w'),
      slide('The arena', ['#e8c898', '#c08050'], '#c09058', '#7a5830', '#a03028', '#f0e0c0', 'castle', 4),
      slide('A little droid with a dome', ['#d8c8a8', '#a08058'], '#c0a070', '#7a5840', '#e8e0c8', '#3a3428', 'droid', 3),
      slide('The parade', ['#f0d8a0', '#e09060'], '#d0b070', '#8a6840', '#c0a060', '#3a2818', 'masks', 1),
      slide('A blue glow, at rest', ['#1a2848', '#080c18'], '#1a2030', '#0c1018', '#60c0f0', '#e8f6ff', 'saber', 3, 'n'),
    ],
  },
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rng(seed: string) {
  let h = hash(seed);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function paintSky(ctx: CanvasRenderingContext2D, w: number, h: number, slide: Slide) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, slide.sky[0]);
  g.addColorStop(1, slide.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rand = rng(slide.caption);
  if (slide.night) {
    ctx.fillStyle = 'rgba(255,255,240,0.9)';
    for (let i = 0; i < 28; i += 1) {
      const x = rand() * w;
      const y = rand() * h * 0.55;
      ctx.fillRect(x, y, rand() > 0.8 ? 2.4 : 1.4, rand() > 0.8 ? 2.4 : 1.4);
    }
    ctx.fillStyle = '#f4f0e0';
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.22, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = slide.sky[1];
    ctx.beginPath();
    ctx.arc(w * 0.78 + 10, h * 0.22 - 6, 22, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sun = ctx.createRadialGradient(w * 0.72, h * 0.28, 4, w * 0.72, h * 0.28, 70);
    sun.addColorStop(0, 'rgba(255,244,210,0.95)');
    sun.addColorStop(1, 'rgba(255,244,210,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(w * 0.72, h * 0.28, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    for (let i = 0; i < 3; i += 1) {
      const x = w * (0.15 + rand() * 0.6);
      const y = h * (0.12 + rand() * 0.22);
      ctx.beginPath();
      ctx.ellipse(x, y, 46 + rand() * 20, 16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (slide.rain) {
    ctx.strokeStyle = 'rgba(230,240,255,0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i += 1) {
      const x = rand() * w;
      const y = rand() * h * 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 6, y + 16);
      ctx.stroke();
    }
  }
  ctx.fillStyle = slide.hill;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.quadraticCurveTo(w * 0.25, h * 0.52, w * 0.5, h * 0.66);
  ctx.quadraticCurveTo(w * 0.75, h * 0.8, w, h * 0.58);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
}

function paintGround(ctx: CanvasRenderingContext2D, w: number, h: number, slide: Slide) {
  ctx.clearRect(0, 0, w, h);
  const y = h * 0.48;
  const g = ctx.createLinearGradient(0, y, 0, h);
  g.addColorStop(0, slide.ground);
  g.addColorStop(1, slide.hill);
  ctx.fillStyle = g;
  ctx.fillRect(0, y, w, h - y);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(0, y, w, 10);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.beginPath();
  ctx.moveTo(w * 0.5, y + 18);
  ctx.lineTo(w * 0.2, h);
  ctx.lineTo(w * 0.8, h);
  ctx.fill();
  if (slide.water) {
    ctx.fillStyle = 'rgba(80,170,200,0.45)';
    ctx.fillRect(0, h * 0.62, w, h * 0.12);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(w * 0.1, h * 0.66, w * 0.5, 3);
  }
  const rand = rng(`${slide.caption}:ground`);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.ellipse(rand() * w, y + 30 + rand() * (h - y - 40), 8 + rand() * 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paintSubject(ctx: CanvasRenderingContext2D, w: number, h: number, slide: Slide) {
  ctx.clearRect(0, 0, w, h);
  const cx = w * 0.5 + (slide.pose - 3) * 28;
  const cy = h * 0.74;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.45, 1.45);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 8, 54, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  drawMotif(ctx, slide);
  ctx.restore();
}

function drawMotif(ctx: CanvasRenderingContext2D, slide: Slide) {
  const { accent, ink, motif } = slide;
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (motif) {
    case 'rex':
      bodyBeast(ctx, accent, ink, 1.15, true);
      break;
    case 'raptor':
      bodyBeast(ctx, accent, ink, 0.72, false);
      break;
    case 'lion':
      lion(ctx, accent, ink);
      break;
    case 'neck':
      longNeck(ctx, accent, ink);
      break;
    case 'jeep':
      jeep(ctx, accent, ink);
      break;
    case 'pod':
      pod(ctx, accent, ink);
      break;
    case 'ship':
      ship(ctx, accent, ink);
      break;
    case 'rocket':
      rocket(ctx, accent, ink);
      break;
    case 'wagon':
      wagon(ctx, accent, ink);
      break;
    case 'gate':
      gate(ctx, accent, ink);
      break;
    case 'palace':
      palace(ctx, accent, ink);
      break;
    case 'castle':
      castle(ctx, accent, ink);
      break;
    case 'house':
      house(ctx, accent, ink);
      break;
    case 'rock':
      rock(ctx, accent, ink);
      break;
    case 'tunnel':
      tunnel(ctx, accent, ink);
      break;
    case 'mermaid':
      mermaid(ctx, accent, ink);
      break;
    case 'cowboy':
      cowboy(ctx, accent, ink);
      break;
    case 'ranger':
      ranger(ctx, accent, ink);
      break;
    case 'ghost':
      ghost(ctx, accent, ink);
      break;
    case 'droid':
      droid(ctx, accent, ink);
      break;
    case 'turtle':
      turtle(ctx, accent, ink);
      break;
    case 'cowl':
      cowl(ctx, accent, ink);
      break;
    case 'lamp':
      lamp(ctx, accent, ink);
      break;
    case 'rose':
      rose(ctx, accent, ink);
      break;
    case 'carpet':
      carpet(ctx, accent, ink);
      break;
    case 'hoop':
      hoop(ctx, accent, ink);
      break;
    case 'pizza':
      pizza(ctx, accent, ink);
      break;
    case 'leaf':
      leaf(ctx, accent, ink);
      break;
    case 'coin':
      coin(ctx, accent, ink);
      break;
    case 'saber':
      saber(ctx, accent, ink);
      break;
    case 'sneaker':
      sneaker(ctx, accent, ink);
      break;
    case 'fork':
      fork(ctx, accent, ink);
      break;
    case 'flock':
      flock(ctx, accent, ink);
      break;
    case 'ants':
      ants(ctx, accent, ink);
      break;
    case 'masks':
      masks(ctx);
      break;
    default:
      break;
  }
}

function bodyBeast(ctx: CanvasRenderingContext2D, accent: string, ink: string, scale: number, arms: boolean) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.quadraticCurveTo(78, 6, 96, -36);
  ctx.quadraticCurveTo(48, -8, 10, -24);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-6, -30, 34, 20, -0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-18, -18, 12, 20);
  ctx.fillRect(6, -14, 11, 16);
  ctx.beginPath();
  ctx.moveTo(-28, -40);
  ctx.lineTo(-6, -78);
  ctx.lineTo(22, -70);
  ctx.lineTo(18, -48);
  ctx.lineTo(-8, -40);
  ctx.fill();
  if (arms) {
    ctx.fillRect(-4, -36, 16, 5);
  }
  ctx.fillStyle = ink;
  ctx.fillRect(6, -62, 3, 6);
  ctx.fillRect(11, -60, 3, 6);
  ctx.beginPath();
  ctx.arc(0, -68, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lion(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, -28, 26, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(24, -36, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(24, -36, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(-8, -16, 7, 18);
  ctx.fillRect(8, -16, 7, 18);
  ctx.beginPath();
  ctx.moveTo(-20, -24);
  ctx.quadraticCurveTo(-40, -10, -28, 4);
  ctx.lineTo(-18, -8);
  ctx.fill();
}

function longNeck(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(10, -16, 28, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-4, -78, 10, 66);
  ctx.beginPath();
  ctx.ellipse(6, -84, 14, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(12, -86, 2, 0, Math.PI * 2);
  ctx.fill();
}

function jeep(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  round(ctx, -40, -28, 80, 26, 6);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(-10, -46, 28, 20);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.strokeRect(-6, -42, 20, 14);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-24, -2, 10, 0, Math.PI * 2);
  ctx.arc(24, -2, 10, 0, Math.PI * 2);
  ctx.fill();
}

function pod(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(-36, -16, 22, 10, 0, 0, Math.PI * 2);
  ctx.ellipse(36, -16, 22, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  round(ctx, -12, -28, 24, 16, 6);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-20, -18);
  ctx.lineTo(-14, -16);
  ctx.moveTo(20, -18);
  ctx.lineTo(14, -16);
  ctx.stroke();
}

function ship(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-48, -8);
  ctx.quadraticCurveTo(0, 16, 48, -8);
  ctx.lineTo(36, -18);
  ctx.lineTo(-36, -18);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.lineTo(-4, -70);
  ctx.lineTo(28, -28);
  ctx.lineTo(-4, -28);
  ctx.fill();
}

function rocket(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  round(ctx, -22, -70, 44, 62, 8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-22, -58);
  ctx.lineTo(-36, -10);
  ctx.lineTo(-22, -16);
  ctx.moveTo(22, -58);
  ctx.lineTo(36, -10);
  ctx.lineTo(22, -16);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, -40, 8, 0, Math.PI * 2);
  ctx.fill();
}

function wagon(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  round(ctx, -40, -48, 80, 40, 6);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = '700 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('★', 0, -20);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-22, -4, 8, 0, Math.PI * 2);
  ctx.arc(22, -4, 8, 0, Math.PI * 2);
  ctx.fill();
}

function gate(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-46, -70, 10, 72);
  ctx.fillRect(36, -70, 10, 72);
  ctx.beginPath();
  ctx.moveTo(-46, -70);
  ctx.quadraticCurveTo(0, -110, 46, -70);
  ctx.lineTo(36, -62);
  ctx.quadraticCurveTo(0, -96, -36, -62);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(-8, -78, 16, 10);
}

function palace(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-40, -40, 80, 42);
  ctx.beginPath();
  ctx.arc(0, -40, 22, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(-34, -70, 8, 32);
  ctx.fillRect(26, -70, 8, 32);
  ctx.beginPath();
  ctx.arc(-30, -70, 6, Math.PI, 0);
  ctx.arc(30, -70, 6, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(-8, -22, 16, 24);
}

function castle(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-44, -36, 88, 38);
  ctx.fillRect(-44, -62, 18, 28);
  ctx.fillRect(-9, -78, 18, 44);
  ctx.fillRect(26, -62, 18, 28);
  for (const x of [-44, -32, -9, 3, 26, 38]) ctx.fillRect(x, -84, 6, 8);
  ctx.fillStyle = ink;
  ctx.fillRect(-8, -20, 16, 22);
}

function house(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-32, -36, 64, 38);
  ctx.beginPath();
  ctx.moveTo(-40, -36);
  ctx.lineTo(0, -72);
  ctx.lineTo(40, -36);
  ctx.fill();
  ctx.fillRect(16, -70, 10, 22);
  ctx.fillStyle = ink;
  ctx.fillRect(-8, -20, 14, 22);
  ctx.fillRect(10, -28, 10, 10);
}

function rock(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-50, 2);
  ctx.lineTo(-20, -70);
  ctx.lineTo(8, -48);
  ctx.lineTo(36, -28);
  ctx.lineTo(50, 2);
  ctx.fill();
}

function tunnel(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-50, -60, 100, 62);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, -8, 28, Math.PI, 0);
  ctx.lineTo(28, 4);
  ctx.lineTo(-28, 4);
  ctx.fill();
}

function mermaid(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-6, -20);
  ctx.quadraticCurveTo(30, 0, 10, 16);
  ctx.quadraticCurveTo(-10, 8, -16, -8);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -40, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, -48, 14, 10, 0, Math.PI, 0);
  ctx.fill();
}

function cowboy(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-10, -36, 20, 28);
  ctx.beginPath();
  ctx.arc(0, -46, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, -58, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, -58);
  ctx.lineTo(0, -78);
  ctx.lineTo(10, -58);
  ctx.fill();
}

function ranger(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.fillRect(-16, -40, 32, 36);
  ctx.beginPath();
  ctx.moveTo(-18, -40);
  ctx.lineTo(0, -70);
  ctx.lineTo(18, -40);
  ctx.fill();
  ctx.fillStyle = ink;
  round(ctx, -14, -36, 28, 10, 4);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.fillRect(-10, -32, 20, 4);
}

function ghost(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -36, 24, Math.PI, 0);
  ctx.lineTo(24, 2);
  ctx.quadraticCurveTo(16, -8, 8, 2);
  ctx.quadraticCurveTo(0, -8, -8, 2);
  ctx.quadraticCurveTo(-16, -8, -24, 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(-8, -40, 3, 0, Math.PI * 2);
  ctx.arc(8, -40, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -30, 6, 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = ink;
  ctx.stroke();
}

function droid(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -48, 16, Math.PI, 0);
  ctx.fill();
  round(ctx, -18, -48, 36, 40, 8);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, -50, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-8, -30, 16, 4);
}

function turtle(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.ellipse(0, -20, 26, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, -20, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -40, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c04028';
  ctx.fillRect(-10, -44, 20, 5);
}

function cowl(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-28, -10);
  ctx.lineTo(-8, -20);
  ctx.lineTo(0, -70);
  ctx.lineTo(8, -20);
  ctx.lineTo(28, -10);
  ctx.lineTo(8, 4);
  ctx.lineTo(-8, 4);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-16, -28);
  ctx.lineTo(0, -8);
  ctx.lineTo(16, -28);
  ctx.lineTo(0, -18);
  ctx.fill();
}

function lamp(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-8, -10);
  ctx.quadraticCurveTo(-28, -10, -22, -36);
  ctx.quadraticCurveTo(0, -58, 22, -36);
  ctx.quadraticCurveTo(28, -10, 8, -10);
  ctx.quadraticCurveTo(0, 6, -8, -10);
  ctx.fill();
  ctx.fillRect(16, -40, 16, 5);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, -28, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
}

function rose(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.strokeStyle = '#3a8a40';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -20);
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -40, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(0, -40, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,230,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -36, 26, 0, Math.PI * 2);
  ctx.stroke();
}

function carpet(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-40, -10);
  ctx.lineTo(40, -24);
  ctx.lineTo(48, -8);
  ctx.lineTo(-32, 6);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function hoop(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(8, -36, 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(26, -36);
  ctx.lineTo(26, 4);
  ctx.stroke();
}

function pizza(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  round(ctx, -28, -20, 56, 16, 3);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-8, -20);
  ctx.lineTo(0, -48);
  ctx.lineTo(10, -20);
  ctx.fill();
}

function leaf(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-10, 8);
  ctx.quadraticCurveTo(-50, -20, 10, -70);
  ctx.quadraticCurveTo(40, -20, -10, 8);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.lineTo(8, -60);
  ctx.stroke();
}

function coin(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(0, -28, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -28, 14, 0, Math.PI * 2);
  ctx.stroke();
}

function saber(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = ink;
  ctx.fillRect(-4, -16, 8, 20);
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  round(ctx, -5, -78, 10, 64, 5);
  ctx.fill();
}

function sneaker(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-36, -8);
  ctx.quadraticCurveTo(-20, -36, 10, -28);
  ctx.lineTo(36, -16);
  ctx.lineTo(36, -6);
  ctx.lineTo(-36, -2);
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.fillRect(-30, -6, 60, 6);
}

function fork(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, -28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-10, -48);
  ctx.lineTo(-10, -28);
  ctx.lineTo(10, -28);
  ctx.lineTo(10, -48);
  ctx.moveTo(0, -46);
  ctx.lineTo(0, -28);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(0, 6, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function flock(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(i * 22, Math.abs(i) * 6);
    ctx.scale(0.45, 0.45);
    bodyBeast(ctx, accent, ink, 1, false);
    ctx.restore();
  }
}

function ants(ctx: CanvasRenderingContext2D, accent: string, ink: string) {
  for (let i = -2; i <= 2; i += 1) {
    ctx.fillStyle = i % 2 ? accent : ink;
    ctx.beginPath();
    ctx.ellipse(i * 18, -8, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(i * 18 + 8, -12, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function masks(ctx: CanvasRenderingContext2D) {
  const colors = ['#e04040', '#3a6adf', '#1a1a1a', '#f0d040', '#f080c0'];
  colors.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc((i - 2) * 20, -28, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect((i - 2) * 20 - 6, -30, 12, 3);
  });
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function paintLayer(ctx: CanvasRenderingContext2D, w: number, h: number, layer: LayerName, slide: Slide) {
  if (layer === 'sky') paintSky(ctx, w, h, slide);
  else if (layer === 'ground') paintGround(ctx, w, h, slide);
  else paintSubject(ctx, w, h, slide);
}
