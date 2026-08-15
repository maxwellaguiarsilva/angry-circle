import { test, expect } from "bun:test";
import { Physics } from "../src/engine/physics.js";

const CONFIG = { gravity: 980, restitution: 0.6, density: 0.01, "solver-iterations": 4 };

function makePhysics(config = CONFIG) {
  return new Physics({ config });
}

function body({ x, y, vx = 0, vy = 0, radius = 10 }) {
  return { x, y, vx, vy, radius };
}

function rectBody({ x, y, vx = 0, vy = 0, w, h }) {
  return { x, y, vx, vy, w, h };
}

test("gravity integrates velocity and position downward over a step", () => {
  const physics = makePhysics();
  const falling = body({ x: 0, y: 0 });
  physics.add(falling);
  physics.step(0.016);
  expect(falling.vy).toBeCloseTo(CONFIG.gravity * 0.016, 5);
  expect(falling.y).toBeCloseTo(CONFIG.gravity * 0.016 * 0.016, 5);
});

test("velocity tunables come from config, none hardcoded", () => {
  const config = { gravity: 100, restitution: 0, density: 0.02, "solver-iterations": 1 };
  const physics = makePhysics(config);
  const falling = body({ x: 0, y: 0 });
  physics.add(falling);
  physics.step(0.1);
  expect(falling.vy).toBeCloseTo(100 * 0.1, 5);
  expect(physics.density).toBe(0.02);
});

