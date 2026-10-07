// Vanilla JS, no build step: this page is small enough that a bundler would
// be more machinery than the app itself.

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

const scrollList = document.getElementById("scroll");
const emptyNotice = document.getElementById("scroll-empty");
const welcomeBack = document.getElementById("welcome-back");
const form = document.getElementById("add-mark-form");
const paletteEl = form.querySelector(".palette");
const noteInput = document.getElementById("note");
const statusEl = document.getElementById("form-status");

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

function timeLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function markToListItem(mark, you) {
  const li = document.createElement("li");
  li.className = "mark" + (you && mark.handle === you ? " mark--yours" : "");

  const stroke = document.createElement("span");
  stroke.className = "mark__stroke";
  stroke.style.setProperty("--stroke", mark.color);
  stroke.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "mark__text";
  const noteText = mark.note ? mark.note : "(a stroke, no note)";
  const yoursSuffix = you && mark.handle === you ? " — yours" : "";
  text.textContent = `${noteText} — ${timeLabel(mark.createdAt)}${yoursSuffix}`;

  li.append(stroke, text);
  return li;
}

const liveStatus = document.getElementById("live-status");
const marksById = new Map();
let you = null;

function render(marks) {
  scrollList.innerHTML = "";
  if (marks.length === 0) {
    scrollList.append(emptyNotice);
    return;
  }
  for (const mark of marks) {
    scrollList.append(markToListItem(mark, you));
  }

  const ownCount = you ? marks.filter((m) => m.handle === you).length : 0;
  if (ownCount > 0) {
    welcomeBack.hidden = false;
    welcomeBack.textContent =
      ownCount === 1
        ? "You've left a mark on this scroll before — it's still there."
        : `You've left ${ownCount} marks on this scroll before — they're still there.`;
  }
}

async function load() {
  // fly.toml stops this app's one machine when idle and starts it on the next
  // request, so a cold start (or any dropped connection) is a real, not
  // hypothetical, way for this fetch to reject rather than resolve.
  try {
    const res = await fetch("/api/marks");
    const data = await res.json();
    you = data.you;
    marksById.clear();
    for (const mark of data.marks) marksById.set(mark.id, mark);
    render(data.marks);
    connect();
  } catch {
    scrollList.innerHTML = "";
    const notice = document.createElement("li");
    notice.className = "scroll__empty";
    notice.textContent = "couldn't load the scroll — check your connection and try reloading.";
    scrollList.append(notice);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const color = new FormData(form).get("color");
  const note = noteInput.value;

  statusEl.textContent = "adding your mark…";
  let res;
  try {
    res = await fetch("/api/marks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ color, note }),
    });
  } catch {
    statusEl.textContent = "that mark couldn't be added — check your connection and try again.";
    return;
  }

  if (!res.ok) {
    statusEl.textContent = "that mark couldn't be added — try a shorter note.";
    return;
  }

  const { mark } = await res.json();
  addLive(mark);
  noteInput.value = "";
  statusEl.textContent = "added to the scroll.";
});

function lastId() {
  let max = 0;
  for (const id of marksById.keys()) max = Math.max(max, id);
  return max;
}

function addLive(mark) {
  if (marksById.has(mark.id)) return;
  marksById.set(mark.id, mark);
  render([...marksById.values()].sort((a, b) => a.id - b.id));
}

// EventSource reconnects on its own (sending Last-Event-ID) after a dropped
// connection, but gives up for good on an error response, which a sleeping
// Fly machine can produce; then this opens a fresh one, asking for whatever
// came after the last stroke it holds.
let source = null;
let retryDelay = 1000;
function connect() {
  if (!("EventSource" in window) || source) return;
  source = new EventSource(`/api/events?since=${lastId()}`);
  source.addEventListener("open", () => {
    retryDelay = 1000;
    liveStatus.textContent = "live";
  });
  source.addEventListener("mark", (event) => addLive(JSON.parse(event.data)));
  source.addEventListener("error", () => {
    liveStatus.textContent = "reconnecting…";
    if (source.readyState === EventSource.CLOSED) {
      source = null;
      setTimeout(connect, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30_000);
    }
  });
}

buildPalette();
load();
