# The spec

The [final project brief](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/assessments/final-project/)
and its spec are on the course website, along with the specs for crits 8, 9 and
10, which run in this repo. The brief poses the problem; the spec is the fixed
contract.

## What ships

`invariants.test.ts` checks the two things the course relies on:

- `/` answers with a 200, which is what the deploy and the crit capture read
- `/readme/` publishes `README.md`. Markdown renderers all differ slightly, so
  it checks the README's headings rather than every word: each one has to
  appear, in order, in the HTML the server sends, since no script runs. Render
  it however you like, as long as it's there in full; the marker reads it there.

Both run against the **running** app over HTTP, so they hold whatever it's built
with. In CI that app is the image your `Dockerfile` builds, started with a
throwaway `/data`, and a red run blocks the deploy. Locally, start the app
however you run it and `pnpm check` finds it at `APP_URL` (default
`http://localhost:8080`). Keep them; don't delete them.

## This app's checks

Everything else in `spec/` encodes the handscroll brief. Like the invariants,
every file runs against the running app over HTTP. `page.test.ts` also loads
the served page into jsdom; jsdom has no WebGL, so what it tests is the Text
view fallback, never the 3D scene.

- `marks.test.ts`: validation of colour, note and geometry, including hostile
  bodies; the body cap; cross-site and Origin-less POSTs refused; PUT, PATCH
  and DELETE refused; hand cookies decoded and shape-checked; security headers
  on every response.
- `live.test.ts`: a second SSE window gets a new stroke within a second;
  `Last-Event-ID` replay; the secret hand never appears in a body; a spoofed
  handle doesn't impersonate; presence join and leave; pen relay, validation,
  cross-site refusal and rate limit; last visits; the hash chain.
- `persistence.test.ts`: strokes, handles and last visits survive a restart,
  using two servers it starts itself against a throwaway `DATA_DIR`.
- `page.test.ts`: without WebGL, the Text view lists every stroke with its
  note, time and "— yours"; every control is a native, labelled element in
  the tab order.
- `living.test.ts`: Living Ink is deterministic and grows monotonically.
- `residents.test.ts`: resident strokes always pass the server's own
  validation.

Some lines of the brief only a person can judge (whether it feels like one
continuous object); `README.md` says which.
