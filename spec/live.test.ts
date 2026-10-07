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
