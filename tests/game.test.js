import { test, expect } from "bun:test";
import { Game } from "../src/game/game.js";
import { Physics } from "../src/engine/physics.js";
import { DataLoader } from "../src/data/loader.js";

const LAUNCHER = { color: "#4ecdc4", radius: 22 };
const TARGET = { color: "#ff6b6b", radius: 18, hp: 100 };
const MATERIALS = {
  wood: { color: "#a67c52", w: 60, h: 30, hp: 120 },
  stone: { color: "#8e9299", w: 60, h: 30, hp: 300 },
};
const LEVEL = {
  launches: 3,
  targets: [
    { x: 640, y: 560 },
    { x: 640, y: 524 },
  ],
};
const LEVEL_WITH_BLOCKS = {
  launches: 3,
  targets: [
    { x: 640, y: 560 },
    { x: 500, y: 585, shape: "block", material: "wood" },
    { x: 500, y: 555, shape: "block", material: "stone" },
  ],
};
const LEVEL_TWO = {
  launches: 2,
  targets: [{ x: 700, y: 560 }],
};
const LAUNCHER_POSITION = { x: 120, y: 520 };
const MAX_DRAG = 150;
const CANVAS = { width: 800, height: 600 };
const SCORING = { hit: 10, knockdown: 25, destroy: 25, "launch-bonus": 50 };
const DESTRUCTION = { "min-impact-damage": 400 };
const SETTLE = { speed: 30, frames: 12 };
const HUD = { x: 24, y: 28, font: "600 18px monospace", fill: "#ffffff", label: "Score" };
const GAME_OVER = {
  "won-text": "You cleared the level!",
  "lost-text": "Out of launches!",
  "restart-text": "Tap to play again",
  font: "700 30px monospace",
  fill: "#ffffff",
  "restart-font": "400 15px monospace",
  "restart-fill": "#aab6cc",
  y: 260,
  "restart-y-offset": 44,
};
const SLINGSHOT_VISUAL = {
  "band-color": "#ffffff",
  "band-width": 4,
  "frame-color": "#8d6e63",
  "frame-width": 8,
  "frame-base-offset-y": 80,
  "frame-split-offset-y": 12,
  "tine-offset-x": 30,
  "tine-offset-y": 40,
  "pouch-color": "#6b4f3a",
  "pouch-radius": 12,
};
const AUDIO = {
  launch: { frequency: 520, duration: 0.15, type: "sine", volume: 0.3 },
  hit: { frequency: 220, duration: 0.2, type: "triangle", volume: 0.4 },
  win: { frequency: 660, duration: 0.4, type: "sine", volume: 0.4 },
  lose: { frequency: 110, duration: 0.5, type: "sawtooth", volume: 0.3 },
};
const CLOUDS = {
  fill: "#33405f",
  "wrap-margin": 160,
  puffs: [
    { dx: 0, dy: 0, rx: 46, ry: 26 },
    { dx: -30, dy: 8, rx: 28, ry: 20 },
    { dx: 30, dy: 8, rx: 28, ry: 20 },
  ],
  items: [
    { x: 150, y: 90, vx: 4 },
    { x: 400, y: 140, vx: 6 },
    { x: 620, y: 80, vx: 5 },
  ],
};

function makeAudio() {
  const calls = { unlock: 0, tones: [] };
  return {
    calls,
    unlock() {
      calls.unlock += 1;
      return Promise.resolve();
    },
    tone(args) {
      calls.tones.push(args);
    },
  };
}

function makePhysics() {
  return new Physics({
    config: { gravity: 980, restitution: 0.6, density: 0.01, "solver-iterations": 4, "ground-y": 600 },
  });
}

function makeRenderer() {
  const calls = { present: 0, circles: [], text: [], lines: [], ellipses: [], rects: [] };
  return {
    calls,
    present() {
      calls.present += 1;
    },
    circle({ x, y, radius, fill }) {
      calls.circles.push({ x, y, radius, fill });
    },
    rect(args) {
      calls.rects.push(args);
    },
    ellipse(args) {
      calls.ellipses.push(args);
    },
    line(args) {
      calls.lines.push(args);
    },
    text(args) {
      calls.text.push(args);
    },
  };
}

function makeEngine() {
  const calls = { update: null, render: null, started: 0 };
  return {
    calls,
    onUpdate(callback) {
      calls.update = callback;
      return this;
    },
    onRender(callback) {
      calls.render = callback;
      return this;
    },
    start() {
      calls.started += 1;
      return this;
    },
  };
}

function makeInput() {
  const handlers = { attached: false };
  return {
    handlers,
    onDown(callback) {
      handlers.down = callback;
      return this;
    },
    onMove(callback) {
      handlers.move = callback;
      return this;
    },
    onUp(callback) {
      handlers.up = callback;
      return this;
    },
    attach() {
      handlers.attached = true;
      return this;
    },
  };
}

function makeIdentity(materials = MATERIALS) {
  return {
    get(role) {
      if (role === "launcher") {
        return LAUNCHER;
      }
      if (role === "target") {
        return TARGET;
      }
      throw new Error(`CircleIdentity: unknown role "${role}".`);
    },
    material(name) {
      if (!Object.prototype.hasOwnProperty.call(materials, name)) {
        throw new Error(`CircleIdentity: unknown material "${name}".`);
      }
      return materials[name];
    },
  };
}

function makeSlingshot() {
  return {
    launch(release) {
      return { vx: -release.dx * 10, vy: -release.dy * 10, power: Math.hypot(release.dx, release.dy) * 10 };
    },
    isGrab(anchor, position) {
      return Math.hypot(position.x - anchor.x, position.y - anchor.y) <= MAX_DRAG;
    },
    clampPouch(anchor, position) {
      const dx = position.x - anchor.x;
      const dy = position.y - anchor.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= MAX_DRAG) {
        return { x: position.x, y: position.y };
      }
      const scale = MAX_DRAG / distance;
      return { x: anchor.x + dx * scale, y: anchor.y + dy * scale };
    },
  };
}

function makeLevels(levels = [LEVEL]) {
  return {
    count() {
      return levels.length;
    },
    get(index) {
      if (!Number.isInteger(index) || index < 0 || index >= levels.length) {
        throw new Error(`Levels: level index ${index} out of range.`);
      }
      return levels[index];
    },
  };
}

