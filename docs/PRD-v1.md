# PRD — RunQuest v1

> Source of truth for product decisions: `docs/DESIGN.md`. This PRD synthesizes that design into an implementable v1 spec. Section references (e.g. §3.20) point into DESIGN.md.

## Problem Statement

People who don't yet run but want to start have nowhere encouraging to begin. Existing running apps (Strava and its peers) are built for people who *already* run: they foreground pace, distance, personal records, and social comparison. For a nervous newcomer, that culture is intimidating and shame-inducing — it answers "how do I compete?" when the newcomer is asking "how do I start, and how do I keep showing up?" The result is that motivated beginners bounce off running entirely, or quit within a week or two when an app makes them feel slow, behind, or guilty for missing a day.

The unmet need: a way to begin running that (a) tells a beginner exactly what to do each session without it feeling like a rigid program they can fail, (b) makes coming back next week feel rewarding rather than anxiety-driven, and (c) never measures them against anyone — including their past self's pace or distance.

## Solution

RunQuest is a gamified running app for newcomers — "Duolingo for running." It gives the user one friendly, time-based session at a time ("walk/run for 10 minutes"), calibrated to their self-described starting point, and rewards the *act of showing up* with XP and levels. The reward system is non-predatory by construction: it celebrates consistency and never threatens loss, never grades the body, and never rewards pace, distance, or output.

The core loop:

1. The app suggests 2–3 sessions for the week, calibrated to the user's ability.
2. The user runs whenever they want; during the run the app provides walk/run interval cues, a map, and elapsed time, then disappears.
3. After the run, a tight summary celebrates what they did (distance as a celebration, time, XP, any level-up).
4. Completing the week's sessions earns a week-completion bonus — the largest reward lever — and advances lifetime weeks completed, the long-term anchor.
5. Difficulty advances on its own, gently and conservatively, as the user keeps showing up — always overridable.

The app is solo, free, ad-free, and cross-platform (iOS + Android) from day one.

## User Stories

### Onboarding & first run

1. As a curious newcomer, I want a one-sentence explanation of what this app is on first open, so that I understand the product without sitting through a feature tour.
2. As a newcomer, I want to pick the option that best describes my current activity level ("never run before" / "run occasionally" / "getting back into it"), so that my sessions start at a level that fits me without taking a fitness test.
3. As a newcomer, I want to choose how many sessions per week feel realistic (2 or 3), so that the app's weekly target matches my life.
4. As a newcomer, I want to see my very first session ("walk/run for 10 minutes") with a big Start button immediately after setup, so that I can start running within about a minute of opening the app.
5. As a first-time user, I want to start running without being forced to create an account, so that nothing blocks me from trying the product.
6. As a first-time user pressing Start without an account, I want an honest prompt explaining that my run won't be saved unless I create one, with the choice to "Create account" or "Just run," so that I decide whether to invest, with no guilt either way.
7. As a privacy-minded user, I want account creation to use Apple or Google one-tap sign-in, so that I never deal with passwords or password resets.

### The run experience

8. As a runner mid-session, I want the app to play an audio cue when it's time to switch between walking and running, so that I don't have to watch a manual timer.
9. As a runner, I want the in-run screen to show only a map with my live location and elapsed time, so that the app stays out of my way while I run.
10. As a runner, I want no mid-run XP tickers, encouragement voice, or achievements, so that the run itself stays calm and uncluttered.
11. As a runner who dislikes intervals, I want to choose "just run" or "just walk" before starting, so that the app becomes a plain timer + map when I want that.
12. As a runner doing a prescribed session, I want walk/run interval to be the default mode, so that I get the beginner-friendly pattern without configuring anything.
13. As a runner, I want a calm map with most points-of-interest and labels hidden, so that the view matches the "app disappears" feel.
14. As a runner, I want to be able to end the session when I choose, so that I'm never trapped in a flow.

### Post-run

15. As a runner who just finished, I want a single summary screen showing the distance I covered framed as a celebration, so that distance feels like a reward, not a judgment.
16. As a runner, I want my completed time shown factually, so that I can see what I did without it feeling like a grade.
17. As a runner, I want to see the XP I earned (including the week-completion bonus when applicable), so that showing up feels rewarded.
18. As a runner who crossed a level threshold, I want a level-up moment on the summary, so that the milestone feels special.
19. As a runner, I want the post-run screen to stay tight (no week-progress/streak/lifetime tap-throughs), so that finishing doesn't turn into a chore.

### Progression — XP & levels

