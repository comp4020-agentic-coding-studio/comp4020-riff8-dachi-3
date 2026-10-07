// Vanilla JS, no build step. This file has no static imports on purpose:
// the text view, the form and the live connection work on their own, and
// everything heavier (the pad, the 3D scroll) is loaded with import() and
// allowed to fail, leaving a complete, text-only app behind.

// Mirrors src/marks.ts's PALETTE and order exactly; the server is the one
// that actually enforces membership, this just has to offer the same set.
const PALETTE = [
  { color: "#2b2118", name: "walnut" },
  { color: "#5b4636", name: "umber" },
  { color: "#8a6d3b", name: "ochre" },
  { color: "#3f5d40", name: "pine" },
  { color: "#3a5a6b", name: "slate" },
  { color: "#7a3b3b", name: "madder" },
];
const colorName = (c) => PALETTE.find((p) => p.color === c)?.name ?? "ink";

const $ = (id) => document.getElementById(id);
const scrollList = $("scroll");
const emptyNotice = $("scroll-empty");
const welcomeBack = $("welcome-back");
const form = $("add-mark-form");
const paletteEl = form.querySelector(".palette");
const noteInput = $("note");
const statusEl = $("form-status");
const liveStatus = $("live-status");
const nowAt = $("now-at");
const hoverCard = $("hover-card");
const positionInput = $("position");
const textToggle = $("text-toggle");
const textPanel = $("text-panel");

// Later features (sound, live pens, living ink) hang off these.
const hooks = { arrive: [], focus: [], camera: [], pick: [], loaded: [] };

const state = {
  marks: [],
  byId: new Map(),
  you: null,
  lastVisit: null,
  sinceMarks: [],
  lay: { positions: [], start: 0, openEnd: 0 },
  scene: null,
  layoutLib: null,
};

// --- text ----------------------------------------------------------------

