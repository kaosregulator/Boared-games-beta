import type { IconName } from '../os/icons';
import { hourglass } from '../os/settings';
import { sfx } from '../os/sound';
import { openWindow } from '../os/wm';

/**
 * Games that live on the real internet, played inside a Win98 window.
 *
 * Nothing here is shipped in the repo: each game is an iframe to where it is
 * hosted today. archive.org, itch.io and the Flashpoint web player
 * (ooooooooo.ooo, Dri0m/9o3o) all run Flash games through Ruffle in the
 * browser. Every game has a "pop out" fallback in case a host refuses to be
 * framed, and some have a backup copy on a second host.
 */

export interface WebGameSpec {
  title: string;
  icon: IconName;
  url: string;
  /** A second copy somewhere else, offered from the Game menu. */
  backup?: string;
  /** The page's own size. When set the page is scaled to fit the window, like a Flash movie. */
  native?: { w: number; h: number };
  /** Window size inside the 800×600 screen. */
  w: number;
  h: number;
  credit?: string;
}

export const SANDWICH_STACKER: WebGameSpec = {
  title: 'Sandwich Stacker',
  icon: 'sandwich',
  // The itch.io WebGL build of elan-rubin/Sandwich-Stacker (the repo is Unity source only).
  url: 'https://html-classic.itch.zone/html/8205160/index.html',
  // The old Flash game of the same name, on archive.org.
  backup: 'https://archive.org/embed/flash_625-sandwich-stacker',
  native: { w: 960, h: 600 },
  w: 660,
  h: 450,
  credit: 'Sandwich Stacker by Elan Rubin (itch.io). Backup: the Flash original on the Internet Archive.',
};

export const THING_THING: WebGameSpec = {
  title: 'Thing-Thing',
  icon: 'thing',
  url: 'https://archive.org/embed/thing-thing-1',
  w: 620,
  h: 500,
  credit: 'Thing-Thing by Diseased Productions (2006), from the Internet Archive Flash collection.',
};

const FLASHPOINT = 'https://ooooooooo.ooo/';

export function flashpoint(id: string) {
  return `${FLASHPOINT}?id=${id}`;
}

export const FLASHPOINT_BROWSE = `${FLASHPOINT}browse?query=${encodeURIComponent('publisher:"Cartoon Network" platform:Flash')}`;

/** Cartoon Network web games, 1999 to 2007, by show. Ids are Flashpoint Archive game ids. */
export const CN_ARCADE: { show: string; games: [string, string][] }[] = [
  { show: "Dexter's Laboratory", games: [["Don't Press the Button", 'adead7cb-72f9-496d-ad1f-73ab9a5fef96'], ['Runaway Robot', 'a7e551f0-448a-1b44-f440-e5bf877a6484']] },
  {
    show: 'Ed, Edd n Eddy',
    games: [
      ["Crack Ed's", 'fe7d4fdd-5390-44cc-bb19-286b1e5591cb'],
      ['Cul-de-Sac Smash', '9cce4243-ffb1-7f9d-f8f7-0282f0491906'],
      ['The Ed-Touchables', '531a7281-d334-a828-d398-50fbcefeab14'],
    ],
  },
  { show: 'The Powerpuff Girls', games: [["Target Slammin' Action", 'e95adb6c-2a3b-4fbe-bdc1-2a9abef848f7'], ['Mashi-Mojo (The Movie)', '83aabd29-6ae2-494c-abed-a552e9c4e938']] },
  { show: 'Courage the Cowardly Dog', games: [['PC Under Attack!', '7e970f6d-583b-4ba2-abcc-70e066f28cc2']] },
  { show: 'Johnny Bravo', games: [['Love Machine', '5e83ca8e-3f09-4f04-8524-02dbad84f7ad']] },
  { show: 'Cow and Chicken', games: [['Rubber Boat Battle', 'c9d9f6af-d9ec-42cb-807e-b09543cbcbaf']] },
  { show: 'I Am Weasel', games: [['Block That Baboon!', '4b926dad-1cbb-4760-bfb7-fedc7850410c']] },
  { show: 'Samurai Jack', games: [['Code of the Samurai', '89e314af-38eb-468f-bc7e-675d9231c121']] },
  { show: 'Codename: Kids Next Door', games: [['Operation G.R.A.D.U.A.T.E.S.', 'd44b2f61-d3bf-3cec-92a0-3217f8ef0f69']] },
  { show: 'The Grim Adventures of Billy & Mandy', games: [['Bone By Bone', '4dd66e86-00d7-49dd-8aa6-cef1d9e426dd']] },
  { show: "Foster's Home for Imaginary Friends", games: [['Jump-n-Grind', '3870c75a-ceec-4aa2-b794-158b9539f57f']] },
  { show: 'Megas XLR', games: [['Megas vs. The Universe', '48d2c615-1752-48f3-97d7-3b4a0a951104']] },
  { show: 'Duck Dodgers', games: [['Plan 8 From Upper Mars', 'bf2f2f36-95c2-1a81-e5c6-993b392a6e11']] },
  { show: 'Time Squad', games: [['Time Twister', '7e99c5f4-a858-4e17-a681-0df0bf2351aa']] },
  { show: 'Toonami', games: [['Reactor Meltdown', 'f71f761c-17fa-4591-85c0-1c4bbb3a5f61']] },
  { show: 'Scooby-Doo', games: [['Castle Hassle', 'fc9d2cca-bc33-79bf-77ad-6e634e01b25c']] },
  { show: 'Hi Hi Puffy AmiYumi', games: [['World Tour', '67f0c8a1-31eb-a702-1e7b-2ab289feb131']] },
  { show: 'Camp Lazlo', games: [['Squirreled Away', 'de9be603-a4c7-16d5-95d7-8e6bc713908e']] },
  { show: 'Xiaolin Showdown', games: [['Xiaolin Switcheroo', '31edd60a-b721-6186-3d94-274c7dc4e3bc']] },
  { show: 'Teen Titans', games: [['One-on-One', 'c1a97d61-7713-4022-b3e6-93f1c6f6b5b9']] },
  { show: 'Static Shock', games: [['Microbot Menace', '860bfa5d-3737-477b-92ab-3854e993f581']] },
  { show: 'Yogi Bear', games: [['Sandwich Stacker', '9842c2ae-d8ab-4115-8403-f0574217f688']] },
];

export function cnGame(show: string, title: string, id: string): WebGameSpec {
  return {
    title: `${title} - ${show}`,
    icon: 'arcade',
    url: flashpoint(id),
    w: 640,
    h: 500,
    credit: `${show}: ${title}. A Cartoon Network web game preserved by Flashpoint Archive, played with the 9o3o web player.`,
  };
}

/** Open a web game in its own window, with the hourglass and a bit of disk noise first. */
export function openWebGame(spec: WebGameSpec) {
  hourglass(1200);
  sfx.disk(1.2, 0.8);
  window.setTimeout(
    () =>
      openWindow({
        app: 'webgame',
        title: spec.title,
        icon: spec.icon,
        w: spec.w,
        h: spec.h,
        arg: spec,
        x: Math.max(0, Math.round((800 - spec.w) / 2)),
        y: Math.max(0, Math.round((572 - spec.h) / 2)),
      }),
    700,
  );
}
