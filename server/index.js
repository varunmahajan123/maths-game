import express from 'express';
import http from 'node:http';
import crypto from 'node:crypto';
import { attachLive } from './live.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, loadProblems, allProblemIds, getProblem, getPlayer } from './db.js';
import { istDateString, dailyNumber } from './ist.js';
import { stripProblem, verdictPayload, errorStepOf, scoreFull, SCORE_PARTIAL } from './judge.js';
import { PORT, DAILY_LAUNCH_DATE, DUEL_TTL_MS, DAILY_MIN_PLAYERS_FOR_PCT, ROUND_MS } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

const count = loadProblems();
console.log(`[galti] loaded ${count} problems`);

const DEV = process.env.NODE_ENV !== 'production';

function player(req) {
  const id = req.header('x-player-id');
  return id ? getPlayer(id) : null;
}

// ---------------------------------------------------------------- identity

app.post('/api/player', (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 24);
  const avatar = String(req.body?.avatar_emoji ?? '').slice(0, 8);
  if (!name || !avatar) return res.status(400).json({ error: 'name-and-avatar-required' });
  const id = crypto.randomUUID();
  db.prepare('INSERT INTO players (id, name, avatar_emoji, created_at) VALUES (?, ?, ?, ?)').run(
    id, name, avatar, Date.now()
  );
  res.json({ id, name, avatar_emoji: avatar });
});

// ---------------------------------------------------------------- daily

// Deterministic pick: hash(YYYY-MM-DD) → index into the sorted problem list.
function dailyProblemFor(dateStr) {
  const ids = allProblemIds();
  let h = 5381;
  for (const c of dateStr) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0;
  return getProblem(ids[h % ids.length]);
}

// Dev-only date override (?_date=YYYY-MM-DD) so the IST rollover can be tested.
function dailyDate(req) {
  if (DEV && /^\d{4}-\d{2}-\d{2}$/.test(req.query._date ?? '')) return req.query._date;
  return istDateString();
}

function dailyStats(dateStr) {
  const { players, caught } = db
    .prepare('SELECT COUNT(*) AS players, SUM(caught) AS caught FROM daily_results WHERE date = ?')
    .get(dateStr);
  return {
    players,
    caughtPct: players > 0 ? Math.round(((caught ?? 0) / players) * 100) : 0,
    few: players < DAILY_MIN_PLAYERS_FOR_PCT,
  };
}

const getDailyRow = db.prepare('SELECT * FROM daily_results WHERE player_id = ? AND date = ?');

// Caught but never diagnosed (refresh/abandon mid-diagnosis) → locked in as partial.
function finalizeStale(row) {
  if (row && row.caught === 1 && row.score === null) {
    db.prepare('UPDATE daily_results SET score = ?, diagnosed = 0 WHERE player_id = ? AND date = ?')
      .run(SCORE_PARTIAL, row.player_id, row.date);
    row.score = SCORE_PARTIAL;
  }
  return row;
}

app.get('/api/daily', (req, res) => {
  const date = dailyDate(req);
  const problem = dailyProblemFor(date);
  const p = player(req);
  const row = p ? finalizeStale(getDailyRow.get(p.id, date)) : null;
  res.json({
    date,
    number: dailyNumber(date, DAILY_LAUNCH_DATE),
    stats: dailyStats(date),
    played: row
      ? {
          caught: !!row.caught,
          diagnosed: !!row.diagnosed,
          time_ms: row.time_ms,
          score: row.score,
          ...verdictPayload(problem),
        }
      : null,
    problem: row ? null : stripProblem(problem),
  });
});

app.post('/api/daily/answer', (req, res) => {
  const p = player(req);
  if (!p) return res.status(401).json({ error: 'no-player' });
  const date = dailyDate(req);
  const problem = dailyProblemFor(date);
  const { step, diagnosis, time_ms, timeout } = req.body ?? {};
  const row = getDailyRow.get(p.id, date);

  if (diagnosis == null) {
    // Stage 1: the catch. One attempt per day, enforced here.
    if (row) return res.status(409).json({ error: 'already-played' });
    const t = Math.min(Math.max(Number(time_ms) || 0, 0), ROUND_MS);
    const caught = !timeout && Number(step) === errorStepOf(problem).n;
    db.prepare(
      'INSERT INTO daily_results (player_id, date, caught, diagnosed, time_ms, score) VALUES (?, ?, ?, 0, ?, ?)'
    ).run(p.id, date, caught ? 1 : 0, t, caught ? null : 0);
    if (caught) return res.json({ caught: true });
    return res.json({
      caught: false,
      result: {
        verdict: timeout ? 'timeout' : 'miss',
        roundScore: { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: 0 },
        ...verdictPayload(problem),
      },
    });
  }

  // Stage 2: the diagnosis, only after a recorded catch that isn't finalized.
  if (!row || row.caught !== 1 || row.score !== null)
    return res.status(409).json({ error: 'no-open-catch' });
  const full = diagnosis === problem.correct_diagnosis;
  const roundScore = full
    ? scoreFull(row.time_ms)
    : { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: SCORE_PARTIAL };
  db.prepare('UPDATE daily_results SET diagnosed = ?, score = ? WHERE player_id = ? AND date = ?')
    .run(full ? 1 : 0, roundScore.total, p.id, date);
  res.json({
    result: { verdict: full ? 'full' : 'partial', roundScore, ...verdictPayload(problem) },
  });
});

