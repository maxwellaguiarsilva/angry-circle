import { test, expect } from "bun:test";
import { Levels } from "../src/game/levels.js";
import { DataLoader } from "../src/data/loader.js";

const SOURCE = "data/levels.json";
const MATERIALS = ["wood", "stone"];

const LEVELS = [
  {
    launches: 3,
    targets: [
      { x: 640, y: 560 },
      { x: 640, y: 524 },
      { x: 640, y: 488 },
      { x: 500, y: 585, shape: "block", material: "wood" },
      { x: 500, y: 555, shape: "block", material: "stone" },
    ],
  },
  {
    launches: 5,
    targets: [
      { x: 560, y: 560 },
      { x: 560, y: 524 },
      { x: 560, y: 488 },
      { x: 560, y: 452 },
      { x: 560, y: 416 },
      { x: 700, y: 560 },
      { x: 700, y: 524 },
      { x: 700, y: 488 },
      { x: 440, y: 585, shape: "block", material: "wood" },
      { x: 440, y: 555, shape: "block", material: "stone" },
      { x: 440, y: 525, shape: "block", material: "wood" },
    ],
  },
];

function makeData(block) {
  const levelsBlock = block === undefined ? { levels: LEVELS } : block;
  return {
    get(source, key) {
      if (source !== SOURCE) {
        throw new Error(`DataLoader: source "${source}" not loaded. Call load() before get().`);
      }
      if (!(key in levelsBlock)) {
        throw new Error(`DataLoader: missing key "${key}" in source "${source}".`);
      }
      return levelsBlock[key];
    },
  };
}

function makeLevels(block) {
  return new Levels({ data: makeData(block), source: SOURCE, materials: MATERIALS });
}

test("count returns the number of levels", () => {
  expect(makeLevels().count()).toBe(2);
});

test("get returns the validated first level", () => {
  expect(makeLevels().get(0)).toEqual(LEVELS[0]);
});

test("get returns the validated second level", () => {
  expect(makeLevels().get(1)).toEqual(LEVELS[1]);
});

test("get throws on an out-of-range index, naming the index and source", () => {
  expect(() => makeLevels().get(2)).toThrow(/level index 2/);
  expect(() => makeLevels().get(2)).toThrow(/data\/levels\.json/);
});

test("get throws on a negative index, naming the index and source", () => {
  expect(() => makeLevels().get(-1)).toThrow(/level index -1/);
  expect(() => makeLevels().get(-1)).toThrow(/data\/levels\.json/);
});

test("get throws on a non-integer index", () => {
  expect(() => makeLevels().get(0.5)).toThrow(/expected an integer/);
});

test("constructor throws on missing data dependency", () => {
  expect(() => new Levels({ source: SOURCE })).toThrow('missing dependency "data"');
});

test("constructor throws on missing source dependency", () => {
  expect(() => new Levels({ data: makeData() })).toThrow('missing dependency "source"');
});

test("constructor throws on missing materials dependency", () => {
  expect(() => new Levels({ data: makeData(), source: SOURCE })).toThrow('missing dependency "materials"');
});

test("constructor throws on an empty or non-string materials list", () => {
  expect(() => new Levels({ data: makeData(), source: SOURCE, materials: [] })).toThrow(/invalid dependency "materials"/);
  expect(() => new Levels({ data: makeData(), source: SOURCE, materials: [""] })).toThrow(/invalid dependency "materials"/);
});

test("count throws when the levels top-level key is missing", () => {
  const block = {};
  expect(() => makeLevels(block).count()).toThrow(/missing key "levels"/);
});

test("count throws when the levels array is empty", () => {
  const block = { levels: [] };
  expect(() => makeLevels(block).count()).toThrow(/"levels"/);
  expect(() => makeLevels(block).count()).toThrow(/non-empty array/);
  expect(() => makeLevels(block).count()).toThrow(/data\/levels\.json/);
});