test("head-on collision transfers momentum with restitution", () => {
  const physics = makePhysics();
  const a = body({ x: 0, y: 0, vx: 10, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  physics.step(0.001);
  expect(b.vx).toBeGreaterThan(0);
  expect(a.vx).toBeLessThan(10);
  const vSeparation = b.vx - a.vx;
  expect(vSeparation).toBeCloseTo(10 * CONFIG.restitution, 5);
});

test("collision separates overlapping circles", () => {
  const physics = makePhysics();
  const a = body({ x: 0, y: 0, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  physics.step(0.001);
  const distance = Math.hypot(a.x - b.x, a.y - b.y);
  expect(distance).toBeGreaterThanOrEqual(a.radius + b.radius - 0.001);
});

test("momentum transfers through a chain of touching circles", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const launched = body({ x: -20, y: 0, vx: 80, radius: 10 });
  const target1 = body({ x: 0, y: 0, radius: 10 });
  const target2 = body({ x: 20, y: 0, radius: 10 });
  physics.add(launched);
  physics.add(target1);
  physics.add(target2);
  for (let i = 0; i < 100; i++) {
    physics.step(0.005);
  }
  expect(target1.vx).toBeGreaterThan(0);
  expect(target2.vx).toBeGreaterThan(0);
  expect(target1.x).toBeGreaterThan(0);
  expect(target2.x).toBeGreaterThan(0);
});

test("add validates body shape", () => {
  const physics = makePhysics();
  expect(() => physics.add(null)).toThrow("body object");
  expect(() => physics.add({ y: 0, vx: 0, vy: 0, radius: 10 })).toThrow("numeric x and y");
  expect(() => physics.add({ x: 0, y: 0, radius: 10 })).toThrow("numeric vx and vy");
  expect(() => physics.add({ x: 0, y: 0, vx: 0, vy: 0, radius: -1 })).toThrow("radius");
});

test("step validates dt", () => {
  const physics = makePhysics();
  expect(() => physics.step(0)).toThrow("positive dt");
});

test("constructor throws on missing config", () => {
  expect(() => new Physics({})).toThrow("config");
});

test("constructor throws on invalid tunables", () => {
  expect(() => makePhysics({ ...CONFIG, gravity: -1 })).toThrow("gravity");
  expect(() => makePhysics({ ...CONFIG, restitution: 2 })).toThrow("restitution");
  expect(() => makePhysics({ ...CONFIG, density: 0 })).toThrow("density");
  expect(() => makePhysics({ ...CONFIG, "solver-iterations": 0 })).toThrow("solver-iterations");
});

test("with ground-y a dropped body comes to rest at groundY - radius", () => {
  const physics = makePhysics({ ...CONFIG, "ground-y": 100 });
  const falling = body({ x: 0, y: 50 });
  physics.add(falling);
  for (let i = 0; i < 200; i++) {
    physics.step(0.016);
  }
  expect(falling.y).toBeCloseTo(100 - falling.radius, 5);
  expect(Math.abs(falling.vy)).toBeLessThan(1);
});

test("ground plane reflects a falling impact velocity with restitution", () => {
  const physics = makePhysics({ ...CONFIG, "ground-y": 100 });
  const dt = 0.016;
  const falling = body({ x: 0, y: 90, vy: 50 });
  physics.add(falling);
  physics.step(dt);
  expect(falling.y).toBe(100 - falling.radius);
  const impactSpeed = 50 + CONFIG.gravity * dt;
  expect(falling.vy).toBeCloseTo(-impactSpeed * CONFIG.restitution, 5);
});

test("without ground-y a body falls unbounded", () => {
  const physics = makePhysics();
  const falling = body({ x: 0, y: 0 });
  physics.add(falling);
  for (let i = 0; i < 100; i++) {
    physics.step(0.016);
  }
  expect(falling.y).toBeGreaterThan(1000);
});

test("with right-x a body moving right is kept inside and reflects with restitution", () => {
  const physics = makePhysics({ ...CONFIG, "right-x": 100, "ground-y": 200 });
  const moving = body({ x: 90, y: 0, vx: 100 });
  physics.add(moving);
  physics.step(0.001);
  expect(moving.x).toBeLessThanOrEqual(100 - moving.radius);
  expect(moving.vx).toBeLessThanOrEqual(0);
  expect(moving.vx).toBeCloseTo(-100 * CONFIG.restitution, 5);
});

test("with left-x a body moving left is kept inside and reflects with restitution", () => {
  const physics = makePhysics({ ...CONFIG, "left-x": 0, "ground-y": 200 });
  const moving = body({ x: 10, y: 0, vx: -100 });
  physics.add(moving);
  physics.step(0.001);
  expect(moving.x).toBeGreaterThanOrEqual(0 + moving.radius);
  expect(moving.vx).toBeGreaterThanOrEqual(0);
  expect(moving.vx).toBeCloseTo(100 * CONFIG.restitution, 5);
});

test("with both walls a bouncing body never leaves the play field", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0, "left-x": 0, "right-x": 200 });
  const moving = body({ x: 50, y: 0, vx: 150, radius: 5 });
  physics.add(moving);
  for (let i = 0; i < 200; i++) {
    physics.step(0.005);
  }
  expect(moving.x).toBeGreaterThanOrEqual(0 + moving.radius);
  expect(moving.x).toBeLessThanOrEqual(200 - moving.radius);
});

test("without horizontal walls a body moves unbounded", () => {
  const physics = makePhysics();
  const moving = body({ x: 0, y: 0, vx: 1000, vy: 0 });
  physics.add(moving);
  for (let i = 0; i < 100; i++) {
    physics.step(0.016);
  }
  expect(moving.x).toBeGreaterThan(1000);
});

test("constructor throws when left-x or right-x is not a finite number", () => {
  expect(() => makePhysics({ ...CONFIG, "left-x": "wall" })).toThrow("left-x");
  expect(() => makePhysics({ ...CONFIG, "left-x": Infinity })).toThrow("left-x");
  expect(() => makePhysics({ ...CONFIG, "right-x": "wall" })).toThrow("right-x");
  expect(() => makePhysics({ ...CONFIG, "right-x": Infinity })).toThrow("right-x");
});

test("clear empties all bodies", () => {
  const physics = makePhysics();
  physics.add(body({ x: 0, y: 0 }));
  physics.add(body({ x: 1, y: 1 }));
  expect(physics.bodies.length).toBe(2);
  physics.clear();
  expect(physics.bodies.length).toBe(0);
});

