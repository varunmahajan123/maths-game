import { useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Latex from './Latex';
import RedCircle from './RedCircle';
import StrikeSlash from './StrikeSlash';

// The answer sheet: numbered full-width dark cards, ≥56px tap targets.
// Spacing IS gameplay — a mistap is fatal.

export default function StepSheet({ steps, tappedStepN, verdictKind, onTapStep, disabled }) {
  const sheetRef = useRef(null);
  const stepRefs = useRef({});
  const [circleBox, setCircleBox] = useState(null);
  const [sheetBox, setSheetBox] = useState(null);
  const isMiss = verdictKind === 'miss';

  useLayoutEffect(() => {
    if (tappedStepN == null) {
      setCircleBox(null);
      return;
    }
    const el = stepRefs.current[tappedStepN];
    if (el) {
      setCircleBox({
        top: el.offsetTop,
        left: el.offsetLeft,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    }
    if (isMiss && sheetRef.current) {
      setSheetBox({
        width: sheetRef.current.offsetWidth,
        height: sheetRef.current.offsetHeight,
      });
    }
  }, [tappedStepN, isMiss]);

  return (
    <motion.div
      ref={sheetRef}
      className="relative flex flex-col gap-3"
      animate={
        isMiss
          ? { x: [0, -4, 4, -3, 0], transition: { duration: 0.3, delay: 0.3 } }
          : { x: 0 }
      }
    >
      {steps.map((step) => {
        const tapped = step.n === tappedStepN;
        return (
          <div key={step.n} className="relative">
            <button
              ref={(el) => (stepRefs.current[step.n] = el)}
              onClick={() => onTapStep(step.n)}
              disabled={disabled}
              className={`card flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-transform duration-75 active:scale-[0.985] active:bg-card2 disabled:active:scale-100 ${
                tapped && isMiss ? 'step-wrong' : ''
              }`}
            >
              <span className="shrink-0 text-xs font-semibold text-muted">{step.n}.</span>
              <span className="step-math min-w-0 flex-1">
                <Latex tex={step.latex} />
              </span>
            </button>

            {tapped && circleBox && (
              <>
                <RedCircle
                  width={circleBox.width}
                  height={circleBox.height}
                  wobble={isMiss}
                />
                {verdictKind === 'caught' && (
                  <motion.span
                    className="pointer-events-none absolute -right-1 -top-4 z-10 font-hand text-4xl font-bold text-brand"
                    initial={{ scale: 3, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.28 }}
                  >
                    ✓
                  </motion.span>
                )}
              </>
            )}
          </div>
        );
      })}

      {isMiss && sheetBox && (
        <StrikeSlash width={sheetBox.width} height={sheetBox.height} />
      )}
    </motion.div>
  );
}
