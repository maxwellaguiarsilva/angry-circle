# Threshold Test Reconciliation — substack of self-destruction-blocker.md

Depth 4. Child of `self-destruction-blocker.md` (D3.5.2 remainder). Completes D3.5.2's test reconciliation and writes the min-impact-damage regression tests.

## Active Role

orchestrator

## Stack Depth

4

## Mandate

Complete D3.5.2's test reconciliation and write the regression tests for the `destruction.min-impact-damage` threshold, one task per session.

## Target Artifact

Green `tests/game.test.js` + the new threshold regression tests.

## Background (registered 2026-08-09, disaster recovery)

- On disk and committed (do NOT redo): `data/boot.json:38-39` `destruction.min-impact-damage=400`; `src/game/game.js` `destruction` dependency + `validateDestruction` + gate in `applyImpactDamage`; `src/main.js` wiring. The recovery transcript confirms the last session already applied bulk fixture edits (`DESTRUCTION` constant, `makeGame` wiring, most `base` fixtures).
- Suite state at last check: `bun test tests/game.test.js` → 97 pass / 6 fail. The 6 failures are all threshold/fixture casualties of D3.5.2's own change (fixture gaps at ~763/~771, sub-threshold speeds at ~787/~811/~833/~860).
- The three D3.5.2 regression tests (stacked touching circles survive; ≥ threshold destroys; sub-threshold no damage) are planned but NOT written.

## Scope decision (registered 2026-08-09)

The min-impact-damage gate makes four D3 impact tests fail. Those failures are caused by D3.5.2's own change, so their reconciliation **belongs inside D3.5.2's scope** (this depth-4 node), not deferred to the sibling `impact-damage-tests.md`. Mapping: fixture-gap tests (1,2) = D3.1; strong-impact (3) = D3.2; repeated-impacts (5) = D3.3; target-impacted-by-target (6) and weak-impact (4) are new sub-threshold casualties of the gate; D3.4 settle is resolved by the gate (only re-verification + a note needed). After this node, `impact-damage-tests.md` notes must be refreshed to match (T12).

## Stack

1. (done) **T1 — Re-baseline the game suite.** Run `bun test tests/game.test.js`; record the exact pass/fail list in this node; confirm it matches the 6 known failures and no new failures appeared. Role: loop-explore.
   - Evidence (2026-08-09): `bun test tests/game.test.js` → **97 pass / 6 fail**, 371 expect() calls, 103 tests across 1 file. Exact failing tests with their source lines, all matching the 6 known casualties, no new failures:
     1. `constructor throws on an invalid scoring block` — line 763 (fixture gap, T3)
     2. `constructor throws when scoring lacks the destroy entry` — line 771 (fixture gap, T3)
     3. `a strong impact destroys a target: removed, destroy scored, puff recorded at its position` — line 787 (sub-threshold projectile, T4)
     4. `a weak impact damages but does not destroy a target` — line 811 (sub-threshold gate, T5)
     5. `repeated impacts accumulate damage and eventually destroy the target` — line 833 (sub-threshold speeds, T6)
     6. `a target impacted by another target takes damage but scores no hit` — line 860 (sub-threshold fall speed, T7)
2. (done) **T2 — Audit destruction wiring in fixtures.** Read every `new Game(...)` construction and constructor-throw `base` fixture in `tests/game.test.js`; list any that still lack `destruction` so no straggler is left. Role: loop-explore.
   - Evidence (2026-08-09): audited all 23 constructor-throw `base` fixtures + `makeGame` (line 224, `destruction: options.destruction ?? DESTRUCTION`) + real-boot construction (line 611, `destruction: loader.get("data/boot.json", "destruction")`). **4 bases still lack `destruction`** — not 2:
     1. `line 759` — missing-scoring test base. **Silent straggler**: currently passes because the `scoring === undefined` check (game.js:33) fires before the `destruction` check (game.js:39).
     2. `line 764` — invalid-scoring-block test base. **Known failure** (test line 763): overrides `scoring`, so game.js:39 throws `missing dependency "destruction"` instead of `"points object"`.
     3. `line 772` — lacks-destroy-entry test base. **Known failure** (test line 771): same — game.js:39 throws before the `"destroy"` check.
     4. `line 1414` (multiline) — material-accessor test base. **Silent straggler**: currently passes because the `identity.material` accessor check (game.js:16) fires before the `destruction` check (game.js:39).
   - The bulk edit wired only bases that already reached the destruction check; these 4 are its blind spots. All other bases carry `destruction: DESTRUCTION`. T3 must cover all 4.
