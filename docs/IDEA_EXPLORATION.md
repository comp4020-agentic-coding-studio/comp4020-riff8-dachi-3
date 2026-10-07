# Long Scroll — Idea Exploration

> **Status:** research and ideation only. Nothing here has been built, decided or prototyped. The production artefact is untouched.
> **Purpose:** give us *far too many* strong directions to review, so the next session can narrow them aggressively and write a separate `prompt.md`.
> **Written:** 2026-10-07, against the deployed artefact at <https://comp4020-riff8-dachi-3.fly.dev/> and the repo at `HEAD = b6c2fb4`.

## How to read this document

| Part | What it is |
|---|---|
| **1. Grounding** | What exists, what the course actually requires, what is only a current choice |
| **2. Platform reality** | Hard constraints and verified facts that decide what is realistic |
| **3. Idea catalogue** | 160+ ideas in 16 families, numbered `001`+, each in the same compact format |
| **4. Coverage map** | Which ideas answer which of the provocation areas (A–S) |
| **5. External references** | Researched exemplars: what is interesting, what to borrow, how it translates |
| **6. Twenty standouts** | The ideas I think are worth serious discussion |
| **7. Ten combinations** | Coherent experience directions assembled from the ideas |
| **8. Comparison matrix** | Qualitative scores for the twenty standouts |
| **9. Questions We Need to Decide** | The forks that emerged |

Ratings (**Potential / Complexity / Risk**) are my own qualitative judgement, not measurements. **Complexity** is judged against *"a week of work with an agent, on this repo's stack, on one 256 MB machine"*. **Risk** means "likelihood this ends up broken, boring, or unfinishable", not "danger".

Ideas tagged **WEIRD** are deliberately strange, excessive or initially unreasonable. They live together in Family 16, but many other ideas are also bold.

---

# 1. Grounding

## 1.1 The current core interaction

A visitor arrives at a single page, sees a flex-wrapped list of small vertical bars each followed by a line of text ("*note — timestamp — yours*"), picks one of **six earthy ink colours** (walnut, umber, ochre, pine, slate, madder), optionally types a **≤140-character note**, and presses **Add to the scroll**. The stroke is stored forever. On return, their own strokes are marked in text with `— yours` and a "welcome back" banner says they are still there. New strokes from other people appear **on reload only**.

Under the hood (verified by reading the code):

