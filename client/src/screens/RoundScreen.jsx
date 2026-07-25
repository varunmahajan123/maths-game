import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoundEngine } from '../game/useRoundEngine';
import { ROUND_SECONDS } from '../game/scoring';
import TimerRing from '../components/TimerRing';
import Lives from '../components/Lives';
import RoundPills from '../components/RoundPills';
import StepSheet from '../components/StepSheet';
import DiagnosisSheet from '../components/DiagnosisSheet';
import VerdictOverlay from '../components/VerdictOverlay';
import RunOverScreen from './RunOverScreen';
import Latex from '../components/Latex';
import { copy } from '../copy';

const CATCH_ANIM_MS = 480; // circle 300ms + a beat before the diagnosis panel slides up
const MISS_ANIM_MS = 950; // circle + wobble + strike, then the verdict lands

export default function RoundScreen() {
  const navigate = useNavigate();
  const engine = useRoundEngine();
  const { state } = engine;
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const secondsRef = useRef(ROUND_SECONDS);

  // Ticking clock — only while the player is hunting
  useEffect(() => {
    if (state.phase !== 'playing') return;
    setSecondsLeft(ROUND_SECONDS);
    secondsRef.current = ROUND_SECONDS;
    const startedAt = Date.now();
    const id = setInterval(() => {
      const left = ROUND_SECONDS - (Date.now() - startedAt) / 1000;
      secondsRef.current = Math.max(0, left);
      setSecondsLeft(secondsRef.current);
      if (left <= 0) {
        clearInterval(id);
        engine.timeout();
      }
    }, 100);
    return () => clearInterval(id);
  }, [state.phase, state.roundNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation phase timing + haptic on the catch
  useEffect(() => {
    if (state.phase === 'catchAnim') {
      navigator.vibrate?.(20);
      const t = setTimeout(engine.catchAnimDone, CATCH_ANIM_MS);
      return () => clearTimeout(t);
    }
    if (state.phase === 'missAnim') {
      navigator.vibrate?.([30, 40, 30]);
      const t = setTimeout(engine.missAnimDone, MISS_ANIM_MS);
      return () => clearTimeout(t);
    }
  }, [state.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.phase === 'over') {
    return (
      <RunOverScreen
        score={state.score}
        bestStreak={state.bestStreak}
        fullCatches={state.fullCatches}
        roundsPlayed={state.roundsPlayed}
        onAgain={engine.restart}
        onHome={() => navigate('/')}
      />
    );
  }

  const verdictKind =
    state.phase === 'missAnim' || state.verdict === 'miss'
      ? 'miss'
      : state.caughtStepN != null
        ? 'caught'
        : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg">
      {/* Top bar: back + logo */}
      <header className="flex items-center justify-between px-4 pt-4">
        <button
          onClick={() => navigate('/')}
          aria-label="Back"
          className="card flex h-10 w-10 items-center justify-center text-lg text-fg active:scale-95"
        >
          ←
        </button>
        <p className="font-hand text-4xl font-bold italic text-brand">{copy.appName}</p>
        <span className="h-10 w-10" aria-hidden />
      </header>

      {/* Round label + circular timer */}
      <div className="mt-2 flex items-center justify-between px-4">
        <p className="text-sm font-extrabold tracking-widest text-fg">
          {copy.round.roundLabel(state.roundNumber)} <span className="text-brand">●</span>
        </p>
        <TimerRing
          secondsLeft={state.phase === 'playing' ? secondsLeft : state.secondsLeftAtCatch}
          totalSeconds={ROUND_SECONDS}
          label={copy.round.sec}
        />
      </div>

      {/* Round-progress pills */}
      <div className="mt-1 px-4">
        <RoundPills results={state.roundResults} />
      </div>

      {/* Lives pill */}
      <div className="mt-3 flex justify-center">
        <Lives lives={state.lives} />
      </div>

      {/* Problem statement */}
      <div className="card mx-4 mt-4 px-4 py-3">
        <div className="step-math text-center font-semibold [&_.katex]:!text-gold">
          <Latex tex={state.problem.problem_latex} />
        </div>
      </div>

      {/* The answer sheet */}
      <main className="flex-1 px-4 pb-10 pt-4">
        <StepSheet
          steps={state.problem.steps}
          tappedStepN={state.tappedStepN}
          verdictKind={verdictKind}
          onTapStep={(n) => engine.tapStep(n, secondsRef.current)}
          disabled={state.phase !== 'playing'}
        />
        {state.phase === 'playing' && (
          <p className="mt-6 text-center text-sm font-semibold text-muted">
            {copy.round.hint}
          </p>
        )}
      </main>

      <DiagnosisSheet
        open={state.phase === 'diagnosing'}
        stepN={state.caughtStepN ?? 0}
        options={state.diagnosisOrder}
        onPick={engine.pickDiagnosis}
      />

      <VerdictOverlay
        verdict={state.phase === 'verdict' ? state.verdict : null}
        problem={state.problem}
        roundScore={state.roundScore}
        isLastLife={state.lives <= 0}
        onNext={engine.next}
      />
    </div>
  );
}
