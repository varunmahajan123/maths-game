# GALTI 🖊️

Solve mat karo. **Pakdo.**

Every round shows a worked maths solution with exactly one wrong step. Tap the
wrong step (the catch), then say *why* it's wrong (the diagnosis). You are the
teacher with the red pen.

## Run it

```bash
npm install     # installs root + client + server deps
npm run dev     # API on :3001, Vite on :5173 (proxied)
```

Open http://localhost:5173 on a phone-sized viewport (design target: 390×844).

Production: `npm run build && npm start` — the Express server serves the built
client and everything runs on one port.

## Modes

- **Streak** — endless solo run, 45s rounds, 3 red-pen lives, streak multiplier.
- **Daily Galti** — one problem a day (same for everyone, IST rollover), one
  attempt enforced server-side, `GALTI #N 🟢🟢 12.4s` share text.
- **Challenge a Friend** — play 5 rounds, share `/duel/CODE` on WhatsApp; your
  friend plays the same 5 with no login; head-to-head table + rematch.
- **Live Duel** — real-time 1v1 over Socket.io, 4-letter rooms, first correct
  catch locks the round, best of 5, 15s-grace walkover on disconnect.

## Content

Problems live in `/content/problems/*.json` (currently 15, all hand-verified)
and load into SQLite on boot. The server strips every answer field before a
problem reaches a client; all judging is server-side. See `DECISIONS.md` for
every call made where the spec was ambiguous.
