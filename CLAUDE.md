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
- **Level calibration:** onboarding self-rated brackets (not a fitness test) + always-available manual adjust + soft system nudge.
- **In-run experience:** minimal audio cues for walk/run transitions, map + elapsed time on screen. No encouragement, no coach voice, no mid-run gamification. App disappears.
- **Run-type toggle:** walk/run interval (default), just run, or just walk. User picks before starting.
- **Post-run summary:** single screen — distance, time, XP, level-up (if applicable). No week progress on this screen.
- **Home screen:** next session + start button, week progress, level + XP bar. Action-oriented. Stats/profile screen holds lifetime weeks, streak, run history.
- **Onboarding:** 4 screens (welcome → bracket picker → weekly schedule → first session). Account creation deferred — user prompted honestly when pressing Start, can choose "Create account" or "Just run."
- **Weekly schedule:** user picks 2 or 3 sessions. Changeable between weeks only.
- **Brackets map to both** session duration and walk/run ratio. Exact numbers TBD.
- **Solo for v1.** No social features. Community/guilds parked (not rejected).
- **Freemium.** Core loop free forever. No ads ever. Premium contents TBD.
- **Cross-platform.** iOS + Android from day one.
- **Tech stack:** React Native + Expo (with EAS Build). Supabase as backend (soft-locked). Apple + Google sign-in only for v1 (no email/password). Google Maps for the in-run map. See §3.19 in DESIGN.md.
- **Level progression mechanics: PARKED.** What leveling up changes is unresolved — tension between gating functionality and keeping the app usable as a normal running tool.

## Working style

- **Design via grilling.** One question at a time, recommend an answer, user accepts/refines.
- **Ask questions inline in plain text.** Do NOT use the `AskUserQuestion` tool — the user explicitly disallowed it for this project.
- **No scope creep.** v1 is one primary loop: run → XP → level up. Anything else either reinforces that loop or gets parked.
- **Only update `docs/DESIGN.md` and this file when the user explicitly asks.** Don't auto-update after answering a question — just move on to the next one. Move parked ideas into the "Parked" section, don't delete them.
- **Non-developer audience — explain technical terms on first use.** The user is technical but not a developer. Abbreviations and jargon are fine, but spell them out the first time they appear in a conversation and briefly say what they mean. E.g., "OTA (over-the-air) updates — pushing app changes without going through the app store." After the first explanation, the term can be used freely. Don't strip terminology out — just don't assume it's already understood.

All design status, open questions, and deferred topics live in `docs/DESIGN.md`. This file is for project context only.
