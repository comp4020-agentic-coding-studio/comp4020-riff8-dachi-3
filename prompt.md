# Prompt: turn the Long Scroll into a playable, drawable, three-dimensional, shared instrument

You are taking over a small working app (read `README.md`, `CLAUDE.md`, `src/`,
`public/`, `spec/`, and skim `docs/IDEA_EXPLORATION.md`, which is background
research, not a spec). Nobody is here to answer questions. Make the decisions
below yourself, write them down in the README and commit messages, and run
the whole ladder in one go.

## The ambition

Today the "scroll" is a wrapped list of coloured bars and sentences. It is
quiet, flat, still, and you only see other people's strokes on reload. That is
a comment list wearing paper. Make it an **object people want to touch, walk
through, and play together**:

> A long ink-wash handscroll you move through in 3D. Every stroke is a
> brushstroke someone actually drew, standing in the mist as an ink ribbon.
> Distance along the scroll is time: the first stroke ever is at the far end,
> and the open end, where the paper is still unpainted, is now. Every ribbon is
> also a **plucked string**: touch one and it rings, so scrolling through the
> history *performs* it. Other people who are here right now appear as lights
> and as voices in a drone, and you can watch them draw, live.

Aim for a visitor with a second window open to see, hear and feel the point
within a minute, with no explanation. Be bold, and make it beautiful before you
make it clever. Restraint in palette, generous in motion and sound.

You have a very large budget and many hours. Use them. Work down the ladder
below, in order, and **keep going until the ladder is finished** or you run out
of clean slices. Do not stop after the first few rungs. A finished, polished
rung beats two half-built ones, so never start a rung you cannot leave in a
working state.

## Hard rules (do not break these)

These come from `CLAUDE.md`. Nothing here overrides them:

- **Append-only.** A stored stroke is never edited or deleted, by any path. All
  new state (presence, last-seen, seeds you derive later, anything else) lives
  in *separate* tables or in memory, never as an edit to a stroke.
- **Server-side validation of everything.** Colour must be one of the six
  palette colours in `src/marks.ts`; a note is at most 140 characters; new
  geometry (below) is validated for point count, numeric type and bounds.
  Never trust the browser's own limits.
- **No accounts, no names.** An anonymous per-browser identity is all that is
  ever required to add a stroke.
- **Cross-site writes are refused.** Every new `POST` endpoint keeps the
  `Origin`/`Host` check, the body-size cap and the existing response headers.
- **No element's only signal is colour.** Every stroke is also text: the note,
  the timestamp, and a `— yours` suffix. Every sound has a visible, textual
  twin. Every interactive control is a **native, labelled** element reachable by
  keyboard (see rung 3's keyboard rules).
- **Restart-safe.** The scroll is read from SQLite, not held in memory.
  Everything that matters survives a restart and a redeploy.
- **`spec/invariants.test.ts` stays green and unedited.** `/` answers 200 and
  `/readme/` serves every `README.md` heading, in order.
- **`pnpm check` and `pnpm check:evidence` pass before every commit.**

## Leave alone

- The riff block at the top of `CLAUDE.md` (leave it exactly as it is).
- `fly.toml` (one `shared-cpu-1x`, 256 MB, one volume, auto-stop: design for
  it, do not change it). Reconnect-and-replay (rung 1) is how the app copes
  with a sleeping machine.
- `PROCESS.md`, `reflections/`, `agent/`, `scripts/check-evidence.ts`.
- The six palette colours and the 140-character note limit. They are the
  app's constraint and the argument depends on them. Render them richly (ink
  wash, glow, mist) but store and validate only the six.
- No accounts, no editing or deleting strokes, and no second database.

## Technical decisions already made (so you do not have to ask)

- **Transport:** Server-Sent Events plus the existing `POST`. No WebSocket
  server unless a measured need appears, and then argue it in the README.
