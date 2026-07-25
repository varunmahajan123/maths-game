// Round-progress pills under the header: one per played round (colored by result)
// plus an outlined pill for the round in play. Shows the most recent 8.
const COLORS = {
  full: 'bg-good',
  partial: 'bg-gold',
  miss: 'bg-brand',
  timeout: 'bg-brand',
};

export default function RoundPills({ results, showCurrent = true }) {
  const recent = results.slice(-7);
  return (
    <div className="flex items-center gap-1.5">
      {recent.map((r, i) => (
        <span key={i} className={`h-1.5 w-8 rounded-full ${COLORS[r] ?? 'bg-line'}`} />
      ))}
      {showCurrent && <span className="h-1.5 w-8 rounded-full border border-line bg-card2" />}
    </div>
  );
}