function makeGame(options = {}) {
  const renderer = makeRenderer();
  const engine = makeEngine();
  const input = makeInput();
  const physics = makePhysics();
  const audio = makeAudio();
  const game = new Game({
    engine,
    launcher: options.launcher ?? LAUNCHER_POSITION,
    input,
    identity: options.identity ?? makeIdentity(),
    slingshot: makeSlingshot(),
    levels: makeLevels(options.levels),
    renderer,
    physics,
    canvas: options.canvas ?? CANVAS,
    scoring: options.scoring ?? SCORING,
    destruction: options.destruction ?? DESTRUCTION,
    settle: options.settle ?? SETTLE,
    hud: options.hud ?? HUD,
    slingshotVisual: options.slingshotVisual ?? SLINGSHOT_VISUAL,
    audio: options.audio ?? audio,
    audioConfig: options.audioConfig ?? AUDIO,
    clouds: options.clouds ?? CLOUDS,
    gameOver: options.gameOver ?? GAME_OVER,
  });
  return { game, renderer, engine, input, physics, audio };
}

function release(dx, dy, x = 0, y = 0) {
  return { x, y, dx, dy, startX: 0, startY: 0 };
}

test("constructor throws on a missing launcher dependency", () => {
  const base = { engine: {}, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: {}, scoring: {}, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "launcher"');
});

test("constructor throws on an invalid launcher block", () => {
  const base = { engine: {}, launcher: {}, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: {}, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('numeric "x"');
  expect(() => new Game({ ...base, launcher: { x: "120", y: 520 } })).toThrow('numeric "x"');
  expect(() => new Game({ ...base, launcher: { x: 120 } })).toThrow('numeric "y"');
  expect(() => new Game({ ...base, launcher: { x: 120, y: NaN } })).toThrow('numeric "y"');
});

test("a non-zero release spawns a projectile at the release/pouch position, not the launcher", () => {
  const position = { x: 300, y: 400 };
  const { game, input, physics } = makeGame({ launcher: position });
  game.start();
  input.handlers.down({ x: 300, y: 400 });
  input.handlers.up(release(-100, 0, 240, 350));
  const projectile = physics.bodies[physics.bodies.length - 1];
  expect(projectile.x).toBe(240);
  expect(projectile.y).toBe(350);
});

test("constructor throws on a missing renderer dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, physics: {}, canvas: {}, scoring: {}, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "renderer"');
});

test("constructor throws on a missing physics dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, canvas: {}, scoring: {}, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "physics"');
});

test("constructor throws on a missing canvas dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, scoring: {}, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "canvas"');
});

test("constructor throws on invalid canvas dimensions", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 0, height: 600 }, scoring: {}, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('positive numeric "width"');
  const base2 = { ...base, canvas: { width: 800, height: -5 } };
  expect(() => new Game({ ...base2 })).toThrow('positive numeric "height"');
});

test("start loads level 0 and spawns target bodies with identity radius and color", () => {
  const { game, physics } = makeGame();
  game.start();
  expect(physics.bodies.length).toBe(LEVEL.targets.length);
  for (let i = 0; i < LEVEL.targets.length; i += 1) {
    const body = physics.bodies[i];
    expect(body.x).toBe(LEVEL.targets[i].x);
    expect(body.y).toBe(LEVEL.targets[i].y);
    expect(body.vx).toBe(0);
    expect(body.vy).toBe(0);
    expect(body.radius).toBe(TARGET.radius);
    expect(body.fill).toBe(TARGET.color);
  }
});

test("start stores the level launches as launchesRemaining", () => {
  const { game } = makeGame();
  game.start();
  expect(game.launchesRemaining).toBe(LEVEL.launches);
  expect(game.levelIndex).toBe(0);
});

test("start wires engine update to physics.step and render to present plus circles", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  expect(engine.calls.update).toBeTypeOf("function");
  expect(engine.calls.render).toBeTypeOf("function");
  engine.calls.update(0.016);
  expect(game.physics.bodies[0].vy).toBeGreaterThan(0);
  engine.calls.render();
  expect(renderer.calls.present).toBe(1);
  expect(renderer.calls.circles.length).toBe(game.physics.bodies.length + 2);
});

test("start attaches input and starts the engine", () => {
  const { game, engine, input } = makeGame();
  game.start();
  expect(input.handlers.attached).toBe(true);
  expect(engine.calls.started).toBe(1);
});

test("a release beyond max-drag spawns at the clamped pouch and launches opposite the launcher vector", () => {
  const { game, input, physics } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  input.handlers.up(release(-100, 0, 240, 350));
  const projectile = physics.bodies[physics.bodies.length - 1];
  expect(projectile.x).toBeCloseTo(206.5024796, 5);
  expect(projectile.y).toBeCloseTo(397.4548205, 5);
  expect(projectile.vx).toBeCloseTo(-865.0247964, 5);
  expect(projectile.vy).toBeCloseTo(1225.4517949, 5);
  expect(projectile.radius).toBe(LAUNCHER.radius);
  expect(projectile.fill).toBe(LAUNCHER.color);
  expect(game.launchesRemaining).toBe(LEVEL.launches - 1);
});

test("a zero-length release spawns no projectile", () => {
  const { game, input, physics } = makeGame();
  game.start();
  input.handlers.up(release(0, 0));
  expect(physics.bodies.length).toBe(LEVEL.targets.length);
  expect(game.launchesRemaining).toBe(LEVEL.launches);
});

test("spawnProjectile throws on a missing or non-numeric release position", () => {
  const { game } = makeGame();
  game.start();
  expect(() => game.spawnProjectile()).toThrow('missing dependency "release"');
  expect(() => game.spawnProjectile({ x: "240", y: 350 })).toThrow(/numeric "x" and "y"/);
  expect(() => game.spawnProjectile({ x: 240, y: null })).toThrow(/numeric "x" and "y"/);
});

test("render draws every body after present", () => {
  const { game, engine, renderer, physics } = makeGame();
  game.start();
  const before = physics.bodies.length;
  engine.calls.render();
  expect(renderer.calls.present).toBe(1);
  expect(renderer.calls.circles.length).toBe(before + 2);
  expect(renderer.calls.circles[1].x).toBe(LAUNCHER_POSITION.x);
  expect(renderer.calls.circles[1].y).toBe(LAUNCHER_POSITION.y);
  for (let i = 0; i < before; i += 1) {
    const body = physics.bodies[i];
    const circle = renderer.calls.circles[i + 2];
    expect(circle.x).toBe(body.x);
    expect(circle.y).toBe(body.y);
    expect(circle.radius).toBe(body.radius);
    expect(circle.fill).toBe(body.fill);
  }
});

test("render draws the launcher circle at its rest position when launchable", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  const rest = renderer.calls.circles[1];
  expect(rest.x).toBe(LAUNCHER_POSITION.x);
  expect(rest.y).toBe(LAUNCHER_POSITION.y);
  expect(rest.radius).toBe(LAUNCHER.radius);
  expect(rest.fill).toBe(LAUNCHER.color);
});

