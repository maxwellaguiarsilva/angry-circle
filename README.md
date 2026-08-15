# Angry Circle

A physics-based projectile game. Colorful circles launched with a slingshot against stacks of other colorful circles. See `docs/agent/stack-tree/request.md` for the full request and scope.

## Run

Static site, no build step. Serve the project root with any static server and open `index.html`:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Structure

- `index.html` — browser entry point (loads `src/main.js`)
- `src/main.js` — composition root: manual dependency wiring (DI, no globals)
- `src/engine/` — generic, game-agnostic engine (`audio`, `engine`, `input`, `physics`, `renderer`)
- `src/game/` — game layer (`game`, `identity`, `levels`, `slingshot`)
- `src/data/` — fail-fast JSON data loader (`loader`)
- `data/` — game-specific JSON (`boot`, `identity`, `levels`)