test("remove deletes the exact body by identity", () => {
  const physics = makePhysics();
  const a = body({ x: 0, y: 0 });
  const b = body({ x: 1, y: 1 });
  physics.add(a);
  physics.add(b);
  physics.remove(a);
  expect(physics.bodies).toEqual([b]);
});

test("remove is chainable and removes only the given instance", () => {
  const physics = makePhysics();
  const a = body({ x: 0, y: 0 });
  const b = body({ x: 1, y: 1 });
  physics.add(a);
  physics.add(b);
  physics.remove(a).remove(b);
  expect(physics.bodies.length).toBe(0);
});

test("remove throws when the body is not present in the simulation", () => {
  const physics = makePhysics();
  const a = body({ x: 0, y: 0 });
  physics.add(body({ x: 1, y: 1 }));
  expect(() => physics.remove(a)).toThrow("present in the simulation");
});

test("remove validates the argument", () => {
  const physics = makePhysics();
  expect(() => physics.remove(null)).toThrow("body object");
  expect(() => physics.remove("nope")).toThrow("body object");
});

test("constructor throws when ground-y is not a finite number", () => {
  expect(() => makePhysics({ ...CONFIG, "ground-y": "floor" })).toThrow("ground-y");
  expect(() => makePhysics({ ...CONFIG, "ground-y": Infinity })).toThrow("ground-y");
});

test("onCollision validates the callback", () => {
  const physics = makePhysics();
  expect(() => physics.onCollision(null)).toThrow("function callback");
  expect(() => physics.onCollision("nope")).toThrow("function callback");
});

test("onCollision is chainable and stores the callback", () => {
  const physics = makePhysics();
  const callback = () => {};
  expect(physics.onCollision(callback)).toBe(physics);
  physics.step(0.001);
  expect(physics.collisionCallback).toBe(callback);
});

test("onCollision reports every overlapping pair once per step", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  const c = body({ x: 30, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  physics.add(c);
  const events = [];
  physics.onCollision(({ a: first, b: second }) => {
    events.push([first, second]);
  });
  physics.step(0.001);
  expect(events.length).toBe(2);
  expect(events).toContainEqual([a, b]);
  expect(events).toContainEqual([b, c]);
});

test("onCollision reports nothing when no pair overlaps", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, radius: 10 });
  const b = body({ x: 50, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  let count = 0;
  physics.onCollision(() => {
    count += 1;
  });
  physics.step(0.001);
  expect(count).toBe(0);
});

test("add accepts a rectangle body and validates its shape", () => {
  const physics = makePhysics();
  expect(() =>
    physics.add({ x: 0, y: 0, vx: 0, vy: 0, radius: 10, w: 20, h: 20 })
  ).toThrow("never both");
  expect(() => physics.add({ x: 0, y: 0, vx: 0, vy: 0, w: 20, h: -5 })).toThrow("w and h");
  expect(() => physics.add({ x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 20 })).toThrow("w and h");
  expect(() => physics.add({ x: 0, y: 0, vx: 0, vy: 0 })).toThrow("radius or positive w and h");
  physics.add(rectBody({ x: 0, y: 0, w: 20, h: 10 }));
  expect(physics.bodies.length).toBe(1);
});

test("rect mass is density times area", () => {
  const physics = makePhysics();
  const block = rectBody({ x: 0, y: 0, w: 40, h: 10 });
  physics.add(block);
  expect(physics.mass(block)).toBeCloseTo(CONFIG.density * 40 * 10, 5);
});

test("overlapping rects are separated", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = rectBody({ x: 0, y: 0, w: 20, h: 20 });
  const b = rectBody({ x: 15, y: 0, w: 20, h: 20 });
  physics.add(a);
  physics.add(b);
  physics.step(0.001);
  const gap = Math.abs(a.x - b.x) - a.w / 2 - b.w / 2;
  expect(gap).toBeGreaterThanOrEqual(-0.001);
});

