# Handoff — Issue #4: Run a plain session (map + timer + completion)

> Self-contained implementation plan. A fresh agent should be able to execute
> this with no memory of the planning conversation. Assume you have read only:
> this file, `CLAUDE.md`, and the repo. Read `docs/DESIGN.md` §3.9 and the PRD
> (GitHub issue #1) only if you need deeper rationale.

## How to resume

Implement this plan directly, following the **TDD skill** (`tdd`) for all
behavioral code, and the **completion gate**, **stop rule**, and
**commit-then-hand-off** steps in the `solve-issue` skill:

- Work phase by phase, red→green→refactor, one behavior at a time.
- Gate completion on `npm run check` exiting 0 (typecheck + lint + jest) AND
  every acceptance criterion confirmed against real output.
- **Stop and return to the user** (without committing) if you hit a
  fundamental/architectural change beyond this plan, get stuck after a couple
  of alternatives, find the acceptance criteria ambiguous/contradictory, or hit
  an unanticipated blocker.
- When verified: **commit locally** with a message referencing `#4` (e.g.
  `Implement plain in-run session and completion (#4)`). **Do NOT** `git push`,
  and **do NOT** comment on or close issue #4 — that is the user's to do.

## Issue goal (restated)

Build the in-run experience for **non-interval** modes. Before starting, the
user picks a run type (**walk/run interval [default]**, just run, just walk). In
just-run / just-walk, the screen shows only a calm map with live location and
elapsed time — no cues, no gamification. Ending the run produces a completed
session record (time, mode, post-run distance from GPS) via the repository. GPS
is used for the map/distance only and is **never** a completion gate.

### Acceptance criteria (copied verbatim)

- [ ] Run-type toggle selectable before starting; interval is the default
- [ ] Just-run/just-walk shows only map + live location + elapsed time
- [ ] No XP/level/achievement UI appears during the run
- [ ] Ending a run creates a completed session record retrievable via the repository
- [ ] Completion works without GPS (distance simply absent/zero)

Blocked by #3 — which is **CLOSED** (onboarding + calibration engine landed).

## Decisions agreed during planning

1. **Scope split.** This issue is the **plain** in-run screen + session
   completion only. The interval-mode audio-cue state machine (PRD module 5,
   "Run-session controller") is a **separate later issue**. Here the run-type
   toggle merely offers `interval` as the selectable **default**; all three
   modes render the same calm map+timer screen for now (no cues). This is fine:
   "no gamification during the run" still holds, and the mode is recorded.

2. **GPS / map = OPTION B (approved by user).** `react-native-maps` and
   `expo-location` are **not** installed and are **NOT** being added in this
   issue. Real `react-native-maps` needs a custom dev client (not Expo Go) + a
   Google Maps API key, and a map can't be verified by automated tests anyway.
   Instead, mirror how Supabase is deferred behind the `Repository` boundary:
   - Build the in-run screen behind an injected **`LocationSource` boundary**.
   - Render a calm **placeholder map area** (a styled `View`, e.g. labeled
     "Map" / testID `run-map`), not a real map.
   - Default the location source to an **"unavailable"** implementation
     (no fix, null distance) so the app runs in Expo Go and "completion without
     GPS" is the real default path.
   - Real native map + GPS wiring is a **fast-follow**, out of scope here.
   This aligns with the PRD testing strategy, which names map + GPS as
   boundaries to fake/inject.

3. **No injectable Clock provider.** The elapsed timer uses `Date.now()` +
   `setInterval(…, 1000)`. Tests control time with Jest **modern fake timers**
   (`jest.useFakeTimers()`), which also drive `Date.now()`. No Clock boundary
   needed.

4. **Navigation.** Add a `run` route group: `app/run/_layout.tsx` (chromeless
   immersive Stack), `app/run/setup.tsx` (run-type picker), `app/run/active.tsx`
   (in-run screen). Register `<Stack.Screen name="run" options={{ headerShown:
   false }} />` in `app/_layout.tsx`. Entry point: a minimal "Start a run"
   button on the (still-placeholder) `app/home.tsx` → `/run/setup`.

5. **Mode passed via route param.** `setup` → `router.push({ pathname:
   '/run/active', params: { mode } })`. `active` parses/guards the param back to
   a `RunType`, defaulting to `interval`.

6. **End of run** → `buildSessionRecord(...)` → `repository.saveSession(record)`
   → `router.replace('/home')`. (The post-run summary screen — distance/time/XP
   — is a separate PRD user story / later issue; do not build it here.)

## Project conventions (already established — match them)

- **Repository is the storage boundary** (`src/data/repository.ts`), injected
  via React Context (`src/providers/repository-provider.tsx`, `useRepository()`).
  In-memory impl in `src/data/in-memory-repository.ts`; Supabase impl deferred.
- **Path alias `@/`** maps to the repo root (e.g.
  `import { useRepository } from '@/src/providers/repository-provider'`).
- **Domain types** live in `src/domain/types.ts` with doc comments citing
  DESIGN.md sections. Deep logic modules are pure TS with small public
  interfaces, tested through that interface.
- **Tests:** Jest (`jest-expo` preset) + React Native Testing Library
  (`@testing-library/react-native`). Test files are colocated as
  `*.test.ts(x)` next to the code. Existing tests only cover domain/data so
  far; **screen tests are new here** — mock the `expo-router` hooks
  (`useRouter`, `useLocalSearchParams`) with `jest.mock('expo-router', …)`.
- **Full gate:** `npm run check` = `tsc --noEmit` + `expo lint` + `jest`.
- Style: existing screens use `StyleSheet.create`, `Pressable` buttons, simple
  `View`/`Text`. Match that. Blue button color in use is `#2563eb`.

## Implementation phases & file-by-file

### Phase 1 — Domain types & pure logic (TDD)

**`src/domain/types.ts`** — add:
```ts
/** The movement pattern the user picks before a session (DESIGN.md §3.9). */
export type RunType = 'interval' | 'just-run' | 'just-walk';

/**
 * A completed session record. Time is the completion contract (§3.5/§3.9);
 * GPS is map/distance only and never gates completion, so distance is nullable.
 */
export interface SessionRecord {
  mode: RunType;
  /** When the session started (epoch ms). */
  startedAt: number;
  /** Completed elapsed time in seconds. */
  durationSeconds: number;
  /** Post-run GPS distance in meters, or null when GPS was unavailable. */
  distanceMeters: number | null;
}
```

**`src/domain/session.ts`** + **`src/domain/session.test.ts`** (TDD, write the
test first):
```ts
export interface SessionInput {
  mode: RunType;
  startedAt: number;   // epoch ms
  endedAt: number;     // epoch ms
  distanceMeters?: number | null;
}

export function buildSessionRecord(input: SessionInput): SessionRecord {
  const durationSeconds = Math.max(
    0,
    Math.round((input.endedAt - input.startedAt) / 1000),
  );
  return {
    mode: input.mode,
    startedAt: input.startedAt,
    durationSeconds,
    distanceMeters: input.distanceMeters ?? null,
  };
}
```
Tests: duration derived from start/end; distance passed through when provided;
**distance is `null` when omitted (AC5)**; never negative if endedAt < startedAt.

**`src/domain/elapsed.ts`** + **`src/domain/elapsed.test.ts`** (TDD):
`formatElapsed(seconds: number): string` → zero-padded `"MM:SS"`. Tests:
`0 → "00:00"`, `65 → "01:05"`, `600 → "10:00"`.

### Phase 2 — Repository persistence (TDD)

**`src/data/repository.ts`** — add to the `Repository` interface (and update its
doc comment which says it grows as features land):
```ts
/** Persist a completed session record. */
saveSession(record: SessionRecord): Promise<void>;
/** Read all completed session records, oldest-first. */
getSessions(): Promise<SessionRecord[]>;
```
Import `SessionRecord` from `@/src/domain/types`.

**`src/data/in-memory-repository.ts`** — add `private sessions: SessionRecord[] =
[]`; `saveSession` pushes; `getSessions` returns a **copy** (`return
[...this.sessions]`) so callers can't mutate internal state.

**`src/data/in-memory-repository.test.ts`** — add cases: no sessions initially
(`[]`); after `saveSession`, `getSessions` returns the record (AC4); order
preserved across two saves; a record with `distanceMeters: null` round-trips
(AC5).

### Phase 3 — Location boundary & provider

**`src/run/location-source.ts`** (new):
```ts
export interface Coordinate { latitude: number; longitude: number; }

export interface LocationReading {
  /** Latest position, or null when no fix yet / GPS unavailable. */
  coordinate: Coordinate | null;
  /** Accumulated distance in meters, or null when GPS unavailable. */
  distanceMeters: number | null;
}

/**
 * The GPS/map boundary (PRD: faked in tests, real expo-location in prod —
 * deferred). subscribe() pushes readings and returns an unsubscribe fn.
 */
export interface LocationSource {
  subscribe(listener: (reading: LocationReading) => void): () => void;
}

/** Default no-GPS source: one null reading, no-op unsubscribe. */
export const unavailableLocationSource: LocationSource = {
  subscribe(listener) {
    listener({ coordinate: null, distanceMeters: null });
    return () => {};
  },
};
```

**`src/providers/location-provider.tsx`** (new) — mirror
`repository-provider.tsx`: `LocationProvider` accepts an optional `source` prop
(defaults to `unavailableLocationSource`), provides via context;
`useLocationSource()` reads it (throw if used outside provider, like
`useRepository`). Keep the same `useMemo` shape.

### Phase 4 — Screens (thin shells; smoke/integration tests)

**`app/run/_layout.tsx`** — `export default function RunLayout()` returning
`<Stack screenOptions={{ headerShown: false }} />` (immersive, like the
onboarding layout).

**`app/run/setup.tsx`** — run-type picker. Three options with friendly labels:
`interval` ("Walk/run intervals"), `just-run` ("Just run"), `just-walk` ("Just
walk"). **Interval is the default selection** (e.g. pre-highlighted via local
state initialized to `'interval'`, with a Start button that pushes
`/run/active` with `params: { mode }`); one-tap-to-pick-and-start is also
acceptable as long as interval is clearly the default. Match the card styling in
`app/(onboarding)/bracket.tsx`.

**`app/run/active.tsx`** — the in-run screen:
- Parse `mode` from `useLocalSearchParams`, guard to `RunType` (default
  `interval`).
- On mount: capture `startedAt = Date.now()`; `setInterval(() => tick, 1000)`
  updating an `elapsedSeconds` state from `Date.now() - startedAt`; clear on
  unmount.
- Subscribe to `useLocationSource()`; keep the latest `LocationReading` in a
  ref + state (ref so End can read the final value).
- Render: a **placeholder map area** (styled `View`, `testID="run-map"`, e.g.
  child text "Map"); **live location** (show coordinate when present, else
  "Locating…"); **elapsed time** via `formatElapsed(elapsedSeconds)`.
- **No XP / level / achievement UI anywhere on this screen** (AC3).
- An **"End run"** button → `buildSessionRecord({ mode, startedAt, endedAt:
  Date.now(), distanceMeters: latestReading.distanceMeters })` →
  `await repository.saveSession(record)` → `router.replace('/home')`.

**`app/run/setup.test.tsx`** — RNTL, mock `expo-router`. Assert all three run
types render and **interval is the default** (selected/highlighted, or
documented as the default action).

**`app/run/active.test.tsx`** — RNTL integration. Use `jest.useFakeTimers()`,
mock `expo-router` (capture `router.replace`), and wrap render in
`RepositoryProvider` (with a real `InMemoryRepository` instance you hold a
reference to) + `LocationProvider`:
- With a **fake LocationSource** emitting a reading, assert live location +
  ticking elapsed time render (advance timers ~1–2s) (AC2).
- Assert **no** element matching `/level/i`, `/\bxp\b/i`, `/achievement/i` is
  present (AC3).
- Press "End run"; `await` microtasks; assert `repository.getSessions()`
  returns one record with the chosen mode (AC4), and that `router.replace` was
  called with `/home`.
- With the **default unavailable source** (`LocationProvider` with no `source`),
  pressing End yields a record with `distanceMeters: null` and still completes
  (AC5).

### Phase 5 — Wiring

**`app/_layout.tsx`** — wrap the existing tree in `<LocationProvider>` (inside or
around `RepositoryProvider`), and add `<Stack.Screen name="run" options={{
headerShown: false }} />` to the root `Stack`.

**`app/home.tsx`** — add a minimal "Start a run" `Pressable` →
`router.push('/run/setup')` (import `useRouter`). Keep the rest of the
placeholder home as-is.

## Acceptance-criterion → verification map

| AC | Verified by |
|----|-------------|
| Run-type toggle selectable; interval default | `app/run/setup.test.tsx` |
| Just-run/just-walk shows map + live location + elapsed | `app/run/active.test.tsx` (map testID, location text, ticking timer) |
| No XP/level/achievement UI during run | `app/run/active.test.tsx` absence assertions |
| Ending creates retrievable session record | `app/run/active.test.tsx` + `src/data/in-memory-repository.test.ts` via `getSessions()` |
| Completion works without GPS (distance absent/zero) | `src/domain/session.test.ts` (null distance) + `app/run/active.test.tsx` with unavailable source |

**Gate:** `npm run check` exits 0.

**Manual-only (do NOT claim done):** the visual "calm map" feel and on-device
live GPS — deferred with the native map under option B. Note these to the user
rather than marking them verified.

## Out of scope (do not build here)

- Real `react-native-maps` / `expo-location` integration (fast-follow).
- Interval-mode audio cues / the run-session state machine (separate issue).
- Post-run summary screen (distance/time/XP celebration) — separate issue.
- XP/level engine, week/streak model — separate issues.
