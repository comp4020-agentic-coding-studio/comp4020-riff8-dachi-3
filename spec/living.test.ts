import { expect, it } from "vitest";
import { growth, signature } from "../public/lib/growth.js";

// Living Ink is a pure function of (seed, age in minutes): the same answer in
// every window and on every reload, and it only ever grows.

it("grows identically for the same seed and age, whatever the clock's seconds", () => {
  const a = growth(123456, 4321.2);
  const b = growth(123456, 4321.9);
  expect(signature(a)).toBe(signature(b));
  expect(a).toEqual(b);
});

it("starts bare, then grows and settles monotonically with age", () => {
  expect(growth(99, 0).tendrils).toHaveLength(0);
  let previous = growth(99, 0);
  for (const minutes of [30, 120, 600, 1440, 10080, 43200, 525600]) {
    const g = growth(99, minutes);
    expect(g.tendrils.length).toBeGreaterThanOrEqual(previous.tendrils.length);
    expect(g.settle).toBeGreaterThanOrEqual(previous.settle);
    const reach = (x: typeof g) => x.tendrils.reduce((n, t) => n + t.length, 0);
    expect(reach(g)).toBeGreaterThanOrEqual(reach(previous));
    previous = g;
  }
  expect(previous.tendrils.length).toBeLessThanOrEqual(6);
  expect(previous.settle).toBeLessThanOrEqual(1);
});

it("gives different seeds different growth", () => {
  expect(signature(growth(1, 20000))).not.toBe(signature(growth(2, 20000)));
});
