# QA / Validation Strategy

Repeatable process that proves a visual/game change "looks good and is well developed" before it is considered done. Wired into the loop as a mandatory gate on every render-affecting change.

## Gate: when it runs

Run the full pass after any render-affecting change (visual, layout, level data, assets). Run at least the automated tests + console check after any other code change.

## The five checks

### 1. Automated tests — `bun test`

Unit suite for engine + game layer must be green before anything is done.

- Gate: `bun test` exits 0 with 0 failures.
- Evidence: pass/fail + test count from the run output.

### 2. MCP visual inspection

> **Pitfall — stale 304s:** `python3 -m http.server` ignores `Cache-Control: no-cache` and serves 304 off `If-Modified-Since`. After a code change, the browser may run a stale cached module and throw false boot errors. Before inspecting, clear the browser cache (`Network.clearBrowserCache` + `Network.setCacheDisabled` via CDP) and reload.

After every render-affecting change: serve the project, open it in the browser via MCP, screenshot the game, and confirm with `describe_image` that the scene renders correctly.

- Checks: slingshot present (fork + bands + pouch), clouds in the sky, block targets render as rectangles, HUD shows the score, no clipping / no missing elements.
- Evidence: screenshot file + `describe_image` verdict.

### 3. Console-error check

The MCP browser console must be clean.

- Checks: no 404s, no errors, no warnings (e.g., favicon, missing assets, JS exceptions).
- Evidence: console output listing (0 errors / 0 warnings).

### 4. Playthrough smoke check

A short manual pass through the core loop.

- Checks: launch a projectile, hit a target, knock a structure down, score updates, reach a win/lose state.
- Evidence: step-by-step observations (or screenshots).

### 5. Compliance audit

Prove the architecture rules still hold.

- Checks (from `docs/agent/compliance-rules.md`):
  - R1.2: engine code is game-agnostic — no game literals in `src/engine/` (grep).
  - R2.1: all tunables in `data/` — no domain literals in generic code.
  - IP: no animal/IP references anywhere (grep code, data, strings, assets).
  - R1.3/R1.4: dependencies injected, fail-fast access (spot-check data loaders).
- Evidence: grep output + spot-check notes.

## Pass/fail policy

- A check that fails blocks "done". Fix in-scope or register a debt/pending task in the stack-tree (R5.2) and proceed with the defect tracked.
- Record each pass (checks + evidence) in the stack-tree node log when the change ships.
