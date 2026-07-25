import { ROUND_MS } from './config.js';

// Scoring per spec §3. Single-round modes (daily, duel rounds) carry no streak
// multiplier — that belongs to Streak mode.
export function errorStepOf(problem) {
  return problem.steps.find((s) => !s.correct);
}

// What the client may see BEFORE answering. Never includes correct flags,
// error types, explanations, notes, or the correct diagnosis.
export function stripProblem(problem) {
  return {
    id: problem.id,
    problem_latex: problem.problem_latex,
    steps: problem.steps.map((s) => ({ n: s.n, latex: s.latex })),
    diagnosis_options: problem.diagnosis_options,
  };
}

// Full verdict payload, only ever sent after the attempt is locked in.
export function verdictPayload(problem) {
  const err = errorStepOf(problem);
  return {
    errorStep: { n: err.n, latex: err.latex, explanation: err.explanation },
    correct_diagnosis: problem.correct_diagnosis,
  };
}

export function scoreFull(timeMs) {
  const secondsLeft = Math.max(0, Math.floor((ROUND_MS - timeMs) / 1000));
  const breakdown = { catch: 100, diagnosis: 50, speed: 2 * secondsLeft, multiplier: 1 };
  return { ...breakdown, total: breakdown.catch + breakdown.diagnosis + breakdown.speed };
}

export const SCORE_PARTIAL = 40;