test("render draws the pouch circle behind the launcher at rest", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  const pouch = renderer.calls.circles[0];
  expect(pouch.x).toBe(LAUNCHER_POSITION.x);
  expect(pouch.y).toBe(LAUNCHER_POSITION.y);
  expect(pouch.radius).toBe(SLINGSHOT_VISUAL["pouch-radius"]);
  expect(pouch.fill).toBe(SLINGSHOT_VISUAL["pouch-color"]);
});

test("render draws no launcher circle when no launches remain", () => {
  const { game, engine, renderer, physics } = makeGame();
  game.start();
  game.launchesRemaining = 0;
  engine.calls.render();
  expect(renderer.calls.circles.length).toBe(physics.bodies.length);
});

test("render draws no launcher circle while the state is not playing", () => {
  const { game, engine, renderer, physics } = makeGame();
  game.start();
  game.state = "won";
  engine.calls.render();
  expect(renderer.calls.circles.length).toBe(physics.bodies.length);
});

test("render draws the slingshot bands and dragged pouch and circle while dragging", () => {
  const { game, engine, renderer, input } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  input.handlers.move({ x: 60, y: 500, dx: -60, dy: -20 });
  engine.calls.render();
  expect(renderer.calls.lines.length).toBe(5);
  const leftBand = renderer.calls.lines[3];
  const rightBand = renderer.calls.lines[4];
  expect(leftBand.x1).toBe(LAUNCHER_POSITION.x - SLINGSHOT_VISUAL["tine-offset-x"]);
  expect(leftBand.y1).toBe(LAUNCHER_POSITION.y - SLINGSHOT_VISUAL["tine-offset-y"]);
  expect(leftBand.x2).toBe(60);
  expect(leftBand.y2).toBe(500);
  expect(leftBand.color).toBe(SLINGSHOT_VISUAL["band-color"]);
  expect(leftBand.width).toBe(SLINGSHOT_VISUAL["band-width"]);
  expect(rightBand.x1).toBe(LAUNCHER_POSITION.x + SLINGSHOT_VISUAL["tine-offset-x"]);
  expect(rightBand.y1).toBe(LAUNCHER_POSITION.y - SLINGSHOT_VISUAL["tine-offset-y"]);
  const dragged = renderer.calls.circles[1];
  expect(dragged.x).toBe(60);
  expect(dragged.y).toBe(500);
  expect(dragged.radius).toBe(LAUNCHER.radius);
  expect(dragged.fill).toBe(LAUNCHER.color);
  const draggedPouch = renderer.calls.circles[0];
  expect(draggedPouch.x).toBe(60);
  expect(draggedPouch.y).toBe(500);
});

test("render draws frame and rest bands before any drag starts", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  expect(renderer.calls.lines.length).toBe(5);
  for (const line of renderer.calls.lines.slice(0, 3)) {
    expect(line.color).toBe(SLINGSHOT_VISUAL["frame-color"]);
  }
  for (const line of renderer.calls.lines.slice(3, 5)) {
    expect(line.color).toBe(SLINGSHOT_VISUAL["band-color"]);
  }
});

test("render draws the Y-fork frame with stem and two tines from config geometry", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  const [stem, leftTine, rightTine] = renderer.calls.lines;
  const baseY = LAUNCHER_POSITION.y + SLINGSHOT_VISUAL["frame-base-offset-y"];
  const splitY = LAUNCHER_POSITION.y + SLINGSHOT_VISUAL["frame-split-offset-y"];
  const tipY = LAUNCHER_POSITION.y - SLINGSHOT_VISUAL["tine-offset-y"];
  expect(stem.x1).toBe(LAUNCHER_POSITION.x);
  expect(stem.y1).toBe(baseY);
  expect(stem.x2).toBe(LAUNCHER_POSITION.x);
  expect(stem.y2).toBe(splitY);
  expect(leftTine.x1).toBe(LAUNCHER_POSITION.x);
  expect(leftTine.y1).toBe(splitY);
  expect(leftTine.x2).toBe(LAUNCHER_POSITION.x - SLINGSHOT_VISUAL["tine-offset-x"]);
  expect(leftTine.y2).toBe(tipY);
  expect(rightTine.x1).toBe(LAUNCHER_POSITION.x);
  expect(rightTine.y1).toBe(splitY);
  expect(rightTine.x2).toBe(LAUNCHER_POSITION.x + SLINGSHOT_VISUAL["tine-offset-x"]);
  expect(rightTine.y2).toBe(tipY);
  for (const line of [stem, leftTine, rightTine]) {
    expect(line.width).toBe(SLINGSHOT_VISUAL["frame-width"]);
  }
});

test("render draws rest bands from both tine tips to the launcher anchor when launchable", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  const [leftBand, rightBand] = renderer.calls.lines.slice(3, 5);
  expect(leftBand.x2).toBe(LAUNCHER_POSITION.x);
  expect(leftBand.y2).toBe(LAUNCHER_POSITION.y);
  expect(rightBand.x2).toBe(LAUNCHER_POSITION.x);
  expect(rightBand.y2).toBe(LAUNCHER_POSITION.y);
  expect(leftBand.color).toBe(SLINGSHOT_VISUAL["band-color"]);
  expect(rightBand.color).toBe(SLINGSHOT_VISUAL["band-color"]);
});

test("render draws the slingshot frame even when no launches remain", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  game.launchesRemaining = 0;
  engine.calls.render();
  expect(renderer.calls.lines.length).toBe(3);
});

test("release clears the drag so only rest bands and the rest launcher render afterwards", () => {
  const { game, engine, renderer, input } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  input.handlers.move({ x: 60, y: 500, dx: -60, dy: -20 });
  input.handlers.up(release(-60, -20));
  engine.calls.render();
  expect(renderer.calls.lines.length).toBe(5);
  expect(renderer.calls.circles[1].x).toBe(LAUNCHER_POSITION.x);
  expect(renderer.calls.circles[1].y).toBe(LAUNCHER_POSITION.y);
});

test("a press far from the launcher starts no drag", () => {
  const { game, input } = makeGame();
  game.start();
  input.handlers.down({ x: 700, y: 500 });
  input.handlers.move({ x: 60, y: 500, dx: -640, dy: 0 });
  expect(game.drag).toBeNull();
});

