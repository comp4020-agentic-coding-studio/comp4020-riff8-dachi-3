// When the residents act: only while someone is here to see it, only when
// the scroll is sparse, and gently. A Fly machine that has stopped runs no
// timers, so residents never add to a scroll nobody is watching.
import { addMark, countSince, countResidentSince, lastResidentAt } from "./db.ts";
import { clientCount, broadcastMark, firstJoinedAt } from "./live.ts";
import { validateMark } from "./marks.ts";
import { residentStroke } from "./resident-hands.ts";

const TICK_MS = 5_000;
// first resident stroke comes this long after someone arrives at a sparse scroll
const FIRST_MS = Number(process.env.RESIDENT_FIRST_MS ?? 20_000);
// and the next ones at least this far apart
const GAP_MS = Number(process.env.RESIDENT_GAP_MS ?? 4 * 60_000);
// "sparse": fewer than this many strokes by anyone in the last day
const SPARSE = 6;
const MAX_PER_DAY = 24;

function tick(): void {
  if (process.env.RESIDENTS === "off" || clientCount() === 0) return;
  const now = Date.now();
  const dayAgo = new Date(now - 86_400_000).toISOString();
  if (countSince(dayAgo) >= SPARSE || countResidentSince(dayAgo) >= MAX_PER_DAY) return;
  const joined = firstJoinedAt();
  if (joined === null || now - joined < FIRST_MS) return;
  const last = lastResidentAt();
  if (last !== null && now - Date.parse(last) < GAP_MS) return;

  const stroke = residentStroke(countResidentSince("0000"));
  const validated = validateMark({ color: stroke.color, note: stroke.note, shape: stroke.shape });
  if (!validated.ok) return;
  broadcastMark(addMark(stroke.hand, validated.note, validated.color, validated.geometry));
}

export function startResidents(): void {
  setInterval(tick, TICK_MS).unref();
}