3. (done) **T3 — Fix the four missed constructor-throw fixtures.** Add `destruction: DESTRUCTION` to the bases at 759, 764, 772, and 1414; run the affected constructor-throw tests green. Role: loop-worker.
   - Evidence (2026-08-09): added `destruction: DESTRUCTION` to all 4 bases (764/772 share an identical one-liner, fixed via replaceAll; 1414 is the multiline material-accessor base). Validation-order preserved: scoring (game.js:33) and identity.material (game.js:15) checks still fire before destruction (game.js:39), so the missing-scoring and material-accessor assertions are unchanged. One assertion fix needed in the invalid-scoring-block test (763): `{ hit: 10, knockdown: 25 }` now throws `"destroy"` first because validateScoring loops `["hit","knockdown","destroy","launch-bonus"]` (game.js:211); added `destroy: 50` to the override so the `"launch-bonus"` assertion still fires. `bun test tests/game.test.js -t "constructor throws"` → **23 pass / 0 fail**. Full game suite: **99 pass / 4 fail** (the 763/771 casualties fixed; the remaining 4 are the T4–T7 targets at 787/811/833/860). Committed (311d3e2). **Note for the next session:** `loop.md` has a stray uncommitted diff (disaster-recovery step-4 renumber) present since session start, not produced by this node — decide commit-or-discard.
4. (pending) **T4 — Reconcile the strong-impact test (~787).** Raise the projectile `vy` to ≥ 400 (use 450–500, below ~1200) so the destroy actually occurs; re-verify the score assertion (`SCORING.hit + SCORING.destroy` vs the launch-bonus that fires on level clear) and correct it. Role: loop-worker.
5. (pending) **T5 — Reconcile the weak-impact test (~811).** Under the threshold model a sub-threshold impact deals no damage: rewrite the assertions to `hp` unchanged, no destroy, no puff (may be consolidated with T10 if the rewrite fully covers that regression). Role: loop-worker.
6. (pending) **T6 — Reconcile the repeated-impacts test (~833).** Raise both impact speeds to ≥ 400 so damage accumulates across two hits and the destroy occurs; keep the accumulation intent. Role: loop-worker.
7. (pending) **T7 — Reconcile the target-impacted-by-target test (~860).** Raise the falling block's speed to ≥ 400 so damage applies; keep the "scores no hit" assertions. Role: loop-worker.
8. (pending) **T8 — Regression: stacked touching circles survive gravity.** Real-boot `Game` (real boot data, as in the ~622 construction) with two touching circles and no input; after N frames all targets alive and state still `playing`. Role: loop-worker.
9. (pending) **T9 — Regression: ≥ threshold impact destroys.** A projectile impact ≥ 400 destroys the target (removed, `destroy` scored, puff at position); may be consolidated with T4. Role: loop-worker.
10. (pending) **T10 — Regression: sub-threshold impact deals no damage.** An impact < 400 leaves `hp` unchanged and records no puff; may be consolidated with T5. Role: loop-worker.
11. (pending) **T11 — Verify suite, compliance, build.** Run the full `bun test` (green), the project compliance verifier (clean), and `bun build src/main.js --target browser` (OK); record pass/fail evidence in this node. Role: loop-worker.

## Sequencing

T1 → T2 → T3 strictly in order. T4–T7 in any order after T1 (each is an independent edit to a distinct test). T8–T10 after T4–T7 (they share the impact-speed/score semantics the reconciliation establishes). T11 after all of Phase 1+2. Then pop to `threshold-recovery-close.md` for T12 → T13 → T14.

## Guardrails (do NOT)

- **Do not re-implement D3.5.2-b/c/d** — the threshold code and data are on disk and committed; only tests/docs/close work remains.
- **Do not skip the audit (T2)** — it is the completeness guard against the bulk edit's blind spots (it already missed two fixtures).
- **Do not raise test speeds to exactly 400** — use a comfortable margin (e.g., 450–500) above the threshold, and keep below ~1200 so the tests stay in the realistic projectile range.
- **Do not touch `data/levels.json` or the D3.4 fixture** — the gate, not layout changes, is the fix.