- **3D:** vendor a **pinned** build of [Three.js](https://threejs.org/) into
  `public/vendor/` (include its licence file and record the version). Load it
  with an import map. **No bundler and no build step.** One runtime
  dependency on the server (`marked`) stays one. The Dockerfile copies
  `public/` already; check that anything new you add on the server side is
  copied too.
- **Sound:** Web Audio only, **synthesised**, no sample files. You cannot
  listen, so choose conservative, consonant sound: a pentatonic scale, soft
  envelopes, a low master gain, and a limit on simultaneous voices. Sound is
  **off until the visitor turns it on** with a labelled native control.
- **Drawing:** a 2D drawing pad (Pointer Events, so mouse, touch and pen all
  work) whose result is shown as a ribbon in the 3D world. Do not draw
  directly in 3D; it is fragile on touch screens.
- **Performance:** instanced or merged geometry, a cap on rendered ribbons
  with level-of-detail for distant ones, a pixel-ratio cap, and pause rendering
  when the tab is hidden. Respect `prefers-reduced-motion`. If WebGL is
  unavailable, the **Text view** (below) must still work fully.
- **Server load:** broadcast batched at about 100 ms; cap open SSE clients;
  presence lives in an in-memory `Map` with a timeout, never in SQLite;
  pen-trail posts are rate limited per hand.

## The ladder (do these in order; commit and push after each rung)

After each rung: run `pnpm check` and `pnpm check:evidence`, start the app, and
**drive it in a real browser** (headless Chromium is fine) with two sessions
open, and look at screenshots. If a rung does not work in the browser, fix it
or revert it before moving on. Each rung's commit message says what a visitor
can now do.

**1. Live foundation.** Make strokes appear in every open session within about
a second, no reload. SSE with an `id:` per event, `Last-Event-ID` replay from
SQLite on reconnect, a `: keepalive` comment every ~15 s (Fly closes idle
connections at about 60 s), batching, and an `EventSource` client that
reconnects and shows a small text status ("live" / "reconnecting"). Then fix
the identity flaw: `/api/marks` currently returns every stroke's `hand`, which
is also the secret cookie value. Separate a **public handle** (derived, safe to
show) from the **secret token** (the cookie, never returned). Migrate the
existing rows. Add a spec proving the secret never appears in any response and
that sending someone else's public handle as a cookie does not make you them.

**2. Make the stroke a stroke.** A stroke becomes a drawn path plus the
existing colour and optional note. Add a drawing pad: the visitor draws one
continuous stroke, picks a colour, writes an optional note and adds it. Store
the path as a short polyline of integer points in a fixed coordinate box (cap
the point count, around 64 to 128; reject anything out of bounds or non-numeric)
and a per-stroke `seed` used by later rungs. **Migrate without losing data:**
the existing strokes have no path, so derive a deterministic default path from
their seed and keep them. **Keyboard alternative:** the pad is pointer-only, so
also offer a native select or radio set of shapes (wave, peak, hook, loop, dot,
line) that generates a valid path, so someone using only a keyboard can still
add a stroke. Update the specs for the new shape.

**3. The 3D scroll (Three.js).** The main view is a 3D handscroll. Distance
along the scroll is time; the unpainted, misty open end is now. Each stroke
stands as a ribbon extruded from its path, in its colour, with soft ink-wash
shading, fog, a paper-textured ground and gentle depth. New strokes grow in live
from the open end. Camera movement: drag or swipe to travel along the scroll,
scroll wheel and arrow keys to move, with easing. Hover or tap a ribbon to show
its note, timestamp and `— yours` in a readable overlay. Your own ribbons are
outlined, and labelled in text. Add a first-class **Text view**: the same
strokes as an accessible list (note, time, `— yours`), reachable by a native
toggle, which is also the fallback when WebGL is unavailable.
Keyboard rules: a native range input "Position along the scroll", buttons for
"Previous stroke" / "Next stroke", and Enter or Space on a focused stroke in the
Text view brings it into view. Everything the pointer can do, the keyboard can.

**4. Ink Strings (sound).** A native "Sound" switch (off by default, labelled,
persisted per browser). With sound on, every ribbon is a plucked string
(Karplus-Strong or a close, cheap approximation): its drawn length picks a note
on a pentatonic scale, its age darkens it (a low-pass filter, so older strokes
sound deeper), and its colour picks its timbre. Touching, hovering or passing a
ribbon plucks it. Moving along the scroll fast makes strokes chatter; slowly,
they bloom one at a time. Each public handle gets a stable voice, so you can
learn which "hand" wrote what by ear. New live strokes ring when they arrive.
Text twin: a polite live region that names what just sounded ("plucked: *note*,
*when*"), throttled so it is not noisy. Cap voices, ramp gain on every change,
and fix a master level that cannot clip.

**5. The room is audible and visible (presence and live pens).** Each person
here right now appears as a light in the world and adds one voice to a slow
drone (when sound is on), so two windows make a visible, audible chord and a
person leaving fades out over a few seconds. While someone draws on the pad,
others see their pen trail live as a glowing line at the open end, which
becomes the permanent ribbon when they add the stroke and simply vanishes
if they do not. Show a text count ("3 here now") and announce arrivals and
departures politely in text. State in the README, plainly, which things reach
others live and which wait for a reload, and what happens when two people draw
at once (answer: both strokes are added in arrival order; pen trails are
ephemeral; nobody waits for a turn).

**6. Living Ink.** Strokes keep changing after they are written, and coming back
is worth it. Compute growth as a pure function of `(seed, now - created_at)`:
branching tendrils, drifting bloom and slow pigment settling, so older ribbons
look weathered and your own old stroke has visibly grown since you last
looked. No server simulation and no stored state. Make it identical in two
windows by using an integer-seeded PRNG. Always leave the ink readable.

**7. Play the Scroll.** A native "Play from the beginning" control: the camera
flies from the first stroke to the present with time compressed (say, a day
per second, capped to a sensible total duration), strokes appear and sound as
the camera reaches them, so the community's real rhythm is a piece of music. A
speed control (native select) and a Stop button. Share a position with a
`#stroke=<id>` or `#t=<time>` link that opens at that spot.

**8. Since you were here.** On return, open at the visitor's last visit and show
what happened while they were away, in text and in the world: "7 strokes came
while you were away; 2 are near yours", with a visible boundary at the point
they left. Keep a `last_seen` record in a separate table, keyed by the secret
token and never exposed.

**9. Never empty.** The live scroll currently holds a handful of strokes from
one hand, so a first visitor sees nothing. Add three or four **resident
hands**: scripted, labelled in text as `— resident` (never disguised as
people), whose strokes appear at a gentle pace, but only when the scroll is
sparse. The README must say they exist and why. They obey the same validation
and append-only rule as everyone else.

**10. Optional if time remains (pick what you can finish well):**
- A **hash chain** over the strokes, with a "Verify the scroll" button that
  re-checks it in the browser. It makes "append-only" something a visitor can
  check.
- A **Pulse** strip, a one-glance timeline of activity that doubles as
  navigation.
- **Anniversary echoes:** a stroke glows on its one-day, one-week and
  one-month anniversaries.
- A **Wall mode** (`/?wall`): a read-only, fullscreen-friendly view for a
  projector, with a wake lock where supported.

**11. Close-out.** Do this last, even if the optional rungs are unfinished.
- Rewrite `README.md` (keep it well-organised and honest: what it is, what
  "good" means now, what is enforced and what is judged, and the multi-person
  decision from rung 5). Keep the existing heading style; `/readme/` must serve
  every heading. Cite only sources you have actually read; the references in
  `docs/IDEA_EXPLORATION.md` section 5 are a good start. Credit Three.js and
  any technique you borrowed.
- Rewrite `spec/marks.test.ts`, `spec/page.test.ts` and `spec/persistence.test.ts`
  to encode this brief (they may be changed or deleted). Cover at least:
  geometry and colour and note validation (including hostile bodies), no secret
  token in any response, spoofed handle does not impersonate, cross-site POST
  refused on every write endpoint, PUT/PATCH/DELETE refused, a second SSE client
  receives a new stroke within one second, `Last-Event-ID` replay after a
  reconnect, persistence across a restart, the Text view exposing note, time
  and `— yours` for every stroke, and every control being a native labelled
  element. Update `spec/README.md` to match. These run in jsdom, so test the
  API and the DOM; do not try to test WebGL there.
- Update the `Dockerfile` if anything new needs copying, and confirm the image
  still builds the way CI builds it.
- Delete `prompt.md` in your final commit, and push. `main` must be deployable at
  every commit, not just the last.

## What good looks like

- Two windows side by side: draw in one, and within a second a ribbon grows in
  the other, a pen trail glows while you draw, and a voice joins the drone.
- Scroll or fly along the scroll with sound on and it plays itself.
- It reads as **one continuous object with a past and a present**, not as a
  list of comments. Finding your own old stroke, grown and weathered, feels like
  the point.
- It stays small in spirit: a handful of files, one server dependency, no
  build step. If a clever idea needs a framework, find the simpler form.
- It works on a phone: touch to move and draw, nothing wider than the screen,
  text view always available.
- It degrades gracefully: no WebGL means Text view; no sound means a silent but
  complete app; a dropped connection means a visible "reconnecting" and a clean
  catch-up.

If you must choose between spectacle and a promise in the hard rules, keep the
promise. If you must choose between a finished earlier rung and a half-built
later one, keep the finished one.
