import React from 'react';
import { ArrowRight, Box, Gamepad2, Layers3, Sparkles } from 'lucide-react';

interface DemoLandingProps {
  onEnterDemo: () => void;
}

export function DemoLanding({ onEnterDemo }: DemoLandingProps) {
  return (
    <div className="demo-landing min-h-screen w-full text-[#f5f0e8] overflow-x-hidden">
      <div className="demo-landing__atmosphere" aria-hidden />

      <header className="relative z-10 px-5 sm:px-10 pt-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-300/40 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-fuchsia-200" />
          </div>
          <div>
            <p className="font-display text-xl leading-none tracking-wide">Game Room Beta</p>
            <p className="text-[10px] uppercase tracking-[0.28em] text-fuchsia-200/80">First-person menu demo</p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border border-amber-300/40 text-amber-200 bg-amber-500/10">
          Public Beta
        </span>
      </header>

      <main className="relative z-10 px-5 sm:px-10 pt-10 pb-16 max-w-6xl mx-auto">
        <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center min-h-[70vh]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.35em] text-cyan-200/90 mb-4">
              Walk the room · Pick a box · Play
            </p>
            <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.92] text-white mb-5">
              Game Room
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 via-orange-300 to-cyan-300">
                Beta
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-200/90 max-w-xl mb-8 leading-relaxed">
              A nostalgic midnight bedroom is the menu. Move in first person, aim at the shelf, and pull a glowing game box to launch mini-games. This build is intentionally beta — the room, the name, the loop.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onEnterDemo}
                className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-black uppercase tracking-wider px-6 py-3.5 shadow-lg shadow-fuchsia-950/50 transition-transform hover:scale-105"
              >
                Enter the Room
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/20 hover:border-cyan-300/50 bg-black/30 px-5 py-3.5 text-sm font-bold uppercase tracking-wider text-cyan-100"
              >
                How it works
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-fuchsia-500/25 via-orange-400/10 to-cyan-400/20 blur-2xl rounded-[2rem]" aria-hidden />
            <img
              src="/f055162f-d558-4000-abe6-b54c2dfb47fe.jpg"
              alt="First-person 90s bedroom game room concept"
              className="relative w-full rounded-[1.5rem] border border-white/15 shadow-2xl object-cover aspect-[4/3]"
            />
            <img
              src="/0af1325a-9c11-4325-8f2f-881d51cd2e82.jpg"
              alt="Game shelf selection concept"
              className="relative mt-4 w-[72%] ml-auto rounded-2xl border border-white/15 shadow-xl object-cover aspect-video -translate-y-2"
            />
          </div>
        </section>

        <section id="how-it-works" className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: <Gamepad2 className="w-5 h-5 text-fuchsia-300" />,
              title: 'Room is the menu',
              body: 'WASD walk, mouse look. Every hotspot — shelf boxes, CRT, boombox, door — highlights when you aim.',
            },
            {
              icon: <Box className="w-5 h-5 text-orange-300" />,
              title: 'Pull a box to play',
              body: 'Walk to the wooden shelf, lock onto Monopoly-style spines, click to unbox into the live mini-game.',
            },
            {
              icon: <Layers3 className="w-5 h-5 text-cyan-300" />,
              title: 'Beta on purpose',
              body: 'Existing tabletop games stay wired underneath. Classic shelf + Discord bot console remain as beta escapes.',
            },
          ].map(card => (
            <article key={card.title} className="rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-sm">
              <div className="mb-3">{card.icon}</div>
              <h3 className="font-display text-xl text-white mb-2">{card.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{card.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="relative z-10 px-5 sm:px-10 pb-8 text-[11px] text-slate-400 flex flex-wrap gap-3 justify-between max-w-6xl mx-auto">
        <span>Game Room Beta · Railway-ready demo</span>
        <span>Pointer lock required · Desktop recommended</span>
      </footer>
    </div>
  );
}
