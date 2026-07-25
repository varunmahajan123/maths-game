import { useEffect, useMemo, useRef, useState } from 'react';
import TimerRing from './TimerRing';
import RoundPills from './RoundPills';
import StepSheet from './StepSheet';
import DiagnosisSheet from './DiagnosisSheet';
import VerdictOverlay from './VerdictOverlay';
import Latex from './Latex';
import { copy } from '../copy';
import { ROUND_SECONDS } from '../game/scoring';

const CATCH_ANIM_MS = 480;
const MISS_ANIM_MS = 950;

// One server-judged round: same catch → diagnose → verdict loop as Streak,
// but the server holds the answers and does the judging (anti-cheat).
// Props:
//   problem        stripped problem {problem_latex, steps:[{n,latex}], diagnosis_options}
//   headerLabel    e.g. "ROUND 2"
//   results        past-round results for the pills (may be [])
//   submitCatch({step,time_ms,timeout}) → {caught, result?}
//   submitDiagnosis(diagnosis) → {result}
//   onDone(result) called when the player taps the verdict button
//   doneLabel      verdict button label override (optional)
export default function ServerRound({
  problem,
  headerLabel,
  results = [],
  submitCatch,
  submitDiagnosis,
  onDone,
  doneLabel,
}) {
  const [phase, setPhase] = useState('playing'); // playing|missAnim|catchAnim|diagnosing|verdict
  const [tappedStepN, setTappedStepN] = useState(null);
  const [result, setResult] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  // Shuffled per round so the right answer isn't positionally learnable.
  const optionOrder = useMemo(
    () => [...problem.diagnosis_options].sort(() => Math.random() - 0.5),
    [problem.id] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const secondsRef = useRef(ROUND_SECONDS);
  const timeMsRef = useRef(0);
  const phaseRef = useRef('playing');
  phaseRef.current = phase;

  // Reset per problem
  useEffect(() => {
    setPhase('playing');
    setTappedStepN(null);
    setResult(null);
    setSecondsLeft(ROUND_SECONDS);
    secondsRef.current = ROUND_SECONDS;
  }, [problem.id]);

  // Clock
  useEffect(() => {
    if (phase !== 'playing') return;
    const startedAt = Date.now();
    const id = setInterval(async () => {
      const left = ROUND_SECONDS - (Date.now() - startedAt) / 1000;
      secondsRef.current = Math.max(0, left);
      setSecondsLeft(secondsRef.current);
      if (left <= 0) {
        clearInterval(id);
        timeMsRef.current = ROUND_SECONDS * 1000;
        try {
          const resp = await submitCatch({ timeout: true, time_ms: ROUND_SECONDS * 1000 });
          setResult(resp.result);
          setPhase('verdict');
        } catch {
          setPhase('verdict'); // offline mid-round: verdict shows nothing worse than a retry
        }
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase, problem.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function tapStep(n) {
    if (phaseRef.current !== 'playing') return;
    const time_ms = Math.round((ROUND_SECONDS - secondsRef.current) * 1000);
    timeMsRef.current = time_ms;
    setTappedStepN(n);
    setPhase('checking');
    try {
      const resp = await submitCatch({ step: n, time_ms });
      if (resp.caught) {
        navigator.vibrate?.(20);
        setPhase('catchAnim');
        setTimeout(() => setPhase('diagnosing'), CATCH_ANIM_MS);
      } else {
        navigator.vibrate?.([30, 40, 30]);
        setResult(resp.result);
        setPhase('missAnim');
        setTimeout(() => setPhase('verdict'), MISS_ANIM_MS);
      }
    } catch {
      setTappedStepN(null);
      setPhase('playing'); // network hiccup: let them tap again
    }
  }

  async function pickDiagnosis(diagnosis) {
    if (phaseRef.current !== 'diagnosing') return;
    setPhase('submitting');
    try {
      const resp = await submitDiagnosis(diagnosis);
      setResult(resp.result);
      setPhase('verdict');
    } catch {
      setPhase('diagnosing');
    }
  }

  const verdictKind =
    phase === 'missAnim' || result?.verdict === 'miss' || result?.verdict === 'timeout'
      ? tappedStepN != null
        ? 'miss'
        : null
      : tappedStepN != null
        ? 'caught'
        : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg">
      <header className="flex items-center justify-center px-4 pt-4">
        <p className="font-hand text-4xl font-bold italic text-brand">{copy.appName}</p>
      </header>

      <div className="mt-2 flex items-center justify-between px-4">
        <p className="text-sm font-extrabold tracking-widest text-fg">
          {headerLabel} <span className="text-brand">●</span>
        </p>
        <TimerRing
          secondsLeft={phase === 'playing' ? secondsLeft : ROUND_SECONDS - timeMsRef.current / 1000}
          totalSeconds={ROUND_SECONDS}
          label={copy.round.sec}
        />
      </div>

      <div className="mt-1 px-4">
        <RoundPills results={results} />
      </div>

      <div className="card mx-4 mt-4 px-4 py-3">
        <div className="step-math text-center font-semibold [&_.katex]:!text-gold">
          <Latex tex={problem.problem_latex} />
        </div>
      </div>

      <main className="flex-1 px-4 pb-10 pt-4">
        <StepSheet
          steps={problem.steps}
          tappedStepN={tappedStepN}
          verdictKind={verdictKind}
          onTapStep={tapStep}
          disabled={phase !== 'playing'}
        />
        {phase === 'playing' && (
          <p className="mt-6 text-center text-sm font-semibold text-muted">{copy.round.hint}</p>
        )}
      </main>

      <DiagnosisSheet
        open={phase === 'diagnosing' || phase === 'submitting'}
        stepN={tappedStepN ?? 0}
        options={optionOrder}
        onPick={pickDiagnosis}
      />

      {phase === 'verdict' && result && (
        <VerdictOverlay
          verdict={result.verdict}
          problem={{
            steps: [{ ...result.errorStep, correct: false }],
            correct_diagnosis: result.correct_diagnosis,
          }}
          roundScore={result.roundScore}
          isLastLife={false}
          onNext={() => onDone(result)}
          nextLabel={doneLabel}
        />
      )}
    </div>
  );
}
