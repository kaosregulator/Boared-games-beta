import React, { useState, useEffect } from 'react';
import {
  TriviaSubMode,
  MatchFormat,
  TriviaQuestion,
  TriviaPlayer,
  HostCharacter,
  KillingFloorState,
  CustomTriviaPack
} from '../../types/trivia';
import {
  TRIVIA_HOSTS,
  TRIVIA_QUESTIONS,
  PRESET_CUSTOM_PACKS,
  MOCK_TRIVIA_AI_BOTS
} from './triviaData';
import { AnimatedHost } from './AnimatedHost';
import { TriviaQuestionScreen } from './TriviaQuestionScreen';
import { KillingFloorView } from './KillingFloorView';
import { FinalEscapeView } from './FinalEscapeView';
import { CustomPackCreator } from './CustomPackCreator';
import { RerunBoardGame } from './RerunBoardGame';
import { sound } from '../../utils/audio';
import { useTriviaOnTable } from '../../room/table/triviaTable';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, Play, RotateCcw, Users, Bot, ArrowRight, Crown } from 'lucide-react';

interface TriviaPartyGameProps {
  onGameOver?: (winnerName: string, isRealMatch: boolean) => void;
  onExitToShelf?: () => void;
}

type HostId = 'buzz' | 'mortimer' | 'pixel8' | 'scarlett';

interface ModeCard {
  id: TriviaSubMode | 'creator';
  title: string;
  blurb: string;
  icon: string;
  host: HostId;
  /** Box-lid colour on the table. */
  ink: string;
  greeting: string;
  deck?: (q: TriviaQuestion) => boolean;
}

/** Every box on the shelf, in the order they're laid out on the table. */
const MODES: ModeCard[] = [
  {
    id: 'party_mix',
    title: 'The Whole Block',
    blurb: 'A little of everything: commercials, the 8-bit, the closet, the porch.',
    icon: '🏘️',
    host: 'buzz',
    ink: '#d4890b',
    greeting: "Shoes off, door shut, lights OFF if you leave the room. Let's see what you still remember.",
  },
  {
    id: 'rerun_board',
    title: 'Prime Time Rerun',
    blurb: 'Our mini Jeopardy board. Pick a tile, answer in the form of a question.',
    icon: '📺',
    host: 'scarlett',
    ink: '#2457c5',
    greeting: 'Grandpa has been doing this from the recliner since 1984. Answer in the form of a question.',
  },
  {
    id: 'heart_block',
    title: 'Heard It Growing Up',
    blurb: '"Were you raised in a barn?" Finish what the kitchen yelled.',
    icon: '🍳',
    host: 'scarlett',
    ink: '#c0392b',
    greeting: "I'm not asking twice. Who left the front door open? Were you raised in a barn?",
    deck: q => q.category === 'heard_it' || q.category === 'heart',
  },
  {
    id: 'cinephile',
    title: 'Commercial Break',
    blurb: 'Real 90s spots from the Internet Archive. Name the snack, the toy, the kid.',
    icon: '📼',
    host: 'buzz',
    ink: '#7b3fa0',
    greeting: "Don't touch the remote. We're watching the commercials. They're the best part.",
    deck: q => q.category === 'commercials' || q.type === 'video_clip',
  },
  {
    id: 'real_sounds',
    title: 'Off the Hook',
    blurb: 'Dial tone, busy signal, dial-up, the moon landing. The real sounds.',
    icon: '☎️',
    host: 'scarlett',
    ink: '#1f7a4a',
    greeting: 'Get off the phone! I need to use the internet. And somebody left the hallway phone off the hook.',
    deck: q => q.category === 'real_sound' || q.type === 'quote' || q.category === 'movie_quotes',
  },
  {
    id: 'name_that_tune',
    title: '8-Bit Boombox',
    blurb: 'Our original cues and the songs every toy and truck played. Name them.',
    icon: '🎮',
    host: 'pixel8',
    ink: '#0e8a8a',
    greeting: "TV's off, radio's off, tape's off. The boombox has the room. Don't touch my controller.",
    deck: q => q.category === 'chiptune_sound',
  },
  {
    id: 'picture_fade',
    title: 'Polaroid Fade',
    blurb: 'The picture develops slowly. Shout it before it does.',
    icon: '📷',
    host: 'buzz',
    ink: '#b56b1f',
    greeting: "Shake it like a Polaroid. Don't actually, it doesn't help. Just guess.",
    deck: q => q.type === 'picture_fade',
  },
  {
    id: 'gaming_vault',
    title: 'Cartridge Years',
    blurb: 'Blow in it, enter the code, die of dysentery.',
    icon: '🕹️',
    host: 'pixel8',
    ink: '#4a5d8a',
    greeting: 'Up, up, down, down. You know the rest. Prove it.',
    deck: q => q.category === 'video_games' || q.category === 'game_systems',
  },
  {
    id: 'murder_mystery',
    title: 'After the Streetlights',
    blurb: 'Scary-sleepover trivia. Miss one and you go down to the basement.',
    icon: '🕯️',
    host: 'mortimer',
    ink: '#5a1f2e',
    greeting: "Your parents won't be home till late. Miss a question and you go down to the basement. Alone.",
    deck: q => q.category === 'murder_mystery',
  },
  {
    id: 'creator',
    title: 'Make Your Own Pack',
    blurb: 'Write your own cards, or let the AI write a pack on anything.',
    icon: '✏️',
    host: 'buzz',
    ink: '#6b6b6b',
    greeting: 'Grab a marker. Write the questions you always wanted to ask.',
  },
];