function timeLabel(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const isYours = (mark) => state.you !== null && mark.handle === state.you;

function whoSuffix(mark) {
  if (isYours(mark)) return " — yours";
  if (mark.resident) return " — resident";
  return "";
}

// The one sentence every stroke is, wherever it is said: the list, the
// hover card, the "now at" line, the sound captions.
function describe(mark) {
  const note = mark.note ? mark.note : "(a stroke, no note)";
  return `${note} — ${timeLabel(mark.createdAt)}${whoSuffix(mark)}`;
}

function buildPalette() {
  PALETTE.forEach(({ color, name }, i) => {
    const id = `color-${name}`;
    const label = document.createElement("label");
    label.className = "swatch";
    label.style.setProperty("--stroke", color);
    label.htmlFor = id;
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "color";
    input.id = id;
    input.value = color;
    if (i === 0) input.checked = true;
    const text = document.createElement("span");
    text.textContent = name;
    label.append(input, text);
    paletteEl.append(label);
  });
}

function listItem(mark) {
  const li = document.createElement("li");
  li.className = "mark" + (isYours(mark) ? " mark--yours" : "");
  li.dataset.id = String(mark.id);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mark__button";
  const stroke = document.createElement("span");
  stroke.className = "mark__stroke";
  stroke.style.setProperty("--stroke", mark.color);
  stroke.setAttribute("aria-hidden", "true");
  const text = document.createElement("span");
  text.className = "mark__text";
  text.textContent = (isNew(mark) ? "new: " : "") + describe(mark);
  if (isNew(mark)) li.classList.add("mark--since");
  button.append(stroke, text);
  button.addEventListener("click", () => {
    hooks.userMove?.();
    bringIntoView(mark.id);
  });
  li.append(button);
  return li;
}

function renderList() {
  scrollList.replaceChildren(...(state.marks.length ? state.marks.map(listItem) : [emptyNotice]));
}

// --- since you were here --------------------------------------------------

const isNew = (mark) => state.lastVisit !== null && mark.createdAt > state.lastVisit && !isYours(mark);

// "Near yours": within three places of one of your strokes along the scroll.
function nearYours(mark) {
  const i = state.marks.indexOf(mark);
  return state.marks.some((m, j) => isYours(m) && Math.abs(i - j) <= 3);
}

function sinceText() {
  if (!state.lastVisit) return "";
  const fresh = state.sinceMarks;
  const when = timeLabel(state.lastVisit);
  if (fresh.length === 0) return `Nothing new since you were last here (${when}).`;
  const near = fresh.filter(nearYours).length;
  const n = fresh.length;
  return (
    `${n === 1 ? "1 stroke came" : `${n} strokes came`} while you were away (since ${when})` +
    (near ? `; ${near === 1 ? "1 is" : `${near} are`} near yours.` : ".") +
    " A red thread on the scroll marks where you left off."
  );
}

// Your own old strokes, grown since you last looked.
function grownText() {
  if (!state.lastVisit || !state.scene) return "";
  let branches = 0;
  for (const mark of state.marks.filter(isYours)) {
    const before = state.scene.growthOf(mark.id, Date.parse(state.lastVisit));
    const now = state.scene.growthOf(mark.id);
    const count = (g) => (g ? g.tendrils.reduce((n, t) => n + 1 + (t.fork ? 1 : 0) + t.blossoms, 0) : 0);
    branches += Math.max(0, count(now) - count(before));
  }
  return branches ? ` Your strokes have put out ${branches} new branches and blossoms since then.` : "";
}

function renderWelcome() {
  const ownCount = state.marks.filter(isYours).length;
  const parts = [];
  if (ownCount > 0) {
    parts.push(
      ownCount === 1
        ? "You've left a mark on this scroll before — it's still there."
        : `You've left ${ownCount} marks on this scroll before — they're still there.`,
    );
  }
  const since = sinceText();
  if (since) parts.push(since + grownText());
  welcomeBack.hidden = parts.length === 0;
  welcomeBack.textContent = parts.join(" ");
}

// Open where the visitor left off, the new strokes ahead of them.
hooks.initialView = () => {
  if (!state.lastVisit || state.sinceMarks.length === 0) return false;
  const first = state.marks.indexOf(state.sinceMarks[0]);
  const x = first > 0 ? (state.lay.positions[first - 1].x + state.lay.positions[first].x) / 2 : state.lay.positions[0].x - 1.5;
  state.scene.setBoundary(x);
  state.scene.goTo(x + (state.scene.narrow ? 1 : 2.5), { instant: true });
  return true;
};

// --- the scroll's geometry, when the 3D view (or its layout) is loaded ---

function relayout() {
  if (!state.layoutLib) return;
  state.lay = state.layoutLib.layout(state.marks);
}

function xForPosition(value) {
  const { start, openEnd } = state.lay;
  return start + (openEnd - start) * (value / 1000);
}

function positionForX(x) {
  const { start, openEnd } = state.lay;
  return openEnd === start ? 1000 : Math.round(((x - start) / (openEnd - start)) * 1000);
}

function indexNear(x) {
  return state.layoutLib ? state.layoutLib.nearestIndex(state.lay.positions, x) : -1;
}

function syncPosition(x) {
  positionInput.value = String(Math.max(0, Math.min(1000, positionForX(x))));
  const i = indexNear(x);
  positionInput.setAttribute(
    "aria-valuetext",
    i < 0
      ? "the open end"
      : x > state.lay.positions[state.marks.length - 1].x + 1
        ? "the open end, now"
        : `stroke ${i + 1} of ${state.marks.length}: ${describe(state.marks[i])}`,
  );
}

function bringIntoView(id) {
  const i = state.marks.findIndex((m) => m.id === id);
  if (i < 0) return;
  const mark = state.marks[i];
  const grown = growthText(mark);
  nowAt.textContent = `Stroke ${i + 1} of ${state.marks.length}: ${describe(mark)}${grown ? `; it ${grown}` : ""}`;
  for (const li of scrollList.querySelectorAll(".mark--focus")) li.classList.remove("mark--focus");
  scrollList.querySelector(`[data-id="${id}"]`)?.classList.add("mark--focus");
  if (!state.scene) return;
  state.scene.goTo(state.lay.positions[i].x);
  state.scene.setFocus(id);
  hooks.focus.forEach((fn) => fn(mark));
  showCardFor(mark);
}

function step(direction) {
  if (state.marks.length === 0) return;
  const x = state.scene ? state.scene.targetX : 0;
  const ps = state.lay.positions;
  let i;
  if (direction > 0) i = ps.findIndex((p) => p.x > x + 0.05);
  else i = ps.findLastIndex((p) => p.x < x - 0.05);
  if (i < 0) i = direction > 0 ? ps.length - 1 : 0;
  bringIntoView(state.marks[i].id);
}

// --- hover card ----------------------------------------------------------

// Living Ink, said in words: what the stroke has grown since it was drawn.
function growthText(mark) {
  const g = state.scene?.growthOf(mark.id);
  if (!g || g.tendrils.length === 0) return "";
  const branches = g.tendrils.reduce((n, t) => n + 1 + (t.fork ? 1 : 0), 0);
  const blossoms = g.tendrils.reduce((n, t) => n + t.blossoms, 0);
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : w.endsWith("h") ? "es" : "s"}`;
  return `has grown ${plural(branches, "branch")}${blossoms ? ` and ${plural(blossoms, "blossom")}` : ""}`;
}

let cardTimer = null;
function showCard(mark, left, top) {
  hoverCard.textContent = "";
  const note = document.createElement("strong");
  note.textContent = mark.note || "(a stroke, no note)";
  const meta = document.createElement("span");
  meta.textContent = `${timeLabel(mark.createdAt)} · ${colorName(mark.color)}${whoSuffix(mark)}`;
  hoverCard.append(note, meta);
  const grown = growthText(mark);
  if (grown) {
    const g = document.createElement("span");
    g.textContent = grown;
    hoverCard.append(g);
  }
  hoverCard.hidden = false;
  const world = $("world").getBoundingClientRect();
  const w = hoverCard.offsetWidth;
  hoverCard.style.left = `${Math.max(8, Math.min(world.width - w - 8, left + 14))}px`;
  hoverCard.style.top = `${Math.max(8, top - hoverCard.offsetHeight - 12)}px`;
  clearTimeout(cardTimer);
}

function showCardFor(mark) {
  const i = state.marks.indexOf(mark);
  if (!state.scene || i < 0) return;
  // the card waits for the camera to arrive, then sits above the ribbon
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => {
    const p = state.lay.positions[i];
    const s = state.scene.toScreen(p.x, 2.3, p.z);
    if (s.visible) showCard(mark, s.x - 60, s.y);
  }, 700);
}

function hideCard() {
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => (hoverCard.hidden = true), 250);
}

// --- marks arriving ------------------------------------------------------


function addMark(mark, { live = true } = {}) {
  if (state.byId.has(mark.id)) return false;
  state.byId.set(mark.id, mark);
  state.marks.push(mark);
  state.marks.sort((a, b) => a.id - b.id);
  if (state.marks.length === 1) scrollList.replaceChildren();
  const li = listItem(mark);
  const after = scrollList.querySelector(`[data-id="${state.marks[state.marks.indexOf(mark) - 1]?.id}"]`);
  if (after) after.after(li);
  else scrollList.prepend(li);
  relayout();
  if (state.scene) {
    const i = state.marks.indexOf(mark);
    state.scene.addMark(mark, state.lay.positions[i], state.lay, { grow: live });
  }
  hooks.arrive.forEach((fn) => fn(mark, { live }));
  return true;
}

async function load() {
  // fly.toml stops this app's one machine when idle and starts it on the next
  // request, so a cold start (or any dropped connection) is a real, not
  // hypothetical, way for this fetch to reject rather than resolve.
  try {
    const res = await fetch("/api/marks");
    const data = await res.json();
    state.you = data.you;
    state.marks = data.marks;
    state.byId = new Map(data.marks.map((m) => [m.id, m]));
    state.lastVisit = data.lastVisit ?? null;
    state.clockOffset = data.now ? Date.parse(data.now) - Date.now() : 0;
    state.sinceMarks = state.lastVisit ? data.marks.filter(isNew) : [];
    renderList();
    renderWelcome();
    relayout();
    hooks.loaded.forEach((fn) => fn(data));
    connect();
  } catch {
    const notice = document.createElement("li");
    notice.className = "scroll__empty";
    notice.textContent = "couldn't load the scroll — check your connection and try reloading.";
    scrollList.replaceChildren(notice);
    textPanel.hidden = false;
  }
}

// --- live ----------------------------------------------------------------

function lastId() {
  return state.marks.reduce((max, m) => Math.max(max, m.id), 0);
}

const live = { source: null, retry: 1000, pid: null, key: null, handlers: {} };

// EventSource reconnects on its own (sending Last-Event-ID) after a dropped
// connection, but gives up for good on an error response, which a waking
// Fly machine can produce; then this opens a fresh one, asking for whatever
// came after the last stroke it holds.
function connect() {
  if (!("EventSource" in window) || live.source) return;
  const source = new EventSource(`/api/events?since=${lastId()}`);
  live.source = source;
  source.addEventListener("open", () => {
    live.retry = 1000;
    liveStatus.textContent = "live";
    liveStatus.dataset.state = "live";
  });
  source.addEventListener("hello", (event) => {
    const data = JSON.parse(event.data);
    live.pid = data.pid;
    live.key = data.key;
    live.handlers.hello?.forEach((fn) => fn(data));
  });
  source.addEventListener("mark", (event) => addMark(JSON.parse(event.data)));
  for (const name of ["here", "pen"]) {
    source.addEventListener(name, (event) => live.handlers[name]?.forEach((fn) => fn(JSON.parse(event.data))));
  }
  source.addEventListener("error", () => {
    liveStatus.textContent = "reconnecting…";
    liveStatus.dataset.state = "reconnecting";
    if (source.readyState === EventSource.CLOSED) {
      live.source = null;
      setTimeout(connect, live.retry);
      live.retry = Math.min(live.retry * 2, 30_000);
    }
  });
}

function onLive(name, fn) {
  (live.handlers[name] ??= []).push(fn);
}

// --- the pad and the form ------------------------------------------------

let pad = null;
const drawnLabel = $("shape-drawn-label");
const selectedShape = () => new FormData(form).get("shape");
const selectedColor = () => new FormData(form).get("color");

async function loadPad() {
  try {
    const { createPad } = await import("./pad.js");
    pad = createPad($("pad"), {
      getColor: selectedColor,
      onStart() {
        drawnLabel.hidden = false;
        drawnLabel.querySelector("input").checked = true;
        hooks.penStart?.();
      },
      onPoints: (points) => hooks.penPoints?.(points),
      onCancel: () => hooks.penCancel?.(),
    });
    pad.showShape(selectedShape());
    $("pad-clear").addEventListener("click", () => {
      pad.clear();
      drawnLabel.hidden = true;
      form.querySelector('input[name="shape"][value="wave"]').checked = true;
      pad.showShape("wave");
    });
    form.addEventListener("change", (event) => {
      if (event.target.name === "shape" && event.target.value !== "drawn") {
        if (pad.hasDrawing()) hooks.penCancel?.();
        pad.showShape(event.target.value);
      }
      if (event.target.name === "color") pad.redraw();
    });
  } catch {
    document.querySelector(".pad-wrap").hidden = true;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const shape = selectedShape();
  const geometry =
    shape === "drawn" && pad?.hasDrawing()
      ? { path: pad.path() }
      : { shape: shape === "drawn" ? "wave" : shape };

  statusEl.textContent = "adding your stroke…";
  let res;
  try {
    res = await fetch("/api/marks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ color: selectedColor(), note: noteInput.value, key: live.key, ...geometry }),
    });
  } catch {
    statusEl.textContent = "that stroke couldn't be added — check your connection and try again.";
    return;
  }
  if (!res.ok) {
    statusEl.textContent =
      res.status === 429
        ? "that's a lot of strokes at once — wait a moment and try again."
        : "that stroke couldn't be added — try a shorter note.";
    return;
  }
  const { mark } = await res.json();
  addMark(mark);
  noteInput.value = "";
  if (pad?.hasDrawing()) {
    pad.clear();
    drawnLabel.hidden = true;
    form.querySelector('input[name="shape"][value="wave"]').checked = true;
    pad.showShape("wave");
  }
  statusEl.textContent = "added to the scroll — it's growing at the open end.";
  renderWelcome();
  if (state.scene) bringIntoView(mark.id);
});

// --- controls ------------------------------------------------------------

textToggle.addEventListener("change", () => {
  textPanel.hidden = !textToggle.checked;
});
$("prev-stroke").addEventListener("click", () => {
  hooks.userMove?.();
  step(-1);
});
$("next-stroke").addEventListener("click", () => {
  hooks.userMove?.();
  step(1);
});
positionInput.addEventListener("input", () => {
  if (!state.scene) return;
  state.scene.goTo(xForPosition(Number(positionInput.value)));
  hooks.userMove?.();
});

// Arrow keys travel when nothing that wants them has focus. A held modifier
// is a browser shortcut (back/forward, select), never ours.
document.addEventListener("keydown", (event) => {
  if (!state.scene || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest?.("input, select, textarea, button, a, [contenteditable]")) return;
  const dir = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
  if (!dir) return;
  event.preventDefault();
  state.scene.nudge(dir * 1.2);
  hooks.userMove?.();
});

async function loadScene() {
  try {
    const [layoutLib, { createScene }] = await Promise.all([import("./lib/layout.js"), import("./scene.js")]);
    state.layoutLib = layoutLib;
    relayout();
    const scene = createScene($("scene"), {
      onCamera(x) {
        syncPosition(x);
        hooks.camera.forEach((fn) => fn(x));
      },
      onHover(id, clientX, clientY) {
        const mark = id === null ? null : state.byId.get(id);
        if (!mark) return hideCard();
        const world = $("world").getBoundingClientRect();
        showCard(mark, clientX - world.left, clientY - world.top);
        hooks.pick.forEach((fn) => fn(mark, { hover: true }));
      },
      onPick(id) {
        const mark = state.byId.get(id);
        if (!mark) return;
        const i = state.marks.indexOf(mark);
        nowAt.textContent = `Stroke ${i + 1} of ${state.marks.length}: ${describe(mark)}`;
        hooks.pick.forEach((fn) => fn(mark, { hover: false }));
      },
      onUserMove: () => hooks.userMove?.(),
    });
    state.scene = scene;
    return true;
  } catch (err) {
    console.warn("3D scroll unavailable:", err);
    $("world").hidden = true;
    $("world-fallback").hidden = false;
    $("position-control").hidden = true;
    $("prev-stroke").hidden = true;
    $("next-stroke").hidden = true;
    textToggle.checked = true;
    textToggle.closest("label").hidden = true;
    textPanel.hidden = false;
    return false;
  }
}

// Open looking at the newest strokes, with the open end ahead to the right.
function openingX() {
  const ps = state.lay.positions;
  if (ps.length === 0) return state.lay.openEnd;
  return Math.min(state.lay.openEnd - 2.5, ps[ps.length - 1].x + (state.scene.narrow ? 0.6 : 3.5));
}

function showScroll() {
  if (!state.scene) return;
  state.scene.setYou(state.you);
  state.scene.setClockOffset(state.clockOffset ?? 0);
  state.scene.setMarks(state.marks, state.lay);
  hooks.sceneReady?.();
  renderWelcome();
  if (!openHash() && !hooks.initialView?.()) state.scene.goTo(openingX(), { instant: true });
}

// --- sound ---------------------------------------------------------------

// Off until the visitor turns it on; remembered per browser. A browser only
// lets audio start inside a gesture, so a remembered "on" waits for the
// first touch or key.
const SOUND_KEY = "long-scroll-sound";
const soundToggle = $("sound-toggle");
const soundSaid = $("sound-said");
const sound = { engine: null, lastHover: null, lastX: null, lastT: 0, recent: [] };

async function soundEngine() {
  if (!sound.engine) {
    const { createSound } = await import("./sound.js");
    sound.engine = createSound();
  }
  return sound.engine;
}

async function setSound(on) {
  localStorage.setItem(SOUND_KEY, on ? "on" : "off");
  if (!on) {
    sound.engine?.disable();
    soundSaid.textContent = "sound off.";
    return;
  }
  try {
    const engine = await soundEngine();
    await engine.enable();
    hooks.soundOn?.();
    soundSaid.textContent =
      engine.ctx.state === "running"
        ? "sound on: touch, hover or pass a stroke to hear it."
        : "sound on: it starts at your first touch or key.";
  } catch {
    soundToggle.checked = false;
    soundSaid.textContent = "sound isn't available in this browser.";
  }
}
soundToggle.addEventListener("change", () => setSound(soundToggle.checked));
if (localStorage.getItem(SOUND_KEY) === "on") {
  soundToggle.checked = true;
  setSound(true);
  const wake = () => sound.engine?.enable().then(() => hooks.soundOn?.());
  window.addEventListener("pointerdown", wake, { once: true });
  window.addEventListener("keydown", wake, { once: true });
}

// The text twin: what just sounded, at most one line every two seconds.
let saidTimer = null;
function said(text) {
  sound.pending = text;
  if (saidTimer) return;
  soundSaid.textContent = sound.pending;
  saidTimer = setTimeout(function flush() {
    saidTimer = null;
    if (sound.pending !== soundSaid.textContent) said(sound.pending);
  }, 2000);
}

const ageDays = (mark) => (Date.now() - Date.parse(mark.createdAt)) / 86_400_000;

function play(mark, opts = {}) {
  if (!soundToggle.checked || !sound.engine) return;
  const i = state.marks.indexOf(mark);
  const pan = state.scene && i >= 0 ? (state.lay.positions[i].x - state.scene.x) / 7 : 0;
  const note = sound.engine.pluck(mark, { ageDays: ageDays(mark), pan, ...opts });
  if (note) said(`plucked: ${note}, ${mark.note ? `“${mark.note}”` : "a stroke with no note"}, ${timeLabel(mark.createdAt)}${whoSuffix(mark)}`);
}

hooks.pick.push((mark, { hover }) => {
  if (hover && sound.lastHover === mark.id) return;
  sound.lastHover = hover ? mark.id : null;
  play(mark);
});
hooks.focus.push((mark) => play(mark));
hooks.arrive.push((mark, { live }) => live && play(mark, { gain: 1.2 }));

// Passing a ribbon plucks it: fast travel chatters (short, quiet, capped
// by the voice limit), slow travel lets each one bloom.
hooks.camera.push((x) => {
  const now = performance.now();
  const prev = sound.lastX;
  sound.lastX = x;
  const dt = Math.max(1, now - sound.lastT);
  sound.lastT = now;
  if (prev === null || !soundToggle.checked || !sound.engine || hooks.passQuiet?.()) return;
  const lo = Math.min(prev, x);
  const hi = Math.max(prev, x);
  if (hi - lo > 30) return; // a jump, not a pass
  const speed = Math.min(1, (hi - lo) / dt / 0.02);
  state.lay.positions.forEach((p, i) => {
    if (p.x > lo && p.x <= hi) play(state.marks[i], { speed });
  });
});

// --- the room: who's here, and their pens --------------------------------

const hereCount = $("here-count");
const roomSaid = $("room-said");
const room = { here: [], known: null, lastPos: null, beatTimer: null };

function post(path, body) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key: live.key, ...body }),
  }).catch(() => null);
}

function currentPos() {
  return state.scene ? Math.max(0, Math.min(1, positionForX(state.scene.x) / 1000)) : 1;
}

function beat() {
  if (!live.key) return;
  room.lastPos = currentPos();
  post("/api/here", { pos: room.lastPos });
}

function renderRoom(list) {
  room.here = list;
  const n = list.length;
  const drawing = list.filter((p) => p.drawing && p.pid !== live.pid).length;
  hereCount.textContent =
    (n <= 1 ? "just you here" : `${n} here now`) + (drawing ? ` · ${drawing === 1 ? "someone is" : `${drawing} are`} drawing` : "");
  // Arrivals and departures, said politely, once per change.
  const ids = new Set(list.map((p) => p.pid));
  if (room.known) {
    const came = [...ids].filter((id) => !room.known.has(id)).length;
    const went = [...room.known].filter((id) => !ids.has(id)).length;
    if (came) roomSaid.textContent = `${came === 1 ? "someone arrived" : `${came} people arrived`} — ${n} here now.`;
    else if (went) roomSaid.textContent = `${went === 1 ? "someone left" : `${went} people left`} — ${n} here now.`;
  }
  room.known = ids;
  if (state.scene) {
    state.scene.setPresence(
      list.filter((p) => p.pid !== live.pid).map((p) => ({ pid: p.pid, x: xForPosition(p.pos * 1000) + 0.5 })),
    );
  }
  if (soundToggle.checked && sound.engine) sound.engine.setDrone(list.map((p) => p.pid));
}

onLive("hello", (data) => {
  room.known = null;
  renderRoom(data.here);
  clearInterval(room.beatTimer);
  room.beatTimer = setInterval(beat, 20_000);
});
onLive("here", renderRoom);
onLive("pen", (data) => {
  if (!state.scene || data.pid === live.pid) return;
  if (data.end) state.scene.endPen(data.pid);
  else state.scene.penTrail(data.pid, data.color, data.points, data.start);
});
hooks.soundOn = () => sound.engine.setDrone(room.here.map((p) => p.pid));

// Moving tells the others where your lantern is, at most every two seconds.
let posTimer = null;
hooks.camera.push(() => {
  if (posTimer || !live.key) return;
  posTimer = setTimeout(() => {
    posTimer = null;
    if (Math.abs(currentPos() - (room.lastPos ?? -1)) > 0.003) beat();
  }, 2000);
});

// Your pen, relayed to everyone else as you draw.
let penStarted = false;
hooks.penStart = () => {
  penStarted = true;
};
hooks.penPoints = (points) => {
  if (!live.key) return;
  for (let i = 0; i < points.length; i += 32) {
    post("/api/pen", { color: selectedColor(), points: points.slice(i, i + 32), start: penStarted && i === 0 });
    penStarted = false;
  }
};
hooks.penCancel = () => live.key && post("/api/pen", { end: true });

// A stroke that came from someone's pen replaces their glowing trail.
hooks.arrive.push((mark) => mark.from && state.scene?.endPen(mark.from));

// --- play the scroll -----------------------------------------------------

// The camera flies from the first stroke to now with time compressed, each
// stroke growing and sounding as the camera reaches it, so the community's
// real rhythm is the music. Bounded: never under 8 s or over 90 s.
const playButton = $("play");
const stopButton = $("stop");
const speedSelect = $("play-speed");
const shareLink = $("share-link");
const playback = { active: false, raf: 0, start: 0, t0: 0, t1: 0, rate: 1, next: 0 };

// Where along the scroll a moment in time sits, between the strokes either side.
function xForTime(t) {
  const ps = state.lay.positions;
  if (ps.length === 0) return state.lay.openEnd;
  if (t <= ps[0].t) return ps[0].x;
  for (let i = 1; i < ps.length; i++) {
    if (t <= ps[i].t) {
      const k = (t - ps[i - 1].t) / Math.max(1, ps[i].t - ps[i - 1].t);
      return ps[i - 1].x + (ps[i].x - ps[i - 1].x) * k;
    }
  }
  return ps[ps.length - 1].x;
}

function startPlayback() {
  if (!state.scene || state.marks.length === 0) return;
  stopPlayback(false);
  const ps = state.lay.positions;
  const span = ps[ps.length - 1].t - ps[0].t;
  const wanted = span / Number(speedSelect.value);
  const seconds = Math.max(8, Math.min(90, Math.max(wanted, state.marks.length * 0.35)));
  Object.assign(playback, { active: true, start: performance.now(), t0: ps[0].t, t1: ps[ps.length - 1].t, next: 0 });
  playback.rate = Math.max(1, span) / (seconds * 1000);
  for (const m of state.marks) state.scene.setHidden(m.id, true);
  state.scene.goTo(ps[0].x - 2, { instant: true });
  nowAt.textContent = `Playing the scroll from ${timeLabel(state.marks[0].createdAt)}, about ${Math.round(seconds)} seconds.`;
  playback.raf = requestAnimationFrame(tick);
}

function tick(now) {
  if (!playback.active) return;
  const simT = playback.t0 + (now - playback.start) * playback.rate;
  while (playback.next < state.marks.length && state.lay.positions[playback.next].t <= simT) {
    const mark = state.marks[playback.next];
    state.scene.setHidden(mark.id, false, { grow: true });
    play(mark, { gain: 1.1 });
    playback.next++;
  }
  state.scene.goTo(xForTime(simT) - 0.3);
  if (playback.next >= state.marks.length) {
    stopPlayback(true);
    return;
  }
  playback.raf = requestAnimationFrame(tick);
}

function stopPlayback(finished) {
  if (!playback.active) return;
  playback.active = false;
  cancelAnimationFrame(playback.raf);
  for (const m of state.marks) state.scene.setHidden(m.id, false);
  nowAt.textContent = finished ? "Played to the open end — this is now." : "Stopped.";
}

playButton.addEventListener("click", startPlayback);
stopButton.addEventListener("click", () => stopPlayback(false));
hooks.userMove = () => stopPlayback(false);
// During playback the reveal plucks each stroke itself; passing is quiet.
hooks.passQuiet = () => playback.active;

// --- links to a spot -----------------------------------------------------

let linkTimer = null;
hooks.camera.push((x) => {
  clearTimeout(linkTimer);
  linkTimer = setTimeout(() => {
    const i = indexNear(x);
    shareLink.href = i < 0 ? "#" : `#stroke=${state.marks[i].id}`;
  }, 300);
});

// #stroke=<id> opens at that stroke; #t=<ISO time or epoch ms> at that moment.
function openHash() {
  if (!state.scene) return false;
  const params = new URLSearchParams(location.hash.slice(1));
  const id = Number(params.get("stroke"));
  if (params.has("stroke") && state.byId.has(id)) {
    state.scene.goTo(state.lay.positions[state.marks.findIndex((m) => m.id === id)].x, { instant: true });
    bringIntoView(id);
    return true;
  }
  const raw = params.get("t");
  if (raw) {
    const t = /^\d+$/.test(raw) ? Number(raw) : Date.parse(raw);
    if (Number.isFinite(t)) {
      state.scene.goTo(xForTime(t), { instant: true });
      const i = indexNear(xForTime(t));
      if (i >= 0) bringIntoView(state.marks[i].id);
      return true;
    }
  }
  return false;
}
window.addEventListener("hashchange", openHash);

buildPalette();
loadPad();
(async () => {
  const [hasScene] = await Promise.all([loadScene(), load()]);
  if (hasScene && state.marks) showScroll();
})();

// Exposed for the feature modules loaded below and for debugging; nothing
// on this object is a secret.
window.longScroll = { state, hooks, onLive, live, describe, bringIntoView, timeLabel, colorName };
