import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, getIdentity } from '../api';
import OnboardingModal from '../components/OnboardingModal';
import DuelRounds from '../components/DuelRounds';
import DuelShare from '../components/DuelShare';
import DuelResult from '../components/DuelResult';
import { copy } from '../copy';

function ErrorCard() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
      <p className="text-center font-hand text-5xl font-bold text-brand">{copy.duel.errorTitle}</p>
      <p className="mt-2 text-center text-sm text-muted">{copy.duel.errorSub}</p>
      <button
        onClick={() => navigate('/duel/new')}
        className="mt-8 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] active:scale-[0.98]"
      >
        {copy.duel.newDuel}
      </button>
      <button onClick={() => navigate('/')} className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted">
        {copy.runOver.home}
      </button>
    </div>
  );
}

// /duel/:code — accepts, plays, waits, or shows results depending on
// who you are and where the duel stands.
export default function DuelScreen() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getIdentity());
  const [data, setData] = useState(null);
  const [joined, setJoined] = useState(null); // {rounds, progress} after accepting
  const [needIdentity, setNeedIdentity] = useState(false);
  const [error, setError] = useState(false);

  const refetch = useCallback(() => {
    setJoined(null);
    api(`/duel/${code}`)
      .then((d) => {
        setData(d);
        setError(false);
      })
      .catch(() => setError(true));
  }, [code]);

  useEffect(refetch, [refetch, identity]);

  async function accept() {
    if (!getIdentity()) {
      setNeedIdentity(true);
      return;
    }
    try {
      setJoined(await api(`/duel/${code}/join`, { method: 'POST' }));
    } catch {
      refetch(); // race: duel may have completed/expired under us
    }
  }

  if (error) return <ErrorCard />;
  if (!data) return <div className="mx-auto min-h-dvh max-w-[430px] bg-bg" />;

  if (needIdentity)
    return (
      <OnboardingModal
        onDone={(id) => {
          setIdentity(id);
          setNeedIdentity(false);
          api(`/duel/${code}/join`, { method: 'POST' }).then(setJoined).catch(refetch);
        }}
      />
    );

  // Opponent mid-play (just joined, or came back to an accepted duel)
  const playable = joined ?? (data.status === 'joined' ? data : null);
  if (playable)
    return (
      <DuelRounds
        code={code.toUpperCase()}
        rounds={playable.rounds}
        startProgress={playable.progress ?? 0}
        onFinished={refetch}
      />
    );

  if (data.status === 'creating')
    return (
      <DuelRounds
        code={data.code}
        rounds={data.rounds}
        startProgress={data.progress}
        onFinished={refetch}
      />
    );

  if (data.status === 'waiting') return <DuelShare code={data.code} waiting />;

  if (data.status === 'open')
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
        <div className="flex justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-brand bg-card text-4xl">
            {data.challenger.emoji}
          </span>
        </div>
        <p className="mt-4 text-center font-hand text-4xl font-bold text-fg">
          {copy.duel.acceptTitle(data.challenger.name)}
        </p>
        <p className="mt-2 text-center text-sm text-muted">{copy.duel.acceptSub}</p>
        <button
          onClick={accept}
          className="mt-8 min-h-14 w-full rounded-2xl bg-brand font-extrabold text-white transition-transform duration-75 active:scale-[0.98]"
        >
          {copy.duel.acceptGo}
        </button>
        <button onClick={() => navigate('/')} className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted">
          {copy.runOver.home}
        </button>
      </div>
    );

  return <DuelResult duel={data} onRematch={(newCode) => navigate(`/duel/${newCode}`)} />;
}
