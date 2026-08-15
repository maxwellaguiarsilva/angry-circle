# Request — Angry Circle

Depth 1. Root of the user request ingested from `prompt.md`.

## Active Role

orchestrator

## Stack Depth

1

## Mandate

Hold the enhanced request and decompose it. All implementation work happens in child substacks; this node never edits code itself.

## Target Artifact

The decomposed stack below; child substacks produce the actual code/docs.

## Enhanced request

**Goal:** a physics-based projectile game recreating the core slingshot mechanics of classic "birds vs. pigs" games, using **only colored circles** — no animals, no characters, no brand/IP anywhere.

**Entities:** generic circles differentiated solely by color, size, and role (launcher vs. target). Stack-supporting blocks are simple geometric rectangles.

**Identity constraint (IP):** zero animal/character/brand references in code, data, strings, or assets.

**Data-driven:** all visual identity (colors, radii, sizes), physics tunables, and level layouts live in JSON under `data/`; engine code contains zero game literals.

**Architecture:** layered — a game-agnostic engine (`src/engine/`: loop, render, physics, input, audio) + a game layer (`src/game/`) that only knows circles/slingshot mechanics; explicit DI at the composition root, no global mutable state; fail fast on missing data (descriptive throws, no silent fallback).

## Acceptance criteria (from the request)

1. Launchable in the browser: slingshot + projectile circle + ≥1 level whose target circles fall under physics.
2. Level clears when all target circles are knocked out; next level loads.
3. No animal names or references anywhere in the project.
4. All tunables and identity in `data/`; engine code contains no game literals.

## Stack

1. (done, intake) Enhance and internalize the request; create the tree. [this node]
2. (done, 2026-08-09) Delta-analysis substack completed; resolved into B1–B5 below. See `delta-analysis.md`.
3. (done, 2026-08-09) B1 — fixed README stale link; now points to `docs/agent/stack-tree/request.md`.
4. (done, 2026-08-09) B2 — removed dead `press`/`release` fields in `src/game/game.js`; adapted tap test. 250 tests green.
5. (done, 2026-08-09) B3 — canonical `materials` list in `data/identity.json`; dropped duck-typing in `src/main.js` and `tests/game.test.js`; added regression test in `tests/identity.test.js`. 251 tests green.
6. (done, 2026-08-09) B4 — spawn projectile at the release/pouch position (`src/game/game.js`); adapted tests; added validation for the release position. 252 tests green.
7. (done, 2026-08-09) B5 — QA gate run (checks 1–3, 5 pass; check 4 exposed a winnability defect, registered as B6). Evidence: `bun test` 252 green; MCP visual inspection OK (slingshot/clouds/block-rectangles/HUD score, `describe_image` verdicts qa-01); console 0 errors/0 warnings; compliance audit passed (IP scan clean, `src/engine/` has no game literals, loader has no `??`/`||` fallbacks); playthrough confirmed launch/hit/knockdown/score/lose-state but the win path is blocked by B6.
8. (done, 2026-08-09) B6 — Level 1 winnability: dropped the `left-x: 0`/`right-x: 800` side walls from the `Physics` config in `src/main.js` (kept `ground-y`); `data/boot.json` untouched (R2.1). Added `tests/main.test.js` — regression tests asserting the composition root injects `ground-y` but no `left-x`/`right-x` side walls. 254 tests green. Browser boot check: scene renders (slingshot/clouds/blocks/HUD), console 0 errors/0 warnings, `bun build src/main.js --target browser` OK. Committed.
9. (done, 2026-08-09) B7 — QA check 4 playthrough proved the full win path end-to-end in the browser: level 1 (3 circles + wood + stone) cleared in 2 of 3 launches → level 2 auto-loaded; level 2 (8 circles + 3 blocks) cleared in 2 of 5 launches → win overlay ("You cleared the level!" / "Tap to play again") rendered; tap restarted to level 1. Wood block (mass 18 vs projectile 4.84) knocked off within the launch budget, so the optional `data/boot.json` tuning was not needed (no code/data changes). Evidence: screenshots + pixel-count ground truth + `describe_image` verdicts; 254 tests green; console 0 errors/0 warnings; compliance audit clean (engine game-agnostic, loader fail-fast, IP scan clean). Committed.
10. (done, 2026-08-09) B8 — DRY violation (R1.1): `src/engine/physics.js` duplicates the circle-vs-rect closest-point computation in `overlapping()` (`:230-235`) and `solveCircleRect()` (`:302-307`). Extracted shared helper `closestPointDeltaOnRect(circle, rect)` and used it in both paths; the `dist === 0` branch now reads `halfWidth`/`halfHeight` directly. Added 3 regression tests for the helper (edge clamp, inside-rect zero delta, corner clamp). 257 tests green (254 + 3), `bun build src/main.js --target browser` OK. Found by fresh delta analysis (disaster-recovered session, 2026-08-09).
11. (done, 2026-08-09) B9 — Slingshot drag anchoring. **Decision & implementation:** grab starts only within `max-drag` of the launcher; pouch clamps to `max-drag` radius; launch vector derives from launcher→clamped-pouch so direction/power always match the rendered pouch. `Slingshot.isGrab`/`clampPouch` (domain, fail-fast); `Game` coordinates (grab gate on `down`, clamped drag on `move`, anchored launch on `up`); `PointerInput` engine untouched (R1.2). **QA completed:** 268 tests green, `bun build` OK, compliance audit passed. Browser playthrough of the drag-clamp case verified live: far press → no grab/teleport/launch (pixel + visual checks); drag beyond `max-drag` → pouch clamps to the 150px radius; anchored release → projectile spawns at the clamped pouch and flies opposite the launcher vector (pixel centroid tracked in flight). Committed as `6ee8545` (4 files: slingshot.js, game.js, slingshot.test.js, game.test.js). QA screenshot `b9-render-rest.png` left untracked. **All backlog items B1–B9 done; request stack closed.**
