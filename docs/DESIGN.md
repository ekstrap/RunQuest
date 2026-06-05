# RunQuest — Design Document

> Working name: **RunQuest** (placeholder, not committed).
> Status: design phase, in progress.
> Last updated: 2026-06-01.

---

## 1. Vision

A gamified running app for **newcomers to running** — the "Duolingo for running."

Target audience: people who *don't yet run* but want to start. **Not** existing Strava users. The reference point is a first-time Duolingo user picking up a language for the first time — curious, unsure, easily intimidated.

The gamification exists to **make showing up next week feel rewarding**, not to extract engagement through anxiety. Non-predatory by construction.

---

## 2. The Three Pillars

These guide every design decision. In tiebreakers, priority is roughly top-to-bottom.

1. **Consistency** — get users back week after week. This is the load-bearing outcome the gamification serves.
2. **Knowledge / gentle guidance** — most users are new to running and need help with structure, pacing, and form. Must feel like *guidance*, never a forced program or wall to clear.
3. **Anti-elitism / psychological safety** — explicit positioning against Strava's competitive vibe. Built for people who want to run but are intimidated by running culture.

Any mechanic that could induce shame, comparison, or competitive pressure is **rejected by default**.

---

## 3. Resolved Design Decisions

### 3.1 Cadence — the week is the atom

- A "complete" week = 2–3 prescribed sessions.
- Streaks are measured in **weeks**, not days.
- Picked over a daily/Duolingo-literal model because daily running is bad physiology for beginners *and* the weekly cadence defuses the streak-anxiety failure mode.

### 3.2 Progression metaphor — XP / levels (v1)

- v1 uses **XP and levels** — the simplest, most generic primitive.
- Generic primitives become non-generic through *what they reward* and *how they fail gracefully* — that's where the design fight lives.
- Richer metaphors (quest/journey, RPG character, garden/pet, collection) are explicitly parked for v2/v3.

### 3.3 Coach model — flexible coach

- App suggests 2–3 sessions per week, calibrated to the user's current level.
- User picks when to do each.
- Free / off-plan runs are **never penalized** — they just don't earn the week-completion bonus.
- The "you can ignore the suggestion without punishment" mechanic *is* the anti-elitism statement in mechanical form.

### 3.4 Session prompt format

- Each session is a **single, friendly prompt** — e.g., `"walk/run for 10 minutes"` — calibrated to current level.
- **Walk/run interval** is the default movement pattern. Best beginner physiology, AND mathematically guarantees no one fails.
- No run-type taxonomy. No "easy / interval / long." No jargon.
- Level progression smoothly nudges duration upward over time.

### 3.5 Time-based prompts, distance as celebration

- Session contracts are stated in **time** (`"walk/run for 10 minutes"`).
- **Distance is displayed *after* the run as a celebration** (`"nice — you covered 1.4km!"`).
- Reasons: no GPS dependency for the completion gate, no pace-shaming, predictable time commitment, anti-elitism by construction.
- Distance-based prompts may return later as an opt-in mode ("try my first 5K") but are **not in v1**.

### 3.6 XP rules

**What earns XP:**
- Completing a prescribed session → base XP.
- Completing the full week's 2–3 sessions → **week-completion bonus** (the largest single XP lever in the system).
- Off-plan / free runs → small flat XP, never penalized.

**How XP scales:**
- **Flat within a session.** A `walk/run for 10 minutes` earns the same XP whether you stopped at 10 or went 25. Going further is welcome, but earns zero mechanical reward — only intrinsic satisfaction and the post-run distance celebration.
- **Scaled by weekly commitment.** A 3-session week earns a larger week-completion bonus than a 2-session week. The user chose their target during onboarding; committing to more sessions = more reward. This is about *frequency of showing up*, not *performance within a session*.

**What does NOT earn XP — ever:**
- Pace.
- Distance.
- Personal records.
- Any comparative metric.

**Design principle:** flat within a session to avoid pushing users toward injury or "performing." Scaled by weekly commitment to reward the choice to show up more often. The line is: *frequency of showing up* can scale XP, *intensity or output within a session* cannot.

### 3.7 Level calibration

Because flat-XP-per-session only works when the level matches the user's actual ability, three mechanisms keep the level honest:

1. **Onboarding calibration** — self-rated activity brackets (*never run before* / *run occasionally* / *getting back into it*). **Not a fitness test** — too elitist and intimidating.
2. **Manual level adjustment, always available** — prominent "too easy / too hard, adjust" control. Users are trusted to know their own bodies.
3. **Soft system nudge** — after consistent easy completions or "too easy" ratings, the app suggests a level bump. Never auto-applies.

**Crucial distinction (don't conflate):**
- "I want to do extra after my prescribed run" → solved by the small free-run XP.
- "The prescription is too small for me" → solved by raising the level.
- Merging these would re-introduce effort-scaling XP through the back door.

### 3.8 Failure / missed-week model

Two parallel counters, hierarchy intentional:

- **Lifetime weeks completed.** Monotonically increasing. Important differentiator from other apps, tells the real long-term story. Lives on the stats/profile screen — not the home screen.
- **Current streak — SECONDARY.** Consecutive completed weeks. Soft-breaks per these rules:
  - Miss 1 week → nothing breaks; streak just doesn't advance.
  - Miss 2–3 weeks → gentle "we miss you" framing; streak preserved.
  - Miss 4+ weeks → streak gracefully archives, framed as *"look how far you got, ready to start fresh?"* — never as failure.

The user originally didn't even imagine streaks; this is a compromise that keeps the streak's motivational pull while making lifetime-count the emotional anchor.

### 3.9 In-run experience — minimal, stay out of the way

The app's job during a run is to **provide structure and then disappear**.

**Audio cues (walk/run interval mode only):**
- "Start running for X minutes" / "Start walking for X minutes" at each transition.
- No encouragement lines, no coach voice, no mid-run commentary.
- Replaces a manual phone timer — this is a feature the user currently does by hand.

**Screen UI:**
- Map with live location.
- Elapsed time.
- That's it. No XP, no level progress, no achievements mid-run.

**Run-type toggle:**
- User picks session type before starting: walk/run interval, just run, or just walk.
- In "just run" or "just walk" mode, no interval cues play — the app is pure timer + map.
- Walk/run interval is the *default* for prescribed sessions; the other modes exist so the app doesn't force intervals on someone who doesn't want them.

**What's explicitly excluded from in-run:**
- Entertainment audio / music integration (parked for v2+).
- Mid-run gamification overlay (XP ticking, achievements) — rejected, not parked.
- Coach voice and mid-run encouragement cues — rejected, not parked. Don't fit the product.
- All post-run celebration (XP, distance, level-up) lives in the **post-run summary**, not during the run.

GPS is used for the live map but is **not** a completion gate (consistent with §3.5).

### 3.10 Post-run summary

Single screen shown when the run ends. Four elements:

1. **Distance** — celebratory framing ("You covered 1.6 km!"). The only place distance appears.
2. **Time completed** — factual, not judgmental.
3. **XP earned** — base session XP (and week-completion bonus if applicable).
4. **Level-up** (conditional) — only shown if the XP crosses a level threshold.

**Not on the post-run screen (v1):** week progress, lifetime weeks, streak updates. These update elsewhere in the app (home screen / stats).

Design intent: keep the post-run moment tight — you finished, here's what you did, here's your reward. No tap-through fatigue.

### 3.11 Home screen

The home screen is an **action screen** — "here's what to do and how close you are."

Three elements:
1. **Next suggested session** — e.g., "Walk/run for 12 minutes" with a prominent Start button. Primary call to action, dominates the screen.
2. **Week progress** — "1 of 3 sessions this week." Answers "am I on track?"
3. **Current level + XP progress bar** — gamification payoff, visible but not dominant.

A separate **stats/profile screen** holds:
- Lifetime weeks completed (important, but not home-screen material).
- Current streak.
- Run history.

The home screen is for action; the stats screen is for reflection.

### 3.12 Onboarding flow

Four screens, designed to get the user running within 60 seconds:

1. **Welcome screen** — one-sentence positioning. Not a feature tour.
2. **Activity bracket picker** — "Which sounds most like you?" with three brackets (§3.7). One tap.
3. **Weekly schedule preference** — "How many sessions per week feel realistic?" (2 or 3). Sets the week-completion target and XP scaling.
4. **First session card** — "Here's your first session: Walk/run for 10 minutes. Ready when you are." Big Start button.

**Account creation — deferred with informed consent:**
- When the user presses Start for the first time without an account, a prompt explains: "This is your first run! Without an account your run won't be saved. You can create one now, or just go run."
- Two options: "Create account" / "Just run."
- No forced sign-up gate. No guilt. The user decides whether to prolong onboarding.

**Explicitly excluded from onboarding:**
- Feature tours / XP explanations — let users discover through the post-run summary.
- Goal setting ("what's your goal?") — our goal is consistency, not user-defined targets.
- Name/avatar customization — park for later, don't gate the first run on it.

### 3.13 Weekly schedule preference

- User picks 2 or 3 sessions per week during onboarding.
- This sets the **week-completion target** and the **XP bonus scale** (§3.6).
- 3-session weeks earn a larger week-completion bonus than 2-session weeks.
- **Changeable between weeks only.** Cannot adjust mid-week (prevents lowering the target after already hitting 2 sessions). Takes effect next week.
- User is trusted to change it for genuine life reasons — no cooldown, no artificial friction.

### 3.14 Onboarding bracket mapping

The three activity brackets (§3.7) control **both** starting session duration **and** walk/run ratio:

| Bracket | Session duration | Walk/run ratio |
|---|---|---|
| Never run before | shorter | more walking |
| Run occasionally | medium | balanced |
| Getting back into it | longer | more running |

Exact numbers require sports science input — the *shape* is locked (both dimensions scale together). This is a starting point, not permanent — manual level adjust (§3.7) corrects immediately if it feels wrong.

### 3.15 Solo app (v1)

- v1 is **pure solo**. No friends, no leaderboards, no social feed, no sharing.
- The app is a private relationship between the user and their running habit.
- **Optional sharing** (export run summary to Instagram/WhatsApp) is a low-cost near-term addition if users request it. No social infrastructure needed — just an export.

### 3.16 Monetization — freemium

- **Core loop is completely free forever:** prescribed sessions, XP, levels, week tracking, post-run summary.
- **No ads, ever.** Ads violate the product's tone and the "app disappears" philosophy.
- **Premium tier** (pricing/contents TBD) unlocks things that *enhance* but don't gate the experience.
- Key constraint: **nothing that makes the free user feel punished or incomplete.** The free experience is the real product. Premium is "I love this and want more."

### 3.17 Platforms — cross-platform

- Ship on **both iOS and Android** from day one.
- **Cross-platform framework** (specific framework TBD) — one codebase, both platforms.
- The UI is simple enough (home screen, running screen, post-run summary, stats) that native-specific interactions aren't needed.
- The app's differentiator is the design philosophy, not platform-specific polish.

### 3.18 Predatory notifications — HARD RULE

The app must **never** send a notification whose purpose is loss aversion.

- ✗ "Your streak ends in 4 hours."
- ✗ "You'll lose your progress."
- ✗ Any countdown-to-shame messaging.
- ✓ Encouragement notifications are fine: "a 10-minute session today would feel great."

**Team term: "predatory notifications" = the forbidden category.** Use this phrase in design discussions.

### 3.19 Tech stack

**Framework: React Native with Expo (using EAS Build).** Single codebase for iPhone and Android. Chosen over Flutter and Kotlin Multiplatform for the larger ecosystem, broader hiring pool, and Expo's significant developer-experience wins for a small team. Expo's managed workflow handles iOS/Android build setup, signing, and over-the-air updates; its first-party libraries cover what we need (background GPS via `expo-location`, audio cues over other apps via `expo-av`). Custom native code remains possible via dev clients if ever needed.

**Backend: Supabase, from day one (soft-locked).** Backend-as-a-service over a hosted PostgreSQL database, with built-in authentication and a generous free tier. Account creation is optional (§3.12), but users who sign up get cloud sync and a durable home for lifetime weeks completed (§3.8) — the load-bearing Pillar 1 metric. Open-source means a clearer exit path than Firebase. Soft-locked = decision can be revisited if a real constraint surfaces; no specific concern is outstanding.

**Authentication: Apple Sign-In + Google Sign-In only for v1.** No email/password. Rationale: one-tap creation matches the low-friction onboarding tone, and avoids the password-reset support load that dominates consumer-app help queues. Email/password is a fast-follow if real users request it; Supabase's data model is agnostic to sign-in method, so adding it later is non-disruptive.

**Maps: Google Maps via `react-native-maps`.** Familiar to users, identical look on iPhone and Android, generous free tier. The map will be configured to hide most points of interest and labels, keeping the in-run view calm in line with §3.9 ("the app disappears"). Mapbox was considered for its stronger custom-styling story but rejected for v1 on cost and setup grounds.

**Explicitly not decided at design level:** state management library, local data storage library, push notification service, and other implementation libraries. These are developer choices that don't affect product design.

---

## 4. Parked Ideas (v2+ / not in v1)

- **Daily micro-engagement layer** — tiny daily actions (stretch, breathing, form-tip video, mood check-in) on rest days. Solves "what do I do between runs?" but risks scope creep and wellness-app drift.
- **Richer progression metaphors** — quest/journey/map narrative, RPG character growth, garden/pet, collection (postcards/relics from routes). User liked these but wants XP-only for v1.
- **Challenges** — weekly special missions ("run in the morning", "explore a new route"). Good for re-engaging stagnant users; park until core loop is validated. *"Main goals" are subsumed by the level progression itself — no separate goal system.*
- **Distance-based prompts** as an opt-in mode (e.g., "first 5K") once user is confident.
- **Entertainment audio** — app-provided music/stories/scenarios layered on the timer (à la Zombies, Run!). Massive content lift.
- **Community / group features** — micro leaderboards, guilds, running clubs, group challenges. Not rejected — the user sees potential here — but needs very careful design to avoid elitism. Leaderboards based on consistency (weeks completed) rather than pace/distance could work. Needs its own deep design pass.
- **Optional sharing** — export run summary or milestones to external platforms (Instagram, WhatsApp). Low-cost, no social infrastructure. Near-term addition if users request it.
- **Level progression mechanics** — what leveling up actually *changes* beyond a number going up. Tension: gating session duration/ratios behind levels excludes users who want the app as a normal running tool (via free run). But levels with no mechanical effect feel hollow. Needs deeper thought — deliberately parked, not rushed.

---

## 5. Open Questions

### Status (2026-06-01)

The working core of v1 design is locked across §3.1–§3.19. The four topics below are still **v1 work** — deferred to dedicated future sessions, distinct from the §4 v2+ park list.

When resuming, pick one of the four to tackle. Recommended order: **#1 first** (level progression is the load-bearing gamification hole; paywall contents partly depends on what features exist to gate).

### Deferred v1 topics

1. **Level progression mechanics.** What leveling up actually *changes*. Right now levels increment but we haven't decided what changes per level — gating session duration/ratios excludes users who want the app as a normal running tool, but levels with no mechanical effect feel hollow. Needs a deep design pass. Also flagged in §4 as the parked item awaiting design work.

2. **Positive notification strategy.** The encouraging side of notifications — the §3.18 hard rule (no predatory notifications) is locked, but the constructive model is unresolved. An earlier session reached tentative answers (opt-in after first run, scheduled reminders + celebrations only, day-picker at opt-in time) but the user wanted to re-think it from scratch. All those tentative answers are unlocked.

3. **Paywall contents.** Freemium model is locked (§3.16). What specifically goes behind premium is undefined. Constraint: nothing that makes the free user feel punished or incomplete.

4. **Bracket numerical values** (§3.14). The *shape* (longer/shorter session, more/less running per bracket) is locked. The actual minutes and walk/run ratios need sports science input, not pure design grilling — different kind of work.

---

## 6. Glossary

- **Predatory notification** — a push notification whose purpose is loss aversion. Forbidden.
- **Lifetime weeks completed** — monotonically increasing counter. Important differentiator, lives on stats screen.
- **Secondary streak** — *current consecutive weeks*. Smaller, soft-breaks gracefully.
- **Free run / off-plan run** — a run done outside the week's 2–3 prescribed sessions. Earns small XP, never penalized.
- **Prescribed session** — one of the week's recommended runs. Earns base XP; completing all of them earns the week bonus.
- **Run-type toggle** — user picks walk/run interval, just run, or just walk before starting. Interval is the default for prescribed sessions.
- **Weekly commitment** — user's chosen 2 or 3 sessions/week. Controls the week-completion target and XP bonus scale. Changeable between weeks only.
