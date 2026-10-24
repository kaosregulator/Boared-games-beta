/**
 * Advance a scripted beat by wall-clock time.
 * The walker's frame step is capped at 50 ms so a hitch cannot tunnel through
 * a wall. That same cap froze the Furby's flight and the box pull: at a low
 * frame rate the "open" never reached the end. A script follows real time,
 * and one hidden-tab gap cannot skip more than `cap` seconds.
 */
export function scriptedStep(lastMs: number | null, nowMs: number, cap = 0.5): { dt: number; at: number } {
  if (lastMs === null || nowMs < lastMs) return { dt: 0, at: nowMs };
  return { dt: Math.min(cap, (nowMs - lastMs) / 1000), at: nowMs };
}
