/**
 * Packets that are actually listed on the public View-Master Database
 * (vm.vmdatabase.com), 1989–1999 fiction plus the Teenage Mutant Ninja Turtles
 * packet. The viewer opens those public pages. Nothing here is a copied scan,
 * a painted stand-in, or an invented reel serial.
 */

export interface Reel {
  title: string;
  year: number;
}

export const REELS: Reel[] = [
  { title: 'The Little Mermaid', year: 1989 },
  { title: 'Disney\u2019s Beauty and the Beast', year: 1991 },
  { title: 'The Rocketeer 1', year: 1991 },
  { title: 'Aladdin', year: 1992 },
  { title: 'Batman The Animated Series', year: 1992 },
  { title: 'Goof Troop', year: 1992 },
  { title: 'The Mighty Morphin Power Rangers - Welcome to Venus Island', year: 1993 },
  { title: 'The Mighty Morphin Power Rangers The Beetle Invasion', year: 1993 },
  { title: 'The Mighty Morphin Power Rangers The Power Stealer', year: 1993 },
  { title: 'The Mighty Morphin Power Rangers The Song of Guitardo', year: 1993 },
  { title: 'Disney\u2019s The Lion King', year: 1994 },
  { title: 'Casper', year: 1995 },
  { title: 'IMAX T-Rex Back to the Cretaceous', year: 1998 },
  { title: 'Toy Story 2', year: 1999 },
  { title: 'Teenage mutant ninja turtles', year: 1987 },
];

export function databasePage(title: string): string {
  return `https://vm.vmdatabase.com/index.html?go=${encodeURIComponent(title)}`;
}
