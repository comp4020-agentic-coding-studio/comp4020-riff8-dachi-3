// The live half of the app: one Server-Sent Events stream per open window.
// Strokes go out with an `id:` (their row id), so a reconnecting
// EventSource's Last-Event-ID replays whatever it missed straight from
// SQLite. Presence and pen trails carry no id: they are about now, and a
// reconnect simply gets the current state again.
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { listMarksAfter, type PublicMark } from "./db.ts";
import { isColor, type Point } from "./marks.ts";
import { BOX } from "../public/lib/shapes.js";

const MAX_CLIENTS = Number(process.env.MAX_SSE_CLIENTS ?? 100);
const BATCH_MS = 100;
// Fly's proxy closes a connection that has been silent for about a minute.
const KEEPALIVE_MS = 15_000;
// A window that hasn't said it's still here (POST /api/here) for this long
// is dropped, even if its socket never reported closing.
const PRESENCE_TIMEOUT_MS = 50_000;
// A pen trail nobody has added to for this long simply vanishes.
const PEN_IDLE_MS = 8_000;
const MAX_TRAIL_POINTS = 128;
const MAX_POINTS_PER_POST = 32;

interface Client {
  res: ServerResponse;
  pid: string;
  key: string;
  handle: string | null;
  joinedAt: number;
  lastBeat: number;
  pos: number;
  pen: { color: string; points: number; lastAt: number } | null;
}

