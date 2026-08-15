import { DataLoader } from "./data/loader.js";
import { CanvasRenderer } from "./engine/renderer.js";
import { Engine } from "./engine/engine.js";
import { PointerInput } from "./engine/input.js";
import { Physics } from "./engine/physics.js";
import { AudioSynth } from "./engine/audio.js";
import { CircleIdentity } from "./game/identity.js";
import { Slingshot } from "./game/slingshot.js";
import { Levels } from "./game/levels.js";
import { Game } from "./game/game.js";

async function boot() {
  const data = new DataLoader();
  await data.load("data/boot.json");
  await data.load("data/identity.json");
  await data.load("data/levels.json");
  const canvasConfig = data.get("data/boot.json", "canvas");
  const timingConfig = data.get("data/boot.json", "timing");
  const launcherConfig = data.get("data/boot.json", "launcher");
  const slingshotConfig = data.get("data/boot.json", "slingshot");
  const slingshotVisualConfig = data.get("data/boot.json", "slingshot-visual");
  const physicsBlock = data.get("data/boot.json", "physics");
  const scoringConfig = data.get("data/boot.json", "scoring");
  const destructionConfig = data.get("data/boot.json", "destruction");
  const settleConfig = data.get("data/boot.json", "settle");
  const hudConfig = data.get("data/boot.json", "hud");
  const gameOverConfig = data.get("data/boot.json", "game-over");
  const audioConfig = data.get("data/boot.json", "audio");
  const cloudsConfig = data.get("data/boot.json", "clouds");

  const canvas = document.getElementById("game");
  if (canvas === null) {
    throw new Error('main: <canvas id="game"> not found in the document.');
  }

  const renderer = new CanvasRenderer({ canvas, config: canvasConfig });
  const engine = new Engine({
    renderer,
    config: timingConfig,
    raf: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
    now: () => performance.now() / 1000,
  });
  const input = new PointerInput({
    target: canvas,
    getPosition: (event) => ({ x: event.offsetX, y: event.offsetY }),
  });
  const physics = new Physics({
    config: {
      ...physicsBlock,
      "ground-y": canvasConfig.height,
    },
  });
  const identity = new CircleIdentity({ data, source: "data/identity.json" });
  const slingshot = new Slingshot({ config: slingshotConfig });
  const materials = data.get("data/identity.json", "materials");
  const levels = new Levels({ data, source: "data/levels.json", materials });
  const audio = new AudioSynth({ context: new AudioContext() });
  const game = new Game({
    engine,
    launcher: launcherConfig,
    input,
    identity,
    slingshot,
    levels,
    renderer,
    physics,
    canvas: canvasConfig,
    scoring: scoringConfig,
    destruction: destructionConfig,
    settle: settleConfig,
    hud: hudConfig,
    slingshotVisual: slingshotVisualConfig,
    audio,
    audioConfig,
    clouds: cloudsConfig,
    gameOver: gameOverConfig,
  });
  game.start();
}

boot().catch((error) => {
  const message = `Boot failed: ${error.message}`;
  console.error(message);
  const pre = document.createElement("pre");
  pre.textContent = message;
  document.body.appendChild(pre);
  throw error;
});
