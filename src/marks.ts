// A request that isn't the form can send anything: the shape a browser form
// enforces (a fixed set of radio values, a maxlength attribute, a pad that
// only ever produces points inside its own box) is re-checked here rather
// than trusted.
import { BOX, MAX_POINTS, SHAPES } from "../public/lib/shapes.js";

export const PALETTE = [
  "#2b2118", // walnut
  "#5b4636", // umber
  "#8a6d3b", // ochre
  "#3f5d40", // pine
  "#3a5a6b", // slate
  "#7a3b3b", // madder
] as const;

export type Color = (typeof PALETTE)[number];
export type Point = [number, number];

const MAX_NOTE_LENGTH = 140;

export type Geometry = { path: Point[] } | { shape: string };

export type ValidationResult =
  | { ok: true; note: string; color: Color; geometry: Geometry }
  | {
      ok: false;
      reason: "unknown-color" | "note-too-long" | "bad-path" | "unknown-shape" | "missing-path";
    };

export function isColor(value: unknown): value is Color {
  return typeof value === "string" && (PALETTE as readonly string[]).includes(value);
}

// One to MAX_POINTS points, each exactly two integers inside the box.
export function isPath(value: unknown): value is Point[] {
  return (
    Array.isArray(value) &&
    value.length >= 1 &&
    value.length <= MAX_POINTS &&
    value.every(
      (p) =>
        Array.isArray(p) &&
        p.length === 2 &&
        p.every((v) => Number.isInteger(v) && v >= 0 && v <= BOX),
    )
  );
}

export function validateMark(input: {
  note?: unknown;
  color?: unknown;
  path?: unknown;
  shape?: unknown;
}): ValidationResult {
  if (!isColor(input.color)) {
    return { ok: false, reason: "unknown-color" };
  }
  const rawNote = typeof input.note === "string" ? input.note : "";
  const note = rawNote.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { ok: false, reason: "note-too-long" };
  }
  // A drawn path, or the name of one of the keyboard shapes the server draws
  // itself from the stroke's seed; never both, never neither.
  if (input.path !== undefined && input.shape !== undefined) {
    return { ok: false, reason: "bad-path" };
  }
  if (input.path !== undefined) {
    if (!isPath(input.path)) return { ok: false, reason: "bad-path" };
    return { ok: true, note, color: input.color, geometry: { path: input.path } };
  }
  if (input.shape !== undefined) {
    if (typeof input.shape !== "string" || !SHAPES.includes(input.shape)) {
      return { ok: false, reason: "unknown-shape" };
    }
    return { ok: true, note, color: input.color, geometry: { shape: input.shape } };
  }
  return { ok: false, reason: "missing-path" };
}