const FORMATS: Array<{ id: MatchFormat; title: string; blurb: string; icon: React.ReactNode }> = [
  { id: 'solo_vs_ai', title: 'You vs. the family', blurb: 'Know-It-All Kyle, Cousin Bobby and Grandpa.', icon: <Bot className="h-5 w-5" /> },
  { id: 'team_vs_ai', title: 'You + Grandpa', blurb: 'Team up against the cousins.', icon: <Users className="h-5 w-5" /> },
  { id: 'pass_and_play', title: 'Couch rules', blurb: 'Two players, one controller, no peeking.', icon: <Trophy className="h-5 w-5" /> },
];

const hostById = (id: HostId) => TRIVIA_HOSTS.find(h => h.id === id) ?? TRIVIA_HOSTS[0];

function shuffle<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The right answer is written first in the deck; move it somewhere new every match. */
function shuffleOptions(q: TriviaQuestion): TriviaQuestion {
  const order = shuffle(q.options.map((text, i) => ({ text, right: i === q.correctIndex })));
  return { ...q, options: order.map(o => o.text), correctIndex: order.findIndex(o => o.right) };
}

/** A Whole Block night: never three of the same kind in a row. */
function mixDeck(all: TriviaQuestion[], rounds: number): TriviaQuestion[] {
  const pool = shuffle(all);
  const out: TriviaQuestion[] = [];
  while (out.length < rounds && pool.length) {
    const recent = out.slice(-2).map(q => q.category);
    const i = pool.findIndex(q => !(recent.length === 2 && recent.every(c => c === q.category)));
    out.push(...pool.splice(i < 0 ? 0 : i, 1));
  }
  return out;
}

const fresh = { score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null };

