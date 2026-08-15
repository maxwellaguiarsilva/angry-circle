# Loop-Runner Infra Debt

Status: **DONE** (2026-08-09).

Depth 2. Child of `request.md`. Debt node registered by the B9 disaster-recovery session (2026-08-09): uncommitted loop-runner infra edits must get a commit-or-discard decision, never folded into the B9 commit.

## Active Role

orchestrator

## Stack Depth

2

## Mandate

Decide commit vs. discard for the uncommitted edits in `loop.md`, `run-loop.sh`, `docs/agent/compliance-rules.md`; never fold them into the B9 commit.

## Target Artifact

A decision + one focused commit (or a clean discard) + this node marked done.

## Decision

**COMMIT.** The edits form a coherent unit and match the live contract:

1. `loop.md` — documents the watchdog budget cap, the `loop-violation.md` disaster-recovery flow (Session start step 2), and the INTAKE step. This is the contract file the loop runner attaches every iteration; leaving it uncommitted while it governs the loop is fragile.
2. `run-loop.sh` — adds the `run_session` watchdog (BUDGET/WATCH_INTERVAL/VIOLATION/USAGE_TOOL env), the INTAKE en-us translation gate, and violation export on overflow. Verified operational this session: `scripts/session-context-usage` symlink resolves, `jq` is present, `opencode export` exists, and the two prior `loop-violation.md` events prove the export path works.
3. `docs/agent/compliance-rules.md` — removes R4.4 (history resets) and R5.2 (no unregistered errors). R4.4 described a reset flow no longer in use; R5.2 is superseded by the stack-tree contract (loop.md §20 debt handling) which already registers every concern as tree tasks. Removal is deliberate and consistent with the current process.

No rationale found for discard; the infra has been exercised in production (two overflow exports) and is load-bearing for the loop.

## Evidence

- `git diff run-loop.sh loop.md docs/agent/compliance-rules.md` reviewed in the resolving session.
- `scripts/session-context-usage` -> `project-mcp-tools` symlink; `/usr/bin/jq` present; `opencode export [sessionID]` command exists.
- `loop-violation.md` appeared twice (2026-08-09) proving the watchdog + export path fires.

## Result

Committed as `7562e4b` (focused, separate from the B9 commit `6ee8545`). This node done.
