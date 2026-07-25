import { motion, AnimatePresence } from 'framer-motion';
import { copy } from '../copy';

// Icon tint rotates per row so the 4 options always read distinct.
const TINTS = [
  { box: 'bg-brand/15 border-brand/40', glow: '' },
  { box: 'bg-gold/15 border-gold/40', glow: '' },
  { box: 'bg-[#4493F8]/15 border-[#4493F8]/40', glow: '' },
  { box: 'bg-good/15 border-good/40', glow: '' },
];

// Full-screen diagnosis panel: handwritten headline + icon rows. Untimed.
export default function DiagnosisSheet({ open, stepN, options, onPick }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-30 mx-auto flex max-w-[430px] flex-col bg-bg px-4 pt-14 pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <h2 className="font-hand text-5xl font-semibold text-fg">
            {copy.round.diagnosisTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">{copy.round.diagnosisSub(stepN)}</p>

          <div className="mt-6 flex flex-col gap-3">
            {options.map((type, i) => {
              const { label, sub, icon } = copy.diagnosisLabels[type];
              const tint = TINTS[i % TINTS.length];
              return (
                <button
                  key={type}
                  onClick={() => onPick(type)}
                  className="card flex min-h-16 w-full items-center gap-3.5 px-3.5 py-3 text-left transition-transform duration-75 active:scale-[0.98] active:bg-card2"
                >
                  <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg ${tint.box}`}
                  >
                    {icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-fg">{label}</span>
                    <span className="block truncate text-xs text-muted">{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
