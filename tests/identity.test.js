import { test, expect } from "bun:test";
import { CircleIdentity } from "../src/game/identity.js";
import { DataLoader } from "../src/data/loader.js";

const SOURCE = "data/identity.json";
const LAUNCHER = { color: "#4ecdc4", radius: 22 };
const TARGET = { color: "#ff6b6b", radius: 18, hp: 100 };
const WOOD = { color: "#a67c52", w: 60, h: 30, hp: 120 };
const STONE = { color: "#8e9299", w: 60, h: 30, hp: 300 };

function makeData(block) {
  const identityBlock =
    block === undefined
      ? { identity: { launcher: LAUNCHER, target: TARGET, wood: WOOD, stone: STONE } }
      : block;
  return {
    get(source, key) {
      if (source !== SOURCE) {
        throw new Error(`DataLoader: source "${source}" not loaded. Call load() before get().`);
      }
      if (!(key in identityBlock)) {
        throw new Error(`DataLoader: missing key "${key}" in source "${source}".`);
      }
      return identityBlock[key];
    },
  };
}

function makeIdentity(block) {
  return new CircleIdentity({ data: makeData(block), source: SOURCE });
}

test("get returns the launcher identity", () => {
  expect(makeIdentity().get("launcher")).toEqual(LAUNCHER);
});

test("get returns the target identity", () => {
  expect(makeIdentity().get("target")).toEqual(TARGET);
});

test("get throws on an unknown role, naming the role and source", () => {
  expect(() => makeIdentity().get("ghost")).toThrow(/unknown role "ghost"/);
  expect(() => makeIdentity().get("ghost")).toThrow(/data\/identity\.json/);
});

test("get throws when a role lacks a color, naming role and source", () => {
  const block = { identity: { launcher: { radius: 22 } } };
  expect(() => makeIdentity(block).get("launcher")).toThrow(/"color"/);
  expect(() => makeIdentity(block).get("launcher")).toThrow(/"launcher"/);
  expect(() => makeIdentity(block).get("launcher")).toThrow(/data\/identity\.json/);
});

test("get throws when a role color is not a string", () => {
  const block = { identity: { launcher: { color: 5, radius: 22 } } };
  expect(() => makeIdentity(block).get("launcher")).toThrow(/"color"/);
});

test("get throws when a role radius is not positive or not numeric", () => {
  const zero = { identity: { launcher: { color: "#4ecdc4", radius: 0 } } };
  expect(() => makeIdentity(zero).get("launcher")).toThrow(/"radius"/);
  const text = { identity: { launcher: { color: "#4ecdc4", radius: "big" } } };
  expect(() => makeIdentity(text).get("launcher")).toThrow(/"radius"/);
});

test("material returns the wood material", () => {
  expect(makeIdentity().material("wood")).toEqual(WOOD);
});

test("material returns the stone material", () => {
  expect(makeIdentity().material("stone")).toEqual(STONE);
});

test("material throws on an unknown name, naming the name and source", () => {
  expect(() => makeIdentity().material("glass")).toThrow(/unknown material "glass"/);
  expect(() => makeIdentity().material("glass")).toThrow(/data\/identity\.json/);
});

test("material throws when a material lacks a color, naming the material and source", () => {
  const block = { identity: { wood: { w: 60, h: 30 } } };
  expect(() => makeIdentity(block).material("wood")).toThrow(/"color"/);
  expect(() => makeIdentity(block).material("wood")).toThrow(/"wood"/);
  expect(() => makeIdentity(block).material("wood")).toThrow(/data\/identity\.json/);
});

test("material throws when a material color is not a string", () => {
  const block = { identity: { wood: { color: 7, w: 60, h: 30 } } };
  expect(() => makeIdentity(block).material("wood")).toThrow(/"color"/);
});

test("material throws when w is not positive or not numeric", () => {
  const zero = { identity: { wood: { color: "#a67c52", w: 0, h: 30 } } };
  expect(() => makeIdentity(zero).material("wood")).toThrow(/"w"/);
  const text = { identity: { wood: { color: "#a67c52", w: "wide", h: 30 } } };
  expect(() => makeIdentity(text).material("wood")).toThrow(/"w"/);
});

test("material throws when h is not positive or not numeric", () => {
  const zero = { identity: { wood: { color: "#a67c52", w: 60, h: 0 } } };
  expect(() => makeIdentity(zero).material("wood")).toThrow(/"h"/);
  const text = { identity: { wood: { color: "#a67c52", w: 60, h: "tall" } } };
  expect(() => makeIdentity(text).material("wood")).toThrow(/"h"/);
});

