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
}

interface Row {
  id: number;
  hand: string;
  note: string;
  color: string;
  createdAt: string;
  path: string | null;
  seed: number | null;
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
const selectAllStmt = db.prepare(`SELECT ${COLUMNS} FROM marks ORDER BY id ASC`);
const selectAfterStmt = db.prepare(`SELECT ${COLUMNS} FROM marks WHERE id > ? ORDER BY id ASC`);

function toPublic(row: Row): PublicMark {
  const seed = row.seed ?? seedForId(row.id);
  return {
    id: row.id,
    handle: handleFor(row.hand),
    note: row.note,
    color: row.color,
    createdAt: row.createdAt,
    path: row.path ? (JSON.parse(row.path) as Point[]) : (defaultPath(seed) as Point[]),
    seed,
  };
}

export function addMark(hand: string, note: string, color: string, geometry: Geometry): PublicMark {
  const createdAt = new Date().toISOString();
  const seed = randomInt(1, 2 ** 31 - 1);
  const path = "path" in geometry ? geometry.path : (shapePath(geometry.shape, seed) as Point[]);
  const pathJson = JSON.stringify(path);
  const result = insertStmt.run(hand, note, color, createdAt, pathJson, seed);
  return toPublic({ id: Number(result.lastInsertRowid), hand, note, color, createdAt, path: pathJson, seed });
}

export function listMarks(): PublicMark[] {
  return (selectAllStmt.all() as unknown as Row[]).map(toPublic);
}

export function listMarksAfter(id: number): PublicMark[] {
  return (selectAfterStmt.all(id) as unknown as Row[]).map(toPublic);
}
