# Delta Analysis — Request vs. Implementation

Status: **DONE** (resolved into backlog on 2026-08-09).

Depth 2. Child of `request.md`. First-class investigation (loop.md §21): map the requested product against the existing codebase, close no gaps here, and resolve into concrete backlog tasks.

## Active Role

loop-explore (read-only)

## Stack Depth

2

## Mandate

For every requirement and acceptance criterion in `request.md`, locate the implementing code (`file:line`), judge whether it fully satisfies the requirement, and record each gap as a concrete backlog task. No code edits, no commits.

## Target Artifact

A resolved backlog: tasks written back into `request.md`'s stack (or new substacks), each actionable for a loop-worker session.

## Scope (analysis checklist)

1. **Sling launch** — drag + release with aim/power; check `src/game/slingshot.js`, `src/engine/input.js`.
2. **Physics** — gravity, collision, momentum transfer, restitution between circles; check `src/engine/physics.js`.
3. **Structures** — stacks of circles, support/collapse; check `data/levels.json`, `src/game/levels.js`.
4. **Objectives** — knock all targets, limited launches; check `src/game/game.js`.
5. **Scoring** — points for hits/knockdowns/remaining launches; check `src/game/game.js`.
6. **Multiple levels** — increasing difficulty; check `data/levels.json` (2 levels exist — is that "multiple" per AC?).
7. **Rendering** — HTML5 Canvas 2D, programmatic geometry, no sprites; check `src/engine/renderer.js`.
8. **Layering / no game literals in engine** — R1.2, R2.1; grep `src/engine/` for domain literals.
9. **DI / no globals / fail fast** — R1.3, R1.4; spot-check `src/main.js`, `src/data/loader.js`.
10. **Identity data-driven** — colors/radii/sizes in `data/identity.json`; check `src/game/identity.js`.
11. **IP hygiene** — no animal/character/brand strings anywhere (grep code, data, assets).
12. **Acceptance criteria 1–4** — each must be demonstrably true; note where only partially met.

## Mapping (requirement → evidence)

1. **Sling launch** — `src/game/slingshot.js:40-64` velocity from drag; `src/engine/input.js:71-108` pointer drag vector; wired `src/game/game.js:104-128`. ✓
2. **Physics** — `src/engine/physics.js:138-156` fixed-timestep integration, `:216-241` overlap (circle/rect all pairs), `:243-332` solvers, `:334-353` impulse+restitution, `:158-192` ground/bounds. ✓
3. **Structures** — materials `data/identity.json:5-6` (wood/stone rects); layouts `data/levels.json`; validation `src/game/levels.js:62-96`. ✓
4. **Objectives** — knock all targets: `src/game/game.js:435-448` win/lose; limited launches `:341-343`, `:182`. ✓
5. **Scoring** — hit `game.js:378`, knockdown `game.js:431`, launch-bonus `game.js:436`; sources `data/boot.json:38-42`. ✓
6. **Multiple levels** — `data/levels.json` 2 levels, difficulty rises (3→5 circles, 2→3 blocks, 3→5 launches). AC needs ≥1. ✓
7. **Rendering** — `src/engine/renderer.js` Canvas 2D programmatic primitives (circle/ellipse/rect/line/text). ✓
8. **Layering / no literals** — `src/engine/*` import nothing, zero game literals (grep clean). ✓ R1.2/R2.1.
9. **DI / no globals / fail fast** — `src/main.js` composition root; no module-level mutable state; `src/data/loader.js:26-35` throws descriptively; constructors validate. ✓ R1.3/R1.4.
10. **Identity data-driven** — `data/identity.json` via `src/game/identity.js`. ✓
11. **IP hygiene** — grep for bird/pig/animal/brand terms clean; only "slingshot" (own mechanic) + "Angry Circle" (title); `assets/favicon.svg` is a plain circle. ✓ AC3.
12. **ACs** — AC1 statically supported (index.html→main.js; visual proof pending QA gate). AC2 next-level `game.js:435-443`. AC3 clean. AC4 satisfied. ✓

## Resolved backlog (concrete, one per worker session)

- **B1 — README stale doc link.** `README.md:3` references nonexistent `docs/agent/requirements.md`; repoint to `docs/agent/stack-tree/request.md`. (R5.1/R4.2)
- **B2 — Dead fields.** `src/game/game.js`: `this.press` (`:110`,`:119`) and `this.release` (`:118`) written but never read; remove. (R4.2)
- **B3 — Canonical material list.** `src/main.js:58-60` derives `materials` by duck-typing `w`/`h`; add explicit list to `data/identity.json` and consume it. (R1.1/R2.2 hardening)
- **B4 — Spawn at pouch.** Projectile spawns at launcher pos (`game.js:344-362`) while pouch renders at drag pos (`:520-521`) → visual teleport on release; spawn at release point.
- **B5 — QA gate / clearability.** Targets only leave play via off-screen (`game.js:382-384`); prove level 1 is winnable in 3 launches via the full QA strategy (MCP visual + console + playthrough). Feeds `request.md` item 4.