20. As a user, I want to earn base XP for completing a prescribed session, so that every session I show up for counts.
21. As a user, I want to earn the same session XP whether I stop at the prescribed time or go further, so that I'm never pushed to overdo it or "perform."
22. As a user, I want a larger week-completion bonus for committing to 3 sessions vs 2, so that choosing to show up more often is what scales my reward — not how hard I pushed.
23. As a user, I want small XP for off-plan / free runs, so that extra movement is welcomed but never required.
24. As a user, I want to never earn XP for pace, distance, personal records, or any comparative metric, so that the app never nudges me toward competition or injury.
25. As a new user, I want my first level-up to come very quickly (within my first session or two), so that I feel an early payoff before the habit forms.
26. As a long-term user, I want level-ups to keep arriving at a steady, predictable cadence (roughly one per completed week) forever, so that loyalty is never met with diminishing rewards.
27. As a user, I want a visible level and XP progress bar on my home screen, so that I can see my progress at a glance.
28. As a v1 user, I want a level-up to be a satisfying status moment (number + animation) even without unlocks, so that the milestone still feels good.

### Calibration — difficulty (decoupled from XP)

29. As a user, I want my session difficulty to advance on its own, gently, as I keep completing weeks, so that I improve without having to manage it.
30. As a user, I want each step-up announced in a friendly tone ("we're stepping you up to 14 minutes this week"), so that progress feels like encouragement, not a silent demand.
31. As a user, I want a step-up to always come with an easy "too hard? ease off" control, so that I'm never stuck at a level that hurts.
32. As a user, I want an always-available "too easy / too hard, adjust" control, so that I can correct my difficulty whenever my body tells me to.
33. As a user, I want my difficulty to hold steady (never drop) when I miss a week, so that taking a break is never punished.
34. As a user, I want the app to never put a number on my fitness, so that I never feel ranked or "only a 2."
35. As a user, I want my ability progress shown as a story ("you started at 10 minutes mostly walking, now 25 mostly running") on the stats screen, so that I can see how far I've come without a grade.
36. As a user who completed an easy week, I want at most one small difficulty step the next week, so that progression stays safe and gradual.

### Week, streak & lifetime tracking

