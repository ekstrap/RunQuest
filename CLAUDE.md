# CLAUDE.md — RunQuest

This file orients Claude when resuming work in this repo. The full design lives in `docs/DESIGN.md` — that's the source of truth. This file is for fast catch-up and active context.

## Project summary

**RunQuest** (placeholder name) is a gamified running app for **newcomers to running** — positioned as "Duolingo for running." The target audience is people who *don't yet run* but want to start, **not** existing Strava users.

The gamification exists to make showing up next week feel rewarding, in a way that is **encouraging, never predatory**.

The project is currently in the **design phase** — no code yet, only design decisions captured in `docs/DESIGN.md`. Design progresses by structured grilling (one decision at a time, walking down the dependency tree, recommending an answer for each question).

## The three pillars (priority order)

1. **Consistency** — get users back week after week. Load-bearing outcome.
2. **Knowledge / gentle guidance** — newcomers need help; must feel like guidance, not a forced program.
3. **Anti-elitism / psychological safety** — explicit anti-Strava positioning.

Tiebreakers go top-to-bottom. Mechanics that induce shame, comparison, or competitive pressure are rejected by default.

## Key conventions and decisions (already locked)

Full detail in `docs/DESIGN.md`. Quick reference:

- **Week is the atom.** 2–3 sessions per week = complete. Streaks measured in weeks, not days.
- **XP / levels** is the v1 progression metaphor. Richer metaphors parked for v2+.
- **Flexible coach.** App suggests sessions; user picks when; off-plan runs never penalized.
- **Time-based prompts** (`"walk/run for 10 minutes"`); distance shown as post-run celebration.
- **Walk/run interval** is the default movement pattern.
- **XP: flat within a session, scaled by weekly commitment.** Going further in a single run earns nothing extra. But choosing 3 sessions/week earns a larger week-completion bonus than 2.
- **No XP ever for pace, distance, PRs, or comparative metrics.**
- **Lifetime weeks completed** is important but lives on the stats screen, not the home screen. Current streak = secondary, soft-breaks gracefully.
- **HARD RULE: no predatory notifications.** Predatory = loss-aversion ("your streak ends in 4 hours"). Encouragement OK; threats forbidden. Use the term "predatory notifications" in design discussion.
- **Positive notifications (§3.21, partially resolved).** Three categories in v1: *reminders* (invitations), *celebrations* (post-event), *re-engagement* (warm "we miss you", most constrained). Tips excluded (in-app only). Opt-in asked during onboarding on screen 4 with a **mandatory in-app pre-prompt** before the OS prompt; single ask, per-category toggles in settings. Still open: reminder scheduling/timing, frequency caps, exact wording.
- **Level calibration:** onboarding self-rated brackets (not a fitness test) + always-available manual adjust + soft system nudge.
- **In-run experience:** minimal audio cues for walk/run transitions, map + elapsed time on screen. No encouragement, no coach voice, no mid-run gamification. App disappears.
- **Run-type toggle:** walk/run interval (default), just run, or just walk. User picks before starting.
- **Post-run summary:** single screen — distance, time, XP, level-up (if applicable). No week progress on this screen.
- **Home screen:** next session + start button, week progress, level + XP bar. Action-oriented. Stats/profile screen holds lifetime weeks, streak, run history.
- **Onboarding:** 4 screens (welcome → bracket picker → weekly schedule → first session). Account creation deferred — user prompted honestly when pressing Start, can choose "Create account" or "Just run."
- **Weekly schedule:** user picks 2 or 3 sessions. Changeable between weeks only.
- **Brackets map to both** session duration and walk/run ratio. Exact numbers TBD.
- **Solo for v1.** No social features. Community/guilds parked (not rejected).
- **Freemium.** Core loop free forever. No ads ever. **v1 ships free-only — no paywall, no patron tier (§3.16).** Premium is a v2 concern, designed when the additive content it gates (audio, programs, cosmetics) exists; it must never make free feel incomplete.
- **Cross-platform.** iOS + Android from day one.
- **Tech stack:** React Native + Expo (with EAS Build). Supabase as backend (soft-locked). Apple + Google sign-in only for v1 (no email/password). Google Maps for the in-run map. See §3.19 in DESIGN.md.
- **App architecture (the three choices §3.19 left to the developer): RESOLVED (ADR-0001).** Navigation = **Expo Router** (file-based, `app/`); state = **Zustand** (adopted as feature state lands; the repository is injected via React Context for now); tests = **Jest (`jest-expo`) + React Native Testing Library**, TDD per the `tdd` skill. The **`Repository` interface** (`src/data/repository.ts`, in-memory + future Supabase impls) is the storage boundary all logic depends on. Run the full gate with `npm run check` (typecheck + lint + jest). See `docs/adr/0001-app-architecture.md`.
- **Level progression mechanics: RESOLVED (§3.20).** Full model locked; only numerical tuning (exact step sizes / XP amounts) deferred to prototyping. Key points:
  - **Decoupled into two tracks.** *Calibration* (difficulty — readiness-driven: bracket, manual adjust, soft nudge; never XP) vs. *XP/level* (the reward — showing-up-driven; never changes the prescription). This dissolved the old "gating vs. hollow" tension.
  - **Level-up gives:** v1 status marker only; v2 cosmetics. HARD RULE — leveling up may change how the app looks or what it calls you, never what it lets you do. Functional unlocks rejected.
  - **Calibration advances** via conservative auto-advance (announced, with a brake), completion-driven signal, per-completed-week cadence, never auto-demotes.
  - **Calibration is invisible** (no fitness number — anti-elitism); XP/level is the only number in the UI. Ability shown only as prescription-history narrative on stats.
  - **XP curve:** front-loaded then linear, no cap, ~one level per completed week. Accelerating/RPG curves rejected.

## Working style

- **Design via grilling.** One question at a time, recommend an answer, user accepts/refines.
- **Ask questions inline in plain text.** Do NOT use the `AskUserQuestion` tool — the user explicitly disallowed it for this project.
- **No scope creep.** v1 is one primary loop: run → XP → level up. Anything else either reinforces that loop or gets parked.
- **Only update `docs/DESIGN.md` and this file when the user explicitly asks.** Don't auto-update after answering a question — just move on to the next one. Move parked ideas into the "Parked" section, don't delete them.
- **Non-developer audience — explain technical terms on first use.** The user is technical but not a developer. Abbreviations and jargon are fine, but spell them out the first time they appear in a conversation and briefly say what they mean. E.g., "OTA (over-the-air) updates — pushing app changes without going through the app store." After the first explanation, the term can be used freely. Don't strip terminology out — just don't assume it's already understood.

All design status, open questions, and deferred topics live in `docs/DESIGN.md`. This file is for project context only.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues on `ekstrap/RunQuest` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`); not yet created in GitHub — made on first use. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context; domain vocabulary lives in `docs/DESIGN.md` (glossary in §6), no ADRs yet. See `docs/agents/domain.md`.
