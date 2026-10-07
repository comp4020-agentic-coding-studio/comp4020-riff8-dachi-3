// Shared by the browser and the server (src/db.ts and src/marks.ts import
// it): a stroke's path is a short polyline of integer points in a BOX×BOX
// square, y pointing down, as drawn on the pad. Everything here is a pure
// function of its arguments, so two windows and the server agree exactly.

export const BOX = 1000;
export const MAX_POINTS = 96;
export const SHAPES = ["wave", "peak", "hook", "loop", "dot", "line"];

// mulberry32: a tiny integer-seeded PRNG, identical in every JS engine.
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A seed for a row that predates seeds: a fixed integer hash of its id.
export function seedForId(id) {
  return (Math.imul(id, 2654435761) >>> 1) || 1;
}

const clamp = (v) => Math.max(0, Math.min(BOX, Math.round(v)));

function sample(n, f) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = f(n === 1 ? 0 : i / (n - 1));
    out.push([clamp(x), clamp(y)]);
  }
  return out;
}

export function shapePath(shape, seed) {
  const r = prng(seed);
  const j = (amount) => (r() - 0.5) * 2 * amount;
  switch (shape) {
    case "wave": {
      const cycles = 1.2 + r() * 1.3;
      const amp = 110 + r() * 120;
      const phase = r() * Math.PI;
      const y0 = 480 + j(60);
      return sample(48, (t) => [140 + t * 720, y0 + amp * Math.sin(phase + t * cycles * 2 * Math.PI)]);
    }
    case "peak": {
      const top = 170 + r() * 160;
      const apex = 420 + j(120);
      return sample(40, (t) => {
        const x = 150 + t * 700;
        const k = x < apex ? (x - 150) / (apex - 150) : (850 - x) / (850 - apex);
        return [x, 820 - (820 - top) * Math.sin((k * Math.PI) / 2)];
      });
    }
    case "hook": {
      const x0 = 480 + j(80);
      const curl = 150 + r() * 120;
      return sample(44, (t) => {
        if (t < 0.65) return [x0 + j(4), 150 + (t / 0.65) * 560];
        const a = ((t - 0.65) / 0.35) * Math.PI * 1.1;
        return [x0 - curl / 2 + (curl / 2) * Math.cos(a), 710 + (curl / 2) * Math.sin(a)];
      });
    }
    case "loop": {
      const rad = 130 + r() * 90;
      const y0 = 520 + j(60);
      return sample(64, (t) => {
        const a = t * Math.PI * 2 + Math.PI / 2;
        return [200 + t * 600 - rad * Math.cos(a), y0 - rad * Math.sin(a) + rad];
      });
    }
    case "dot": {
      const cx = 500 + j(120);
      const cy = 520 + j(120);
      const rad = 18 + r() * 22;
      return sample(10, (t) => [cx + rad * t * Math.cos(t * 9), cy + rad * t * Math.sin(t * 9)]);
    }
    case "line":
    default: {
      const tilt = j(160);
      const sag = j(60);
      return sample(24, (t) => [150 + t * 700, 500 + tilt * (t - 0.5) * 2 + sag * Math.sin(t * Math.PI)]);
    }
  }
}

// The deterministic default for a stroke drawn before paths existed.
export function defaultPath(seed) {
  return shapePath(SHAPES[seed % SHAPES.length], seed);
}

export function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
  }
  return total;
}

// Squash a raw pad stroke (any number of float points) into at most
// MAX_POINTS integer points spaced evenly along its length.
export function simplify(points, max = MAX_POINTS) {
  const pts = points.map(([x, y]) => [clamp(x), clamp(y)]);
  if (pts.length <= max) return dedupe(pts);
  const total = pathLength(pts);
  const step = total / (max - 1);
  const out = [pts[0]];
  let carried = 0;
  for (let i = 1; i < pts.length && out.length < max - 1; i++) {
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i];
    let seg = Math.hypot(bx - ax, by - ay);
    let start = 0;
    while (carried + (seg - start) >= step && out.length < max - 1) {
      start += step - carried;
      carried = 0;
      const k = start / seg;
      out.push([clamp(ax + (bx - ax) * k), clamp(ay + (by - ay) * k)]);
    }
    carried += seg - start;
  }
  out.push(pts[pts.length - 1]);
  return dedupe(out);
}

function dedupe(pts) {
  return pts.filter((p, i) => i === 0 || p[0] !== pts[i - 1][0] || p[1] !== pts[i - 1][1]);
}
