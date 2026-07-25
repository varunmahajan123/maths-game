// Circular ring countdown, top-right: seconds inside, gold ring turning red as time runs out.
const R = 20;
const CIRC = 2 * Math.PI * R;

export default function TimerRing({ secondsLeft, totalSeconds, label }) {
  const fraction = Math.max(0, secondsLeft / totalSeconds);
  const low = secondsLeft <= 10;
  const color = low ? '#E5484D' : '#FFC53D';

  return (
    <div className="relative h-12 w-12" aria-label={`${Math.ceil(secondsLeft)} seconds left`}>
      <svg viewBox="0 0 48 48" className="h-12 w-12 -rotate-90">
        <circle cx="24" cy="24" r={R} fill="#161B22" stroke="#262C36" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - fraction)}
          className="transition-[stroke-dashoffset] duration-100 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`text-sm font-extrabold tabular-nums ${low ? 'text-brand' : 'text-fg'}`}>
          {Math.max(0, Math.ceil(secondsLeft))}
        </span>
        <span className="text-[7px] font-bold tracking-widest text-muted">{label}</span>
      </div>
    </div>
  );
}