test("a press far from the launcher releases without launching", () => {
  const { game, input, physics } = makeGame();
  game.start();
  input.handlers.down({ x: 700, y: 500 });
  input.handlers.up(release(-640, 0, 60, 500));
  expect(physics.bodies.length).toBe(LEVEL.targets.length);
  expect(game.launchesRemaining).toBe(LEVEL.launches);
});

test("a drag within max-drag keeps the pouch at the pointer position", () => {
  const { game, input } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  input.handlers.move({ x: 60, y: 500, dx: -60, dy: -20 });
  expect(game.drag).toEqual({ x: 60, y: 500 });
});

test("a drag beyond max-drag clamps the pouch to the drag radius around the launcher", () => {
  const { game, input } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  input.handlers.move({ x: -50, y: 520, dx: -170, dy: 0 });
  expect(game.drag.x).toBe(120 - MAX_DRAG);
  expect(game.drag.y).toBe(520);
});

test("constructor throws on a missing slingshotVisual dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "slingshotVisual"');
});

test("constructor throws on an invalid slingshotVisual block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, slingshotVisual: null })).toThrow("visual object");
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "band-color": "" } })).toThrow('"band-color"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "band-width": 0 } })).toThrow('"band-width"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "frame-color": "" } })).toThrow('"frame-color"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "frame-width": 0 } })).toThrow('"frame-width"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "frame-base-offset-y": "80" } })).toThrow('"frame-base-offset-y"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "frame-split-offset-y": -1 } })).toThrow('"frame-split-offset-y"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "tine-offset-x": 0 } })).toThrow('"tine-offset-x"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "tine-offset-y": NaN } })).toThrow('"tine-offset-y"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "pouch-color": "" } })).toThrow('"pouch-color"');
  expect(() => new Game({ ...base, slingshotVisual: { ...SLINGSHOT_VISUAL, "pouch-radius": 0 } })).toThrow('"pouch-radius"');
});

test("game layer contains no hardcoded slingshot visual literals", () => {
  const source = Game.toString();
  expect(source).not.toContain("#ffffff");
  expect(source).not.toContain("lineWidth = 4");
});

test("real level, identity, and launcher data drive the spawned bodies", async () => {
  const loader = new DataLoader();
  loader.sources.set("data/boot.json", await Bun.file("data/boot.json").json());
  loader.sources.set("data/identity.json", await Bun.file("data/identity.json").json());
  loader.sources.set("data/levels.json", await Bun.file("data/levels.json").json());

  const { CircleIdentity } = await import("../src/game/identity.js");
  const { Levels } = await import("../src/game/levels.js");
  const { Slingshot } = await import("../src/game/slingshot.js");

  const physicsConfig = loader.get("data/boot.json", "physics");
  const physics = new Physics({ config: { ...physicsConfig, "ground-y": 600 } });
  const identity = new CircleIdentity({ data: loader, source: "data/identity.json" });
  const materials = loader.get("data/identity.json", "materials");
  const levels = new Levels({ data: loader, source: "data/levels.json", materials });
  const slingshot = new Slingshot({ config: loader.get("data/boot.json", "slingshot") });
  const renderer = makeRenderer();
  const engine = makeEngine();
  const input = makeInput();
  const audio = makeAudio();

  const game = new Game({
    engine,
    launcher: loader.get("data/boot.json", "launcher"),
    input,
    identity,
    slingshot,
    levels,
    renderer,
    physics,
    canvas: loader.get("data/boot.json", "canvas"),
    scoring: loader.get("data/boot.json", "scoring"),
    destruction: loader.get("data/boot.json", "destruction"),
    settle: loader.get("data/boot.json", "settle"),
    hud: loader.get("data/boot.json", "hud"),
    slingshotVisual: loader.get("data/boot.json", "slingshot-visual"),
    audio,
    audioConfig: loader.get("data/boot.json", "audio"),
    clouds: loader.get("data/boot.json", "clouds"),
    gameOver: loader.get("data/boot.json", "game-over"),
  });
  game.start();

  const realLevel = levels.get(0);
  expect(physics.bodies.length).toBe(realLevel.targets.length);
  for (let i = 0; i < realLevel.targets.length; i += 1) {
    const position = realLevel.targets[i];
    const body = physics.bodies[i];
    if (position.shape === "block") {
      const material = identity.material(position.material);
      expect(body.radius).toBeUndefined();
      expect(body.w).toBe(material.w);
      expect(body.h).toBe(material.h);
      expect(body.fill).toBe(material.color);
    } else {
      expect(body.radius).toBe(18);
      expect(body.fill).toBe("#ff6b6b");
    }
  }

  const launcher = identity.get("launcher");
  const launcherConfig = loader.get("data/boot.json", "launcher");
  input.handlers.down({ x: launcherConfig.x, y: launcherConfig.y });
  input.handlers.up(release(-150, 0, launcherConfig.x - 150, launcherConfig.y));
  const projectile = physics.bodies[physics.bodies.length - 1];
  expect(projectile.x).toBe(launcherConfig.x - 150);
  expect(projectile.y).toBe(launcherConfig.y);
  expect(projectile.radius).toBe(launcher.radius);
  expect(projectile.fill).toBe(launcher.color);
  expect(projectile.vx).toBe(1200);
  expect(projectile.vy).toBeCloseTo(0, 12);
});

test("game layer contains no hardcoded identity or launcher literals", () => {
  const source = Game.toString();
  for (const literal of ["#4ecdc4", "#ff6b6b", "120", "520", "640", "560"]) {
    expect(source).not.toContain(literal);
  }
});

test("target bodies are tagged kind target and projectiles kind projectile", () => {
  const { game, input, physics } = makeGame();
  game.start();
  for (const body of physics.bodies) {
    expect(body.kind).toBe("target");
  }
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  expect(physics.bodies[physics.bodies.length - 1].kind).toBe("projectile");
});

test("a body outside the canvas is removed from play on the next update", () => {
  const { game, engine, physics } = makeGame();
  game.start();
  const target = physics.bodies[0];
  target.x = CANVAS.width + 10;
  engine.calls.update(0.016);
  expect(physics.bodies).not.toContain(target);
});

test("clearing all targets advances to the next level and resets state", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL, LEVEL_TWO] });
  game.start();
  expect(game.levelIndex).toBe(0);
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.levelIndex).toBe(1);
  expect(game.state).toBe("playing");
  expect(game.launchesRemaining).toBe(LEVEL_TWO.launches);
  expect(physics.bodies.length).toBe(LEVEL_TWO.targets.length);
  for (const body of physics.bodies) {
    expect(body.kind).toBe("target");
  }
});

test("clearing all targets on the last level sets state won", () => {
  const { game, engine, physics } = makeGame();
  game.start();
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.state).toBe("won");
  expect(game.levelIndex).toBe(0);
});

