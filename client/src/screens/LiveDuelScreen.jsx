import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getIdentity } from '../api';
import OnboardingModal from '../components/OnboardingModal';
import TimerRing from '../components/TimerRing';
import StepSheet from '../components/StepSheet';
import DiagnosisSheet from '../components/DiagnosisSheet';
import Latex from '../components/Latex';
import { copy } from '../copy';

// Live 1v1 over Socket.io. The server judges everything; this screen only
// renders states it is told about. Phases:
// entry → lobby → playing → locked/diagnosing → reveal → final

export default function LiveDuelScreen() {
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(getIdentity());
  const socketRef = useRef(null);
  const [phase, setPhase] = useState('entry');
  const [code, setCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myIdx, setMyIdx] = useState(0);
  const [round, setRound] = useState(null); // {round,total,problem,seconds}
  const [secondsLeft, setSecondsLeft] = useState(45);
  const [lock, setLock] = useState(null); // {winnerIdx, step}
  const [failed, setFailed] = useState(false);
  const [tappedStepN, setTappedStepN] = useState(null);
  const [result, setResult] = useState(null); // round_result payload
  const [final, setFinal] = useState(null);
  const [grace, setGrace] = useState(null);

  const socket = () => socketRef.current;

  useEffect(() => {
    if (!identity) return;
    const s = io();
    socketRef.current = s;
    s.on('lobby_update', ({ players }) => setPlayers(players));
    s.on('round_start', (r) => {
      setRound(r);
      setPlayers(r.players);
      setSecondsLeft(r.seconds);
      setLock(null);
      setFailed(false);
      setTappedStepN(null);
      setResult(null);
      setGrace(null);
      setPhase('playing');
    });
    s.on('round_locked', (l) => {
      setLock(l);
      setPhase('locked');
    });
    s.on('catch_failed', () => setFailed(true));
    s.on('round_result', (r) => {
      setResult(r);
      setPlayers(r.players);
      setPhase('reveal');
    });
    s.on('final', (f) => {
      setFinal(f);
      setPhase('final');
    });
    s.on('opponent_disconnected', ({ graceSeconds }) => setGrace(graceSeconds));
    return () => s.disconnect();
  }, [identity]);

  // Local display countdown (server holds the real clock)
  useEffect(() => {
    if (phase !== 'playing') return;
    const started = Date.now();
    const base = secondsLeft;
    const id = setInterval(
      () => setSecondsLeft(Math.max(0, base - (Date.now() - started) / 1000)),
      200
    );
    return () => clearInterval(id);
  }, [phase, round?.round]); // eslint-disable-line react-hooks/exhaustive-deps

  const diagnosisOrder = useMemo(
    () =>
      round ? [...round.problem.diagnosis_options].sort(() => Math.random() - 0.5) : [],
    [round?.problem?.id] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!identity) return <OnboardingModal onDone={setIdentity} />;

  const meWon = lock?.winnerIdx === myIdx;
  const opponent = players[1 - myIdx];

  function createRoom() {
    socket().emit('create_room', { name: identity.name, emoji: identity.emoji }, ({ code }) => {
      setCode(code);
      setMyIdx(0);
      setPlayers([{ name: identity.name, emoji: identity.emoji, ready: false, total: 0 }]);
      setPhase('lobby');
    });
  }

  function joinRoom() {
    socket().emit(
      'join_room',
      { code: joinCode, name: identity.name, emoji: identity.emoji },
      (resp) => {
        if (resp.error) {
          setError(resp.error === 'not-found' ? copy.live.errNotFound : copy.live.errFull);
          return;
        }
        setCode(resp.code);
        setMyIdx(1);
        setPhase('lobby');
      }
    );
  }

  // ---------- entry ----------
  if (phase === 'entry')
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
        <p className="text-center text-5xl">⚡</p>
        <p className="mt-3 text-center font-hand text-5xl font-bold text-fg">{copy.live.title}</p>
        <p className="mt-2 text-center text-sm text-muted">{copy.live.sub}</p>
        <button
          onClick={createRoom}
          className="mt-8 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] active:scale-[0.98]"
        >
          {copy.live.createBtn}
        </button>
        <div className="mt-4 flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder={copy.live.joinPlaceholder}
            maxLength={4}
            className="w-28 rounded-xl border border-line bg-card2 px-3 text-center text-xl font-extrabold tracking-[0.3em] text-fg placeholder:text-muted focus:border-gold focus:outline-none"
          />
          <button
            onClick={joinRoom}
            disabled={joinCode.length !== 4}
            className="card min-h-13 flex-1 rounded-xl font-bold text-fg active:scale-[0.98] disabled:opacity-40"
          >
            {copy.live.joinBtn}
          </button>
        </div>
        {error && <p className="mt-3 text-center text-sm font-semibold text-brand">{error}</p>}
        <button onClick={() => navigate('/')} className="mt-4 min-h-12 w-full rounded-2xl font-semibold text-muted">
          {copy.runOver.home}
        </button>
      </div>
    );

  // ---------- lobby ----------
  if (phase === 'lobby') {
    const meReady = players[myIdx]?.ready;
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
        <p className="text-center font-hand text-5xl font-bold text-fg">{copy.live.lobbyTitle}</p>
        <p className="mt-1 text-center text-sm text-muted">{copy.live.lobbySub}</p>
        <div className="card mt-6 px-4 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {copy.duel.codeLabel}
          </p>
          <p className="mt-2 text-5xl font-extrabold tracking-[0.4em] text-gold">{code}</p>
        </div>
        <div className="mt-5 flex items-center justify-center gap-10">
          {players.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full border-2 bg-card text-3xl ${p.ready ? 'border-good' : 'border-line'}`}>
                {p.emoji}
              </span>
              <p className="mt-1 text-xs font-semibold text-fg">{p.name}</p>
              <p className={`text-[11px] font-bold ${p.ready ? 'text-good' : 'text-muted'}`}>
                {p.ready ? '✓ ready' : '…'}
              </p>
            </div>
          ))}
          {players.length < 2 && (
            <p className="text-sm text-muted">{copy.live.waitingOpponent}</p>
          )}
        </div>
        <button
          onClick={() => socket().emit('ready')}
          disabled={meReady || players.length < 2}
          className="mt-8 min-h-14 w-full rounded-2xl bg-brand font-extrabold text-white active:scale-[0.98] disabled:opacity-40"
        >
          {meReady ? copy.live.youReady : copy.live.readyBtn}
        </button>
      </div>
    );
  }

  // ---------- final ----------
  if (phase === 'final' && final) {
    const banner =
      final.winnerIdx === -1
        ? copy.live.finalTie
        : final.winnerIdx === myIdx
          ? copy.live.finalWon
          : copy.live.finalLost;
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
        <p className={`text-center font-hand text-6xl font-bold ${final.winnerIdx === myIdx ? 'text-good' : final.winnerIdx === -1 ? 'text-gold' : 'text-brand'}`}>
          {banner}
        </p>
        {final.reason === 'forfeit' && (
          <p className="mt-2 text-center text-sm text-muted">{copy.live.forfeitNote}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-8">
          {final.players.map((p, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className={`flex h-14 w-14 items-center justify-center rounded-full border-2 bg-card text-3xl ${final.winnerIdx === i ? 'border-good' : 'border-line'}`}>
                {p.emoji}
              </span>
              <p className="mt-1 text-xs font-semibold text-fg">{p.name}</p>
              <p className={`text-xl font-extrabold tabular-nums ${final.winnerIdx === i ? 'text-good' : 'text-brand'}`}>
                {p.total}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] active:scale-[0.98]"
        >
          {copy.live.playAgain}
        </button>
        <button onClick={() => navigate('/')} className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted">
          {copy.runOver.home}
        </button>
      </div>
    );
  }

  if (!round) return <div className="mx-auto min-h-dvh max-w-[430px] bg-bg" />;

  // ---------- playing / locked / reveal ----------
  const banner =
    phase === 'reveal' && result
      ? result.winnerIdx === -1
        ? copy.live.nobody
        : result.winnerIdx === myIdx
          ? copy.live.roundWonYou
          : copy.live.roundWonThem(opponent?.name ?? '')
      : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-bg">
      <header className="flex items-center justify-center px-4 pt-4">
        <p className="font-hand text-4xl font-bold italic text-brand">{copy.appName}</p>
      </header>

      <div className="mt-2 flex items-center justify-between px-4">
        <p className="text-sm font-extrabold tracking-widest text-fg">
          {copy.live.roundLabel(round.round + 1, round.total)} <span className="text-brand">●</span>
        </p>
        <TimerRing secondsLeft={secondsLeft} totalSeconds={round.seconds} label={copy.round.sec} />
      </div>

      {/* Scoreboard */}
      <div className="mt-2 flex items-center justify-center gap-6 px-4">
        {players.map((p, i) => (
          <p key={i} className={`text-sm font-bold ${i === myIdx ? 'text-gold' : 'text-fg'}`}>
            {p.emoji} {i === myIdx ? copy.duel.you : p.name}{' '}
            <span className="tabular-nums text-muted">{p.total}</span>
          </p>
        ))}
      </div>

      {grace != null && (
        <p className="mt-2 text-center text-sm font-bold text-brand">{copy.live.disconnected(grace)}</p>
      )}

      <div className="card mx-4 mt-3 px-4 py-3">
        <div className="step-math text-center font-semibold [&_.katex]:!text-gold">
          <Latex tex={round.problem.problem_latex} />
        </div>
      </div>

      <main className="flex-1 px-4 pb-10 pt-4">
        <StepSheet
          steps={round.problem.steps}
          tappedStepN={tappedStepN}
          verdictKind={
            lock ? 'caught' : failed && tappedStepN != null ? 'miss' : null
          }
          onTapStep={(n) => {
            if (phase !== 'playing' || failed) return;
            setTappedStepN(n);
            socket().emit('catch_step', { step: n }, () => {});
          }}
          disabled={phase !== 'playing' || failed}
        />
        <p className="mt-6 text-center text-sm font-semibold text-muted">
          {phase === 'playing' && failed && copy.live.failedYou}
          {phase === 'playing' && !failed && copy.round.hint}
          {phase === 'locked' && (meWon ? copy.live.lockedYou : copy.live.lockedThem(opponent?.name ?? ''))}
        </p>
      </main>

      {/* Winner picks the diagnosis; loser sees who locked it */}
      <DiagnosisSheet
        open={phase === 'locked' && meWon}
        stepN={lock?.step ?? 0}
        options={diagnosisOrder}
        onPick={(d) => socket().emit('diagnose', { diagnosis: d })}
      />
      {phase === 'locked' && !meWon && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-line bg-card px-4 py-6 text-center">
          <p className="font-hand text-3xl font-bold text-brand">
            {copy.live.lockedThem(opponent?.name ?? '')}
          </p>
          <p className="mt-1 text-sm text-muted">{copy.live.theirTurnDiag(opponent?.name ?? '')}</p>
        </div>
      )}

      {/* Round reveal */}
      {phase === 'reveal' && result && (
        <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] rounded-t-2xl border-t border-line bg-card px-5 py-6">
          <p className={`text-center font-hand text-4xl font-bold ${result.winnerIdx === myIdx ? 'text-good' : result.winnerIdx === -1 ? 'text-muted' : 'text-brand'}`}>
            {banner}
          </p>
          {result.roundScore && (
            <p className="mt-1 text-center text-sm font-bold text-gold">
              +{result.roundScore.total}
            </p>
          )}
          <div className="mt-3 rounded-xl bg-card2 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">
              {copy.verdict.sahiJawab} — {copy.verdict.stepN(result.errorStep.n)} ·{' '}
              {copy.diagnosisLabels[result.correct_diagnosis].label}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-fg/85">
              {result.errorStep.explanation}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
