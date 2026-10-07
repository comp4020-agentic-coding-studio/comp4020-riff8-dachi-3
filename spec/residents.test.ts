import { expect, it } from "vitest";
import { validateMark } from "../src/marks.ts";
import { RESIDENTS, residentName, residentStroke } from "../src/resident-hands.ts";

// The residents obey the same rules as everyone: every stroke any of them
// will ever make passes the server's own validation, and their hands can
// never be a cookie (a cookie hand must be a UUID).

it("only ever makes strokes the server's own validation accepts", () => {
  const cycle = RESIDENTS.length * 60;
  for (let n = 0; n < cycle; n++) {
    const s = residentStroke(n);
    expect(validateMark({ color: s.color, note: s.note, shape: s.shape }).ok, JSON.stringify(s)).toBe(true);
    expect(residentName(s.hand)).toBe(RESIDENTS[n % RESIDENTS.length].name);
    expect(s.hand).not.toMatch(/^[0-9a-f]{8}-/);
  }
});