37. As a user, I want a "complete week" to mean finishing my 2–3 prescribed sessions, so that success is defined by showing up, not distance.
38. As a user, I want my streak measured in weeks rather than days, so that I'm not anxious about running every single day.
39. As a user, I want my home screen to show week progress ("1 of 3 sessions this week"), so that I know whether I'm on track.
40. As a user, I want a lifetime "weeks completed" counter on my stats screen, so that I have a durable record of how consistent I've been.
41. As a user who missed one week, I want nothing to break (the streak simply doesn't advance), so that one off week carries no penalty.
42. As a user who missed 2–3 weeks, I want a gentle "we miss you" framing with my streak preserved, so that I feel welcomed back, not scolded.
43. As a user who missed 4+ weeks, I want my streak to archive gracefully ("look how far you got, ready to start fresh?"), so that a lapse is reframed as an accomplishment, never a failure.
44. As a user, I want to change my weekly commitment (2 or 3) between weeks, so that I can adapt to my life — but not mid-week, so that I can't dodge a target I've nearly hit.

### Home & stats screens

45. As a user, I want my home screen dominated by my next suggested session and a Start button, so that the primary action is obvious.
46. As a user, I want a separate stats/profile screen holding lifetime weeks, current streak, run history, and my ability-progress story, so that reflection lives apart from action.

### Notifications

47. As a user, I want gentle reminder notifications framed as invitations ("a 10-minute session today would feel great"), so that I'm nudged without pressure.
48. As a user, I want celebration notifications after good things happen (week complete, level-up, lifetime milestone), so that my wins are acknowledged.
49. As a lapsing user, I want any "we miss you" message to read as warmth, never as a threat about losing progress, so that I never feel manipulated.
50. As a user, I want to never receive a loss-aversion / countdown-to-shame notification, so that the app stays trustworthy.
51. As a user, I want to be asked about notifications at the moment I'm about to start my first run, with a friendly in-app explanation before the system permission prompt, so that I can decline softly without permanently locking myself out.
52. As a user, I want per-category notification toggles in settings, so that I can tune reminders, celebrations, and check-ins independently later.

### Platform, account & data

53. As a user on either iOS or Android, I want the same full experience, so that my platform doesn't matter.
54. As a user who created an account, I want my progress (lifetime weeks, XP, level, history) synced to the cloud, so that I don't lose it.
55. As a user, I want the entire core loop free forever with no ads, so that the product never feels like it's extracting from me.

## Implementation Decisions

### Architecture & seams

- **Product rules live in plain, deterministic TypeScript modules** behind clear interfaces; React Native components and Supabase calls are thin shells. This is the testability strategy (see Testing Decisions).
- Each logic module is a **deep module**: a small public interface (few methods, simple params) hiding complex implementation. Tests bind to the small interface; the hidden logic is free to change.
- Six core logic modules, each independently testable:
  1. **XP/Level engine** — input: session-completion events + the user's weekly commitment; output: XP total and current level. Encodes §3.6 (flat-within-session, week-completion bonus scaled by commitment, small free-run XP, nothing for pace/distance/PRs) and §3.20.5 (front-loaded-then-linear curve, no cap, ~1 level/completed week).
  2. **Calibration engine** — input: completion history + manual-adjust signals; output: current prescription (session duration + walk/run ratio) and a step-up/hold decision. Encodes §3.7 and §3.20.3 (conservative auto-advance, announced, completion-driven signal, ≤1 small step per completed week, holds on off/partial weeks, never auto-demotes). Calibration is **never** influenced by XP.
  3. **Week / streak / lifetime model** — input: a timeline of sessions; output: week-complete flag, current-streak state, lifetime-weeks count, and streak-archive state. Encodes §3.8 (soft-break tiers at 1 / 2–3 / 4+ missed weeks) and §3.1.
  4. **Notification policy** — input: user state + clock; output: the set of eligible notifications and their category. Encodes §3.18 (forbidden loss-aversion category) and §3.21 (allowed taxonomy + caps). This module decides *what is eligible*; actual OS scheduling/delivery is a separate thin adapter.
  5. **Run-session controller** — an interval state machine driven by an **injectable clock**; emits walk/run transition events that the audio layer renders as cues. Encodes §3.9 (interval/just-run/just-walk modes, cue timing). GPS/map is a separate concern and is not a completion gate.
  6. **Repository interface** — a storage abstraction with an in-memory implementation for tests and a Supabase-backed implementation for production. Decouples all logic from the network/DB.

### Decoupling of the two progression tracks

- "Level" is split into two independent concepts (§3.20.1): **Calibration (ability)** drives difficulty and is readiness-driven only; **XP/Level** is the reward and is showing-up-driven only. The XP/Level engine and the Calibration engine share no inputs that would let XP affect difficulty.
- **Hard rule:** a level-up may change how the app *looks* or what it *calls* the user; it may never change what the app *lets the user do* (§3.20.2). v1 ships level-ups as status markers only (no unlocks).
- **UI rule:** XP/Level is the only progression *number* shown anywhere. Calibration is never surfaced as a number — only as the current prescription and announced step-ups, plus a narrative retrospective on the stats screen (§3.20.4).

### Session & completion model

- Sessions are **time-based**; time is the completion contract (§3.5). GPS is used for the live map and post-run distance celebration only, and is **not** a completion gate (§3.9) — completion must work without GPS.
- Distance is computed/displayed **only** post-run as celebration; it is never an input to XP or calibration.
- Run-type toggle (walk/run interval default, just run, just walk) is chosen before a session starts (§3.9); only interval mode emits cues.

### Onboarding & permissions

- Four-screen onboarding (welcome → bracket picker → weekly schedule → first-session card) targeting first run within ~60 seconds (§3.12).
- Account creation is deferred with informed consent at first Start; options "Create account" / "Just run" (§3.12).
- **Notification permission is requested on onboarding screen 4 (the first-session card)**, gated behind a **mandatory in-app pre-prompt** before the OS prompt fires (§3.21.2). Single friendly ask; per-category toggles deferred to settings.

### Tech stack (§3.19)

- **React Native + Expo (EAS Build)**; OTA updates via Expo.
- **Supabase** (hosted Postgres + auth) from day one; account optional but, when present, provides cloud sync and the durable home for lifetime weeks completed.
- **Auth:** Apple Sign-In + Google Sign-In only (no email/password) for v1.
- **Maps:** Google Maps via `react-native-maps`, styled to hide most POIs/labels.
- **Background GPS:** `expo-location`; **audio cues over other apps:** `expo-av`.
- Explicitly deferred to developer choice: state management, local storage library, push-notification service.

### Schema (conceptual, not final)

- Entities: user/profile (auth identity, weekly commitment, current calibration state), session record (timestamp, mode, prescribed duration, completed duration, distance, XP awarded), week record (target, completed sessions, complete flag), progression state (XP total, level), streak/lifetime state. Exact columns are a developer decision; the repository interface is the contract the logic depends on.

### Deferred numeric calibration

- The actual per-bracket minutes and walk/run ratios (§3.14) are **not** specified here; they are a calibration detail the owner supplies, and the Calibration engine is built to accept them as configuration and to self-correct via the brake. Prototyping can proceed with placeholder values.

> Approach aligns with the repo's `tdd` skill: behavior-through-interfaces, integration-style, mock only at boundaries, build in vertical slices.

- **A good test verifies observable behavior through a public interface**, reads like a specification, and survives internal refactors. Tests assert on the *outputs* of the six deep modules given controlled inputs — e.g. "completing all of a 3-session week awards the week bonus and increments lifetime weeks," "missing one week does not break the streak," "calibration never decreases after an off week," "no loss-aversion notification is ever eligible." A test that breaks when internals are renamed but behavior is unchanged is a bad test.
- **Verify through the interface, never through internal state or external means.** Assert a week is complete via the model's public query, not by inspecting a private counter; assert calibration changed via the *prescription output*, not via an internal level field; assert persistence via the repository's read API, not by querying Supabase tables directly.
- **Mock only at system boundaries** — never mock the engines against each other (they're code we own). The boundaries to fake/inject: the **repository** (in-memory implementation in tests; Supabase in prod), the **clock** (time), **OS notification delivery**, **GPS/location**, and **audio output**. Boundary interfaces should be SDK-style (one specific function per operation), not a single generic fetcher, so each mock returns one shape with no conditional logic.
- **Modules under test (priority order):** XP/Level engine, Calibration engine, Week/streak/lifetime model, Notification policy, Run-session controller. These hold the product rules and get the real suite.
- **Determinism via injection:** the Run-session controller and Notification policy take an injectable clock; all modules run against the in-memory repository, so tests need no device, network, GPS, or audio hardware.
- **Thin shells get thin coverage:** React Native screens and the Supabase adapter are kept minimal and covered lightly (smoke/rendering, plus a contract test that the Supabase repository satisfies the same interface as the in-memory fake), since the logic they wrap is already tested in isolation.
- **Build vertically, not horizontally.** Follow red→green→refactor one behavior at a time (tracer bullet first, then incremental). Do **not** write all tests up front then all implementation — that produces tests of imagined behavior coupled to data shapes.
- **Prior art:** none yet (greenfield). These deep-module tests establish the pattern; future features follow the same "rules in a tested deep module, UI/DB/clock as injected boundaries" approach.
- **Property-style checks worth considering** for the invariant-heavy modules: lifetime weeks is monotonically non-decreasing; calibration never auto-demotes; XP is never awarded for distance/pace.

## Out of Scope

- **Anything behind a paywall** — v1 ships free-only; no premium tier, no patron tier (§3.16). Premium is a v2 concern.
- **Social/community features** — friends, leaderboards, feeds, guilds, group challenges (§3.15, §4).
- **Optional external sharing** (export to Instagram/WhatsApp) — near-term candidate but not v1 (§3.15).
- **Distance-based prompts / structured programs** ("first 5K") — v2 opt-in mode (§3.5, §4).
- **Entertainment audio** (music/stories layered on the timer) — v2 (§3.9, §4).
- **Richer progression metaphors** (quest/RPG/garden/collection) — v2+ (§3.2, §4).
- **Cosmetic level unlocks** (themes, badges, titles) — locked as the v2 direction, not in v1 (§3.20.2).
- **Daily micro-engagement layer** (rest-day stretches, tips, mood check-ins) and **in-app guidance/tips content** — parked; tips are explicitly excluded from notifications in v1 (§3.21.1, §4).
- **Challenges / special missions** — v2 (§4).
- **Email/password auth** — fast-follow if requested, not v1 (§3.19).
- **Mid-run gamification, coach voice, mid-run encouragement** — rejected outright, not merely deferred (§3.9).
- **Final per-bracket numeric values** — owner-supplied calibration detail, not part of this PRD (§3.14).
- **Notification scheduling/timing, frequency caps, and exact copy** — partially open; to be finalized during prototyping (Open Question #2). The notification *taxonomy* and *opt-in placement* are in scope and decided.

## Further Notes

- **The three pillars are the tiebreakers**, in order: (1) Consistency, (2) Knowledge/gentle guidance, (3) Anti-elitism/psychological safety (§2). Any v1 mechanic that could induce shame, comparison, or competitive pressure is rejected by default.
- **"Predatory notification"** is the team term for the forbidden loss-aversion category and should be used in code/comments/discussion (§3.18, glossary).
- The **load-bearing metric** is lifetime weeks completed (Pillar 1); the current streak is intentionally secondary and soft-breaking.
- Several decisions deliberately resolve internal tensions and should not be "simplified" back into each other: XP vs calibration are decoupled on purpose (§3.20.1); the "I want extra" need (free-run XP) vs the "prescription too small" need (raise calibration) must stay separate (§3.7); auto-advance is the default while manual adjust/soft nudge are the override layer (§3.20.3).
- The full design rationale (including rejected alternatives) lives in `docs/DESIGN.md` and should be consulted before changing any of these behaviors.
