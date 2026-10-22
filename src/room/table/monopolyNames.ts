function firstPerson(verb: string) {
  if (/(ss|sh|ch|x|o)es$/.test(verb)) return verb.slice(0, -2);
  if (/[^aeiou]ies$/.test(verb)) return `${verb.slice(0, -3)}y`;
  if (/[^s]s$/.test(verb)) return verb.slice(0, -1);
  return verb;
}

/**
 * The engine's log, as read at the table. The board is the US (Atlantic City)
 * one, so the street names stand as they are; only "You rolls" becomes
 * "You roll", and the engine's British "favour" becomes "favor".
 */
export function usText(text: string) {
  let out = text.replace(/\bfavour\b/g, 'favor');
  // The engine writes every player in the third person.
  out = out.replace(/\bYou (\w+)\b/g, (_, verb: string) => `You ${firstPerson(verb)}`);
  out = out.replace(/(\bYou [^.!]*? and )(\w+)/g, (_, pre: string, verb: string) => pre + firstPerson(verb));
  return out;
}
