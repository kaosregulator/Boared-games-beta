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
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Sparkles,
  Play,
  RotateCcw,
  Film,
  Gamepad2,
  Skull,
  Music,
  Wand2,
  Users,
  Bot,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Award,
  Crown,
  Volume2
} from 'lucide-react';

interface TriviaPartyGameProps {
  onGameOver?: (winnerName: string, isRealMatch: boolean) => void;
  onExitToShelf?: () => void;
}

export const TriviaPartyGame: React.FC<TriviaPartyGameProps> = ({
  onGameOver,
  onExitToShelf
}) => {
  // Game Flow Phases
  const [phase, setPhase] = useState<
    'unboxing' | 'mode_select' | 'lobby' | 'question' | 'killing_floor' | 'final_escape' | 'creator' | 'game_over'
  >('mode_select');

  // Selected Mode & Host
  const [selectedMode, setSelectedMode] = useState<TriviaSubMode>('party_mix');
  const [matchFormat, setMatchFormat] = useState<MatchFormat>('solo_vs_ai');
  const [activeHost, setActiveHost] = useState<HostCharacter>(TRIVIA_HOSTS[0]);
  const [hostQuip, setHostQuip] = useState<string>(TRIVIA_HOSTS[0].defaultGreeting);
  const [isHostSpeaking, setIsHostSpeaking] = useState<boolean>(true);

  // Question Queue & Progression
  const [questionDeck, setQuestionDeck] = useState<TriviaQuestion[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [showQuestionResults, setShowQuestionResults] = useState<boolean>(false);

  // Players State
  const [players, setPlayers] = useState<TriviaPlayer[]>([]);

  // Killing Floor State (Murder Mystery)
  const [killingFloor, setKillingFloor] = useState<KillingFloorState | null>(null);

  // Custom Packs State
  const [customPacks, setCustomPacks] = useState<CustomTriviaPack[]>(PRESET_CUSTOM_PACKS);

  // Host dialogue timer helper
  const triggerHostQuip = (quip: string, durationMs: number = 4000) => {
    setHostQuip(quip);
    setIsHostSpeaking(true);
    sound.playHostStinger();
    setTimeout(() => {
      setIsHostSpeaking(false);
    }, durationMs);
  };

  // Switch Host based on sub-mode
  useEffect(() => {
    if (selectedMode === 'murder_mystery') {
      const mortimer = TRIVIA_HOSTS.find(h => h.id === 'mortimer') || TRIVIA_HOSTS[1];
      setActiveHost(mortimer);
      triggerHostQuip(mortimer.defaultGreeting);
    } else if (selectedMode === 'gaming_vault' || selectedMode === 'name_that_tune') {
      const pixel8 = TRIVIA_HOSTS.find(h => h.id === 'pixel8') || TRIVIA_HOSTS[2];
      setActiveHost(pixel8);
      triggerHostQuip(pixel8.defaultGreeting);
    } else if (selectedMode === 'cinephile') {
      const scarlett = TRIVIA_HOSTS.find(h => h.id === 'scarlett') || TRIVIA_HOSTS[3];
      setActiveHost(scarlett);
      triggerHostQuip(scarlett.defaultGreeting);
    } else {
      const buzz = TRIVIA_HOSTS[0];
      setActiveHost(buzz);
      triggerHostQuip(buzz.defaultGreeting);
    }
  }, [selectedMode]);

  // Start Match & Build Question Deck
  const handleStartMatch = (customPack?: CustomTriviaPack) => {
    sound.playShelfSlide();

    // 1. Prepare Question Deck
    let deck: TriviaQuestion[] = [];
    if (customPack) {
      deck = [...customPack.questions];
    } else if (selectedMode === 'cinephile') {
      deck = TRIVIA_QUESTIONS.filter(q => q.category === 'movies' || q.category === 'movie_quotes' || q.category === 'actors');
    } else if (selectedMode === 'gaming_vault') {
      deck = TRIVIA_QUESTIONS.filter(q => q.category === 'video_games' || q.category === 'game_systems');
    } else if (selectedMode === 'name_that_tune') {
      deck = TRIVIA_QUESTIONS.filter(q => q.category === 'chiptune_sound');
    } else if (selectedMode === 'murder_mystery') {
      deck = TRIVIA_QUESTIONS.filter(q => q.category === 'murder_mystery' || q.type === 'quote' || q.category === 'movies');
    } else {
      // Party Mix (All categories shuffled)
      deck = [...TRIVIA_QUESTIONS].sort(() => Math.random() - 0.5);
    }

    if (deck.length === 0) {
      deck = [...TRIVIA_QUESTIONS];
    }

    setQuestionDeck(deck.slice(0, 6)); // 6 dynamic rounds per party match
    setCurrentQIndex(0);
    setShowQuestionResults(false);

    // 2. Prepare Players
    const humanPlayer: TriviaPlayer = {
      id: 'human_1',
      name: 'You (Player 1)',
      avatar: '👑',
      color: 'bg-indigo-600',
      isBot: false,
      score: 0,
      lives: 3,
      isGhost: false,
      streak: 0,
      team: matchFormat === 'team_vs_ai' ? 'Alpha' : null,
      selectedAnswer: null,
      answerTimeMs: null,
      isAnswerCorrect: null
    };

    let roster: TriviaPlayer[] = [humanPlayer];

    if (matchFormat === 'solo_vs_ai') {
      roster.push(
        { ...MOCK_TRIVIA_AI_BOTS[0], score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null },
        { ...MOCK_TRIVIA_AI_BOTS[1], score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null },
        { ...MOCK_TRIVIA_AI_BOTS[2], score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null }
      );
    } else if (matchFormat === 'team_vs_ai') {
      // Co-op Duo: Human + TriviaBot 9000 (Team Alpha) vs Popcorn Pete + Pixel Pete (Team Omega)
      const botTeammate = { ...MOCK_TRIVIA_AI_BOTS[2], name: 'TriviaBot (Your Partner)', team: 'Alpha' as const, score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null };
      const botRival1 = { ...MOCK_TRIVIA_AI_BOTS[0], team: 'Omega' as const, score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null };
      const botRival2 = { ...MOCK_TRIVIA_AI_BOTS[1], team: 'Omega' as const, score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null };
      roster = [humanPlayer, botTeammate, botRival1, botRival2];
    } else if (matchFormat === 'pass_and_play') {
      roster = [
        humanPlayer,
        {
          id: 'player_2',
          name: 'Player 2 (Couch)',
          avatar: '🎮',
          color: 'bg-rose-600',
          isBot: false,
          score: 0,
          lives: 3,
          isGhost: false,
          streak: 0,
          selectedAnswer: null,
          answerTimeMs: null,
          isAnswerCorrect: null
        }
      ];
    } else {
      // Ranked Arena Free-For-All
      roster.push(
        { ...MOCK_TRIVIA_AI_BOTS[0], score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null },
        { ...MOCK_TRIVIA_AI_BOTS[1], score: 0, lives: 3, isGhost: false, streak: 0, selectedAnswer: null, answerTimeMs: null, isAnswerCorrect: null }
      );
    }

    setPlayers(roster);
    setPhase('question');
    triggerHostQuip(`ROUND 1 BEGINS! Question on screen now! Watch that timer!`);
  };

  // Handling Player Answer
  const handleAnswerSelected = (chosenIndex: number, timeMs: number) => {
    const currentQ = questionDeck[currentQIndex];
    const isCorrect = chosenIndex === currentQ.correctIndex;

    // Simulate bot answers with distinct personality accuracies and reaction speeds
    const updatedPlayers = players.map(p => {
      if (!p.isBot) {
        const pointsEarned = isCorrect ? currentQ.points + Math.max(0, 15000 - timeMs) / 20 : 0;
        const newStreak = isCorrect ? p.streak + 1 : 0;
        return {
          ...p,
          selectedAnswer: chosenIndex,
          answerTimeMs: timeMs,
          isAnswerCorrect: isCorrect,
          score: p.score + Math.round(pointsEarned),
          streak: newStreak
        };
      } else {
        // AI Bot Answer simulation
        const accuracy = p.botAccuracy || 0.75;
        const botCorrect = Math.random() < accuracy;
        const botAns = botCorrect
          ? currentQ.correctIndex
          : (currentQ.correctIndex + 1) % currentQ.options.length;
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
      }
    });

    setPlayers(updatedPlayers);
    setShowQuestionResults(true);

    if (isCorrect) {
      sound.playTriviaCorrect();
      triggerHostQuip(`THAT'S CORRECT! ${currentQ.explanation}`);
    } else {
      sound.playTriviaWrong();
      triggerHostQuip(`OOF, WRONG! The correct answer was ${currentQ.options[currentQ.correctIndex]}!`);
    }

    // Advance to next round or Killing Floor
    setTimeout(() => {
      handleAdvanceRound(updatedPlayers);
    }, 4000);
  };

  const handleAdvanceRound = (currentRoster: TriviaPlayer[]) => {
    // If in Murder Mystery mode and someone failed or had lowest score, trigger Killing Floor
    if (selectedMode === 'murder_mystery' && currentQIndex < questionDeck.length - 1) {
      const livingPlayers = currentRoster.filter(p => !p.isGhost);
      const wrongPlayers = livingPlayers.filter(p => !p.isAnswerCorrect);
      const target = wrongPlayers.length > 0
        ? wrongPlayers[Math.floor(Math.random() * wrongPlayers.length)]
        : livingPlayers.sort((a, b) => a.score - b.score)[0];

      if (target) {
        const trapTypes: KillingFloorState['type'][] = [
          'chalice_roulette',
          'wire_cut',
          'guillotine_reaction',
          'math_bomb',
          'memory_code'
        ];
        const randomTrap = trapTypes[Math.floor(Math.random() * trapTypes.length)];

        setKillingFloor({
          type: randomTrap,
          title: 'Survival Floor Trap',
          description: 'Survive the trap or become a lingering Ghost!',
          targetPlayerId: target.id,
          timeRemaining: 10,
          isResolved: false,
          survived: null
        });

        setPhase('killing_floor');
        triggerHostQuip(
          `HALT! ${target.name} has stumbled into Lord Mortimer's Killing Floor! Survive or join the ghosts!`
        );
        return;
      }
    }

    // Check if we hit final round in Murder Mystery -> Final Escape
    if (selectedMode === 'murder_mystery' && currentQIndex >= questionDeck.length - 1) {
      setPhase('final_escape');
      triggerHostQuip(`THE FINAL ESCAPE! Sprint down the mansion hallway to freedom!`);
      return;
    }

    // Standard progression
    if (currentQIndex < questionDeck.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setShowQuestionResults(false);
      setPlayers(prev =>
        prev.map(p => ({
          ...p,
          selectedAnswer: null,
          answerTimeMs: null,
          isAnswerCorrect: null
        }))
      );
      setPhase('question');
      triggerHostQuip(`Next question on the board! Keep your eyes on the buzzer!`);
    } else {
      // Game Over
      handleMatchComplete(currentRoster);
    }
  };

  const handleSurvivalResult = (survived: boolean) => {
    if (!killingFloor) return;
    const targetId = killingFloor.targetPlayerId;

    setPlayers(prev =>
      prev.map(p => {
        if (p.id === targetId) {
          if (!survived) {
            return { ...p, isGhost: true, lives: Math.max(0, p.lives - 1) };
          }
        }
        return p;
      })
    );

    // Return to questions
    setTimeout(() => {
      setKillingFloor(null);
      if (currentQIndex < questionDeck.length - 1) {
        setCurrentQIndex(prev => prev + 1);
        setShowQuestionResults(false);
        setPlayers(prev =>
          prev.map(p => ({
            ...p,
            selectedAnswer: null,
            answerTimeMs: null,
            isAnswerCorrect: null
          }))
        );
        setPhase('question');
        triggerHostQuip(`Back to the trivia stage! The tension is electric!`);
      } else {
        setPhase('final_escape');
      }
    }, 1200);
  };

  const handleMatchComplete = (roster: TriviaPlayer[]) => {
    setPhase('game_over');
    sound.playVictoryFanfare();
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });

    const sorted = [...roster].sort((a, b) => b.score - a.score);
    const winner = sorted[0];
    const isRealMatch = matchFormat === 'pass_and_play' || matchFormat === 'ranked_arena';

    triggerHostQuip(
      `CONGRATULATIONS TO OUR CHAMPION, ${winner.name} with ${winner.score} POINTS! What a legendary show!`,
      6000
    );

    if (onGameOver) {
      onGameOver(winner.name, isRealMatch);
    }
  };

  const handleSaveCustomPack = (pack: CustomTriviaPack) => {
    setCustomPacks(prev => [pack, ...prev]);
    sound.playTriviaCorrect();
  };

  const handlePlayCustomPack = (pack: CustomTriviaPack) => {
    setSelectedMode('custom_pack');
    handleStartMatch(pack);
  };

  return (
    <div className="w-full min-h-[620px] bg-slate-950 text-white rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-between relative overflow-hidden select-none border border-slate-800 shadow-2xl">
      {/* Background Ambience / Stage Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950/40 via-slate-950 to-black pointer-events-none" />

      {/* Top Navigation & Host Strip */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPhase('mode_select')}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-300 hover:text-white transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Modes
          </button>

          {/* Mode Badge */}
          <span className="bg-indigo-950/90 text-indigo-300 border border-indigo-500/40 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow">
            <Sparkles className="w-3 h-3 text-amber-400" />
            {selectedMode.replace('_', ' ')}
          </span>

          {/* Real Match vs Bot Practice Tag */}
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              matchFormat === 'solo_vs_ai'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
            }`}
          >
            {matchFormat === 'solo_vs_ai'
              ? '🤖 AI PRACTICE TIER'
              : matchFormat === 'team_vs_ai'
              ? '🤝 CO-OP TEAM MATCH'
              : '🏆 RANKED PVP ARENA'}
          </span>
        </div>

        {/* Theatrical Host Pod */}
        <AnimatedHost host={activeHost} quipText={hostQuip} isSpeaking={isHostSpeaking} compact={phase === 'question' || phase === 'killing_floor'} />
      </div>

      {/* Main Content Area based on Game Phase */}
      <div className="w-full flex-1 flex flex-col items-center justify-center z-10 my-2">
        {/* Phase 1: Mode Select Menu */}
        {phase === 'mode_select' && (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-purple-400 flex items-center justify-center gap-2">
                <Crown className="w-7 h-7 text-amber-400" />
                TRIVIA PARTY ROYALE & MURDER MYSTERY
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
                Jackbox-style theatrical game show trivia pack with animated hosts, movie quotes, video games, murder mystery traps, and custom pack builder!
              </p>
            </div>

            {/* Sub-Mode Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full mb-6">
              {/* Mode 1: Party Mix */}
              <button
                onClick={() => {
                  setSelectedMode('party_mix');
                  setPhase('lobby');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-indigo-950/80 to-slate-950 border-2 border-indigo-500/40 hover:border-amber-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    🎙️
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition">
                    Party Mix Showdown
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Ultimate rapid-fire variety pack! Mixes movies, quotes, actors, gaming consoles, and lore.
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider">
                  Host: Buzz Sparkler <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mode 2: Hollywood Cinephile */}
              <button
                onClick={() => {
                  setSelectedMode('cinephile');
                  setPhase('lobby');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-rose-950/80 to-slate-950 border-2 border-rose-500/40 hover:border-amber-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-400 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    🎬
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition">
                    Hollywood Cinephile
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    "Finish the Movie Quote", "This Actor Starred In...", 3-clue film guessing, and Oscar trivia!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-rose-300 flex items-center gap-1 uppercase tracking-wider">
                  Host: Director Scarlett <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mode 3: Video Game Vault */}
              <button
                onClick={() => {
                  setSelectedMode('gaming_vault');
                  setPhase('lobby');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-cyan-950/80 to-slate-950 border-2 border-cyan-500/40 hover:border-amber-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-cyan-600/30 border border-cyan-400 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    🕹️
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition">
                    Video Game Vault
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    NES vs PS2 specs, Guess the Game, iconic bosses, speedruns, controllers, and Easter eggs!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-1 uppercase tracking-wider">
                  Host: Pixel-8 Hologram <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mode 4: Trivia Murder Mystery */}
              <button
                onClick={() => {
                  setSelectedMode('murder_mystery');
                  setPhase('lobby');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-purple-950/90 to-black border-2 border-rose-600/60 hover:border-rose-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    💀
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-rose-300 transition flex items-center gap-1.5">
                    Trivia Murder Mystery
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Jackbox Trivia Murder Party style! Wrong answers lead to The Killing Floor traps, ghost forms, and Final Escape!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wider">
                  Host: Lord Mortimer <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mode 5: Name That 8-Bit Tune */}
              <button
                onClick={() => {
                  setSelectedMode('name_that_tune');
                  setPhase('lobby');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-emerald-950/80 to-slate-950 border-2 border-emerald-500/40 hover:border-amber-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600/30 border border-emerald-400 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    🎵
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition">
                    Name That 8-Bit Melody
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Procedural retro chiptune audio synthesizer! Listen to 8-bit theme songs and buzzer-guess first!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-emerald-300 flex items-center gap-1 uppercase tracking-wider">
                  Live Chiptune Audio Synth <ArrowRight className="w-3 h-3" />
                </div>
              </button>

              {/* Mode 6: Custom Pack Creator */}
              <button
                onClick={() => {
                  setPhase('creator');
                  sound.playButtonClick();
                }}
                className="bg-gradient-to-b from-purple-950/80 to-indigo-950 border-2 border-purple-500/40 hover:border-amber-400 rounded-3xl p-5 text-left flex flex-col justify-between shadow-xl transition-transform hover:scale-[1.03] group"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-purple-600/30 border border-purple-400 flex items-center justify-center text-2xl mb-3 group-hover:rotate-6 transition-transform">
                    🛠️
                  </div>
                  <h3 className="font-black text-base text-white group-hover:text-amber-300 transition flex items-center gap-1.5">
                    Make Your Own Pack
                    <span className="text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                      AI GENERATOR
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Create custom quizzes or use Google AI to build instant packs for any movie, franchise, or anime topic!
                  </p>
                </div>
                <div className="mt-4 text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1 uppercase tracking-wider">
                  Open Pack Builder <ArrowRight className="w-3 h-3" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Match Setup Lobby */}
        {phase === 'lobby' && (
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center animate-in zoom-in duration-200">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              MATCH SETUP • {selectedMode.replace('_', ' ').toUpperCase()}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              Choose your match format. Real player matches track on season leaderboards, while AI matches let you train with custom bot personalities!
            </p>

            {/* Match Format Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
              <button
                onClick={() => {
                  setMatchFormat('solo_vs_ai');
                  sound.playButtonClick();
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  matchFormat === 'solo_vs_ai'
                    ? 'bg-amber-950/60 border-amber-400 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Bot className="w-6 h-6 text-amber-400 mb-2" />
                <div className="font-bold text-xs uppercase">Solo vs AI Bots</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Practice lobby with 3 distinct AI bot rivals.</div>
              </button>

              <button
                onClick={() => {
                  setMatchFormat('team_vs_ai');
                  sound.playButtonClick();
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  matchFormat === 'team_vs_ai'
                    ? 'bg-indigo-950/60 border-indigo-400 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Users className="w-6 h-6 text-indigo-400 mb-2" />
                <div className="font-bold text-xs uppercase">Team Co-op vs AI</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Play as Human + AI Partner vs rival Bot Team.</div>
              </button>

              <button
                onClick={() => {
                  setMatchFormat('pass_and_play');
                  sound.playButtonClick();
                }}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  matchFormat === 'pass_and_play'
                    ? 'bg-emerald-950/60 border-emerald-400 text-white shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <Trophy className="w-6 h-6 text-emerald-400 mb-2" />
                <div className="font-bold text-xs uppercase">Ranked Real Match</div>
                <div className="text-[10px] text-slate-400 mt-0.5">2-Player Pass-and-Play ranked competition.</div>
              </button>
            </div>

            {/* Start Button */}
            <button
              onClick={() => handleStartMatch()}
              className="w-full max-w-sm py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-purple-600 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-black text-sm uppercase tracking-widest shadow-2xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 text-white" />
              START TRIVIA PARTY MATCH
            </button>
          </div>
        )}

        {/* Phase 3: Active Question View */}
        {phase === 'question' && questionDeck.length > 0 && (
          <TriviaQuestionScreen
            question={questionDeck[currentQIndex]}
            roundNumber={currentQIndex + 1}
            totalRounds={questionDeck.length}
            players={players}
            activePlayer={players.find(p => !p.isBot) || players[0]}
            onAnswerSelected={handleAnswerSelected}
            showResults={showQuestionResults}
          />
        )}

        {/* Phase 4: Killing Floor View (Murder Mystery) */}
        {phase === 'killing_floor' && killingFloor && (
          <KillingFloorView
            killingFloor={killingFloor}
            targetPlayer={players.find(p => p.id === killingFloor.targetPlayerId) || players[0]}
            onSurvivalResult={handleSurvivalResult}
          />
        )}

        {/* Phase 5: Final Escape View (Murder Mystery Climax) */}
        {phase === 'final_escape' && (
          <FinalEscapeView
            players={players}
            onEscapeComplete={winner => handleMatchComplete(players)}
          />
        )}

        {/* Phase 6: Custom Pack Builder & AI Generator */}
        {phase === 'creator' && (
          <CustomPackCreator
            onSavePack={handleSaveCustomPack}
            onPlayPackNow={handlePlayCustomPack}
            onCancel={() => setPhase('mode_select')}
          />
        )}

        {/* Phase 7: Game Over / Victory Podium */}
        {phase === 'game_over' && (
          <div className="w-full max-w-2xl bg-slate-900/95 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center animate-in zoom-in duration-300">
            <Trophy className="w-14 h-14 text-amber-400 animate-bounce mb-2" />
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400 mb-1">
              TRIVIA MATCH COMPLETED!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-6">
              Final Season Leaderboard Scores & Podium Standings
            </p>

            {/* Scoreboard List */}
            <div className="w-full flex flex-col gap-2.5 mb-6 max-w-lg">
              {[...players]
                .sort((a, b) => b.score - a.score)
                .map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border ${
                      idx === 0
                        ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 font-mono font-black text-sm">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </span>
                      <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-sm shadow`}>
                        {p.isGhost ? '👻' : p.avatar}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {p.name}
                          {p.isBot && (
                            <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                              AI BOT
                            </span>
                          )}
                          {p.isGhost && (
                            <span className="text-[9px] bg-purple-900/80 text-purple-300 px-1.5 py-0.5 rounded font-mono">
                              GHOST
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Streak: {p.streak} • Lives: {p.lives}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-mono font-black text-amber-300">
                        {p.score.toLocaleString()} PTS
                      </span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Rematch / Back to Modes */}
            <div className="flex gap-3">
              <button
                onClick={() => handleStartMatch()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition transform hover:scale-105"
              >
                Play Rematch
              </button>
              <button
                onClick={() => setPhase('mode_select')}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Mode Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Game Tip */}
      <div className="w-full flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-900 z-10">
        <span>Jackbox Party Trivia Pack • Procedural Sound Synthesis</span>
        <span>Made with Google AI Gemini • 100% Anti-Cheat Ranked Tiers</span>
      </div>
    </div>
  );
};
