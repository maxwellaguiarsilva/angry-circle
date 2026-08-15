# Puff Effect — substack of destruction-physics.md

Depth 3. Child of `destruction-physics.md` (D4). Implements the generic puff visual + audio on destruction.

## Active Role

orchestrator

## Stack Depth

3

## Mandate

Implement the D4 puff effect per the D1 decision (generic expanding/fading ellipse burst + dedicated tone), data-driven in `data/boot.json`, fail-fast validated (R1.4).

## Target Artifact

Puff renderer + game-layer spawn in `destroyTarget` + audio wiring + tests + QA evidence.

## Background (D1 decision, `destruction-physics.md`)

Puff = a handful of small generic ellipses (mini puffs) drifting outward and fading over ~0.4s, rendered with `rgba(...)` fill strings computed by the game layer (renderer stays game-agnostic). Data-driven under a new `puff` block (count, radii, spread, duration, start/end alpha, fill) and a new `audio.puff` tone in `data/boot.json`. Generic colors only — zero characters (IP).

## Stack

1. (pending) **D4.1 — Puff data + validation.** Add the `puff` block (count, radii, spread, duration, start/end alpha, fill) and `audio.puff` tone to `data/boot.json`; fail-fast validation in `Game` (R1.4) + tests. Role: loop-worker. Artifact: `data/boot.json` + validation + tests.
2. (pending) **D4.2 — Implement the puff effect entity.** Render a generic expanding/fading ellipse burst at the destroyed body's position (~0.4s) with a game-agnostic renderer and a game-layer spawn in `destroyTarget`; tests (puff at position, despawns after duration). Role: loop-worker. Artifact: renderer + game code + tests.
3. (pending) **D4.3 — Trigger puff audio + visual QA.** Play the `puff` tone on destruction; verify console 0/0 and visual render ground truth. Role: loop-worker. Artifact: audio wiring + QA evidence.
