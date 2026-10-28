/**
 * Fifteen real 1990s View-Master packets, scanned by Dave Machin for the
 * View-Master Database (vm.vmdatabase.com). Each reel here is seven of that
 * packet's scenes, the length of a real reel, with a depth map worked out from
 * the scan so the viewer can open it out into 3D.
 *
 * Files: public/viewmaster/<id>/<n>.jpg and <n>-d.png, n = 0..6.
 */

export interface Reel {
  id: string;
  title: string;
  /** The film or show's year. */
  year: number;
  /** The packet number on the View-Master Database. */
  code: string;
  /** The reel's paper ring. */
  ring: string;
}

export const FRAMES_PER_REEL = 7;

export const REELS: Reel[] = [
  { id: 'beauty', title: "Disney's Beauty and the Beast", year: 1991, code: '012-426 3079', ring: '#f3c64a' },
  { id: 'rocketeer', title: 'The Rocketeer', year: 1991, code: '012-395 4115', ring: '#d9472b' },
  { id: 'aladdin', title: 'Aladdin', year: 1992, code: '012-471 3088', ring: '#7b4dd6' },
  { id: 'batman', title: 'Batman: The Animated Series', year: 1992, code: '012-458 1086', ring: '#3b4a6b' },
  { id: 'goof', title: 'Goof Troop', year: 1992, code: '012-489 3091', ring: '#2e9b4f' },
  { id: 'pr-venus', title: 'Power Rangers: Welcome to Venus Island', year: 1993, code: '012768 4201', ring: '#e23a3a' },
  { id: 'pr-beetle', title: 'Power Rangers: The Beetle Invasion', year: 1993, code: '012793 4203', ring: '#2f6fe0' },
  { id: 'pr-stealer', title: 'Power Rangers: The Power Stealer', year: 1993, code: '012792 4203', ring: '#f0c419' },
  { id: 'pr-guitardo', title: 'Power Rangers: The Song of Guitardo', year: 1993, code: '012794 4203', ring: '#ef6fb0' },
  { id: 'lionking', title: "Disney's The Lion King", year: 1994, code: '012732 3095', ring: '#e8902a' },
  { id: 'casper', title: 'Casper', year: 1995, code: '012806 4159', ring: '#9fb7c9' },
  { id: 'blues', title: "Blue's Clues: Crafts and Colors", year: 1996, code: '73959-6029', ring: '#3d8fe0' },
  { id: 'ispy', title: 'I Spy', year: 1992, code: 'B3492-6039', ring: '#c23a8a' },
  { id: 'trex', title: 'T-Rex: Back to the Cretaceous', year: 1998, code: '38215-6019', ring: '#6b8e3d' },
  { id: 'toystory2', title: 'Toy Story 2', year: 1999, code: '38016-6019', ring: '#4ab0d9' },
];

export function frameUrl(reel: Reel, n: number) {
  return `/viewmaster/${reel.id}/${n}.jpg`;
}

export function depthUrl(reel: Reel, n: number) {
  return `/viewmaster/${reel.id}/${n}-d.png`;
}

export const REEL_CREDIT = 'Reel scans: View-Master Database (vm.vmdatabase.com), Dave Machin';
