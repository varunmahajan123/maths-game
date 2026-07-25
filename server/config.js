export const PORT = process.env.PORT || 3001;

// Daily Galti #1 = this IST date. GALTI #N in the share text counts from here.
export const DAILY_LAUNCH_DATE = '2026-07-25';

export const ROUND_MS = 45_000;

// Open (unaccepted) duels expire after this; completed duels live forever.
export const DUEL_TTL_MS = 24 * 60 * 60 * 1000;

// Below this many daily players, show "be one of the first" instead of a percentage.
export const DAILY_MIN_PLAYERS_FOR_PCT = 5;
