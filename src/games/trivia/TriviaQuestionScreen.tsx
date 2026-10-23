import React, { useState, useEffect, useRef } from 'react';
import { TriviaQuestion, TriviaPlayer } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { holdRoomForCue, releaseRoomCue } from '../../room/roomHold';
import { useTriviaOnTable } from '../../room/table/triviaTable';
import { ArchiveClip, FadePicture } from './CueMedia';
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
  const roomHeld = useRef(false);
  const timedOut = useRef(false);

  const releaseCue = () => {
    sound.stopChiptune();
    document.querySelectorAll('video[data-throwback-cue]').forEach(node => {
      if (node instanceof HTMLMediaElement) node.pause();
    });
    if (roomHeld.current) {
      releaseRoomCue();
      roomHeld.current = false;
    }
  };

  // Reset state when question changes. Sound and commercials hush the room first.
  useEffect(() => {
    setTimeLeft(timeLimit);
    setSelectedIdx(null);
    setStartTime(Date.now());
    setIsPlayingTune(false);
    timedOut.current = false;

    const needsRoom = Boolean(question.chiptuneId) || question.type === 'video_clip';
    if (!needsRoom) return;
    holdRoomForCue();
    roomHeld.current = true;
    if (question.chiptuneId) {
      sound.playChiptuneTrack(question.chiptuneId);
      setIsPlayingTune(true);
    }
    return () => releaseCue();
  }, [question.id]);

  useEffect(() => {
    if (showResults) releaseCue();
  }, [showResults]);

  // Main Clock countdown. The tick stays pure: dev mode runs state updaters
  // twice, and a timeout scheduled from inside one was skipping a round.
  useEffect(() => {
    if (showResults || selectedIdx !== null) return;
    const timer = window.setInterval(() => {
      setTimeLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [showResults, selectedIdx, question.id]);

  useEffect(() => {
    if (timeLeft > 0 || showResults || selectedIdx !== null || timedOut.current) return;
    timedOut.current = true;
    setSelectedIdx(-1);
    sound.playTriviaWrong();
    onAnswerSelected(-1, timeLimit * 1000);
  }, [timeLeft, showResults, selectedIdx, timeLimit, onAnswerSelected]);

  useEffect(() => {
    if (timeLeft <= 0 || timeLeft >= timeLimit || showResults || selectedIdx !== null) return;
    sound.playTriviaTick(timeLeft <= 5 ? 1.5 : 1);
  }, [timeLeft, timeLimit, showResults, selectedIdx]);

  const handleSelectOption = (idx: number) => {
    if (selectedIdx !== null || showResults) return;
    const timeTaken = Date.now() - startTime;
    setSelectedIdx(idx);
    sound.playButtonClick();
    onAnswerSelected(idx, timeTaken);
  };

  const handleReplayChiptune = () => {
    if (!question.chiptuneId) return;
    if (!roomHeld.current) {
      holdRoomForCue();
      roomHeld.current = true;
    }
    setIsPlayingTune(true);
    sound.playChiptuneTrack(question.chiptuneId);
    window.setTimeout(() => setIsPlayingTune(false), 4200);
  };

  const percentageLeft = (timeLeft / timeLimit) * 100;
  const onTable = useTriviaOnTable();
  const letters = ['A', 'B', 'C', 'D'];
  const colors = [
    'from-rose-600 to-rose-700 border-rose-400 hover:from-rose-500',
    'from-blue-600 to-blue-700 border-blue-400 hover:from-blue-500',
    'from-amber-600 to-amber-700 border-amber-400 hover:from-amber-500',
    'from-emerald-600 to-emerald-700 border-emerald-400 hover:from-emerald-500'
  ];

  const optionClass = (idx: number) => {
    const isSelected = selectedIdx === idx;
    const isCorrect = idx === question.correctIndex;
    if (showResults) {
      if (isCorrect) return 'bg-gradient-to-r from-emerald-600 to-teal-600 border-white text-white shadow-[0_0_16px_#10b981]';
      if (isSelected) return 'bg-gradient-to-r from-rose-900 to-rose-950 border-rose-500 text-rose-300 opacity-70';
      return 'bg-black/40 border-white/10 text-white/35';
    }
    if (isSelected) return 'bg-gradient-to-r from-purple-600 to-indigo-600 border-white text-white';
    return `bg-gradient-to-r ${colors[idx % colors.length]} text-white shadow-md hover:brightness-110 active:scale-[0.98]`;
  };

  if (onTable) {
    const hasPicture = Boolean(question.photo && question.type === 'picture_fade');
    const hasClip = question.type === 'video_clip' && Boolean(question.video) && !showResults;
    const hasStill = Boolean(question.photo && question.type !== 'picture_fade');
    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-1.5 p-1.5 select-none">
        <div className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-amber-100">
          <span className="shrink-0">Round {roundNumber}/{totalRounds}</span>
          {(question.chiptuneId || question.type === 'video_clip') && !showResults && (
            <span className="shrink-0 text-amber-200/80">Quiet</span>
          )}
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/50">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                timeLeft <= 4 ? 'bg-rose-500' : timeLeft <= 8 ? 'bg-amber-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${percentageLeft}%` }}
            />
          </div>
          <span className="shrink-0 tabular-nums">{timeLeft}s</span>
          {question.chiptuneId && (
            <button
              type="button"
              onClick={handleReplayChiptune}
              className="shrink-0 rounded-full bg-cyan-950 px-2 py-0.5 text-[10px] font-black text-cyan-200"
            >
              {isPlayingTune ? 'Playing' : 'Replay'}
            </button>
          )}
          <span className="shrink-0 text-amber-300">{question.points}</span>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-amber-200/25 bg-black">
          {hasPicture && question.photo && (
            <FadePicture
              src={question.photo.src}
              alt={question.photo.alt}
              credit={question.photo.credit}
              seconds={question.fadeSeconds ?? 10}
              revealed={showResults || selectedIdx !== null}
              fill
            />
          )}
          {hasClip && question.video && (
            <ArchiveClip archiveId={question.video.archiveId} title={question.video.title} fill />
          )}
          {hasStill && question.photo && (
            <img src={question.photo.src} alt={question.photo.alt} className="absolute inset-0 h-full w-full object-cover" />
          )}
          {!hasPicture && !hasClip && !hasStill && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                {question.type === 'sound_guess' ? '8-bit on the boombox' : 'Throwback'}
              </p>
              {question.chiptuneId && (
                <button
                  type="button"
                  onClick={handleReplayChiptune}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider ${
                    isPlayingTune ? 'bg-cyan-400 text-black' : 'bg-cyan-950 text-cyan-200 border border-cyan-400/50'
                  }`}
                >
                  <Volume2 className="mr-1 inline h-4 w-4" />
                  {isPlayingTune ? 'Playing' : 'Replay the cue'}
                </button>
              )}
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-2 pt-8">
            <h2 className="line-clamp-2 text-center text-sm font-black leading-tight text-white sm:text-base">
              {question.question}
            </h2>
            {showResults && (
              <p className="mt-1 line-clamp-2 text-center text-[11px] text-emerald-100">{question.explanation}</p>
            )}
          </div>
        </div>

        <div className="grid min-h-[4.75rem] grid-cols-2 grid-rows-2 gap-1.5" style={{ flex: '0 1 32%' }}>
          {question.options.map((option, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              disabled={selectedIdx !== null || showResults}
              className={`flex h-full min-h-0 items-center gap-2 rounded-xl border-2 px-2 text-left ${optionClass(idx)}`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-black/30 text-xs font-black">
                {letters[idx]}
              </span>
              <span className="line-clamp-2 text-[11px] font-bold leading-tight sm:text-xs">{option}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

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
          {question.type === 'picture_fade'
            ? '📷 GUESS THE PICTURE'
            : question.type === 'video_clip'
            ? '📺 GUESS THE CLIP'
            : question.type === 'quote'
            ? '🎬 FINISH THE QUOTE'
            : question.type === 'sound_guess'
            ? '🎵 8-BIT ON THE BOOMBOX'
            : question.type === 'system_guess'
            ? '🕹️ THE CARTRIDGE YEARS'
            : question.category === 'heart'
            ? '💛 SOMETHING YOU KEPT'
            : question.category === 'style'
            ? '👟 THE CLOSET'
            : question.category === 'laugh'
            ? '😂 WE ALL KNEW'
            : '💡 THROWBACK'}
        </div>

        {(question.chiptuneId || question.type === 'video_clip') && !showResults && (
          <div className="mb-3 w-full max-w-lg rounded-2xl border border-amber-400/40 bg-amber-950/50 px-3 py-2 text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
              TV, radio, and the bedroom tape are paused
            </p>
            <p className="text-[11px] text-amber-50/80">
              {question.chiptuneId
                ? 'The boombox has the room. This 8-bit cue is ours.'
                : 'The commercial from the Internet Archive has the room.'}
            </p>
          </div>
        )}

        {question.photo && question.type === 'picture_fade' && (
          <div className="mb-4 w-full max-w-lg">
            <FadePicture
              src={question.photo.src}
              alt={question.photo.alt}
              credit={question.photo.credit}
              seconds={question.fadeSeconds ?? 10}
              revealed={showResults || selectedIdx !== null}
            />
          </div>
        )}

        {question.type === 'video_clip' && question.video && !showResults && (
          <div className="mb-4 w-full max-w-lg">
            <ArchiveClip archiveId={question.video.archiveId} title={question.video.title} />
          </div>
        )}

        {question.photo && question.type !== 'picture_fade' && (
          <div className="mb-4 w-full max-w-lg overflow-hidden rounded-2xl border border-white/15">
            <img src={question.photo.src} alt={question.photo.alt} className="h-36 w-full object-cover" />
            <p className="bg-black/40 px-2 py-1 text-[9px] text-white/55">{question.photo.credit}</p>
          </div>
        )}

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
