# Destruction Balance QA — substack of destruction-physics.md

Depth 3. Child of `destruction-physics.md` (D5). Balances the destruction model and runs the full QA gate to close the D-stack.

## Active Role

orchestrator

## Stack Depth

3

## Mandate

Close the destruction-physics stack: tune data so levels 1 and 2 are winnable and destruction feels right, run the 5-check QA gate, then pop this substack and mark D1–D5 done.

## Target Artifact

Tuned `data/` + QA evidence (pass/fail) + stack-tree updated and committed.

## Stack

1. (pending) **D5.1 — Balance tune.** Adjust `hp`, `destroy` score, and any threshold values so levels 1 and 2 are winnable and destruction feels right with real data. Role: loop-worker. Artifact: tuned `data/` + evidence.
2. (pending) **D5.2 — Full QA gate.** Run the 5-check gate from `docs/agent/qa-strategy.md`: tests, MCP visual, console, browser playthrough (both levels + win), compliance/IP scan. Role: loop-worker. Artifact: QA evidence (pass/fail).
3. (pending) **D5.3 — Close the substack.** Mark D1–D5 done in `destruction-physics.md`, pop the children, restore the parent frame, shorten the `index.md` path, commit referencing the node. Role: orchestrator. Artifact: stack-tree updated + commit.
