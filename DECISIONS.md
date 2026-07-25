# DECISIONS

Running log of ambiguity calls. Simplest option that ships, every time.

## Phase 1

- **Repo root = this folder.** `/client` now; `/server` joins in Phase 2, at which point root `dev` script switches to `concurrently`.
- **Machine has Node 24, spec says Node 20.** No Node-20-only APIs used; better-sqlite3 (Phase 2) supports Node 24. Proceeding on 24.
- **`copy.ts` → `copy.js`.** Spec bans TypeScript-strictness debates and the client is plain JS/JSX, so the single-copy-file rule is honored as `copy.js`.
- **Tailwind v4** (CSS-first config via `@theme`, `@tailwindcss/vite` plugin). No `tailwind.config.js` needed; fewer files, same utility classes.
- **Timer pauses at the catch.** Speed bonus is defined on catch time (§3), and reading 4 diagnosis options under a ticking clock punishes reading, not sloppiness. Diagnosis is untimed.
- **Timeout = miss.** Timer hits 0 with no catch → lose a life, streak resets, verdict overlay explains the error anyway (learning still happens).
- **Partial verdict (right step, wrong reason):** flat 40, no life lost. "Streak survives but multiplier resets" (§3) implemented as: the multiplier's consecutive-fully-correct counter resets to 0; the run continues. Displayed streak = the multiplier counter (one number, no confusion).
- **Phase 1 problem cycling:** 5 hardcoded problems play in shuffled order; if the player survives all 5, order reshuffles and repeats (endless, as Streak demands). Real difficulty ramp arrives with the 40-problem bank in Phase 2/3.
- **Diagnosis option order is shuffled once per round** (stable while the sheet is open), so the correct answer isn't positionally learnable.
- **Lives are pen emoji (🖊️) with a snap/rotate animation**, not custom SVG pens. Reads instantly at 20px; custom art is polish-phase work if ever.
- **Home screen is minimal in Phase 1** (logo + Streak button): Phase 1 gate covers the round engine only; Daily/duel/leaderboard cards arrive with their phases.
- **Diagnosis labels are Hinglish** ("Sign palat gaya") with the formal error-type as a small subtitle — punchy for play, precise for learning.

## Design restyle (dark-first, from target mock image.png)

- **Dark-first replaces the paper theme.** Tokens: bg #0D1117, card #161B22, red #E5484D (brand/judgment), gold #FFC53D (score/primary action), green #3FB950 (correct only), muted #8B949E. The §8 "red only at judgment" rule now shares red with the brand logo/timer-low per the mock.
- **Ring timer with seconds replaces the thin line** — explicit override of the original "no numeric countdown" rule, per the mock.
- **Diagnosis + verdict are full screens now** (not bottom sheets), matching the mock; game logic unchanged.
- **Hint button from the mock is NOT implemented** — it changes scoring; awaiting owner's call.
- **Header flag icon from the mock is NOT implemented** — implies a report feature that doesn't exist.
- **Home matches the mock's layout**; Daily/Challenge/Live Duel cards and Stats/Leaderboard/Profile tabs render greyed with SOON until their phases ship (no dead buttons). Avatar header shows placeholder "Player" until Phase 2 identity. Total Score chip reads a localStorage best (tiny nicety ahead of Phase 2 persistence).
- **Duel screens from the mock (VS, code, result table) belong to Phase 4** — they'll be built in this design system then.

## Modes build (Daily / async duels / live duels)

- **Backend pulled forward.** Daily + duels need server-side judging, so Express + better-sqlite3 + `/content/problems/*.json` loader + identity landed here (spec §5–§7). Streak mode logic untouched (still client-judged; migrating it to the API is a later cleanup).
- **Content bank: 15 problems** (the 5 originals + 10 new, all hand-verified). Rematch "5 NEW problems" needs a bank > 10; the full 40-problem seed remains open work.
- **Two-stage answer endpoint.** `POST .../answer` without `diagnosis` judges the catch (one attempt, locked in); a second call with `diagnosis` completes it. One endpoint per spec, but the client can't probe steps — the first tap consumes the attempt.
- **Daily refresh mid-diagnosis = partial (40).** A caught-but-undiagnosed row is finalized as partial on the next GET, so reloading to google the reason earns nothing extra.
- **Daily share format** `GALTI #N 🟢🔴 12.4s`: first emoji = catch, second = diagnosis. Launch date (GALTI #1) is `DAILY_LAUNCH_DATE` in `server/config.js` = 2026-07-25. Rollover at midnight IST; `?_date=` override exists in dev only, for testing.
- **No streak multiplier in daily/duel rounds** — rounds score independently (100 + 50 + 2/sec); §3's multiplier belongs to Streak mode. Partial = flat 40.
- **Duel codes: 5 chars** (no 0/O/1/I/L), matching the mock's A7K9B. Open duels expire after 24h; completed duels are viewable forever.
- **Rematch makes the requester the new creator** — they play their 5 fresh rounds first, then share back, mirroring the original flow.
- **Duel round-summary table**: per side, time (green = caught, red = missed) plus paired ✓/✗ for catch·diagnosis — keeps all §2 info inside 390px.
- **Gate note:** "two browser profiles" simulated as two identities via separate localStorage states in one Chrome (automation can't drive real profiles); server-side checks (same daily problem, 409 on second attempt, stripped payloads, hidden creator scores) verified at the API layer, which is what the network tab would show.

## Live Duel (Phase C)

- **Rooms are in-memory** (Map on the server) — a server restart drops live games. Fine at this scale; no DB rows for live matches.
- **Server-authoritative everywhere**: clients emit taps; the server judges them, decides who locked first, holds the 45s round clock, and pushes results. The client countdown is display-only.
- **Wrong catch locks THAT player out of the round** (mirror of Streak's life loss); both wrong → "kisi ne nahi pakdi", no points.
- **Winner's diagnosis is stall-proofed**: 25s to answer, else the round closes as partial (40).
- **5s reveal between rounds**, server-timed, so both phones stay in sync without a "next" button.
- **No reconnection**: a dropped socket can't rejoin its room — after the 15s grace the opponent wins by default. True resume support is future work.
- **Both players see the explanation** after every round — the learning moment survives even in the competitive mode.
