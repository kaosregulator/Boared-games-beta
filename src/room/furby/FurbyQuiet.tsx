import { useEffect, useState } from 'react';
import { furbyAudible, setFurbyAudible } from './furbyAudio';
import { FURBY_QUIET_LINES } from './furbyQuiet';

/**
 * A room mute for the Furby. It only scales his master gain. Speech, motion,
 * and how close you have to be before he notices you stay the same.
 * Turning the TV and the radio off unmounts this and lets him talk again.
 */
export function FurbyQuiet() {
  const [quiet, setQuiet] = useState(() => !furbyAudible());
  const [joke, setJoke] = useState(0);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    return () => setFurbyAudible(true);
  }, []);

  useEffect(() => {
    if (joke === 0) {
      setShown(0);
      return;
    }
    setShown(1);
    const steps = FURBY_QUIET_LINES.slice(1).map((_, index) => window.setTimeout(() => setShown(index + 2), (index + 1) * 850));
    const clear = window.setTimeout(() => setJoke(0), 9000);
    return () => {
      steps.forEach(id => window.clearTimeout(id));
      window.clearTimeout(clear);
    };
  }, [joke]);

  return (
    <>
      <button
        type="button"
        data-ui="furby-mute"
        aria-pressed={quiet}
        className="pointer-events-auto absolute left-3 top-1/2 z-[64] max-w-[9rem] -translate-y-1/2 rounded-full border border-amber-200/70 bg-black/75 px-3 py-2 text-left text-[12px] font-bold leading-tight text-amber-50 shadow-lg hover:bg-black/90"
        onClick={() => {
          const next = !quiet;
          setQuiet(next);
          setFurbyAudible(!next);
          if (next) setJoke(value => value + 1);
        }}
      >
        {quiet ? 'Unmute Furby' : 'Mute Furby'}
      </button>
      {joke > 0 && (
        <div
          key={joke}
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 top-[16%] z-[65] flex flex-col items-center gap-3 px-8 text-center"
        >
          {FURBY_QUIET_LINES.slice(0, shown).map(line => (
            <p
              key={line}
              className="text-[clamp(1.35rem,3.4vw,2.15rem)] font-semibold leading-snug tracking-tight text-white"
              style={{
                textShadow: '0 2px 16px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
                animation: 'furby-quiet-pop 0.45s ease',
              }}
            >
              {line}
            </p>
          ))}
          <style>{`@keyframes furby-quiet-pop { from { transform: translateY(14px); } to { transform: translateY(0); } }`}</style>
        </div>
      )}
    </>
  );
}
