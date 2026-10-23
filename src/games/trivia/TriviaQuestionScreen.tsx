import React, { useState, useEffect, useRef } from 'react';
import { TriviaQuestion, TriviaPlayer } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { holdRoomForCue, releaseRoomCue } from '../../room/roomHold';
import { useTriviaOnTable } from '../../room/table/triviaTable';
import { ArchiveClip, ArchiveSound, FadePicture } from './CueMedia';
import { tuneLength } from '../../utils/chiptunes';
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
    document.querySelectorAll('video[data-throwback-cue], audio[data-throwback-cue]').forEach(node => {
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

    const needsRoom = Boolean(question.chiptuneId) || question.type === 'video_clip' || question.type === 'audio_clip';
    if (!needsRoom) return;
    holdRoomForCue();
    roomHeld.current = true;
    let stopGlow = 0;
    if (question.chiptuneId) {
      sound.playChiptuneTrack(question.chiptuneId);
      setIsPlayingTune(true);
      stopGlow = window.setTimeout(() => setIsPlayingTune(false), tuneLength(question.chiptuneId) * 1000 + 200);
    }
    return () => {
      window.clearTimeout(stopGlow);
      releaseCue();
    };
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
    window.setTimeout(() => setIsPlayingTune(false), tuneLength(question.chiptuneId) * 1000 + 200);
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
    const answered = showResults || selectedIdx !== null;
    const hasPicture = Boolean(question.photo && question.type === 'picture_fade');
    const hasClip = question.type === 'video_clip' && Boolean(question.video);
    const hasSound = question.type === 'audio_clip' && Boolean(question.audio);
    const hasTune = Boolean(question.chiptuneId) && !hasPicture;
    const hasStill = Boolean(question.photo && !hasPicture && !hasClip);
    const hasQuote = question.mediaClue?.type === 'quote_speaker';
    const hasProp = hasPicture || hasClip || hasSound || hasTune || hasStill || hasQuote;
    const timerTone = timeLeft <= 4 ? '#e5484d' : timeLeft <= 8 ? '#f2c14e' : '#5fd3a2';
    const human = players.find(p => !p.isBot);
    const humanRight = showResults && selectedIdx === question.correctIndex;

    const prop = (
      <div className="tt-pop flex h-full min-h-0 w-full items-center justify-center" style={{ animationDelay: '60ms' }}>
        {hasClip && question.video && (
          <div className="tt-tv h-full w-full max-w-full">
            <div className="tt-tv-glass">
              {!showResults ? (
                <ArchiveClip
                  archiveId={question.video.archiveId}
                  title={question.video.title}
                  file={question.video.file}
                  start={question.video.start}
                  end={question.video.end}
                  fill
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[repeating-linear-gradient(0deg,#111_0_2px,#1c1c1c_2px_4px)] px-3 text-center text-[11px] font-bold uppercase tracking-widest text-white/60">
                  {question.video.title}
                </div>
              )}
            </div>
          </div>
        )}
        {hasPicture && question.photo && (
          <div className="tt-polaroid flex flex-col" style={{ height: '100%', maxWidth: '100%', aspectRatio: '0.92' }}>
            <div className="min-h-0 flex-1">
              <FadePicture
                src={question.photo.src}
                alt={question.photo.alt}
                credit={question.photo.credit}
                seconds={question.fadeSeconds ?? 10}
                revealed={answered}
                fill
              />
            </div>
            <p className="tt-marker mt-1 truncate text-center text-[11px] text-[#2a1d12]">
              {answered ? question.options[question.correctIndex] : 'what is it??'}
            </p>
          </div>
        )}
        {hasStill && question.photo && (
          <div className="tt-polaroid flex flex-col" style={{ height: '100%', maxWidth: '100%', aspectRatio: '0.92' }}>
            <img src={question.photo.src} alt={question.photo.alt} className="min-h-0 w-full flex-1 object-cover" />
            <p className="mt-1 truncate text-center text-[8px] text-[#2a1d12]/60">{question.photo.credit}</p>
          </div>
        )}
        {hasSound && question.audio && (
          <ArchiveSound
            archiveId={question.audio.archiveId}
            title={question.audio.title}
            credit={question.audio.credit}
            file={question.audio.file}
            start={question.audio.start}
            end={question.audio.end}
              stopped={showResults}
          />
        )}
        {hasTune && !hasClip && !hasSound && (
          <div className="tt-boombox">
            <div className="tt-boombox-speaker" data-on={isPlayingTune || undefined} />
            <div className="flex flex-col items-center gap-1.5">
              <div className="tt-cassette">
                <span className="tt-cassette-label">{question.mediaClue?.content ?? 'MIX TAPE · SIDE A'}</span>
                <span className="tt-reel" data-on={isPlayingTune || undefined} />
                <span className="tt-reel" data-on={isPlayingTune || undefined} />
              </div>
              <button type="button" onClick={handleReplayChiptune} className="tt-key">
                {isPlayingTune ? '▶ Playing' : '▶ Play it again'}
              </button>
              {question.mediaClue?.subtext && (
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#1d1a14]/70">{question.mediaClue.subtext}</p>
              )}
            </div>
            <div className="tt-boombox-speaker" data-on={isPlayingTune || undefined} />
          </div>
        )}
        {hasQuote && !hasTune && !hasClip && !hasSound && !hasPicture && !hasStill && question.mediaClue && (
          <div className="tt-card flex max-w-[92%] -rotate-2 flex-col items-center gap-1 px-5 py-4 text-center">
            <span className="text-3xl leading-none">🎬</span>
            <p className="tt-marker text-base leading-tight">{question.mediaClue.content}</p>
            {question.mediaClue.subtext && <p className="tt-type text-[11px] opacity-70">{question.mediaClue.subtext}</p>}
          </div>
        )}
      </div>
    );

    return (
      <div className="flex h-full min-h-0 w-full flex-col gap-2 p-2.5 select-none">
        {/* Round, egg-timer, points */}
        <div className="tt-s flex shrink-0 items-center gap-2 font-black uppercase tracking-[0.18em] text-[#f1e3bf]">
          <span className="shrink-0 rounded bg-[#f1e3bf] px-1.5 py-0.5 text-[#1a2d52]">
            {roundNumber}/{totalRounds}
          </span>
          <span className="hidden shrink-0 truncate sm:inline">{categoryLabel(question)}</span>
          <div className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-[#f1e3bf]/30">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${percentageLeft}%`, background: timerTone }}
            />
          </div>
          <span className="w-7 shrink-0 text-right tabular-nums">{timeLeft}s</span>
          <span className="shrink-0 text-[#f2c14e]">{question.points} pts</span>
        </div>

        <div className={`grid min-h-0 flex-1 gap-2.5 ${hasProp ? 'grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]' : 'grid-cols-1'}`}>
          {hasProp && <div className="min-h-0">{prop}</div>}

          <div className="flex min-h-0 flex-col gap-2">
            {/* The question card */}
            <div className="tt-paper tt-pop relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden py-2 pl-8 pr-3">
              <h2 className="tt-type tt-q">{question.question}</h2>
              {showResults && (
                <p className="tt-marker tt-n mt-2 line-clamp-4 text-[#1f5b3a]">
                  {question.explanation}
                </p>
              )}
              {showResults && (
                <span
                  className={`tt-stamp tt-h absolute right-2 top-1 ${humanRight ? 'text-[#1f7a4a]' : 'text-[#c0392b]'}`}
                >
                  {humanRight ? 'Got it!' : selectedIdx === -1 ? "Time's up" : 'Nope'}
                </span>
              )}
            </div>

            {/* Four answer cards */}
            <div className="grid shrink-0 grid-cols-2 gap-1.5" style={{ minHeight: '42%' }}>
              {question.options.map((option, idx) => {
                const isCorrect = idx === question.correctIndex;
                const isPicked = selectedIdx === idx;
                const state = showResults ? (isCorrect ? 'right' : isPicked ? 'wrong' : 'dim') : isPicked ? 'picked' : 'open';
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectOption(idx)}
                    disabled={answered}
                    data-state={state}
                    className={`tt-card tt-pop flex min-h-0 items-center gap-2 px-2.5 py-1.5 text-left ${state === 'right' ? 'tt-flip' : ''}`}
                    style={{ animationDelay: `${140 + idx * 70}ms` }}
                  >
                    <span
                      className="flex h-[1.9em] w-[1.9em] shrink-0 items-center justify-center rounded-full tt-a font-black text-white shadow"
                      style={{ background: CARD_INKS[idx % CARD_INKS.length] }}
                    >
                      {letters[idx]}
                    </span>
                    <span className="tt-a line-clamp-3 font-bold">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Score pad along your edge of the table */}
        <div className="flex shrink-0 items-center gap-1.5 overflow-hidden">
          {players.map(p => {
            const done = p.selectedAnswer !== null;
            const right = showResults && p.isAnswerCorrect;
            return (
              <div
                key={p.id}
                className={`tt-s flex min-w-0 items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                  p.id === human?.id ? 'bg-[#f1e3bf] text-[#1a2d52]' : 'bg-black/35 text-[#f1e3bf]'
                } ${showResults ? (right ? 'ring-2 ring-[#5fd3a2]' : 'ring-2 ring-[#e5484d]/70') : ''}`}
              >
                <span>{p.isGhost ? '👻' : p.avatar}</span>
                <span className="truncate">{p.name}</span>
                <span className="tabular-nums opacity-80">{p.score}</span>
                {!showResults && done && <span className="h-1.5 w-1.5 rounded-full bg-[#5fd3a2]" />}
              </div>
            );
          })}
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
            <ArchiveClip
              archiveId={question.video.archiveId}
              title={question.video.title}
              file={question.video.file}
              start={question.video.start}
              end={question.video.end}
            />
          </div>
        )}

        {question.type === 'audio_clip' && question.audio && (
          <div className="mb-4 w-full max-w-lg">
            <ArchiveSound
              archiveId={question.audio.archiveId}
              title={question.audio.title}
              credit={question.audio.credit}
              file={question.audio.file}
              start={question.audio.start}
              end={question.audio.end}
              stopped={showResults}
            />
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

      {/* Four answer choices */}
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

/** Answer-card dots, like the wedges on a board-game spinner. */
const CARD_INKS = ['#c0392b', '#2457c5', '#d4890b', '#1f7a4a'];

function categoryLabel(q: TriviaQuestion) {
  if (q.category === 'heard_it') return 'Heard it growing up';
  if (q.category === 'real_sound') return 'Off the hook';
  if (q.category === 'commercials' || q.type === 'video_clip') return 'Commercial break';
  if (q.type === 'picture_fade') return 'Polaroid fade';
  if (q.type === 'sound_guess') return '8-bit boombox';
  if (q.type === 'quote') return 'Rewind the tape';
  if (q.category === 'murder_mystery') return 'After the streetlights';
  if (q.category === 'video_games' || q.category === 'game_systems') return 'Cartridge years';
  if (q.category === 'heart') return 'Something you kept';
  return 'Throwback';
}
