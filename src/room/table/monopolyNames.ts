function firstPerson(verb: string) {
  if (/(ss|sh|ch|x|o)es$/.test(verb)) return verb.slice(0, -2);
  if (/[^aeiou]ies$/.test(verb)) return `${verb.slice(0, -3)}y`;
  if (/[^s]s$/.test(verb)) return verb.slice(0, -1);
  return verb;
}

/** The engine speaks US street names; the board printed in the box is the London one. */
const UK: [string, string][] = [
  ['Mediterranean Avenue', 'Old Kent Road'],
  ['Baltic Avenue', 'Whitechapel Road'],
  ['Reading Railroad', 'Kings Cross Station'],
  ['Oriental Avenue', 'The Angel, Islington'],
  ['Vermont Avenue', 'Euston Road'],
  ['Connecticut Avenue', 'Pentonville Road'],
  ['St. Charles Place', 'Pall Mall'],
  ['States Avenue', 'Whitehall'],
  ['Virginia Avenue', 'Northumberland Avenue'],
  ['Pennsylvania Railroad', 'Marylebone Station'],
  ['St. James Place', 'Bow Street'],
  ['Tennessee Avenue', 'Marlborough Street'],
  ['New York Avenue', 'Vine Street'],
  ['Kentucky Avenue', 'Strand'],
  ['Indiana Avenue', 'Fleet Street'],
  ['Illinois Avenue', 'Trafalgar Square'],
  ['B. & O. Railroad', 'Fenchurch St. Station'],
  ['Atlantic Avenue', 'Leicester Square'],
  ['Ventnor Avenue', 'Coventry Street'],
  ['Marvin Gardens', 'Piccadilly'],
  ['Pacific Avenue', 'Regent Street'],
  ['North Carolina Avenue', 'Oxford Street'],
  ['Pennsylvania Avenue', 'Bond Street'],
  ['Short Line', 'Liverpool St. Station'],
  ['Park Place', 'Park Lane'],
  ['Boardwalk', 'Mayfair'],
  ['Luxury Tax', 'Super Tax'],
];

/** The engine's short labels, mapped the same way. */
const UK_SHORT: [string, string][] = [
  ['Mediterranean', 'Old Kent Road'],
  ['Baltic', 'Whitechapel Road'],
  ['Reading RR', 'Kings Cross'],
  ['Oriental', 'The Angel, Islington'],
  ['Vermont', 'Euston Road'],
  ['Connecticut', 'Pentonville Road'],
  ['St. Charles', 'Pall Mall'],
  ['Electric Co.', 'Electric Company'],
  ['States', 'Whitehall'],
  ['Virginia', 'Northumberland Avenue'],
  ['Penn RR', 'Marylebone'],
  ['St. James', 'Bow Street'],
  ['Tennessee', 'Marlborough Street'],
  ['New York', 'Vine Street'],
  ['Kentucky', 'Strand'],
  ['Indiana', 'Fleet Street'],
  ['Illinois', 'Trafalgar Square'],
  ['B&O RR', 'Fenchurch St.'],
  ['Atlantic', 'Leicester Square'],
  ['Ventnor', 'Coventry Street'],
  ['Marvin Gdns', 'Piccadilly'],
  ['Pacific', 'Regent Street'],
  ['N. Carolina', 'Oxford Street'],
  ['Pennsylvania', 'Bond Street'],
  ['Short Line', 'Liverpool St.'],
  ['Park Place', 'Park Lane'],
  ['Boardwalk', 'Mayfair'],
  ['Luxury Tax', 'Super Tax'],
];

export function londonize(text: string) {
  let out = text;
  for (const [us, uk] of UK) out = out.split(us).join(uk);
  for (const [us, uk] of UK_SHORT) out = out.replace(new RegExp(`\\b${us.replace(/[.&]/g, m => `\\${m}`)}(?![\\w])`, 'g'), uk);
  // The engine writes every player in the third person: "You rolls" -> "You roll".
  out = out.replace(/\bYou (\w+)\b/g, (_, verb: string) => `You ${firstPerson(verb)}`);
  out = out.replace(/(\bYou [^.!]*? and )(\w+)/g, (_, pre: string, verb: string) => pre + firstPerson(verb));
  return out.replace(/\$(\d)/g, 'M$1');
}

