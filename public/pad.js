// The drawing pad: one continuous stroke, by mouse, touch or pen (Pointer
// Events), drawn on a 2D canvas in the same BOX×BOX square the server
// validates. The keyboard path is the shape radios beside it, not this.
import { BOX, shapePath, simplify } from "./lib/shapes.js";

export function createPad(canvas, { getColor, onStart, onPoints, onEnd, onCancel }) {
  const ctx = canvas.getContext("2d");
  let raw = [];
  let drawing = false;
  let pointerId = null;
  let pending = [];
  let preview = null;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvas.clientWidth;
    canvas.width = Math.round(size * ratio);
    canvas.height = Math.round(size * ratio);
    redraw();
  }

  function toBox(event) {
    const rect = canvas.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) / rect.width) * BOX,
      ((event.clientY - rect.top) / rect.height) * BOX,
    ];
  }

  // Ink: a stroke whose width swells in the middle and tapers at both ends,
  // over a faint wash, so the preview looks like what lands in the scroll.
  function drawPath(points, color, alpha = 1) {
    if (points.length === 0) return;
    const k = canvas.width / BOX;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0][0] * k, points[0][1] * k, 14 * k * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 1; i < points.length; i++) {
      const t = i / (points.length - 1);
      ctx.lineWidth = (10 + 26 * Math.sin(Math.PI * t)) * k * 1.4;
      ctx.beginPath();
      ctx.moveTo(points[i - 1][0] * k, points[i - 1][1] * k);
      ctx.lineTo(points[i][0] * k, points[i][1] * k);
      ctx.stroke();
    }
    ctx.restore();
  }

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (raw.length > 0) drawPath(raw, getColor());
    else if (preview) drawPath(preview, getColor(), 0.55);
  }

  function flushPending() {
    if (pending.length > 0) onPoints?.(pending.map(([x, y]) => [Math.round(x), Math.round(y)]));
    pending = [];
  }
  const flushTimer = setInterval(() => drawing && flushPending(), 90);

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || drawing) return;
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    drawing = true;
    pointerId = event.pointerId;
    preview = null;
    raw = [toBox(event)];
    pending = [raw[0]];
    onStart?.();
    redraw();
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing || event.pointerId !== pointerId) return;
    const p = toBox(event);
    const last = raw[raw.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 4) return;
    if (raw.length >= 2000) return;
    raw.push(p);
    pending.push(p);
    redraw();
  });
  const finish = (event) => {
    if (!drawing || event.pointerId !== pointerId) return;
    drawing = false;
    pointerId = null;
    flushPending();
    onEnd?.();
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", finish);

  new ResizeObserver(resize).observe(canvas);
  resize();

  return {
    hasDrawing: () => raw.length > 0,
    path: () => simplify(raw),
    showShape(shape) {
      raw = [];
      preview = shape ? shapePath(shape, 7) : null;
      redraw();
    },
    clear() {
      const had = raw.length > 0;
      raw = [];
      preview = null;
      redraw();
      if (had) onCancel?.();
    },
    redraw,
    dispose: () => clearInterval(flushTimer),
  };
}