export const TriviaPartyGame: React.FC<TriviaPartyGameProps> = ({
  onGameOver,
  onExitToShelf
}) => {
  const onTable = useTriviaOnTable();
  const [phase, setPhase] = useState<
    'mode_select' | 'lobby' | 'question' | 'rerun' | 'killing_floor' | 'final_escape' | 'creator' | 'game_over'
  >('mode_select');

  const [selectedMode, setSelectedMode] = useState<TriviaSubMode>('party_mix');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('solo_vs_ai');
  const [activeHost, setActiveHost] = useState<HostCharacter>(TRIVIA_HOSTS[0]);
  const [hostQuip, setHostQuip] = useState<string>(TRIVIA_HOSTS[0].defaultGreeting);
  const [isHostSpeaking, setIsHostSpeaking] = useState<boolean>(true);

  const [questionDeck, setQuestionDeck] = useState<TriviaQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [showQuestionResults, setShowQuestionResults] = useState<boolean>(false);
  const [players, setPlayers] = useState<TriviaPlayer[]>([]);
  const [killingFloor, setKillingFloor] = useState<KillingFloorState | null>(null);
  const [customPacks, setCustomPacks] = useState<CustomTriviaPack[]>(PRESET_CUSTOM_PACKS);

  const mode = MODES.find(m => m.id === selectedMode) ?? MODES[0];

  const triggerHostQuip = (quip: string, durationMs: number = 4000) => {
    setHostQuip(quip);
    setIsHostSpeaking(true);
    sound.playHostStinger();
    setTimeout(() => {
      setIsHostSpeaking(false);
    }, durationMs);
  };

  useEffect(() => {
    const host = hostById(mode.host);
    setActiveHost(host);
    triggerHostQuip(mode.greeting);
  }, [selectedMode]);

  const pickMode = (card: ModeCard) => {
    sound.playButtonClick();
    if (card.id === 'creator') {
      setPhase('creator');
      return;
    }
    setSelectedMode(card.id);
    setPhase('lobby');
  };

  const buildRoster = (): TriviaPlayer[] => {
    const human: TriviaPlayer = {
      id: 'human_1',
      name: 'You',
      avatar: '👑',
      color: 'bg-indigo-600',
      isBot: false,
      ...fresh,
      team: matchFormat === 'team_vs_ai' ? 'Alpha' : null,
    };
    const [kyle, bobby, grandpa, sister] = MOCK_TRIVIA_AI_BOTS;
    if (matchFormat === 'team_vs_ai') {
      return [
        human,
        { ...grandpa, ...fresh, name: 'Grandpa (your team)', team: 'Alpha' },
        { ...kyle, ...fresh, team: 'Omega' },
        { ...bobby, ...fresh, team: 'Omega' },
      ];
    }
    if (matchFormat === 'pass_and_play') {
      return [
        human,
        { id: 'player_2', name: 'Player 2', avatar: '🎮', color: 'bg-rose-600', isBot: false, ...fresh },
      ];
    }
    if (matchFormat === 'ranked_arena') {
      return [human, { ...kyle, ...fresh }, { ...bobby, ...fresh }];
    }
    return [human, { ...kyle, ...fresh }, { ...grandpa, ...fresh }, { ...sister, ...fresh }];
  };

  const handleStartMatch = (customPack?: CustomTriviaPack) => {
    sound.playShelfSlide();
    const roster = buildRoster();
    setPlayers(roster);

    if (!customPack && selectedMode === 'rerun_board') {
      setPhase('rerun');
      triggerHostQuip('Pick a category. Any category. Grandpa already knows the answer.');
      return;
    }

    let deck: TriviaQuestion[];
    if (customPack) deck = [...customPack.questions];
    else if (mode.deck) deck = shuffle(TRIVIA_QUESTIONS.filter(mode.deck));
    else deck = mixDeck(TRIVIA_QUESTIONS, 10);
    if (deck.length === 0) deck = mixDeck(TRIVIA_QUESTIONS, 10);

    const rounds = Math.min(deck.length, selectedMode === 'party_mix' ? 10 : 12);
    setQuestionDeck(deck.slice(0, rounds).map(shuffleOptions));
    setCurrentQIndex(0);
    setShowQuestionResults(false);
    setPhase('question');
    triggerHostQuip('Card one. No peeking at your neighbor.');
  };

  const handleAnswerSelected = (chosenIndex: number, timeMs: number) => {
    const currentQ = questionDeck[currentQIndex];
    const isCorrect = chosenIndex === currentQ.correctIndex;

    const updatedPlayers = players.map(p => {
      if (!p.isBot) {
        const pointsEarned = isCorrect ? currentQ.points + Math.max(0, 15000 - timeMs) / 20 : 0;
        return {
          ...p,
          selectedAnswer: chosenIndex,
          answerTimeMs: timeMs,
          isAnswerCorrect: isCorrect,
          score: p.score + Math.round(pointsEarned),
          streak: isCorrect ? p.streak + 1 : 0
        };
      }
      const botCorrect = Math.random() < (p.botAccuracy || 0.75);
      const wrongs = currentQ.options.map((_, i) => i).filter(i => i !== currentQ.correctIndex);
      const botAns = botCorrect ? currentQ.correctIndex : wrongs[Math.floor(Math.random() * wrongs.length)];
      const botTime = 3000 + Math.random() * 6000;
      const botPoints = botCorrect ? currentQ.points + Math.max(0, 15000 - botTime) / 20 : 0;
      return {
        ...p,
        selectedAnswer: botAns,
        answerTimeMs: botTime,
        isAnswerCorrect: botCorrect,
        score: p.score + Math.round(botPoints),
        streak: botCorrect ? p.streak + 1 : 0
      };
    });

    setPlayers(updatedPlayers);
    setShowQuestionResults(true);

    if (isCorrect) {
      sound.playTriviaCorrect();
      triggerHostQuip(`That's it! ${currentQ.explanation}`);
    } else {
      sound.playTriviaWrong();
      triggerHostQuip(`Nope. It was "${currentQ.options[currentQ.correctIndex]}." ${currentQ.explanation}`);
    }

    // Long enough to read the joke on the card.
    setTimeout(() => {
      handleAdvanceRound(updatedPlayers);
    }, 5200);
  };

  const nextQuestion = () => {
    setCurrentQIndex(prev => prev + 1);
    setShowQuestionResults(false);
    setPlayers(prev => prev.map(p => ({ ...p, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null })));
    setPhase('question');
  };

  const handleAdvanceRound = (currentRoster: TriviaPlayer[]) => {
    if (selectedMode === 'murder_mystery' && currentQIndex < questionDeck.length - 1) {
      const living = currentRoster.filter(p => !p.isGhost);
      const wrong = living.filter(p => !p.isAnswerCorrect);
      const target = wrong.length > 0
        ? wrong[Math.floor(Math.random() * wrong.length)]
        : [...living].sort((a, b) => a.score - b.score)[0];

      if (target) {
        const traps: KillingFloorState['type'][] = ['chalice_roulette', 'wire_cut', 'guillotine_reaction', 'math_bomb', 'memory_code'];
        setKillingFloor({
          type: traps[Math.floor(Math.random() * traps.length)],
          title: 'Down to the basement',
          description: 'Get out of the basement, or stay down there as a ghost.',
          targetPlayerId: target.id,
          timeRemaining: 10,
          isResolved: false,
          survived: null
        });
        setPhase('killing_floor');
        triggerHostQuip(`${target.name}, the basement light is broken. Good luck.`);
        return;
      }
    }

    if (selectedMode === 'murder_mystery' && currentQIndex >= questionDeck.length - 1) {
      setPhase('final_escape');
      triggerHostQuip('Headlights in the driveway! Get back to bed before they walk in!');
      return;
    }

    if (currentQIndex < questionDeck.length - 1) {
      nextQuestion();
      triggerHostQuip('Next card.');
    } else {
      handleMatchComplete(currentRoster);
    }
  };

  const handleSurvivalResult = (survived: boolean) => {
    if (!killingFloor) return;
    const targetId = killingFloor.targetPlayerId;
    setPlayers(prev =>
      prev.map(p => (p.id === targetId && !survived ? { ...p, isGhost: true, lives: Math.max(0, p.lives - 1) } : p))
    );
    setTimeout(() => {
      setKillingFloor(null);
      if (currentQIndex < questionDeck.length - 1) {
        nextQuestion();
        triggerHostQuip('Back upstairs. Somebody turn a light on. Not that one, your dad will see.');
      } else {
        setPhase('final_escape');
      }
    }, 1200);
  };

  const handleMatchComplete = (roster: TriviaPlayer[]) => {
    setPlayers(roster);
    setPhase('game_over');
    sound.playVictoryFanfare();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    const winner = [...roster].sort((a, b) => b.score - a.score)[0];
    const isRealMatch = matchFormat === 'pass_and_play' || matchFormat === 'ranked_arena';
    triggerHostQuip(
      winner.isBot
        ? `${winner.name} wins. Of course. Go get your shoes, it's getting dark.`
        : `You win! Don't let it go to your head. Go turn the porch light off.`,
      6000
    );
    onGameOver?.(winner.name, isRealMatch);
  };

  const handleSaveCustomPack = (pack: CustomTriviaPack) => {
    setCustomPacks(prev => [pack, ...prev]);
    sound.playTriviaCorrect();
  };

  const handlePlayCustomPack = (pack: CustomTriviaPack) => {
    setSelectedMode('custom_pack');
    handleStartMatch(pack);
  };

  const standings = [...players].sort((a, b) => b.score - a.score);
  const isRerun = selectedMode === 'rerun_board';
  const scoreText = (n: number) => (isRerun ? `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString()}` : `${n.toLocaleString()} pts`);

  // ---------------------------------------------------------------- on the table
  if (onTable) {
    const showNote = phase === 'lobby' || phase === 'game_over' || phase === 'killing_floor' || phase === 'final_escape';
    return (
      <div className="tt-board relative flex h-full min-h-0 w-full flex-col overflow-hidden select-none">
        {phase === 'mode_select' && (
          <div className="flex h-full min-h-0 flex-col p-2.5">
            <div className="mb-2 flex shrink-0 items-end justify-between gap-2">
              <h1 className="tt-marker leading-none text-[#f2c14e]" style={{ textShadow: '2px 2px 0 #000', fontSize: 'clamp(18px, 5cqmin, 44px)' }}>
                Throwback Trivia
              </h1>
              <p className="tt-sticky tt-s max-w-[55%] truncate rounded-sm px-2 py-1 font-bold">
                {activeHost.avatar} {hostQuip}
              </p>
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-5 grid-rows-2 gap-2">
              {MODES.map((card, i) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => pickMode(card)}
                  className="tt-card tt-pop relative flex min-h-0 flex-col overflow-hidden p-0 text-left"
                  style={{ animationDelay: `${i * 45}ms` }}
                >
                  <div className="flex shrink-0 items-center gap-1.5 px-2 py-1 text-white" style={{ background: card.ink }}>
                    <span className="tt-a leading-none">{card.icon}</span>
                    <span className="tt-s truncate font-black uppercase tracking-wider">
                      {card.id === 'rerun_board' ? 'New!' : hostById(card.host).name}
                    </span>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-2 py-1.5">
                    <h3 className="tt-marker tt-h">{card.title}</h3>
                    <p className="tt-s line-clamp-4 leading-tight text-[#2a1d12]/75">{card.blurb}</p>
                  </div>
                  <span
                    aria-hidden
                    className="pointer-events-none absolute bottom-1 right-2 rotate-[-8deg] leading-none drop-shadow-[0_3px_0_rgba(0,0,0,0.15)]"
                    style={{ fontSize: 'clamp(22px, 11cqmin, 96px)' }}
                  >
                    {card.icon}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'lobby' && (
          <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-3">
            <div className="tt-paper tt-pop w-full max-w-[70%] py-4 pl-10 pr-5">
              <p className="tt-s font-black uppercase tracking-[0.2em] text-[#c0392b]">{mode.icon} {mode.title}</p>
              <p className="tt-type tt-q mt-1">{mode.blurb}</p>
            </div>
            <div className="grid w-full max-w-[70%] grid-cols-3 gap-3">
              {FORMATS.map((f, i) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setMatchFormat(f.id);
                    sound.playButtonClick();
                  }}
                  data-state={matchFormat === f.id ? 'picked' : undefined}
                  className="tt-card tt-pop flex flex-col items-start gap-1 p-3 text-left"
                  style={{ animationDelay: `${100 + i * 70}ms` }}
                >
                  <span className="text-[#2457c5]">{f.icon}</span>
                  <span className="tt-marker tt-h">{f.title}</span>
                  <span className="tt-s leading-tight text-[#2a1d12]/70">{f.blurb}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setPhase('mode_select')} className="tt-key">
                ◀ Other boxes
              </button>
              <button
                type="button"
                onClick={() => handleStartMatch()}
                className="tt-card tt-pop tt-a flex items-center gap-2 px-6 py-2.5 font-black uppercase tracking-widest"
                style={{ background: '#f2c14e', animationDelay: '320ms' }}
              >
                <Play className="h-4 w-4" /> Deal the cards
              </button>
            </div>
          </div>
        )}

        {phase === 'question' && questionDeck.length > 0 && (
          <TriviaQuestionScreen
            key={questionDeck[currentQIndex].id}
            question={questionDeck[currentQIndex]}
            roundNumber={currentQIndex + 1}
            totalRounds={questionDeck.length}
            players={players}
            activePlayer={players.find(p => !p.isBot) || players[0]}
            onAnswerSelected={handleAnswerSelected}
            showResults={showQuestionResults}
          />
        )}

        {phase === 'rerun' && <RerunBoardGame players={players} onFinish={handleMatchComplete} />}

        {phase === 'killing_floor' && killingFloor && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <KillingFloorView
              killingFloor={killingFloor}
              targetPlayer={players.find(p => p.id === killingFloor.targetPlayerId) || players[0]}
              onSurvivalResult={handleSurvivalResult}
            />
          </div>
        )}

        {phase === 'final_escape' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <FinalEscapeView players={players} onEscapeComplete={() => handleMatchComplete(players)} />
          </div>
        )}

        {phase === 'creator' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <CustomPackCreator
              onSavePack={handleSaveCustomPack}
              onPlayPackNow={handlePlayCustomPack}
              onCancel={() => setPhase('mode_select')}
            />
          </div>
        )}

        {phase === 'game_over' && (
          <div className="flex h-full min-h-0 items-center justify-center gap-3 p-3">
            <div className="tt-paper tt-pop flex max-h-full w-full max-w-md flex-col overflow-hidden py-3 pl-9 pr-4">
              <p className="tt-marker text-xl leading-none text-[#c0392b]">Final score</p>
              <p className="tt-type mb-2 text-[11px] opacity-70">{mode.title} · written on the back of a pizza box</p>
              <ol className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {standings.map((p, idx) => (
                  <li key={p.id} className="tt-type flex items-center justify-between gap-2 text-[13px]">
                    <span className="truncate">
                      {idx === 0 ? '★' : `${idx + 1}.`} {p.isGhost ? '👻' : p.avatar} {p.name}
                    </span>
                    <span className={`tt-marker shrink-0 ${idx === 0 ? 'text-[#c0392b]' : ''}`}>{scoreText(p.score)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => handleStartMatch()} className="tt-key">
                  Rematch
                </button>
                <button type="button" onClick={() => setPhase('mode_select')} className="tt-key">
                  Other boxes
                </button>
              </div>
            </div>
          </div>
        )}

        {showNote && (
          <p className="tt-sticky tt-s pointer-events-none absolute bottom-3 right-3 max-w-[34%] rounded-sm px-2.5 py-1.5 font-bold leading-snug">
            {activeHost.avatar} <span className="uppercase">{activeHost.name}:</span> {hostQuip}
          </p>
        )}
      </div>
    );
  }

  // ------------------------------------------------------------ in a window
  return (
    <div className="w-full text-white rounded-3xl p-3 sm:p-4 flex flex-col items-center justify-between relative select-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black pointer-events-none" />

      <div className="w-full flex flex-col items-stretch z-10 min-w-0 gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPhase('mode_select')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Boxes
          </button>
          <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {mode.title}
          </span>
        </div>
        <AnimatedHost host={activeHost} quipText={hostQuip} isSpeaking={isHostSpeaking} compact={phase !== 'mode_select'} />
      </div>

      <div className="w-full flex-1 flex flex-col items-center justify-center z-10 my-2">
        {phase === 'mode_select' && (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 flex items-center justify-center gap-2 mb-6">
              <Crown className="w-7 h-7 text-amber-400" />
              THROWBACK TRIVIA
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-6">
              {MODES.map(card => (
                <button
                  key={card.id}
                  onClick={() => pickMode(card)}
                  className="bg-slate-950 border-2 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
                  style={{ borderColor: card.ink }}
                >
                  <div>
                    <div className="text-2xl mb-2">{card.icon}</div>
                    <h3 className="font-black text-base text-white group-hover:text-amber-300 transition">{card.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{card.blurb}</p>
                  </div>
                  <div className="mt-4 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider">
                    Host: {hostById(card.host).name} <ArrowRight className="w-3 h-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'lobby' && (
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-2">{mode.title}</h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">{mode.blurb}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setMatchFormat(f.id);
                    sound.playButtonClick();
                  }}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${
                    matchFormat === f.id ? 'bg-amber-950/60 border-amber-400 text-white shadow-lg' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="text-amber-400 mb-2">{f.icon}</div>
                  <div className="font-bold text-xs uppercase">{f.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{f.blurb}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => handleStartMatch()}
              className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 text-white" />
              DEAL THE CARDS
            </button>
          </div>
        )}

        {phase === 'question' && questionDeck.length > 0 && (
          <TriviaQuestionScreen
            key={questionDeck[currentQIndex].id}
            question={questionDeck[currentQIndex]}
            roundNumber={currentQIndex + 1}
            totalRounds={questionDeck.length}
            players={players}
            activePlayer={players.find(p => !p.isBot) || players[0]}
            onAnswerSelected={handleAnswerSelected}
            showResults={showQuestionResults}
          />
        )}

        {phase === 'rerun' && (
          <div className="tt-board h-[30rem] w-full max-w-4xl">
            <RerunBoardGame players={players} onFinish={handleMatchComplete} />
          </div>
        )}

        {phase === 'killing_floor' && killingFloor && (
          <KillingFloorView
            killingFloor={killingFloor}
            targetPlayer={players.find(p => p.id === killingFloor.targetPlayerId) || players[0]}
            onSurvivalResult={handleSurvivalResult}
          />
        )}

        {phase === 'final_escape' && (
          <FinalEscapeView players={players} onEscapeComplete={() => handleMatchComplete(players)} />
        )}

        {phase === 'creator' && (
          <CustomPackCreator
            onSavePack={handleSaveCustomPack}
            onPlayPackNow={handlePlayCustomPack}
            onCancel={() => setPhase('mode_select')}
          />
        )}

        {phase === 'game_over' && (
          <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center">
            <Trophy className="w-14 h-14 text-amber-400 animate-bounce mb-2" />
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-amber-300 mb-4">Final score</h2>
            <div className="w-full flex flex-col gap-2.5 mb-6 max-w-lg">
              {standings.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    idx === 0 ? 'bg-amber-950/60 border-amber-400 text-amber-200' : 'bg-slate-950/80 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="text-xs font-bold">
                    {idx + 1}. {p.isGhost ? '👻' : p.avatar} {p.name}
                  </span>
                  <span className="text-sm font-mono font-black text-amber-300">{scoreText(p.score)}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleStartMatch()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Rematch
              </button>
              <button
                onClick={() => setPhase('mode_select')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs uppercase tracking-wider"
              >
                Other boxes
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900 z-10">
        <span>Throwback Trivia · the room goes quiet for the boombox</span>
        <span>Commons photos · Internet Archive clips</span>
      </div>
    </div>
  );
};
