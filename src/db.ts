// One row per stroke in `marks`, never updated or deleted. Everything else
// that changes (the handle salt, a browser's last visit) lives in its own
// table, so the append-only promise only has to be kept in one place.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash, randomBytes } from "node:crypto";

// What a stroke looks like to anyone but the server: `hand` (the secret
// cookie value) is replaced by `handle`, a one-way digest of it.
export interface PublicMark {
  id: number;
  handle: string;
  note: string;
  color: string;
  createdAt: string;
}

interface Row {
  id: number;
  hand: string;
  note: string;
  color: string;
  createdAt: string;
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
  "INSERT INTO marks (hand, note, color, created_at) VALUES (?, ?, ?, ?)",
);
const COLUMNS = "id, hand, note, color, created_at AS createdAt";
const selectAllStmt = db.prepare(`SELECT ${COLUMNS} FROM marks ORDER BY id ASC`);
const selectAfterStmt = db.prepare(`SELECT ${COLUMNS} FROM marks WHERE id > ? ORDER BY id ASC`);

function toPublic(row: Row): PublicMark {
  return {
    id: row.id,
    handle: handleFor(row.hand),
    note: row.note,
    color: row.color,
    createdAt: row.createdAt,
  };
}

export function addMark(hand: string, note: string, color: string): PublicMark {
  const createdAt = new Date().toISOString();
  const result = insertStmt.run(hand, note, color, createdAt);
  return toPublic({ id: Number(result.lastInsertRowid), hand, note, color, createdAt });
}

export function listMarks(): PublicMark[] {
  return (selectAllStmt.all() as unknown as Row[]).map(toPublic);
}

export function listMarksAfter(id: number): PublicMark[] {
  return (selectAfterStmt.all(id) as unknown as Row[]).map(toPublic);
}
