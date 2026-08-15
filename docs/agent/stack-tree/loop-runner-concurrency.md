# Loop-Runner Concurrency — substack of request.md

Depth 2. Child of `request.md`. Infra hazard: the loop runner spawns concurrent opencode sessions that race each other's tree edits.

## Active Role

orchestrator

## Stack Depth

2

## Mandate

Investigate and fix the loop runner's concurrent-session spawning (observed PIDs 43769 + 44811 running the same recovery simultaneously), adding a single-flight guard so disaster recovery and tree edits never run concurrently.

## Target Artifact

Mapping note with `file:line` (INFRA.1) + patched `run-loop.sh` + verification (INFRA.2).

## Background

Flagged 2026-08-09 by the `hidden-comet` disaster-recovery session: two `opencode` processes (PIDs 43769, 44811) ran the same recovery concurrently and raced each other's tree edits (one edit failed with an old-string mismatch; the other session wrote the identical state). Independent — schedule whenever the loop has no other mandate.

## Stack

1. (pending) **INFRA.1 — Map concurrent session spawning.** Inspect `run-loop.sh` to locate where parallel opencode sessions start and where a single-flight guard belongs. Read-only. Role: loop-explore. Artifact: mapping note with `file:line`.
2. (pending) **INFRA.2 — Implement single-flight guard.** Add a lock/serialization so disaster recovery and tree edits never run concurrently; verify no double-execution. Role: loop-worker. Artifact: patched `run-loop.sh` + verification.
