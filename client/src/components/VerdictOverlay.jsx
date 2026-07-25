import { motion } from 'framer-motion';
import Latex from './Latex';
import { copy } from '../copy';

const STAMPS = {
  full: { text: copy.verdict.fullStamp, sub: copy.verdict.fullSub, color: 'text-good' },
  partial: { text: copy.verdict.partialStamp, sub: copy.verdict.partialSub, color: 'text-gold' },
  miss: { text: copy.verdict.missStamp, sub: copy.verdict.missSub, color: 'text-brand' },
  timeout: { text: copy.verdict.timeoutStamp, sub: copy.verdict.timeoutSub, color: 'text-brand' },
};

function Row({ label, value, valueClass = 'text-fg' }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={`font-semibold tabular-nums ${valueClass}`}>{value}</span>
    </div>
  );
}

// Full-screen verdict: handwritten headline, sahi-step + explanation cards,
// itemized score breakdown, gold Next Round button.
export default function VerdictOverlay({ verdict, problem, roundScore, isLastLife, onNext, nextLabel }) {
  const errStep = problem.steps.find((s) => !s.correct);
  const stamp = verdict ? STAMPS[verdict] : null;
  const b = copy.verdict.breakdown;
  const caught = verdict === 'full' || verdict === 'partial';

  // No exit animation on purpose: the next round must be tappable the instant
  // "Next Round" is pressed — a lingering overlay would eat catches.
  if (!stamp) return null;

  return (
    <motion.div
      className="fixed inset-0 z-40 mx-auto max-w-[430px] overflow-y-auto bg-bg px-4 pt-10 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      <div className="text-center">
        <motion.p
          className={`font-hand text-6xl font-bold ${stamp.color}`}
          initial={{ scale: 2, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 16 }}
        >
          {stamp.text}
        </motion.p>
        <p className="mt-1 text-sm text-muted">{stamp.sub}</p>
        <p className={`mt-2 text-lg font-extrabold ${caught ? 'text-gold' : 'text-brand'}`}>
          {copy.verdict.points(roundScore.total)}
        </p>
      </div>

      {/* Which step was the galti */}
      <div className="card mt-5 flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-bold text-fg">{copy.verdict.sahiStep}</p>
          <p className="text-xs text-muted">{copy.verdict.stepN(errStep.n)}</p>
        </div>
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
            caught ? 'bg-good/20 text-good' : 'bg-brand/20 text-brand'
          }`}
        >
          {caught ? '✓' : '✗'}
        </span>
      </div>

      {/* The learning moment */}
      <div className="card mt-3 px-4 py-3.5">
        <p className="text-sm font-bold text-fg">{copy.verdict.sahiJawab}</p>
        <p className="mt-1.5 text-sm font-bold text-brand">
          {copy.diagnosisLabels[problem.correct_diagnosis].label}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-fg/85">{errStep.explanation}</p>
        <div className="step-math mt-2.5 rounded-xl bg-card2 px-3 py-2.5">
          <Latex tex={errStep.latex} />
        </div>
      </div>

      {/* Score breakdown */}
      <div className="card mt-3 space-y-2 px-4 py-3.5">
        <p className="text-sm font-bold text-fg">{copy.verdict.breakdownTitle}</p>
        {verdict === 'full' && (
          <>
            <Row label={b.catch} value={`+${roundScore.catch}`} />
            <Row label={b.diagnosis} value={`+${roundScore.diagnosis}`} />
            <Row label={b.speed(Math.floor(roundScore.speed / 2))} value={`+${roundScore.speed}`} />
            <Row label={b.multiplier(roundScore.multiplier.toFixed(1))} value={`×${roundScore.multiplier.toFixed(1)}`} />
          </>
        )}
        {verdict === 'partial' && <Row label={b.partialFlat} value={`+${roundScore.total}`} />}
        {(verdict === 'miss' || verdict === 'timeout') && (
          <Row label={b.catch} value="+0" valueClass="text-brand" />
        )}
      </div>

      <div className="card mt-3 flex items-center justify-between px-4 py-3.5">
        <span className="font-bold text-fg">{b.total}</span>
        <span className="text-xl font-extrabold tabular-nums text-gold">+{roundScore.total}</span>
      </div>

      <button
        onClick={onNext}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gold font-extrabold text-[#1A1400] transition-transform duration-75 active:scale-[0.98]"
      >
        {nextLabel ?? (isLastLife ? copy.verdict.seeResult : copy.verdict.next)}
        <span aria-hidden>›</span>
      </button>
    </motion.div>
  );
}
