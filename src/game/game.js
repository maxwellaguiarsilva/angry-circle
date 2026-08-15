export class Game {
  constructor({ engine, launcher, input, identity, slingshot, levels, renderer, physics, canvas, scoring, destruction, settle, hud, slingshotVisual, audio, audioConfig, clouds, gameOver }) {
    if (engine === undefined) {
      throw new Error('Game: missing dependency "engine".');
    }
    if (launcher === undefined) {
      throw new Error('Game: missing dependency "launcher".');
    }
    if (input === undefined) {
      throw new Error('Game: missing dependency "input".');
    }
    if (identity === undefined) {
      throw new Error('Game: missing dependency "identity".');
    }
    if (typeof identity.material !== "function") {
      throw new Error('Game: dependency "identity" requires a "material" accessor function.');
    }
    if (slingshot === undefined) {
      throw new Error('Game: missing dependency "slingshot".');
    }
    if (levels === undefined) {
      throw new Error('Game: missing dependency "levels".');
    }
    if (renderer === undefined) {
      throw new Error('Game: missing dependency "renderer".');
    }
    if (physics === undefined) {
      throw new Error('Game: missing dependency "physics".');
    }
    if (canvas === undefined) {
      throw new Error('Game: missing dependency "canvas".');
    }
    if (scoring === undefined) {
      throw new Error('Game: missing dependency "scoring".');
    }
    if (settle === undefined) {
      throw new Error('Game: missing dependency "settle".');
    }
    if (destruction === undefined) {
      throw new Error('Game: missing dependency "destruction".');
    }
    if (hud === undefined) {
      throw new Error('Game: missing dependency "hud".');
    }
    if (slingshotVisual === undefined) {
      throw new Error('Game: missing dependency "slingshotVisual".');
    }
    if (audio === undefined) {
      throw new Error('Game: missing dependency "audio".');
    }
    if (audioConfig === undefined) {
      throw new Error('Game: missing dependency "audioConfig".');
    }
    if (typeof canvas.width !== "number" || !(canvas.width > 0)) {
      throw new Error('Game: dependency "canvas" requires a positive numeric "width".');
    }
    if (typeof canvas.height !== "number" || !(canvas.height > 0)) {
      throw new Error('Game: dependency "canvas" requires a positive numeric "height".');
    }
    if (typeof launcher.x !== "number" || !Number.isFinite(launcher.x)) {
      throw new Error('Game: dependency "launcher" requires a numeric "x".');
    }
    if (typeof launcher.y !== "number" || !Number.isFinite(launcher.y)) {
      throw new Error('Game: dependency "launcher" requires a numeric "y".');
    }
    this.validateScoring(scoring);
    this.validateDestruction(destruction);
    this.validateSettle(settle);
    this.validateHud(hud);
    this.validateSlingshotVisual(slingshotVisual);
    this.validateAudio(audioConfig);
    if (clouds === undefined) {
      throw new Error('Game: missing dependency "clouds".');
    }
    this.validateClouds(clouds);
    if (gameOver === undefined) {
      throw new Error('Game: missing dependency "gameOver".');
    }
    this.validateGameOver(gameOver);
    this.engine = engine;
    this.launcher = launcher;
    this.input = input;
    this.identity = identity;
    this.slingshot = slingshot;
    this.levels = levels;
    this.renderer = renderer;
    this.physics = physics;
    this.canvas = canvas;
    this.scoring = scoring;
    this.destruction = destruction;
    this.settle = settle;
    this.hud = hud;
    this.slingshotVisual = slingshotVisual;
    this.audio = audio;
    this.audioConfig = audioConfig;
    this.clouds = clouds;
    this.gameOver = gameOver;
    this.cloudState = clouds.items.map((item) => ({ x: item.x }));
    this.drag = null;
    this.grabbed = false;
    this.launch = null;
    this.levelIndex = null;
    this.launchesRemaining = null;
    this.score = 0;
    this.scoredHits = new Set();
    this.puffs = [];
    this.nextBodyId = 0;
    this.state = "playing";
    input
      .onDown((press) => {
        if (this.state === "won" || this.state === "lost") {
          this.restart();
          return;
        }
        this.grabbed = this.slingshot.isGrab(this.launcher, press);
        this.drag = null;
        this.audio.unlock();
      })
      .onMove((state) => {
        if (!this.grabbed) {
          return;
        }
        this.drag = this.slingshot.clampPouch(this.launcher, { x: state.x, y: state.y });
      })
      .onUp((release) => {
        const grabbed = this.grabbed;
        this.grabbed = false;
        this.drag = null;
        if (!grabbed || !this.canLaunch()) {
          return;
        }
        const pouch = this.slingshot.clampPouch(this.launcher, { x: release.x, y: release.y });
        const dx = pouch.x - this.launcher.x;
        const dy = pouch.y - this.launcher.y;
        if (dx !== 0 || dy !== 0) {
          const anchoredRelease = { ...release, x: pouch.x, y: pouch.y, dx, dy };
          this.launch = this.slingshot.launch(anchoredRelease);
          this.spawnProjectile(anchoredRelease);
        }
      });
  }

  start() {
    this.physics.onCollision(({ a, b, impact }) => {
      this.handleCollision({ a, b, impact });
    });
    this.engine
      .onUpdate((dt) => {
        this.physics.step(dt);
        this.advanceClouds(dt);
        this.evaluateState();
      })
      .onRender(() => {
        this.render();
      });
    this.loadLevel(0);
    this.input.attach();
    this.engine.start();
  }

  loadLevel(index) {
    const level = this.levels.get(index);
    this.physics.clear();
    const target = this.identity.get("target");
    for (const position of level.targets) {
      if (position.shape === "block") {
        const material = this.identity.material(position.material);
        this.physics.add({
          x: position.x,
          y: position.y,
          vx: 0,
          vy: 0,
          w: material.w,
          h: material.h,
          fill: material.color,
          kind: "target",
          hp: material.hp,
          id: this.nextBodyId,
        });
      } else {
        this.physics.add({
          x: position.x,
          y: position.y,
          vx: 0,
          vy: 0,
          radius: target.radius,
          fill: target.color,
          kind: "target",
          hp: target.hp,
          id: this.nextBodyId,
        });
      }
      this.nextBodyId += 1;
    }
    this.levelIndex = index;
    this.launchesRemaining = level.launches;
    this.scoredHits = new Set();
    this.puffs = [];
    this.state = "playing";
  }

  restart() {
    this.score = 0;
    this.loadLevel(0);
  }

  validateScoring(scoring) {
    if (scoring === null || typeof scoring !== "object") {
      throw new Error('Game: dependency "scoring" requires a points object.');
    }
    for (const key of ["hit", "knockdown", "destroy", "launch-bonus"]) {
      if (typeof scoring[key] !== "number" || !(scoring[key] >= 0)) {
        throw new Error(`Game: dependency "scoring" requires a non-negative numeric "${key}".`);
      }
    }
  }

  validateDestruction(destruction) {
    if (destruction === null || typeof destruction !== "object") {
      throw new Error('Game: dependency "destruction" requires a tuning object.');
    }
    if (typeof destruction["min-impact-damage"] !== "number" || !(destruction["min-impact-damage"] > 0)) {
      throw new Error('Game: dependency "destruction" requires a positive numeric "min-impact-damage".');
    }
  }

  validateSettle(settle) {
    if (settle === null || typeof settle !== "object") {
      throw new Error('Game: dependency "settle" requires a threshold object.');
    }
    if (typeof settle.speed !== "number" || !(settle.speed > 0)) {
      throw new Error('Game: dependency "settle" requires a positive numeric "speed".');
    }
    if (!Number.isInteger(settle.frames) || !(settle.frames > 0)) {
      throw new Error('Game: dependency "settle" requires a positive integer "frames".');
    }
  }

  validateHud(hud) {
    if (hud === null || typeof hud !== "object") {
      throw new Error('Game: dependency "hud" requires a presentation object.');
    }
    if (typeof hud.x !== "number" || !Number.isFinite(hud.x)) {
      throw new Error('Game: dependency "hud" requires a numeric "x".');
    }
    if (typeof hud.y !== "number" || !Number.isFinite(hud.y)) {
      throw new Error('Game: dependency "hud" requires a numeric "y".');
    }
    if (typeof hud.font !== "string") {
      throw new Error('Game: dependency "hud" requires a string "font".');
    }
    if (typeof hud.fill !== "string") {
      throw new Error('Game: dependency "hud" requires a string "fill".');
    }
    if (typeof hud.label !== "string") {
      throw new Error('Game: dependency "hud" requires a string "label".');
    }
  }

  validateSlingshotVisual(slingshotVisual) {
    if (slingshotVisual === null || typeof slingshotVisual !== "object") {
      throw new Error('Game: dependency "slingshotVisual" requires a visual object.');
    }
    for (const key of ["band-color", "frame-color", "pouch-color"]) {
      if (typeof slingshotVisual[key] !== "string" || slingshotVisual[key].length === 0) {
        throw new Error(`Game: dependency "slingshotVisual" requires a non-empty string "${key}".`);
      }
    }
    for (const key of ["band-width", "frame-width", "frame-base-offset-y", "frame-split-offset-y", "tine-offset-x", "tine-offset-y", "pouch-radius"]) {
      if (typeof slingshotVisual[key] !== "number" || !(slingshotVisual[key] > 0)) {
        throw new Error(`Game: dependency "slingshotVisual" requires a positive numeric "${key}".`);
      }
    }
  }

  validateAudio(audioConfig) {
    if (audioConfig === null || typeof audioConfig !== "object") {
      throw new Error('Game: dependency "audioConfig" requires a tone map object.');
    }
    for (const key of ["launch", "hit", "win", "lose"]) {
      const tone = audioConfig[key];
      if (tone === null || typeof tone !== "object") {
        throw new Error(`Game: dependency "audioConfig" requires a tone object for "${key}".`);
      }
      if (typeof tone.frequency !== "number" || !(tone.frequency > 0)) {
        throw new Error(`Game: dependency "audioConfig.${key}" requires a positive numeric "frequency".`);
      }
      if (typeof tone.duration !== "number" || !(tone.duration > 0)) {
        throw new Error(`Game: dependency "audioConfig.${key}" requires a positive numeric "duration".`);
      }
      if (typeof tone.type !== "string" || tone.type.length === 0) {
        throw new Error(`Game: dependency "audioConfig.${key}" requires a non-empty string "type".`);
      }
      if (typeof tone.volume !== "number" || !(tone.volume > 0) || tone.volume > 1) {
        throw new Error(`Game: dependency "audioConfig.${key}" requires a "volume" in (0, 1].`);
      }
    }
  }

  validateClouds(clouds) {
    if (clouds === null || typeof clouds !== "object") {
      throw new Error('Game: dependency "clouds" requires a scenery object.');
    }
    if (typeof clouds.fill !== "string" || clouds.fill.length === 0) {
      throw new Error('Game: dependency "clouds" requires a non-empty string "fill".');
    }
    if (typeof clouds["wrap-margin"] !== "number" || !(clouds["wrap-margin"] > 0)) {
      throw new Error('Game: dependency "clouds" requires a positive numeric "wrap-margin".');
    }
    if (!Array.isArray(clouds.puffs) || clouds.puffs.length === 0) {
      throw new Error('Game: dependency "clouds" requires a non-empty "puffs" array.');
    }
    for (const puff of clouds.puffs) {
      if (puff === null || typeof puff !== "object") {
        throw new Error('Game: dependency "clouds.puffs" requires puff objects.');
      }
      for (const key of ["dx", "dy"]) {
        if (typeof puff[key] !== "number" || !Number.isFinite(puff[key])) {
          throw new Error(`Game: dependency "clouds.puffs" requires a numeric "${key}".`);
        }
      }
      for (const key of ["rx", "ry"]) {
        if (typeof puff[key] !== "number" || !(puff[key] > 0)) {
          throw new Error(`Game: dependency "clouds.puffs" requires a positive numeric "${key}".`);
        }
      }
    }
    if (!Array.isArray(clouds.items) || clouds.items.length === 0) {
      throw new Error('Game: dependency "clouds" requires a non-empty "items" array.');
    }
    for (const item of clouds.items) {
      if (item === null || typeof item !== "object") {
        throw new Error('Game: dependency "clouds.items" requires item objects.');
      }
      for (const key of ["x", "y", "vx"]) {
        if (typeof item[key] !== "number" || !Number.isFinite(item[key])) {
          throw new Error(`Game: dependency "clouds.items" requires a numeric "${key}".`);
        }
      }
    }
  }

  validateGameOver(gameOver) {
    if (gameOver === null || typeof gameOver !== "object") {
      throw new Error('Game: dependency "gameOver" requires a presentation object.');
    }
    for (const key of ["won-text", "lost-text", "restart-text"]) {
      if (typeof gameOver[key] !== "string" || gameOver[key].length === 0) {
        throw new Error(`Game: dependency "gameOver" requires a non-empty string "${key}".`);
      }
    }
    for (const key of ["font", "fill", "restart-font", "restart-fill"]) {
      if (typeof gameOver[key] !== "string" || gameOver[key].length === 0) {
        throw new Error(`Game: dependency "gameOver" requires a non-empty string "${key}".`);
      }
    }
    if (typeof gameOver.y !== "number" || !(gameOver.y > 0)) {
      throw new Error('Game: dependency "gameOver" requires a positive numeric "y".');
    }
    if (typeof gameOver["restart-y-offset"] !== "number" || !(gameOver["restart-y-offset"] > 0)) {
      throw new Error('Game: dependency "gameOver" requires a positive numeric "restart-y-offset".');
    }
  }

  canLaunch() {
    return this.state === "playing" && this.launchesRemaining > 0;
  }
  spawnProjectile(release) {
    if (!this.canLaunch()) {
      return;
    }
    if (release === undefined || release === null || typeof release !== "object") {
      throw new Error('Game: missing dependency "release".');
    }
    if (typeof release.x !== "number" || typeof release.y !== "number") {
      throw new Error('Game: invalid release position (expected numeric "x" and "y").');
    }
    const launcher = this.identity.get("launcher");
    this.physics.add({
      x: release.x,
      y: release.y,
      vx: this.launch.vx,
      vy: this.launch.vy,
      radius: launcher.radius,
      fill: launcher.color,
      kind: "projectile",
      id: this.nextBodyId,
    });
    this.nextBodyId += 1;
    this.launchesRemaining -= 1;
    this.audio.tone(this.audioConfig.launch);
  }

  handleCollision({ a, b, impact }) {
    if (this.state !== "playing") {
      return;
    }
    const projectile = a.kind === "projectile" ? a : b.kind === "projectile" ? b : null;
    if (projectile !== null) {
      const target = a.kind === "target" ? a : b.kind === "target" ? b : null;
      if (target !== null) {
        const pairKey = `${projectile.id}-${target.id}`;
        if (!this.scoredHits.has(pairKey)) {
          this.scoredHits.add(pairKey);
          this.score += this.scoring.hit;
          this.audio.tone(this.audioConfig.hit);
        }
      }
    }
    this.applyImpactDamage(a, impact);
    this.applyImpactDamage(b, impact);
  }

  applyImpactDamage(body, impact) {
    if (body.kind !== "target" || typeof body.hp !== "number") {
      return;
    }
    if (impact < this.destruction["min-impact-damage"]) {
      return;
    }
    body.hp -= impact;
    if (body.hp <= 0) {
      this.destroyTarget(body);
    }
  }

  destroyTarget(body) {
    if (!this.physics.bodies.includes(body)) {
      return;
    }
    this.physics.remove(body);
    this.score += this.scoring.destroy;
    this.puffs.push({ x: body.x, y: body.y, age: 0 });
  }

  isOutOfPlay(body) {
    return body.x < 0 || body.x > this.canvas.width || body.y < 0 || body.y > this.canvas.height;
  }

  countBodiesByKind(kind) {
    let count = 0;
    for (const body of this.physics.bodies) {
      if (body.kind === kind) {
        count += 1;
      }
    }
    return count;
  }

  countProjectilesInPlay() {
    let count = 0;
    for (const body of this.physics.bodies) {
      if (body.kind === "projectile" && !body.spent) {
        count += 1;
      }
    }
    return count;
  }

  markSettledProjectiles() {
    for (const body of this.physics.bodies) {
      if (body.kind !== "projectile" || body.spent) {
        continue;
      }
      const speed = Math.hypot(body.vx, body.vy);
      if (speed < this.settle.speed) {
        body.settleFrames = (body.settleFrames ?? 0) + 1;
        if (body.settleFrames >= this.settle.frames) {
          body.spent = true;
        }
      } else {
        body.settleFrames = 0;
      }
    }
  }

  evaluateState() {
    if (this.state !== "playing") {
      return;
    }
    this.markSettledProjectiles();
    const outOfPlay = this.physics.bodies.filter((body) => this.isOutOfPlay(body));
    for (const body of outOfPlay) {
      if (body.kind === "target") {
        this.score += this.scoring.knockdown;
      }
      this.physics.remove(body);
    }
    if (this.countBodiesByKind("target") === 0) {
      this.score += this.launchesRemaining * this.scoring["launch-bonus"];
      if (this.levelIndex + 1 < this.levels.count()) {
        this.loadLevel(this.levelIndex + 1);
      } else {
        this.state = "won";
        this.audio.tone(this.audioConfig.win);
      }
      return;
    }
    if (this.launchesRemaining === 0 && this.countProjectilesInPlay() === 0) {
      this.state = "lost";
      this.audio.tone(this.audioConfig.lose);
    }
  }

  advanceClouds(dt) {
    const margin = this.clouds["wrap-margin"];
    const span = this.canvas.width + 2 * margin;
    for (let i = 0; i < this.clouds.items.length; i += 1) {
      const state = this.cloudState[i];
      state.x += this.clouds.items[i].vx * dt;
      if (state.x > this.canvas.width + margin) {
        state.x -= span;
      } else if (state.x < -margin) {
        state.x += span;
      }
    }
  }

  renderClouds() {
    const clouds = this.clouds;
    for (let i = 0; i < clouds.items.length; i += 1) {
      const item = clouds.items[i];
      const x = this.cloudState[i].x;
      for (const puff of clouds.puffs) {
        this.renderer.ellipse({
          x: x + puff.dx,
          y: item.y + puff.dy,
          rx: puff.rx,
          ry: puff.ry,
          fill: clouds.fill,
        });
      }
    }
  }

  slingshotGeometry() {
    const visual = this.slingshotVisual;
    const x = this.launcher.x;
    const y = this.launcher.y;
    const tipY = y - visual["tine-offset-y"];
    return {
      base: { x, y: y + visual["frame-base-offset-y"] },
      split: { x, y: y + visual["frame-split-offset-y"] },
      leftTip: { x: x - visual["tine-offset-x"], y: tipY },
      rightTip: { x: x + visual["tine-offset-x"], y: tipY },
    };
  }

  renderSlingshotFrame() {
    const visual = this.slingshotVisual;
    const g = this.slingshotGeometry();
    const frame = { color: visual["frame-color"], width: visual["frame-width"] };
    this.renderer.line({ x1: g.base.x, y1: g.base.y, x2: g.split.x, y2: g.split.y, ...frame });
    this.renderer.line({ x1: g.split.x, y1: g.split.y, x2: g.leftTip.x, y2: g.leftTip.y, ...frame });
    this.renderer.line({ x1: g.split.x, y1: g.split.y, x2: g.rightTip.x, y2: g.rightTip.y, ...frame });
  }

  renderSlingshotBands(pouchX, pouchY) {
    const visual = this.slingshotVisual;
    const g = this.slingshotGeometry();
    const band = { color: visual["band-color"], width: visual["band-width"] };
    this.renderer.line({ x1: g.leftTip.x, y1: g.leftTip.y, x2: pouchX, y2: pouchY, ...band });
    this.renderer.line({ x1: g.rightTip.x, y1: g.rightTip.y, x2: pouchX, y2: pouchY, ...band });
  }

  render() {
    this.renderer.present();
    this.renderClouds();
    const launcher = this.identity.get("launcher");
    this.renderSlingshotFrame();
    const dragging = this.drag !== null;
    const loaded = dragging || this.canLaunch();
    if (loaded) {
      const pouchX = dragging ? this.drag.x : this.launcher.x;
      const pouchY = dragging ? this.drag.y : this.launcher.y;
      this.renderSlingshotBands(pouchX, pouchY);
      this.renderer.circle({
        x: pouchX,
        y: pouchY,
        radius: this.slingshotVisual["pouch-radius"],
        fill: this.slingshotVisual["pouch-color"],
      });
      this.renderer.circle({
        x: pouchX,
        y: pouchY,
        radius: launcher.radius,
        fill: launcher.color,
      });
    }
    for (const body of this.physics.bodies) {
      if (this.physics.isRect(body)) {
        this.renderer.rect({
          x: body.x,
          y: body.y,
          w: body.w,
          h: body.h,
          fill: body.fill,
        });
      } else {
        this.renderer.circle({
          x: body.x,
          y: body.y,
          radius: body.radius,
          fill: body.fill,
        });
      }
    }
    this.renderer.text({
      x: this.hud.x,
      y: this.hud.y,
      value: `${this.hud.label} ${this.score}`,
      font: this.hud.font,
      fill: this.hud.fill,
    });
    if (this.state === "won" || this.state === "lost") {
      this.renderGameOver();
    }
  }

  renderGameOver() {
    const message = this.state === "won" ? this.gameOver["won-text"] : this.gameOver["lost-text"];
    const x = this.canvas.width / 2;
    this.renderer.text({
      x,
      y: this.gameOver.y,
      value: message,
      font: this.gameOver.font,
      fill: this.gameOver.fill,
      align: "center",
    });
    this.renderer.text({
      x,
      y: this.gameOver.y + this.gameOver["restart-y-offset"],
      value: this.gameOver["restart-text"],
      font: this.gameOver["restart-font"],
      fill: this.gameOver["restart-fill"],
      align: "center",
    });
  }
}
