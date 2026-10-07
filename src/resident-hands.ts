// The resident hands: four scripted contributors who keep a sparse scroll
// from being empty. They are labelled "— resident" everywhere a stroke is
// said, never passed off as people, and their strokes go through the same
// validation and the same append-only store as anyone's.
import { SHAPES } from "../public/lib/shapes.js";

export interface Resident {
  name: string;
  color: string;
  shapes: string[];
  notes: string[];
}

export const RESIDENTS: Resident[] = [
  {
    name: "heron",
    color: "#3a5a6b",
    shapes: ["line", "hook", "wave"],
    notes: [
      "mist on the far bank",
      "standing still is also a stroke",
      "the river keeps no record; the paper does",
      "one leg, then the other",
      "",
      "grey water, grey sky, a line between",
    ],
  },
  {
    name: "moss",
    color: "#3f5d40",
    shapes: ["dot", "loop", "wave"],
    notes: [
      "slow is a speed",
      "",
      "green where the rain sat",
      "a small thing, kept",
      "the stone remembers the shade",
    ],
  },
  {
    name: "kiln",
    color: "#7a3b3b",
    shapes: ["peak", "hook", "dot"],
    notes: [
      "warm hands, cold tea",
      "the fire went out; the pot stayed",
      "",
      "something baked in",
      "a crack is where the glaze ran",
    ],
  },
  {
    name: "ferry",
    color: "#8a6d3b",
    shapes: ["wave", "line", "loop"],
    notes: [
      "across, and back again",
      "the far shore is someone's near shore",
      "",
      "rope, plank, water",
      "waiting is part of the crossing",
    ],
  },
];

export const residentHand = (r: Resident): string => `resident:${r.name}`;

export function residentName(hand: string): string | null {
  return hand.startsWith("resident:") ? hand.slice("resident:".length) : null;
}

// The nth stroke overall picks a resident in turn; each picks its next shape
// and note in turn too, so their contributions vary but stay theirs.
export function residentStroke(n: number): { hand: string; color: string; note: string; shape: string } {
  const r = RESIDENTS[n % RESIDENTS.length];
  const k = Math.floor(n / RESIDENTS.length);
  const shape = r.shapes[k % r.shapes.length];
  if (!SHAPES.includes(shape)) throw new Error(`resident ${r.name} has an unknown shape ${shape}`);
  return { hand: residentHand(r), color: r.color, note: r.notes[k % r.notes.length], shape };
}
