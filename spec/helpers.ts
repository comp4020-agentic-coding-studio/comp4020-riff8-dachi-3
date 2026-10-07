import { inject } from "vitest";

// Shared by the spec files: every one of them talks to the running app that
// spec/global-setup.ts found, the way a browser would.
export const baseUrl = inject("baseUrl");

export const at = (path: string): URL => new URL(path, baseUrl);

export function firstCookie(res: Response): string | undefined {
  return res.headers.get("set-cookie")?.split(";")[0];
}

// The server refuses a write whose Origin doesn't match its own host, the way
// a real browser's own Origin header would be checked, so every test write
// opts into that match explicitly.
export function postHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "content-type": "application/json", origin: baseUrl, ...extra };
}

export async function post(path: string, body: unknown, extra: Record<string, string> = {}) {
  return fetch(at(path), {
    method: "POST",
    headers: postHeaders(extra),
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

export interface SseEvent {
  id?: string;
  event: string;
  data: unknown;
}

// A minimal EventSource for Node: reads the stream and hands back parsed
// events as they arrive, so a test can wait for a particular one.
export async function openEvents(path = "/api/events", headers: Record<string, string> = {}) {
  const controller = new AbortController();
  const res = await fetch(at(path), { headers, signal: controller.signal });
  const events: SseEvent[] = [];
  const waiters: (() => void)[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  (async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let split: number;
        while ((split = buffer.indexOf("\n\n")) !== -1) {
          const block = buffer.slice(0, split);
          buffer = buffer.slice(split + 2);
          const ev: Partial<SseEvent> & { lines: string[] } = { event: "message", lines: [] };
          for (const line of block.split("\n")) {
            if (line.startsWith("id: ")) ev.id = line.slice(4);
            else if (line.startsWith("event: ")) ev.event = line.slice(7);
            else if (line.startsWith("data: ")) ev.lines.push(line.slice(6));
          }
          if (ev.lines.length === 0) continue;
          events.push({ id: ev.id, event: ev.event!, data: JSON.parse(ev.lines.join("\n")) });
          for (const wake of waiters.splice(0)) wake();
        }
      }
    } catch {
      // aborted
    }
  })();

  async function waitFor(
    match: (e: SseEvent) => boolean,
    timeoutMs = 3000,
  ): Promise<SseEvent> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const found = events.find(match);
      if (found) return found;
      const left = deadline - Date.now();
      if (left <= 0) throw new Error("timed out waiting for an event");
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, left);
        waiters.push(() => {
          clearTimeout(t);
          resolve();
        });
      });
    }
  }

  return { res, events, waitFor, close: () => controller.abort() };
}

export const markEvent =
  (note: string) =>
  (e: SseEvent): boolean =>
    e.event === "mark" && (e.data as { note: string }).note === note;
