# Self-Destruction Blocker — substack of destruction-physics.md

Depth 3. Child of `destruction-physics.md` (D3.5). Fixes the real-level blocker: stacked targets destroy each other under gravity on load.

## Active Role

orchestrator

## Stack Depth

3

## Mandate

Resolve D3.5 (stacked-target self-destruction) end to end: decide the fix (D3.5.1), then implement and regression-test it (D3.5.2).

## Target Artifact

Written decision in this node (D3.5.1) + code and regression test in `src/game/game.js` (and `data/` if the decision requires) with `bun test` green (D3.5.2).

## Background (verified 2026-08-09, disaster recovery)

- `Game.applyImpactDamage` damages **both** bodies of every contact, target-target pairs included.
- `data/levels.json` level 1 spawns circles 36px apart (radius 18 → exactly touching) at y=560/524/488 plus wood/stone blocks. Under gravity the top circle falls onto the lower one; the contact's relative normal closing speed ≈ 326 px/s → both destroy each other → level clears → `state = "won"` → `markSettledProjectiles` stops → `settleFrames` freezes at 11, `spent` undefined.
- Verified with a real `Game` boot: 4 of 5 targets destroyed within 60 frames (score 100, no input). Level 2 has the same stacked-circle pattern (columns of five at x=560 and x=700).
- The same bug breaks the D3.4 settle test fixture (`tests/game.test.js:1118`), whose `LEVEL` stacks two touching circles.

## Stack

1. (done, 2026-08-09) **D3.5.1 — Decide the self-destruction fix.** Analysis-only: no code, no commit. Decision recorded under `Decisions` below: **minimum impact-damage threshold (`destruction.min-impact-damage`, default 400 px/s), data-driven in `data/boot.json` and gated in `Game.applyImpactDamage`**. Chosen over the other candidates after measuring real impact magnitudes (see Decision).
2. (in progress) **D3.5.2 — Implement the decided fix.** Decomposed into per-session steps D3.5.2-a…h. D3.5.2-a…d done and committed (verified 2026-08-09 disaster recovery: `data/boot.json:38-39`, `src/game/game.js` gate, `src/main.js` wiring). The D3.5.2 session overflowed during D3.5.2-e (test reconciliation) before verification; remaining work pushed into two depth-4 children:
   - `threshold-test-reconciliation.md` (T1–T11) — finish fixture reconciliation + write the regression tests + verify suite/compliance/build.
   - `threshold-recovery-close.md` (T12–T14) — refresh stale D3.1–D3.4 notes, close nodes, commit.

## Decisions

### D3.5.1 — Self-destruction fix (decided 2026-08-09, analysis-only)

**Decision: minimum impact-damage threshold, data-driven (`destruction.min-impact-damage`, default 400 px/s), gated in `Game.applyImpactDamage`.**

**Measured impact magnitudes (real physics config, real levels, via probe):**
- Settle contacts (stacked targets touching at spawn, no input): peak **326 px/s** — identical for stacks of 2, 3, 5, 8 (it is the first-frame closing speed after gravity; not layout-dependent). Real level 1 produced 1173 settle contacts over 400 frames, max 326; block-block settle contacts are 16–20 px/s.
- Real projectile impacts: **941 px/s** (full-power medium-arc hit), up to **1200 px/s** (full-power direct hit).
- Threshold 400 sits in a clean gap: 23% above the 326 settle ceiling, ~2.4× below real projectile hits.

**Why not the other candidates:**
- *Raise circle `hp`* — rejected: settle bounces **accumulate** during idle (measured 326+261+231+69+40+… over 400 frames, plus thousands of small bounces), so any fixed hp eventually dies; also dulls projectile hits and couples tuning to stack height.
- *Damage only from projectile-target pairs* — rejected: kills the D1 chain-reaction model (D1 #1/#2 — any strong contact damages, blocks destructible; a knocked block should break a structure). Threshold preserves chain damage: a knocked body moving fast (impact ≥ 400) still destroys.
- *Rework `data/levels.json` so targets never touch* — rejected: band-aid that misses the model bug; the D3.4 fixture deliberately stacks touching circles and would keep failing; any future touching layout re-triggers it.

**Effect on the D3.4 fixture** (`tests/game.test.js:1118`): its two touching circles settle at 326 < 400 → no damage → both survive → no auto-`won` → `markSettledProjectiles`/`settleFrames`/`spent` behave → the test goes green without touching the fixture. Same fix unblocks the real level-1/level-2 auto-destruct (settle 326 < 400).

**Notes for D5:** `min-impact-damage` is data-driven (R2.1) so balance can retune it if future level designs produce higher settle peaks; the 23% margin over the measured ceiling is the safety factor.
