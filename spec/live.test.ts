import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { at, firstCookie, markEvent, openEvents, post } from "./helpers.ts";

// What "live" promises: a stroke reaches every other open window within about
// a second, and a window that dropped its connection catches up from SQLite.

it("delivers a new stroke to a second open window within a second", async () => {
  const watcher = await openEvents();
  try {
    await watcher.waitFor((e) => e.event === "hello");
    const note = `live ${randomUUID()}`;
    const started = Date.now();
    const res = await post("/api/marks", { color: "#3f5d40", note, shape: "wave" });
    expect(res.status).toBe(201);
    await watcher.waitFor(markEvent(note), 1000);
    expect(Date.now() - started).toBeLessThan(1000);
  } finally {
    watcher.close();
  }
});

it("replays what a reconnecting window missed, from its Last-Event-ID", async () => {
  const first = await post("/api/marks", { color: "#3a5a6b", note: `before ${randomUUID()}`, shape: "dot" });
  const before = (await first.json()).mark;
  const missed = `missed ${randomUUID()}`;
  expect((await post("/api/marks", { color: "#3a5a6b", note: missed, shape: "line" })).status).toBe(201);

  const reconnect = await openEvents("/api/events", { "last-event-id": String(before.id) });
  try {
    const replayed = await reconnect.waitFor(markEvent(missed), 1000);
    expect(Number(replayed.id)).toBeGreaterThan(before.id);
    expect(reconnect.events.some((e) => e.event === "mark" && Number(e.id) <= before.id)).toBe(false);
  } finally {
    reconnect.close();
  }
});

it("serves the stream as text/event-stream with a retry hint", async () => {
  const stream = await openEvents();
  try {
    expect(stream.res.headers.get("content-type")).toMatch(/^text\/event-stream/);
    const hello = await stream.waitFor((e) => e.event === "hello");
    expect(hello.id).toBeUndefined();
  } finally {
    stream.close();
  }
});

// The hand cookie is a bearer token for a store with no delete path; the
// handle is a one-way digest of it that is safe to show.
it("never puts a hand's secret token in any response body", async () => {
  const mint = await fetch(at("/api/marks"));
  const cookie = firstCookie(mint)!;
  const secret = cookie.split("=")[1];
  expect(secret).toMatch(/^[0-9a-f-]{36}$/);
  const note = `secret probe ${randomUUID()}`;

  const stream = await openEvents("/api/events", { cookie });
  try {
    const created = await post("/api/marks", { color: "#7a3b3b", note, shape: "hook" }, { cookie });
    const bodies = [
      await created.text(),
      await (await fetch(at("/api/marks"), { headers: { cookie } })).text(),
      await (await fetch(at("/"), { headers: { cookie } })).text(),
    ];
    await stream.waitFor(markEvent(note));
    bodies.push(JSON.stringify(stream.events));
    for (const body of bodies) expect(body).not.toContain(secret);
  } finally {
    stream.close();
  }
});

it("does not let someone else's public handle, sent as a cookie, make you them", async () => {
  const mine = await post("/api/marks", { color: "#2b2118", note: `owner ${randomUUID()}`, shape: "peak" });
  const { mark } = await mine.json();

  const spoof = await fetch(at("/api/marks"), { headers: { cookie: `hand=${mark.handle}` } });
  const { you } = await spoof.json();
  expect(you).not.toBe(mark.handle);

  const posted = await post(
    "/api/marks",
    { color: "#2b2118", note: `spoof ${randomUUID()}`, shape: "peak" },
    { cookie: `hand=${mark.handle}` },
  );
  expect((await posted.json()).mark.handle).not.toBe(mark.handle);
});

// Presence and pen trails: in memory only, keyed to one open window by the
// key its own stream handed it, and validated like everything else.
async function windowOpen() {
  const stream = await openEvents();
  const hello = await stream.waitFor((e) => e.event === "hello");
  return { stream, ...(hello.data as { pid: string; key: string }) };
}

it("shows a second window to the first, and says when it leaves", async () => {
  const a = await windowOpen();
  const b = await windowOpen();
  try {
    const here = (e: { event: string; data: unknown }) =>
      e.event === "here" && (e.data as { pid: string }[]).some((p) => p.pid === b.pid);
    const seen = await a.stream.waitFor(here, 1000);
    for (const p of seen.data as Record<string, unknown>[]) expect(Object.keys(p).sort()).toEqual(["drawing", "pid", "pos"]);
    b.stream.close();
    await a.stream.waitFor(
      (e) => e.event === "here" && e !== seen && !(e.data as { pid: string }[]).some((p) => p.pid === b.pid),
      2000,
    );
  } finally {
    a.stream.close();
    b.stream.close();
  }
});