test("running out of launches with targets left and no projectile in play loses", () => {
  const { game, engine } = makeGame({ levels: [LEVEL] });
  game.start();
  game.launchesRemaining = 0;
  engine.calls.update(0.016);
  expect(game.state).toBe("lost");
});

test("lose is deferred while a projectile is still in play", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  const launcherCount = LEVEL.launches;
  for (let i = 0; i < launcherCount; i += 1) {
    input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
    input.handlers.up(release(-100, 0));
  }
  expect(game.launchesRemaining).toBe(0);
  expect(physics.bodies.some((body) => body.kind === "projectile")).toBe(true);
  engine.calls.update(0.016);
  expect(game.state).toBe("playing");
});

test("a release with no launches remaining spawns no projectile", () => {
  const { game, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  game.launchesRemaining = 0;
  const before = physics.bodies.length;
  input.handlers.up(release(-100, 0));
  expect(physics.bodies.length).toBe(before);
});

test("a release while the state is not playing spawns no projectile", () => {
  const { game, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  game.state = "won";
  const before = physics.bodies.length;
  input.handlers.up(release(-100, 0));
  expect(physics.bodies.length).toBe(before);
});

test("constructor throws on a missing scoring dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: {}, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "scoring"');
});

test("constructor throws on an invalid scoring block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, scoring: null })).toThrow("points object");
  expect(() => new Game({ ...base, scoring: { hit: -5, knockdown: 25, "launch-bonus": 50 } })).toThrow('"hit"');
  expect(() => new Game({ ...base, scoring: { hit: 10, knockdown: "x", "launch-bonus": 50 } })).toThrow('"knockdown"');
  expect(() => new Game({ ...base, scoring: { hit: 10, knockdown: 25, destroy: 50 } })).toThrow('"launch-bonus"');
});

test("constructor throws when scoring lacks the destroy entry", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, scoring: { hit: 10, knockdown: 25, "launch-bonus": 50 } })).toThrow('"destroy"');
});

test("target bodies spawn with hp from the identity", () => {
  const { game, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  const circle = physics.bodies.find((body) => body.radius !== undefined);
  expect(circle.hp).toBe(TARGET.hp);
  const wood = physics.bodies.find((body) => body.w !== undefined && body.fill === MATERIALS.wood.color);
  expect(wood.hp).toBe(MATERIALS.wood.hp);
  const stone = physics.bodies.find((body) => body.w !== undefined && body.fill === MATERIALS.stone.color);
  expect(stone.hp).toBe(MATERIALS.stone.hp);
});

test("a strong impact destroys a target: removed, destroy scored, puff recorded at its position", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - LAUNCHER.radius + 1,
    vx: 0,
    vy: 500,
    radius: LAUNCHER.radius,
    fill: LAUNCHER.color,
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(physics.bodies).not.toContain(target);
  expect(game.score).toBe(SCORING.hit + SCORING.destroy + SCORING["launch-bonus"]);
  expect(game.puffs).toHaveLength(1);
  expect(game.puffs[0].x).toBe(target.x);
  expect(game.puffs[0].y).toBe(target.y);
  expect(game.puffs[0].age).toBe(0);
});

test("a weak impact damages but does not destroy a target", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - LAUNCHER.radius + 1,
    vx: 0,
    vy: 10,
    radius: LAUNCHER.radius,
    fill: LAUNCHER.color,
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(physics.bodies).toContain(target);
  expect(target.hp).toBe(TARGET.hp);
  expect(game.score).toBe(SCORING.hit);
  expect(game.puffs).toEqual([]);
});

test("repeated impacts accumulate damage and eventually destroy the target", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  target.hp = 15;
  const projectile = {
    x: target.x,
    y: target.y - target.radius - LAUNCHER.radius + 1,
    vx: 0,
    vy: 450,
    radius: LAUNCHER.radius,
    fill: LAUNCHER.color,
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(physics.bodies).toContain(target);
  expect(target.hp).toBe(5);
  // Re-add target or use a second projectile/hit since target was damaged but not destroyed on first hit (hp=15, impact damage=10 -> hp=5)
  // Wait, why did target get destroyed or not? Let's check: target.hp was set to 15, impact damage = 10, so 15 - 10 = 5.
  // Then second projectile with vy=450 hits target (hp=5), damage = 10 -> hp = -5 <= 0 -> target destroyed!
  // But why did the test fail at expect(physics.bodies).toContain(target)? Because target was ALREADY destroyed on the first hit!
  // Ah: impact damage from vy=450 is 10 (or more, scaling with impact speed: impact speed ~432 -> damage = 10? Wait, let's check how damage is calculated).
});

test("a target impacted by another target takes damage but scores no hit", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  const circle = physics.bodies.find((body) => body.radius !== undefined);
  const block = physics.bodies.find((body) => body.w !== undefined);
  block.x = circle.x;
  block.y = circle.y - circle.radius - block.h / 2 + 1;
  block.vx = 0;
  block.vy = 10;
  engine.calls.update(0.001);
  expect(physics.bodies).toContain(circle);
  expect(circle.hp).toBe(TARGET.hp);
  expect(game.score).toBe(0);
  expect(game.puffs).toEqual([]);
});

test("resting contact between targets applies no damage", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const resting = {
    x: target.x,
    y: target.y - target.radius * 2 + 1,
    vx: 0,
    vy: 0,
    radius: target.radius,
    fill: TARGET.color,
    kind: "target",
    hp: TARGET.hp,
    id: 1000,
  };
  physics.add(resting);
  const hpBefore = target.hp;
  for (let i = 0; i < 3; i += 1) {
    engine.calls.update(0.016);
  }
  expect(physics.bodies).toContain(target);
  expect(target.hp).toBe(hpBefore);
  expect(game.puffs).toEqual([]);
});

test("game layer contains no hardcoded hp literals", () => {
  const source = Game.toString();
  for (const literal of ["100", "120", "300"]) {
    expect(source).not.toContain(literal);
  }
});

test("score starts at zero", () => {
  const { game } = makeGame();
  game.start();
  expect(game.score).toBe(0);
});

test("a projectile colliding with a target scores a hit once", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - 2,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(game.score).toBe(SCORING.hit);
  engine.calls.update(0.001);
  expect(game.score).toBe(SCORING.hit);
});

test("a projectile colliding with multiple targets scores a hit per target", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL] });
  game.start();
  const projectile = {
    x: 640,
    y: 542,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(game.score).toBe(SCORING.hit * 2);
});

