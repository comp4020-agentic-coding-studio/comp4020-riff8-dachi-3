import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { gzipSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { addMark, handleFor, lastSeen, listMarks, markSeen } from "./db.ts";
import { validateMark } from "./marks.ts";
import { renderReadme } from "./readme.ts";
import { startResidents } from "./residents.ts";
import { allow, broadcastMark, clientForKey, heartbeat, openStream, penUpdate } from "./live.ts";

const PORT = Number(process.env.PORT ?? 8080);
const PUBLIC_DIR = new URL("../public/", import.meta.url);

// A hand-rolled cap, not framework config, but the same lesson: a 256MB
// machine has no defence against a body an order of magnitude past what the
// form itself ever sends (a note plus a color is well under 1KB).
const MAX_BODY_BYTES = 8 * 1024;

// A hand is only ever an identity token, never content — but the cookie it
// rides in is exactly as client-controlled as any body field, and unlike the
// note it had no cap at all: a request that isn't the form could set a
// multi-kilobyte "hand" that then sits in the append-only store forever,
// once per request, with no edit or delete path to ever remove it. The only
// shape a hand should ever take is the one this server itself mints below.
const HAND_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidHand(value: string | undefined): value is string {
  return typeof value === "string" && HAND_PATTERN.test(value);
}

// A cross-site page can make a visitor's browser submit a POST without the
// visitor ever meaning to — a hidden auto-submitting <form
// enctype="text/plain"> lands raw JSON in the body despite the form's own
// Content-Type, and this server never checked the Content-Type header
// anyway, so nothing above stopped it. Confirmed live: such a page added a
// mark with no user interaction at all. Into a store with no edit or delete
// path, every such write is permanent, so every browser's own Origin header
// (sent on every unsafe-method request, same-origin or not, and never
// settable by page script) is checked against this request's own host.
function isSameOrigin(req: IncomingMessage): boolean {
  const origin = req.headers.origin;
  if (typeof origin !== "string") return false;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (!key) continue;
    // A cookie header is client-supplied input like any other: malformed
    // percent-encoding must degrade to "no hand", not throw and 500 the
    // whole request.
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      continue;
    }
  }
  return out;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let rejected = false;
    // Reject on an oversized body, but don't destroy the socket here: that
    // would drop the connection before the 413 response below ever reaches
    // the client. The caller destroys it, after writing that response.
    req.on("data", (chunk: Buffer) => {
      if (rejected) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        rejected = true;
        reject(new Error("body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".txt": "text/plain",
};

// Only plain names under public/ ("vendor/three/three.core.js"), never a
// dot-segment or anything the TYPES table doesn't know: a request path is
// client input like any other.
const STATIC_PATH = /^(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+$/i;

// Three.js is about 2 MB of source; gzipped once and kept, it is about a
// fifth of that on the wire, which matters on a phone.
const gzipCache = new Map<string, Buffer>();

async function serveStatic(req: IncomingMessage, res: ServerResponse, filename: string): Promise<boolean> {
  const type = TYPES[extname(filename)];
  if (!type || !STATIC_PATH.test(filename) || filename.split("/").some((s) => s.startsWith("."))) {
    return false;
  }
  let data: Buffer;
  try {
    data = await readFile(new URL(filename, PUBLIC_DIR));
  } catch {
    return false;
  }
  const headers: Record<string, string> = {
    "content-type": `${type}; charset=utf-8`,
    "cache-control": filename.startsWith("vendor/") ? "public, max-age=604800" : "no-cache",
    vary: "accept-encoding",
  };
  if (/gzip/.test(String(req.headers["accept-encoding"] ?? "")) && data.length > 1024) {
    let gz = gzipCache.get(filename);
    if (!gz) {
      gz = gzipSync(data);
      if (filename.startsWith("vendor/")) gzipCache.set(filename, gz);
    }
    headers["content-encoding"] = "gzip";
    data = gz;
  }
  res.writeHead(200, headers);
  res.end(data);
  return true;
}

function cookieHand(req: IncomingMessage): string | undefined {
  const hand = parseCookies(req.headers.cookie).hand;
  return isValidHand(hand) ? hand : undefined;
}

// The hand is the secret: it rides only in its own HttpOnly cookie, and no
// response body ever carries it, only the handle derived from it. A browser
// without one is given one on its first read, so "since you were here" works
// for someone who has only ever looked.
function handFor(req: IncomingMessage): { hand: string; setCookie: Record<string, string> } {
  const existing = cookieHand(req);
  if (existing) return { hand: existing, setCookie: {} };
  const hand = randomUUID();
  const fiveYears = 60 * 60 * 24 * 365 * 5;
  // HttpOnly: no script on this page ever reads document.cookie. Secure:
  // fly.toml forces https, so the browser never has an http origin to send
  // it from anyway.
  return {
    hand,
    setCookie: {
      "set-cookie": `hand=${hand}; Path=/; Max-Age=${fiveYears}; SameSite=Lax; HttpOnly; Secure`,
    },
  };
}

// Every write endpoint goes through here: same-origin check, the body cap,
// then a JSON object or nothing. Answers the request itself on failure.
async function readJsonPost(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<{ body: Record<string, unknown> } | null> {
  if (!isSameOrigin(req)) {
    res.writeHead(403, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "cross-site-request" }));
    return null;
  }
  let raw: string;
  try {
    raw = await readBody(req);
  } catch {
    res.writeHead(413, { connection: "close" });
    res.end();
    req.destroy();
    return null;
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "bad-json" }));
    return null;
  }
  return { body: payload as Record<string, unknown> };
}

