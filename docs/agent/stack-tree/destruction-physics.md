# Destruction Physics — substack of request.md

Depth 2. Child of `request.md`. Implements the object-destruction request from `prompt.md` (2026-08-09): targets die by impact and "go puff", instead of only being pushed off screen.

## Active Role

orchestrator

## Stack Depth

2

## Mandate

Decompose and execute the destruction-physics feature. This node holds the stack; each session picks ONE task and works it. Implementation happens in the depth-3 children (`self-destruction-blocker.md`, `impact-damage-tests.md`, `puff-effect.md`, `destruction-balance-qa.md`).

## Target Artifact

Working code + data + tests + QA evidence for impact-based destruction with a puff effect.

## Enhanced request

**Goal:** currently targets are eliminated only by pushing them off screen (`Game.evaluateState` → `isOutOfPlay`). Add **object destruction physics**: targets are destroyed by strong impacts and "go puff" (like the cloned game), while keeping the IP-safe identity — generic colored circles, generic puff particles, zero characters/brand.

**Mechanic sketch (decisions required in D1):**
- Bodies carry HP (or a damage threshold); collisions deliver damage proportional to impact strength; at HP ≤ 0 the target is destroyed and a puff effect plays at its position.
- Puff is a generic visual/audio effect (particles / fading ellipse), never a character.
- Off-screen elimination stays or is removed — decided in D1.

**Constraints:**
- R1.2 / R2.1 — engine stays game-agnostic: `src/engine/physics.js` only exposes impact data (e.g., per-contact impulse magnitude); HP/damage/puff all live in the game layer + `data/`.
- R1.4 — fail-fast validation of new data.
- IP — zero animal/character/brand references anywhere (code, data, strings, assets).
- Preserve: scoring, launches, settle/spent logic, level clear / win / lose, DI composition.

**Open decisions (D1):**
- Damage metric: impact velocity along the collision normal vs computed impulse magnitude vs relative kinetic energy.
- Blocks (rectangles): get HP/break too, or circles only?
- Off-screen elimination: keep as fallback or remove (destruction becomes the only kill path)?
- Scoring: reuse `knockdown` or add a new `destroy` entry?
- Puff style + audio: particle burst, expanding/fading ellipse, existing tone?

**Acceptance criteria:**
1. A strong impact destroys a target: it disappears and a puff effect plays at its position.
2. A weak impact does not destroy (per decided model: no damage or accumulated damage).
3. HP and puff tunables are data-driven (`data/identity.json` materials + `data/boot.json`), fail-fast validated.
4. `src/engine/` stays game-agnostic (R1.2 / R2.1 compliance audit clean).
5. Level clear / win / lose, scoring, launches still work (QA playthrough).
6. IP scan clean: no animal/character/brand references anywhere.
7. Tests green + `bun build` OK + full 5-check QA gate (`docs/agent/qa-strategy.md`) passed.

## Stack

1. (done, 2026-08-09) **D1 — Analysis:** destruction model decided and recorded in `Decisions` below (damage metric = relative normal closing speed; blocks destructible; off-screen kept as fallback; new `destroy` scoring entry; puff = generic fading ellipse burst + tone; engine contract + data layout for D2–D4; AC mapping). No code, no commit (analysis-only).
2. (done, 2026-08-09) **D2 — Engine impact data:** `Physics` now emits a per-contact `impact` (relative normal closing speed, px/s) through the collision callback — `collisionCallback({ a, b, impact })`. Captured once per pair per step on the first solver iteration before resolution, via a shared `relativeNormalSpeed` helper (R1.1 — `applyImpulse` reuses it too); solve functions propagate the magnitude, `solveCollisions` records it into a per-step `impacts` map, `emitContacts` passes it through. Engine stays free of game concepts (R1.2/R2.1). 5 regression tests added to `tests/physics.test.js`. 273 tests green, `bun build` OK, compliance verifier clean.
3. (pending) **D3 — HP/damage model (game + data):** `data/identity.json` materials gain `hp`; bodies carry current HP; apply damage from collision impacts; at HP ≤ 0 destroy (remove + puff trigger + score); fail-fast validation; tests. **Implemented and committed** (`initial commit`), but **4 tests fail** and a real-level blocker exists. Remaining work is split into two children: **D3.5 blocker** → `self-destruction-blocker.md` (decision **done** — min-impact-damage threshold 400 px/s; implementation pending as D3.5.2) and **D3.1–D3.4 test fixes** → `impact-damage-tests.md` (D3.4 waits for D3.5.2). When both children pop done, D3 is done and this item closes.
   - **D3.5 (blocker, registered 2026-08-09):** `data/levels.json` level 1 spawns circles stacked 36px apart (radius 18 → exactly touching) at y=560/524/488 plus wood/stone blocks. `Game.applyImpactDamage` damages **both** bodies of every contact, so under gravity the top circle falls onto the lower one (impact ≈ 326 px/s) and they destroy each other → level auto-clears before the player acts (verified: real `Game` boot → 4/5 targets dead, score 100, in 60 frames; level 2 has the same stacked-circle pattern). **D3.5.1 decision (2026-08-09):** data-driven `destruction.min-impact-damage` threshold (default 400 px/s) gated in `applyImpactDamage`; settle ceiling measured 326 px/s (stacks 2–8), real projectile impacts 941–1200 px/s → 400 sits cleanly between. Full rationale in `self-destruction-blocker.md` `Decisions`. **D3.5.2 (pending)** implements it in `src/game/game.js` + `data/boot.json` + `src/main.js` with regression tests.