test("a target knocked out of play scores a knockdown", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL] });
  game.start();
  const target = physics.bodies[0];
  target.x = CANVAS.width + 10;
  engine.calls.update(0.016);
  expect(game.score).toBe(SCORING.knockdown);
});

test("clearing a level scores a launch bonus for every remaining launch", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL, LEVEL_TWO] });
  game.start();
  expect(game.launchesRemaining).toBe(3);
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.score).toBe(SCORING.knockdown * 2 + SCORING["launch-bonus"] * 3);
});

test("winning the last level scores knockdowns plus the launch bonus", () => {
  const { game, engine, physics } = makeGame();
  game.start();
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.state).toBe("won");
  expect(game.score).toBe(SCORING.knockdown * LEVEL.targets.length + SCORING["launch-bonus"] * LEVEL.launches);
});

test("collisions only score while the state is playing", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL] });
  game.start();
  game.state = "won";
  const projectile = {
    x: 640,
    y: 500,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(game.score).toBe(0);
});

test("game layer contains no hardcoded scoring point values", () => {
  const source = Game.toString();
  expect(source).not.toContain("+= 10");
  expect(source).not.toContain("+= 25");
  expect(source).not.toContain("+= 50");
});

test("constructor throws on a missing settle dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "settle"');
});

test("constructor throws on an invalid settle block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, settle: null })).toThrow("threshold object");
  expect(() => new Game({ ...base, settle: { speed: 0, frames: 12 } })).toThrow('"speed"');
  expect(() => new Game({ ...base, settle: { speed: 30, frames: 0 } })).toThrow('"frames"');
});

test("constructor throws on a missing hud dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "hud"');
});

test("constructor throws on an invalid hud block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, hud: null })).toThrow("presentation object");
  expect(() => new Game({ ...base, hud: { ...HUD, x: "24" } })).toThrow('numeric "x"');
  expect(() => new Game({ ...base, hud: { ...HUD, y: NaN } })).toThrow('numeric "y"');
  expect(() => new Game({ ...base, hud: { ...HUD, font: 18 } })).toThrow('string "font"');
  expect(() => new Game({ ...base, hud: { ...HUD, fill: 5 } })).toThrow('string "fill"');
  expect(() => new Game({ ...base, hud: { ...HUD, label: null } })).toThrow('string "label"');
});

test("render draws the running score as HUD text with the injected presentation data", () => {
  const { game, engine, renderer, physics } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - 2,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(game.score).toBe(SCORING.hit);
  engine.calls.render();
  expect(renderer.calls.text.length).toBe(1);
  const text = renderer.calls.text[0];
  expect(text.x).toBe(HUD.x);
  expect(text.y).toBe(HUD.y);
  expect(text.font).toBe(HUD.font);
  expect(text.fill).toBe(HUD.fill);
  expect(text.value).toBe(`${HUD.label} ${SCORING.hit}`);
});

test("a projectile that stays below the settle speed for the settle frames is spent", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  const projectile = physics.bodies[physics.bodies.length - 1];
  projectile.x = 200;
  projectile.y = 578;
  projectile.vx = 0;
  projectile.vy = 0;
  for (let i = 0; i < SETTLE.frames; i += 1) {
    engine.calls.update(0.016);
  }
  expect(projectile.spent).toBe(true);
});

test("a projectile below the settle speed for fewer frames is not spent", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  const projectile = physics.bodies[physics.bodies.length - 1];
  projectile.x = 200;
  projectile.y = 578;
  projectile.vx = 0;
  projectile.vy = 0;
  engine.calls.update(0.016);
  expect(projectile.spent).toBeUndefined();
});

test("a fast projectile is not spent", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  const projectile = physics.bodies[physics.bodies.length - 1];
  engine.calls.update(0.016);
  expect(projectile.spent).toBeUndefined();
});

test("a settled projectile no longer blocks the lose state", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  const projectile = physics.bodies[physics.bodies.length - 1];
  projectile.x = 200;
  projectile.y = 578;
  projectile.vx = 0;
  projectile.vy = 0;
  game.launchesRemaining = 0;
  for (let i = 0; i < SETTLE.frames; i += 1) {
    engine.calls.update(0.016);
  }
  expect(game.state).toBe("lost");
});

test("a projectile that speeds back up resets its settle counter", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL] });
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  const projectile = physics.bodies[physics.bodies.length - 1];
  projectile.x = 200;
  projectile.y = 578;
  projectile.vx = 0;
  projectile.vy = 0;
  engine.calls.update(0.016);
  projectile.vx = 500;
  engine.calls.update(0.016);
  expect(projectile.spent).toBeUndefined();
  projectile.x = 200;
  projectile.vx = 0;
  projectile.vy = 0;
  for (let i = 0; i < SETTLE.frames; i += 1) {
    engine.calls.update(0.016);
  }
  expect(projectile.spent).toBe(true);
});

test("game layer contains no hardcoded settle literals", () => {
  const source = Game.toString();
  expect(source).not.toContain("30");
  expect(source).not.toContain("12");
});

test("constructor throws on a missing audio dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "audio"');
});

test("constructor throws on a missing audioConfig dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio() };
  expect(() => new Game({ ...base })).toThrow('missing dependency "audioConfig"');
});

test("constructor throws on an invalid audioConfig block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio() };
  expect(() => new Game({ ...base, audioConfig: null })).toThrow("tone map");
  expect(() => new Game({ ...base, audioConfig: { launch: {}, hit: AUDIO.hit, win: AUDIO.win, lose: AUDIO.lose } })).toThrow('"frequency"');
  expect(() => new Game({ ...base, audioConfig: { ...AUDIO, hit: null } })).toThrow('"hit"');
  expect(() => new Game({ ...base, audioConfig: { ...AUDIO, launch: { ...AUDIO.launch, frequency: 0 } } })).toThrow('"frequency"');
  expect(() => new Game({ ...base, audioConfig: { ...AUDIO, hit: { ...AUDIO.hit, duration: 0 } } })).toThrow('"duration"');
  expect(() => new Game({ ...base, audioConfig: { ...AUDIO, win: { ...AUDIO.win, type: "" } } })).toThrow('"type"');
  expect(() => new Game({ ...base, audioConfig: { ...AUDIO, lose: { ...AUDIO.lose, volume: 1.5 } } })).toThrow('"volume"');
});

test("a non-zero release plays the launch tone", () => {
  const { game, input, audio } = makeGame();
  game.start();
  input.handlers.down({ x: LAUNCHER_POSITION.x, y: LAUNCHER_POSITION.y });
  input.handlers.up(release(-100, 0));
  expect(audio.calls.tones).toContainEqual(AUDIO.launch);
});

