# ADR-0001: App architecture — navigation, state, and test framework

- **Status:** Accepted
- **Date:** 2026-06-12
- **Context issue:** #2 (App scaffold + tracer bullet), child of #1 (PRD)

## Context

DESIGN.md §3.19 locked the framework (React Native + Expo, EAS Build), backend
(Supabase), auth (Apple/Google), and maps (Google Maps), but **explicitly left
three conventions to the developer**: the state-management library, the local
storage library, and the navigation approach. The test framework was likewise
unspecified. Issue #2 (the first code in the repo) is the place to decide and
record them, since every later feature builds on these choices.

The PRD's architecture is "product rules in plain, deterministic TypeScript
modules behind small interfaces (deep modules); UI, DB, and clock are thin,
injected boundaries" — so the choices below are judged mainly on how well they
keep UI/storage as swappable, testable seams.

## Decisions

### Navigation: Expo Router

File-based routing built on React Navigation; the default from `create-expo-app`.

- Least-friction path on Expo, first-party, and a clean fit for the v1 route set
  to come (onboarding → home → stats).
- The navigation shell lives in `app/_layout.tsx` (a Stack); routes are files in
  `app/`. Today: a single `app/index.tsx` placeholder home screen.

### State management: Zustand

Lightweight store, widely used in the RN/Expo ecosystem.

- Chosen as the app-state library, but **barely used in this slice**. The
  scaffold's only cross-cutting dependency — the repository — is injected via a
  small React Context (`src/providers/repository-provider.tsx`), which is the
  natural dependency-injection seam for tests.
- Zustand is adopted as real feature state lands (e.g. the run-session
  controller's UI state). Product rules stay in the deep-module engines, not in
  the store.

### Test framework: Jest (`jest-expo` preset) + React Native Testing Library

- `jest-expo` is the Expo-recommended Jest preset; it handles the RN/Expo
  transform pipeline. Configured in `package.json` (`jest.preset` +
  `transformIgnorePatterns`).
- React Native Testing Library (RNTL) drives component/screen tests through
  observable output (query by visible text), matching the PRD's "verify behavior
  through public interfaces" rule. Pure-TS logic modules (e.g. the repository)
  run under the same Jest with no RN dependency.
- Follows the repo's `tdd` skill: red → green, one vertical slice at a time.

## The repository boundary (DI seam)

`src/data/repository.ts` defines the `Repository` interface — the storage
boundary the product-rule modules depend on. `InMemoryRepository`
(`src/data/in-memory-repository.ts`) is the test/offline implementation; a
Supabase-backed implementation satisfying the same interface arrives in a later
issue. Screens reach it through `RepositoryProvider` / `useRepository`, never by
constructing a concrete repository directly. This is the seam that lets tests
inject an in-memory store with no device, network, or DB.

## Verification commands

- `npm run check` → `tsc --noEmit` (typecheck) + `expo lint` + `jest` (the gate).
- `npm test` runs the behavior tests, including the tracer bullet (home screen
  reads progression state through the `Repository` interface).

## Consequences

- New screens are files under `app/`; new storage operations are methods on
  `Repository` (in-memory + Supabase implementations kept in lockstep, ideally
  via a shared contract test — added when the Supabase impl lands).
- Revisiting any of these is a new ADR superseding this one, per
  `docs/agents/domain.md`.
