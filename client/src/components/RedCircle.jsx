import { useMemo } from 'react';
import { motion } from 'framer-motion';

// The signature element: a hand-drawn red pen circle around a step.
// A jittered ellipse path with overshoot, drawn via stroke-dashoffset in ~300ms.

function buildCirclePath(w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = Math.max(w / 2 - 10, 30);
  const ry = Math.max(h / 2 - 3, 16);

  const start = Math.PI * 0.65; // begin near 8 o'clock, like a real hasty circle
  const sweep = Math.PI * 2.3; // ~415°: the end overlaps the start
  const N = 26;
  const seed = Math.random() * Math.PI * 2; // no two circles identical

  const pts = [];
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const t = start + sweep * p;
    // low-frequency wobble + slight pen drift toward the end of the stroke
    const wob =
      1 +
      0.028 * Math.sin(3.1 * t + seed) +
      0.02 * Math.sin(5.3 * t + seed * 1.7);
    const drift = 3.5 * p;
    pts.push([
      cx + Math.cos(t) * rx * wob,
      cy + Math.sin(t) * ry * wob + drift * 0.6,
    ]);
  }

  // smooth: quadratic curves through midpoints
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const mx = (x1 + pts[i + 1][0]) / 2;
    const my = (y1 + pts[i + 1][1]) / 2;
    d += ` Q ${x1.toFixed(1)} ${y1.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d;
}

export default function RedCircle({ width, height, wobble = false }) {
  const d = useMemo(() => buildCirclePath(width, height), [width, height]);
  const pad = 14; // let the stroke breathe outside the step box

  return (
    <motion.svg
      className="pointer-events-none absolute z-10"
      style={{ left: -pad, top: -pad }}
      width={width + pad * 2}
      height={height + pad * 2}
      viewBox={`${-pad} ${-pad} ${width + pad * 2} ${height + pad * 2}`}
      animate={
        wobble
          ? { rotate: [0, -1.6, 1.4, -1, 0], transition: { duration: 0.4, delay: 0.3 } }
          : undefined
      }
    >
      <motion.path
        d={d}
        fill="none"
        stroke="#E5484D"
        strokeWidth="3.5"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        initial={{ strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}
