# Threshold Recovery Close — substack of self-destruction-blocker.md

Depth 4. Child of `self-destruction-blocker.md` (D3.5.2 close). Verifies the full suite, refreshes stale D3.1–D3.4 notes, closes the nodes, commits.

## Active Role

orchestrator

## Stack Depth

4

## Mandate

Close out D3.5: verify the full suite green, refresh the stale D3.1–D3.4 notes in `impact-damage-tests.md`, close all nodes, and commit referencing the node.

## Target Artifact

Green full suite, refreshed docs, D3.5 marked done, commit referencing the node.

## Background (registered 2026-08-09, disaster recovery)

Runs only after `threshold-test-reconciliation.md` (T1–T11) pops back. Depends on that node's reconciled tests and regression tests being in place.

## Stack

1. (pending) **T12 — Refresh stale D3.1–D3.4 notes.** Update `impact-damage-tests.md`: rewrite D3.1–D3.3 to reflect the threshold reconciliation absorbed into D3.5.2's scope, mark D3.4 re-verified/resolved by the gate, and record the scope decision. Role: orchestrator.
2. (pending) **T13 — Close the stack-tree nodes.** Mark every task done; mark D3.5 resolved in `destruction-physics.md`; pop both depth-4 children and restore `self-destruction-blocker.md`'s frame; note the next task (`impact-damage-tests.md` remainder, then `puff-effect.md` D4); append the `index.md` log entry. Role: orchestrator.
3. (pending) **T14 — Commit.** Commit the D3.5.2 changes (boot.json, game.js, main.js, tests) with a small, focused message referencing the node, per the commit gate. Role: orchestrator.

## Sequencing

T12 → T13 → T14 strictly in order. T13 is the final pop: after it, `self-destruction-blocker.md` holds only done entries and the tree's next task is `impact-damage-tests.md` (remainder), then `puff-effect.md` (D4).

## Guardrails (do NOT)

- Do not start before T11 (in the sibling node) is done and popped.
- Do not commit before T13 marks the nodes done — the commit gate requires a node moved pending → done.
