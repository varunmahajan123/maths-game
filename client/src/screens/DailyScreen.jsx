import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, getIdentity } from '../api';
import ServerRound from '../components/ServerRound';
import OnboardingModal from '../components/OnboardingModal';
import { copy } from '../copy';

// Local consecutive-day streak (spec: local counter).
export function bumpDailyStreak(dateStr) {
  let s = { last: null, streak: 0 };
  try {
    s = JSON.parse(localStorage.getItem('galti-daily-streak')) ?? s;
  } catch { /* fresh */ }
  if (s.last === dateStr) return s.streak;
  const yesterday = new Date(Date.parse(dateStr) - 86_400_000).toISOString().slice(0, 10);
  const streak = s.last === yesterday ? s.streak + 1 : 1;
  localStorage.setItem('galti-daily-streak', JSON.stringify({ last: dateStr, streak }));
  return streak;
}

export function readDailyStreak() {
  try {
    return JSON.parse(localStorage.getItem('galti-daily-streak'))?.streak ?? 0;
  } catch {
    return 0;
  }
}

export function dailyShareText(number, played) {
  const emojis = `${played.caught ? '🟢' : '🔴'}${played.diagnosed ? '🟢' : '🔴'}`;
  return `GALTI #${number} ${emojis} ${(played.time_ms / 1000).toFixed(1)}s`;
}

function ResultCard({ daily, streak }) {
  const p = daily.played;
  const [copied, setCopied] = useState(false);
  const share = dailyShareText(daily.number, p);

  return (
    <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}>
      <p className={`text-center font-hand text-6xl font-bold ${p.caught ? (p.diagnosed ? 'text-good' : 'text-gold') : 'text-brand'}`}>
        {p.caught ? (p.diagnosed ? copy.daily.wonTitle : copy.daily.halfTitle) : copy.daily.lostTitle}
      </p>
      <p className="mt-1 text-center text-sm text-muted">
        {copy.daily.galtiNumber(daily.number)}
      </p>

      <div className="card mt-5 px-4 py-3.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted">{copy.daily.catchLabel}</span>
          <span className={p.caught ? 'font-bold text-good' : 'font-bold text-brand'}>{p.caught ? '✓' : '✗'}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">{copy.daily.diagLabel}</span>
          <span className={p.diagnosed ? 'font-bold text-good' : 'font-bold text-brand'}>{p.diagnosed ? '✓' : '✗'}</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">{copy.daily.timeLabel}</span>
          <span className="font-bold tabular-nums text-fg">{(p.time_ms / 1000).toFixed(1)}s</span>
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className="text-muted">{copy.daily.scoreLabel}</span>
          <span className="font-extrabold tabular-nums text-gold">+{p.score}</span>
        </div>
      </div>

      <div className="card mt-3 flex items-center justify-between px-4 py-3.5">
        <span className="text-sm text-muted">
          {daily.stats.few ? copy.daily.firstFew : copy.daily.pctLine(daily.stats.caughtPct)}
        </span>
        <span className="text-sm font-bold text-fg">🔥 {streak}</span>
      </div>

      <div className="card mt-3 px-4 py-3.5">
        <p className="text-center font-mono text-lg font-bold tracking-wide text-fg">{share}</p>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(share).then(() => setCopied(true));
          }}
          className="mt-3 min-h-12 w-full rounded-xl bg-gold font-extrabold text-[#1A1400] transition-transform duration-75 active:scale-[0.98]"
        >
          {copied ? copy.daily.copied : copy.daily.copyBtn}
        </button>
      </div>
    </motion.div>
  );
}

export default function DailyScreen() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getIdentity());
  const [daily, setDaily] = useState(null);
  const [error, setError] = useState(false);
  const [streak, setStreak] = useState(readDailyStreak());

  useEffect(() => {
    if (!identity) return;
    api('/daily').then(setDaily).catch(() => setError(true));
  }, [identity]);

  if (!identity) return <OnboardingModal onDone={setIdentity} />;

  if (error)
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col items-center justify-center bg-bg px-6">
        <p className="text-center font-hand text-4xl font-bold text-brand">{copy.offline}</p>
        <button onClick={() => navigate('/')} className="card mt-6 min-h-12 w-full rounded-2xl font-semibold text-muted">
          {copy.runOver.home}
        </button>
      </div>
    );

  if (!daily)
    return <div className="mx-auto min-h-dvh max-w-[430px] bg-bg" />;

  if (daily.played)
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5 py-10">
        <ResultCard daily={daily} streak={streak} />
        <button
          onClick={() => navigate('/')}
          className="card mt-4 min-h-12 w-full rounded-2xl font-semibold text-muted transition-transform duration-75 active:scale-[0.98]"
        >
          {copy.runOver.home}
        </button>
      </div>
    );

  return (
    <ServerRound
      problem={daily.problem}
      headerLabel={copy.daily.headerLabel(daily.number)}
      results={[]}
      submitCatch={(payload) => api('/daily/answer', { method: 'POST', body: payload })}
      submitDiagnosis={(diagnosis) =>
        api('/daily/answer', { method: 'POST', body: { diagnosis } })
      }
      doneLabel={copy.daily.seeResult}
      onDone={async () => {
        setStreak(bumpDailyStreak(daily.date));
        setDaily(await api('/daily').catch(() => daily));
      }}
    />
  );
}
