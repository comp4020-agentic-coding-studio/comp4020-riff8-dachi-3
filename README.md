# Long Scroll

A shared handscroll in ink. Anyone who visits can draw one stroke onto it, or
pick one of six brush shapes from the keyboard, then choose one of six inks
and add an optional note of up to 140 characters. Nothing on the scroll is
ever edited or removed. You fly along it in 3D: paper laid on silk, mountains
in mist behind it, and every stroke anyone has added standing up off the
paper as a ribbon of ink, the oldest at the far left and the newest at the
open right-hand end. With sound on, each stroke plucks a string as you pass
it. Come back and your own strokes are still there, marked in text as yours,
and they have grown in the meantime.

The model is Huang Gongwang's
[_Dwelling in the Fuchun Mountains_](https://en.wikipedia.org/wiki/Dwelling_in_the_Fuchun_Mountains)
(1348--1350). He painted it in layers of wet wash and brushwork over two
years. In 1650 a collector ordered it burned so he could take it with him;
his nephew pulled it from the fire already torn in two, and the two pieces
are now held in Hangzhou and Taipei. A handscroll is an object with a past
that keeps accumulating hands, and that is the idea this app is built
around.

## What good means here, for now

**Good means the scroll reads as one continuous object with a past and a
present, not as a list of comments.** In practice that means four things.

- **The present arrives live.** With two windows open side by side, a stroke
  drawn in one grows into the other within a second, and the pen trail
  glows in the second window while the first is still drawing.
- **The past stays legible.** Strokes sit in the order they arrived. A long
  quiet stretch between two strokes leaves a wider gap of bare paper, on a
  log scale capped so a dead month doesn't strand anyone. Old strokes don't
  fade out. They keep changing the way ink on paper does: _Living Ink_
  grows tendrils, forks and pale blossoms on a log clock, so something
  happens in a stroke's first hour and something is still happening after
  a month, while the pigment slowly settles into a paler, wider wash. It is
  a pure function of a stroke's seed and its age, so any two windows that
  agree on the time draw the same growth. Nothing is simulated or stored.
- **Your own stroke is the way in.** A returning browser opens where it left
  off. A thread on the paper reads "you left here", and strokes added since
  are listed as new. Your strokes carry an outline and a "yours" seal in the
  3D view, and "— yours" in text.
- **It stays small.** One server dependency (`marked`, for this page), one
  SQLite file, no build step, and Three.js vendored as two files.

The 3D view is never the only way in. Text view lists every stroke with its
note, time and owner. Without WebGL it is the whole app, and the controls
that only make sense in 3D are hidden.

## What's enforced and what's judged

Enforced, in `spec/` (run against the running app; `spec/README.md` lists
each file):

- colour must be one of the six palette inks, a note is at most 140
  characters, and geometry is either a known shape name or a path of 1--96
  integer points inside the drawing box, all checked server-side. Hostile
  bodies get a 4xx, never a 500.
- a stroke is never edited or deleted: PUT, PATCH and DELETE are refused.
- every write (`/api/marks`, `/api/pen`, `/api/here`) refuses a cross-site
  request, an oversized body and a body that isn't a JSON object.
- the secret `hand` token never appears in any response body. Another
  person's public handle, sent as a cookie, doesn't make you them.
- a second open window receives a new stroke within one second, and a
  reconnecting window's `Last-Event-ID` replays exactly what it missed.
- presence joins and leaves, pen trails are relayed and validated, and a pen
  posting faster than any hand draws gets a 429.
- strokes, handles, the hash chain and last visits survive a restart.
- the hash chain recomputes from the served fields alone.
- Living Ink is deterministic: the same seed at the same age gives the same
  growth, and growth never goes backwards.
- residents only appear while someone is here and the scroll is sparse, and
  they're always labelled.
- without WebGL the Text view lists every stroke with its note, a time, and
  "— yours" where it applies. Every control is a native, labelled element in
  the tab order.

Judged, by a person in front of it: whether flying along the scroll with
sound on feels like playing it; whether a ribbon growing in from someone
else's window feels like company rather than a notification; whether your own
old stroke, grown and weathered, feels like the point; and whether six inks,
six shapes and 140 characters are enough constraint to keep this a scroll and
not a chat log.

## Several people at once

**The decision: nobody waits for a turn, and nothing is ever merged.** Each
stroke is a separate, immutable row, so two people drawing at the same
moment can't conflict. The server is the single authority on order: strokes
are appended in the order they reach it, each one hash-linked to the one
before. Figma's account of its
[multiplayer design](https://www.figma.com/blog/how-figmas-multiplayer-technology-works)
makes the same call for the same reason. A central server that decides the
order means no operational transforms, and conflicts only arise where two
people write the same property. An append-only scroll has no shared
property to write.

What happens while you draw is ephemeral and kept separate from what gets
stored:

- **Pen trails** are relayed live, about every 90 ms, to every other window
  as a glowing line, but they are never stored. When you add the stroke, your
  trail turns into the ribbon in everyone else's window. If you abandon it, it
  fades after eight seconds.
- **Presence** is a lantern on the scroll at each other window's position,
  plus a "here" count. Each person here adds one voice to a low drone. A
  presence carries no handle and no name, only a window and where it's
  looking.

**What reaches other windows live:** new strokes, pen trails, presence and
the drone. **What waits for a reload:** a stroke's growth, which every
window computes for itself from the shared clock, so nothing needs sending,
and your "since you were here" boundary, which is set when you leave.

Residents are four labelled hands (heron, moss, kiln, ferry) that add the
occasional stroke when someone is here and the scroll has been quiet: fewer
than six strokes in 24 hours, at most 24 a day, minutes apart. They exist
so that a lone visitor to a sparse scroll still sees the live path working.
They are always marked "— resident" in text and with a seal in 3D, so they
are never passed off as people.

## Notable choices

- **Server-Sent Events, not WebSockets.** Every live update flows from
  server to clients. The few client-to-server messages (pen points, a
  position heartbeat) are ordinary POSTs that go through the same Origin
  check, body cap and validation as adding a stroke. SSE gives automatic
  reconnects and `Last-Event-ID` replay for free, with each stroke's row id
  as its event id. Writes are batched into one flush every 100 ms, in the
  spirit of Nolen Royalty's
  [notes on scaling One Million Checkboxes](https://eieio.games/blog/scaling-one-million-checkboxes/),
  where batching many updates into a single emit was one of the cheapest
  wins. A 15 s keepalive holds the connection open through Fly's proxy, and
  a cap on open streams returns 503 past it.
- **Rate limits are token buckets** kept in memory. Strokes allow 8 at
  once, refilling at one every five seconds per hand; pens allow 20 posts a
  second per window. One Million Checkboxes is also the cautionary tale for
  missing input validation, which is why the pen relay validates points as
  strictly as a stored path does.
- **Public handles without migrating any rows.** The cookie stays a secret
  bearer token. What's shown is `sha256(salt:hand)` cut to 12 characters,
  with the salt kept in the database's `meta` table and derived on read. The
  `path` and `seed` columns were added with `ALTER TABLE`. Older rows leave
  them empty and get a seed from their id and a default brush shape, also
  derived on read. Nothing already stored was rewritten.
- **The hash chain makes "append-only" checkable by anyone.** Each stroke's
  link is `sha256(previous link + its canonical fields)`, starting from
  `"long-scroll"`. The Verify button recomputes every link in your browser
  with SubtleCrypto. If any earlier stroke had been altered, the chain would
  break at that stroke.
- **Rendering stays cheap.** One custom ink shader with fog, a 12-segment
  mesh past 16 units, nothing drawn past 46, at most 160 ribbons at once,
  pixel ratio capped at 1.75, and the render loop pauses when the tab is
  hidden. With reduced motion, the camera doesn't glide, ink doesn't
  shimmer, and new strokes appear without growing in.
- **Every sound has a text twin.** Sound is off until you turn it on. A
  stroke's pitch is chosen from a three-octave A pentatonic scale by its
  length, shifted by its hand, and its age closes a low-pass filter. Each
  pluck, and each voice joining or leaving the drone, is captioned in a
  polite live region.

Also here: Play, which flies the scroll's whole history at a chosen speed;
share links to a stroke (`#mark-<id>`); a Pulse strip showing activity per
day; anniversary echoes on a stroke's first day, week, month and year; and
Wall mode (`?wall`), a drifting full-screen view for a projector.

## Credits

- [Three.js](https://threejs.org/) r186 (MIT), vendored in
  `public/vendor/three` with its licence.
- Plucks use Karplus--Strong string synthesis (Kevin Karplus and Alexander
  Strong, "Digital Synthesis of Plucked String and Drum Timbres", _Computer
  Music Journal_, 1983;
  [summary](https://en.wikipedia.org/wiki/Karplus%E2%80%93Strong_string_synthesis)).
  A noise burst is fed through a delay line that averages and damps it, so
  the high frequencies die away first. One buffer is cached per note and ink.
- Seeded randomness (shapes, growth, mountains) uses mulberry32, Tommy
  Ettinger's small 32-bit PRNG, so the same seed always gives the same
  drawing in every browser.
- The drone has one slow voice per person here, low in the same scale, and
  each voice wobbles at its own rate, so the chord never quite repeats. This
  borrows loosely from Brian Eno's
  [_Music for Airports 2/1_](https://reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/),
  whose tape loops of incommensurable lengths drift through chance
  harmonies.