const server = createServer(async (req, res) => {
  try {
    // Cross-origin JS can't read a framed page's content, but it can still
    // render it under an attacker's own layout and trick a real visitor into
    // clicking "Add to the scroll" believing they're clicking something
    // else — confirmed live by embedding this app in a plain cross-origin
    // iframe with no defence of any kind in place. The Origin check above
    // guards a forged request; it does nothing for a genuine one a visitor
    // was tricked into making with their own real hand cookie, into a store
    // with no edit or delete path. This app never needs to be framed by
    // anything, so refuse it outright, both ways browsers check for it.
    res.setHeader("x-frame-options", "DENY");
    res.setHeader("content-security-policy", "frame-ancestors 'none'");
    // Every response already sets its own content-type explicitly, but
    // nosniff is a one-line guard against a browser second-guessing it (MIME
    // sniffing a response into a type it was never served as) at zero cost
    // here. Referrer-Policy matters because this page links out (the source
    // repo, the README's own cited essays): without it, a click carries this
    // app's full URL as the Referer header to whatever site a visitor lands
    // on next. Neither URL is secret, but there's no reason to send it either.
    res.setHeader("x-content-type-options", "nosniff");
    res.setHeader("referrer-policy", "no-referrer");

    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/") {
      await serveStatic(req, res, "index.html");
      return;
    }
    if (req.method === "GET" && (url.pathname === "/readme" || url.pathname === "/readme/")) {
      const html = await renderReadme();
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/marks") {
      const { hand, setCookie } = handFor(req);
      // Only a browser that came back with its cookie has a last visit; a
      // fresh one isn't recorded until it returns, so cookieless requests
      // can't grow the table.
      const returning = !setCookie["set-cookie"];
      const lastVisit = returning ? lastSeen(hand) : null;
      if (returning) markSeen(hand);
      res.writeHead(200, { ...setCookie, "content-type": "application/json" });
      res.end(
        JSON.stringify({ marks: listMarks(), you: handleFor(hand), now: new Date().toISOString(), lastVisit }),
      );
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/events") {
      const hand = cookieHand(req);
      // leaving counts as "last here" too, so a long visit ends where it ended
      openStream(req, res, url, hand ? handleFor(hand) : null, () => hand && markSeen(hand));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/marks") {
      const payload = await readJsonPost(req, res);
      if (!payload) return;
      const { hand, setCookie } = handFor(req);

      if (!allow(`marks:${hand}`, 0.2, 8)) {
        res.writeHead(429, { ...setCookie, "content-type": "application/json", "retry-after": "5" });
        res.end(JSON.stringify({ error: "too-many-strokes" }));
        return;
      }
      const validated = validateMark(payload.body);
      if (!validated.ok) {
        res.writeHead(422, { ...setCookie, "content-type": "application/json" });
        res.end(JSON.stringify({ error: validated.reason }));
        return;
      }

      const mark = addMark(hand, validated.note, validated.color, validated.geometry);
      broadcastMark(mark, clientForKey(payload.body.key));
      res.writeHead(201, { ...setCookie, "content-type": "application/json" });
      res.end(JSON.stringify({ mark }));
      return;
    }
    if (req.method === "POST" && (url.pathname === "/api/here" || url.pathname === "/api/pen")) {
      const payload = await readJsonPost(req, res);
      if (!payload) return;
      // The key comes from this window's own stream (its hello event), so
      // only that window can move its light or draw its pen trail.
      const client = clientForKey(payload.body.key);
      if (!client) {
        res.writeHead(409, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "no-such-window" }));
        return;
      }
      const hand = cookieHand(req) ?? "none";
      if (!allow(`pen:${client.key}`, 20, 40) || !allow(`pen-hand:${hand}`, 40, 80)) {
        res.writeHead(429, { "content-type": "application/json", "retry-after": "1" });
        res.end(JSON.stringify({ error: "slow-down" }));
        return;
      }
      if (url.pathname === "/api/here") {
        heartbeat(client, payload.body.pos);
        res.writeHead(204);
        res.end();
        return;
      }
      const result = penUpdate(client, payload.body);
      res.writeHead(result.ok ? 204 : 422, { "content-type": "application/json" });
      res.end(result.ok ? undefined : JSON.stringify({ error: result.reason }));
      return;
    }
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) {
      if (await serveStatic(req, res, url.pathname.slice(1))) return;
    }

    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "text/plain" });
    }
    res.end("internal error");
  }
});

// Astro's own Content-Type-mismatch behaviour (checked on crit 7) is what
// this mirrors: an unexpected request shouldn't take the process down, just
// answer badly and keep serving the next one — every route above is already
// wrapped by the try/catch, this is the last resort.
server.on("clientError", (_err, socket) => {
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

startResidents();

server.listen(PORT, "0.0.0.0", () => {
  console.log(`long scroll listening on 0.0.0.0:${PORT}`);
});