// ---------------------------------------------------------------- duels

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(len = 5) {
  let c = '';
  for (let i = 0; i < len; i++) c += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
  return db.prepare('SELECT 1 FROM duels WHERE code = ?').get(c) ? newCode(len) : c;
}

function pickDuelProblems() {
  const ids = [...allProblemIds()];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, 5);
}

function getDuel(code) {
  return db.prepare('SELECT * FROM duels WHERE code = ?').get(String(code).toUpperCase());
}

function duelExpired(duel) {
  return duel.status !== 'complete' && Date.now() - duel.created_at > DUEL_TTL_MS;
}

function duelRounds(duel) {
  return JSON.parse(duel.problem_ids).map((id) => stripProblem(getProblem(id)));
}

function totals(results) {
  return {
    score: results.reduce((s, r) => s + (r.score ?? 0), 0),
    time_ms: results.reduce((s, r) => s + r.time_ms, 0),
  };
}

function completeView(duel) {
  const cRes = JSON.parse(duel.creator_results);
  const oRes = JSON.parse(duel.opponent_results);
  const creator = getPlayer(duel.creator_id);
  const opponent = getPlayer(duel.opponent_id);
  const c = totals(cRes);
  const o = totals(oRes);
  // Most points wins; ties broken by total time (spec §3).
  let winnerId = null;
  if (c.score !== o.score) winnerId = c.score > o.score ? creator.id : opponent.id;
  else if (c.time_ms !== o.time_ms) winnerId = c.time_ms < o.time_ms ? creator.id : opponent.id;
  const pub = (res) =>
    res.map((r) => ({ caught: !!r.caught, diagnosed: !!r.diagnosed, time_ms: r.time_ms, score: r.score ?? 0 }));
  return {
    status: 'complete',
    winnerId,
    creator: { id: creator.id, name: creator.name, emoji: creator.avatar_emoji, ...c, rounds: pub(cRes) },
    opponent: { id: opponent.id, name: opponent.name, emoji: opponent.avatar_emoji, ...o, rounds: pub(oRes) },
  };
}

// Create a duel: server picks the 5 problems; creator plays them next.
app.post('/api/duel', (req, res) => {
  const p = player(req);
  if (!p) return res.status(401).json({ error: 'no-player' });
  const code = newCode();
  db.prepare(
    "INSERT INTO duels (code, creator_id, problem_ids, status, created_at) VALUES (?, ?, ?, 'creating', ?)"
  ).run(code, p.id, JSON.stringify(pickDuelProblems()), Date.now());
  const duel = getDuel(code);
  res.json({ code, rounds: duelRounds(duel), progress: 0 });
});

app.get('/api/duel/:code', (req, res) => {
  const duel = getDuel(req.params.code);
  if (!duel) return res.status(404).json({ error: 'not-found' });
  if (duelExpired(duel)) return res.status(410).json({ error: 'expired' });
  const p = player(req);
  const isCreator = p && p.id === duel.creator_id;

  if (duel.status === 'creating') {
    if (!isCreator) return res.status(404).json({ error: 'not-found' }); // not shareable yet
    return res.json({
      status: 'creating',
      code: duel.code,
      rounds: duelRounds(duel),
      progress: JSON.parse(duel.creator_results).filter((r) => !r.pending).length,
    });
  }

  if (duel.status === 'open') {
    if (isCreator) return res.json({ status: 'waiting', code: duel.code });
    const creator = getPlayer(duel.creator_id);
    const joined = p && duel.opponent_id === p.id;
    // Challenger's name and avatar only — never their score (no anchoring).
    return res.json({
      status: joined ? 'joined' : 'open',
      code: duel.code,
      challenger: { name: creator.name, emoji: creator.avatar_emoji },
      ...(joined
        ? { rounds: duelRounds(duel), progress: JSON.parse(duel.opponent_results).filter((r) => !r.pending).length }
        : {}),
    });
  }

  res.json({ ...completeView(duel), code: duel.code, viewerId: p?.id ?? null });
});

