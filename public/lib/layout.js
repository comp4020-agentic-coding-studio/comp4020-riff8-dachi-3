// Where each stroke stands along the scroll. Distance is time, softened: the
// gap before a stroke grows with the log of the hours since the one before,
// so a quiet week reads as a long stretch of empty paper without making a
// busy afternoon a crowd.
import { prng } from "./shapes.js";

export const SPACING = 2.5;
const GAP_PER_LOG_HOUR = 1.3;
const MAX_GAP = 9;

export function gapFor(ms) {
  const hours = Math.max(0, ms) / 3_600_000;
  return SPACING + Math.min(MAX_GAP, GAP_PER_LOG_HOUR * Math.log1p(hours));
}

export function layout(marks, now = Date.now()) {
  const positions = [];
  let x = 0;
  let prev = null;
  for (const mark of marks) {
    const t = Date.parse(mark.createdAt);
    if (prev !== null) x += gapFor(t - prev);
    prev = t;
    const r = prng(mark.seed ^ 0x5bd1e995);
    positions.push({ x: x + (r() - 0.5) * 0.4, z: (r() - 0.5) * 2.4 - 0.3, t });
  }
  const last = positions.length ? positions[positions.length - 1].x : 0;
  const openEnd = last + (prev === null ? 0 : gapFor(now - prev)) + SPACING;
  return { positions, start: positions.length ? positions[0].x : 0, openEnd };
}

// The stroke nearest a position along the scroll, as an index.
export function nearestIndex(positions, x) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const d = Math.abs(positions[i].x - x);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}
