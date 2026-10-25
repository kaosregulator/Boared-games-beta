/**
 * Where the menu reel (?film) is right now, for the toy worlds that play their
 * own part in it. FilmCamera writes it every frame; nothing else does.
 */
export const filmClock = {
  /** Seconds into the reel. */
  t: 0,
  /** Which shot is up, or -1 when there's no reel. */
  shot: -1,
  /** Seconds into that shot. */
  shotT: 0,
};

/**
 * A world's frame step: real time normally, the reel's clock while filming
 * (the recorder renders far slower than real time, one frame per 1/24 s of reel).
 */
export function makeFilmStep(film: boolean) {
  let last: number | null = null;
  return (rawDt: number) => {
    if (!film) return Math.min(rawDt, 0.05);
    const t = filmClock.t;
    const d = last === null ? 0 : t - last;
    last = t;
    return d > 0 && d < 0.5 ? d : 1 / 24;
  };
}
