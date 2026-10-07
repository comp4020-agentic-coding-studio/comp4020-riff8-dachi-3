// The live half of the app: one Server-Sent Events stream per open window.
// Strokes go out with an `id:` (their row id), so a reconnecting
// EventSource's Last-Event-ID replays whatever it missed straight from
// SQLite. Presence and pen trails carry no id: they are about now, and a
// reconnect simply gets the current state again.
import type { IncomingMessage, ServerResponse } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { listMarksAfter, type PublicMark } from "./db.ts";

const MAX_CLIENTS = Number(process.env.MAX_SSE_CLIENTS ?? 100);
const BATCH_MS = 100;
// Fly's proxy closes a connection that has been silent for about a minute.
const KEEPALIVE_MS = 15_000;

interface Client {
  res: ServerResponse;
  pid: string;
  key: string;
  handle: string | null;
  joinedAt: number;
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

export function broadcastMark(mark: PublicMark, fromPid?: string): void {
  broadcast("mark", fromPid ? { ...mark, from: fromPid } : mark, mark.id);
}

export function presenceList(): { pid: string; handle: string | null }[] {
  return [...clients.values()].map(({ pid, handle }) => ({ pid, handle }));
}

function broadcastHere(): void {
  broadcast("here", presenceList());
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
  };
  clients.set(client.pid, client);
  res.write(frame("hello", { pid: client.pid, key: client.key, here: presenceList() }));
  broadcastHere();

  const close = () => {
    if (!clients.delete(client.pid)) return;
    broadcastHere();
    onClose();
  };
  req.on("close", close);
  res.on("error", close);
}

const keepalive = setInterval(() => {
  for (const client of clients.values()) client.res.write(": keepalive\n\n");
}, KEEPALIVE_MS);
keepalive.unref();
