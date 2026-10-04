import React, { useState, useEffect } from 'react';
import { TriviaQuestion, TriviaPlayer } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { Timer, Zap, Volume2, Sparkles, HelpCircle, Flame, CheckCircle, XCircle } from 'lucide-react';

interface TriviaQuestionScreenProps {
  question: TriviaQuestion;
  roundNumber: number;
  totalRounds: number;
  players: TriviaPlayer[];
  activePlayer: TriviaPlayer;
  onAnswerSelected: (optionIndex: number, timeMs: number) => void;
  showResults: boolean;
}

export const TriviaQuestionScreen: React.FC<TriviaQuestionScreenProps> = ({
  question,
  roundNumber,
  totalRounds,
  players,
  activePlayer,
  onAnswerSelected,
  showResults
}) => {
  const timeLimit = question.timeLimitSeconds || 15;
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isPlayingTune, setIsPlayingTune] = useState<boolean>(false);

  // Reset state when question changes
  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelectedIdx(null);
    setStartTime(Date.now());
    setIsPlayingTune(false);

    // Auto play chiptune sound clip if question has one
    if (question.chiptuneId) {
      sound.playChiptuneTrack(question.chiptuneId);
      setIsPlayingTune(true);
      setTimeout(() => setIsPlayingTune(false), 2600);
    }
  }, [question.id]);

  // Main Clock countdown
  useEffect(() => {
    if (showResults || selectedIdx !== null) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOut();
          return 0;
        }
        // Accelerate tick frequency in final 5 seconds
        if (prev <= 5) {
          sound.playTriviaTick(1.5);
        } else {
          sound.playTriviaTick(1.0);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [showResults, selectedIdx]);

  const handleTimeOut = () => {
    if (selectedIdx === null && !showResults) {
      setSelectedIdx(-1);
      sound.playTriviaWrong();
      onAnswerSelected(-1, (timeLimit) * 1000);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (selectedIdx !== null || showResults) return;
    const timeTaken = Date.now() - startTime;
    setSelectedIdx(idx);
    sound.playButtonClick();
    onAnswerSelected(idx, timeTaken);
  };

  const handleReplayChiptune = () => {
    if (question.chiptuneId) {
      setIsPlayingTune(true);
      sound.playChiptuneTrack(question.chiptuneId);
      setTimeout(() => setIsPlayingTune(false), 2500);
    }
  };

  const percentageLeft = (timeLeft / timeLimit) * 100;

  return (
    <div className="w-full max-w-3xl flex flex-col items-center select-none animate-in fade-in zoom-in duration-300">
      {/* Top Round Bar & Timer Bar */}
      <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-300 mb-2 px-1">
        <span className="bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          ROUND {roundNumber} OF {totalRounds} • {question.category.replace('_', ' ').toUpperCase()}
        </span>

        <span className="bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700 flex items-center gap-1.5 text-amber-300">
          <Zap className="w-3.5 h-3.5" />
          {question.points} PTS
        </span>
      </div>

      {/* Tension Clock Countdown Bar */}
      <div className="w-full h-3 bg-slate-900 border border-slate-700/80 rounded-full overflow-hidden mb-5 shadow-inner">
        <div
          className={`h-full transition-all duration-1000 ease-linear rounded-full ${
            timeLeft <= 4
              ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
              : timeLeft <= 8
              ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
              : 'bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500'
          }`}
          style={{ width: `${percentageLeft}%` }}
        />
      </div>

      {/* Main Question Card */}
      <div className="w-full bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative mb-6 flex flex-col items-center text-center">
        {/* Category Pill */}
        <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-indigo-950/90 text-indigo-300 border border-indigo-500/50 px-4 py-1 rounded-full mb-3 shadow">
          {question.type === 'quote'
            ? '🎬 FINISH THE QUOTE'
            : question.type === 'actor_star'
            ? '⭐ THIS ACTOR STARRED IN...'
            : question.type === 'system_guess'
            ? '🕹️ GAME SYSTEM SPEC'
            : question.type === 'sound_guess'
            ? '🎵 8-BIT AUDIO SYNTH'
            : '💡 TRIVIA QUESTION'}
        </div>

        {/* Media Clue / Quote Box if available */}
        {question.mediaClue && (
          <div className="bg-slate-950/80 border border-slate-700/70 rounded-2xl p-3 mb-4 w-full max-w-lg flex items-center justify-center gap-3">
            {question.chiptuneId ? (
              <button
                onClick={handleReplayChiptune}
                className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all ${
                  isPlayingTune
                    ? 'bg-cyan-500 text-black animate-pulse'
                    : 'bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50'
                }`}
              >
                <Volume2 className="w-4 h-4" /> {isPlayingTune ? 'Playing Melody...' : 'Replay 8-Bit Melody'}
              </button>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-sm font-bold text-amber-300">{question.mediaClue.content}</span>
                {question.mediaClue.subtext && (
                  <span className="text-[10px] text-slate-400 font-mono">{question.mediaClue.subtext}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Question Text */}
        <h2 className="text-base sm:text-xl md:text-2xl font-black text-white leading-relaxed font-sans max-w-2xl">
          {question.question}
        </h2>
      </div>

      {/* Answer Choices Grid (Jackbox 4-Box Layout) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mb-6">
        {question.options.map((option, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === question.correctIndex;
          const colors = [
            'from-rose-600 to-rose-700 border-rose-400 hover:from-rose-500',
            'from-blue-600 to-blue-700 border-blue-400 hover:from-blue-500',
            'from-amber-600 to-amber-700 border-amber-400 hover:from-amber-500',
            'from-emerald-600 to-emerald-700 border-emerald-400 hover:from-emerald-500'
          ];
          const letters = ['A', 'B', 'C', 'D'];

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={selectedIdx !== null || showResults}
              className={`relative min-h-[4.5rem] rounded-2xl p-4 border-2 flex items-center justify-between text-left transition-all duration-200 transform ${
                showResults
                  ? isCorrect
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-white text-white scale-[1.02] shadow-[0_0_20px_#10b981] z-10'
                    : isSelected
                    ? 'bg-gradient-to-r from-rose-900 to-rose-950 border-rose-500 text-rose-300 opacity-60'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 opacity-40'
                  : isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-white text-white scale-[1.02] shadow-xl'
                  : `bg-gradient-to-r ${colors[idx % colors.length]} text-white shadow-lg hover:scale-[1.02] active:scale-95`
              }`}
            >
              <div className="flex items-center gap-3 pr-2">
                <span className="w-8 h-8 rounded-xl bg-black/30 border border-white/20 flex items-center justify-center font-mono font-black text-sm text-white shrink-0">
                  {letters[idx]}
                </span>
                <span className="font-bold text-xs sm:text-sm leading-snug">{option}</span>
              </div>

              {/* Status Icons */}
              {showResults && (
                <div className="shrink-0 ml-2">
                  {isCorrect ? (
                    <CheckCircle className="w-6 h-6 text-white animate-bounce" />
                  ) : isSelected ? (
                    <XCircle className="w-6 h-6 text-rose-400" />
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation & Host Reveal Card on Results */}
      {showResults && (
        <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl p-4 text-center shadow-xl animate-in slide-in-from-bottom duration-300">
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> Correct Answer Revealed:
          </div>
          <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl mx-auto">
            {question.explanation}
          </p>
        </div>
      )}

      {/* Active Players Live Buzzer Status Strip */}
      <div className="w-full flex flex-wrap items-center justify-center gap-2.5 mt-4">
        {players.map(p => {
          const hasAnswered = p.selectedAnswer !== null;
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
                p.isGhost
                  ? 'bg-purple-950/80 border-purple-500/50 text-purple-300 opacity-75'
                  : hasAnswered
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${p.color} flex items-center justify-center text-[10px]`}>
                {p.isGhost ? '👻' : p.avatar}
              </div>
              <span>{p.name}</span>
              <span className="font-mono text-amber-300">({p.score}p)</span>
              {hasAnswered && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
