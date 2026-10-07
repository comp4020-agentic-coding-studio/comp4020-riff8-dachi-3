import { type ChildProcess, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";

// Everything that matters lives in SQLite and survives a restart: strokes
// with their paths and seeds, a hand's public handle (so "yours" still
// works), the hash chain, and a returning browser's last visit. Every other
// spec file shares one already-running app; this one runs its own short-lived
// servers against an isolated DATA_DIR, the same path the Fly volume takes.

const dataDir = mkdtempSync(join(tmpdir(), "long-scroll-persistence-"));
const port = 18173;
const origin = `http://localhost:${port}`;

function startServer(): { child: ChildProcess; stderr: () => string } {
  const child = spawn("node", ["src/server.ts"], {
    env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, RESIDENTS: "off" },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  return { child, stderr: () => stderr };
}

async function waitForServer(stderr: () => string): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      await fetch(origin);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`nothing answered at ${origin}; stderr: ${stderr()}`);
}

function stopServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    child.on("exit", () => resolve());
    child.kill();
  });
}

afterAll(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

it("keeps strokes, handles, the hash chain and last visits across a restart", async () => {
  const first = startServer();
  await waitForServer(first.stderr);

  const path = [
    [100, 800],
    [400, 200],
    [800, 600],
  ];
  const post = await fetch(new URL("/api/marks", origin), {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ color: "#3a5a6b", note: "survives a restart", path }),
  });
  expect(post.status, `POST failed; stderr: ${first.stderr()}`).toBe(201);
  const cookie = post.headers.get("set-cookie")?.split(";")[0];
  expect(cookie, "no hand cookie was set on first contact").toBeTruthy();
  const created = (await post.json()).mark;
  await fetch(new URL("/api/marks", origin), { headers: { cookie: cookie! } }); // records a visit

  await stopServer(first.child);

  const second = startServer();
  try {
    await waitForServer(second.stderr);
    const res = await fetch(new URL("/api/marks", origin), { headers: { cookie: cookie! } });
    const { marks, you, lastVisit } = await res.json();
    expect(you, `handle changed across the restart; stderr: ${second.stderr()}`).toBe(created.handle);
    expect(marks.find((m: { id: number }) => m.id === created.id)).toEqual(created);
    expect(lastVisit, "the last visit was forgotten").toBeTruthy();
  } finally {
    await stopServer(second.child);
  }
});
