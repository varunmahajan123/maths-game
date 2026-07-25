// Exact numbers from the spec (§3). Tune later, in one place.

export const ROUND_SECONDS = 45;
export const CATCH_BASE = 100;
export const DIAGNOSIS_BONUS = 50;
export const SPEED_PER_SECOND = 2;
export const PARTIAL_FLAT = 40;
export const MULTIPLIER_STEP = 1.1;
export const MULTIPLIER_CAP = 2.0;
export const STARTING_LIVES = 3;

// streak = consecutive fully-correct rounds BEFORE this one
export function multiplierFor(streak) {
  return Math.min(MULTIPLIER_CAP, Math.pow(MULTIPLIER_STEP, streak));
}

// verdict: 'full' | 'partial' | 'miss' | 'timeout'
export function scoreRound(verdict, secondsLeft, streak) {
  if (verdict === 'full') {
    const mult = multiplierFor(streak);
    const catchPts = CATCH_BASE;
    const diagPts = DIAGNOSIS_BONUS;
    const speedPts = SPEED_PER_SECOND * Math.floor(secondsLeft);
    return {
      catch: catchPts,
      diagnosis: diagPts,
      speed: speedPts,
      multiplier: mult,
      total: Math.round((catchPts + diagPts + speedPts) * mult),
    };
  }
  if (verdict === 'partial') {
    return { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: PARTIAL_FLAT };
  }
  return { catch: 0, diagnosis: 0, speed: 0, multiplier: 1, total: 0 };
}