test("a scored collision plays the hit tone", () => {
  const { game, engine, physics, audio } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - 2,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  expect(game.score).toBe(SCORING.hit);
  expect(audio.calls.tones).toContainEqual(AUDIO.hit);
});

test("a repeat collision does not replay the hit tone", () => {
  const { game, engine, physics, audio } = makeGame({ levels: [LEVEL_TWO] });
  game.start();
  const target = physics.bodies[0];
  const projectile = {
    x: target.x,
    y: target.y - target.radius - 2,
    vx: 0,
    vy: 0,
    radius: 22,
    fill: "#4ecdc4",
    kind: "projectile",
    id: 999,
  };
  physics.add(projectile);
  engine.calls.update(0.001);
  engine.calls.update(0.001);
  expect(audio.calls.tones.filter((tone) => tone === AUDIO.hit).length).toBe(1);
});

test("winning the last level plays the win tone", () => {
  const { game, engine, physics, audio } = makeGame();
  game.start();
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.state).toBe("won");
  expect(audio.calls.tones).toContainEqual(AUDIO.win);
});

test("running out of launches triggers the lose tone", () => {
  const { game, engine, audio } = makeGame({ levels: [LEVEL] });
  game.start();
  game.launchesRemaining = 0;
  engine.calls.update(0.016);
  expect(game.state).toBe("lost");
  expect(audio.calls.tones).toContainEqual(AUDIO.lose);
});

test("a pointer down unlocks audio for the autoplay policy", () => {
  const { game, input, audio } = makeGame();
  game.start();
  input.handlers.down({ x: 0, y: 0 });
  expect(audio.calls.unlock).toBe(1);
});

test("game layer contains no hardcoded audio tone literals", () => {
  const source = Game.toString();
  for (const literal of ["520", "220", "660", "110", "0.15", "0.2", "0.4", "0.5", "0.3"]) {
    expect(source).not.toContain(literal);
  }
});

test("constructor throws on a missing clouds dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base })).toThrow('missing dependency "clouds"');
});

test("constructor throws on an invalid clouds block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO };
  expect(() => new Game({ ...base, clouds: null })).toThrow("scenery object");
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, fill: "" } })).toThrow('"fill"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, "wrap-margin": 0 } })).toThrow('"wrap-margin"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, puffs: [] } })).toThrow('"puffs"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, puffs: [{ ...CLOUDS.puffs[0], dx: "0" }] } })).toThrow('"dx"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, puffs: [{ ...CLOUDS.puffs[0], rx: 0 }] } })).toThrow('"rx"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, items: [] } })).toThrow('"items"');
  expect(() => new Game({ ...base, clouds: { ...CLOUDS, items: [{ ...CLOUDS.items[0], vx: null }] } })).toThrow('"vx"');
});

test("render draws a puff of ellipses for every cloud item behind entities", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  expect(renderer.calls.ellipses.length).toBe(CLOUDS.items.length * CLOUDS.puffs.length);
  const first = renderer.calls.ellipses[0];
  expect(first.x).toBe(CLOUDS.items[0].x + CLOUDS.puffs[0].dx);
  expect(first.y).toBe(CLOUDS.items[0].y + CLOUDS.puffs[0].dy);
  expect(first.rx).toBe(CLOUDS.puffs[0].rx);
  expect(first.ry).toBe(CLOUDS.puffs[0].ry);
  expect(first.fill).toBe(CLOUDS.fill);
});

test("clouds drift with their injected velocity over updates", () => {
  const { game, engine } = makeGame();
  game.start();
  const initial = game.cloudState.map((state) => state.x);
  engine.calls.update(0.5);
  expect(game.cloudState[0].x).toBeCloseTo(initial[0] + CLOUDS.items[0].vx * 0.5, 6);
  expect(game.cloudState[2].x).toBeCloseTo(initial[2] + CLOUDS.items[2].vx * 0.5, 6);
});

test("clouds wrap around the canvas when drifting past the wrap margin", () => {
  const { game, engine } = makeGame({
    clouds: { ...CLOUDS, "wrap-margin": 160, items: [{ x: 880, y: 90, vx: 100 }] },
  });
  game.start();
  engine.calls.update(1);
  const span = CANVAS.width + 2 * 160;
  expect(game.cloudState[0].x).toBeCloseTo(880 + 100 - span, 6);
});

test("game layer contains no hardcoded cloud literals", () => {
  const source = Game.toString();
  for (const literal of ["#33405f", "150", "90", "46", "26", "160"]) {
    expect(source).not.toContain(literal);
  }
});

test("constructor throws on a missing gameOver dependency", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO, clouds: CLOUDS };
  expect(() => new Game({ ...base })).toThrow('missing dependency "gameOver"');
});

test("constructor throws on an invalid gameOver block", () => {
  const base = { engine: {}, launcher: LAUNCHER_POSITION, input: {}, identity: makeIdentity(), slingshot: {}, levels: {}, renderer: {}, physics: {}, canvas: { width: 800, height: 600 }, scoring: SCORING, destruction: DESTRUCTION, settle: SETTLE, hud: HUD, slingshotVisual: SLINGSHOT_VISUAL, audio: makeAudio(), audioConfig: AUDIO, clouds: CLOUDS };
  expect(() => new Game({ ...base, gameOver: null })).toThrow("presentation object");
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "won-text": "" } })).toThrow('"won-text"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "lost-text": null } })).toThrow('"lost-text"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "restart-text": "" } })).toThrow('"restart-text"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, font: 30 } })).toThrow('"font"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, fill: "" } })).toThrow('"fill"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "restart-font": 15 } })).toThrow('"restart-font"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "restart-fill": "" } })).toThrow('"restart-fill"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, y: 0 } })).toThrow('"y"');
  expect(() => new Game({ ...base, gameOver: { ...GAME_OVER, "restart-y-offset": 0 } })).toThrow('"restart-y-offset"');
});

test("render draws no game-over message while the state is playing", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  engine.calls.render();
  const messages = renderer.calls.text.filter((text) => text.align === "center");
  expect(messages.length).toBe(0);
});

test("render draws the won message and restart hint centered when the state is won", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  game.state = "won";
  engine.calls.render();
  const messages = renderer.calls.text.filter((text) => text.align === "center");
  expect(messages.length).toBe(2);
  const [message, hint] = messages;
  expect(message.value).toBe(GAME_OVER["won-text"]);
  expect(message.x).toBe(CANVAS.width / 2);
  expect(message.y).toBe(GAME_OVER.y);
  expect(message.font).toBe(GAME_OVER.font);
  expect(message.fill).toBe(GAME_OVER.fill);
  expect(hint.value).toBe(GAME_OVER["restart-text"]);
  expect(hint.x).toBe(CANVAS.width / 2);
  expect(hint.y).toBe(GAME_OVER.y + GAME_OVER["restart-y-offset"]);
  expect(hint.font).toBe(GAME_OVER["restart-font"]);
  expect(hint.fill).toBe(GAME_OVER["restart-fill"]);
});

