# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

**Layout: single-context.**

## Before exploring, read these

- **`docs/DESIGN.md`** — the design source of truth and domain reference for this project. (This repo has no separate `CONTEXT.md`; `docs/DESIGN.md` plays that role.) The **glossary in §6** defines the canonical domain vocabulary.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. This folder does not exist yet; create it lazily when the first architectural decision is recorded.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

## File structure

Single-context repo:

```
/
├── CLAUDE.md
├── docs/
│   ├── DESIGN.md          ← design source of truth + domain glossary (§6)
│   ├── PRD-v1.md
│   ├── adr/               ← (create lazily; none yet)
│   └── agents/            ← this config
└── (app source — not yet created)
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `docs/DESIGN.md` §6 — e.g. *calibration*, *XP / level*, *prescribed session*, *free run*, *lifetime weeks completed*, *secondary streak*, *predatory notification*, *weekly commitment*. Don't drift to synonyms the glossary avoids (e.g. don't call calibration a "fitness level" in user-facing terms).

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-000X (…) — but worth reopening because…_

Note: `docs/DESIGN.md` itself records many resolved decisions with rationale (and rejected alternatives). Treat it as authoritative for product decisions until a superseding ADR exists.
