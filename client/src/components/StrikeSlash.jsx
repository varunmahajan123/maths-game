import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Diagonal red strike across the whole attempt after a wrong catch.
// Slightly bowed, jittered line — same pen, same haste.

function buildStrikePath(w, h) {
  const x0 = w * 0.06;
  const y0 = h * 0.1;
  const x1 = w * 0.94;
  const y1 = h * 0.9;
  const seed = Math.random();
  const N = 10;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const bow = Math.sin(p * Math.PI) * (10 + seed * 8); // bows below the straight line
    pts.push([x0 + (x1 - x0) * p, y0 + (y1 - y0) * p + bow]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const mx = (x + pts[i + 1][0]) / 2;
    const my = (y + pts[i + 1][1]) / 2;
    d += ` Q ${x.toFixed(1)} ${y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  return d;
}

export default function StrikeSlash({ width, height, delay = 0.45 }) {
  const d = useMemo(() => buildStrikePath(width, height), [width, height]);
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-20"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      <motion.path
        d={d}
        fill="none"
        stroke="#E5484D"
        strokeWidth="5"
        strokeLinecap="round"
        pathLength="1"
        strokeDasharray="1"
        initial={{ strokeDashoffset: 1 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.25, delay, ease: 'easeIn' }}
      />
    </svg>
  );
}
