// Living Ink: how a stroke has grown since it was laid down, as a pure
// function of its seed and its age in whole minutes. No server simulation,
// no stored state: any two windows that agree on the time draw exactly the
// same tendrils, because everything comes from one integer-seeded PRNG.
//
// Growth runs on a log clock, so something always happens in the first hour
// and something is still happening after a month:
//   tendrils  thin branches sprouting from the stroke, one at a time, then
//             lengthening and forking, like plum branches in ink
//   blossoms  pale dots of the stroke's own pigment opening at branch tips
//   settle    0 → 1, the pigment sinking into the paper: a wider, paler
//             wash and a slightly greyer colour (the shader reads it)
import { prng } from "./shapes.js";

const MAX_TENDRILS = 6;

export function growth(seed, ageMinutes) {
  const minutes = Math.max(0, Math.floor(ageMinutes));
  const stage = Math.log2(1 + minutes / 30); // 1 at 30 min, ~5.6 at a day, ~10.4 at a month
  const r = prng(seed ^ 0x2545f491);
  const tendrils = [];
  for (let i = 0; i < MAX_TENDRILS; i++) {
    // each tendril has a birth stage drawn once, so they appear one by one
    const born = 0.6 + i * 1.3 + r() * 0.9;
    const at = 0.15 + r() * 0.7;
    const side = r() < 0.5 ? -1 : 1;
    const angle = (0.35 + r() * 0.7) * side;
    const curl = (r() - 0.5) * 2.2;
    const forkAt = 0.45 + r() * 0.3;
    const forkAngle = (0.4 + r() * 0.5) * -side;
    const reach = 0.35 + r() * 0.45;
    const blossoms = 1 + Math.floor(r() * 3);
    if (stage < born) continue;
    const grown = Math.min(1, (stage - born) / 3);
    tendrils.push({
      at,
      angle,
      curl,
      length: reach * grown,
      fork: grown > 0.6 ? { at: forkAt, angle: forkAngle, length: reach * 0.5 * (grown - 0.6) / 0.4 } : null,
      blossoms: grown >= 1 ? Math.min(blossoms, Math.floor(stage - born - 2) + 1) : 0,
    });
  }
  return {
    tendrils,
    settle: Math.round((1 - Math.exp(-minutes / (60 * 24 * 10))) * 100) / 100,
  };
}

// A short string that changes whenever the drawing would, so a scene only
// rebuilds a stroke's growth when there is something new to show.
export function signature(g) {
  return (
    g.tendrils.map((t) => `${Math.round(t.length * 50)}.${t.fork ? Math.round(t.fork.length * 50) : 0}.${t.blossoms}`).join("|") +
    `/${Math.round(g.settle * 20)}`
  );
}

// Anniversary echoes: a stroke glows for the twelve hours either side of its
// first day, week, month and year.
const ANNIVERSARIES = [
  [60 * 24, "one-day"],
  [60 * 24 * 7, "one-week"],
  [60 * 24 * 30, "one-month"],
  [60 * 24 * 365, "one-year"],
];

export function anniversary(ageMinutes) {
  for (const [at, name] of ANNIVERSARIES) if (Math.abs(ageMinutes - at) <= 720) return name;
  return null;
}
