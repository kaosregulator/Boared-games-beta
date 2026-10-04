import React, { useState, useEffect, useRef } from 'react';
import { KillingFloorState, TriviaPlayer } from '../../types/trivia';
import { sound } from '../../utils/audio';
import { Skull, AlertTriangle, ShieldCheck, Zap, Scissors, Timer, Lock, RefreshCw } from 'lucide-react';

interface KillingFloorViewProps {
  killingFloor: KillingFloorState;
  targetPlayer: TriviaPlayer;
  onSurvivalResult: (survived: boolean) => void;
}

export const KillingFloorView: React.FC<KillingFloorViewProps> = ({
  killingFloor,
  targetPlayer,
  onSurvivalResult
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(killingFloor.timeRemaining || 10);
  const [hasActed, setHasActed] = useState<boolean>(false);
  const [survived, setSurvived] = useState<boolean | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');

  // 1. Chalice Roulette State
  const [chalices, setChalices] = useState<{ id: number; poisoned: boolean; picked?: boolean }[]>([
    { id: 1, poisoned: false },
    { id: 2, poisoned: true },
    { id: 3, poisoned: true },
    { id: 4, poisoned: true }
  ]);

  // 2. Wire Cut State
  const [wires] = useState<string[]>(['red', 'blue', 'green', 'yellow']);
  const [safeWireIdx] = useState<number>(() => Math.floor(Math.random() * 4));
  const [cutWire, setCutWire] = useState<number | null>(null);

  // 3. Guillotine Reaction Tap State
  const [bladePos, setBladePos] = useState<number>(0);
  const [bladeMoving, setBladeMoving] = useState<boolean>(true);
  const bladeDirRef = useRef<number>(1);

  // 4. Panic Math Bomb State
  const [mathProblem] = useState(() => {
    const a = Math.floor(Math.random() * 12) + 8;
    const b = Math.floor(Math.random() * 9) + 4;
    const ans = a * b;
    const options = [ans, ans + 6, ans - 8, ans + 12].sort(() => Math.random() - 0.5);
    return { q: `${a} × ${b} = ?`, ans, options };
  });

  // 5. Memory Lock State
  const [memorySequence] = useState<number[]>(() => [1, 3, 2, 4]);
  const [enteredSequence, setEnteredSequence] = useState<number[]>([]);
  const [showSequence, setShowSequence] = useState<boolean>(true);

  // Initial sound on mount
  useEffect(() => {
    sound.playSpookyDrone();
    if (killingFloor.type === 'chalice_roulette') {
      const safeIdx = Math.floor(Math.random() * 4);
      setChalices([0, 1, 2, 3].map(i => ({ id: i + 1, poisoned: i !== safeIdx })));
    }
  }, [killingFloor.type]);

  // Countdown Timer
  useEffect(() => {
    if (hasActed) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeOutDeath();
          return 0;
        }
        sound.playTriviaTick(1.4);
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasActed]);

  // Guillotine Blade Oscillator loop
  useEffect(() => {
    if (killingFloor.type !== 'guillotine_reaction' || !bladeMoving || hasActed) return;
    const interval = setInterval(() => {
      setBladePos(prev => {
        let next = prev + bladeDirRef.current * 3.5;
        if (next >= 100) {
          next = 100;
          bladeDirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          bladeDirRef.current = 1;
        }
        return next;
      });
    }, 20);
    return () => clearInterval(interval);
  }, [killingFloor.type, bladeMoving, hasActed]);

  // Memory code preview timer
  useEffect(() => {
    if (killingFloor.type === 'memory_code') {
      const t = setTimeout(() => {
        setShowSequence(false);
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [killingFloor.type]);

  // Actions
  const handleTimeOutDeath = () => {
    setHasActed(true);
    setSurvived(false);
    sound.playGuillotineBlade();
    sound.playDefeat();
    setFeedbackMessage('TIME EXPIRED! You failed to escape the trap!');
    setTimeout(() => onSurvivalResult(false), 2400);
  };

  const handlePickChalice = (index: number) => {
    if (hasActed) return;
    setHasActed(true);
    const chosen = chalices[index];
    const isSafe = !chosen.poisoned;

    setChalices(prev =>
      prev.map((c, idx) => (idx === index ? { ...c, picked: true } : c))
    );

    if (isSafe) {
      sound.playTriviaCorrect();
      setSurvived(true);
      setFeedbackMessage('PURE WATER! You survived the poison goblet!');
      setTimeout(() => onSurvivalResult(true), 2200);
    } else {
      sound.playDefeat();
      setSurvived(false);
      setFeedbackMessage('DEADLY CYANIDE POISON! You succumbed to the trap!');
      setTimeout(() => onSurvivalResult(false), 2200);
    }
  };

  const handleCutWire = (index: number) => {
    if (hasActed) return;
    setHasActed(true);
    setCutWire(index);

    if (index === safeWireIdx) {
      sound.playWireSnip();
      sound.playTriviaCorrect();
      setSurvived(true);
      setFeedbackMessage('BOMB DEFUSED! You snipped the safe wire with 0.1s to spare!');
      setTimeout(() => onSurvivalResult(true), 2200);
    } else {
      sound.playExplosionHit();
      sound.playDefeat();
      setSurvived(false);
      setFeedbackMessage('BOOOOOM! That was the detonation wire!');
      setTimeout(() => onSurvivalResult(false), 2200);
    }
  };

  const handleStopGuillotine = () => {
    if (hasActed) return;
    setBladeMoving(false);
    setHasActed(true);

    // Green zone is between 40% and 60%
    const isSafe = bladePos >= 38 && bladePos <= 62;
    if (isSafe) {
      sound.playTriviaCorrect();
      setSurvived(true);
      setFeedbackMessage('PERFECT REFLEXES! The blade jammed in the safety slot!');
      setTimeout(() => onSurvivalResult(true), 2200);
    } else {
      sound.playGuillotineBlade();
      sound.playDefeat();
      setSurvived(false);
      setFeedbackMessage('OFF WITH YOUR HEAD! The blade cleaved through!');
      setTimeout(() => onSurvivalResult(false), 2200);
    }
  };

  const handleSelectMathAnswer = (val: number) => {
    if (hasActed) return;
    setHasActed(true);

    if (val === mathProblem.ans) {
      sound.playTriviaCorrect();
      setSurvived(true);
      setFeedbackMessage('MATH GENIUS! The lock disengaged safely!');
      setTimeout(() => onSurvivalResult(true), 2200);
    } else {
      sound.playDefeat();
      setSurvived(false);
      setFeedbackMessage(`INCORRECT CALCULATION! ${mathProblem.q} = ${mathProblem.ans}!`);
      setTimeout(() => onSurvivalResult(false), 2200);
    }
  };

  const handleMemoryPress = (digit: number) => {
    if (hasActed || showSequence) return;
    const next = [...enteredSequence, digit];
    setEnteredSequence(next);
    sound.playButtonClick();

    if (next[next.length - 1] !== memorySequence[next.length - 1]) {
      setHasActed(true);
      sound.playDefeat();
      setSurvived(false);
      setFeedbackMessage('WRONG SEQUENCE! The electrical trap triggered!');
      setTimeout(() => onSurvivalResult(false), 2200);
      return;
    }

    if (next.length === memorySequence.length) {
      setHasActed(true);
      sound.playTriviaCorrect();
      setSurvived(true);
      setFeedbackMessage('CODE ACCEPTED! Safe vault unlocked!');
      setTimeout(() => onSurvivalResult(true), 2200);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-gradient-to-b from-rose-950 via-slate-950 to-black border-4 border-rose-600/70 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center select-none text-white relative overflow-hidden animate-in zoom-in duration-300">
      {/* Spooky Red Fog Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-600/20 via-transparent to-transparent pointer-events-none" />

      {/* Header Banner */}
      <div className="flex items-center gap-3 bg-black/80 border border-rose-500/50 px-5 py-2 rounded-full mb-4 shadow-lg">
        <Skull className="w-5 h-5 text-rose-500 animate-bounce" />
        <span className="text-sm sm:text-base font-mono font-black text-rose-300 uppercase tracking-widest">
          THE KILLING FLOOR • SURVIVAL TRAP
        </span>
      </div>

      {/* Target Player Tag */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-full ${targetPlayer.color} flex items-center justify-center text-sm shadow`}>
          {targetPlayer.avatar}
        </div>
        <span className="text-xs font-bold text-slate-300">
          Targeted Subject: <strong className="text-white">{targetPlayer.name}</strong>
        </span>
      </div>

      {/* Timer Display */}
      <div className="flex items-center gap-2 text-xs font-mono font-bold mb-6 bg-slate-900/90 px-4 py-1.5 rounded-full border border-rose-500/40">
        <Timer className="w-4 h-4 text-amber-400 animate-spin" />
        <span className={`${timeLeft <= 3 ? 'text-rose-400 animate-ping' : 'text-slate-300'}`}>
          TIME REMAINING: {timeLeft}s
        </span>
      </div>

      {/* Mini-Game Scenario 1: Chalice Roulette */}
      {killingFloor.type === 'chalice_roulette' && (
        <div className="w-full flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 max-w-md">
            Three of these silver goblets contain deadly cyanide poison. Only ONE holds pure mountain water. Choose wisely!
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full mb-4">
            {chalices.map((c, idx) => (
              <button
                key={c.id}
                onClick={() => handlePickChalice(idx)}
                disabled={hasActed}
                className={`h-28 rounded-2xl border-2 flex flex-col items-center justify-center p-3 transition-all ${
                  c.picked
                    ? c.poisoned
                      ? 'bg-rose-950 border-rose-500 text-rose-400'
                      : 'bg-emerald-950 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 hover:scale-105'
                }`}
              >
                <span className="text-4xl mb-1">{c.picked ? (c.poisoned ? '💀' : '💧') : '🏆'}</span>
                <span className="text-xs font-bold font-mono">Goblet #{c.id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini-Game Scenario 2: Wire Cut Bomb Defusal */}
      {killingFloor.type === 'wire_cut' && (
        <div className="w-full flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 max-w-md">
            The dynamite timer is ticking! Snip the single correct disarm wire to defuse the explosion!
          </p>

          <div className="flex flex-col gap-3 w-full max-w-sm mb-4">
            {wires.map((wire, idx) => (
              <button
                key={wire}
                onClick={() => handleCutWire(idx)}
                disabled={hasActed}
                className={`py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-xs border flex items-center justify-between transition-all ${
                  cutWire === idx
                    ? idx === safeWireIdx
                      ? 'bg-emerald-700 border-white text-white'
                      : 'bg-rose-900 border-rose-400 text-white'
                    : wire === 'red'
                    ? 'bg-rose-600 hover:bg-rose-500 border-rose-400 text-white'
                    : wire === 'blue'
                    ? 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white'
                    : wire === 'green'
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-400 border-yellow-300 text-black'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Scissors className="w-4 h-4" /> Snip {wire.toUpperCase()} Wire
                </span>
                <span className="font-mono text-[10px]">Wire #{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini-Game Scenario 3: Guillotine Reaction Tap */}
      {killingFloor.type === 'guillotine_reaction' && (
        <div className="w-full flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-300 text-center mb-6 max-w-md">
            The guillotine blade is swinging! Tap the STOP BUTTON when the needle hits the SAFE GREEN ZONE!
          </p>

          {/* Guillotine Gauge Track */}
          <div className="w-full max-w-md h-12 bg-slate-900 border-2 border-slate-700 rounded-2xl relative overflow-hidden mb-6 flex items-center">
            {/* Danger Zones */}
            <div className="absolute inset-y-0 left-0 w-[38%] bg-rose-950/60 border-r border-rose-700/50" />
            <div className="absolute inset-y-0 right-0 w-[38%] bg-rose-950/60 border-l border-rose-700/50" />

            {/* Safe Green Center Zone */}
            <div className="absolute inset-y-0 left-[38%] right-[38%] bg-emerald-600/40 border-x-2 border-emerald-400 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-300">
              SAFE ZONE
            </div>

            {/* Moving Blade Needle */}
            <div
              className="absolute top-0 bottom-0 w-3 bg-white shadow-[0_0_12px_#ffffff] transform -translate-x-1/2 z-10 transition-none"
              style={{ left: `${bladePos}%` }}
            />
          </div>

          <button
            onClick={handleStopGuillotine}
            disabled={hasActed}
            className="w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-sm uppercase tracking-widest shadow-xl transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <Zap className="w-5 h-5 text-yellow-300" />
            SLAM BLADE BRAKE!
          </button>
        </div>
      )}

      {/* Mini-Game Scenario 4: Panic Math Bomb */}
      {killingFloor.type === 'math_bomb' && (
        <div className="w-full flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-300 text-center mb-4 max-w-md">
            Solve the arithmetic equation to override the electronic lock!
          </p>

          <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 bg-slate-900 px-6 py-3 rounded-2xl border border-slate-700 mb-6 shadow-inner">
            {mathProblem.q}
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
            {mathProblem.options.map(opt => (
              <button
                key={opt}
                onClick={() => handleSelectMathAnswer(opt)}
                disabled={hasActed}
                className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-amber-400 font-mono font-bold text-lg text-white transition-all hover:scale-105"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mini-Game Scenario 5: Memory Code Keypad */}
      {killingFloor.type === 'memory_code' && (
        <div className="w-full flex flex-col items-center">
          <p className="text-xs sm:text-sm text-slate-300 text-center mb-4 max-w-md">
            {showSequence ? 'MEMORIZE THE 4-DIGIT VAULT CODE!' : 'REPEAT THE CODE SEQUENCE!'}
          </p>

          {showSequence ? (
            <div className="flex gap-3 mb-6 animate-pulse">
              {memorySequence.map((num, i) => (
                <div
                  key={i}
                  className="w-12 h-14 bg-amber-500 border-2 border-white rounded-xl flex items-center justify-center font-mono font-black text-2xl text-black shadow-lg"
                >
                  {num}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center w-full max-w-xs mb-4">
              <div className="flex gap-2 mb-4 h-10 items-center">
                {enteredSequence.map((digit, i) => (
                  <span
                    key={i}
                    className="w-8 h-8 rounded-lg bg-emerald-600 border border-emerald-400 flex items-center justify-center font-mono font-bold text-sm text-white"
                  >
                    {digit}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 w-full">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => handleMemoryPress(num)}
                    disabled={hasActed}
                    className="py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-purple-400 font-mono font-black text-lg text-purple-300 transition-all hover:scale-105"
                  >
                    Button {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Alert Modal Overlay */}
      {feedbackMessage && (
        <div
          className={`mt-4 px-5 py-2.5 rounded-2xl text-xs font-bold font-sans text-center border shadow-xl animate-in zoom-in duration-200 ${
            survived
              ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
              : 'bg-rose-950/90 border-rose-500 text-rose-300'
          }`}
        >
          {feedbackMessage}
        </div>
      )}
    </div>
  );
};
