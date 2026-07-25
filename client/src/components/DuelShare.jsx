import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { copy } from '../copy';

// Share screen for a freshly created (or still-waiting) duel.
export default function DuelShare({ code, waiting }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/duel/${code}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(copy.duel.waText(link))}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col justify-center bg-bg px-5">
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.15 }}>
        <p className="text-center font-hand text-5xl font-bold text-fg">
          {waiting ? copy.duel.waitingTitle : copy.duel.shareTitle}
        </p>
        <p className="mt-1 text-center text-sm text-muted">
          {waiting ? copy.duel.waitingSub : copy.duel.shareSub}
        </p>

        <div className="card mt-6 px-4 py-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">
            {copy.duel.codeLabel}
          </p>
          <p className="mt-2 text-4xl font-extrabold tracking-[0.35em] text-fg">{code}</p>
          <p className="mt-2 text-xs text-muted">{copy.duel.expiresNote}</p>
        </div>

        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand font-extrabold text-white transition-transform duration-75 active:scale-[0.98]"
        >
          {copy.duel.waBtn} 📤
        </a>
        <button
          onClick={() => navigator.clipboard?.writeText(link).then(() => setCopied(true))}
          className="card mt-3 min-h-12 w-full rounded-2xl font-semibold text-fg transition-transform duration-75 active:scale-[0.98]"
        >
          {copied ? copy.duel.copiedLink : copy.duel.copyLink}
        </button>
        <button
          onClick={() => navigate('/')}
          className="mt-3 min-h-12 w-full rounded-2xl font-semibold text-muted"
        >
          {copy.runOver.home}
        </button>
      </motion.div>
    </div>
  );
}