test("get throws when a level lacks launches", () => {
  const block = { levels: [{ targets: LEVELS[0].targets }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"launches"/);
  expect(() => makeLevels(block).get(0)).toThrow(/level 0/);
  expect(() => makeLevels(block).get(0)).toThrow(/data\/levels\.json/);
});

test("get throws when a level launches is zero or negative", () => {
  const zero = { levels: [{ launches: 0, targets: LEVELS[0].targets }] };
  expect(() => makeLevels(zero).get(0)).toThrow(/"launches"/);
  const negative = { levels: [{ launches: -2, targets: LEVELS[0].targets }] };
  expect(() => makeLevels(negative).get(0)).toThrow(/"launches"/);
});

test("get throws when a level launches is not an integer", () => {
  const fractional = { levels: [{ launches: 2.5, targets: LEVELS[0].targets }] };
  expect(() => makeLevels(fractional).get(0)).toThrow(/"launches"/);
  const text = { levels: [{ launches: "three", targets: LEVELS[0].targets }] };
  expect(() => makeLevels(text).get(0)).toThrow(/"launches"/);
});

test("get throws when a level has empty targets", () => {
  const block = { levels: [{ launches: 3, targets: [] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"targets"/);
  expect(() => makeLevels(block).get(0)).toThrow(/level 0/);
  expect(() => makeLevels(block).get(0)).toThrow(/data\/levels\.json/);
});

test("get throws when a target lacks x", () => {
  const block = { levels: [{ launches: 3, targets: [{ y: 560 }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"x"/);
  expect(() => makeLevels(block).get(0)).toThrow(/target 0 of level 0/);
});

test("get throws when a target lacks y", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 640 }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"y"/);
  expect(() => makeLevels(block).get(0)).toThrow(/target 0 of level 0/);
});

test("get throws when a target x is not numeric", () => {
  const text = { levels: [{ launches: 3, targets: [{ x: "wide", y: 560 }] }] };
  expect(() => makeLevels(text).get(0)).toThrow(/"x"/);
});

test("get throws when a target y is not a finite number", () => {
  const infinity = { levels: [{ launches: 3, targets: [{ x: 640, y: Infinity }] }] };
  expect(() => makeLevels(infinity).get(0)).toThrow(/"y"/);
});

test("get accepts a valid block target", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 500, y: 585, shape: "block", material: "wood" }] }] };
  expect(makeLevels(block).get(0)).toEqual(block.levels[0]);
});

test("get accepts an explicit circle target with no material", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 640, y: 560, shape: "circle" }] }] };
  expect(makeLevels(block).get(0)).toEqual(block.levels[0]);
});

test("get throws on an unknown shape, naming the target, shape, and source", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 640, y: 560, shape: "triangle" }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/unknown "shape" "triangle"/);
  expect(() => makeLevels(block).get(0)).toThrow(/target 0 of level 0/);
  expect(() => makeLevels(block).get(0)).toThrow(/data\/levels\.json/);
});

test("get throws on a block target missing a material", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 500, y: 585, shape: "block" }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"material"/);
  expect(() => makeLevels(block).get(0)).toThrow(/target 0 of level 0/);
});

test("get throws on a block target with a non-string material", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 500, y: 585, shape: "block", material: 42 }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"material"/);
});

test("get throws on an unknown material, naming the material and source", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 500, y: 585, shape: "block", material: "glass" }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/unknown "material" "glass"/);
  expect(() => makeLevels(block).get(0)).toThrow(/data\/levels\.json/);
});

test("get throws when a circle target carries a material field", () => {
  const block = { levels: [{ launches: 3, targets: [{ x: 640, y: 560, material: "wood" }] }] };
  expect(() => makeLevels(block).get(0)).toThrow(/"material" on a "circle" target/);
  const explicit = { levels: [{ launches: 3, targets: [{ x: 640, y: 560, shape: "circle", material: "wood" }] }] };
  expect(() => makeLevels(explicit).get(0)).toThrow(/"material" on a "circle" target/);
});

test("real levels file resolves through the actual DataLoader", async () => {
  const loader = new DataLoader();
  loader.sources.set(SOURCE, await Bun.file(SOURCE).json());
  const levels = new Levels({ data: loader, source: SOURCE, materials: MATERIALS });
  expect(levels.count()).toBe(2);
  expect(levels.get(0)).toEqual(LEVELS[0]);
  expect(levels.get(1)).toEqual(LEVELS[1]);
});

test("levels data file uses single-word keys and no animal or identity tokens", async () => {
  const file = Bun.file("data/levels.json");
  const block = (await file.json()).levels;
  expect(Object.keys(await file.json())).toEqual(["levels"]);
  for (const level of block) {
    expect(Object.keys(level)).toEqual(["launches", "targets"]);
    for (const target of level.targets) {
      if (target.shape === "block") {
        expect(Object.keys(target)).toEqual(["x", "y", "shape", "material"]);
      } else {
        expect(Object.keys(target)).toEqual(["x", "y"]);
      }
    }
  }
  const raw = (await file.text()).toLowerCase();
  for (const token of ["bird", "pig", "duck", "eagle", "king", "bomb"]) {
    expect(raw).not.toContain(token);
  }
  for (const token of ["radius", "color", "#ff6b6b"]) {
    expect(raw).not.toContain(token);
  }
});
