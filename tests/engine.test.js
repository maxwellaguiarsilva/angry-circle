import { test, expect } from "bun:test";
import { Engine } from "../src/engine/engine.js";

function makeClock() {
  let t = 0;
  return {
    now: () => t,
    advance: (dt) => {
      t += dt;
    },
  };
}

function makeRaf() {
  const queue = [];
  return {
    raf: (callback) => {
      queue.push(callback);
      return queue.length;
    },
    cancel: () => {},
    flush: () => {
      const pending = queue.splice(0);
      for (const callback of pending) {
        callback();
      }
    },
    pending: () => queue.length,
  };
}

function makeEngine({ timestep = 1 / 60, maxFrameTime = 0.25, clock, raf }) {
  const engine = new Engine({
    renderer: { present() {} },
    config: { timestep, "max-frame-time": maxFrameTime },
    raf: raf.raf,
    cancel: raf.cancel,
    now: clock.now,
  });
  let updates = 0;
  let renders = 0;
  engine.onUpdate(() => {
    updates++;
  });
  engine.onRender(() => {
    renders++;
  });
  return { engine, count: () => ({ updates, renders }) };
}

test("runs one update and one render per fixed timestep", () => {
  const clock = makeClock();
  const raf = makeRaf();
  const { engine, count } = makeEngine({ clock, raf });
  engine.start();
  clock.advance(1 / 60);
  raf.flush();
  expect(count()).toEqual({ updates: 1, renders: 1 });
});

test("accumulates sub-timestep frames without extra updates", () => {
  const clock = makeClock();
  const raf = makeRaf();
  const { engine, count } = makeEngine({ clock, raf });
  engine.start();
  clock.advance(1 / 120);
  raf.flush();
  expect(count()).toEqual({ updates: 0, renders: 1 });
  clock.advance(1 / 120);
  raf.flush();
  expect(count()).toEqual({ updates: 1, renders: 2 });
});

test("clamps a large frame time to max-frame-time", () => {
  const clock = makeClock();
  const raf = makeRaf();
  const { engine, count } = makeEngine({ clock, raf });
  engine.start();
  clock.advance(10);
  raf.flush();
  expect(count().updates).toBe(Math.floor(0.25 / (1 / 60)));
});

test("stop prevents further updates", () => {
  const clock = makeClock();
  const raf = makeRaf();
  const { engine, count } = makeEngine({ clock, raf });
  engine.start();
  clock.advance(1 / 60);
  raf.flush();
  engine.stop();
  clock.advance(10);
  raf.flush();
  expect(count()).toEqual({ updates: 1, renders: 1 });
});

test("throws on missing dependencies", () => {
  const config = { timestep: 1 / 60, "max-frame-time": 0.25 };
  expect(() => new Engine({ renderer: {}, config, raf: () => {}, cancel: () => {} })).toThrow(
    'missing dependency "now"',
  );
  expect(() =>
    new Engine({ renderer: {}, config, now: () => 0, cancel: () => {} }),
  ).toThrow('missing dependency "raf"');
  expect(() =>
    new Engine({ renderer: {}, config, now: () => 0, raf: () => {} }),
  ).toThrow('missing dependency "cancel"');
  expect(() => new Engine({ config, raf: () => {}, cancel: () => {}, now: () => 0 })).toThrow(
    'missing dependency "renderer"',
  );
});

test("throws on invalid timing config", () => {
  const deps = { renderer: {}, raf: () => {}, cancel: () => {}, now: () => 0 };
  expect(() => new Engine({ ...deps, config: {} })).toThrow("timestep");
  expect(() =>
    new Engine({ ...deps, config: { timestep: 1 / 60, "max-frame-time": 0 } }),
  ).toThrow("max-frame-time");
});

test("defaults render to renderer.present", () => {
  const clock = makeClock();
  const raf = makeRaf();
  let presents = 0;
  const engine = new Engine({
    renderer: { present() { presents++; } },
    config: { timestep: 1 / 60, "max-frame-time": 0.25 },
    raf: raf.raf,
    cancel: raf.cancel,
    now: clock.now,
  });
  engine.start();
  clock.advance(1 / 60);
  raf.flush();
  expect(presents).toBe(1);
});