app.post('/api/duel/:code/join', (req, res) => {
  const p = player(req);
  if (!p) return res.status(401).json({ error: 'no-player' });
  const duel = getDuel(req.params.code);
  if (!duel || duel.status === 'creating') return res.status(404).json({ error: 'not-found' });
  if (duelExpired(duel)) return res.status(410).json({ error: 'expired' });
  if (duel.status !== 'open') return res.status(409).json({ error: 'already-complete' });
  if (p.id === duel.creator_id) return res.status(409).json({ error: 'own-duel' });
  if (duel.opponent_id && duel.opponent_id !== p.id) return res.status(409).json({ error: 'taken' });
  if (!duel.opponent_id)
    db.prepare('UPDATE duels SET opponent_id = ? WHERE code = ?').run(p.id, duel.code);
  res.json({
    rounds: duelRounds(getDuel(duel.code)),
    progress: JSON.parse(duel.opponent_results).filter((r) => !r.pending).length,
  });
});

app.post('/api/duel/:code/answer', (req, res) => {
  const p = player(req);
  if (!p) return res.status(401).json({ error: 'no-player' });
  const duel = getDuel(req.params.code);
  if (!duel) return res.status(404).json({ error: 'not-found' });
  if (duelExpired(duel)) return res.status(410).json({ error: 'expired' });

  const role =
    p.id === duel.creator_id && duel.status === 'creating'
      ? 'creator'
      : p.id === duel.opponent_id && duel.status === 'open'
        ? 'opponent'
        : null;
  if (!role) return res.status(409).json({ error: 'not-your-turn' });

  const col = role === 'creator' ? 'creator_results' : 'opponent_results';
  const results = JSON.parse(duel[col]);
  const ids = JSON.parse(duel.problem_ids);
  const { round, step, diagnosis, time_ms, timeout } = req.body ?? {};

  const save = (r, status) => {
    db.prepare(`UPDATE duels SET ${col} = ?${status ? ', status = ?' : ''} WHERE code = ?`).run(
      ...(status ? [JSON.stringify(r), status, duel.code] : [JSON.stringify(r), duel.code])
    );
  };
  const maybeFinish = () => {
    if (results.length === 5 && !results.at(-1).pending) {
      const next = role === 'creator' ? 'open' : 'complete';
      save(results, next);
      return next;
    }
    save(results);
    return null;
  };

  const pending = results.at(-1)?.pending ? results.length - 1 : null;

  if (diagnosis == null) {
    // Stage 1: catch. Exactly one attempt per round, in order.
    if (pending !== null || Number(round) !== results.length)
      return res.status(409).json({ error: 'bad-round' });
    const problem = getProblem(ids[results.length]);
    const t = Math.min(Math.max(Number(time_ms) || 0, 0), ROUND_MS);
    const caught = !timeout && Number(step) === errorStepOf(problem).n;
    if (caught) {
      results.push({ caught: 1, diagnosed: 0, time_ms: t, score: null, pending: true });
      save(results);
      return res.json({ caught: true });
    }
    results.push({ caught: 0, diagnosed: 0, time_ms: t, score: 0 });
    const done = maybeFinish();
    return res.json({
      caught: false,
      result: {
        verdict: timeout ? 'timeout' : 'miss',
        roundScore: { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: 0 },
        ...verdictPayload(problem),
      },
      done,
    });
  }

  // Stage 2: diagnosis for the pending catch.
  if (pending === null || Number(round) !== pending)
    return res.status(409).json({ error: 'no-open-catch' });
  const problem = getProblem(ids[pending]);
  const full = diagnosis === problem.correct_diagnosis;
  const roundScore = full
    ? scoreFull(results[pending].time_ms)
    : { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: SCORE_PARTIAL };
  results[pending] = {
    caught: 1,
    diagnosed: full ? 1 : 0,
    time_ms: results[pending].time_ms,
    score: roundScore.total,
  };
  const done = maybeFinish();
  res.json({
    result: { verdict: full ? 'full' : 'partial', roundScore, ...verdictPayload(problem) },
    done,
  });
});

// Rematch: fresh duel, fresh problems, requester becomes the new creator.
app.post('/api/duel/:code/rematch', (req, res) => {
  const p = player(req);
  if (!p) return res.status(401).json({ error: 'no-player' });
  const duel = getDuel(req.params.code);
  if (!duel || duel.status !== 'complete') return res.status(409).json({ error: 'not-complete' });
  if (p.id !== duel.creator_id && p.id !== duel.opponent_id)
    return res.status(403).json({ error: 'not-a-player' });
  const code = newCode();
  db.prepare(
    "INSERT INTO duels (code, creator_id, problem_ids, status, created_at) VALUES (?, ?, ?, 'creating', ?)"
  ).run(code, p.id, JSON.stringify(pickDuelProblems()), Date.now());
  res.json({ code, rounds: duelRounds(getDuel(code)), progress: 0 });
});

// ---------------------------------------------------------------- static (prod)

if (!DEV) {
  const dist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

const server = http.createServer(app);
attachLive(server);
server.listen(PORT, () => console.log(`[galti] server on :${PORT} (${DEV ? 'dev' : 'prod'})`));
