import React, { useState, useEffect } from 'react';
import { TriviaPlayer, TriviaQuestion } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { DoorOpen, Zap, Flame, Skull, Trophy, Sparkles, Check, X } from 'lucide-react';

interface FinalEscapeViewProps {
  players: TriviaPlayer[];
  onEscapeComplete: (winner: TriviaPlayer) => void;
}

const FINAL_RUN_QUESTIONS: { q: string; opts: string[]; correct: number }[] = [
  {
    q: 'Which of these is NOT a Nintendo console?',
    opts: ['Virtual Boy', 'GameCube', 'Saturn', 'Wii U'],
    correct: 2
  },
  {
    q: 'Which director directed "Jurassic Park" (1993)?',
    opts: ['Steven Spielberg', 'James Cameron', 'George Lucas', 'Ridley Scott'],
    correct: 0
  },
  {
    q: 'In Pac-Man, what is the red ghost\'s name?',
    opts: ['Blinky', 'Pinky', 'Inky', 'Clyde'],
    correct: 0
  },
  {
    q: 'What color pill does Neo take in The Matrix?',
    opts: ['Blue', 'Red', 'Green', 'Yellow'],
    correct: 1
  },
  {
    q: 'What is Mario\'s brother\'s name?',
    opts: ['Wario', 'Luigi', 'Toad', 'Waluigi'],
    correct: 1
  }
];

export const FinalEscapeView: React.FC<FinalEscapeViewProps> = ({
  players,
  onEscapeComplete
}) => {
  // Player hallway step positions (0 to 6 steps to escape the mansion)
  const [positions, setPositions] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    players.forEach(p => {
      // Living players get a headstart step
      map[p.id] = p.isGhost ? 0 : 2;
    });
    return map;
  });

  const [questionIdx, setQuestionIdx] = useState<number>(0);
  const [answered, setAnswered] = useState<boolean>(false);
  const [winner, setWinner] = useState<TriviaPlayer | null>(null);

  const currentQ = FINAL_RUN_QUESTIONS[questionIdx % FINAL_RUN_QUESTIONS.length];

  const handleAnswer = (choiceIdx: number) => {
    if (answered || winner) return;
    setAnswered(true);

    const isCorrect = choiceIdx === currentQ.correct;
    if (isCorrect) {
      sound.playTriviaCorrect();
    } else {
      sound.playTriviaWrong();
    }

    // Advance human player if correct
    setPositions(prev => {
      const updated = { ...prev };
      const human = players.find(p => !p.isBot);
      if (human && isCorrect) {
        updated[human.id] = Math.min(6, (updated[human.id] || 0) + 1);
      }

      // Simulate bot answers
      players.filter(p => p.isBot).forEach(bot => {
        const botRight = Math.random() < 0.65;
        if (botRight) {
          updated[bot.id] = Math.min(6, (updated[bot.id] || 0) + 1);
        }
      });

      // Check if any player crossed the finish door (Step 6)
      const escaperId = Object.keys(updated).find(id => updated[id] >= 6);
      if (escaperId) {
        const winningPlayer = players.find(p => p.id === escaperId);
        if (winningPlayer) {
          setWinner(winningPlayer);
          sound.playVictoryFanfare();
          setTimeout(() => onEscapeComplete(winningPlayer), 3500);
        }
      }

      return updated;
    });

    setTimeout(() => {
      setAnswered(false);
      setQuestionIdx(prev => prev + 1);
    }, 1800);
  };

  return (
    <div className="w-full max-w-3xl bg-gradient-to-b from-purple-950 via-slate-950 to-black border-2 border-purple-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center select-none text-white animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 bg-black/80 border border-purple-400/40 px-4 py-1.5 rounded-full mb-6">
        <Flame className="w-4 h-4 text-purple-400 animate-pulse" />
        <span className="text-xs sm:text-sm font-mono font-black text-purple-200 uppercase tracking-wider">
          THE FINAL ESCAPE • SPRINT FOR THE MANSION EXIT
        </span>
      </div>

      {/* Hallway Escape Track */}
      <div className="w-full bg-slate-900/90 border border-slate-700 rounded-2xl p-4 mb-6 relative overflow-hidden shadow-inner">
        <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>STARTING HALLWAY</span>
          <span className="flex items-center gap-1 text-amber-300 font-bold">
            <DoorOpen className="w-4 h-4" /> MANSION EXIT (DOORWAY)
          </span>
        </div>

        {/* Lanes for each player */}
        <div className="flex flex-col gap-3">
          {players.map(p => {
            const step = positions[p.id] || 0;
            const progressPercent = (step / 6) * 100;
            return (
              <div key={p.id} className="relative flex items-center">
                {/* Track Bar */}
                <div className="w-full h-8 bg-black/60 rounded-xl border border-slate-800 relative overflow-hidden flex items-center px-2">
                  {/* Grid Lines */}
                  {[0, 1, 2, 3, 4, 5, 6].map(s => (
                    <div
                      key={s}
                      className="absolute top-0 bottom-0 border-r border-slate-800/80"
                      style={{ left: `${(s / 6) * 100}%` }}
                    />
                  ))}

                  {/* Character Runner Token */}
                  <div
                    className="absolute top-1 bottom-1 transition-all duration-500 ease-out flex items-center gap-1 z-10"
                    style={{ left: `calc(${progressPercent}% - 14px)` }}
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${p.color} border-2 border-white shadow-lg flex items-center justify-center text-xs transform transition-transform ${
                        p.isGhost ? 'animate-pulse opacity-85' : 'hover:scale-110'
                      }`}
                    >
                      {p.isGhost ? '👻' : p.avatar}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white bg-black/80 px-1.5 rounded truncate max-w-[80px]">
                      {p.name}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rapid Fire Trivia Question Box */}
      {!winner ? (
        <div className="w-full max-w-xl bg-slate-900 border border-purple-500/40 rounded-2xl p-5 flex flex-col items-center text-center shadow-xl">
          <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-widest mb-1">
            RAPID SPRINT QUESTION #{questionIdx + 1}
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white mb-4">{currentQ.q}</h3>

          <div className="grid grid-cols-2 gap-2.5 w-full">
            {currentQ.opts.map((opt, idx) => {
              const isCorrect = idx === currentQ.correct;
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answered}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold font-sans border transition-all ${
                    answered
                      ? isCorrect
                        ? 'bg-emerald-600 border-white text-white shadow-lg'
                        : 'bg-slate-950 border-slate-800 text-slate-500 opacity-50'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-600 hover:border-amber-400 text-slate-200 hover:scale-105'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md bg-gradient-to-r from-amber-600 to-yellow-500 text-black rounded-2xl p-6 text-center shadow-2xl animate-bounce">
          <Trophy className="w-10 h-10 mx-auto mb-2 text-black" />
          <h2 className="text-xl font-black uppercase">ESCAPE SUCCESSFUL!</h2>
          <p className="text-xs font-bold mt-1">
            {winner.name} successfully reached the Mansion Doors and survived Trivia Murder Mystery!
          </p>
        </div>
      )}
    </div>
  );
};