const clients = new Map<string, Client>();
let queue: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function frame(event: string, data: unknown, id?: number): string {
  return `${id !== undefined ? `id: ${id}\n` : ""}event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function flush(): void {
  flushTimer = null;
  if (queue.length === 0) return;
  const chunk = queue.join("");
  queue = [];
  for (const client of clients.values()) client.res.write(chunk);
}

// Everything broadcast within one ~100 ms window leaves in one write per
// client, however many strokes or pen points arrived in it.
function broadcast(event: string, data: unknown, id?: number): void {
  queue.push(frame(event, data, id));
  flushTimer ??= setTimeout(flush, BATCH_MS);
}

// A stroke added by a window that was showing its pen trail replaces that
// trail: `from` tells other windows which glowing line becomes this ribbon.
export function broadcastMark(mark: PublicMark, from?: Client): void {
  broadcast("mark", from ? { ...mark, from: from.pid } : mark, mark.id);
  if (from?.pen) {
    from.pen = null;
    broadcastHere();
  }
}

// Presence says nothing about who someone is: no handle, just a window and
// where along the scroll it's looking.
export function presenceList(): { pid: string; pos: number; drawing: boolean }[] {
  return [...clients.values()].map(({ pid, pos, pen }) => ({ pid, pos, drawing: pen !== null }));
}

function broadcastHere(): void {
  broadcast("here", presenceList());
}

// When the longest-open window arrived, or null if nobody is here.
export function firstJoinedAt(): number | null {
  let first: number | null = null;
  for (const c of clients.values()) first = first === null ? c.joinedAt : Math.min(first, c.joinedAt);
  return first;
}

export function clientCount(): number {
  return clients.size;
}

export function clientForKey(key: unknown): Client | undefined {
  if (typeof key !== "string") return undefined;
  for (const client of clients.values()) if (client.key === key) return client;
  return undefined;
}

function lastEventId(req: IncomingMessage, url: URL): number {
  const raw = req.headers["last-event-id"] ?? url.searchParams.get("since") ?? "";
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isSafeInteger(n) && n >= 0 ? n : -1;
}

export function openStream(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  handle: string | null,
  onClose: () => void,
): void {
  if (clients.size >= MAX_CLIENTS) {
    res.writeHead(503, { "content-type": "text/plain", "retry-after": "10" });
    res.end("too many open windows right now");
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.write("retry: 2000\n\n");

  // Replay first, then join the broadcast set, all in one synchronous step:
  // nothing can be broadcast in between. A stroke that was both queued and
  // already in SQLite arrives twice; the client drops repeats by id.
  const since = lastEventId(req, url);
  if (since >= 0) {
    for (const mark of listMarksAfter(since)) res.write(frame("mark", mark, mark.id));
  }

  const client: Client = {
    res,
    pid: randomUUID().slice(0, 8),
    key: randomBytes(16).toString("hex"),
    handle,
    joinedAt: Date.now(),
    lastBeat: Date.now(),
    pos: 1,
    pen: null,
  };
  clients.set(client.pid, client);
  res.write(frame("hello", { pid: client.pid, key: client.key, here: presenceList() }));
  broadcastHere();

  const close = () => {
    if (!clients.delete(client.pid)) return;
    if (client.pen) broadcast("pen", { pid: client.pid, end: true });
    broadcastHere();
    onClose();
  };
  req.on("close", close);
  res.on("close", close);
  res.on("error", close);
}

export function heartbeat(client: Client, pos: unknown): void {
  client.lastBeat = Date.now();
  if (typeof pos === "number" && Number.isFinite(pos)) {
    const next = Math.max(0, Math.min(1, Math.round(pos * 1000) / 1000));
    if (Math.abs(next - client.pos) > 0.002) {
      client.pos = next;
      broadcastHere();
    }
  }
}

export type PenResult = { ok: true } | { ok: false; reason: "bad-pen" | "unknown-color" };

// Pen points are ephemeral: validated like a stroke's path (integers in the
// box, a capped count), relayed in the next batch, never stored.
export function penUpdate(client: Client, body: Record<string, unknown>): PenResult {
  client.lastBeat = Date.now();
  if (body.end === true) {
    if (client.pen) {
      client.pen = null;
      broadcast("pen", { pid: client.pid, end: true });
      broadcastHere();
    }
    return { ok: true };
  }
  if (!isColor(body.color)) return { ok: false, reason: "unknown-color" };
  const points = body.points;
  if (
    !Array.isArray(points) ||
    points.length < 1 ||
    points.length > MAX_POINTS_PER_POST ||
    !points.every(
      (p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isInteger(v) && v >= 0 && v <= BOX),
    )
  ) {
    return { ok: false, reason: "bad-pen" };
  }
  const start = body.start === true || client.pen === null;
  if (start) {
    client.pen = { color: body.color, points: 0, lastAt: Date.now() };
    broadcastHere();
  }
  const pen = client.pen!;
  const room = MAX_TRAIL_POINTS - pen.points;
  if (room <= 0) return { ok: true };
  const accepted = (points as Point[]).slice(0, room);
  pen.points += accepted.length;
  pen.lastAt = Date.now();
  pen.color = body.color;
  broadcast("pen", { pid: client.pid, color: pen.color, points: accepted, start });
  return { ok: true };
}

const keepalive = setInterval(() => {
  const now = Date.now();
  for (const client of clients.values()) {
    if (now - client.lastBeat > PRESENCE_TIMEOUT_MS) {
      client.res.end();
      client.res.emit("error", new Error("presence timed out"));
      continue;
    }
    client.res.write(": keepalive\n\n");
  }
}, KEEPALIVE_MS);
keepalive.unref();

const penSweep = setInterval(() => {
  const now = Date.now();
  for (const client of clients.values()) {
    if (client.pen && now - client.pen.lastAt > PEN_IDLE_MS) {
      client.pen = null;
      broadcast("pen", { pid: client.pid, end: true });
      broadcastHere();
    }
  }
}, 1000);
penSweep.unref();

// Per-window token buckets: a pen sends a batch every ~90 ms while drawing,
// so 20 a second with a burst of 40 is generous for a person and a hard
// ceiling for a script.
const buckets = new Map<string, { tokens: number; at: number }>();
export function allow(key: string, perSecond: number, burst: number): boolean {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: burst, at: now };
  b.tokens = Math.min(burst, b.tokens + ((now - b.at) / 1000) * perSecond);
  b.at = now;
  buckets.set(key, b);
  if (b.tokens < 1) return false;
  b.tokens -= 1;
  return true;
}
const bucketSweep = setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, b] of buckets) if (b.at < cutoff) buckets.delete(key);
}, 60_000);
bucketSweep.unref();