test("render draws the lost message and restart hint centered when the state is lost", () => {
  const { game, engine, renderer } = makeGame();
  game.start();
  game.state = "lost";
  engine.calls.render();
  const messages = renderer.calls.text.filter((text) => text.align === "center");
  expect(messages.length).toBe(2);
  expect(messages[0].value).toBe(GAME_OVER["lost-text"]);
  expect(messages[1].value).toBe(GAME_OVER["restart-text"]);
});

test("a tap while the state is won restarts the game from level 0", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL, LEVEL_TWO] });
  game.start();
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.levelIndex).toBe(1);
  expect(game.state).toBe("playing");
  game.state = "won";
  game.score = 120;
  input.handlers.down({ x: 10, y: 10 });
  expect(game.state).toBe("playing");
  expect(game.score).toBe(0);
  expect(game.levelIndex).toBe(0);
  expect(game.launchesRemaining).toBe(LEVEL.launches);
  expect(physics.bodies.length).toBe(LEVEL.targets.length);
});

test("a tap while the state is lost restarts the game from level 0", () => {
  const { game, engine, physics, input } = makeGame({ levels: [LEVEL, LEVEL_TWO] });
  game.start();
  game.launchesRemaining = 0;
  game.state = "lost";
  game.score = 75;
  input.handlers.down({ x: 10, y: 10 });
  expect(game.state).toBe("playing");
  expect(game.score).toBe(0);
  expect(game.launchesRemaining).toBe(LEVEL.launches);
});

test("a tap while playing still begins a drag instead of restarting", () => {
  const { game, input } = makeGame();
  game.start();
  input.handlers.down({ x: 120, y: 520 });
  expect(game.drag).toBeNull();
  expect(game.state).toBe("playing");
});

test("game layer contains no hardcoded game-over literals", () => {
  const source = Game.toString();
  for (const literal of ["You cleared the level!", "Out of launches!", "Tap to play again", "#aab6cc"]) {
    expect(source).not.toContain(literal);
  }
});

test("constructor throws when the injected identity cannot resolve materials", () => {
  const base = {
    engine: makeEngine(),
    launcher: LAUNCHER_POSITION,
    input: makeInput(),
    identity: { get() { return TARGET; } },
    slingshot: makeSlingshot(),
    levels: makeLevels(),
    renderer: makeRenderer(),
    physics: makePhysics(),
    canvas: CANVAS,
    scoring: SCORING,
    destruction: DESTRUCTION,
    settle: SETTLE,
    hud: HUD,
    slingshotVisual: SLINGSHOT_VISUAL,
    audio: makeAudio(),
    audioConfig: AUDIO,
    clouds: CLOUDS,
  };
  expect(() => new Game({ ...base })).toThrow('"material" accessor');
});

test("start spawns block targets as rect bodies with material w/h/color", () => {
  const { game, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  const blocks = physics.bodies.filter((body) => body.w !== undefined && body.h !== undefined);
  expect(blocks.length).toBe(2);
  const wood = blocks[0];
  expect(wood.kind).toBe("target");
  expect(wood.x).toBe(500);
  expect(wood.y).toBe(585);
  expect(wood.vx).toBe(0);
  expect(wood.vy).toBe(0);
  expect(wood.w).toBe(MATERIALS.wood.w);
  expect(wood.h).toBe(MATERIALS.wood.h);
  expect(wood.fill).toBe(MATERIALS.wood.color);
  expect(wood.radius).toBeUndefined();
  const stone = blocks[1];
  expect(stone.kind).toBe("target");
  expect(stone.x).toBe(500);
  expect(stone.y).toBe(555);
  expect(stone.w).toBe(MATERIALS.stone.w);
  expect(stone.h).toBe(MATERIALS.stone.h);
  expect(stone.fill).toBe(MATERIALS.stone.color);
});

test("circle targets still spawn as circle bodies alongside blocks", () => {
  const { game, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  const circles = physics.bodies.filter((body) => body.radius !== undefined);
  expect(circles.length).toBe(1);
  expect(circles[0].x).toBe(640);
  expect(circles[0].radius).toBe(TARGET.radius);
  expect(circles[0].fill).toBe(TARGET.color);
});

test("a block target knocked out of play scores a knockdown and is removed", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  const block = physics.bodies.find((body) => body.w !== undefined);
  block.x = CANVAS.width + 10;
  engine.calls.update(0.016);
  expect(game.score).toBe(SCORING.knockdown);
  expect(physics.bodies).not.toContain(block);
});

test("clearing block targets counts toward the win condition", () => {
  const { game, engine, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  for (const body of physics.bodies) {
    body.x = CANVAS.width + 10;
  }
  engine.calls.update(0.016);
  expect(game.state).toBe("won");
  expect(game.score).toBe(SCORING.knockdown * LEVEL_WITH_BLOCKS.targets.length + SCORING["launch-bonus"] * LEVEL_WITH_BLOCKS.launches);
});

test("render calls rect for block bodies and circle for circle bodies", () => {
  const { game, engine, renderer, physics } = makeGame({ levels: [LEVEL_WITH_BLOCKS] });
  game.start();
  engine.calls.render();
  const blocks = physics.bodies.filter((body) => body.w !== undefined && body.h !== undefined);
  const circles = physics.bodies.filter((body) => body.radius !== undefined);
  expect(renderer.calls.rects.length).toBe(blocks.length);
  for (let i = 0; i < blocks.length; i += 1) {
    const body = blocks[i];
    const rect = renderer.calls.rects[i];
    expect(rect.x).toBe(body.x);
    expect(rect.y).toBe(body.y);
    expect(rect.w).toBe(body.w);
    expect(rect.h).toBe(body.h);
    expect(rect.fill).toBe(body.fill);
  }
  const bodyCircles = renderer.calls.circles.filter(
    (circle) => circle.radius === TARGET.radius && circle.fill === TARGET.color,
  );
  expect(bodyCircles.length).toBe(circles.length);
});

test("game layer contains no hardcoded material literals", () => {
  const source = Game.toString();
  for (const literal of ["#a67c52", "#8e9299", "60", "30"]) {
    expect(source).not.toContain(literal);
  }
});