test("rect-rect collision transfers momentum with restitution", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = rectBody({ x: 0, y: 0, w: 20, h: 20, vx: 10 });
  const b = rectBody({ x: 15, y: 0, w: 20, h: 20 });
  physics.add(a);
  physics.add(b);
  physics.step(0.001);
  expect(b.vx).toBeGreaterThan(0);
  expect(a.vx).toBeLessThan(10);
  const vSeparation = b.vx - a.vx;
  expect(vSeparation).toBeCloseTo(10 * CONFIG.restitution, 5);
});

test("a circle is separated from an overlapping rect", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const circle = body({ x: 0, y: 0, radius: 10 });
  const rect = rectBody({ x: 16, y: 0, w: 20, h: 20 });
  physics.add(circle);
  physics.add(rect);
  physics.step(0.001);
  const closestX = Math.max(rect.x - rect.w / 2, Math.min(circle.x, rect.x + rect.w / 2));
  const dist = Math.hypot(circle.x - closestX, circle.y - rect.y);
  expect(dist).toBeGreaterThanOrEqual(circle.radius - 0.001);
});

test("closestPointDeltaOnRect clamps to the rect edge when the circle center is outside", () => {
  const physics = makePhysics();
  const circle = body({ x: 0, y: 0, radius: 10 });
  const rect = rectBody({ x: 16, y: 4, w: 20, h: 20 });
  const { dx, dy } = physics.closestPointDeltaOnRect(circle, rect);
  expect(dx).toBeCloseTo(0 - 6, 5);
  expect(dy).toBeCloseTo(0, 5);
});

test("closestPointDeltaOnRect returns zero delta when the circle center is inside the rect", () => {
  const physics = makePhysics();
  const circle = body({ x: 0, y: 0, radius: 10 });
  const rect = rectBody({ x: 0, y: 0, w: 20, h: 20 });
  const { dx, dy } = physics.closestPointDeltaOnRect(circle, rect);
  expect(dx).toBe(0);
  expect(dy).toBe(0);
});

test("closestPointDeltaOnRect corner-clamps when the circle center is diagonally outside", () => {
  const physics = makePhysics();
  const circle = body({ x: 0, y: 0, radius: 10 });
  const rect = rectBody({ x: 30, y: 20, w: 20, h: 20 });
  const { dx, dy } = physics.closestPointDeltaOnRect(circle, rect);
  expect(dx).toBeCloseTo(0 - 20, 5);
  expect(dy).toBeCloseTo(0 - 10, 5);
});

test("a launched circle knocks a rect forward", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const circle = body({ x: 8, y: 0, vx: 50, radius: 10 });
  const rect = rectBody({ x: 21, y: 0, w: 20, h: 20 });
  physics.add(circle);
  physics.add(rect);
  physics.step(0.001);
  expect(rect.vx).toBeGreaterThan(0);
  expect(circle.vx).toBeLessThan(50);
});

test("a rect comes to rest on the ground at groundY - h/2", () => {
  const physics = makePhysics({ ...CONFIG, "ground-y": 100 });
  const block = rectBody({ x: 0, y: 50, w: 40, h: 20 });
  physics.add(block);
  for (let i = 0; i < 300; i++) {
    physics.step(0.016);
  }
  expect(block.y).toBeCloseTo(100 - block.h / 2, 5);
  expect(Math.abs(block.vy)).toBeLessThan(1);
});

test("ground plane reflects a falling rect with restitution", () => {
  const physics = makePhysics({ ...CONFIG, "ground-y": 100 });
  const dt = 0.016;
  const block = rectBody({ x: 0, y: 90, w: 20, h: 20, vy: 50 });
  physics.add(block);
  physics.step(dt);
  expect(block.y).toBe(100 - block.h / 2);
  const impactSpeed = 50 + CONFIG.gravity * dt;
  expect(block.vy).toBeCloseTo(-impactSpeed * CONFIG.restitution, 5);
});

