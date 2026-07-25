import { useCallback, useMemo, useReducer } from 'react';
import { problems, errorStepOf } from './problems';
import { scoreRound, STARTING_LIVES, ROUND_SECONDS } from './scoring';

// Phases: playing → catchAnim → diagnosing → verdict → (next round | over)
//                 → missAnim  →            verdict → …

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function freshRound(order, idx) {
  const problem = order[idx % order.length];
  return {
    problem,
    diagnosisOrder: shuffled(problem.diagnosis_options),
    caughtStepN: null,
    tappedStepN: null,
    secondsLeftAtCatch: 0,
    verdict: null, // 'full' | 'partial' | 'miss' | 'timeout'
    pickedDiagnosis: null,
    roundScore: null,
  };
}

function initState() {
  const order = shuffled(problems);
  return {
    order,
    roundIdx: 0,
    roundNumber: 1,
    phase: 'playing',
    lives: STARTING_LIVES,
    score: 0,
    streak: 0, // consecutive fully-correct; feeds the multiplier
    bestStreak: 0,
    fullCatches: 0,
    roundsPlayed: 0,
    roundResults: [], // 'full' | 'partial' | 'miss' | 'timeout' per played round (progress pills)
    ...freshRound(order, 0),
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'TAP_STEP': {
      if (state.phase !== 'playing') return state;
      const errStep = errorStepOf(state.problem);
      if (action.n === errStep.n) {
        return {
          ...state,
          phase: 'catchAnim',
          caughtStepN: action.n,
          tappedStepN: action.n,
          secondsLeftAtCatch: action.secondsLeft,
        };
      }
      // wrong step: circle draws + wobbles + strike, then verdict
      return { ...state, phase: 'missAnim', tappedStepN: action.n, verdict: 'miss' };
    }

    case 'CATCH_ANIM_DONE':
      if (state.phase !== 'catchAnim') return state;
      return { ...state, phase: 'diagnosing' };

    case 'MISS_ANIM_DONE': {
      if (state.phase !== 'missAnim') return state;
      const roundScore = scoreRound('miss', 0, state.streak);
      return {
        ...state,
        phase: 'verdict',
        lives: state.lives - 1,
        streak: 0,
        roundsPlayed: state.roundsPlayed + 1,
        roundResults: [...state.roundResults, 'miss'],
        roundScore,
      };
    }

    case 'TIMEOUT': {
      if (state.phase !== 'playing') return state;
      const roundScore = scoreRound('timeout', 0, state.streak);
      return {
        ...state,
        phase: 'verdict',
        verdict: 'timeout',
        lives: state.lives - 1,
        streak: 0,
        roundsPlayed: state.roundsPlayed + 1,
        roundResults: [...state.roundResults, 'timeout'],
        roundScore,
      };
    }

    case 'PICK_DIAGNOSIS': {
      if (state.phase !== 'diagnosing') return state;
      const full = action.diagnosis === state.problem.correct_diagnosis;
      const verdict = full ? 'full' : 'partial';
      const roundScore = scoreRound(verdict, state.secondsLeftAtCatch, state.streak);
      const streak = full ? state.streak + 1 : 0; // partial: multiplier resets, life survives
      return {
        ...state,
        phase: 'verdict',
        verdict,
        pickedDiagnosis: action.diagnosis,
        score: state.score + roundScore.total,
        streak,
        bestStreak: Math.max(state.bestStreak, streak),
        fullCatches: state.fullCatches + (full ? 1 : 0),
        roundsPlayed: state.roundsPlayed + 1,
        roundResults: [...state.roundResults, verdict],
        roundScore,
      };
    }

    case 'NEXT': {
      if (state.phase !== 'verdict') return state;
      if (state.lives <= 0) return { ...state, phase: 'over' };
      const nextIdx = state.roundIdx + 1;
      const order =
        nextIdx % state.order.length === 0 ? shuffled(state.order) : state.order;
      return {
        ...state,
        order,
        roundIdx: nextIdx,
        roundNumber: state.roundNumber + 1,
        phase: 'playing',
        ...freshRound(order, nextIdx),
      };
    }

    case 'RESTART':
      return initState();

    default:
      return state;
  }
}

export function useRoundEngine() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);

  const api = useMemo(
    () => ({
      tapStep: (n, secondsLeft) => dispatch({ type: 'TAP_STEP', n, secondsLeft }),
      catchAnimDone: () => dispatch({ type: 'CATCH_ANIM_DONE' }),
      missAnimDone: () => dispatch({ type: 'MISS_ANIM_DONE' }),
      pickDiagnosis: (diagnosis) => dispatch({ type: 'PICK_DIAGNOSIS', diagnosis }),
      timeout: () => dispatch({ type: 'TIMEOUT' }),
      next: () => dispatch({ type: 'NEXT' }),
      restart: () => dispatch({ type: 'RESTART' }),
    }),
    []
  );

  return { state, ...api, ROUND_SECONDS };
}
