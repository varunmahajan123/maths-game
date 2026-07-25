import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { copy } from '../copy';

function Stat({ label, value }) {
  return (
    <div className="card px-3 py-3 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-hand text-3xl font-bold text-fg">{value}</p>
    </div>
  );
}

export default function RunOverScreen({ score, bestStreak, fullCatches, roundsPlayed, onAgain, onHome }) {
  const accuracy = roundsPlayed > 0 ? Math.round((fullCatches / roundsPlayed) * 100) : 0;

  // Keep the home-screen Total Score chip honest (local until Phase 2 backend)
  useEffect(() => {
    try {
      const stats = JSON.parse(localStorage.getItem('galti-stats')) ?? {};
      stats.totalScore = Math.max(stats.totalScore ?? 0, score);
      localStorage.setItem('galti-stats', JSON.stringify(stats));
    } catch {
      /* stats are a nicety, never block the game */
    }
  }, [score]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <p className="text-center font-hand text-6xl font-bold text-brand">
          {copy.runOver.title}
        </p>

        <div className="card mt-6 p-5">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-muted">
            {copy.runOver.score}
          </p>
          <p className="text-center font-hand text-7xl font-bold leading-none text-gold">
            {score}
          </p>
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <Stat label={copy.runOver.bestStreak} value={`${bestStreak}🔥`} />
            <Stat label={copy.runOver.accuracy} value={`${accuracy}%`} />
            <Stat label={copy.runOver.rounds} value={roundsPlayed} />
          </div>
        </div>

        <button
          onClick={onAgain}
          className="mt-6 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] transition-transform duration-75 active:scale-[0.98]"
        >
          {copy.runOver.again}
        </button>
        <button
          onClick={onHome}
          className="card mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted transition-transform duration-75 active:scale-[0.98]"
        >
          {copy.runOver.home}
        </button>
      </motion.div>
    </div>
  );
}
