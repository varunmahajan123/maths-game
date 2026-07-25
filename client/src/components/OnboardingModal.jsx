import { useState } from 'react';
import { motion } from 'framer-motion';
import { createIdentity } from '../api';
import { copy } from '../copy';

const EMOJIS = ['🧑🏽‍🏫', '👩🏻‍🎓', '🤓', '😎', '🦊', '🐼', '🦁', '👻', '🤖', '🐯', '🌸', '⚡'];

// The whole identity system: a name + an emoji. No signup, no passwords.
export default function OnboardingModal({ onDone }) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      onDone(await createIdentity(name.trim(), emoji));
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] items-end bg-black/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <motion.form
        onSubmit={submit}
        className="card w-full p-5"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        <p className="font-hand text-4xl font-bold text-fg">{copy.onboarding.title}</p>
        <p className="mt-1 text-sm text-muted">{copy.onboarding.sub}</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.onboarding.namePlaceholder}
          maxLength={24}
          autoFocus
          className="mt-4 w-full rounded-xl border border-line bg-card2 px-4 py-3 font-semibold text-fg placeholder:text-muted focus:border-gold focus:outline-none"
        />

        <div className="mt-3 grid grid-cols-6 gap-2">
          {EMOJIS.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setEmoji(e)}
              className={`flex h-12 items-center justify-center rounded-xl border text-2xl transition-transform active:scale-90 ${
                e === emoji ? 'border-gold bg-gold/15' : 'border-line bg-card2'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-brand">{copy.onboarding.error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-4 min-h-14 w-full rounded-2xl bg-gold font-extrabold text-[#1A1400] transition-transform duration-75 active:scale-[0.98] disabled:opacity-40"
        >
          {copy.onboarding.go}
        </button>
      </motion.form>
    </div>
  );
}
