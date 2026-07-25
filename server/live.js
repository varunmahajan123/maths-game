import { Server } from 'socket.io';
import crypto from 'node:crypto';
import { allProblemIds, getProblem } from './db.js';
import { stripProblem, verdictPayload, errorStepOf, scoreFull, SCORE_PARTIAL } from './judge.js';
import { ROUND_MS } from './config.js';

// Live 1v1: 4-letter rooms, same 5 problems pushed simultaneously,
// first correct catch locks the round. Server-authoritative throughout:
// the server judges every tap and decides who was first.

const LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const ROUNDS = 5;
const GRACE_MS = 15_000;
const REVEAL_MS = 5_000; // between round result and next round

const rooms = new Map(); // code → room

function newRoomCode() {
  let c = '';
  for (let i = 0; i < 4; i++) c += LETTERS[crypto.randomInt(LETTERS.length)];
  return rooms.has(c) ? newRoomCode() : c;
}

function pickProblems() {
  const ids = [...allProblemIds()];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, ROUNDS).map(getProblem);
}

function publicPlayers(room) {
  return room.players.map((p) => ({ name: p.name, emoji: p.emoji, ready: p.ready, total: p.total }));
}

export function attachLive(httpServer) {
  const io = new Server(httpServer);

  function endRoom(room, reason) {
    clearTimeout(room.timer);
    room.state = 'done';
    io.to(room.code).emit('final', {
      reason, // 'finished' | 'forfeit'
      players: publicPlayers(room),
      winnerIdx: winnerIdx(room, reason),
    });
    rooms.delete(room.code);
  }

  function winnerIdx(room, reason) {
    if (reason === 'forfeit') return room.players.findIndex((p) => !p.gone);
    const [a, b] = room.players;
    if (a.total !== b.total) return a.total > b.total ? 0 : 1;
    if (a.timeSum !== b.timeSum) return a.timeSum < b.timeSum ? 0 : 1;
    return -1; // tie
  }

  function startRound(room) {
    room.state = 'playing';
    room.lock = null;
    room.roundStartedAt = Date.now();
    for (const p of room.players) p.failed = false;
    const problem = room.problems[room.round];
    io.to(room.code).emit('round_start', {
      round: room.round,
      total: ROUNDS,
      problem: stripProblem(problem),
      seconds: ROUND_MS / 1000,
      players: publicPlayers(room),
    });
    clearTimeout(room.timer);
    room.timer = setTimeout(() => finishRound(room, { verdict: 'timeout' }), ROUND_MS);
  }

  // outcome: {verdict, winnerSid?, roundScore?}
  function finishRound(room, outcome) {
    clearTimeout(room.timer);
    const problem = room.problems[room.round];
    const winner = room.players.find((p) => p.sid === outcome.winnerSid) ?? null;
    if (winner && outcome.roundScore) {
      winner.total += outcome.roundScore.total;
      winner.timeSum += outcome.timeMs;
    }
    io.to(room.code).emit('round_result', {
      round: room.round,
      verdict: outcome.verdict,
      winnerIdx: winner ? room.players.indexOf(winner) : -1,
      roundScore: outcome.roundScore ?? null,
      players: publicPlayers(room),
      ...verdictPayload(problem),
    });
    room.round += 1;
    if (room.round >= ROUNDS) {
      room.timer = setTimeout(() => endRoom(room, 'finished'), REVEAL_MS);
    } else {
      room.state = 'reveal';
      room.timer = setTimeout(() => startRound(room), REVEAL_MS);
    }
  }

  io.on('connection', (socket) => {
    let room = null;
    let me = null;

    socket.on('create_room', ({ name, emoji }, cb) => {
      const code = newRoomCode();
      me = { sid: socket.id, name: String(name).slice(0, 24), emoji, ready: false, total: 0, timeSum: 0, failed: false, gone: false };
      room = { code, players: [me], state: 'lobby', round: 0, problems: null, lock: null, timer: null };
      rooms.set(code, room);
      socket.join(code);
      cb({ code });
    });

    socket.on('join_room', ({ code, name, emoji }, cb) => {
      const r = rooms.get(String(code).toUpperCase());
      if (!r || r.state !== 'lobby' || r.players.length >= 2)
        return cb({ error: r ? 'full-or-started' : 'not-found' });
      me = { sid: socket.id, name: String(name).slice(0, 24), emoji, ready: false, total: 0, timeSum: 0, failed: false, gone: false };
      room = r;
      room.players.push(me);
      socket.join(room.code);
      cb({ code: room.code });
      io.to(room.code).emit('lobby_update', { players: publicPlayers(room) });
    });

    socket.on('ready', () => {
      if (!room || room.state !== 'lobby' || !me) return;
      me.ready = true;
      io.to(room.code).emit('lobby_update', { players: publicPlayers(room) });
      if (room.players.length === 2 && room.players.every((p) => p.ready)) {
        room.problems = pickProblems();
        startRound(room);
      }
    });

    // First correct catch locks the round for both. Wrong catch locks YOU out.
    socket.on('catch_step', ({ step }, cb) => {
      if (!room || room.state !== 'playing' || room.lock || !me || me.failed) return cb?.({ late: true });
      const problem = room.problems[room.round];
      if (Number(step) === errorStepOf(problem).n) {
        room.lock = { sid: socket.id, at: Date.now() };
        clearTimeout(room.timer);
        io.to(room.code).emit('round_locked', {
          winnerIdx: room.players.indexOf(me),
          step: Number(step),
        });
        // Winner must diagnose; stall-proof: 25s then partial credit.
        room.timer = setTimeout(() => {
          const timeMs = room.lock.at - room.roundStartedAt;
          finishRound(room, {
            verdict: 'partial',
            winnerSid: socket.id,
            timeMs,
            roundScore: { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: SCORE_PARTIAL },
          });
        }, 25_000);
        cb?.({ locked: 'you' });
      } else {
        me.failed = true;
        cb?.({ wrong: true });
        socket.emit('catch_failed', { step: Number(step) });
        if (room.players.every((p) => p.failed)) finishRound(room, { verdict: 'nobody' });
      }
    });

    socket.on('diagnose', ({ diagnosis }) => {
      if (!room || !room.lock || room.lock.sid !== socket.id) return;
      const problem = room.problems[room.round];
      const timeMs = room.lock.at - room.roundStartedAt;
      const full = diagnosis === problem.correct_diagnosis;
      finishRound(room, {
        verdict: full ? 'full' : 'partial',
        winnerSid: socket.id,
        timeMs,
        roundScore: full
          ? scoreFull(timeMs)
          : { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: SCORE_PARTIAL },
      });
    });

    socket.on('disconnect', () => {
      if (!room || !me) return;
      me.gone = true;
      if (room.state === 'lobby') {
        room.players = room.players.filter((p) => p !== me);
        if (room.players.length === 0) {
          clearTimeout(room.timer);
          rooms.delete(room.code);
        } else {
          io.to(room.code).emit('lobby_update', { players: publicPlayers(room) });
        }
        return;
      }
      if (room.state === 'done') return;
      // Mid-game: 15s grace shown to the opponent, then win by default.
      io.to(room.code).emit('opponent_disconnected', { graceSeconds: GRACE_MS / 1000 });
      clearTimeout(room.timer);
      room.timer = setTimeout(() => endRoom(room, 'forfeit'), GRACE_MS);
    });
  });
}
