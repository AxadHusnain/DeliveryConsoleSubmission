# Delivery Console

A React Native (TypeScript, bare CLI) app for a delivery courier working a route of stops.
Built to the "Last-Mile Delivery Console" instructions: offline-first outbox sync, a hand-rolled
geofence state machine, and a proof-of-delivery form rendered entirely from a JSON template.

## Running it

```bash
npm install
npm start          # Metro bundler, in its own terminal
npm run android    # in a second terminal
```

There is no real backend — `src/api/mockApi.ts` is an in-process fake with configurable
latency, failure rate, and forced status codes (edit `mockApiConfig` at the top of that
file). It serves the fixture data in `src/data/route.json` and `src/data/pod-templates.json`.

## Driving the simulated GPS stream

The Route screen has a **Dev GPS Simulator** panel at the bottom. It talks to the same
`locationStream` singleton a real GPS watch would feed, so the app can't tell the difference:

- **Jump inside zone / Jump far away** — drop a single fix, useful for testing the Arrive gate.
- **Play: arrive → depart → return** — replays a short scripted track (outside ×3 → inside ×3 →
  outside ×3 → inside ×3) at 800ms/fix, enough to walk through the full arrival/departure cycle
  including the confirmation streak.
- **Custom fix** — type any lat/lng and inject it directly.

To exercise the full offline scenario: turn on airplane mode (device/emulator setting, not
in-app), use the simulator to arrive and submit a delivery at 2-3 stops, force-quit the app,
reopen it (stops still show completed, Outbox still has them queued), then turn the network
back on.

## Architecture

Business logic is deliberately kept out of the screens, split into small, independent pieces
under `src/`:

- **`src/geofence/`** — `pointInPolygon.ts` (hand-rolled ray-casting containment + haversine
  distance, no library) and `zoneStateMachine.ts` (the per-stop `NOT_ARRIVED → AT_STOP ⇄
  DEPARTED_EARLY` machine). `locationStream.ts` is the single source of GPS fixes, fed either
  by the dev simulator or real GPS.
- **`src/outbox/`** — `outboxStore.ts` (the persisted local delivery queue) and `syncEngine.ts`
  (the sequential sync pass: backoff, retry cap, 4xx-vs-network classification, idempotent-
  replay handling). Neither imports React.
- **`src/forms/`** — `fieldRegistry.tsx` (type → renderer map), `visibility.ts` (`visibleWhen`
  evaluation + stripping hidden answers), `validateForm.ts`.
- **`src/route/routeController.ts`** — the single hub tying the above together: owns the
  active stop, wires NetInfo/AppState/a periodic timer into the sync engine, and exposes a
  plain subscribe/snapshot interface. Screens are a thin `useRouteSnapshot()` hook over this;
  none of them own state that matters.
- **`src/screens/`** — Route, Proof of Delivery, Outbox. Presentation only.

### State management / persistence

No Redux or similar library — the singletons above (`outboxStore`, `routeController`, etc.)
*are* the state layer, persisted via `src/storage/persist.ts`, a thin wrapper over
`@react-native-async-storage/async-storage`. Deliberate choice for an app this size: three
screens, no cross-cutting derived state, and the business logic already needed to be
UI-framework-agnostic per the instructions — a general state library would have added indirection
without solving a problem this app actually has.

### Noise-filtering rule (geofence)

Two independent filters, both in `zoneStateMachine.ts`:

1. **Movement threshold (10m).** Consecutive fixes closer than that are treated as the same
   position and skip evaluation entirely — stops GPS jitter from burning cycles while the
   courier is standing still.
2. **Confirmation streak (3 fixes).** A raw containment reading only becomes a *confirmed*
   transition after 3 consecutive fixes agree. At a realistic ~2-3 second reading interval,
   that's roughly 6-9 seconds before a departure is trusted — enough to absorb a stray fix at
   the zone boundary without needing to average anything, without being so slow it feels
   unresponsive.

**Arrival is intentionally exempt from both filters** — `canArrive`/`arrive()` check the
single latest fix directly. The courier is standing at the door expecting instant feedback
when they tap Arrive; filtering there would just make the button feel broken.

### A judgment call worth flagging

The instructions describe `AT_STOP`/`DEPARTED_EARLY` but doesn't say what happens *before* arrival.
A third state, `NOT_ARRIVED`, was added and the Arrive button gated on it explicitly — without
it, the state machine would have to assume "already at the stop" by default, which would fire
a bogus `DEPARTED_EARLY` alert for every stop the courier hasn't reached yet. Once `arrive()`
succeeds, `NOT_ARRIVED` is never re-entered.

## What I'd do with another day

- Automated unit tests for the geofence math, sync engine, and form validation. Given the
  time available, correctness was verified manually instead — walking through force-quit
  mid-sync, flapping airplane mode, permission grant/deny/re-grant from Settings, GPS jitter
  at a zone boundary, a deliberately malformed template, and the concave-zone containment
  check. That manual pass caught a few real bugs along the way (the outbox not re-queuing a
  delivery that was mid-flight when the app was killed, the mock API's online flag not
  actually being wired to the device's real network state, and the Proof of Delivery screen
  rendering every field instead of only the currently-visible ones) — exactly the kind of
  thing automated tests would catch immediately on the next change, which is the strongest
  argument for adding them next.
- A real date/time picker for the `DATETIME` field type instead of a text input + "Now" button.
- A proper debug menu for `mockApiConfig` (latency/failure-rate sliders) instead of editing
  the source constant.
- iOS build/run — not required by the instructions, and everything in `src/` is
  platform-agnostic, but not verified on Xcode/pod install.
- Exponential backoff jitter (currently deterministic `2^n`), to avoid thundering-herd retries
  if this were multi-courier.

## What I knowingly left out

- No map view on the Route screen (explicitly not required — plain inside/outside readout
  instead).
- No login, push notifications, chat, photo capture, or route optimization — out of scope.
- A completed stop whose delivery is stuck in the outbox's own `FAILED` sync state isn't
  called out with its own badge on the Route screen's stop list — the Outbox screen is the
  place that surfaces it. Worth adding as a small visual nudge on the Route screen too, but
  not required for the stop itself, which is genuinely done from the courier's perspective
  regardless of what happens to it on the way to the server.