test("a rect is kept inside horizontal bounds and reflects with restitution", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0, "left-x": 0, "right-x": 100 });
  const moving = rectBody({ x: 95, y: 0, w: 20, h: 10, vx: 100 });
  physics.add(moving);
  physics.step(0.001);
  expect(moving.x).toBeLessThanOrEqual(100 - moving.w / 2);
  expect(moving.vx).toBeLessThanOrEqual(0);
  expect(moving.vx).toBeCloseTo(-100 * CONFIG.restitution, 5);
});

test("a rect stack stays supported (top rests on the one below)", () => {
  const physics = makePhysics({ ...CONFIG, "ground-y": 100 });
  const bottom = rectBody({ x: 0, y: 90, w: 40, h: 20 });
  const top = rectBody({ x: 0, y: 70, w: 40, h: 20 });
  physics.add(bottom);
  physics.add(top);
  for (let i = 0; i < 400; i++) {
    physics.step(0.016);
  }
  expect(bottom.y).toBeCloseTo(90, 3);
  expect(top.y + top.h / 2).toBeGreaterThanOrEqual(bottom.y - bottom.h / 2 - 1);
  expect(Math.abs(top.vy)).toBeLessThan(5);
  expect(Math.abs(bottom.vy)).toBeLessThan(5);
});

test("onCollision reports overlapping circle-rect and rect-rect pairs", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const circle = body({ x: 0, y: 0, radius: 10 });
  const rect = rectBody({ x: 15, y: 0, w: 20, h: 20 });
  physics.add(circle);
  physics.add(rect);
  const events = [];
  physics.onCollision(({ a: first, b: second }) => {
    events.push([first, second]);
  });
  physics.step(0.001);
  expect(events).toContainEqual([circle, rect]);

  const a = rectBody({ x: 0, y: 30, w: 20, h: 20 });
  const b = rectBody({ x: 15, y: 30, w: 20, h: 20 });
  physics.clear();
  physics.add(a);
  physics.add(b);
  events.length = 0;
  physics.step(0.001);
  expect(events).toContainEqual([a, b]);
});

test("a head-on collision reports the closing impact speed along the normal", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, vx: 10, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  let reported = null;
  physics.onCollision(({ impact }) => {
    reported = impact;
  });
  physics.step(0.001);
  expect(reported).toBeCloseTo(10, 5);
});

test("impact is the pre-resolution closing speed, not the post-resolution separation", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, vx: 10, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  let reported = null;
  physics.onCollision(({ impact }) => {
    reported = impact;
  });
  physics.step(0.001);
  expect(reported).toBeCloseTo(10, 5);
  const postResolveSeparation = b.vx - a.vx;
  expect(postResolveSeparation).toBeCloseTo(10 * CONFIG.restitution, 5);
  expect(reported).toBeGreaterThan(postResolveSeparation);
});

test("a separating contact reports zero impact", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, vx: -10, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  let reported = null;
  physics.onCollision(({ impact }) => {
    reported = impact;
  });
  physics.step(0.001);
  expect(reported).toBe(0);
});

test("resting contact reports zero impact", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const a = body({ x: 0, y: 0, radius: 10 });
  const b = body({ x: 15, y: 0, radius: 10 });
  physics.add(a);
  physics.add(b);
  let reported = null;
  physics.onCollision(({ impact }) => {
    reported = impact;
  });
  physics.step(0.001);
  expect(reported).toBe(0);
});

test("circle-rect impact reports the closing speed along the normal", () => {
  const physics = makePhysics({ ...CONFIG, gravity: 0 });
  const circle = body({ x: 8, y: 0, vx: 50, radius: 10 });
  const rect = rectBody({ x: 21, y: 0, w: 20, h: 20 });
  physics.add(circle);
  physics.add(rect);
  let reported = null;
  physics.onCollision(({ impact }) => {
    reported = impact;
  });
  physics.step(0.001);
  expect(reported).toBeCloseTo(50, 5);
});
