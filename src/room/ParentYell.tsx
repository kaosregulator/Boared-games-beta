import React, { useEffect, useState } from 'react';
import { onYell, type Yell } from './houseRules';

/** A parent yelling up the stairs, for a few seconds. */
export function ParentYell() {
  const [yell, setYell] = useState<(Yell & { seq: number }) | null>(null);

  useEffect(
    () =>
      onYell(next => {
        setYell(cur => ({ ...next, seq: (cur?.seq ?? 0) + 1 }));
      }),
    [],
  );

  useEffect(() => {
    if (!yell) return;
    const id = window.setTimeout(() => setYell(null), 5200);
    return () => window.clearTimeout(id);
  }, [yell]);

  if (!yell) return null;
  return (
    <div
      key={yell.seq}
      role="alert"
      className="parent-yell pointer-events-none absolute inset-x-0 top-[14%] z-[70] mx-auto w-[min(92vw,460px)] rounded-2xl border-2 border-[#3a2a12] bg-[#fff3c4] px-5 py-4 text-[#2a1d08] shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#b0361f]">{yell.who}:</p>
      <p className="mt-1 text-[17px] font-extrabold leading-snug">{yell.line}</p>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6b5530]">Turn off the TV or the radio first</p>
    </div>
  );
}
