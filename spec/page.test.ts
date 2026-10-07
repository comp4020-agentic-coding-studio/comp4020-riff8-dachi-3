import { JSDOM } from "jsdom";
import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { at, baseUrl, firstCookie, post } from "./helpers.ts";

// The page's own script, served by the running app and run in jsdom. jsdom
// has no WebGL and can't load the page's modules, so what runs here is
// exactly the no-3D fallback: the Text view as the whole app. That is the
// promise worth testing in a DOM: every stroke is text, and every control is
// a native, labelled element. (The 3D view is checked by hand in a browser.)

async function addStroke(note: string, cookie?: string): Promise<string> {
  const res = await post("/api/marks", { color: "#3f5d40", note, shape: "loop" }, cookie ? { cookie } : {});
  expect(res.status).toBe(201);
  return cookie ?? firstCookie(res)!;
}

// jsdom has no cookie jar shared with Node's fetch, so the page's fetch is
// Node's own, carrying this hand's cookie and Origin the way a browser would.
async function openPage(cookie: string): Promise<Document> {
  const html = await (await fetch(at("/"))).text();
  const script = await (await fetch(at("/app.js"))).text();
  const { window } = new JSDOM(html, { url: baseUrl, runScripts: "outside-only" });
  window.fetch = ((input: string, init: RequestInit = {}) =>
    fetch(new URL(input, baseUrl), {
      ...init,
      headers: { ...(init.headers as Record<string, string>), cookie, origin: baseUrl },
    })) as typeof window.fetch;
  window.eval(script);
  return window.document;
}

async function itemFor(doc: Document, note: string): Promise<Element> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const li = [...doc.querySelectorAll("#scroll li")].find((el) => el.textContent?.includes(note));
    if (li) return li;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`the page never rendered the stroke "${note}"`);
}

it("falls back to the Text view, listing every stroke with its note, time and owner", async () => {
  const mine = `page test, mine ${randomUUID()}`;
  const theirs = `page test, theirs ${randomUUID()}`;
  const cookie = await addStroke(mine);
  await addStroke(theirs);

  const doc = await openPage(cookie);
  const mineItem = await itemFor(doc, mine);
  expect(doc.getElementById("text-panel")!.hidden).toBe(false);
  expect(doc.getElementById("world-fallback")!.hidden).toBe(false);

  expect(mineItem.textContent).toMatch(/ — .*\d{2}:\d{2}.* — yours$/);
  expect((await itemFor(doc, theirs)).textContent).not.toContain("yours");

  // every stroke the server holds is in the list, each with a time
  const { marks } = await (await fetch(at("/api/marks"))).json();
  const items = [...doc.querySelectorAll("#scroll li")];
  expect(items).toHaveLength(marks.length);
  for (const li of items) expect(li.textContent).toMatch(/ — .*\d{2}:\d{2}/);

  const welcome = doc.getElementById("welcome-back")!;
  expect(welcome.hidden).toBe(false);
  expect(welcome.textContent).toMatch(/still there/);
});

it("offers only native, labelled, keyboard-reachable controls", async () => {
  const doc = await openPage(await addStroke(`page test, controls ${randomUUID()}`));
  await itemFor(doc, "page test, controls");

  const palette = [...doc.querySelectorAll<HTMLInputElement>('.palette input[type="radio"]')];
  expect(palette).toHaveLength(6);
  const shapes = [...doc.querySelectorAll<HTMLInputElement>('input[name="shape"]')].map((i) => i.value);
  expect(shapes).toEqual(expect.arrayContaining(["wave", "peak", "hook", "loop", "dot", "line"]));

  for (const id of ["position", "prev-stroke", "next-stroke", "sound-toggle", "text-toggle", "play", "play-speed", "stop", "verify"]) {
    expect(doc.getElementById(id), `#${id} is missing`).not.toBeNull();
  }

  const controls = [...doc.querySelectorAll<HTMLInputElement>("input, button, select")];
  for (const control of controls) {
    const name =
      control.tagName === "BUTTON"
        ? control.textContent
        : [...(control.labels ?? [])].map((l) => l.textContent).join("") || control.getAttribute("aria-label");
    expect(name?.trim(), `${control.outerHTML} has no label`).toBeTruthy();
    expect(control.tabIndex, `${control.outerHTML} is out of the tab order`).toBeGreaterThanOrEqual(0);
    expect(control.disabled, `${control.outerHTML} is disabled`).toBe(false);
  }
  // nothing pretends to be a control that isn't one
  expect(doc.querySelectorAll("[onclick], [role='button'], div[tabindex], span[tabindex]")).toHaveLength(0);
});
