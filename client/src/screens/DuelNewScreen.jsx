import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getIdentity } from '../api';
import OnboardingModal from '../components/OnboardingModal';
import DuelRounds from '../components/DuelRounds';
import DuelShare from '../components/DuelShare';
import { copy } from '../copy';

// Create a duel: play 5 server-picked rounds, then share the link.
export default function DuelNewScreen() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getIdentity());
  const [duel, setDuel] = useState(null); // {code, rounds}
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);

  if (!identity) return <OnboardingModal onDone={setIdentity} />;

  if (finished && duel) return <DuelShare code={duel.code} waiting={false} />;

  if (duel)
    return (
      <DuelRounds
        code={duel.code}
        rounds={duel.rounds}
        onFinished={() => setFinished(true)}
      />
    );

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
      <p className="text-center text-5xl">⚔️</p>
      <p className="mt-3 text-center font-hand text-5xl font-bold text-fg">
        {copy.duel.createTitle}
      </p>
      <p className="mt-2 text-center text-sm text-muted">{copy.duel.createSub}</p>
      {error && <p className="mt-3 text-center text-sm font-semibold text-brand">{copy.offline}</p>}
      <button
        onClick={async () => {
          try {
            setDuel(await api('/duel', { method: 'POST' }));
          } catch {
            setError(true);
          }
        }}
        className="mt-8 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] transition-transform duration-75 active:scale-[0.98]"
      >
        {copy.duel.createGo}
      </button>
      <button onClick={() => navigate('/')} className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted">
        {copy.runOver.home}
      </button>
    </div>
  );
}
