// One row per stroke in `marks`, never updated or deleted. Everything else
// that changes (the handle salt, a browser's last visit) lives in its own
// table, so the append-only promise only has to be kept in one place.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes, randomInt } from "node:crypto";
import { defaultPath, seedForId, shapePath } from "../public/lib/shapes.js";
import type { Geometry, Point } from "./marks.ts";
import { residentName } from "./resident-hands.ts";

// What a stroke looks like to anyone but the server: `hand` (the secret
// cookie value) is replaced by `handle`, a one-way digest of it.
export interface PublicMark {
  id: number;
  handle: string;
  note: string;
  color: string;
  createdAt: string;
  path: Point[];
  seed: number;
  resident?: string;
  hash: string;
}

interface Row {
  id: number;
  hand: string;
  note: string;
  color: string;
  createdAt: string;
  path: string | null;
  seed: number | null;
  hash?: string | null;
}

const dbPath = process.env.DATA_DIR
  ? `${process.env.DATA_DIR}/scroll.db`
  : fileURLToPath(new URL("../data/scroll.db", import.meta.url));

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hand TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chain (
    mark_id INTEGER PRIMARY KEY,
    hash TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS last_seen (
    hand TEXT PRIMARY KEY,
    seen_at TEXT NOT NULL
  );
`);

// Strokes from before paths existed keep their rows untouched: the new
// columns are added empty, and such a row's seed and path are derived from
// its id on every read (see toPublic), deterministically.
const columns = (db.prepare("PRAGMA table_info(marks)").all() as { name: string }[]).map(
  (c) => c.name,
);
if (!columns.includes("path")) db.exec("ALTER TABLE marks ADD COLUMN path TEXT");
if (!columns.includes("seed")) db.exec("ALTER TABLE marks ADD COLUMN seed INTEGER");

// The handle salt is minted once and kept, so a hand's handle is stable
// across restarts and redeploys, and existing rows get handles without being
// touched: the handle is derived on every read, never stored on the stroke.
function salt(): string {
  const row = db.prepare("SELECT value FROM meta WHERE key = 'handle-salt'").get() as
    | { value: string }
    | undefined;
  if (row) return row.value;
  const value = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO meta (key, value) VALUES ('handle-salt', ?)").run(value);
  return value;
}
const HANDLE_SALT = salt();

export function handleFor(hand: string): string {
  return createHash("sha256").update(`${HANDLE_SALT}:${hand}`).digest("hex").slice(0, 12);
}

const insertStmt = db.prepare(
  "INSERT INTO marks (hand, note, color, created_at, path, seed) VALUES (?, ?, ?, ?, ?, ?)",
);
const COLUMNS = "id, hand, note, color, created_at AS createdAt, path, seed";
const CHAIN_JOIN = "LEFT JOIN chain ON chain.mark_id = marks.id";
const SELECT = `SELECT ${COLUMNS.replace("id,", "marks.id AS id,")}, chain.hash AS hash FROM marks ${CHAIN_JOIN}`;
const selectAllStmt = db.prepare(`${SELECT} ORDER BY marks.id ASC`);
const selectAfterStmt = db.prepare(`${SELECT} WHERE marks.id > ? ORDER BY marks.id ASC`);

function toPublic(row: Row): PublicMark {
  const seed = row.seed ?? seedForId(row.id);
  const mark = {
    id: row.id,
    handle: handleFor(row.hand),
    note: row.note,
    color: row.color,
    createdAt: row.createdAt,
    path: row.path ? (JSON.parse(row.path) as Point[]) : (defaultPath(seed) as Point[]),
    seed,
    ...(residentName(row.hand) ? { resident: residentName(row.hand)! } : {}),
  };
  return { ...mark, hash: row.hash ?? "" };
}

// The hash chain: each stroke's link is sha256(previous link + the stroke's
// public fields), so a visitor's browser can recompute the whole chain from
// what /api/marks serves and see that nothing before the newest stroke has
// changed. Kept in its own append-only table; strokes from before the chain
// existed are linked once, in order, at startup.
export const GENESIS = "long-scroll";

export function canonical(m: Omit<PublicMark, "hash" | "resident">): string {
  return JSON.stringify([m.id, m.handle, m.note, m.color, m.createdAt, m.path, m.seed]);
}

function link(prev: string, m: Omit<PublicMark, "hash" | "resident">): string {
  return createHash("sha256").update(prev + canonical(m)).digest("hex");
}

const headStmt = db.prepare("SELECT hash FROM chain ORDER BY mark_id DESC LIMIT 1");
const insertLinkStmt = db.prepare("INSERT INTO chain (mark_id, hash) VALUES (?, ?)");
const head = (): string => (headStmt.get() as { hash: string } | undefined)?.hash ?? GENESIS;

for (const row of db.prepare(`${SELECT} WHERE chain.hash IS NULL ORDER BY marks.id ASC`).all() as unknown as Row[]) {
  insertLinkStmt.run(row.id, link(head(), toPublic(row)));
}

export function addMark(hand: string, note: string, color: string, geometry: Geometry): PublicMark {
  const createdAt = new Date().toISOString();
  const seed = randomInt(1, 2 ** 31 - 1);
  const path = "path" in geometry ? geometry.path : (shapePath(geometry.shape, seed) as Point[]);
  const pathJson = JSON.stringify(path);
  const result = insertStmt.run(hand, note, color, createdAt, pathJson, seed);
  const row: Row = { id: Number(result.lastInsertRowid), hand, note, color, createdAt, path: pathJson, seed };
  const hash = link(head(), toPublic(row));
  insertLinkStmt.run(row.id, hash);
  return toPublic({ ...row, hash });
}

export function listMarks(): PublicMark[] {
  return (selectAllStmt.all() as unknown as Row[]).map(toPublic);
}

export function listMarksAfter(id: number): PublicMark[] {
  return (selectAfterStmt.all(id) as unknown as Row[]).map(toPublic);
}

// When a browser last had the scroll open, keyed by its secret hand and only
// ever told back to that same browser. This table is updated freely; it is
// not the scroll.
const getSeenStmt = db.prepare("SELECT seen_at AS seenAt FROM last_seen WHERE hand = ?");
const putSeenStmt = db.prepare(
  "INSERT INTO last_seen (hand, seen_at) VALUES (?, ?) ON CONFLICT(hand) DO UPDATE SET seen_at = excluded.seen_at",
);

export function lastSeen(hand: string): string | null {
  return (getSeenStmt.get(hand) as { seenAt: string } | undefined)?.seenAt ?? null;
}

export function markSeen(hand: string): void {
  putSeenStmt.run(hand, new Date().toISOString());
}

const countSinceStmt = db.prepare("SELECT COUNT(*) AS n FROM marks WHERE created_at > ?");
const countResidentStmt = db.prepare(
  "SELECT COUNT(*) AS n FROM marks WHERE created_at > ? AND hand LIKE 'resident:%'",
);
const lastResidentStmt = db.prepare(
  "SELECT MAX(created_at) AS at FROM marks WHERE hand LIKE 'resident:%'",
);

export const countSince = (iso: string): number => (countSinceStmt.get(iso) as { n: number }).n;
export const countResidentSince = (iso: string): number =>
  (countResidentStmt.get(iso) as { n: number }).n;
export const lastResidentAt = (): string | null =>
  (lastResidentStmt.get() as { at: string | null }).at;
