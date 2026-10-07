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

const state = {
  marks: [],
  byId: new Map(),
  you: null,
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
  text.textContent = describe(mark);
  button.append(stroke, text);
  button.addEventListener("click", () => bringIntoView(mark.id));
  li.append(button);
  return li;
}

function renderList() {
  scrollList.replaceChildren(...(state.marks.length ? state.marks.map(listItem) : [emptyNotice]));
}

function renderWelcome() {
  const ownCount = state.marks.filter(isYours).length;
  if (ownCount > 0) {
    welcomeBack.hidden = false;
    welcomeBack.textContent =
      ownCount === 1
        ? "You've left a mark on this scroll before — it's still there."
        : `You've left ${ownCount} marks on this scroll before — they're still there.`;
  }
}

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
  nowAt.textContent = `Stroke ${i + 1} of ${state.marks.length}: ${describe(mark)}`;
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

let cardTimer = null;
function showCard(mark, left, top) {
  hoverCard.textContent = "";
  const note = document.createElement("strong");
  note.textContent = mark.note || "(a stroke, no note)";
  const meta = document.createElement("span");
  meta.textContent = `${timeLabel(mark.createdAt)} · ${colorName(mark.color)}${whoSuffix(mark)}`;
  hoverCard.append(note, meta);
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

// Later features (sound, live pens, living ink) hang off these.
const hooks = { arrive: [], focus: [], camera: [], pick: [], loaded: [] };

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
$("prev-stroke").addEventListener("click", () => step(-1));
$("next-stroke").addEventListener("click", () => step(1));
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
  state.scene.setMarks(state.marks, state.lay);
  hooks.sceneReady?.();
  if (!hooks.initialView?.()) state.scene.goTo(openingX(), { instant: true });
}

buildPalette();
loadPad();
(async () => {
  const [hasScene] = await Promise.all([loadScene(), load()]);
  if (hasScene && state.marks) showScroll();
})();

// Exposed for the feature modules loaded below and for debugging; nothing
// on this object is a secret.
window.longScroll = { state, hooks, onLive, live, describe, bringIntoView, timeLabel, colorName };
