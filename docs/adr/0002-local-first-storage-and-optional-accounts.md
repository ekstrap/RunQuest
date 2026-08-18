# ADR-0002: Local-first storage with optional accounts and cloud sync

- **Status:** Accepted
- **Date:** 2026-08-18
- **Context issue:** #11 (Accounts + cloud sync), child of #1 (PRD)
- **Relates to:** ADR-0001 (establishes the `Repository` boundary this builds on)

## Context

DESIGN.md §3.12 makes account creation **optional and deferred**: the user is
asked once, honestly, when they first press Start, and "Just run" is a real
choice rather than a trial. §3.19 picks Supabase as the backend and Apple/Google
as the only sign-in methods. ADR-0001 defined the `Repository` interface with an
in-memory implementation and left "a Supabase-backed implementation" to a later
issue — this one.

The obvious reading of "Supabase-backed implementation" is a repository whose
reads and writes are network calls. That reading is wrong for this app:

- The app is used **while running**, often outdoors, frequently with no signal.
  A read that can fail is a run that can fail.
- **Anonymous users have no cloud at all.** Until this issue, the only
  implementation was in-memory, so an anonymous user lost everything on restart —
  which quietly made "Just run" a worse product than the design promises.

So the decision isn't "in-memory or Supabase". It's what the storage stack looks
like when an account is optional.

## Decisions

### 1. Device storage is the source of truth; the cloud is a mirror

`LocalRepository` (JSON in AsyncStorage, behind a small `KeyValueStore`
boundary) answers every read and takes every write first. Signing in wraps it in
`SyncingRepository`, which mirrors writes to the cloud **best-effort**: a failed
cloud write is swallowed, never surfaced, never fatal. Losing a completed run to
a network blip would break the one promise the app makes (Pillar 1,
consistency).

Consequence: the app behaves identically offline, and "signed in" is strictly
additive.

### 2. `hydrate()` is the reconciliation point, and the merge is non-destructive

Called on launch while signed in, and right after signing in. It merges both
directions:

- **sessions** — union, keyed by start time. A run is one run however many times
  it was sent; the `(user_id, started_at)` unique constraint makes re-sends
  idempotent server-side too.
- **progression** — whichever side has more lifetime XP. XP only grows, so the
  larger number is the one that saw more completed sessions.
- **onboarding / calibration** — the cloud's answer when it has one (it outlives
  any single device), otherwise the device's, pushed up.

Nothing in the merge can lower a user's XP or delete a run. This is also what
carries an anonymous user's existing history into a new account, so choosing
"Just run" first never costs them anything.

Rejected: last-write-wins on a timestamp. It is simpler but can silently discard
runs recorded offline, which is precisely the data we most need to keep.

### 3. Rendering waits for the first hydrate, but never for the network

`AppRepositoryProvider` renders nothing until the initial sync attempt settles,
so a signed-in user on a reinstalled phone never sees "level 1, no runs" before
their real history arrives. `hydrate()` resolves even when every call fails, so
this can't hang.

### 4. Auth is split into two boundaries, and only one needs credentials

- `AuthClient` — sign-in state and operations. `SupabaseAuthClient` implements
  it over `signInWithIdToken`.
- `IdentityTokenProvider` — the *native SDK* step that turns a tap into an Apple
  or Google identity token.

Only the second needs real developer credentials and a native build. The shipped
default is `unconfiguredIdentityTokenProvider`, which reports both providers
unavailable, so the account flow is complete and tested today while sign-in
itself stays honestly switched off. Turning it on is one file plus configuration
(tracked separately) — no rework of anything built on top.

### 5. Contract testing, not integration testing, keeps implementations honest

`describeRepositoryContract` is one suite run against every `Repository`
implementation — in-memory, local, and syncing. The Supabase pieces
(`SupabaseRemoteStore`, `SupabaseAuthClient`'s SDK surface) are deliberately
logic-free translations tested through narrow hand-written interfaces, per the
PRD's "thin shells get thin coverage".

## Copy note

DESIGN.md §3.12 words the account prompt as "your run won't be saved". With
local persistence in place that is no longer true, and the prompt must not
overstate the cost of declining. The implemented copy says the progress is saved
**only on this phone**. Worth reconciling in DESIGN.md.

## Consequences

- New storage operations are added to `Repository` **and** to the contract suite;
  all three implementations move together.
- The database schema lives in `supabase/migrations/`, with row-level security
  scoping every row to its owner. There is no cross-user visibility anywhere —
  the app has no social surface by design (Pillar 3).
- Anonymous and signed-in are the same code path with one wrapper's difference,
  so features never have to ask which kind of user they're serving.
