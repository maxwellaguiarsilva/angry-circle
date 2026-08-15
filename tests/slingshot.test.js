import { test, expect } from "bun:test";
import { Slingshot, CURVE_TYPES } from "../src/game/slingshot.js";
import { DataLoader } from "../src/data/loader.js";

const CONFIG = {
  "max-drag": 150,
  "max-power": 1200,
  "power-curve": { type: "power", exponent: 2 },
};

function makeSlingshot(config) {
  return new Slingshot({ config: config === undefined ? CONFIG : config });
}

function makeRelease(dx, dy) {
  return { x: 0, y: 0, dx, dy, startX: 0, startY: 0 };
}

test("CURVE_TYPES is the canonical list of supported power curves", () => {
  expect(CURVE_TYPES).toEqual(["linear", "power"]);
});

test("constructor stores the validated config values", () => {
  const slingshot = makeSlingshot();
  expect(slingshot.maxDrag).toBe(150);
  expect(slingshot.maxPower).toBe(1200);
  expect(slingshot.curveType).toBe("power");
  expect(slingshot.curveExponent).toBe(2);
});

test("constructor throws on missing or null config", () => {
  expect(() => new Slingshot({})).toThrow('missing dependency "config"');
  expect(() => new Slingshot({ config: null })).toThrow('missing dependency "config"');
});

test("constructor throws when max-drag is missing or not a positive number", () => {
  const base = { "max-power": 1200, "power-curve": CONFIG["power-curve"] };
  expect(() => makeSlingshot(base)).toThrow(/"max-drag"/);
  expect(() => makeSlingshot({ ...base, "max-drag": 0 })).toThrow(/"max-drag"/);
  expect(() => makeSlingshot({ ...base, "max-drag": -10 })).toThrow(/"max-drag"/);
  expect(() => makeSlingshot({ ...base, "max-drag": "wide" })).toThrow(/data\/boot\.json/);
});

test("constructor throws when max-power is missing or not a positive number", () => {
  const base = { "max-drag": 150, "power-curve": CONFIG["power-curve"] };
  expect(() => makeSlingshot(base)).toThrow(/"max-power"/);
  expect(() => makeSlingshot({ ...base, "max-power": 0 })).toThrow(/"max-power"/);
  expect(() => makeSlingshot({ ...base, "max-power": -1 })).toThrow(/"max-power"/);
});

test("constructor throws when power-curve is missing or not an object", () => {
  expect(() => makeSlingshot({ "max-drag": 150, "max-power": 1200 })).toThrow(/"power-curve"/);
  expect(() =>
    makeSlingshot({ "max-drag": 150, "max-power": 1200, "power-curve": 2 }),
  ).toThrow(/"power-curve"/);
});

test("constructor throws when power-curve.type is not in CURVE_TYPES", () => {
  const curve = { type: "quadratic", exponent: 2 };
  expect(() =>
    makeSlingshot({ "max-drag": 150, "max-power": 1200, "power-curve": curve }),
  ).toThrow(/"power-curve\.type"/);
  expect(() =>
    makeSlingshot({ "max-drag": 150, "max-power": 1200, "power-curve": curve }),
  ).toThrow(/one of linear, power/);
});

test("constructor throws when a power curve exponent is not a positive number", () => {
  const base = { "max-drag": 150, "max-power": 1200 };
  expect(() =>
    makeSlingshot({ ...base, "power-curve": { type: "power" } }),
  ).toThrow(/"power-curve\.exponent"/);
  expect(() =>
    makeSlingshot({ ...base, "power-curve": { type: "power", exponent: 0 } }),
  ).toThrow(/"power-curve\.exponent"/);
  expect(() =>
    makeSlingshot({ ...base, "power-curve": { type: "power", exponent: -1 } }),
  ).toThrow(/"power-curve\.exponent"/);
  expect(() =>
    makeSlingshot({ ...base, "power-curve": { type: "power", exponent: "twice" } }),
  ).toThrow(/"power-curve\.exponent"/);
});

test("constructor accepts a linear curve without an exponent", () => {
  const slingshot = makeSlingshot({
    "max-drag": 150,
    "max-power": 1200,
    "power-curve": { type: "linear" },
  });
  expect(slingshot.curveType).toBe("linear");
});

test("launch maps a full-strength drag to max-power opposite the drag", () => {
  const { vx, vy, power } = makeSlingshot().launch(makeRelease(-150, 0));
  expect(vx).toBe(1200);
  expect(vy).toBeCloseTo(0, 12);
  expect(power).toBe(1200);
});

test("launch applies the power curve to a partial drag", () => {
  const { vx, vy, power } = makeSlingshot().launch(makeRelease(-75, 0));
  expect(vx).toBe(300);
  expect(vy).toBeCloseTo(0, 12);
  expect(power).toBe(300);
});

test("launch clamps drag lengths beyond max-drag", () => {
  const { vx, vy, power } = makeSlingshot().launch(makeRelease(-300, 0));
  expect(vx).toBe(1200);
  expect(vy).toBeCloseTo(0, 12);
  expect(power).toBe(1200);
});