it("relays a pen trail to another window, and a stroke from that pen names it", async () => {
  const drawer = await windowOpen();
  const watcher = await windowOpen();
  try {
    const pen = await post("/api/pen", { key: drawer.key, color: "#3a5a6b", points: [[10, 10], [20, 30]], start: true });
    expect(pen.status).toBe(204);
    const trail = await watcher.stream.waitFor((e) => e.event === "pen" && (e.data as { pid: string }).pid === drawer.pid, 1000);
    expect((trail.data as { points: number[][] }).points).toEqual([[10, 10], [20, 30]]);

    const note = `from a pen ${randomUUID()}`;
    await post("/api/marks", { key: drawer.key, color: "#3a5a6b", note, path: [[10, 10], [20, 30]] });
    const mark = await watcher.stream.waitFor(markEvent(note), 1000);
    expect((mark.data as { from: string }).from).toBe(drawer.pid);
  } finally {
    drawer.stream.close();
    watcher.stream.close();
  }
});

it("refuses pen and presence posts from no window, another site, or with hostile points", async () => {
  const w = await windowOpen();
  try {
    expect((await post("/api/pen", { key: "nope", color: "#3a5a6b", points: [[1, 1]] })).status).toBe(409);
    for (const points of [[], [[1, 1001]], [[1.5, 2]], "1,1", Array.from({ length: 33 }, () => [1, 1])]) {
      const res = await post("/api/pen", { key: w.key, color: "#3a5a6b", points });
      expect(res.status, JSON.stringify(points)).toBe(422);
    }
    expect((await post("/api/pen", { key: w.key, color: "#ffffff", points: [[1, 1]] })).status).toBe(422);
    for (const path of ["/api/pen", "/api/here"]) {
      const res = await fetch(at(path), {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://attacker.example" },
        body: JSON.stringify({ key: w.key, color: "#3a5a6b", points: [[1, 1]], pos: 0.5 }),
      });
      expect(res.status, path).toBe(403);
    }
    expect((await post("/api/here", { key: w.key, pos: 0.25 })).status).toBe(204);
  } finally {
    w.stream.close();
  }
});

it("rate limits a pen that posts faster than any hand draws", async () => {
  const w = await windowOpen();
  try {
    const statuses = await Promise.all(
      Array.from({ length: 80 }, () => post("/api/pen", { key: w.key, color: "#3a5a6b", points: [[5, 5]] }).then((r) => r.status)),
    );
    expect(statuses).toContain(429);
  } finally {
    w.stream.close();
  }
});

// Since you were here: a returning browser is told when it was last here,
// keyed by its secret hand server-side; nobody else's visit is ever exposed.
it("tells a returning browser when it was last here, and nobody else", async () => {
  const first = await fetch(at("/api/marks"));
  expect((await first.json()).lastVisit).toBeNull();
  const cookie = firstCookie(first)!;

  const second = await fetch(at("/api/marks"), { headers: { cookie } });
  const { lastVisit: noneYet } = await second.json();
  expect(noneYet).toBeNull();

  const third = await fetch(at("/api/marks"), { headers: { cookie } });
  const body = await third.text();
  const { lastVisit } = JSON.parse(body);
  expect(Date.parse(lastVisit)).toBeGreaterThan(Date.now() - 60_000);
  expect(body).not.toContain(cookie.split("=")[1]);

  const stranger = await (await fetch(at("/api/marks"))).json();
  expect(stranger.lastVisit).toBeNull();
});

// The hash chain makes "append-only" checkable: recomputing every link from
// the served fields alone has to reproduce the served hashes, in order.
it("serves an unbroken hash chain over every stroke", async () => {
  const { createHash } = await import("node:crypto");
  const { marks } = await (await fetch(at("/api/marks"))).json();
  let prev = "long-scroll";
  for (const m of marks) {
    const link = createHash("sha256")
      .update(prev + JSON.stringify([m.id, m.handle, m.note, m.color, m.createdAt, m.path, m.seed]))
      .digest("hex");
    expect(m.hash, `stroke ${m.id}`).toBe(link);
    prev = link;
  }
});
