# Impact Damage Tests — substack of destruction-physics.md

Depth 3. Child of `destruction-physics.md` (D3.1–D3.4). Fixes the 4 failing tests around the D3 HP/damage model.

## Active Role

orchestrator

## Stack Depth

3

## Mandate

Get the four D3 failing tests green (`tests/game.test.js`), then mark D3 done in `destruction-physics.md`. D3.4 depends on D3.5.2 (`self-destruction-blocker.md`).

## Target Artifact

Green `bun test` for all four cases; D3 marked done in the parent.

## Stack

1. (pending) **D3.1 — Fix invalid-scoring-block test fixture.** `tests/game.test.js:760` passes `{hit,knockdown}` without `destroy`; the code now throws on the missing `destroy` key first. Update the fixture so the invalid block includes `destroy`. Test/data mismatch, not a code bug. Role: loop-worker.
2. (pending) **D3.2 — Fix destroy-score assertion.** `tests/game.test.js:784`: target removed OK but score 135 ≠ 35 — after the destroy the level clears and `launch-bonus` (2×50) is added. Update the assertion to account for the remaining-launch bonus. Role: loop-worker.
3. (pending) **D3.3 — Fix repeated-impacts test setup.** `tests/game.test.js:830`: first hit applies 10 (hp 15→5), second hit lands ~0 impact because the target is still falling (~10.56 px/s downward), neutralizing closing speed. Zero `target.vy` (or raise projectile speed) before the second impact. Confirm accumulated damage works first (the code is correct). Role: loop-worker.
4. (pending) **D3.4 — Re-verify the settle-counter test.** `tests/game.test.js:1118`: after D3.5.2 fixes stacked-target self-destruction, re-run this test; adjust the fixture if the fix changes stacked-target behavior; confirm `settleFrames`/`spent` behave and the test is green. Depends on D3.5.2. Role: loop-worker.

## Sequencing

D3.1–D3.3 in any order; D3.4 only after D3.5.2 lands. Then mark D3 done in the parent and pop.
