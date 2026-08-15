export class Engine {
  constructor({ renderer, config, raf, cancel, now }) {
    if (renderer === undefined) {
      throw new Error('Engine: missing dependency "renderer".');
    }
    if (raf === undefined) {
      throw new Error('Engine: missing dependency "raf" (frame scheduler).');
    }
    if (cancel === undefined) {
      throw new Error('Engine: missing dependency "cancel" (frame canceller).');
    }
    if (now === undefined) {
      throw new Error('Engine: missing dependency "now" (clock).');
    }
    this.validateTiming(config);
    this.renderer = renderer;
    this.raf = raf;
    this.cancel = cancel;
    this.now = now;
    this.timestep = config.timestep;
    this.maxFrameTime = config["max-frame-time"];
    this.updateCallback = null;
    this.renderCallback = () => renderer.present();
    this.running = false;
    this.accumulator = 0;
    this.lastTime = null;
    this.frameHandle = null;
  }

  validateTiming(config) {
    if (config === null || typeof config !== "object") {
      throw new Error("Engine: missing config with timing tunables.");
    }
    if (typeof config.timestep !== "number" || !(config.timestep > 0)) {
      throw new Error('Engine: config "timestep" must be a positive number (seconds per simulation step).');
    }
    if (typeof config["max-frame-time"] !== "number" || !(config["max-frame-time"] > 0)) {
      throw new Error('Engine: config "max-frame-time" must be a positive number (seconds).');
    }
  }

  onUpdate(callback) {
    if (typeof callback !== "function") {
      throw new Error("Engine: onUpdate expects a function.");
    }
    this.updateCallback = callback;
    return this;
  }

  onRender(callback) {
    if (typeof callback !== "function") {
      throw new Error("Engine: onRender expects a function.");
    }
    this.renderCallback = callback;
    return this;
  }

  start() {
    if (this.running) {
      return this;
    }
    this.running = true;
    this.accumulator = 0;
    this.lastTime = this.now();
    this.frameHandle = this.raf(() => this.frame());
    return this;
  }

  stop() {
    if (!this.running) {
      return this;
    }
    this.running = false;
    this.cancel(this.frameHandle);
    this.frameHandle = null;
    return this;
  }

  frame() {
    if (!this.running) {
      return;
    }
    const current = this.now();
    let elapsed = current - this.lastTime;
    this.lastTime = current;
    if (elapsed < 0) {
      elapsed = 0;
    }
    if (elapsed > this.maxFrameTime) {
      elapsed = this.maxFrameTime;
    }
    this.accumulator += elapsed;
    while (this.accumulator >= this.timestep) {
      if (this.updateCallback !== null) {
        this.updateCallback(this.timestep);
      }
      this.accumulator -= this.timestep;
    }
    this.renderCallback();
    this.frameHandle = this.raf(() => this.frame());
  }
}
