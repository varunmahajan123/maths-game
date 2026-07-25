import { useState } from 'react';
import ServerRound from './ServerRound';
import { api } from '../api';
import { copy } from '../copy';

// Plays a duel's 5 rounds (creator or opponent — the API infers the role).
// startProgress > 0 resumes a half-finished set; those pills render neutral.
export default function DuelRounds({ code, rounds, startProgress = 0, onFinished }) {
  const [idx, setIdx] = useState(startProgress);
  const [results, setResults] = useState(Array(startProgress).fill('unknown'));

  if (idx >= rounds.length) return null;

  return (
    <ServerRound
      problem={rounds[idx]}
      headerLabel={copy.duel.headerLabel(idx + 1)}
      results={results}
      submitCatch={(p) =>
        api(`/duel/${code}/answer`, { method: 'POST', body: { ...p, round: idx } })
      }
      submitDiagnosis={(diagnosis) =>
        api(`/duel/${code}/answer`, { method: 'POST', body: { diagnosis, round: idx } })
      }
      doneLabel={idx === rounds.length - 1 ? copy.duel.finishToShare : copy.duel.nextRound}
      onDone={(result) => {
        setResults((r) => [...r, result.verdict]);
        if (idx === rounds.length - 1) onFinished();
        else setIdx(idx + 1);
      }}
    />
  );
}