4. (pending) **D4 — Puff effect (game + data + renderer/audio):** generic puff visual (expanding/fading ellipse burst) + dedicated tone, config in `data/boot.json`, fail-fast validated; tests. Decomposed into `puff-effect.md` (D4.1–D4.3).
5. (pending) **D5 — Integration, balance, QA:** tune data so levels are winnable with the new model; run the full 5-check QA gate (tests, MCP visual, console, playthrough, compliance/IP); commit; mark the stack done. Decomposed into `destruction-balance-qa.md` (D5.1–D5.3).

## Children (substacks, depth 3)

- `self-destruction-blocker.md` — D3.5: decision (D3.5.1) **done** → implementation + regression (D3.5.2). Next: **D3.5.2**.
- `impact-damage-tests.md` — D3.1–D3.4 test fixes; D3.4 waits for D3.5.2.
- `puff-effect.md` — D4.1 data+validation → D4.2 effect entity → D4.3 audio+QA.
- `destruction-balance-qa.md` — D5.1 balance → D5.2 QA gate → D5.3 close substack.

## Decisions

### D1 — Destruction model (decided 2026-08-09, analysis-only)

**1. Damage metric — relative normal closing speed (impact), accumulated.**
The engine exposes a per-contact **impact** value: the relative closing speed between the two bodies along the collision normal at first overlap, in px/s. It is game-agnostic — exactly the `vn` the impulse solver already computes in `applyImpulse` (`src/engine/physics.js:343-353`), captured before resolution on the first solver iteration. The game layer accumulates `impact` into the target's current HP; resting contact has impact ≈ 0, so damage only accrues on real impacts. Not impulse magnitude, not kinetic energy: those weight by mass and couple tuning to `density`; closing speed is mass-independent, predictable, and linear to tune (R2.1 — any multiplier stays in data if D5 needs one).

**2. Blocks — destructible too.** All targets (circle + block materials) carry HP. `target`, `wood`, `stone` each gain `hp` in `data/identity.json` (durability: circle < wood < stone). Blocks are targets and the cloned game breaks structures, so both shapes share the puff kill path.

**3. Off-screen elimination — kept as fallback kill path.** A target pushed out of play (x<0, x>width, y<0, y>height) is still removed and scores `knockdown` (existing `evaluateState` path, `src/game/game.js:440-446`). Destruction and off-screen are mutually exclusive: a destroyed body is removed immediately, so it can never double-score. No puff for off-screen kills (out of view). This keeps levels winnable even if the player never lands a strong hit.

**4. Scoring — new `destroy` entry.** `data/boot.json` `scoring` gains `destroy` (initial 25, tuned in D5). `hit` (first projectile-target contact) and `knockdown` (off-screen) keep their meaning. Kill by destruction = `hit` (if projectile-touched) + `destroy`; kill by off-screen = `knockdown` (+`hit` if projectile-touched). `Game.validateScoring` gains the `destroy` key (R1.4).

**5. Puff — generic expanding/fading ellipse burst + dedicated tone.** Reuse the clouds aesthetic: on destruction spawn a short-lived effect entity at the body's position — a handful of small generic ellipses (mini puffs) drifting outward and fading over ~0.4s, rendered with `rgba(...)` fill strings computed by the game layer (renderer stays game-agnostic). Data-driven in `data/boot.json` under a new `puff` block (count, radii, spread, duration, start/end alpha, fill). Audio: new `puff` tone in `data/boot.json` `audio`. Generic colors only — zero characters (IP constraint).

**6. Engine contract for D2.** `Physics.onCollision` callback gains `impact` (px/s): `collisionCallback({ a, b, impact })`. Implement by recording impact once per pair per step on the first solver iteration, reusing the existing normal/closest-point math via a small shared helper — no new duplicate of `closestPointDeltaOnRect`/normal logic (R1.1). Engine stays free of game concepts (R1.2/R2.1).

**7. Data layout for D3/D4.** `data/identity.json`: `target` and each material gain `hp` (positive numbers, fail-fast validated by `CircleIdentity`/`Levels`). `data/boot.json`: `scoring.destroy`, `puff` block, and `audio.puff` tone (all fail-fast validated by `Game`). Starting defaults for D5 balance: circle `hp` 100, `wood` 120, `stone` 300; `destroy` 25.

**8. Post-D3–D5 flow (mapping note).**
```
physics.step → solveCollisions (capture impact once) → emitContacts({a,b,impact})
→ Game.handleCollision: hit score (projectile-target, once per pair) + damage every target involved
→ hp ≤ 0 → remove body, spawn puff effect, score destroy, play puff tone
→ evaluateState: off-screen → knockdown fallback; no targets → level clear/win; launches=0 → lose
```

**AC mapping:** (1) strong impact → destroy + puff at position — D1.1/D1.5. (2) weak impact → damage only — accumulate, hp threshold. (3) hp + puff tunables data-driven, fail-fast — D1.7. (4) engine game-agnostic (impact only) — D1.6. (5) level clear/win/lose, scoring, launches preserved — D1.3/D1.4, QA in D5. (6) IP scan clean, generic puff — D1.5. (7) tests + `bun build` + 5-check QA gate — D2–D5.
