import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getIdentity } from '../api';
import { readDailyStreak } from './DailyScreen';
import { copy } from '../copy';

// Local-only stats until the backend lands (Phase 2/3).
function readStats() {
  try {
    return JSON.parse(localStorage.getItem('galti-stats')) ?? {};
  } catch {
    return {};
  }
}

function StatChip({ icon, value, label }) {
  return (
    <div className="card flex flex-1 items-center gap-2.5 px-3.5 py-2.5">
      <span className="text-xl">{icon}</span>
      <span>
        <span className="block text-lg font-extrabold leading-tight text-fg">{value}</span>
        <span className="block text-[11px] text-muted">{label}</span>
      </span>
    </div>
  );
}

function ModeCard({ title, sub, icon, locked, titleClass = 'text-fg', onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      className={`card flex w-full items-center justify-between px-4 py-4 text-left transition-transform duration-75 ${
        locked ? 'opacity-45' : 'active:scale-[0.98] active:bg-card2'
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-base font-extrabold tracking-wide ${titleClass}`}>
          {title}
          {locked && (
            <span className="ml-2 rounded-md border border-line bg-card2 px-1.5 py-0.5 align-middle text-[9px] font-bold tracking-widest text-muted">
              {copy.home.soon}
            </span>
          )}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">{sub}</span>
      </span>
      <span className="ml-3 shrink-0 text-3xl" aria-hidden>
        {icon}
      </span>
    </button>
  );
}

function Tab({ icon, label, active }) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
        active ? 'text-brand' : 'text-muted opacity-60'
      }`}
      aria-disabled={!active}
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const stats = readStats();
  const identity = getIdentity();
  const [daily, setDaily] = useState(null);

  useEffect(() => {
    if (identity) api('/daily').then(setDaily).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg px-4 pb-24 pt-5">
      {/* Avatar header */}
      <header className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-card text-2xl">
          {identity?.emoji ?? '🧑🏽‍🏫'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-extrabold text-fg">
            {identity?.name ?? copy.home.playerFallback}
          </p>
          <p className="truncate text-xs text-muted">{copy.home.playerTitle}</p>
        </div>
      </header>

      {/* Stat chips */}
      <div className="mt-4 flex gap-3">
        <StatChip icon="🔥" value={readDailyStreak()} label={copy.home.dayStreak} />
        <StatChip icon="🏆" value={stats.totalScore ?? 0} label={copy.home.totalScore} />
      </div>

      {/* Mode cards */}
      <div className="mt-5 flex flex-col gap-3">
        <ModeCard
          title={copy.home.streakTitle}
          titleClass="text-fg"
          sub={copy.home.streakSub}
          icon="🖊️"
          onClick={() => navigate('/play')}
        />
        <ModeCard
          title={copy.home.dailyTitle}
          titleClass="text-brand"
          sub={daily?.played ? copy.daily.cardPlayed(daily.played) : copy.daily.cardNotPlayed}
          icon="📅"
          onClick={() => navigate('/daily')}
        />
        <ModeCard
          title={copy.home.duelTitle}
          sub={copy.home.duelSub}
          icon="⚔️"
          onClick={() => navigate('/duel/new')}
        />
        <ModeCard
          title={copy.home.liveTitle}
          sub={copy.home.liveSub}
          icon="⚡"
          onClick={() => navigate('/live')}
        />
      </div>

      {/* Bottom tab bar (Home only until Stats/Leaderboard/Profile ship) */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] items-center justify-around border-t border-line bg-card/95 px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
        <Tab icon="🏠" label={copy.home.tabs.home} active />
        <Tab icon="📊" label={copy.home.tabs.stats} />
        <Tab icon="🏆" label={copy.home.tabs.leaderboard} />
        <Tab icon="👤" label={copy.home.tabs.profile} />
      </nav>
    </div>
  );
}
