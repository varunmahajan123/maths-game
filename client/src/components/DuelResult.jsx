import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../api';
import { copy } from '../copy';

function Marks({ r }) {
  return (
    <span className="tabular-nums">
      <span className={r.caught ? 'text-good' : 'text-brand'}>{r.caught ? '✓' : '✗'}</span>
      <span className={`ml-1.5 ${r.diagnosed ? 'text-good' : 'text-brand'}`}>
        {r.diagnosed ? '✓' : '✗'}
      </span>
    </span>
  );
}

function TimeCell({ r }) {
  return (
    <span className={`tabular-nums ${r.caught ? 'text-good' : 'text-brand'}`}>
      {(r.time_ms / 1000).toFixed(1)}s
    </span>
  );
}

function Avatar({ side, highlight }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-3xl ${
          highlight ? 'border-good' : 'border-line'
        } bg-card`}
      >
        {side.emoji}
      </span>
      <p className="mt-1 max-w-20 truncate text-xs font-semibold text-fg">{side.name}</p>
      <p className={`text-xl font-extrabold tabular-nums ${highlight ? 'text-good' : 'text-brand'}`}>
        {side.score}
      </p>
    </div>
  );
}

// Head-to-head result. Viewer-oriented: "you" is whichever side you played;
// a third visitor sees it read-only with real names.
export default function DuelResult({ duel, onRematch }) {
  const navigate = useNavigate();
  const me =
    duel.viewerId === duel.creator.id
      ? duel.creator
      : duel.viewerId === duel.opponent.id
        ? duel.opponent
        : null;
  const them = me ? (me === duel.creator ? duel.opponent : duel.creator) : null;
  const left = me ?? duel.creator;
  const right = them ?? duel.opponent;

  const banner = !me
    ? copy.duel.resultSpectator
    : duel.winnerId === null
      ? copy.duel.resultTie
      : duel.winnerId === me.id
        ? copy.duel.resultWon
        : copy.duel.resultLost;
  const bannerColor = !me
    ? 'text-fg'
    : duel.winnerId === null
      ? 'text-gold'
      : duel.winnerId === me.id
        ? 'text-good'
        : 'text-brand';

  async function rematch() {
    const created = await api(`/duel/${duel.code}/rematch`, { method: 'POST' });
    onRematch(created.code);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[430px] bg-bg px-4 py-8">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}>
        <p className={`text-center font-hand text-6xl font-bold ${banner === copy.duel.resultSpectator ? 'text-fg' : bannerColor}`}>
          {banner}
        </p>

        <div className="mt-6 flex items-center justify-center gap-8">
          <Avatar side={left} highlight={duel.winnerId === left.id} />
          <span className="text-4xl">🏆</span>
          <Avatar side={right} highlight={duel.winnerId === right.id} />
        </div>

        <div className="card mt-6 px-3 py-4">
          <p className="text-center text-sm font-bold text-fg">{copy.duel.roundSummary}</p>
          <table className="mt-3 w-full text-center text-sm">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wide text-muted">
                <th className="pb-2 font-bold">{copy.duel.thRound}</th>
                <th className="pb-2 font-bold">{me ? copy.duel.you : left.name}</th>
                <th className="pb-2 font-bold">{copy.duel.thCatch}·{copy.duel.thDiag}</th>
                <th className="pb-2 font-bold">{copy.duel.thCatch}·{copy.duel.thDiag}</th>
                <th className="pb-2 font-bold">{right.name}</th>
              </tr>
            </thead>
            <tbody>
              {left.rounds.map((lr, i) => (
                <tr key={i} className="border-t border-line">
                  <td className="py-2 font-bold text-muted">{i + 1}</td>
                  <td className="py-2"><TimeCell r={lr} /></td>
                  <td className="py-2"><Marks r={lr} /></td>
                  <td className="py-2"><Marks r={right.rounds[i]} /></td>
                  <td className="py-2"><TimeCell r={right.rounds[i]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex gap-3">
          {me && (
            <button
              onClick={rematch}
              className="min-h-13 flex-1 rounded-2xl bg-brand py-3 font-extrabold text-white transition-transform duration-75 active:scale-[0.98]"
            >
              {copy.duel.rematch}
            </button>
          )}
          <button
            onClick={() => navigate('/duel/new')}
            className="card min-h-13 flex-1 rounded-2xl py-3 font-bold text-fg transition-transform duration-75 active:scale-[0.98]"
          >
            {copy.duel.newDuel}
          </button>
        </div>
        <button onClick={() => navigate('/')} className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted">
          {copy.runOver.home}
        </button>
      </motion.div>
    </div>
  );
}
