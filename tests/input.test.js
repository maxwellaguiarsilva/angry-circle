import { test, expect } from "bun:test";
import { PointerInput } from "../src/engine/input.js";

function makeTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    fire(type, event) {
      const handler = listeners.get(type);
      if (handler !== undefined) {
        handler(event);
      }
    },
    has(type) {
      return listeners.has(type);
    },
    count() {
      return listeners.size;
    },
  };
}

function makeInput({ target = makeTarget(), getPosition = (event) => ({ x: event.x, y: event.y }) } = {}) {
  const input = new PointerInput({ target, getPosition });
  return { target, input };
}

test("attach registers pointer listeners on the target", () => {
  const { target, input } = makeInput();
  input.attach();
  expect(target.has("pointerdown")).toBe(true);
  expect(target.has("pointermove")).toBe(true);
  expect(target.has("pointerup")).toBe(true);
  expect(target.has("pointercancel")).toBe(true);
});

test("pointerdown emits the raw press position", () => {
  const { target, input } = makeInput();
  let received = null;
  input.onDown((press) => {
    received = press;
  });
  input.attach();
  target.fire("pointerdown", { x: 40, y: 50 });
  expect(received).toEqual({ x: 40, y: 50 });
});

test("pointermove during a drag emits position plus vector from origin", () => {
  const { target, input } = makeInput();
  const moves = [];
  input.onMove((state) => {
    moves.push(state);
  });
  input.attach();
  target.fire("pointerdown", { x: 100, y: 100 });
  target.fire("pointermove", { x: 130, y: 80 });
  target.fire("pointermove", { x: 120, y: 90 });
  expect(moves).toEqual([
    { x: 130, y: 80, dx: 30, dy: -20 },
    { x: 120, y: 90, dx: 20, dy: -10 },
  ]);
});

test("pointermove with no active press emits nothing", () => {
  const { target, input } = makeInput();
  let count = 0;
  input.onMove(() => {
    count++;
  });
  input.attach();
  target.fire("pointermove", { x: 10, y: 10 });
  expect(count).toBe(0);
});

test("pointerup emits release with position, drag vector and start", () => {
  const { target, input } = makeInput();
  let received = null;
  input.onUp((release) => {
    received = release;
  });
  input.attach();
  target.fire("pointerdown", { x: 200, y: 300 });
  target.fire("pointerup", { x: 150, y: 200 });
  expect(received).toEqual({ x: 150, y: 200, dx: -50, dy: -100, startX: 200, startY: 300 });
});

test("after pointerup a later move emits nothing", () => {
  const { target, input } = makeInput();
  let moves = 0;
  input.onMove(() => {
    moves++;
  });
  input.attach();
  target.fire("pointerdown", { x: 0, y: 0 });
  target.fire("pointerup", { x: 5, y: 5 });
  target.fire("pointermove", { x: 9, y: 9 });
  expect(moves).toBe(0);
});

test("pointercancel ends the drag like pointerup", () => {
  const { target, input } = makeInput();
  let releases = 0;
  input.onUp(() => {
    releases++;
  });
  input.attach();
  target.fire("pointerdown", { x: 0, y: 0 });
  target.fire("pointercancel", { x: 3, y: 3 });
  expect(releases).toBe(1);
});

test("detach removes all listeners and clears the drag state", () => {
  const { target, input } = makeInput();
  input.attach();
  input.detach();
  expect(target.count()).toBe(0);
  let moves = 0;
  input.onMove(() => {
    moves++;
  });
  target.fire("pointerdown", { x: 0, y: 0 });
  target.fire("pointermove", { x: 1, y: 1 });
  expect(moves).toBe(0);
});

test("throws on missing target", () => {
  expect(() => new PointerInput({ getPosition: () => ({}) })).toThrow('missing dependency "target"');
});

test("throws on missing or invalid getPosition", () => {
  expect(() => new PointerInput({ target: makeTarget() })).toThrow('missing dependency "getPosition"');
  expect(() => new PointerInput({ target: makeTarget(), getPosition: 42 })).toThrow(
    '"getPosition" must be a function',
  );
});

test("throws when a handler is not a function", () => {
  const { input } = makeInput();
  expect(() => input.onDown(null)).toThrow("onDown");
  expect(() => input.onMove("nope")).toThrow("onMove");
  expect(() => input.onUp(7)).toThrow("onUp");
});