- `node:http` server, **no framework**, one runtime dependency (`marked`, only to render `/readme/`). `node:sqlite`. Vanilla ES-module front end, no build step. ~730 lines in total.
- One table, `marks(id, hand, note, color, created_at)`. `GET /api/marks` returns **the entire table** plus `you` (the caller's hand). `POST /api/marks` validates colour ∈ palette and note ≤ 140 chars server-side, checks `Origin` against `Host`, caps the body at 8 KB, and mints a `hand` UUID cookie (`HttpOnly; Secure; SameSite=Lax`, five years).
- Response headers: `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `no-referrer`.
- Deployed on **one `shared-cpu-1x`, 256 MB Fly machine** in `syd`, with one 1 GB volume, `auto_stop_machines = "stop"`, `min_machines_running = 0`.

## 1.2 The current definition of "good"

From `/readme/`: *"good, at this size, means small enough that everyone's mark is still legible, and durable enough that coming back is worth it."* It borrows from Robin Sloan (home-cooked apps), Ben Hoyt (the small web) and Maggie Appleton (home-cooked software). The README separates **enforced** claims (colour set, 140 chars, restart persistence, append-only, "yours" in text, native labelled controls) from **judged** ones (does it read as one continuous object rather than a comment list; does finding your old stroke feel central; do six colours and 140 chars keep it from becoming a chat log).

## 1.3 REQUIRED vs CURRENT DESIGN CHOICE vs OPEN DESIGN SPACE

I have only listed something as REQUIRED if I saw it on a course page or in this repo's own `CLAUDE.md`. Sources are named.

### REQUIRED

**By the final project brief** (`/assessments/final-project/`, due **noon Mon 9 Nov 2026**):

- A **multi-user** site: people in separate browsers act on shared state *and the app distinguishes them*. What counts as a person (account, pseudonym, anonymous visitor) is open.
- **Real-time**: a change appears in other open sessions **"within about a second, with no reload or other action by the viewer."** The transport is your choice but you must justify it.
- **Persists** across sessions, restarts and redeploys.
- Deployed on a `*.fly.dev` URL. Fixed constraints: **one small machine, one volume**, and two shipped checks (the app answers at `/`; `/readme/` contains the README's headings).
- `README.md` (400–600 words, with sources) served in full at `/readme/`; `PROCESS.md` (900–1100 words); `CLAUDE.md`; `spec/`; reflections; `pnpm check` and `pnpm check:evidence` pass.
- *Designing for co-presence* is stressed: "the app should be more interesting because other people are using it at the same time."

**By the C9 brief, "All at once"** (`/crits/09-all-at-once/`):

- Real-time by the definition above, **plus one written decision** about multi-person behaviour (what reaches others live vs on reload; who sees who is present; what happens when two people change the same thing; what you see on reconnecting the next day), with options considered and costs. An ADR is suggested. *"Your pod will argue for the option you didn't pick."*

**By this repo's riff rules** (`CLAUDE.md` riff block, which governs this repo):

- The **only** file pods change is `prompt.md`. The crit agent runs it **once, unattended, start to finish**, keeps `main` deployable, and deletes `prompt.md` in its last commit.
- `spec/invariants.test.ts` must stay green: `/` answers 200 and `/readme/` publishes `README.md` headings in order.
- The agent's own specs (`marks`, `page`, `persistence`) "encode the brief it was working to" and **may be changed or deleted** if the new brief differs.
- `pnpm check` and `pnpm check:evidence` should pass before commit. *(Note: `check:evidence` still wants `PROCESS.md`, `CLAUDE.md` and a reflection file to exist, so a radical rewrite must not delete those.)*

**Not required by anything I found:** a scroll metaphor; colours; a 140-char note; any specific visual form; sound; canvas, 3D or games; a particular transport. The final brief explicitly welcomes "sincere, weird or satirical takes" and says "small is fine: an app for twelve people, one street, one book club or one afternoon is on-brief."

**Which brief is "next"?** The task description calls this the C8 artefact. C8 ("It's alive!") is what it implements. The obvious next brief is **C9 "All at once"** (which I read), but I could not see the crit runsheet that the repo's `CLAUDE.md` says links the next brief. Everything in this document is written to survive either answer: real-time is required by the final project regardless.

**A process caution, not a requirement of the riff:** the final-project page says the crit agents will build this project too, "showing what the median answer looks like", and that students should draft `README.md`/`PROCESS.md` themselves, using agents only for sources, citation checks and gap-spotting. This document is exploration for a riff prompt; it is not a draft of anyone's graded documents.

### CURRENT DESIGN CHOICES (all revisable)

- The artefact is a **list of coloured bars** inside one long page, i.e. visually a "feed" of marks even though it is called a scroll.
- **Six** ink colours, **140**-character note, one palette (`src/marks.ts`).
- **Append-only**: no edit, no delete (argued in the README; enforced by `spec/marks.test.ts`).
- **No accounts**; identity = anonymous `hand` cookie.
- **No rate limit**, no cap per hand (despite the tagline's "one stroke").
- **Single global scroll**, single page, no rooms.
- **Reload to see others** (explicitly deferred).
- **Server-rendered nothing**: JSON API + vanilla JS; no framework, no build step.
- The earthy "paper and ink" look; text-first presentation.
- SQLite table shape (no coordinates, no parent links, no seed, no event log).
- Spec tests tied to the current DOM (`#scroll li`, `— yours`, six radios).

### OPEN DESIGN SPACE

Everything else: what a mark *is*; whether visitors write, draw, play, place or throw; how others' presence is shown; what "persistence" visibly means; whether time, sound, physics or space are the primary medium; whether there is one scroll or many; how identity is expressed; how the app behaves at 4 vs 4,000 users; how the artefact changes as it ages.

## 1.4 What the existing response does best

1. **The argument is the strongest asset.** The README ties a small, real idea (Sloan, Hoyt, Appleton) to concrete constraints, and splits *enforced* from *judged*. That structure is rare and worth keeping whatever the app becomes.
2. **Append-only as a claim, not an accident.** It is stated, tested (`PUT/PATCH/DELETE` all refused) and defended. It makes every future idea about *accumulation* honest.
3. **Hardening that most small apps skip:** Origin check, clickjacking headers, body caps, cookie shape validation, restart-persistence test. The harness is unusually trustworthy.
4. **The ethos of smallness.** One dependency, plain Node, SQLite, ~700 lines. Almost any idea below can be tested against "does it keep the thing small enough to understand?"
5. **A naming gift.** The repo descends from Dachi/Huang Gongwang's *Dwelling in the Fuchun Mountains*, a literal handscroll. (See the colophon/seal ideas in §3.)

## 1.5 What feels underdeveloped or conventional

Observations from reading the code and the live site, labelled as such:

- **It does not feel like a scroll.** A wrapped flex list of bars and text reads as a comment list, which is the exact failure the README names under *judged*. There is no continuity, no unrolling, no sense of length, no time axis, no visible accumulation.
- **A "stroke" has no stroke.** A stroke is a colour swatch plus a sentence. Nothing is drawn; the pointer, the keyboard and the browser are barely used.
- **It is not real-time yet** (README says so). That is required by the final project.
- **It is silent, still and static.** No sound, motion, ageing or sense of "someone else is here".
- **Cold start is total.** The live scroll currently has **5 strokes, all from one hand** (the author's testing). A first stranger sees a near-empty page; a pod of four sees almost nothing.
- **Identity is very thin and has a design flaw worth knowing about.** `GET /api/marks` returns every stroke's `hand` UUID, and that same UUID is the cookie value. By code reading (I did not exploit it), anyone can send `Cookie: hand=<someone else's id>` and be treated as them for `you`/`— yours` and for authoring strokes. Any idea that makes identity richer (glyphs, seals, voices, reputation) must first separate a **public handle** from a **secret token**. (See idea 132.)
- **The API returns the whole table each load.** Fine for hundreds; wrong for thousands. Ideas about scale need paging, windowing or snapshots.
- **The tagline says "one stroke"; the code allows unlimited.** The README admits no cap. Ink budgets and cooldowns (idea 075) turn this inconsistency into a design.
- **Presentation language is conventional** (paper-coloured page, system sans-serif, form fieldset).

## 1.6 Design space that remains open

Almost all of it. The constraint set that actually binds is small: *multi-user + real-time + persistent + anonymous-friendly + fits on one 256 MB machine + testable by a human in ~10 minutes with two browsers.* Inside that, the scroll could be an **instrument, a landscape, a creature, an archive, a ritual, a game, a seismograph, a terminal, a tapestry, a sky**, or still a plain, very good, scroll.

---

# 2. Platform reality (what decides what is realistic)

These constraints come from this repo, the Fly setup, and a research pass (sources in §5). They are the filter I applied when rating **Complexity** and **Risk**.

## 2.1 The machine and the stack

- **One `shared-cpu-1x`, 256 MB, one 1 GB volume.** `fly.toml` says to leave these as they are. Anything CPU-heavy on the server (physics, procedural generation, many websockets) must be **tiny, lazy, or client-side**.
- **Node 24** (`node:sqlite` built in). **Node has no built-in WebSocket *server*.** Options: **SSE** (built into `node:http`, no dependency) plus the existing `POST`; or the `ws` package (one small dependency).
- **No build step today.** Front-end libraries would have to be **vendored** as static files in `public/` or loaded from a CDN. A bundler is possible but is a real cost to a project whose argument is "fewer moving parts". Three.js / PixiJS / Tone.js work as vendored ES modules; React/R3F effectively demand a build.
- **The Dockerfile copies only `src/`, `public/`, `README.md`.** New server directories need adding. CI builds that image and runs `pnpm check` against it.
- The agent that runs `prompt.md` has **~4 hours, unattended, cannot deploy, cannot ask questions**, and verifies in a real browser. That biases towards ideas with a *demonstrable first slice* and few moving parts, and away from ideas needing human taste to tune (sound design, shaders).

## 2.2 Real-time facts (verified by research; details in §5)

- **SSE + POST** is the smallest change: keep a `Set` of open responses, broadcast after `INSERT`, send `id:` per event, send `: keepalive` every ~15–20 s, replay from SQLite on reconnect using `Last-Event-ID`. Append-only makes replay trivially safe.
- **Fly's proxy** closes idle connections after about **60 s** of silence (community threads) → heartbeats are mandatory.
- **Auto-stop is a trap for live apps.** Fly's docs do not say open SSE/WebSocket connections keep a machine awake; community reports say machines were stopped despite live sockets. A live demo wants `min_machines_running = 1` (a change to the "leave as is" `fly.toml`, so a conscious decision), or an explicit design that makes sleeping *part of the experience* (idea 056).
- **iOS caveat (one community report, unconfirmed):** small SSE events arriving seconds late on iPhones through Fly's HTTP/2; workaround `alpn = ["http/1.1"]`. If phones matter at the crit, test on a real iPhone.
- **HTTP/1.1 limits browsers to 6 SSE connections per origin across tabs.**
- **Ephemeral presence** (cursors, "3 here now") should live in an in-memory `Map`, never SQLite. Only durable things reach disk.
- **Batching** broadcasts at ~100 ms is the single biggest load saver (One Million Checkboxes post-mortem).

## 2.3 Browser reality (summary of the API check)

| API | Where it works | Use here |
|---|---|---|
| Pointer Events (pressure, tilt, multi-touch) | everywhere | drawing, pens, cursors |
| Web Audio | everywhere, but **needs a user gesture**; iOS silent-switch/interruption quirks | sound |
| DeviceOrientation / Motion | iOS needs `requestPermission()` from a gesture | tilt, shake |
| Gamepad | everywhere | novelty input |
| **Web MIDI** | Chrome/Edge/Firefox(add-on); **no Safari, no iOS** | desktop-only extra |
| getUserMedia (mic) | everywhere with permission; not in iOS standalone PWAs | blow/hum/clap |
| speechSynthesis | everywhere | read-aloud, a voice per hand |
| SpeechRecognition | prefixed, partial, may call out to a platform service | avoid |
| Pointer Lock | desktop only | skip |
| Fullscreen | no element fullscreen on iPhone | projector view needs CSS fallback |
| BroadcastChannel | everywhere modern | multi-window on one browser |
| **Vibration** | Chrome only; not iOS/Firefox | never rely on it |
| Screen Wake Lock | modern browsers | projector view |
| WebAuthn passkeys | broad | optional identity only (an account-ish feel) |
| BarcodeDetector (QR scan) | patchy | avoid: show a QR, let phone cameras scan it |
| Battery / Network Info / Ambient Light / Compute Pressure / Web Bluetooth / WebUSB | Chromium-only or disabled | skip |

Rule of thumb that shaped the ratings: **if it doesn't work on an iPhone it can only be a progressive extra.**

## 2.4 Existing constraints from this repo's own rules that ideas must respect (or consciously argue against)

- Never accept a colour outside the palette, or a note over 140 chars, **validated server-side**. (Palette and limit are *choices* and could change, but whatever replaces them must still be validated server-side.)
- Never require an account or any information beyond an anonymous per-browser identity.
- Never accept a cross-site write (Origin check). **Any new write endpoint must keep this.**
- No element's only signal may be colour; every control native, labelled, keyboard-reachable. These are strong, and many ideas below turn them into features (Family 15).
- `/readme/` must publish `README.md` in full with headings intact. Visitors are meant to read it *before* using the app. An ambitious redesign still has to explain itself there.

## 2.5 What the markers will do (final project, for "demonstration value")

Markers spend about ten minutes with **two side-by-side sessions, both viewports (desktop and phone), a mid-use resize, keyboard use, and live tests of your spec promises**; the top band expects resilience to **simultaneous actions, slow connections and next-day sessions**. I use that as the yardstick for **demonstration value**: *can a stranger see the point in two windows in under a minute?*

---
# 3. Idea catalogue

Format: each idea has a **Category**, a one-sentence **Concept**, the **Visitor experience**, **Why interesting**, **Possible tech**, and three ratings. Ideas are numbered globally. Cross-references like *(see 056)* point to other entries.

**Families**

| # | Family | IDs |
|---|---|---|
| 1 | Communal instruments (sound as material) | 001–015 |
| 2 | Living systems and materials | 016–026 |
| 3 | Spatial worlds and 3D | 027–037 |
| 4 | Physical simulations | 038–045 |
| 5 | Time and history | 046–060 |
| 6 | Multiplayer presence and rituals | 061–074 |
| 7 | Playful rules and game-like systems | 075–085 |
| 8 | Narrative systems | 086–094 |
| 9 | Anonymous identity | 095–101 |
| 10 | Browser-native and unusual input | 102–114 |
| 11 | Multi-device | 115–118 |
| 12 | Scale | 119–122 |
| 13 | Backend and data-model changes | 123–132 |
| 14 | Visual and artistic direction | 133–139 |
| 15 | Accessibility as design | 140–145 |
| 16 | **WEIRD / RISKY** | 146–171 |

---

## Family 1 — Communal instruments (sound as material)

*The shared premise: sound is generated, not played from files. Everything can be synthesised from stored fields (colour, note, time, hand) so the append-only store and server validation stay unchanged. Sound must be opt-in behind a native, labelled control, and every sound needs a visible and textual twin (see Family 15).*

### 001 — Ink Strings
**Category:** Sound / Instrument
**Concept:** Every stroke is a plucked string; its length sets pitch, its age sets timbre, and moving through the scroll performs the piece.
**Visitor experience:** Strokes are drawn as vertical strings. Hover, tap or scroll across them and they sound (Karplus–Strong pluck). New strokes ring as they arrive; old ones are duller and slower to decay.
**Why interesting:** The scroll becomes something you *play*, not read. The archive and the instrument are the same object.
**Possible tech:** Web Audio, Karplus–Strong (a small AudioWorklet, or a delay-line approximation), no samples. Optional Tone.js.
**Potential:** Very High · **Complexity:** Medium · **Risk:** Medium (needs sound design taste; autoplay rules)

### 002 — Timestamp Score
**Category:** Sound / Time
**Concept:** The scroll is a musical score where horizontal position is real time, so the community's actual rhythm of visiting becomes the rhythm of the piece.
**Visitor experience:** A playhead sweeps the scroll. Bursts of activity (a crit pod all adding strokes in one minute) become dense chords; quiet days are rests. Play speed is selectable (1× to a day per second).
**Why interesting:** It makes *when* people came audible; no one has to compose anything.
**Possible tech:** Quantise timestamps to a grid, map colour → instrument voice, schedule with the "two clocks" Web Audio pattern.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

### 003 — Scrubbing Is Sound
**Category:** Sound / Interaction
**Concept:** Scrolling velocity and direction drive playback, like dragging a tape or turning a record by hand.
**Visitor experience:** Scroll fast and the scroll "chatters"; scroll slowly and you hear individual strokes bloom; scroll backwards and sounds play reversed; stop and it falls silent. Scrolling is no longer neutral.
**Why interesting:** Turns the most ordinary browser gesture into an expressive one, and makes the *length* of the scroll physically felt.
**Possible tech:** `scroll` + `requestAnimationFrame` velocity, granular playback of synthesised grains, `AudioParam` ramps.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 004 — Hand Timbres
**Category:** Sound / Identity
**Concept:** Each anonymous hand gets a deterministic synth voice (waveform, filter, vibrato) so you can *hear* who wrote what.
**Visitor experience:** After a few visits you recognise "your" sound. In a pod, you can tell which of four people wrote a stroke with your eyes shut.
**Why interesting:** Identity without names, faces or accounts; it uses a sense almost no web app uses for identity.
**Possible tech:** Hash of a *public* handle (see 132) → synth parameters; Web Audio oscillators and biquad filters.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 005 — Just-Intonation Neighbourhoods
**Category:** Sound / Generative
**Concept:** New strokes are tuned to the strokes near them in time, so the chord thickens harmonically as people add to it.
**Visitor experience:** When you add a stroke, its pitch is chosen as a simple frequency ratio (3:2, 5:4…) against its neighbours. Adding to a quiet scroll gives a single note; adding to a busy one fills out a chord. Nothing ever clashes.
**Why interesting:** Collaboration becomes consonance; strangers cannot sound bad together (Plink's trick, made historical rather than live).
**Possible tech:** Ratio arithmetic on a drone root; store the chosen ratio at write time so playback is deterministic.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Low

### 006 — Colour Is Instrument
**Category:** Sound / Game-like
**Concept:** The six inks are six percussion/melodic voices; each stroke drops one hit into a shared 16-step loop that gets denser as the scroll grows.
**Visitor experience:** The page continuously loops. When you add a stroke you choose its step. After an afternoon the loop is a crowded polyrhythm; after a week it is wall-to-wall (with an age-based fade to keep it listenable).
**Why interesting:** The existing six-colour palette maps perfectly; "six colours is a constraint" becomes "six instruments is a band".
**Possible tech:** Step sequencer on Web Audio clock; per-step max-voice cap; server stores `step`.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium (becomes noise without caps)

### 007 — The Eternal Loop
**Category:** Sound / Generative
**Concept:** Each stroke is a loop whose length comes from its timestamp, so the whole scroll never repeats (Eno's *Music for Airports* method).
**Visitor experience:** An ambient piece plays continuously; every new stroke adds a note that cycles at its own period. Old strokes quiet slowly. The piece after a month cannot be the piece after a week.
**Why interesting:** Persistence becomes *musical form*. Almost no authored content, endless variation.
**Possible tech:** Loop length = f(createdAt, hash) in seconds; per-voice gain decay by age; Web Audio only.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 008 — Notes as Melodies
**Category:** Sound / Text
**Concept:** The 140-character note is sonified into a short tune, so reading a stroke also means hearing it (Typatone-style letter→note mapping).
**Visitor experience:** Hover a note and it plays its melody; colour chooses the mood (mode/scale). Writing a note previews its tune as you type.
**Why interesting:** Turns the existing constraint into a compositional unit and gives text a sonic personality.
**Possible tech:** Letter-frequency → scale-degree mapping; quantise to a shared clock; Web Audio.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 009 — Phase Drift
**Category:** Sound / Time
**Concept:** Older strokes replay slightly slower than newer ones, so history phases against the present like Reich's tape loops.
**Visitor experience:** Hold the page open and the same pattern slowly shears apart and re-aligns; you hear age as drift.
**Why interesting:** Ageing becomes audible without deleting or editing anything.
**Possible tech:** Per-stroke playback-rate = 1 − ε·age; two stereo-panned copies.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (can sound like a bug)

### 010 — Spatial Choir
**Category:** Sound / Space
**Concept:** Strokes sit in a stereo (or 3D) sound field; the viewport is the listener's head.
**Visitor experience:** As you move along the scroll, strokes ahead rise out of the distance, those behind fade left or right; headphones recommended.
**Why interesting:** Position in the scroll becomes position in space; walks through the archive are *heard*.
**Possible tech:** `PannerNode` (equalpower, or HRTF if affordable), `AudioListener` position tied to scroll.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (headphone-dependent)

### 011 — Sonic Sediment
**Category:** Sound / Time
**Concept:** Age acts as a low-pass filter: recent strokes are bright, older ones are lower and muffled, like sound through water.
**Visitor experience:** Scrolling back in time is literally descending: the sound gets darker. The first stroke ever is the deepest note.
**Why interesting:** Cheap, intuitive mapping of the one thing the data always has (time) to the one thing ears track instantly (brightness).
**Possible tech:** One `BiquadFilter` per voice with cutoff = f(age).
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 012 — Call and Response
**Category:** Sound / Rules
**Concept:** A new stroke is a motif that the next visitor must *answer*, within a time window and a musical constraint, so the scroll grows as phrases.
**Visitor experience:** You hear the last phrase, then add your answer (colour + 3 notes chosen on a pentatonic pad). Question–answer pairs link on the scroll.
**Why interesting:** Gives strokes a reason to relate to *the previous visitor* specifically, not the crowd.
**Possible tech:** `parent_id` link; pentatonic constraint; quantised playback.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 013 — Breath of the Room
**Category:** Sound / Presence
**Concept:** Each person currently present adds one voice to a slow drone, so the room's sound *is* who is here right now.
**Visitor experience:** Alone, you hear one soft tone. When a second tab opens, a fifth rises over it. Four people at a crit make a chord; when someone leaves, their voice fades over seconds.
**Why interesting:** Co-presence audible without any UI. A very direct answer to "more interesting because others are using it at the same time".
**Possible tech:** SSE presence `Map`; Web Audio oscillators with slow envelope; voice pitch from hand hash.
**Potential:** Very High · **Complexity:** Low · **Risk:** Low

### 014 — Radio Mode
**Category:** Sound / Passive use
**Concept:** A "listen only" page plays the scroll as a never-ending generative radio station, with new strokes arriving live in the stream (Hatnote/Ocarina's anonymous-listening idea).
**Visitor experience:** Leave it open in a background tab. Occasionally a bell: someone just added a stroke. A "next" button jumps to a random old stroke.
**Why interesting:** Gives people a reason to keep the app open (which real-time needs) without having to *do* anything.
**Possible tech:** Same sound engine as 007; Page Visibility for pausing; Wake Lock for a projector.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 015 — Resonant Body
**Category:** Sound / Physical
**Concept:** The scroll is a resonating object; strikes excite every stroke within range, which ring according to their own pitch.
**Visitor experience:** Tap anywhere to strike. Nearby strokes ring and shimmer for seconds; hitting hard excites more of them. You discover which strokes are "close" by what answers.
**Why interesting:** Sound as a way to *explore* the dataset, not decorate it.
**Possible tech:** Bank of decaying sinusoids (modal synthesis); only render strokes in view.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

---

## Family 2 — Living systems and materials

*Premise: persistence shown as growth, not storage. A recurring technical trick: store only a **seed and a timestamp**, then compute the living form as a pure function of `(seed, now − createdAt)`. The server never needs to simulate; the form is the same on every device and keeps changing for free.*

### 016 — Living Ink
**Category:** Material / Generative
**Concept:** Each stroke keeps growing branching structures after it is written, at a rate set by its age.
**Visitor experience:** You add a short mark. Over hours it sprouts; by tomorrow it has a branching shape. Returning and seeing *your* mark has changed is the reason to return.
**Why interesting:** "Coming back is worth it" becomes literally true: the thing has grown.
**Possible tech:** L-system or noise-driven growth as `f(seed, age)`; Canvas 2D; no server simulation.
**Potential:** Very High · **Complexity:** Medium · **Risk:** Medium

### 017 — Mycelium Scroll
**Category:** Living system
**Concept:** Strokes are spores; threads grow between those made close in time, and live visitors "feed" the network.
**Visitor experience:** A pale web connects strokes. When several people are present, it brightens and pulses along its threads; left alone it dims (never deleted).
**Why interesting:** Relationships between strokes appear without anyone drawing them; presence becomes nourishment.
**Possible tech:** Graph by time proximity; Canvas lines with animated dashes; presence count drives glow.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 018 — Reaction–Diffusion Palimpsest
**Category:** Material / Simulation
**Concept:** A Gray–Scott field is seeded by each stroke, and its patterns thicken with every contribution.
**Visitor experience:** The scroll is a skin of spots, stripes and labyrinths whose layout is the sum of everyone's seeds. Press to see which stroke seeded which patch.
**Why interesting:** Beautiful, alive and obviously cumulative; you can't fake it with CSS.
**Possible tech:** WebGL fragment shader ping-pong (OGL/regl or raw WebGL2); store seed positions; server stores periodic snapshots *or* clients simulate from the seed list (float determinism caveat).
**Potential:** High · **Complexity:** High · **Risk:** High

### 019 — Coral Accretion
**Category:** Living system
**Concept:** Each stroke attaches to the existing structure (diffusion-limited aggregation), so the scroll becomes a coral built from everyone's visits.
**Visitor experience:** A new stroke arrives as a particle that wanders and sticks to the growing form; rings of colour record each day.
**Why interesting:** Beautiful emergent shape, and the form literally *is* the order of arrival.
**Possible tech:** DLA computed deterministically from stroke order and seed; Canvas.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 020 — Six Species
**Category:** Simulation / Ecology
**Concept:** The six inks are six species in a cyclic cellular automaton (rock–paper–scissors dynamics) whose territory shifts as strokes inject new cells.
**Visitor experience:** The page is a living map of coloured regions advancing and retreating. Your stroke drops a colony; where it survives depends on your neighbours.
**Why interesting:** Six colours become six competing forces, so a constraint becomes the engine.
**Possible tech:** CCA on a grid in a shader or typed arrays; server snapshots every N seconds; deterministic stepping to replay.
**Potential:** High · **Complexity:** High · **Risk:** High

### 021 — Slime-Mould Routes
**Category:** Living system
**Concept:** Physarum-style agents find efficient paths between strokes, drawing a transport network that reveals the scroll's "geography of attention".
**Visitor experience:** Glowing paths appear between strokes; busy relationships get thicker. Over days a stable network emerges.
**Why interesting:** Emergent, mesmerising, and it gives structure to a flat list.
**Possible tech:** Agent trail-following on GPU or Canvas; deterministic seeds.
**Potential:** Medium · **Complexity:** High · **Risk:** High

### 022 — The Creature
**Category:** Metaphor / Living system
**Concept:** The whole scroll is one animal; each stroke adds a segment, and its mood and gait reflect recent activity.
**Visitor experience:** A long, segmented creature crosses the screen. Busy periods make it brisk; neglect makes it sluggish and its colours dull. Segments are readable strokes.
**Why interesting:** A shared pet creates care between strangers (the Telegarden principle) without any chat.
**Possible tech:** Procedural creature in Canvas/SVG; activity = strokes in last N minutes; segments from marks.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 023 — Weather Machine
**Category:** Procedural / Atmosphere
**Concept:** The last hour's strokes synthesise a weather state (rain, wind, fog, sun) that colours the whole page and its sound.
**Visitor experience:** Madder ink gathers storm cloud; slate brings rain; ochre brings heat shimmer. The weather is the community's mood, and it changes live.
**Why interesting:** Aggregates many tiny acts into one ambient, shared, legible state.
**Possible tech:** Weighted colour counts over a sliding window; CSS/Canvas particles; Web Audio noise.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 024 — Pigment Chemistry
**Category:** Material
**Concept:** Inks react where strokes touch, producing secondary hues according to rules (ochre + slate → green).
**Visitor experience:** The scroll's palette is richer than the six you can choose, because neighbours mix. Discovering recipes is a small game.
**Why interesting:** The six-colour constraint stays, but its consequences exceed it.
**Possible tech:** Display-layer blending only (stored colours stay in-palette, so validation is untouched); CSS `mix-blend-mode` or Canvas.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 025 — Spore Rain
**Category:** Real-time / Visual
**Concept:** When you add a stroke it releases spores that drift across *other people's* open screens and land near their cursors.
**Visitor experience:** You see small coloured specks arriving from elsewhere; click one to jump to its stroke.
**Why interesting:** Makes real-time arrival tangible and ties strangers' screens together physically.
**Possible tech:** SSE event → local particle; Canvas overlay.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 026 — Flock of Words
**Category:** Simulation / Text
**Concept:** Words from notes are boids that flock by shared letters and colour, forming drifting clouds of related language.
**Visitor experience:** The note text is not a list but a murmuration; click a bird to find its stroke.
**Why interesting:** Language becomes an ecosystem; "chat log" risk is dissolved because messages are never presented as a conversation.
**Possible tech:** Boids in Canvas with deterministic seeds (client-only, not persisted).
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (legibility suffers)

---

## Family 3 — Spatial worlds and 3D

*Premise: give the scroll a place. A recurring caution (see the end of this family): 3D is a spectacle trap unless **place** itself carries meaning.*

### 027 — Walking the Handscroll
**Category:** Metaphor / 2.5D world
**Concept:** The scroll becomes a Chinese handscroll landscape you walk along, with strokes appearing as features in the scenery.
**Visitor experience:** Parallax mountains and water in ink-wash style; notes are inscriptions on rocks and bridges; newer areas are unpainted mist at the far right.
**Why interesting:** Honours the repo's namesake (*Dwelling in the Fuchun Mountains*) and turns "a long scroll" from a list into a *journey with an edge*.
**Possible tech:** Layered Canvas parallax; deterministic placement from seed; optional PixiJS.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 028 — The Tunnel
**Category:** 3D / Time
**Concept:** An endless tunnel; each stroke is a ring on the wall, and travelling forward means going back in time.
**Visitor experience:** Fly (or scroll) down a tube lined with rings of ink; walls are inscribed with notes. The mouth at the entrance is *now*; the far end is the first stroke.
**Why interesting:** The depth axis *is* the history, and the first-person view makes the length felt.
**Possible tech:** Three.js tube geometry with instanced rings; scroll → camera dolly.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 029 — Constellation Sky
**Category:** Spatial / Cosmic
**Concept:** Each stroke is a star at a hash-derived position; a hand's strokes are joined into a constellation.
**Visitor experience:** Look up (drag or tilt a phone). New stars flare when added; your own constellation is labelled in text. Brightness fades with age but never to zero.
**Why interesting:** Finding "your old stroke" becomes stargazing, and identity becomes a *shape*.
**Possible tech:** Canvas/WebGL points; hash→polar coordinates; DeviceOrientation optional.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

### 030 — City of Hands
**Category:** Spatial / Metaphor
**Concept:** Each hand owns a plot; strokes add floors; facades take their colours; the skyline is the scroll.
**Visitor experience:** An isometric skyline grows left-to-right in order of arrival. Your building is highlighted in text and outline.
**Why interesting:** Legible "who built what", and a city is a metaphor people intuitively know how to read.
**Possible tech:** Isometric Canvas/SVG; building height = strokes per hand.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 031 — Accreting Planet
**Category:** 3D / Spectacle (use carefully)
**Concept:** A globe where each stroke lands as vegetation, crater or sea tint; layers stack as geological time.
**Visitor experience:** Spin the planet; new impacts glow where they struck; zoom in to read the notes planted there.
**Why interesting:** Persistence becomes terraforming; one object for 1 to 100,000 strokes.
**Possible tech:** Three.js sphere, vertex-displaced noise, baked vertex colours; chunked reads.
**Potential:** Medium · **Complexity:** High · **Risk:** High

### 032 — The Museum That Grows
**Category:** 3D / Archive
**Concept:** A first-person gallery with one framed work per stroke; the building visibly lengthens as the scroll grows.
**Visitor experience:** Walk a corridor of frames, each with a plaque (note, time, `yours`). A new wing opens each week.
**Why interesting:** "A museum of anonymous contributions", and *growth is architecture*.
**Possible tech:** Three.js low-poly, instanced frames, pointer-lock optional (desktop only) with a touch fallback.
**Potential:** Medium · **Complexity:** High · **Risk:** High

### 033 — SDF Sculpture
**Category:** 3D / Procedural
**Concept:** One shared sculpture built by smooth union of a primitive per stroke; everyone orbits the same object.
**Visitor experience:** A glossy, fused, growing blobby form; your stroke is a lump of your colour; the shape records the order and mood of visits.
**Why interesting:** A single physical-feeling object that changes shape *because of you*, with a very high "wow" per line of code.
**Possible tech:** Fragment-shader raymarching (cap primitives, e.g. last 256 + baked older ones).
**Potential:** High · **Complexity:** High · **Risk:** High

### 034 — Atlas
**Category:** Metaphor / Cartography
**Concept:** Notes become place names on a procedurally generated map whose land and biomes are driven by stroke colours.
**Visitor experience:** An atlas with coastlines, rivers and towns; "name a place" is the act of writing a stroke; zoom from continent to street.
**Why interesting:** A shared fiction of a place made by strangers; cartography naturally supports zoom.
**Possible tech:** Voronoi/noise terrain with seed from stroke id; Canvas/SVG labels; tile cache.
**Potential:** Medium · **Complexity:** High · **Risk:** Medium

### 035 — The Well
**Category:** Spatial / Time
**Concept:** A vertical shaft; depth equals age; you descend with a lamp and each stroke is a niche in the wall.
**Visitor experience:** Light cone from your lamp; deeper means older and darker. At the bottom, the first stroke.
**Why interesting:** Archaeology made literal, with built-in suspense and a natural reason to scroll.
**Possible tech:** Canvas darkness mask with radial light; scroll mapped to depth.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 036 — Orrery
**Category:** Spatial / Time
**Concept:** Strokes are satellites on orbits whose periods derive from their age; the whole scroll is a clock.
**Visitor experience:** A slowly turning system; alignments occur and ring a chime. Old strokes orbit slowly and far out.
**Why interesting:** Deterministic motion from timestamps alone (no simulation state), so it is cheap and always correct.
**Possible tech:** Closed-form orbits in Canvas; Web Audio on conjunctions.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 037 — The Deep
**Category:** Spatial / Optics
**Concept:** Strokes sink through water; at depth, red and then other colours are absorbed, so old strokes lose their hue while keeping their words.
**Visitor experience:** Descend through bright shallows to a blue-black bottom where only text remains. The design makes the colour-never-the-only-signal rule *visible*.
**Why interesting:** It turns an accessibility rule into a physical law and a story ("colour fades, words stay").
**Possible tech:** Depth-based CSS filters/Canvas absorption curves.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

> **Where 3D is probably only spectacle (for this project):** 031 (planet), 032 (museum), 033 (sculpture) are the visually strongest and the likeliest to eat the whole week without improving *co-presence*, *return visits* or *legibility*. They are only worth it if the object itself carries the concept (033's shared, growing sculpture is the best case). 3D also costs mobile performance, keyboard accessibility, testability under jsdom, and a vendored library of ~600 KB+ for Three.js. 2.5D (027, 029, 035, 036) gets most of the "place" benefit for a fraction of the cost.

---
## Family 4 — Physical simulations

*Premise: contributions as persistent simulated objects. Three honest ways to persist a simulation on a tiny server: **(a)** store only seeds and inputs and replay deterministically on each client (event sourcing; float drift is the risk); **(b)** tick a small headless sim on the server at 1–5 Hz (conflicts with auto-stop unless it "catches up on wake", see 129); **(c)** **bake** the settled result into the stored record so replays need no determinism. Several ideas below need no simulation at all because they are closed-form functions of time.*

### 038 — The Persistent Pile
**Category:** Physics / Persistence
**Concept:** Strokes are rigid bodies dropped into a shared bin; the settled pile *is* the scroll.
**Visitor experience:** Your stroke tumbles in with a clack and comes to rest among everyone else's; shaking a phone jostles the pile; the heap grows through the week.
**Why interesting:** Persistence is a physical resting place, not a database row; others' strokes physically constrain where yours can land.
**Possible tech:** Matter.js or planck.js on the client; bake settled positions server-side at insert (option c); text stays in the DOM for accessibility.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (stability, determinism, a11y)

### 039 — The Loom
**Category:** Material / Fabric
**Concept:** Each stroke is a row of weaving; the note's characters, as bits, decide over/under, so every note is a literal pattern in the cloth.
**Visitor experience:** A tapestry rolls out as a long strip; zoom to see thread structure; your row is outlined and your note is also present as text.
**Why interesting:** Digital data → woven pattern echoes Jacquard punched cards and makes "a record" a *textile*, which has a long human history of accumulating hands.
**Possible tech:** Canvas row renderer; deterministic bit mapping from note + colour; SVG for hit-testing.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 040 — The Tower
**Category:** Physics / Game-like
**Concept:** Strokes are blocks stacked in a single column; where you place yours decides whether the tower stands.
**Visitor experience:** Position a block (slide, then release); if the stack topples, a dramatic collapse is recorded in the history (and the scroll starts a new tower on top of the rubble).
**Why interesting:** Cooperation, risk and consequence in one tiny system; the *collapse* becomes a shared event everyone present sees live.
**Possible tech:** planck.js stacking; server-side baked outcome; replay as animation.
**Potential:** Medium · **Complexity:** High · **Risk:** High

### 041 — Hourglass
**Category:** Physics / Time
**Concept:** Each stroke pours a few seconds of coloured sand into a falling-sand world; the grid persists as snapshots; the bottom layers are the oldest days.
**Visitor experience:** Tilt or drag to pour; the sand settles into strata; you can see which colour fell on which day.
**Why interesting:** Time as a *granular* material and a visible, satisfying accumulation (Sandspiel's lesson).
**Possible tech:** Cellular automaton in Canvas (e.g. 256×512 grid = ~128 KB); snapshot every N strokes; client interpolation.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 042 — Pendulum Wave
**Category:** Physics / Closed-form
**Concept:** Each stroke is a pendulum whose length comes from its timestamp; they drift in and out of phase, periodically forming waves.
**Visitor experience:** A row of swinging weights; every so often they align into a snake, then a chaos; clicks on collisions as sound.
**Why interesting:** Beautiful and fully deterministic as `f(createdAt, now)`: no simulation state, no storage, identical everywhere.
**Possible tech:** Closed-form phase; Canvas; Web Audio ticks.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 043 — Springs and Chains
**Category:** Physics / Relationship
**Concept:** A hand's strokes are masses joined by springs; pull one and the whole chain follows.
**Visitor experience:** You can *feel* which strokes belong together because they move together; yours is the chain that responds to your touch.
**Why interesting:** Makes authorship tangible without names; invites play.
**Possible tech:** Verlet integration (~100 lines of Canvas, no library); client-only and cosmetic.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Low

### 044 — Fluid Ink
**Category:** Material / Simulation
**Concept:** Each stroke injects dye into a shared GPU fluid; the picture swirls but the *log of injections* is what persists.
**Visitor experience:** Colour blooms from where strokes landed and drifts; on reload the same injections replay, giving a similar (not identical) picture.
**Why interesting:** Very high visual wow; honest about the fact that the *record* is permanent while the *appearance* is a living rendering.
**Possible tech:** WebGL2 ping-pong fluid (Dobryakov); not deterministic, so cosmetic only; notes stay as DOM text.
**Potential:** Medium · **Complexity:** High · **Risk:** High (mobile GPU, battery)

### 045 — Wind Chimes
**Category:** Physics / Sound / Presence
**Concept:** Strokes hang as chimes in a shared wind; the wind speed is the number of people currently present.
**Visitor experience:** Alone, the chimes barely stir. When a pod of four opens the page, the wind picks up and they strike each other with real, synthesised metallic tones.
**Why interesting:** Co-presence as weather; you can *hear* that others arrived without any cursor or UI.
**Possible tech:** Pendulum model in Canvas; Web Audio modal strikes; presence from SSE.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

---

## Family 5 — Time and history

*Premise: make visible that the artefact has lived. Because the store is append-only, **every past state is already recoverable by filtering on `id`/time**: time travel is free.*

### 046 — Play the Scroll
**Category:** Time / Replay
**Concept:** A "play" control replays the whole history from the first stroke with the gaps compressed, so you watch the community arrive.
**Visitor experience:** Strokes appear in order at 1× to a day-per-second; bursts are visible as bursts. Share a link to a moment (`#t=…`).
**Why interesting:** The cheapest, most legible demonstration of "this is alive and has a past" (Gartic Phone's reveal; Sheep Market's replay).
**Possible tech:** Client-side only; compressed-time scheduler; deep links.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 047 — Candles
**Category:** Time / Material
**Concept:** Each stroke is a candle that burns for as many hours as its note has characters, so longer notes are visible longer.
**Visitor experience:** The scroll is a dark hall with flickering lights. Short notes are quick sparks; a 140-character note burns for nearly six days. When a candle gutters it leaves pooled wax (a permanent, dimmer mark).
**Why interesting:** Length becomes *duration of presence*; effort and visibility trade off; the scroll visibly breathes.
**Possible tech:** `expiry = createdAt + len·1h` computed client-side; Canvas flames; display only (nothing is deleted).
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 048 — Strata
**Category:** Time / Geological
**Concept:** Each day is a layer; older layers compress into thin bands, but a "core sample" drill reveals any day's strokes in full.
**Visitor experience:** The page is a rock face. The top is detailed; depth is dense stripes. Drag a drill to pull a core.
**Why interesting:** Makes scale (1 → 100,000) and age the same thing, and answers "how do we show 10,000 strokes?".
**Possible tech:** Aggregate by day; Canvas/SVG; click to expand a day.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Low

### 049 — Circadian Mirror
**Category:** Time / Data
**Concept:** Strokes carry the *writer's local hour*, so the scroll shows night-owls and early birds as light and dark bands.
**Visitor experience:** Strokes written at 3 a.m. glow differently; reading at night reveals a whole hidden night-side of the community.
**Why interesting:** Time zone and habit appear as visual texture without identifying anyone.
**Possible tech:** Client sends local hour (integer, validated 0–23); render as luminance; privacy note in README.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 050 — Handled Paper
**Category:** Time / Materiality
**Concept:** Reading wears the scroll: frequently viewed spots crease, smudge and brighten; untouched regions stay pale and dusty.
**Visitor experience:** A heat of use accumulates as paper wear and thumb-smudge, so you can see which parts people actually read, and the parts nobody has read yet look *waiting*.
**Why interesting:** Evidence-of-use as the visible form of life; attention is the only thing that makes a mark "fade in".
**Possible tech:** Aggregated dwell time per region (ephemeral batches into a durable tiny table); noise-textured wear rendered in Canvas. Append-only strokes are untouched; wear is a *separate* record.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium (privacy of dwell data, tuning)

### 051 — Generations
**Category:** Time / Structure
**Concept:** Every Sunday the current "volume" closes with a title page and a fixed record; the new volume begins with an inherited constraint from the last.
**Visitor experience:** The scroll is a *series* of volumes. Each opens with a rule inherited from the previous (e.g., last week's most-used colour is banned).
**Why interesting:** Gives time a rhythm and the artefact chapters; Gridcosm's idea of a completed unit becoming the seed for the next.
**Possible tech:** `volume` column derived from timestamp; rule table; immutable volume pages.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 052 — Since You Were Here
**Category:** Time / Return
**Concept:** When you come back, the scroll opens where you left off and shows exactly what happened while you were away.
**Visitor experience:** "7 hands came while you were gone; 3 wrote near your stroke." New strokes ripple in order; a ghost of your last visit marks the boundary.
**Why interesting:** Directly serves "durable enough that coming back is worth it" and the C9 option "what someone sees on reconnecting or returning the next day".
**Possible tech:** Store `last_seen_id` per hand (a *separate* table; strokes stay append-only); SSE catch-up.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 053 — Anniversary Echoes
**Category:** Time / Return
**Concept:** On a stroke's 1-day, 1-week and 1-month anniversaries it pulses, and its author sees a quiet ghost note on their next visit.
**Visitor experience:** "Your stroke from last Tuesday is a week old." The old mark glows for the day.
**Why interesting:** A return hook with no accounts, no email, no push; it asks only for a cookie.
**Possible tech:** Computed from `createdAt` and `hand`.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 054 — Time-Capsule Seals
**Category:** Time / Rules
**Concept:** A stroke can be sealed: visitors see a knot that counts down, and the note is only released by the server at the chosen time.
**Visitor experience:** Choose "open in 1 hour / tomorrow / next week". At the moment of opening, everyone present sees the knot unravel live.
**Why interesting:** Real-time spectacle from scheduled data; withheld text is still append-only (it's just not served yet).
**Possible tech:** `reveal_at` column; server filters notes before reveal; SSE reveal events; minimal timers.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium (server must never leak sealed text)

### 055 — Pulse
**Category:** Time / Data viz
**Concept:** A running heartbeat trace of activity across the scroll's whole life, so you can read its circadian rhythm and the crit-session spikes.
**Visitor experience:** A strip at the top shows minutes, hours or days of activity; click any spike to jump there.
**Why interesting:** A one-glance proof of life that also works as navigation.
**Possible tech:** Aggregate counts; Canvas/SVG sparkline; also doubles as a "scrollbar".
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 056 — The Machine's Sleep Is Visible
**Category:** Time / Infrastructure as narrative
**Concept:** Because the Fly machine auto-stops, long silences are *real* sleeps; the scroll shows them as visible seams, and the first visitor of the day "wakes" it.
**Visitor experience:** A stitched seam labelled "slept 9 h 14 m". The first stroke after a seam is the "waker"; a quiet dawn-chord plays.
**Why interesting:** Turns an infrastructure quirk into folklore, and honestly shows what "persists across restarts" means.
**Possible tech:** Log boot events and last-request time in a separate table; render seams in the timeline.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 057 — Sky Stamp
**Category:** Time / Astronomy
**Concept:** Every stroke carries the sky above Canberra at the moment it was written (moon phase, planet positions, sun altitude).
**Visitor experience:** Hover a stroke and see a tiny star chart and phase; strokes made at the same moon are visibly kin.
**Why interesting:** Makes timestamps beautiful and unique; computed, not stored.
**Possible tech:** A small astronomy routine (or a tiny library) computing positions from `createdAt`; Canvas.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Low

### 058 — Tree Rings
**Category:** Time / Metaphor
**Concept:** The scroll is rolled into concentric rings, one per day; ring width reflects that day's strokes; you read the scroll as a cross-section.
**Visitor experience:** A cut-trunk disc; wet years are fat, drought years thin; click a ring to unroll that day as a strip.
**Why interesting:** A compact, beautiful picture of *all* time; naturally handles 100,000 strokes.
**Possible tech:** Radial Canvas; per-day aggregation.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Low

### 059 — The Back Button Is Time
**Category:** Browser-native / Time
**Concept:** Each stroke has a permalink and the browser's history stack follows your path through the scroll.
**Visitor experience:** Back and forward step through strokes; any moment is a shareable URL (Tixy's lesson: put the state in the URL).
**Why interesting:** Uses the browser itself as the time machine; sharing a stroke becomes trivial.
**Possible tech:** `history.pushState` / `#/stroke/123`; a read-only `GET /api/marks/:id`.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 060 — The Printable Scroll
**Category:** Materiality / Output
**Concept:** A print stylesheet tiles the scroll across sheets of paper so it can be taped into a real, physical scroll.
**Visitor experience:** "Print this scroll": a series of A4 pages with registration marks and a colophon; the pod tapes a three-metre paper at the showcase.
**Why interesting:** A tangible end-of-semester artefact; shows that the data outlives the site.
**Possible tech:** `@media print`, SVG/PDF-friendly layout; no server work.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

---

## Family 6 — Multiplayer presence and rituals

*Premise: "more interesting because others are using it at the same time" (the brief). Avoid "Google Docs with drawings". **Ephemeral presence** belongs in an in-memory `Map`; only durable consequences reach SQLite. A pod of four in one room is the design target.*

### 061 — Pens in the Room
**Category:** Multiplayer / Live drawing
**Concept:** You see other people's pens hovering and writing *as they write*, and a stroke becomes permanent only on release.
**Visitor experience:** Others' pens appear as small tools in their colour with trailing wobble; if three people draw at once the scroll fills live. The commit on release plays a satisfying "set" and the live pen disappears.
**Why interesting:** Co-presence you can watch and race against; also clarifies the line between ephemeral (live) and permanent (committed).
**Possible tech:** Pointer Events → throttled SSE/WebSocket (`ws` for client→server rates); in-memory presence; commit via the existing validated `POST`.
**Potential:** Very High · **Complexity:** Medium · **Risk:** Medium

### 062 — Quorum Door
**Category:** Multiplayer / Cooperative
**Concept:** Some areas open only when at least three people hold the door at the same moment.
**Visitor experience:** A sealed portion of the scroll glows; hold your key/finger; a counter shows 1/3, 2/3… When it reaches the quorum, the door opens for as long as they all hold.
**Why interesting:** Forces *simultaneous* presence; a pod of four will feel it immediately.
**Possible tech:** Presence + `hold` events; server decides state; SSE broadcast.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 063 — The Hourly Gathering
**Category:** Multiplayer / Ritual
**Concept:** On the hour, a 60-second gathering opens; strokes made inside it fuse into one composite glyph carrying everyone's colours.
**Visitor experience:** A countdown; a bell; for a minute, everyone present writes together; the fused glyph keeps the attendance forever.
**Why interesting:** A synchronous ritual that gives real-time a *reason*, while the rest of the day stays asynchronous.
**Possible tech:** Server clock gate; `gathering_id`; fused rendering from member strokes.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 064 — Peelable Territory
**Category:** Multiplayer / Competitive
**Concept:** Colours compete for visible ground, but because nothing is deleted, every region is a stack of layers you can peel back.
**Visitor experience:** The top ink in each area is "winning"; hold to peel through earlier layers, like a palimpsest.
**Why interesting:** r/place's war without r/place's erasure; append-only becomes the *rules of the game*.
**Possible tech:** Spatial coordinates (125); layer ordering by `id`; Canvas.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 065 — Mirror Hands
**Category:** Multiplayer / Pairing
**Concept:** Two present visitors are randomly paired and whatever one draws is mirrored by the other, producing a symmetrical joint stroke credited to both.
**Visitor experience:** "Paired with another hand." Your strokes reflect across a shared axis; either of you can end the session.
**Why interesting:** Stranger-to-stranger collaboration with no chat; symmetry makes cooperation visible.
**Possible tech:** Pairing in-memory; mirrored coordinates; commit as two linked marks (126).
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 066 — One Continuous Line
**Category:** Multiplayer / Constraint
**Concept:** The whole scroll is a single line; each visitor must continue from the previous visitor's endpoint (Klee's "taking a line for a walk", at crowd scale).
**Visitor experience:** You pick up the pen where the last person set it down, draw a few seconds of line, and release. After a thousand visitors it is a kilometre-long meander you can follow end to end.
**Why interesting:** The strongest possible answer to "one continuous object rather than a list"; visitors are literally connected end to end.
**Possible tech:** Store polyline segments with start = previous end; a simple "baton" lock for simultaneous writers (see 067).
**Potential:** Very High · **Complexity:** Medium · **Risk:** Medium

### 067 — Pass the Pen
**Category:** Multiplayer / Turn-taking
**Concept:** Only one visitor holds the pen at a time; others queue and watch live; the holder has 30 seconds.
**Visitor experience:** A visible queue ("you are 3rd"), a live view of the current writer, an audience that can cheer. Four in a crit room rotate naturally.
**Why interesting:** Turns real-time from "conflict risk" into *spectacle*; a clean answer to "what happens when two people act at once".
**Possible tech:** Server-side baton with timeout; SSE; in-memory queue.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 068 — The Average Circle
**Category:** Multiplayer / Collective gesture
**Concept:** Everyone present draws "the same shape" (say, a circle) at once; the server averages their gestures into a consensus form which is saved.
**Visitor experience:** A prompt; everyone draws; the average fades in, with each person's deviation shown; the saved circle becomes a bead on the scroll.
**Why interesting:** Co-presence made *measurable* and *beautiful*: a platonic circle emerges only if people act together.
**Possible tech:** Resample polylines to N points; mean; Canvas; pointer events.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 069 — Fireflies
**Category:** Multiplayer / Emergent sync
**Concept:** Tap along to a shared pulse; when enough people sync (Kuramoto-style), the scroll "locks" into rhythm and flashes together like fireflies.
**Visitor experience:** Each person is a small light that nudges its phase towards others; synchrony level drives sound and brightness; a locked minute is recorded as a mark.
**Why interesting:** Genuine emergent behaviour that *only exists with others present*.
**Possible tech:** Phase-coupled oscillators on the client; server broadcasts presence/taps; Web Audio.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 070 — Whisper Down the Lane
**Category:** Multiplayer / Narrative game
**Concept:** A note is passed to a random present visitor who may change at most three characters before passing it on; the final version is stored with its lineage.
**Visitor experience:** You receive a message mid-mutation, tweak it, send it on; later you can read the full chain with each hand's edit highlighted.
**Why interesting:** Telephone with a strict constraint, producing authorship-through-small-changes.
**Possible tech:** In-memory relay; `parent_id` chain; edit-distance validation server-side.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 071 — Salutes
**Category:** Multiplayer / Light interaction
**Concept:** You can salute a stroke; a ping travels across everyone's screens to it, and strokes saluted often glow longer.
**Visitor experience:** No comments, no likes count; just a brief ping that says "someone saw this" (Dark Souls' appraisals, anonymised).
**Why interesting:** A reactive layer that is not a chat, with presence visible across screens.
**Possible tech:** Separate `salutes` table (strokes remain untouched); SSE broadcast.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 072 — Vote on the Rules
**Category:** Multiplayer / Meta-rules
**Concept:** People present vote, in 20-second windows, on the next rule (the next hour's constraint), Twitch-Plays-style.
**Visitor experience:** A banner offers three constraints (e.g. only vowels, no repeats, warm inks only); the winner is enforced server-side.
**Why interesting:** The aggregation rule itself is visible and contestable (Twitch Plays Pokémon's anarchy/democracy lesson); live presence changes what's allowed.
**Possible tech:** Vote tally in memory; rule table; server-side enforcement.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 073 — Readers Feed Ink
**Category:** Multiplayer / Asymmetric roles
**Concept:** Writers need ink; ink is produced only by *readers'* attention, so the two roles depend on each other.
**Visitor experience:** Readers dwell on strokes to fill a shared reservoir; writers spend from it. Alone, you can't write; with a friend reading, you can.
**Why interesting:** Forces *interdependence* in a scroll that otherwise needs none; wonderful in a pod of four.
**Possible tech:** In-memory reservoir with decay; attention = visible dwell events; server accounting.
**Potential:** Medium · **Complexity:** Medium · **Risk:** High (gameable, confusing)

### 074 — Previously on the Scroll
**Category:** Multiplayer / Reconnection
**Concept:** On joining (or reconnecting), a 10-second montage replays the last ten minutes in fast-forward before you take the live seat.
**Visitor experience:** You never arrive to an empty room; you watch what just happened, then it is "now".
**Why interesting:** A direct, designable answer to "what does someone see on reconnecting" and a great demo moment.
**Possible tech:** Replay from `Last-Event-ID` window; compressed schedule; SSE.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

---

## Family 7 — Playful rules and game-like systems

*Premise: friction and constraint can make a contribution mean more (r/place's cooldown is the canonical case). None of these need to turn the app into "a game"; they change what contributing costs.*

### 075 — Ink Budget
**Category:** Rules / Scarcity
**Concept:** Each hand has a small ink reservoir that refills slowly (say one stroke per ten minutes, banking up to six), so *when* you write is a decision.
**Visitor experience:** A visible ink level; strokes get spent on moments that matter; coming back later refills you (a return hook).
**Why interesting:** Resolves the README's own "no rate limit" tension and the tagline's "one stroke" inconsistency; scarcity makes marks matter and caps write load.
**Possible tech:** Server-side token bucket per `hand`; clear text status (a11y).
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 076 — Shiritori Chain
**Category:** Rules / Word game
**Concept:** Each note must begin with the last letter of the previous note, as in the Japanese word-chain game shiritori.
**Visitor experience:** You see the letter you must start with; rejections explain why; the chain across the scroll becomes a long poem-like thread.
**Why interesting:** Constraint creates continuity *between strangers* without any identity or chat.
**Possible tech:** Server-side validation of first letter vs last stroke's last letter; race handling.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (race conditions, dead ends)

### 077 — The Hidden Rule
**Category:** Rules / Inductive game
**Concept:** The scroll silently rejects strokes that break a hidden rule that visitors must infer, as in Robert Abbott's *Eleusis* card game.
**Visitor experience:** Some strokes are accepted into a main line and some into a "rejected" siding; the pattern reveals the rule to the observant. When someone guesses it, a new rule begins.
**Why interesting:** A mystery that *only the accumulated record can solve*; mixes persistence with puzzle.
**Possible tech:** Rule functions server-side; accepted/rejected stored as separate lines.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 078 — Goals and Unlocks
**Category:** Rules / Progression
**Concept:** The community crosses thresholds that unlock new features (A Dark Room's progressive disclosure), such as a seventh ink at 100 strokes.
**Visitor experience:** The UI is minimal at first; as the count grows, sound appears, then replies, then a second scroll.
**Why interesting:** The artefact *changes visibly with scale*; a cold start becomes a story rather than a failure.
**Possible tech:** Feature flags derived from counts; progressive-enhancement UI.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 079 — Threshold Events
**Category:** Rules / Procedural events
**Concept:** Group behaviour triggers events: ten strokes in five minutes starts a festival; a quiet day brings fog.
**Visitor experience:** The page transforms on thresholds; a crit pod in a room can *trigger* things together.
**Why interesting:** Co-presence has *consequences* beyond visibility.
**Possible tech:** Sliding-window counters; event table; SSE.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 080 — Cross-Reference Puzzles
**Category:** Rules / ARG
**Concept:** Notes may contain cryptic references to other strokes (by time, colour or hand), so the scroll becomes a puzzle box that can only be solved *across* its history.
**Visitor experience:** "Find the stroke written under a waning moon in madder"; solving it unlocks a sealed stroke (see 054).
**Why interesting:** Emergent alternate-reality puzzle that rewards reading the *whole* scroll.
**Possible tech:** Query-based references; sealed reveals; sky data (057).
**Potential:** Medium · **Complexity:** Medium · **Risk:** High (hard to author unattended)

### 081 — The Letter Bag
**Category:** Rules / Scarcity
**Concept:** Notes draw letters from a shared bag (like Scrabble); as letters run out, language bends around the shortage.
**Visitor experience:** "The bag has 3 e's left." People abbreviate, coin words, and wait for refills.
**Why interesting:** A shared resource that forces *collective* awareness of what others have written.
**Possible tech:** Letter counts in a table; server-side decrement; slow refill.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (frustrating at low scale)

### 082 — Daily Seed
**Category:** Rules / Ritual
**Concept:** Each day has one shared prompt (a colour, a word, a shape) that everyone responds to once (Wordle/Spelunky's shared-seed idea).
**Visitor experience:** A daily "issue" of the scroll; you come back for tomorrow's prompt; a streak is held in your cookie.
**Why interesting:** A reason to return every day that needs no accounts.
**Possible tech:** Deterministic daily seed (UTC); day tag on strokes.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 083 — Variety Ink
**Category:** Rules / Soft constraint
**Concept:** Repeating the same colour recently makes your ink visibly thin; varied colours stay rich.
**Visitor experience:** No rejection, just a visible consequence that nudges variety.
**Why interesting:** Uses *display* rather than gatekeeping to shape behaviour.
**Possible tech:** Recent-colour history → opacity.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 084 — Placed by Fate
**Category:** Rules / Chance
**Concept:** You can't choose where your stroke lands; a die does.
**Visitor experience:** "The scroll chose bar 217." Fate can put you beside a stranger or in a lonely corner.
**Why interesting:** Takes agency away to make *chance neighbours* matter.
**Possible tech:** Server RNG (commit–reveal in 131 if you want it auditable).
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 085 — Prediction Slips
**Category:** Rules / Meta
**Concept:** Visitors predict how many strokes will arrive in the next hour; accuracy over time becomes a quiet reputation.
**Visitor experience:** A tiny slip: "I think 7". The scroll shows predictions vs reality; the best forecasters earn a little mark.
**Why interesting:** Gives people a stake in *others'* behaviour (co-presence as a bet).
**Possible tech:** Prediction table; scoring; no money.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

---

## Family 8 — Narrative systems

### 086 — Exquisite Corpse Scroll
**Category:** Narrative / Surrealist game
**Concept:** You only see the last four words of the previous note; the full story is revealed when the volume closes.
**Visitor experience:** Your sentence continues someone else's fragment; at the weekly reveal, the absurd story unfolds.
**Why interesting:** A reason for strokes to relate to each other, with a built-in payoff.
**Possible tech:** Server returns truncated previous note until reveal; volume close job.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 087 — Unfinished Inheritance
**Category:** Narrative / Handover
**Concept:** A stroke can be flagged "unfinished"; the next visitor receives only its opening and must complete it, creating two-handed stories.
**Visitor experience:** "Someone left this unfinished: *The last train left and*…"
**Why interesting:** Authorship across strangers, with obvious pairing in a pod.
**Possible tech:** `parent_id` link; state `open` → `closed`.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 088 — Colophons and Marginalia
**Category:** Narrative / Layers
**Concept:** A second, parallel scroll of anonymous glosses runs alongside the first, as later hands annotate earlier strokes. This is the tradition of colophons on East Asian handscrolls.
**Visitor experience:** Tap a stroke and see its glosses; contradictory readings accumulate and become the meaning.
**Why interesting:** On real handscrolls, centuries of owners add inscriptions *outside* the painting; this honours the repo's namesake (*Dwelling in the Fuchun Mountains* has been annotated and stamped by emperors) and keeps the original untouched.
**Possible tech:** `parent_id` table; second column in the UI; same validation.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

### 089 — Environmental Objects
**Category:** Narrative / Scene
**Concept:** Strokes appear as *objects in a scene* (a campfire, a coat, a bird) chosen from six, and the notes are found letters you discover by inspecting them.
**Visitor experience:** A quiet, wordless landscape that fills with traces of people; you find messages by walking up to them.
**Why interesting:** Stories told by *arrangement* rather than text; fixes the "chat log" risk by hiding words.
**Possible tech:** 2D sprite scene (Canvas/PixiJS); six glyph objects; deterministic placement.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 090 — The Chronicler
**Category:** Narrative / Procedural
**Concept:** Each day a rule-based chronicler appends a paragraph of the scroll's own history, in the voice of an old annalist, from the day's statistics.
**Visitor experience:** "In the third week the madder ink rose, and a hand wrote nothing for six days." The scroll tells its own story.
**Why interesting:** Gives the artefact a narrator and a memory *without an LLM*; the data does the writing.
**Possible tech:** Template grammar over statistics; a daily `chronicle` table; no external service.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 091 — Ghost Hands Whisper
**Category:** Narrative / Time
**Concept:** Hands that haven't returned for a week become "ghost hands": their strokes shift to sepia and occasionally whisper old notes in the margins.
**Visitor experience:** The scroll slowly accumulates a quiet congregation of absent voices.
**Why interesting:** Memory of presence; makes absence legible.
**Possible tech:** `last_seen` per hand; random resurfacing; display-only.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 092 — Leave One, Take One
**Category:** Narrative / Exchange
**Concept:** You can read someone's note only after leaving one, and the note you receive is the previous visitor's, which you then answer.
**Visitor experience:** A tiny gift economy of messages (Postcrossing, Dark Souls' notes).
**Why interesting:** Forces reciprocity and a reason to be sincere.
**Possible tech:** Pairing by order of arrival; delivery table.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (tension with "no private view")

### 093 — Six-Line Oracle
**Category:** Narrative / Divination
**Concept:** Six colours are six lines of a hexagram: you ask a question, six strokes are drawn, and an old note is returned as the "answer".
**Visitor experience:** A short ritual; the oracle's responses and questions become a record of what people wondered.
**Why interesting:** Charming, ritualistic and unlike any chat; the oracle *is* the archive.
**Possible tech:** Seeded selection from past notes; commit–reveal if auditable (131).
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 094 — Each Hand's Poem
**Category:** Narrative / Identity
**Concept:** Read any hand's notes in order as one poem; the scroll becomes an anthology of anonymous poets.
**Visitor experience:** Tap a stroke → "read this hand's poem". Your own poem grows with your visits.
**Why interesting:** Gives identity *literary* shape; supports the README's "finding your own old strokes feels central".
**Possible tech:** Group by `hand`; layout; no data change.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

---
## Family 9 — Anonymous identity

*Premise: the brief requires that "the app distinguishes" people, but not how. Keep anonymity; enrich recognition. **Prerequisite for almost everything here:** a public handle separate from a secret token (see 132), because today the cookie value is publicly visible in `/api/marks`.*

### 095 — Collector's Seals
**Category:** Identity / Tradition
**Concept:** Each hand has a personal seal; visitors "stamp" strokes they have read, as collectors stamped Chinese handscrolls over centuries.
**Visitor experience:** A small chop in your own shape; stamping a stroke leaves your seal beside it, not as authorship but as "I was here and saw this". Heavily stamped strokes become visibly provenanced.
**Why interesting:** An authentic, on-theme identity form (seals and colophons are how real handscrolls accumulate hands) that is anonymous yet distinctive.
**Possible tech:** Procedural seal glyph from public handle (SVG); `stamps` table; display only.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 096 — Signature Squiggle
**Category:** Identity / Gesture
**Concept:** On first visit you draw a one-second squiggle; it becomes your hand's emblem, shown beside every stroke you write.
**Visitor experience:** No name, no avatar picker, just your own scribble, recognisable by shape.
**Why interesting:** Identity that is unmistakably *yours* but contains no personal information; a real moment of arrival.
**Possible tech:** Pointer path → simplified polyline stored with the hand (validated size); SVG.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (more stored data; validation)

### 097 — Evolving Sigil
**Category:** Identity / Time
**Concept:** A hand's glyph acquires rings and ornament for each *day it has visited*, so veterans look ornate and newcomers plain.
**Visitor experience:** Your sigil patinas with use; you can read someone's tenure at a glance.
**Why interesting:** Identity that demonstrates the artefact has lived and that *returning* is rewarded visually.
**Possible tech:** Visit-days count per hand; procedural SVG; separate small table.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 098 — Claim Check Words
**Category:** Identity / Anonymity
**Concept:** After writing you get three random words as a claim check; entering them on any device re-claims your strokes with no cookie and no account.
**Visitor experience:** "Remember: *amber-ladder-quiet*." Next week on a laptop you type them and your strokes are marked yours again.
**Why interesting:** Device-independent continuity with *zero* identity data; a pre-account solution to cookie loss.
**Possible tech:** Store only a hash of the phrase (with a slow hash); server-side claim endpoint; rate limit.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium (phrase leakage, abuse)

### 099 — Passkey Hands
**Category:** Identity / Platform
**Concept:** A passkey serves as a pseudonymous, portable identity with no username or email.
**Visitor experience:** "Keep this hand": one biometric tap; your hand follows you across devices.
**Why interesting:** Real cryptographic identity without accounts in the usual sense.
**Possible tech:** WebAuthn registration/assertion; hand = credential id. *Edges against "never require an account"; must stay optional.*
**Potential:** Medium · **Complexity:** High · **Risk:** High

### 100 — Lineages
**Category:** Identity / Social
**Concept:** A new hand can be invited by an existing hand; the scroll draws a family tree of who brought whom.
**Visitor experience:** Share a link; your "descendants" appear as a branch; the crit pod becomes a visible clade.
**Why interesting:** Social structure with no profiles, and a natural way for a small group to see itself.
**Possible tech:** `invited_by` column; tree rendering; invite token.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 101 — One Person, Two Devices
**Category:** Identity / Multi-device
**Concept:** Link a phone and a laptop into one hand with a QR code, so "yours" is true on both.
**Visitor experience:** Scan a code on the laptop with your phone; both now show `— yours` on the same strokes.
**Why interesting:** Solves a real pod problem (people open it on two devices) without accounts.
**Possible tech:** One-time pairing token; cookie transfer; short TTL.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

---

## Family 10 — Browser-native and unusual input

*Premise: look for browser behaviours that ordinary web apps ignore. Anything that does not work on an iPhone can only be a progressive extra.*

### 102 — Make the Stroke a Stroke
**Category:** Input / Drawing
**Concept:** Replace "colour + sentence" with an actual freehand stroke, kept alongside the note.
**Visitor experience:** Drag a finger or pen across a patch of the scroll; the mark is your gesture, with pressure and speed shaping the ink.
**Why interesting:** The app is called Long Scroll and its marks are "strokes", yet nothing is drawn. Drawing instantly fixes "reads like a comment list".
**Possible tech:** Pointer Events (`pressure`, `getCoalescedEvents` if supported), polyline simplification, server-side limits on point count and bounds; note stays as text.
**Potential:** Very High · **Complexity:** Medium · **Risk:** Medium

### 103 — Gesture Is Rhythm
**Category:** Input / Sound
**Concept:** Store the *timing* of a gesture; replay uses that speed profile as the stroke's rhythm and dynamics.
**Visitor experience:** Fast flicks are staccato; slow drags are long tones; you recognise a person by how they move.
**Why interesting:** Time-in-the-gesture is data most apps throw away; it carries personality.
**Possible tech:** Store `(x, y, dt)` triples; map velocity → amplitude/pitch.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 104 — Read Slowly
**Category:** Input / Scroll velocity
**Concept:** Notes only resolve into legibility when you scroll slowly; fast scrolling blurs them into texture.
**Visitor experience:** Skim and you see a stream of colour; slow down and words sharpen. Stopping reveals fine detail (timestamp, hand seal).
**Why interesting:** Rewards the behaviour the README wants (reading carefully) with the browser's most common gesture.
**Possible tech:** Scroll-velocity → blur/opacity; keep real DOM text for a11y and honour `prefers-reduced-motion`.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (can annoy)

### 105 — Unroll It
**Category:** Input / Metaphor
**Concept:** The scroll is rolled on two dowels; you pull it open with your hand, like viewing a handscroll a section at a time.
**Visitor experience:** Drag to unroll; the left roll is the past, the right roll is the unwritten future; the roll's thickness shows how much of the scroll is on each side.
**Why interesting:** A direct, tactile, one-screen-at-a-time experience that makes "length" felt and gives the scroll a physical *edge*.
**Possible tech:** Horizontal snap-scroll or Canvas drag; thickness from counts; `scroll-snap`.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 106 — Tap Morse
**Category:** Input / Rhythm
**Concept:** Write a note by tapping a single key or the screen in morse rhythm, which doubles as one-switch accessibility.
**Visitor experience:** Tap-tap-hold; short beeps; the note forms letter by letter and the *rhythm of your tapping is stored* and replayed as sound.
**Why interesting:** An input that is also a performance, and one that works with a single switch.
**Possible tech:** Timing-based decoder; Web Audio beeps; server validates decoded text.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 107 — Throw Your Mark
**Category:** Input / Physics
**Concept:** You flick your stroke onto the scroll; velocity and angle determine where it lands.
**Visitor experience:** A satisfying toss; the stroke skids and settles; skill lets you aim near friends.
**Why interesting:** Placement becomes embodied and playful rather than a form field.
**Possible tech:** Pointer velocity → projectile with friction; **bake** the landing position server-side (option c); validate bounds.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 108 — Typed Shapes
**Category:** Input / Keyboard
**Concept:** Every note is automatically drawn as a path derived from the keys' positions on the keyboard, so typing is drawing.
**Visitor experience:** As you type, a line snakes across a miniature QWERTY map; the finished shape is your stroke's picture.
**Why interesting:** Keyboard-first and fully accessible, yet visual; every note has a *unique, deterministic* shape.
**Possible tech:** Key → coordinate map; Catmull–Rom smoothing; server recomputes the path from the note (no extra data to trust).
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 109 — Play the Mark
**Category:** Input / Instrument
**Concept:** If a MIDI keyboard is connected, a played phrase becomes the stroke.
**Visitor experience:** Desktop Chrome only: plug in, play four notes, and they are stored as the stroke's melody.
**Why interesting:** A bridge from hardware instruments into the shared scroll; a nice crit-day flourish.
**Possible tech:** Web MIDI; feature-detect (**no Safari, no iOS**); store note events with a size cap.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 110 — Offerings
**Category:** Input / Drag and drop
**Concept:** Drag an image, text or selection from another tab onto the scroll; it is quantised into the six inks as a tiny mosaic stroke.
**Visitor experience:** Drop a photo; it becomes a 12×12 six-colour pixel icon, like a risograph mosaic.
**Why interesting:** Lets people bring the outside world in under the *same* constraint; the palette becomes an aesthetic filter.
**Possible tech:** Drag-and-drop events; client-side quantisation to the palette; server validates every cell is in the palette.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (image content moderation)

### 111 — Take One
**Category:** Input / Clipboard
**Concept:** Copying a note takes it with you: each note can be taken a limited number of times, like a tear-off phone-number flyer.
**Visitor experience:** Copy a note and its counter ticks down; the most-taken notes thin out visually.
**Why interesting:** Consumption has a visible effect; scarcity around text.
**Possible tech:** `copy` event + `POST /take`; counter table (strokes untouched).
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 112 — Leave to Return
**Category:** Input / Visibility
**Concept:** You can only write again after you have *left* the page for at least thirty seconds.
**Visitor experience:** After adding a stroke, the form says "walk away for a bit"; coming back (tab hidden → visible) re-opens it.
**Why interesting:** Encodes "durable enough that coming back is worth it" as a literal rule; slows chat-like flooding.
**Possible tech:** Page Visibility API plus server-side timestamp; fallback timer for a11y.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (easily gamed; confusing)

### 113 — The Tab Is the Scroll
**Category:** Browser-native / Ambient
**Concept:** The favicon and title become live surfaces: the favicon shows the newest ink; the title scrolls the latest note; background tabs flash when someone arrives.
**Visitor experience:** You leave the scroll open and *glance* at the tab: a green dot means someone wrote in pine.
**Why interesting:** Real-time that does not require focus; extremely cheap; works in a pod where tabs are open all session.
**Possible tech:** Canvas favicon, `document.title`, Page Visibility; Badging API in an installed PWA.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 114 — Push on Neighbour
**Category:** Browser-native / Return
**Concept:** An opt-in web-push says "someone wrote beside your stroke", with the push subscription as an anonymous identity.
**Visitor experience:** Tap "tell me if anyone writes near mine"; a notification brings you back.
**Why interesting:** A real return mechanism with no email; on-brief for "coming back".
**Possible tech:** Service worker + Web Push (VAPID keys; iOS needs the PWA installed). *Adds a dependency/infrastructure and is account-adjacent.*
**Potential:** Low · **Complexity:** High · **Risk:** High

---

## Family 11 — Multi-device interaction

### 115 — Phone as Pen
**Category:** Multi-device / Controller
**Concept:** A phone scans a QR code on a desktop session and becomes the pen; the desktop is the canvas.
**Visitor experience:** Scan; your phone's touchscreen (and tilt) draws on the big screen; four phones can draw at once.
**Why interesting:** Gives a crit room a *shared big surface and four handheld controllers*; Jackbox/AirConsole's lesson that low-friction join is the whole product.
**Possible tech:** Short pairing code; relay via SSE + POST; show a QR with a tiny generator (don't rely on `BarcodeDetector`).
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 116 — Phone Orchestra
**Category:** Multi-device / Sound
**Concept:** Every phone in the room plays one voice of the scroll's chord, so the pod becomes a distributed speaker array.
**Visitor experience:** Open the page on your phones, lay them on the table; each sounds a different part, synced to a server clock; adding a stroke changes the chord in all of them.
**Why interesting:** A *physical* co-presence demonstration; four phones on a desk is a stunning two-minute demo.
**Possible tech:** Clock-offset estimate from the server; Web Audio scheduling; per-device voice from handle.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium (sync, iOS audio quirks)

### 117 — Wall Mode
**Category:** Multi-device / Second screen
**Concept:** A read-only `/wall` display for a projector: big, ambient, auto-scrolling, with a QR to join.
**Visitor experience:** At the showcase, a screen shows the scroll alive; people scan and add strokes that appear within a second.
**Why interesting:** The best possible demonstration surface and a natural public face for the artefact.
**Possible tech:** Fullscreen API (iPhone fallback: CSS), Wake Lock, SSE; large type; simple QR rendering.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 118 — Side Rooms by QR
**Category:** Multi-device / Rooms
**Concept:** Short-lived side rooms (a QR code per room) separate from the long scroll, so a table can play together without crowding the main record.
**Visitor experience:** Scan a table's QR; you're in "table 3"; its results can be promoted to the main scroll or forgotten.
**Why interesting:** Rooms give *small groups* a tight space and match the brief's "twelve people, one street, one afternoon".
**Possible tech:** `room_id` on strokes; URL-addressed rooms (Your World of Text's trick).
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

---

## Family 12 — Scale

*A scroll with 1 stroke and a scroll with 100,000 are different objects. Today's `GET /api/marks` returns every row.*

### 119 — Powers of Ten
**Category:** Scale / Zoom
**Concept:** Semantic zoom: pinch out and 10,000 strokes become a density map; pinch in and each becomes legible.
**Visitor experience:** Continuous zoom from "all of time" to "this one note", with level-appropriate rendering at each scale (like the Eames film).
**Why interesting:** A single interaction that solves legibility at any size and is delightful on phones.
**Possible tech:** Multi-resolution aggregation tiles; Canvas; pinch via Pointer Events; windowed reads.
**Potential:** High · **Complexity:** High · **Risk:** Medium

### 120 — Scale Is Genre
**Category:** Scale / Presentation
**Concept:** The same data is *presented differently* at different counts: one stroke is a candle, ten a table, a hundred a scroll, a thousand a landscape.
**Visitor experience:** The first visitors see something intimate; later visitors see something monumental. The page visibly changes as the community grows.
**Why interesting:** Turns the cold-start weakness into a designed experience and gives growth a visible meaning.
**Possible tech:** Count-based renderers selected by `COUNT(*)`; shared data layer.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 121 — Common Words Become Mountains
**Category:** Scale / Language
**Concept:** Words used by many hands rise as landmarks in the landscape, like names on a map.
**Visitor experience:** The word "tired" becomes a ridge; "bridge" a river; at scale you navigate by language.
**Why interesting:** Density itself creates new forms; the corpus has a geography.
**Possible tech:** Term frequency → landmark layer; labels in SVG.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 122 — Design for Four
**Category:** Scale / Cold start
**Concept:** Treat 4–12 people as the real scale, and make the scroll excellent at that size: founding "ancestor" strokes, a seeded opening, and every interaction tuned for a pod.
**Visitor experience:** A small group never faces an empty page; seeded ancestors are clearly labelled as authored by the makers; the first four real hands visibly change it.
**Why interesting:** Honest to the brief ("small is fine") and to the crit reality (four people in a room, ten minutes).
**Possible tech:** A founding set with a reserved `ancestor` hand; documented in README.
**Potential:** High · **Complexity:** Low · **Risk:** Low

---

## Family 13 — Backend and data-model changes

*Only worth doing when they unlock an experience. Each of these makes several earlier ideas possible.*

### 123 — Hash-Chained Scroll
**Category:** Data / Trust
**Concept:** Each stroke's hash includes the previous hash, so anyone can verify that the scroll was never edited.
**Visitor experience:** "Verify this scroll": the browser recomputes the chain and shows a green line. The README's central claim becomes checkable by a visitor.
**Why interesting:** Makes *append-only* a **verifiable** claim rather than a promise: a transparency log in miniature.
**Possible tech:** SHA-256 over `(prev_hash, hand, note, color, created_at)`; a `hash` column; WebCrypto verify in the browser.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 124 — Everything Is an Event
**Category:** Data / Architecture
**Concept:** Store an append-only event log (stroke, seal, stamp, presence summary, reading) and make every view a projection.
**Visitor experience:** Invisible, but it makes time-travel, replay, new views and A/B ideas cheap to add.
**Why interesting:** One structural change that lets many ideas coexist.
**Possible tech:** `events(id, type, payload, at)`; projections in memory; snapshot occasionally.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 125 — Marks Have Places
**Category:** Data / Space
**Concept:** Strokes get coordinates (x, y, angle, size), so the scroll is a 2D place rather than a list.
**Visitor experience:** You choose *where* to write; neighbours matter.
**Why interesting:** Unlocks territory, maps, constellations, spatial audio and layering.
**Possible tech:** Validated numeric columns with bounds; server decides collisions.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 126 — Parent Links
**Category:** Data / Graph
**Concept:** Strokes can reference another stroke (reply, continue, answer, echo), forming trees and threads.
**Visitor experience:** Threads become visible lines; lineages and conversations emerge without a chat UI.
**Why interesting:** Many narrative and multiplayer ideas depend on a link.
**Possible tech:** `parent_id` foreign key, validated to exist and be earlier.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 127 — Marks as Recipes
**Category:** Data / Procedural
**Concept:** Each stroke stores a **seed**; visuals and sounds are computed from `(seed, time)` on every device.
**Visitor experience:** Rich growth, patterns and sounds with almost no stored data, identical for everyone.
**Why interesting:** Persistence as *procedure*; makes ageing free (no writes) and the store tiny.
**Possible tech:** Server-minted 32-bit seed; seeded PRNG (mulberry32), integer maths to avoid cross-device drift.
**Potential:** High · **Complexity:** Low · **Risk:** Low

### 128 — Snapshots Table
**Category:** Data / World state
**Concept:** Store a compact world state (heat grid, sand, field) every N strokes so clients load the latest snapshot plus recent events.
**Visitor experience:** Fast loads at any scale; time travel to any snapshot.
**Why interesting:** Makes simulation-based ideas affordable and persistent (the One Million Checkboxes pattern).
**Possible tech:** BLOB snapshots in SQLite; keyed by stroke count.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 129 — The World Catches Up
**Category:** Data / Lazy simulation
**Concept:** When the machine wakes after sleeping, the world fast-forwards analytically from the elapsed time, like an idle game.
**Visitor experience:** The scroll kept living while nobody was there, and the proof is that it has *changed* when you return.
**Why interesting:** Embraces Fly's auto-stop rather than fighting it; "persists across restarts" shown as visible catch-up.
**Possible tech:** Closed-form growth (016, 042); wake-time catch-up for anything stateful.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 130 — Presence vs Residue
**Category:** Data / Ephemeral vs durable
**Concept:** Separate what is live (cursors, "3 here now") from what is remembered (who was here, where they lingered).
**Visitor experience:** Ghosts of past presence remain as faint trails after people leave.
**Why interesting:** Clean architecture and a design principle: *what do we remember of who was here?*
**Possible tech:** In-memory `Map` for live; aggregated residue table for durable.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 131 — Provable Fate
**Category:** Data / Fairness
**Concept:** Any chance mechanic publishes a commit-reveal hash, so randomness is auditable.
**Visitor experience:** "Tomorrow's seed has hash 7f3…"; the next day shows the preimage.
**Why interesting:** A nerdy but delightful transparency feature for oracles, dice and daily seeds.
**Possible tech:** Hash of a server secret; reveal job.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 132 — Public Handle, Secret Token
**Category:** Data / Identity foundation
**Concept:** Split the identity into a secret cookie token and a public handle (a hash of it), so `GET /api/marks` can no longer be used to impersonate anyone.
**Visitor experience:** Invisible, but it is the prerequisite for every identity idea (004, 095–101) being trustworthy.
**Why interesting:** Fixes the thin-identity flaw noted in §1.5 while enabling richer identity.
**Possible tech:** `HMAC(server_secret, token)` as the public handle; store only the handle; keep the cookie opaque. Existing rows would need re-keying, since their raw tokens are already public.
**Potential:** High · **Complexity:** Low · **Risk:** Low

---
## Family 14 — Visual and artistic direction

*Premise: each of these is a distinct visual identity that also changes how the artefact behaves. None is "a skin".*

### 133 — Risograph Misregistration
**Category:** Visual / Print
**Concept:** The six inks are separate spot-colour layers printed with slight misregistration; each hand's offset is its signature.
**Visitor experience:** Overprinted multiply-blend colours and halftone grain; your marks are visibly "shifted" in your own particular way.
**Why interesting:** Identity emerges from the physical *process* of printing, not from an avatar; the six-colour limit becomes the medium's honest constraint.
**Possible tech:** Canvas/CSS `mix-blend-mode: multiply`, per-handle offset vector, noise texture.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 134 — The Scrollback
**Category:** Visual / Terminal
**Concept:** The scroll is literally a terminal's scrollback: strokes are log lines, hands are `tty` names, and live arrival is `tail -f`.
**Visitor experience:** Phosphor type, a prompt, keyboard-first commands (`/read 1993`, `/mine`, `/since`), and new lines streaming in.
**Why interesting:** Very fast to build, fully keyboard-accessible, naturally real-time, and honest to "scroll" in the most literal tech sense.
**Possible tech:** Plain DOM text with monospace; SSE appends; command parser.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 135 — Chart Recorder
**Category:** Visual / Scientific instrument
**Concept:** The scroll is a strip of chart paper feeding past six pens at a constant speed; strokes are deflections of the pens.
**Visitor experience:** Paper continuously advances right-to-left in real time; a new stroke makes a pen jump; old paper rolls are archived and can be re-read.
**Why interesting:** Real time is shown as *physical paper moving*; the scroll's length is literally elapsed time, so quiet hours are blank paper and a crit session is a scribble.
**Possible tech:** Canvas drawing at constant px/s; pens by colour; archive by day; a kymograph aesthetic.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

### 136 — Crayon Wall
**Category:** Visual / Anti-polish
**Concept:** A deliberately rough, welcoming children's-drawing style: wobbly lines, crayon texture, stickers, no polish.
**Visitor experience:** The scroll feels like a classroom wall; nobody is afraid to mark it.
**Why interesting:** Roughness lowers the barrier to contribution and protects against "looking professional" as the goal.
**Possible tech:** Canvas stroke jitter, paper texture, hand-drawn font.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 137 — Guestbook 1999 and the Webring
**Category:** Visual / Net art
**Concept:** Lean into the early-web guestbook (the README itself compares the app to one): hit counter, 88×31 buttons per hand, under-construction banners, and a webring linking the pods' riff apps.
**Visitor experience:** Knowingly tacky, affectionate, and linked sideways to other pods' projects.
**Why interesting:** Connects the artefact to a class-wide ecosystem; humour and sincerity at once.
**Possible tech:** Static assets, a hand-built `<nav>` ring; each hand's 88×31 button from its handle.
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (depends on other pods' URLs)

### 138 — Illuminated Marginalia
**Category:** Visual / Manuscript
**Concept:** Notes are lettered in calligraphic type with decorative initials, and each stroke grows small marginal creatures in the style of medieval manuscript drolleries.
**Visitor experience:** The scroll looks like a handwritten book; the creatures are generated from the stroke seed; the margin is where glosses (088) live.
**Why interesting:** Rich, distinctive, and thematically right for a "scroll"; the margin is a natural second layer.
**Possible tech:** SVG creature generator from seed; web font for lettering; CSS for layout.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 139 — The Finding Aid
**Category:** Visual / Archive
**Concept:** The scroll is presented as a museum archive: accession numbers, catalogue cards, shelf marks and an archivist's voice.
**Visitor experience:** Each stroke gets a call number and provenance ("accessioned 2026-10-07 by hand ▲ 41"); you browse by finding-aid rather than by feed.
**Why interesting:** Gives *browsing and searching* a native aesthetic; reframes anonymity as provenance.
**Possible tech:** DOM-based cards; deterministic call numbers; search by date, colour, hand symbol.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

---

## Family 15 — Accessibility as design

*Premise: the repo already insists that no element's only signal be colour and that every control be native and labelled. These ideas treat that as a **source** of the design rather than a tax on it.*

### 140 — Audio-First Scroll
**Category:** Accessibility / Sound
**Concept:** Design the screen-reader and audio experience first: new strokes are announced with `aria-live`, panned in space, and keyboard stepping plays each stroke's sound.
**Visitor experience:** Arrow keys step stroke by stroke; each plays its voice and reads its note and time; a blind visitor and a sighted one share the same live scroll.
**Why interesting:** Accessibility becomes the *primary* interface and drives a radio-play aesthetic.
**Possible tech:** `aria-live` regions, roving tabindex, Web Audio panning, `speechSynthesis`.
**Potential:** High · **Complexity:** Medium · **Risk:** Low

### 141 — Long Exposure
**Category:** Accessibility / Motion
**Concept:** Under `prefers-reduced-motion`, motion is replaced by long-exposure stills: one photographic frame per hour showing light trails of that hour's strokes.
**Visitor experience:** The scroll becomes a contact sheet of the day; calm, beautiful, and strobe-free.
**Why interesting:** The reduced-motion mode is a *distinct aesthetic*, not a degraded copy.
**Possible tech:** Canvas accumulate-and-fade; per-hour aggregation.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 142 — Hatch Not Hue
**Category:** Accessibility / Print
**Concept:** Each of the six inks is also a hatching pattern (cross-hatch, dots, stripes…), so the scroll is an engraving as much as a painting.
**Visitor experience:** Colour-blind visitors read patterns; everyone can toggle "engraving mode"; high-contrast mode becomes a woodcut.
**Why interesting:** Fulfils "colour is never the only signal" generatively and gives a strong second visual identity.
**Possible tech:** SVG `<pattern>` per ink; `forced-colors`/`prefers-contrast` styles.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 143 — A Voice per Hand
**Category:** Accessibility / Voice
**Concept:** Each hand's notes are spoken by `speechSynthesis` in a voice, pitch and rate derived from its handle.
**Visitor experience:** Press "read the scroll" and hear a chorus of distinct voices; you recognise a hand by its voice.
**Why interesting:** Built-in browser capability with zero assets; a radio-play version of the scroll.
**Possible tech:** `speechSynthesis` (voices vary by OS; deterministic pitch/rate from handle).
**Potential:** Medium · **Complexity:** Low · **Risk:** Medium (voice availability varies)

### 144 — Piano-Roll Twin
**Category:** Accessibility / Visible sound
**Concept:** Every sound event also draws on a visible piano-roll strip so the audio features are fully usable muted or by a deaf visitor.
**Visitor experience:** Strokes pulse as they sound; a timeline records what played.
**Why interesting:** Makes any sound idea *legible* and gives the instrument a score.
**Possible tech:** Canvas strip synced to audio clock.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 145 — Captioned Presence
**Category:** Accessibility / Voice of the app
**Concept:** Presence events are written in a gentle running margin log in text ("a hand arrived", "two hands paused") so screen-reader users get the live room too.
**Visitor experience:** A quiet, poetic ticker that doubles as a log and an accessibility feature.
**Why interesting:** Gives co-presence an authored *voice*.
**Possible tech:** SSE events → polite `aria-live` text; throttled.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

---

## Family 16 — WEIRD / RISKY

*Deliberately strange, excessive or initially unreasonable. Their purpose is to widen the design space. Most would not ship as written; several contain a real idea inside a bad shell.*

### 146 — Pyre **WEIRD**
**Category:** Rules / Sacrifice
**Concept:** To write a new stroke you must visibly burn one of your own old ones; it turns to ash on screen (still in the database).
**Visitor experience:** Choose which memory to sacrifice; ash settles into a fine grey layer at the bottom.
**Why interesting:** Makes the append-only claim *dramatic*: you can destroy only the *display*, never the record, which sharpens what "permanent" means.
**Possible tech:** Display-level `burned` flag in a separate table; Canvas ash.
**Potential:** Medium · **Complexity:** Low · **Risk:** High (contradicts the spirit of the README's argument)

### 147 — Cursor Séance **WEIRD**
**Category:** Multiplayer / Ritual
**Concept:** Everyone present moves their cursor on a shared planchette; the averaged push spells letters, and the spelled message is committed as the note.
**Visitor experience:** A ouija board; four cursors pull in different directions; a word slowly emerges (Twitch Plays Pokémon's crowd-averaging, in miniature).
**Why interesting:** A note authored by *no one* and *everyone*; co-presence is required to write at all.
**Possible tech:** Pointer streaming; vector averaging; letter snapping; presence.
**Potential:** Medium · **Complexity:** Medium · **Risk:** High

### 148 — Blow on It **WEIRD**
**Category:** Input / Microphone
**Concept:** Ink is wet until you blow on it; the microphone detects breath and dries the stroke.
**Visitor experience:** Blow at your laptop; fresh ink shimmers and sets; wet ink can smudge if others touch it.
**Why interesting:** An embodied, silly, memorable gesture that makes *wet vs permanent* physical.
**Possible tech:** `getUserMedia` + `AnalyserNode` low-frequency energy; permission prompt; fallback button.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 149 — Redacted Scroll **WEIRD**
**Category:** Narrative / Information asymmetry
**Concept:** Each visitor sees a different 60% of every note (redacted deterministically per hand), so reconstructing a note requires comparing with others.
**Visitor experience:** Notes read as black-barred documents; you and a friend compare your versions out loud to recover the full text.
**Why interesting:** Forces *real-world* conversation between people in the same room.
**Possible tech:** Server-side per-handle redaction mask (never send hidden characters).
**Potential:** Medium · **Complexity:** Medium · **Risk:** High (frustrating)

### 150 — Lending Hands **WEIRD**
**Category:** Identity / Social
**Concept:** A one-time link lets someone else write one stroke under your seal.
**Visitor experience:** "Lend your hand to a friend"; the stroke appears as written *by you, by someone else's hand*, with a visible lent-hand mark.
**Why interesting:** Authorship becomes a gift; invites playful trust.
**Possible tech:** Single-use token; `lent_by` column.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium (abuse)

### 151 — Phones as Pixels **WEIRD**
**Category:** Multi-device / Crowd display
**Concept:** The pod holds up phones side by side; each screen shows one colour so together they display a picture of the scroll.
**Visitor experience:** Join a "display"; the page tells each phone its colour and position; four phones make a four-colour banner.
**Why interesting:** A bodily, communal, camera-friendly demonstration.
**Possible tech:** Server-assigned slot; fullscreen colour; Wake Lock.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 152 — Shared Gravity **WEIRD**
**Category:** Multi-device / Cooperative physics
**Concept:** The sum of every phone's tilt is the gravity vector for a shared physics world; four people negotiate one marble.
**Visitor experience:** Tilt your phone; a ball on all screens responds to the *group's* tilt; reaching a hole drops a stroke on the scroll.
**Why interesting:** Real, physical co-presence with an instant, funny feedback loop.
**Possible tech:** DeviceOrientation (iOS permission), server-averaged vector, Matter.js client-side.
**Potential:** Medium · **Complexity:** Medium · **Risk:** High

### 153 — Windows Tile the Scroll **WEIRD**
**Category:** Browser-native / Multi-window
**Concept:** Open several windows; each shows a slice of the scroll according to its screen position, so dragging windows pans the scroll.
**Visitor experience:** Arrange windows across your monitors to see a long unbroken stretch.
**Why interesting:** Uses window geometry as an input (a trick almost no one uses) and turns a desk into a scroll.
**Possible tech:** `window.screenX/screenY` polling, `BroadcastChannel`.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 154 — View-Source Art **WEIRD**
**Category:** Browser-native / Net art
**Concept:** The page's source is the artefact: each stroke is rendered as an HTML element and an ASCII comment, so "view source" shows hidden strokes and an ASCII banner.
**Visitor experience:** The page looks plain but "view source" reveals the real work; some strokes exist *only* in the source.
**Why interesting:** A net-art wink to the early web and an unusual use of the browser itself.
**Possible tech:** Server-rendered HTML with comments; no JS needed for the base.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 155 — Burn It Down **WEIRD**
**Category:** Time / Event
**Concept:** When the scroll reaches 1,000 strokes, it catches fire in front of everyone present, and a new blank scroll begins; the old one survives only as a ruin you can sift.
**Visitor experience:** A countdown to the burn; people gather; the page ignites; a charred archive remains.
**Why interesting:** *Temporary destruction* as a communal event; a memorable once-only moment and a strong reason to be there.
**Possible tech:** Volume close at threshold; Canvas fire; `volume` column; archive route (051).
**Potential:** Medium · **Complexity:** Medium · **Risk:** High

### 156 — Shared Keyboard **WEIRD**
**Category:** Multiplayer / Input
**Concept:** Four people write one 140-character note, each controlling every fourth keystroke without seeing the others' letters until commit.
**Visitor experience:** You type your letter and a mystery letter appears; the group negotiates by speaking.
**Why interesting:** Co-presence is *mandatory* and the result is unpredictably, comically collaborative.
**Possible tech:** Server-interleaved keystrokes by seat; reveal at commit.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 157 — Moment of Silence **WEIRD**
**Category:** Multiplayer / Stillness
**Concept:** A stroke whose only content is how long you held perfectly still; synchronised silence is recorded as a mark.
**Visitor experience:** "Hold still together": the page measures the group's collective stillness and writes a stroke whose length is the silence.
**Why interesting:** An anti-input; makes *not acting together* the act.
**Possible tech:** Input-idle detection; presence; server-timed.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 158 — The Scroll Dreams **WEIRD**
**Category:** Narrative / System hand
**Concept:** Each night a cut-up of the day's notes is written by a "hand" that is the scroll itself.
**Visitor experience:** Every morning there is a strange new stroke authored by "the scroll", stitched from yesterday's words.
**Why interesting:** The artefact becomes an author; the *system hand* is a new kind of contributor.
**Possible tech:** Seeded cut-up algorithm; reserved handle; scheduled job on wake.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 159 — Mutating Notes **WEIRD**
**Category:** Living system / Evolution
**Concept:** Notes that others salute spawn slightly mutated offspring, so popular phrases evolve under selection.
**Visitor experience:** Over days a phrase drifts into something stranger; you can trace its ancestry.
**Why interesting:** Language evolving in public, with the scroll as the habitat.
**Possible tech:** Mutation operators (swap, drop, echo); system-hand authorship; lineage links (126).
**Potential:** Medium · **Complexity:** Medium · **Risk:** High (unsupervised text generation)

### 160 — Scraperboard Universe **WEIRD**
**Category:** Material / Inversion
**Concept:** The scroll begins as a solid black sheet; every stroke *scratches away* darkness to reveal light, so the record is made of absence.
**Visitor experience:** A near-black screen; each visitor's mark opens a window of light; over time the page becomes bright, with unreached places still dark. Scratch-off notes can be read only by scratching.
**Why interesting:** An inversion of the material that makes "unwritten" visible and beautiful.
**Possible tech:** Canvas destination-out; stored strokes as masks.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 161 — Typed Aloud **WEIRD**
**Category:** Input / Keystroke dynamics
**Concept:** Store the timing of keystrokes, so each note retypes itself in its author's own rhythm when read.
**Visitor experience:** You *watch* a note being typed with hesitations, corrections and rushes.
**Why interesting:** Cadence as personality and a haunting sense of presence.
**Possible tech:** Store inter-key intervals (cap and quantise). *Keystroke timing is a biometric; privacy must be argued explicitly.*
**Potential:** Medium · **Complexity:** Low · **Risk:** High

### 162 — Resident Ghosts **WEIRD**
**Category:** Multiplayer / Bots
**Concept:** A few scripted "hands" (the Gardener, the Archivist, the Heckler) live in the scroll with distinct behaviours, indistinguishable at first.
**Visitor experience:** The scroll is never empty; visitors try to work out which hands are bots; once revealed they're labelled.
**Why interesting:** Solves the cold start honestly and playfully; a Turing-test game inside a guestbook.
**Possible tech:** Server timers with a reserved handle class; clearly documented in README.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium (honesty and disclosure)

### 163 — Trace Your Hand **WEIRD**
**Category:** Identity / Body
**Concept:** On a touchscreen, you trace your actual hand as your emblem, like the hand stencils in cave art.
**Visitor experience:** "Press your hand on the glass and trace around it." Your stencil is your seal.
**Why interesting:** Literal "hand" (the cookie is named `hand`), a visceral moment of arrival, and no personal data.
**Possible tech:** Pointer path capture; polygon simplification; SVG stencil.
**Potential:** Medium · **Complexity:** Low · **Risk:** Low

### 164 — Latency Is Ink **WEIRD**
**Category:** Browser-native / Network
**Concept:** Your measured round-trip time becomes the viscosity of your ink: laggy connections write thick and slow, and offline strokes wait "in the pen" until reconnect.
**Visitor experience:** Slow connection → visibly honest, heavy ink; offline → a dotted wet stroke that lands when you reconnect.
**Why interesting:** Turns the "slow connections" requirement into *aesthetics*; strokes carry honest provenance.
**Possible tech:** Client RTT sampling; offline queue with retry (idempotency key); server dedupe.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

### 165 — Posthumous Mark **WEIRD**
**Category:** Time / Capsule
**Concept:** A sealed note that is revealed only if your hand stays absent for thirty days (a dead man's switch).
**Visitor experience:** "If I haven't been back by December…"; the scroll shows a sealed knot with your seal.
**Why interesting:** Poignant; absence becomes content.
**Possible tech:** `reveal_if_absent_until`; server check on wake; sealed text never served early.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 166 — Headcount Modes **WEIRD**
**Category:** Multiplayer / Phase change
**Concept:** The artefact switches *mode* by how many people are present: one is a quiet reading room, two a duet, three a choir, four or more opens a quorum door.
**Visitor experience:** The page's rules change as people arrive and leave; a pod of four gets something a single visitor cannot.
**Why interesting:** A direct, literal answer to "more interesting because others are using it".
**Possible tech:** In-memory presence count; mode state machine; SSE broadcast.
**Potential:** High · **Complexity:** Medium · **Risk:** Medium

### 167 — Pet the Scroll **WEIRD**
**Category:** Input / Pun
**Concept:** The "stroke" is literally stroking: gently moving across the creature (022) makes it purr.
**Visitor experience:** Petting increases purr volume and the creature's mood; a rush of strokes makes it content.
**Why interesting:** A pun with real mechanics (pointer speed, pressure).
**Possible tech:** Pointer velocity; Web Audio purr (low-frequency amplitude modulation).
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 168 — Voice Graffiti **WEIRD**
**Category:** Sound / Recording
**Concept:** Each stroke is a two-second sound recording; the scroll is a collage of voices.
**Visitor experience:** Hold to record two seconds; others hear it layered into the scroll.
**Why interesting:** Raw human presence; a sound-first scroll.
**Possible tech:** `MediaRecorder` Opus (~4 KB per clip); size caps. *Moderation and storage risk; cannot be validated like a colour.*
**Potential:** Medium · **Complexity:** Medium · **Risk:** High

### 169 — Gamepad Calligraphy **WEIRD**
**Category:** Input / Gamepad
**Concept:** Two thumbsticks are a pen and a brush; triggers are pressure.
**Visitor experience:** Plug in a controller; the gamepad becomes a calligraphy tool.
**Why interesting:** An unexpected tool for a very old craft; accessible alternative input.
**Possible tech:** Gamepad API polling in `requestAnimationFrame`.
**Potential:** Low · **Complexity:** Low · **Risk:** Low

### 170 — Shake to Write **WEIRD**
**Category:** Input / Motion
**Concept:** A stroke requires a physical shake; its energy sets the stroke's size.
**Visitor experience:** Shake your phone like a salt shaker; ink falls from the top of the screen into the scroll.
**Why interesting:** Embodied, funny and unmistakably *not a form*.
**Possible tech:** DeviceMotion (iOS permission); energy → size; fallback button.
**Potential:** Low · **Complexity:** Low · **Risk:** Medium

### 171 — The Vigil Lamp **WEIRD**
**Category:** Multiplayer / Relay ritual
**Concept:** A lamp stays lit only while someone holds a key; people take turns holding it; when it finally goes out the scroll records "the lamp burned for 41 hours".
**Visitor experience:** A glowing lamp on every screen; a rota emerges; a handoff is a small shared ceremony.
**Why interesting:** A distributed, slow, communal duty (the Telegarden's obligation) with a very visible stake.
**Possible tech:** Server-side hold state; presence; heartbeat; durable record at extinguish.
**Potential:** Medium · **Complexity:** Medium · **Risk:** Medium

---
# 4. Coverage map: provocation areas → ideas

This is a check that every area in the brief produced *different kinds of experiences*, not a feature checklist.

| Area | What it provoked | Ideas |
|---|---|---|
| **A. Core metaphor** (does it need to look like a scroll?) | landscape, tunnel, sky, city, planet, museum, sculpture, atlas, well, orrery, deep, tapestry, candles, strata, tree rings, handscroll, terminal, chart recorder, archive, one line, creature | 016, 022, 027–037, 039, 047, 048, 058, 066, 105, 134, 135, 139, 160 |
| **B. Sound** | instrument, score, loops, timbre, spatial, phase, presence-as-chord, radio | 001–015, 045, 103, 106, 109, 116, 140, 143, 144, 168 |
| **C. Unusual input** | drawing, throwing, tapping, typing-as-drawing, MIDI, drag/drop, clipboard, visibility, mic, tilt, shake, gamepad, multi-window | 102–114, 148, 152, 153, 156, 157, 161, 163, 169, 170 |
| **D. Real-time multiplayer** | live pens, quorum, rituals, pairing, one line, baton, consensus gesture, synchrony, telephone, votes, asymmetric roles | 061–074, 025, 062, 063, 147, 156, 166, 171 |
| **E. Game-like systems** | cooldowns, chains, hidden rules, unlocks, events, puzzles, scarcity, daily seed, chance | 075–085, 040, 077, 155, 162 |
| **F. Creative coding and graphics** | reaction–diffusion, CA, slime mould, DLA, fluids, SDF, shaders, L-systems, noise | 016, 018–021, 033, 044, 119, 127 |
| **G. Frameworks** | see the tech table in §5.5: Canvas/SVG/WebGL2 are enough; Three.js only if truly 3D; Matter/planck for 2D physics | 031–033, 038–045, 089 |
| **H. Physics and material** | pile, loom, tower, hourglass, pendulum, chains, fluid, chimes | 038–045, 152 |
| **I. 3D** | tunnel, planet, museum, sculpture (and where it's spectacle) | 028, 031–033 + critique box |
| **J. Time** | replay, candles, strata, circadian, wear, generations, return, capsule, pulse, sleep, sky, rings, back-button, print | 046–060, 009, 011, 129, 155, 165 |
| **K. Scale** | zoom, scale-as-genre, words-as-mountains, design for four | 119–122, 048, 058, 078, 128 |
| **L. Persistent anonymous identity** | seals, squiggle, sigil, claim check, passkey, lineage, QR link, voices, timbres, hand-trace | 095–101, 004, 097, 132, 143, 163 |
| **M. Narrative** | corpse, inheritance, colophons, objects, chronicler, ghosts, exchange, oracle, poems, dreams | 086–094, 070, 087, 158, 159 |
| **N. Materiality** | ink, paper, fabric, sand, glass(ish), fluid, wax, fire, vegetation, light | 016, 024, 039, 041, 044, 047, 050, 060, 133, 160 |
| **O. Multi-device** | phone as pen, orchestra, wall, side rooms, pixels, shared gravity | 115–118, 151, 152, 101 |
| **P. Accessibility as design** | audio-first, long exposure, hatching, voices, piano-roll, captioned presence | 140–145, 037, 104, 142 |
| **Q. Backend / data model** | hash chain, event log, places, parents, seeds, snapshots, lazy world, presence/residue, provable fate, handle split | 123–132, 054, 056 |
| **R. Visual / artistic direction** | riso, terminal, chart recorder, crayon, guestbook/webring, manuscript, finding aid | 133–139, 027, 138 |
| **S. Weird / risky** | 26 labelled ideas | 146–171 |

---

# 5. External references

> **Provenance.** A research pass gathered these by web search and fetch during this session (2026-10-07). URLs are ones that appeared in search results or were fetched. Where a detail is flagged **UNVERIFIED**, the researcher could not confirm it; items marked *(general knowledge)* come from my own background knowledge and were not fetched this session. Sandbox limits meant a few well-known sites (Shadertoy, neal.fun) returned 403 to scripts; they are described from search results. I did not re-fetch every page.

Each reference gives: **what is interesting → principle to borrow → how it might translate**.

## 5.1 Persistent, communal and net-art projects

**r/place (Reddit, 2017)** — <https://www.redditinc.com/blog/how-we-built-rplace/> · <https://www.fastly.com/blog/reddit-on-building-scaling-rplace>
- *Interesting:* a shared 1000×1000 canvas where each user could place one tile every ~5 minutes. ~1.1M unique users, ~150K concurrent, ~16.5M tiles in 72 h. Board kept as a Redis bitmap (4 bits/pixel, ≈500 KB), read via a CDN with a 1 s TTL, writes fanned out to websockets.
- *Principle:* a hard per-person rate limit turns a trivial write into a scarce, meaningful act and a coordination game.
- *Translation:* ink budget (075); peelable territory (064); a cooldown that makes a pod of four take turns.

**One Million Checkboxes (Nolen Royalty, 2024)** — <https://eieio.games/blog/scaling-one-million-checkboxes/>
- *Interesting:* a global grid of one million checkboxes that changes for everyone live; ~650 M toggles in two weeks. A frank post-mortem: Redis bitset (125 KB), websockets, batching updates every ~0.1 s, periodic snapshots, and a bug where an unvalidated index bloated the store.
- *Principle:* trivially small shared state plus live visibility is enough; batch broadcasts; **validate everything server-side**.
- *Translation:* the blueprint for the real-time layer: snapshot + deltas, batched SSE, strict validation. Directly relevant to this repo's "never trust the client" rules.

**The Button (Reddit, 2015)** — <https://en.wikipedia.org/wiki/The_Button_(Reddit)>
- *Interesting:* a 60-second countdown that reset for everyone when anyone pressed it; each account could press once and the time left became a coloured flair; it ran Apr–Jun 2015.
- *Principle:* one shared clock and one irreversible personal act produce identity and mythology.
- *Translation:* a shared heartbeat (055) or freshness meter; each stroke permanently stamped with how close to silence it was written.

**Our World of Text / Your World of Text** — <https://ourworldoftext.com/>
- *Interesting:* an infinite grid of text anyone can type into, live; "worlds" are created by changing the URL. YWOT's main page is reported to have gone without a reset since 2015.
- *Principle:* a spatial canvas with URL-addressed rooms; long persistence creates neighbourhoods.
- *Translation:* coordinates (125), rooms by URL/QR (118), spatial territory (064).

**Twitch Plays Pokémon (2014)** — <https://en.wikipedia.org/wiki/Twitch_Plays_Pok%C3%A9mon>
- *Interesting:* a single game driven by everyone's chat commands, with "anarchy" and "democracy" modes the crowd could vote between. Reported ~1.16 M participants, peak ~121 K concurrent.
- *Principle:* make the aggregation rule visible and contestable.
- *Translation:* vote on the rules (072); crowd-averaged planchette (147); average circle (068).

**Dark Souls soapstone messages** — <https://darksouls.fandom.com/wiki/Messages>
- *Interesting:* anonymous, asynchronous, template-only messages that appear in other players' worlds; ratings make well-liked messages persist longer and poorly rated ones vanish sooner. Crowd curation without moderators.
- *Principle:* a restricted vocabulary plus crowd-rated visibility gives safe, legible anonymity.
- *Translation:* salutes (071) that change a stroke's *display weight* (not the record); six colours + 140 characters as the "template".

**Death Stranding's Social Strand System** — <https://deathstranding.fandom.com/wiki/Social_Strand_System>
- *Interesting:* you never see other players, only the structures and signs they left. (The claim that likes extend lifetime comes from a low-quality source: **UNVERIFIED**.)
- *Principle:* indirect co-presence: evidence of a stranger acts as company.
- *Translation:* ghost evidence ("someone is inking…"), residue of past presence (130), ghost hands (091).

**Journey (2012)** *(general knowledge plus interviews found by search)*
- *Interesting:* a random anonymous companion, no text, identity revealed only at the credits; the only channel is a musical chirp. Larger groups were reportedly cut to two because coordination broke down.
- *Principle:* a very narrow channel produces expressive, warm behaviour.
- *Translation:* the six-colour, 140-character narrowness *as the feature*; anonymous coloured presence dots; sound as the only "chat" (013).

**The Telegarden (1995–2004)** — <https://goldberg.berkeley.edu/garden>
- *Interesting:* web users jointly tended a real garden through an industrial robot arm; over 9,000 members in year one.
- *Principle:* a slow-changing shared object creates obligation and care between strangers.
- *Translation:* the creature (022), vigil lamp (171), living ink (016) that needs visits to flourish.

**Zoomquilt (Nikolaus Baumgarten, 2004)** — <https://zoomquilt.org/>
- *Interesting:* an infinitely zooming painting by 15 artists; each frame's edges were pre-filled by neighbours.
- *Principle:* constrain each contribution by its neighbour so the whole reads as one piece.
- *Translation:* one continuous line (066); show the previous stroke's edge to the next writer.

**Gridcosm (Ed Stastny / SITO, 1997–)** — <https://en.wikipedia.org/wiki/Gridcosm>
- *Interesting:* a 3×3 grid per level; the middle image is a shrunken copy of the previous level; a completed grid seeds the next. By 2018: 365 artists, 4,260+ levels.
- *Principle:* a completed unit folds into a seed for the next, a built-in structure for an ever-growing artefact.
- *Translation:* generations (051); nesting thumbnails of finished volumes.

**The Sheep Market (Aaron Koblin, 2006)** — <https://www.aaronkoblin.com/work/thesheepmarket/>
- *Interesting:* 10,000 sheep drawn by crowdworkers for $0.02 each, with every drawing's stroke replay viewable.
- *Principle:* a tight prompt plus recorded strokes reveals individual character in the aggregate.
- *Translation:* record stroke timing (103) and offer replay (046).

**Ten Thousand Cents (Koblin & Kawashima, 2008)** — <https://www.aaronkoblin.com/project/10000-cents/>
- *Interesting:* each contributor redrew a tiny piece of a $100 bill without seeing the whole; the assembly was revealed as a video.
- *Principle:* blind contribution to a hidden whole, revealed at the end.
- *Translation:* sealed volumes (051, 054), exquisite corpse (086).

**The Million Dollar Homepage (Alex Tew, 2005)** — <https://en.wikipedia.org/wiki/The_Million_Dollar_Homepage>
- *Interesting:* finite, scarce, permanent pixels; a 20-year retrospective found only ~40% of its links still worked.
- *Principle:* finite permanence, and link-rot as the lasting story.
- *Translation:* a hard finite length (155); the scroll that can prove it was never edited (123) as an antidote to rot.

**Window Swap (2020)** — <https://www.vice.com/en/article/windowswap-home-quarantine-travel-pandemic-coronavirus/>
- *Interesting:* a random stranger's window view; slow, human-reviewed intake; one "next" gesture.
- *Principle:* slow, intimate browsing rather than a feed.
- *Translation:* a "window" mode showing one random old stroke at a time (014).

**radio.garden (2016)** — <https://theoutline.com/post/627/radio-garden-interview>
- *Interesting:* a spinnable globe whose green dots tune you into live local radio, with static between stations.
- *Principle:* skeuomorphic transitions turn a lookup into an experience.
- *Translation:* scrubbing as tuning (003).

**We Feel Fine (Harris & Kamvar, 2005–2015)** — <https://www.moma.org/collection/works/196071>
- *Interesting:* harvested "I feel…" sentences with metadata and offered six visualisations of the same pile.
- *Principle:* constrained text plus multiple lenses on one dataset.
- *Translation:* alternate views by colour, time of day, length (049, 119).

**Neal.fun (Neal Agarwal)** — <https://en.wikipedia.org/wiki/Neal_Agarwal> *(plus coverage of Internet Roadtrip and Cursor Camp; the latter two were reported by the research pass from Boing Boing/Aftermath and not independently re-checked)*
- *Interesting:* single-idea pages with real data and delight in detail: *The Deep Sea* is a long vertical scroll through ocean depth; *Internet Roadtrip* is one shared Street View car steered by votes; *Cursor Camp* shows everyone's cursor as an avatar with no chat.
- *Principle:* one scrollable metaphor with a real axis; one small lever per visitor; co-presence by merely seeing others' pointers.
- *Translation:* a meaningful vertical axis with landmarks (035, 037); live ghost pens (061).

**A Dark Room (2013) / Universal Paperclips (2017)** — <https://en.wikipedia.org/wiki/A_Dark_Room>
- *Interesting:* a single action reveals the world piece by piece.
- *Principle:* progressive disclosure: a near-empty start unfolds as people engage.
- *Translation:* goals and unlocks (078); scale is genre (120).

**Hundred Rabbits** — <https://100r.co/site/tools_ecosystem.html>
- *Interesting:* two artists on a solar-powered sailboat building tiny, low-power tools (Orca, Dotgrid, Uxn).
- *Principle:* design for resource scarcity and long life.
- *Translation:* lean into the 256 MB constraint as an aesthetic; a footer that states the scroll's cost; a documented tiny data format.

**Rhizome ArtBase** — <https://rhizome.org/editorial/2021/apr/26/the-artbase-relaunches-welcome-to-linked-open-data/>
- *Interesting:* net-art archive since 1999 with 2,300+ works; "Linked" vs "Archival Copy" works; emulation-as-a-service tools.
- *Principle:* treat the work as something to preserve from day one with a documented provenance model.
- *Translation:* a colophon with checksum (123); archival static snapshots (051).

**Internet Archive Wayback Machine** — <https://blog.archive.org/2025/10/31/one-trillion-web-pages-archived-internet-archive-celebrates-a-civilization-scale-milestone/>
- *Interesting:* a navigable record organised by timestamp; passed one trillion pages in Oct 2025.
- *Principle:* time is the primary navigation; you *visit* a past state.
- *Translation:* a date slider (cheap, because the log is append-only); play the scroll (046).

**Quick, Draw! (Google Creative Lab, 2016)** — <https://github.com/googlecreativelab/quickdraw-dataset/blob/master/README.md>
- *Interesting:* a drawing game whose output became an open dataset of ~50 M timestamped vector drawings in ndjson.
- *Principle:* publish the data; the artefact becomes a commons.
- *Translation:* a public `/api/marks.ndjson`, a "download the scroll" link.

**Dwitter** — <https://www.dwitter.net> · **Tixy.land** — <https://esolangs.org/wiki/Tixy>
- *Interesting:* Dwitter's 140-character JavaScript demos share this app's 140-char limit; Tixy fits a whole animation in a short expression and encodes it in the URL.
- *Principle:* a tiny character limit is a creative constraint; put the state in the URL.
- *Translation:* deep-linkable strokes (059); treat the note as a *seed* for a deterministic generator (127). **Do not execute notes as code**: they are untrusted input.

## 5.2 Multiplayer, ritual and social-design references

**Spelunky Daily Challenge** — <https://spelunkyworld.com/dailychallenge> · **Wordle** — <https://en.wikipedia.org/wiki/Wordle>
- *Interesting:* one shared seed per day, one attempt, a shared reset; Wordle adds a spoiler-free shareable result grid.
- *Principle:* shared cadence plus a shareable artefact that carries no spoilers.
- *Translation:* daily seed (082); "copy today's colour row" using clipboard write.

**Figma multiplayer** — <https://www.figma.com/blog/how-figmas-multiplayer-technology-works>
- *Interesting:* per-document server processes over WebSockets, last-writer-wins by property, the server defining order; cursors described as useful for "waving".
- *Principle:* let the server be the single authority on order (no CRDTs needed).
- *Translation:* for an append-only scroll the autoincrement `id` *is* the order; clients apply "stroke N" in id order.

**PartyKit "Cursor Party"** — <https://docs.partykit.io/examples/app-examples/cursors-with-country-flags>
- *Interesting:* one in-memory room object rebroadcasts cursor moves; newcomers receive current cursors immediately; country flags came from Cloudflare request metadata.
- *Principle:* ephemeral presence lives in memory and never touches the database.
- *Translation:* a Node `Map` for presence; persist only strokes. (PartyKit itself is Cloudflare Durable Objects: copy the *design*, not the dependency.)

**Jackbox / AirConsole** — <https://www.jackboxgames.com/> · <https://www.airconsole.com/info>
- *Interesting:* a shared screen plus phones as controllers; a four-letter room code or QR; extra joiners become an audience that votes.
- *Principle:* low-friction join is the whole product.
- *Translation:* wall mode (117), phone as pen (115). The QR carries a *join link only*; identity stays the anonymous cookie.

**Gartic Phone (2020)** — <https://en.wikipedia.org/wiki/Gartic_Phone>
- *Interesting:* a write-draw-describe chain with a final reveal; no accounts; the payoff is replaying the chain.
- *Principle:* the replay of the chain is the fun.
- *Translation:* play the scroll (046); whisper down the lane (070).

**Eleusis (Robert Abbott, 1956)** — <https://en.wikipedia.org/wiki/Eleusis_(card_game)>
- *Interesting:* one player invents a secret rule; others infer it from which plays are accepted or rejected into a main line and a sideline.
- *Principle:* a hidden rule made discoverable by an accumulating public record.
- *Translation:* the hidden rule (077).

**Dwelling in the Fuchun Mountains (Huang Gongwang, 1347)** — <https://smarthistory.org/huang-gongwang-dwelling-in-the-fuchun-mountains/> · <https://en.wikipedia.org/wiki/Dwelling_in_the_Fuchun_Mountains>
- *Interesting:* this repo's namesake. The scroll has accumulated inscriptions and collectors' seals over centuries (Qianlong's among them; the same emperor famously misjudged a copy as the original and covered it with ~40 poems). Seals were stamped across the joins of its paper sheets.
- *Principle:* a scroll accumulates *hands* around the original, in the margins and across joins, without altering the painting.
- *Translation:* colophons and marginalia (088), collector's seals (095), seams across joins (056).

*(General knowledge, not fetched: Paul Klee's "taking a line for a walk" → 066; the Eames film* Powers of Ten *→ 119; Kuramoto/firefly synchronisation → 069; Jacquard punched cards → 039; hexagrams as six lines → 093.)*

## 5.3 Sound and audiovisual references

**Patatap (Jono Brandel & Lullatone, 2014)** — <https://www.patatap.com/>
- *Interesting:* each key triggers a sound with a matched animation; the page works as an instrument with no learning curve.
- *Principle:* every input gets an immediate paired sound and shape.
- *Translation:* a sound family per ink colour (006).

**Typatone** — <https://www.jono.fyi/Typatone>
- *Interesting:* letters map to notes by frequency; everything is quantised to a global clock so compositions layer.
- *Principle:* text → music by letter frequency; sync everyone to one clock.
- *Translation:* notes as melodies (008).

**Hatnote "Listen to Wikipedia"** — <https://listen.hatnote.com/>
- *Interesting:* live edits become bells (additions) and string plucks (removals); bigger edits sound deeper; anonymous edits and bots are coloured differently.
- *Principle:* sonify an event stream so ambient presence is felt, not read.
- *Translation:* a note whenever any visitor adds a stroke; radio mode (014).

**Dinahmoe "Plink" (2011)** — <https://experiments.withgoogle.com/plink-multiplayer-music-experience>
- *Interesting:* up to four players share a room; colour is your instrument and height is pitch; everything is pentatonic and time-quantised so strangers can't sound bad.
- *Principle:* constrain the musical space so collaboration always works.
- *Translation:* just-intonation neighbourhoods (005); the six inks as instrument voices (006).

**Chrome Music Lab** — <https://github.com/googlecreativelab/chrome-music-lab>
- *Interesting:* Web Audio + Tone.js experiments (Song Maker, Kandinsky, Spectrogram); shapes become sound.
- *Principle:* drawing is composing.
- *Translation:* the scroll as a long horizontal score with a playhead (002).

**Pink Trombone (Neil Thapen)** — <https://dood.al/pinktrombone/>
- *Interesting:* an interactive vocal-tract model you play by dragging the tongue and lips.
- *Principle:* a drawn physical model of a voice invites play.
- *Translation:* a vowel-shifting "choir" voice (stretch goal; needs AudioWorklet).

**Bloom (Eno & Chilvers, 2008)** — <https://en.wikipedia.org/wiki/Bloom_(software)>
- *Interesting:* each tap adds a looping note; loops fade; a generative player takes over when you stop.
- *Principle:* the same piece is an instrument *and* a self-playing record.
- *Translation:* the scroll replays itself as generative music when nobody is adding (014).

**Brian Eno, *Music for Airports* (1978)** — <https://reverbmachine.com/blog/deconstructing-brian-eno-music-for-airports/>
- *Interesting:* single-note tape loops of different lengths drift in and out of alignment; loop lengths are about 23.5 s, 25.9 s and 29.9 s per one source (approximate).
- *Principle:* loops of unrelated lengths give endless variety from tiny material.
- *Translation:* the eternal loop (007): each stroke's loop length from its timestamp.

**Steve Reich, *It's Gonna Rain* (1965)** — <https://en.wikipedia.org/wiki/It's_Gonna_Rain>
- *Interesting:* two identical loops drift out of phase through slightly different speeds, moving from unison to dense counterpoint.
- *Principle:* slow drift between copies creates structure without composing it.
- *Translation:* phase drift (009): older strokes replay slightly slower.

**Endlesss** — <https://endlesss.net/>
- *Interesting:* shared multi-track loops ("Riffs"); latency is sidestepped by sharing whole loops rather than live notes. (A 2024 shutdown report and the current site conflict: **UNVERIFIED** status.)
- *Principle:* accept latency by sharing whole units and keep every layer's history.
- *Translation:* new strokes join the loop at the next bar rather than playing on arrival.

**Smule Ocarina's world listener (2008)** — <https://techcrunch.com/2008/11/07/smules-ocarina-a-textbook-example-of-how-to-build-a-great-iphone-app/>
- *Interesting:* a globe plays other players' notes live; anonymous listening to strangers is the feature.
- *Principle:* anonymous voyeuristic listening is a social act.
- *Translation:* radio mode (014) with a "next" skip.

**Strudel (TidalCycles in the browser)** — <https://strudel.cc/>
- *Interesting:* a live-coding environment whose mini-notation writes rhythm in a string; runs on phones; shares by URL.
- *Principle:* a compact string notation turns text into rhythm.
- *Translation:* borrow the *idea* (the note as a pattern), not the library (size not measured).

**Ableton Learning Synths** — <https://learningsynths.ableton.com/> · **Browser theremin/tracker pointers** — <https://github.com/mdn/violent-theremin>, <https://github.com/steffest/BassoonTracker>
- *Interesting:* every concept is one touchable control; trackers store music as a grid of discrete events, which suits an append-only log.
- *Principle:* interfaces that teach by being played; the log *is* the score.
- *Translation:* an XY pad with audible preview on the add form; the scroll read as a tracker pattern.

**Earthquake sonification** — <https://ccrma.stanford.edu/~srsmith/projects/Earthquakes.html>
- *Interesting:* compressing years into minutes (one year per second) makes a long record listenable.
- *Principle:* compress time to make duration audible.
- *Translation:* "play the whole scroll" at a day per second (002, 046).

**Accessibility cross-modal work** — <https://dl.acm.org/doi/10.1145/2818346.2823298> (sonified images for blind users) · <https://www.researchgate.net/publication/221652430_Visualizing_non-speech_sounds_for_the_deaf> (visualised sound for deaf users) · <https://news.mit.edu/2024/umwelt-enables-interactive-accessible-charts-creation-blind-low-vision-users-0327>
- *Interesting:* offer the same data across senses; give every sound a persistent visible trace.
- *Principle:* no channel is the only channel.
- *Translation:* audio-first scroll (140), piano-roll twin (144).

## 5.4 Graphics, simulation and creative-coding references

**Sandspiel (Max Bittker)** — <https://sandspiel.club> · write-up <https://maxbittker.com/making-sandspiel/>
- *Interesting:* a falling-sand cellular automaton (Rust → WebAssembly + WebGL) with shareable creations that work on phones.
- *Principle:* simple local rules plus a tiny palette of elements give emergence.
- *Translation:* hourglass (041); six species (020).

**Karl Sims' reaction–diffusion tool** — <https://www.karlsims.com/rdtool.html>
- *Interesting:* in-browser Gray–Scott with "draw seeds", feed/kill sliders.
- *Principle:* user marks are seeds; the rule does the rest.
- *Translation:* reaction–diffusion palimpsest (018).

**Lenia (Bert Chan)** — <https://chakazul.github.io/Lenia/JavaScript/Lenia.html>
- *Interesting:* continuous cellular automata that produce lifelike creatures.
- *Principle:* a handful of parameters yields a large space of organisms.
- *Translation:* hash a note into parameters so each stroke breeds a creature (016, 022).

**WebGL-Fluid-Simulation (Pavel Dobryakov)** — <https://github.com/PavelDoGreat/WebGL-Fluid-Simulation>
- *Interesting:* pure-WebGL fluid that works on mobile.
- *Principle:* the pointer injects dye into a ping-pong texture.
- *Translation:* fluid ink (044). GPU results are not deterministic, so it can only be cosmetic.

**noclip.website** — <https://noclip.website>
- *Interesting:* a "digital museum of video game levels" with a free-fly camera.
- *Principle:* a navigable space as a quiet archive.
- *Translation:* museum that grows (032), tunnel (028).

**Shadertoy** — <https://www.shadertoy.com> · **The Book of Shaders** — <https://thebookofshaders.com>
- *Interesting:* a whole picture as one function of (x, y, t).
- *Principle:* tiny code and a few uniforms give a rich result.
- *Translation:* the stroke list as a data texture feeding one fullscreen shader (033, 018).

**cables.gl** — <https://cables.gl>
- *Interesting:* a node-graph editor for WebGL.
- *Principle:* visible dataflow makes generative systems legible.
- *Translation:* a reference for exposing a few named parameters per stroke; not a dependency.

**The Algorithmic Beauty of Plants** — <https://algorithmicbotany.org/papers/abop/abop.pdf>
- *Interesting:* the canonical L-system text.
- *Principle:* rewriting a short string grows a plant.
- *Translation:* living ink (016): a stroke's seed grows deterministically as a function of age.

**Verlet cloth/rope demos** — <https://github.com/araghava/cloth-sim> *(not opened; **UNVERIFIED**)*
- *Interesting:* points plus distance constraints give believable fabric in ~100 lines.
- *Principle:* cheap, library-free physics.
- *Translation:* springs and chains (043).

**The Powder Toy** — <https://powdertoy.co.uk>
- *Interesting:* a mature falling-sand sandbox with shared saves.
- *Principle:* shared saved states others can open and extend.
- *Translation:* similar to Sandspiel.

**Generative typography with variable fonts** — <https://zeke.studio/gentype/> *(survey; examples not opened, **UNVERIFIED**)*
- *Interesting:* per-letter spring physics and cursor-driven weight/width.
- *Principle:* drive `font-variation-settings` from state while keeping real DOM text.
- *Translation:* notes stay accessible text but their weight reflects recency or scroll speed (104).

## 5.5 Technology reference: what each option enables, and what it costs here

Sizes are single vendorable files (minified / gzip) measured or read from the registry during research, 2026-10-07. "No-build" means *loadable as a static file with a `<script>` or import map*.

| Option | Enables (the interaction) | Size | No-build integration | Verdict for this project |
|---|---|---|---|---|
| **Canvas 2D** | strokes, trails, pan/zoom, CPU sims (CA, reaction–diffusion at ~256²) | 0 | native | **Default.** Use a seeded PRNG and integer maths for anything that must match across devices |
| **SVG** | strokes as real DOM nodes: hover, focus, text, a11y | 0 | native | Best fit for the "never colour-only / keyboard" rules; fine to a few thousand nodes |
| **WebGL2** | shader fields, GPU ping-pong sims, many instances | 0 (hand-written) | native | Universal on current phones; **not deterministic across devices** → cosmetic only |
| **Fullscreen-quad shader** | the whole stroke list as a data texture → one living image | ~40–60 lines | native | Lightest route to shader-driven ideas (016, 018, 033, 044) |
| **WebGPU** | compute shaders, million-particle sims | – | needs WebGL2 fallback | ~86% + 2% partial support; iOS 26+ only; Firefox unreliable → **unjustified** here |
| **OGL 1.0.11** | tiny WebGL wrapper | 133 KB / 39 KB gz (all) | vendor ES source | Good if a wrapper is wanted |
| **twgl.js 7.0.0** / **regl 2.1.1** | WebGL helpers | 106/29 KB; 87/28 KB | vendor | Fine; hand-written is lighter still |
| **Three.js r186** | 3D scenes, instanced meshes, camera moves | 393 + 416 KB (~194 KB gz) | vendor both module files + import map | Only if the redesign is genuinely 3D |
| **React Three Fiber 9.8.1** | – | – | needs React + bundler | **Reject**: a real build cost for little gain |
| **PixiJS 8.22.0** | fast 2D sprites, filters, thousands of animated items | 841 KB / 237 KB gz (single ESM) | vendor | Only if thousands of sprites; Canvas usually suffices |
| **Phaser 4.2.1** | full game framework (input, scenes, arcade physics, GPU sprite layers) | 1.38 MB / 352 KB gz | global script | Only if the pitch is "a game" |
| **p5.js 2.3.4** | creative-coding idioms | 991 KB / 284 KB gz | global script | Heavier than hand-written Canvas |
| **Babylon.js 9.29.0** / **PlayCanvas 2.23.0** | 3D engines | 8.6 MB; 2.55 MB | bundler / editor-oriented | **Reject** |
| **Matter.js 0.20.0** | 2D rigid bodies | 83 KB / 26 KB gz | global script | Fine for local visual physics; unmaintained since mid-2024 |
| **planck.js 1.5.0** | Box2D port, stable stacking, joints | 297 KB / 55 KB gz | global script | Better for towers and piles |
| **Rapier 0.21.0** | **documented cross-platform deterministic** physics (identical setup + insertion order) | 2D wasm 2.4 MB / ~0.9 MB gz | `-compat` ESM | Best for replay-from-seeds physics; heavy for this project |
| **Godot web export** | full engine | ~40 MB wasm (~5 MB Brotli) | needs `.wasm` MIME; threaded builds need COOP/COEP | **Reject**: oversized, and its UI isn't native labelled form controls |
| **Tone.js 15.1.22** | musical Transport, synths, scheduling | 345 KB / 80 KB gz | CDN or vendored | Optional; raw Web Audio is enough for most ideas |
| **SSE (`EventSource`)** | server→client stream; auto-reconnect; `Last-Event-ID` | 0 | native `node:http` | **Best fit** with the existing validated `POST` |
| **`ws` 8.22.0** | bidirectional, high-rate client→server (live pens/cursors) | small | one npm dependency | Only if live drawing needs it; spends the "one dependency" budget |
| **uWebSockets.js** | very high-concurrency WebSockets | – | not on npm; no musl binaries found | **Reject** at this scale |
| **PartyKit/partyserver** | rooms on Cloudflare Durable Objects | – | not for Fly | **Reject** (copy the design, not the dependency) |
| **WebRTC data channels** | peer-to-peer presence | – | needs signalling + STUN/TURN | Poor fit for an authoritative append-only scroll |

**Bottom line from the tech research:** the cheapest meaningful upgrade is **SSE + Canvas 2D (or SVG) + a seeded PRNG**, with no new dependency and no build step; a fullscreen shader is the next step; Three.js only if 3D *is* the pitch. Avoid Rapier, Babylon, PlayCanvas, Godot and R3F here.

### Deterministic persistence on a 256 MB machine (three patterns)

- **(a) Event sourcing.** Store each stroke's seed and inputs; every client replays the same function. Matches append-only exactly. Risk: float drift across browsers (avoid `Math.sin`/`cos` and GPU results as authoritative).
- **(b) Server tick.** A headless sim at 1–5 Hz is affordable for a ~128² grid, but it fights Fly's auto-stop and the "read fresh from SQLite" persistence claim unless the world can **catch up on wake** (129).
- **(c) Bake.** Run the physics once when a stroke is added, store the settled result (position, short path) in the stroke. Replays need no determinism. Keep what's stored small and validated.

### Real-time facts worth keeping in view

- Fly's proxy closes idle connections at about 60 s: **heartbeats required** (SSE comment line every ~15–20 s).
- Whether open sockets keep an auto-stopping machine awake is **not documented**, and community reports say they were stopped anyway: do not rely on it. A live demo wants `min_machines_running = 1` (a deliberate change to a "leave as is" file) or a design where sleep is part of the story (056).
- A community report (July 2026, unconfirmed) describes SSE events arriving seconds late on iPhones through HTTP/2; the workaround was `alpn = ["http/1.1"]`. **Test on a real iPhone.**
- HTTP/1.1 caps browsers at 6 SSE connections per origin across tabs.
- Memory per idle connection is small (single-digit to tens of KB); irrelevant at 4–12 viewers.

---
# 6. Twenty standout ideas

Selected for being worth serious discussion, not because they are decided. I tried to make the twenty *different in kind* (an instrument, a drawing, a time-form, a trust mechanism, a ritual, a bot, a destruction). Ratings in §3 and §8.

**1. 066 — One Continuous Line.**
*Why it stands out:* it is the most direct possible answer to the README's own judged question, "does it read as one continuous object rather than a comment list?", and it makes strangers literally connected end to end.
*Strongest quality:* a single, instantly-understood rule that produces an unmistakable artefact (a kilometre of line) and gives each visitor an inherited starting point.
*Largest risk:* simultaneous writers need a baton or fork rule (see 067); a boring line if people only scribble; stored geometry needs careful server-side validation.

**2. 013 — Breath of the Room.**
*Why:* co-presence you can *hear* with essentially no UI: each person present adds a voice to the drone.
*Strongest:* very small to build, immediately legible in a pod of four, and works with *any* visual direction.
*Risk:* sound is opt-in and gesture-gated (autoplay rules, iOS quirks), so the first impression is silent unless there's a clear "turn sound on".

**3. 016 — Living Ink.**
*Why:* it makes "coming back is worth it" literally true: your mark has grown while you were away, with **no server simulation** (a pure function of seed and age).
*Strongest:* persistence shown as growth, on every device identically.
*Risk:* "pretty growth" can become wallpaper that doesn't relate to *people*; deterministic float maths across devices.

**4. 001 — Ink Strings.**
*Why:* turns the archive into an instrument you scrub, pluck and perform.
*Strongest:* the best fusion of persistence, sound and interaction; the demo is "scroll and it plays".
*Risk:* it lives or dies on sound-design taste, which is hard for an unattended agent to tune.

**5. 061 — Pens in the Room.**
*Why:* live visible pens are the clearest demonstration of real-time that a marker can see in two side-by-side windows.
*Strongest:* clean line between live (ephemeral) and permanent (committed).
*Risk:* needs high-rate client→server traffic (probably `ws`, a second dependency) and presence cleanup; mobile touch conflicts with scrolling.

**6. 135 — Chart Recorder.**
*Why:* real time shown as physical paper feeding past six pens: quiet hours are blank paper, a crit session is a scribble.
*Strongest:* a visual identity and a "scroll" that genuinely *is* time, which the current list is not.
*Risk:* long empty stretches look dead at low scale; needs a plan for the cold start.

**7. 088 — Colophons and Marginalia.**
*Why:* the most on-theme idea; real handscrolls accumulate inscriptions and seals beside the image, and the repo is named for one.
*Strongest:* a second scroll of glosses that never touches the first, so append-only is *honoured*, and the data model is just a `parent_id`.
*Risk:* it adds writing rather than changing the experience; may feel like a comment thread unless the layout does real work.

**8. 123 — Hash-Chained Scroll.**
*Why:* turns the README's central claim ("append-only") from a promise into something a visitor can *verify in their browser*.
*Strongest:* a small build, a strong argument, and a distinctive "good" definition.
*Risk:* invisible to most visitors; needs a visible, delightful verification moment to count as an experience.

**9. 116 — Phone Orchestra.**
*Why:* four phones on a table, each a voice of one chord, is a physical co-presence demo no desktop app can match.
*Strongest:* extremely memorable, and fits the pod-of-four reality.
*Risk:* clock sync across devices; iOS audio interruptions; silent switch; only works when people are physically together.

**10. 007 — The Eternal Loop.**
*Why:* each stroke becomes a loop of its own length, so the piece never repeats and every stroke is audibly present.
*Strongest:* nearly free to compute, and persistence becomes *musical form*.
*Risk:* an ambient wash with no emotional shape; easy to make tiresome.

**11. 047 — Candles.**
*Why:* a note's length becomes how many hours it burns, so effort trades off against visibility, and the scroll visibly breathes.
*Strongest:* a tiny, elegant rule that changes how people write; entirely a display function (nothing deleted).
*Risk:* may feel like it hides or "expires" content despite never deleting it; needs the pooled wax to read as permanence.

**12. 052 — Since You Were Here.**
*Why:* it directly implements the C9 option "what someone sees on reconnecting or returning the next day" and the README's "coming back".
*Strongest:* very cheap, very on-brief, valuable on its own.
*Risk:* low wow; needs a small server-side `last_seen` table, which is the first non-stroke state.

**13. 075 — Ink Budget.**
*Why:* resolves the README's no-rate-limit tension and the "one stroke" tagline, with r/place's proven mechanism.
*Strongest:* scarcity makes marks mean something and bounds write load on a 256 MB box.
*Risk:* with four people in a room a cooldown can feel merely frustrating; tuning matters.

**14. 166 — Headcount Modes.**
*Why:* the app *changes its rules* by how many are present, which is the most literal reading of "more interesting because other people are using it".
*Strongest:* gives a pod of four something a single visitor cannot get.
*Risk:* a solo marker may see only the quiet mode and judge it plain; needs a solo-demonstrable cheat (e.g. a second tab).

**15. 045 — Wind Chimes.**
*Why:* presence as weather and sound; strokes hang as chimes that strike when people arrive.
*Strongest:* beautiful, simple, and unlike any chat.
*Risk:* a charming prop that carries little *content*; text readability suffers.

**16. 102 — Make the Stroke a Stroke.**
*Why:* the app calls them strokes and nothing is drawn.
*Strongest:* the biggest single jump in interactivity per unit of effort; unlocks 066, 103, 096, 107 and more.
*Risk:* stored geometry needs new server-side validation (point count, bounds), and the repo's rules about palette/note must be preserved; spec tests change.

**17. 090 — The Chronicler.**
*Why:* a rule-based daily narrator makes the scroll tell its own history without an LLM.
*Strongest:* costs almost nothing and makes the artefact feel inhabited.
*Risk:* templated prose gets repetitive; needs a distinctive voice and enough variety.

**18. 027 — Walking the Handscroll.**
*Why:* honours the namesake, turns "long scroll" into a journey with an unpainted edge.
*Strongest:* strong thematic and visual identity with modest cost via 2.5D.
*Risk:* art direction is hard to get right unattended; marks as landscape features can reduce legibility.

**19. 155 — Burn It Down. (WEIRD)**
*Why:* temporary destruction as a communal event is memorable and gives a reason to be present.
*Strongest:* a once-only moment; it dramatises permanence by threatening it, then proving the archive survives.
*Risk:* may contradict the spirit of the argument; engineering an event that works for a marker who arrives *after* it.

**20. 162 — Resident Ghosts. (WEIRD)**
*Why:* the cold start is the app's biggest practical problem (5 strokes, one hand); scripted hands with personalities solve it playfully.
*Strongest:* the scroll is never empty and the "spot the bot" game is its own pleasure.
*Risk:* honesty and disclosure (the README must say bots exist); fake activity can feel like a trick.

*Honourable mentions that nearly made the list:* **117 Wall Mode** (best demo surface, tiny), **056 The Machine's Sleep Is Visible** (turns an infrastructure quirk into folklore), **077 The Hidden Rule** (a puzzle only the record can solve), **039 The Loom** (a distinctive, cheap, accessible-friendly form), **132 Public Handle, Secret Token** (a prerequisite fix for any identity work), **095 Collector's Seals**, **042 Pendulum Wave** (deterministic beauty from timestamps alone).

---

# 7. Ten interesting combinations

Each is a coherent *experience direction*, not a feature list. They overlap deliberately, so we can mix.

### C1 — The Playable Archive
**Concept:** Persistent marks become strings in a communal instrument: their visual length sets pitch, their age sets timbre, and scrolling through history performs the piece.
**Key ideas:** 001 Ink Strings · 002 Timestamp Score · 003 Scrubbing Is Sound · 004 Hand Timbres · 011 Sonic Sediment · 013 Breath of the Room · 144 Piano-Roll Twin · 140 Audio-First.
**Why they strengthen each other:** time (002), age (011) and identity (004) all map to different musical dimensions, so every stored field has a sonic meaning; the piano roll and audio-first mode make it legible without sound.
**Rough technical direction:** SSE; Web Audio with Karplus–Strong or simple plucks; Canvas strings; a shared "two clocks" scheduler; handle split (132) first.
**Biggest uncertainty:** whether it sounds *good* without human tuning, and whether it still reads as a scroll rather than a toy.

### C2 — One Line, Many Hands
**Concept:** The whole scroll is a single drawn line; visitors pick up where the last one stopped, live pens are visible, and the scroll unrolls as you pull it.
**Key ideas:** 102 Make the Stroke a Stroke · 066 One Continuous Line · 067 Pass the Pen · 061 Pens in the Room · 105 Unroll It · 074 Previously on the Scroll · 090 The Chronicler.
**Why:** drawing (102) supplies the material, continuity (066) supplies the metaphor, the baton (067) resolves simultaneity, live pens (061) supply co-presence, and unrolling (105) supplies the object.
**Rough technical direction:** polyline stored with `start = previous end`; bounded point counts; baton lock + SSE; `ws` only if pen streaming proves necessary; Canvas.
**Biggest uncertainty:** whether four people sharing one baton in ten minutes feels like play or like waiting.

### C3 — The Chart-Recorder Room
**Concept:** The scroll is chart paper continuously feeding past six pens in real time; people's strokes are deflections; a wall display shows it live, and old rolls are archived.
**Key ideas:** 135 Chart Recorder · 055 Pulse · 013 Breath of the Room · 117 Wall Mode · 046 Play the Scroll · 056 The Machine's Sleep Is Visible.
**Why:** real time becomes a physical, visible, audible fact; the machine's sleep appears as blank paper with a seam; replay is just rolling the paper back.
**Rough technical direction:** Canvas drawing at constant px/s; presence drone; wall route with Wake Lock; daily rolls as static archives.
**Biggest uncertainty:** the scroll looks empty at low scale; seeding/ghosts (162) or a stronger cold-start story is needed.

### C4 — The Living Handscroll
**Concept:** A Fuchun-style landscape grows as people add to it, strokes become features that keep growing with age, and later hands annotate with seals and colophons in the margins.
**Key ideas:** 027 Walking the Handscroll · 016 Living Ink · 127 Marks as Recipes · 088 Colophons and Marginalia · 095 Collector's Seals · 129 The World Catches Up · 132 Public Handle, Secret Token.
**Why:** a single metaphor (a real handscroll) ties visuals, growth, annotation and identity together, and each uses the same deterministic `(seed, age)` machinery.
**Rough technical direction:** 2.5D Canvas parallax; seeded PRNG; `seed` and `parent_id` columns; SVG seals; deterministic growth.
**Biggest uncertainty:** art direction by an unattended agent; keeping notes legible inside a landscape.

### C5 — The Pod Instrument
**Concept:** Designed for four people in a room: a projector shows the scroll, phones are pens and voices, and the app changes mode with the headcount.
**Key ideas:** 117 Wall Mode · 115 Phone as Pen · 116 Phone Orchestra · 166 Headcount Modes · 063 The Hourly Gathering · 013 Breath of the Room.
**Why:** it optimises the *actual* moment of use (a crit pod) and makes co-presence structurally necessary rather than optional.
**Rough technical direction:** SSE/`ws` rooms; QR join (rendered, not scanned); server clock offset; Wake Lock; iPhone SSE test.
**Biggest uncertainty:** it may demo brilliantly but be inert for a solo marker; needs a solo-demonstrable mode.

### C6 — The Scroll That Can Prove Itself
**Concept:** A scroll with rules, rituals and a cryptographic spine: ink budgets, a daily seed, weekly volumes, and a verifiable hash chain; a public burn event closes each big volume.
**Key ideas:** 123 Hash-Chained Scroll · 075 Ink Budget · 082 Daily Seed · 051 Generations · 131 Provable Fate · 155 Burn It Down.
**Why:** scarcity, cadence and verifiability all reinforce "permanent means permanent"; the burn dramatises it by threatening it.
**Rough technical direction:** SHA-256 chain with a browser-side verifier; token bucket; UTC daily seeds; volume table with static archives.
**Biggest uncertainty:** it's strongest as an *argument* and weakest as a *felt experience*; needs a sensory layer.

### C7 — The Ecology
**Concept:** Six inks are six species in a cellular automaton; the weather is the community's recent colour mix; arrivals drift across screens as spores; the world catches up when the machine wakes.
**Key ideas:** 020 Six Species · 023 Weather Machine · 025 Spore Rain · 127 Marks as Recipes · 128 Snapshots Table · 129 The World Catches Up.
**Why:** one living system consumes all the same inputs (colour, time, presence), and snapshots plus lazy catch-up make it cheap on a sleeping machine.
**Rough technical direction:** typed-array CA or shader; snapshots every N strokes; closed-form weather; SSE spores.
**Biggest uncertainty:** simulation determinism across devices and whether it relates to the *people* rather than to itself.

### C8 — The Archive of Presence
**Concept:** A scroll that remembers who was here and how it felt: wear from reading, anniversaries, ghost hands, sleep seams and a daily chronicle in an old annalist's voice.
**Key ideas:** 130 Presence vs Residue · 052 Since You Were Here · 053 Anniversary Echoes · 091 Ghost Hands Whisper · 050 Handled Paper · 056 The Machine's Sleep Is Visible · 090 The Chronicler.
**Why:** each shows a different face of "this thing has lived", and they all derive from timestamps and a few small side tables, never touching the strokes.
**Rough technical direction:** `last_seen`, residue and chronicle tables; template grammar; Canvas wear texture.
**Biggest uncertainty:** low spectacle; the wear/dwell data raises privacy questions to argue in the README.

### C9 — The Terminal Wake
**Concept:** A keyboard-first, accessibility-first scroll presented as a terminal's scrollback with live `tail -f` arrival, hatching instead of hue, and tap-morse entry for one-switch users.
**Key ideas:** 134 The Scrollback · 145 Captioned Presence · 140 Audio-First · 142 Hatch Not Hue · 106 Tap Morse · 143 A Voice per Hand.
**Why:** cheap to build, naturally real-time, makes the repo's accessibility rules the *aesthetic*, and has a clear, distinctive identity.
**Rough technical direction:** DOM text + SSE; roving tabindex; SVG patterns; `speechSynthesis`; command parser.
**Biggest uncertainty:** it may feel like a tech demo and not a shared object; risks being plain.

### C10 — The Hidden Rule Society
**Concept:** A game-like society whose rules are inferred from the accumulated record: hidden acceptance rules, votes that change them, thresholds that unlock things, bots with personalities.
**Key ideas:** 077 The Hidden Rule · 072 Vote on the Rules · 078 Goals and Unlocks · 079 Threshold Events · 062 Quorum Door · 162 Resident Ghosts.
**Why:** each makes the *record* itself the rulebook, and the bots solve the cold start while seeding the pattern players must read.
**Rough technical direction:** server rule functions; accepted/rejected lines; vote tally; bots with reserved handles; SSE.
**Biggest uncertainty:** unattended authoring of puzzles that are actually fun; risk of opacity for a ten-minute marker.

---

## Shared foundations that unlock many ideas

If we pick a direction, these small changes are what the ideas are mostly *waiting on*. They are cheap and compose.

| Foundation | Unlocks (examples) | Cost |
|---|---|---|
| **SSE + `id:` + replay from SQLite** (batching, heartbeats) | everything real-time: 013, 025, 045, 061, 074, 117, 166 | Low |
| **Public handle ≠ secret token (132)** | all identity ideas: 004, 095–101, 143, 163 | Low |
| **Seed per stroke (127)** | 016, 019, 039, 042, 089, 097, 133 | Low |
| **Coordinates / geometry per stroke (125, 102)** | 064, 066, 029, 034, 107, 119 | Low–Medium |
| **`parent_id` links (126)** | 012, 065, 070, 087, 088, 092, 159 | Low |
| **Ephemeral presence map (130)** | 013, 045, 061–069, 147, 166, 171 | Low |
| **Snapshots table (128)** | 018, 020, 041, 044, 048, 119 | Medium |
| **Separate side tables (last_seen, stamps, salutes, residue)** | 052, 053, 071, 091, 095, 050 | Low (keeps strokes append-only) |
| **Opt-in audio engine behind a native switch** | all of Family 1, 045, 116 | Medium |
| **`min_machines_running = 1` (conscious change)** | any live demo; or embrace sleep (056) instead | Trivial but affects a "leave as is" file |

---

# 8. Comparison matrix (twenty standouts)

Qualitative aids for discussion, **not** objective scores. Scale: **L**ow · **M**edium · **H**igh · **VH** Very High.
**Scope risk** reads the *opposite* way: **L** means little risk of overrunning (good), **H** means likely to overrun.

Columns: **Fit** = connection to the existing concept · **Orig** = originality · **Inter** = interaction potential · **Pers** = persistence significance · **Multi** = multiplayer potential · **S/V** = sound/visual potential · **Feas** = technical feasibility · **Scope** = scope risk · **Demo** = demonstration value · **Final** = final-project potential.

| # | Idea | Fit | Orig | Inter | Pers | Multi | S/V | Feas | Scope | Demo | Final |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 066 | One Continuous Line | VH | H | H | VH | H | M | M | M | VH | H |
| 013 | Breath of the Room | M | H | L | L | VH | H | H | L | VH | H |
| 016 | Living Ink | H | H | M | VH | M | VH | M | M | H | H |
| 001 | Ink Strings | H | H | VH | H | M | VH | M | M | VH | H |
| 061 | Pens in the Room | M | M | VH | M | VH | H | M | M | VH | VH |
| 135 | Chart Recorder | H | H | M | H | H | H | H | L | H | H |
| 088 | Colophons and Marginalia | VH | M | M | H | M | L | H | L | M | M |
| 123 | Hash-Chained Scroll | VH | H | L | VH | L | L | H | L | M | H |
| 116 | Phone Orchestra | L | VH | H | L | VH | H | M | H | VH | M |
| 007 | The Eternal Loop | M | H | L | H | M | H | H | L | M | M |
| 047 | Candles | H | H | L | H | M | H | H | L | H | M |
| 052 | Since You Were Here | VH | L | M | H | M | L | H | L | M | H |
| 075 | Ink Budget | H | M | M | M | H | L | VH | L | M | H |
| 166 | Headcount Modes | M | H | M | L | VH | M | M | M | VH | H |
| 045 | Wind Chimes | L | H | M | L | H | VH | M | M | H | M |
| 102 | Make the Stroke a Stroke | VH | M | VH | H | M | H | H | M | H | VH |
| 090 | The Chronicler | H | H | L | H | L | L | H | L | M | M |
| 027 | Walking the Handscroll | VH | H | M | M | L | VH | M | H | H | H |
| 155 | Burn It Down (WEIRD) | L | VH | L | M | VH | H | M | M | VH | M |
| 162 | Resident Ghosts (WEIRD) | M | H | L | M | M | L | H | L | M | M |

**Patterns worth noticing (not conclusions):**

- The ideas that are *cheap and fit well* (052, 075, 123, 088, 102) tend to have **lower demo value** unless paired with something sensory. The ideas with the highest demo value (116, 155, 166, 061, 001) are the ones with the highest scope or dependency risk.
- **Sound** ideas have the highest ceiling and the most "taste risk", which matters because the agent running the prompt cannot listen.
- **Multiplayer-heavy** ideas score lowest for a *solo* viewer; any of them needs a plan for a marker opening a single window.
- **102 Make the Stroke a Stroke** and **132** are *enablers* more than destinations: they raise the ceiling of many others.

---

# 9. Questions We Need to Decide

Grouped by how much they shape the rest. The first few change everything else.

## A. What is the artefact?

1. **Does the scroll metaphor survive?** Options: keep a literal scroll (105, 027, 135), keep the idea but not the look (028, 058, 029), or abandon it for something else (an instrument, a creature, a room).
2. **Is a mark a sentence, a drawing, a sound, an object, or all of them?** (102 drawing, 008/103 sound, 089 objects, 039 pattern.) This choice rewrites the validation rules and spec tests.
3. **Should the experience be immediately understandable, or intentionally mysterious?** (077, 149 and 080 depend on opacity; 134 and 105 depend on clarity.) A marker has ten minutes.
4. **How much conventional game structure do we want?** None (pure artefact), light constraints (075, 082), or a rules-driven society (C10).

## B. How does it behave with other people?

5. **Primarily asynchronous, or live multiplayer?** The final project *requires* real-time within ~1 s, but how much of the *experience* depends on simultaneity is open (061/067 live vs 052/053 asynchronous).
6. **What reaches others live and what waits for reload?** (C9's own question.) Pens? presence? strokes only? salutes?
7. **What happens when two people act at once?** Baton (067), fork, last-writer layering (064), merge (068), or "doesn't matter because append-only".
8. **Should presence be visible, and how?** Ghost pens (061), a drone (013), a count, wind chimes (045), nothing.
9. **Is the app designed for four people in a room (C5), for strangers over days (C8), or both?** This decides cold-start handling (122, 162) and whether physical-co-presence ideas (116, 151, 152) are worth it.

## C. Sound, graphics and technology

10. **Should sound become central?** If yes, who tunes it, given an unattended run cannot listen? (Opt-in switch, deterministic synthesis, and a visible twin are non-negotiable under the repo's rules.)
11. **DOM vs SVG vs Canvas vs WebGL?** DOM/SVG keep text and accessibility native; Canvas gives drawing and sims; WebGL is for shader fields; Three.js only if 3D *is* the pitch.
12. **Which transport?** SSE + existing `POST` (no new dependency) or `ws` (second dependency, needed for high-rate pens).
13. **Do we accept a build step or keep vendored static files?** (README's argument is "fewer moving parts"; a bundler is a real cost, Three.js/PixiJS can be vendored without one.)
14. **Do we change `fly.toml`?** `min_machines_running = 1` makes live demos reliable but edits a file marked "leave as is"; the alternative is to make sleeping part of the design (056).

## D. Identity and trust

15. **Should anonymous identity get stronger?** Seals (095), voices (004, 143), squiggle (096), sigil (097), claim-check words (098), or stay minimal.
16. **Do we fix the public-hand/secret-cookie flaw first (132)?** Any identity idea assumes yes.
17. **Is append-only still sacred?** Ideas 146 (pyre), 155 (burn), 050 (wear), 047 (candles) all play with *display* of permanence. Do we allow display-level fading, or is "it stays visible" part of the argument? Is **verifiable** append-only (123) the upgrade to the claim?

## E. Time, scale and the cold start

18. **What does the artefact look like with 5 strokes, 50, 500?** (120 Scale Is Genre, 078 unlocks, 122 Design for Four.) The live scroll currently has 5 strokes from one hand.
19. **Do we seed it?** Founding ancestors (122), resident bots (162), or an honest empty page that fills.
20. **How should it demonstrably "have lived"?** Replay (046), growth (016), wear (050), seams (056), chronicle (090), heartbeat (055)?

## F. Process and fit

21. **Which parts of the current harness do we keep?** The invariants must stay green; `marks`, `page` and `persistence` specs encode the old brief and can be rewritten, but **what replaces them** should still be a testable, human-checkable promise (README's enforced vs judged split).
22. **How ambitious can an unattended 4-hour agent run be?** Prefer a directional prompt with a *demonstrable first slice and a clear priority order*, so that a partial result is still a good result (this document's Complexity ratings assume a week; a four-hour run is smaller).
23. **How does this relate to the final project?** The riff repo is not marked, but ideas may inform the final submission, whose README, PROCESS and CLAUDE documents the course says should be drafted by the student, not by an agent.
24. **What do we want the next session to produce?** One chosen direction with a fallback, or a prompt with a primary direction and an optional "if time" layer.

---

*End of exploration. Nothing here has been implemented, decided or deployed. The only file created by this session is this document.*