test("launch with a linear curve scales power linearly with the drag", () => {
  const slingshot = makeSlingshot({
    "max-drag": 150,
    "max-power": 1200,
    "power-curve": { type: "linear" },
  });
  const { vx, vy, power } = slingshot.launch(makeRelease(-75, 0));
  expect(vx).toBe(600);
  expect(vy).toBeCloseTo(0, 12);
  expect(power).toBe(600);
});

test("launch fires opposite the drag on a diagonal", () => {
  const slingshot = makeSlingshot({
    "max-drag": 150,
    "max-power": 1200,
    "power-curve": { type: "linear" },
  });
  expect(slingshot.launch(makeRelease(-3, 4))).toEqual({ vx: 24, vy: -32, power: 40 });
});

test("launch fires vertically opposite a vertical drag", () => {
  const { vx, vy, power } = makeSlingshot().launch(makeRelease(0, 150));
  expect(vx).toBeCloseTo(0, 12);
  expect(vy).toBe(-1200);
  expect(power).toBe(1200);
});

test("launch throws on a zero-length drag, naming the drag", () => {
  expect(() => makeSlingshot().launch(makeRelease(0, 0))).toThrow(/zero-length drag/);
  expect(() => makeSlingshot().launch(makeRelease(0, 0))).toThrow(/dx=0, dy=0/);
});

test("launch throws when dx or dy is not a number", () => {
  expect(() => makeSlingshot().launch(makeRelease("fast", 0))).toThrow(/"dx"/);
  expect(() => makeSlingshot().launch(makeRelease(0, "fast"))).toThrow(/"dy"/);
});

test("launch throws on a missing release", () => {
  expect(() => makeSlingshot().launch()).toThrow('missing dependency "release"');
});

test("isGrab accepts presses within max-drag of the anchor", () => {
  const slingshot = makeSlingshot();
  const anchor = { x: 120, y: 520 };
  expect(slingshot.isGrab(anchor, { x: 120, y: 520 })).toBe(true);
  expect(slingshot.isGrab(anchor, { x: 270, y: 520 })).toBe(true);
  expect(slingshot.isGrab(anchor, { x: 120, y: 370 })).toBe(true);
});

test("isGrab rejects presses beyond max-drag of the anchor", () => {
  const slingshot = makeSlingshot();
  const anchor = { x: 120, y: 520 };
  expect(slingshot.isGrab(anchor, { x: 271, y: 520 })).toBe(false);
  expect(slingshot.isGrab(anchor, { x: 700, y: 500 })).toBe(false);
});

test("isGrab validates its arguments", () => {
  const slingshot = makeSlingshot();
  expect(() => slingshot.isGrab()).toThrow(/anchor/);
  expect(() => slingshot.isGrab({ x: 120, y: 520 })).toThrow(/position/);
  expect(() => slingshot.isGrab({ x: "120", y: 520 }, { x: 0, y: 0 })).toThrow(/anchor/);
});

test("clampPouch returns the position unchanged within max-drag", () => {
  const slingshot = makeSlingshot();
  const anchor = { x: 120, y: 520 };
  expect(slingshot.clampPouch(anchor, { x: 200, y: 480 })).toEqual({ x: 200, y: 480 });
});

test("clampPouch clamps a position beyond max-drag to the radius edge", () => {
  const slingshot = makeSlingshot();
  const anchor = { x: 120, y: 520 };
  const clamped = slingshot.clampPouch(anchor, { x: -100, y: 520 });
  expect(clamped.x).toBeCloseTo(120 - 150, 12);
  expect(clamped.y).toBeCloseTo(520, 12);
});

test("clampPouch keeps the pull direction while clamping the distance", () => {
  const slingshot = makeSlingshot();
  const anchor = { x: 0, y: 0 };
  const clamped = slingshot.clampPouch(anchor, { x: 300, y: 400 });
  expect(Math.hypot(clamped.x, clamped.y)).toBeCloseTo(150, 12);
  expect(clamped.x / clamped.y).toBeCloseTo(300 / 400, 12);
});

test("clampPouch validates its arguments", () => {
  const slingshot = makeSlingshot();
  expect(() => slingshot.clampPouch()).toThrow(/anchor/);
  expect(() => slingshot.clampPouch({ x: 0, y: 0 })).toThrow(/position/);
  expect(() => slingshot.clampPouch({ x: 0, y: 0 }, { x: "0", y: 0 })).toThrow(/position/);
});

test("slingshot module contains no hardcoded tunables", () => {
  const source = `${Slingshot.toString()} ${Slingshot.prototype.launch.toString()}`;
  expect(source).not.toMatch(/150|1200/);
});

test("real slingshot config resolves through the actual DataLoader", async () => {
  const loader = new DataLoader();
  loader.sources.set("data/boot.json", await Bun.file("data/boot.json").json());
  const config = loader.get("data/boot.json", "slingshot");
  const { vx, vy, power } = new Slingshot({ config }).launch(makeRelease(-150, 0));
  expect(vx).toBe(1200);
  expect(vy).toBeCloseTo(0, 12);
  expect(power).toBe(1200);
});

test("slingshot config block uses kebab-case keys", async () => {
  const file = Bun.file("data/boot.json");
  const block = (await file.json()).slingshot;
  expect(Object.keys(block)).toEqual(["max-drag", "max-power", "power-curve"]);
});