test("get throws when the target lacks a positive hp, naming the role and source", () => {
  const missing = { identity: { launcher: LAUNCHER, target: { color: "#ff6b6b", radius: 18 } } };
  expect(() => makeIdentity(missing).get("target")).toThrow(/"hp"/);
  expect(() => makeIdentity(missing).get("target")).toThrow(/"target"/);
  expect(() => makeIdentity(missing).get("target")).toThrow(/data\/identity\.json/);
  const zero = { identity: { launcher: LAUNCHER, target: { color: "#ff6b6b", radius: 18, hp: 0 } } };
  expect(() => makeIdentity(zero).get("target")).toThrow(/"hp"/);
  const text = { identity: { launcher: LAUNCHER, target: { color: "#ff6b6b", radius: 18, hp: "strong" } } };
  expect(() => makeIdentity(text).get("target")).toThrow(/"hp"/);
});

test("get does not require hp on the launcher role", () => {
  expect(makeIdentity().get("launcher")).toEqual(LAUNCHER);
});

test("material throws when a material lacks a positive hp, naming the material and source", () => {
  const missing = { identity: { launcher: LAUNCHER, target: TARGET, wood: { color: "#a67c52", w: 60, h: 30 } } };
  expect(() => makeIdentity(missing).material("wood")).toThrow(/"hp"/);
  expect(() => makeIdentity(missing).material("wood")).toThrow(/"wood"/);
  expect(() => makeIdentity(missing).material("wood")).toThrow(/data\/identity\.json/);
  const zero = { identity: { launcher: LAUNCHER, target: TARGET, wood: { color: "#a67c52", w: 60, h: 30, hp: 0 } } };
  expect(() => makeIdentity(zero).material("wood")).toThrow(/"hp"/);
  const text = { identity: { launcher: LAUNCHER, target: TARGET, wood: { color: "#a67c52", w: 60, h: 30, hp: "tough" } } };
  expect(() => makeIdentity(text).material("wood")).toThrow(/"hp"/);
});

test("get rejects a material name (no radius) and material rejects a role name (no w/h)", () => {
  expect(() => makeIdentity().get("wood")).toThrow(/"radius"/);
  expect(() => makeIdentity().material("launcher")).toThrow(/"w"/);
});

test("constructor throws on missing data dependency", () => {
  expect(() => new CircleIdentity({ source: SOURCE })).toThrow('missing dependency "data"');
});

test("constructor throws on missing source dependency", () => {
  expect(() => new CircleIdentity({ data: makeData() })).toThrow('missing dependency "source"');
});

test("get throws when the identity top-level key is missing", () => {
  const block = {};
  expect(() => makeIdentity(block).get("launcher")).toThrow(/missing key "identity"/);
});

test("get throws when the source is not loaded", () => {
  const data = {
    get() {
      throw new Error('DataLoader: source "data/identity.json" not loaded. Call load() before get().');
    },
  };
  const identity = new CircleIdentity({ data, source: SOURCE });
  expect(() => identity.get("launcher")).toThrow(/not loaded/);
});

test("real identity file resolves through the actual DataLoader", async () => {
  const loader = new DataLoader();
  loader.sources.set(SOURCE, await Bun.file("data/identity.json").json());
  const identity = new CircleIdentity({ data: loader, source: SOURCE });
  expect(identity.get("launcher")).toEqual(LAUNCHER);
  expect(identity.get("target")).toEqual(TARGET);
  expect(identity.material("wood")).toEqual(WOOD);
  expect(identity.material("stone")).toEqual(STONE);
});

test("identity data file uses kebab-case roles and no animal tokens", async () => {
  const file = Bun.file("data/identity.json");
  const block = (await file.json()).identity;
  expect(Object.keys(block)).toEqual(["launcher", "target", "wood", "stone"]);
  const raw = (await file.text()).toLowerCase();
  for (const token of ["bird", "pig", "duck", "eagle", "king", "bomb"]) {
    expect(raw).not.toContain(token);
  }
});

test("identity data file gives the target and every material a positive hp", async () => {
  const file = Bun.file("data/identity.json");
  const doc = await file.json();
  for (const name of ["target", ...doc.materials]) {
    const entry = doc.identity[name];
    expect(entry).toBeDefined();
    expect(typeof entry.hp).toBe("number");
    expect(entry.hp > 0).toBe(true);
  }
});

test("identity data file exposes a canonical materials list matching block entries", async () => {
  const file = Bun.file("data/identity.json");
  const doc = await file.json();
  const materials = doc.materials;
  expect(Array.isArray(materials)).toBe(true);
  expect(materials).toEqual(["wood", "stone"]);
  for (const name of materials) {
    const entry = doc.identity[name];
    expect(entry).toBeDefined();
    expect(typeof entry.w).toBe("number");
    expect(typeof entry.h).toBe("number");
  }
  const blockNames = Object.keys(doc.identity).filter(
    (name) => typeof doc.identity[name].w === "number" && typeof doc.identity[name].h === "number",
  );
  expect(materials).toEqual(blockNames);
});
