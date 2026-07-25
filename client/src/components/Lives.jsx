import { motion } from 'framer-motion';
import { STARTING_LIVES } from '../game/scoring';
import { copy } from '../copy';

function Pen({ alive }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill={alive ? '#E5484D' : '#3A414C'}>
      <path d="M20.7 5.6l-2.3-2.3a1.6 1.6 0 0 0-2.2 0L4.4 15.1 3 21l5.9-1.4L20.7 7.8a1.6 1.6 0 0 0 0-2.2zM5.9 18.1l.7-2.8 2.1 2.1-2.8.7z" />
    </svg>
  );
}

// Three red pens in a pill card. A lost life = the pen kinks and greys out.
export default function Lives({ lives }) {
  return (
    <div
      className="card flex flex-col items-center gap-0.5 px-4 py-2"
      aria-label={`${lives} lives left`}
    >
      <div className="flex items-center gap-2">
        {Array.from({ length: STARTING_LIVES }).map((_, i) => {
          const alive = i < lives;
          return (
            <motion.span
              key={i}
              animate={alive ? { rotate: 0, scale: 1 } : { rotate: 32, scale: 0.9, y: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Pen alive={alive} />
            </motion.span>
          );
        })}
      </div>
      <span className="text-[9px] font-bold tracking-[0.2em] text-muted">{copy.round.lives}</span>
    </div>
  );
}
