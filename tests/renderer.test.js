import { test, expect } from "bun:test";
import { CanvasRenderer } from "../src/engine/renderer.js";

const CONFIG = { width: 800, height: 600, background: "#1a1a2e" };

function makeContext() {
  const calls = [];
  return {
    calls,
    fillStyle: null,
    font: null,
    textBaseline: null,
    textAlign: null,
    strokeStyle: null,
    lineWidth: null,
    beginPath() {
      calls.push(["beginPath"]);
    },
    arc(...args) {
      calls.push(["arc", ...args]);
    },
    ellipse(...args) {
      calls.push(["ellipse", ...args]);
    },
    fill() {
      calls.push(["fill"]);
    },
    fillRect(...args) {
      calls.push(["fillRect", ...args]);
    },
    fillText(...args) {
      calls.push(["fillText", ...args]);
    },
    moveTo(...args) {
      calls.push(["moveTo", ...args]);
    },
    lineTo(...args) {
      calls.push(["lineTo", ...args]);
    },
    stroke() {
      calls.push(["stroke"]);
    },
  };
}

function makeCanvas() {
  const context = makeContext();
  return {
    width: 0,
    height: 0,
    context,
    getContext(type) {
      this.contextType = type;
      return context;
    },
  };
}

function makeRenderer({ canvas = makeCanvas(), config = CONFIG } = {}) {
  return new CanvasRenderer({ canvas, config });
}

test("constructor sizes the canvas from config", () => {
  const canvas = makeCanvas();
  makeRenderer({ canvas });
  expect(canvas.width).toBe(CONFIG.width);
  expect(canvas.height).toBe(CONFIG.height);
});

test("present fills the whole canvas with the configured background", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.present();
  expect(canvas.context.fillStyle).toBe(CONFIG.background);
  expect(canvas.context.calls).toContainEqual(["fillRect", 0, 0, CONFIG.width, CONFIG.height]);
});

test("circle draws a filled arc with the injected style", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.circle({ x: 40, y: 30, radius: 12, fill: "#ffcc00" });
  const calls = canvas.context.calls;
  expect(calls[0]).toEqual(["beginPath"]);
  expect(calls[1]).toEqual(["arc", 40, 30, 12, 0, Math.PI * 2]);
  expect(canvas.context.fillStyle).toBe("#ffcc00");
  expect(calls[calls.length - 1]).toEqual(["fill"]);
});

test("renderer contains no game colors or sizes", () => {
  const renderer = makeRenderer();
  const source = renderer.circle.toString();
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  expect(source).not.toMatch(/\bwidth\b/);
  expect(source).not.toMatch(/\bheight\b/);
});

test("circle validates its arguments", () => {
  const renderer = makeRenderer();
  expect(() => renderer.circle({ y: 0, radius: 1, fill: "#000" })).toThrow("numeric x and y");
  expect(() => renderer.circle({ x: 0, radius: 1, fill: "#000" })).toThrow("numeric x and y");
  expect(() => renderer.circle({ x: 0, y: 0, radius: 0, fill: "#000" })).toThrow("radius");
  expect(() => renderer.circle({ x: 0, y: 0, radius: 1, fill: 42 })).toThrow("fill color string");
});

test("ellipse draws a filled ellipse with the injected geometry", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.ellipse({ x: 150, y: 90, rx: 46, ry: 26, fill: "#33405f" });
  const calls = canvas.context.calls;
  expect(calls[0]).toEqual(["beginPath"]);
  expect(calls[1]).toEqual(["ellipse", 150, 90, 46, 26, 0, 0, Math.PI * 2]);
  expect(canvas.context.fillStyle).toBe("#33405f");
  expect(calls[calls.length - 1]).toEqual(["fill"]);
});

test("ellipse validates its arguments", () => {
  const renderer = makeRenderer();
  expect(() => renderer.ellipse({ y: 0, rx: 1, ry: 1, fill: "#000" })).toThrow("numeric x and y");
  expect(() => renderer.ellipse({ x: 0, y: 0, rx: 0, ry: 1, fill: "#000" })).toThrow("positive numeric rx and ry");
  expect(() => renderer.ellipse({ x: 0, y: 0, rx: 1, ry: -2, fill: "#000" })).toThrow("positive numeric rx and ry");
  expect(() => renderer.ellipse({ x: 0, y: 0, rx: 1, ry: 1, fill: 42 })).toThrow("fill color string");
});

test("ellipse contains no game colors or sizes", () => {
  const renderer = makeRenderer();
  const source = renderer.ellipse.toString();
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});

test("rect fills a centered rectangle with the injected geometry", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.rect({ x: 200, y: 150, w: 40, h: 20, fill: "#8b5a2b" });
  const calls = canvas.context.calls;
  expect(canvas.context.fillStyle).toBe("#8b5a2b");
  expect(calls).toEqual([["fillRect", 180, 140, 40, 20]]);
});

test("rect validates its arguments", () => {
  const renderer = makeRenderer();
  expect(() => renderer.rect({ y: 0, w: 1, h: 1, fill: "#000" })).toThrow("numeric x and y");
  expect(() => renderer.rect({ x: 0, y: 0, w: 0, h: 1, fill: "#000" })).toThrow("positive numeric w and h");
  expect(() => renderer.rect({ x: 0, y: 0, w: 1, h: -2, fill: "#000" })).toThrow("positive numeric w and h");
  expect(() => renderer.rect({ x: 0, y: 0, w: 1, h: 1, fill: 42 })).toThrow("fill color string");
});

test("rect contains no game colors or sizes", () => {
  const renderer = makeRenderer();
  const source = renderer.rect.toString();
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});

test("line strokes a segment with the injected endpoints, color and width", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.line({ x1: 10, y1: 20, x2: 40, y2: 60, color: "#ffffff", width: 4 });
  const calls = canvas.context.calls;
  expect(calls[0]).toEqual(["beginPath"]);
  expect(calls).toContainEqual(["moveTo", 10, 20]);
  expect(calls).toContainEqual(["lineTo", 40, 60]);
  expect(canvas.context.strokeStyle).toBe("#ffffff");
  expect(canvas.context.lineWidth).toBe(4);
  expect(calls[calls.length - 1]).toEqual(["stroke"]);
});

test("line validates its arguments", () => {
  const renderer = makeRenderer();
  expect(() => renderer.line({ y1: 0, x2: 0, y2: 0, color: "#000", width: 1 })).toThrow("numeric x1, y1, x2 and y2");
  expect(() => renderer.line({ x1: 0, y1: 0, x2: 0, y2: 0, width: 1 })).toThrow("color string");
  expect(() => renderer.line({ x1: 0, y1: 0, x2: 0, y2: 0, color: "#000", width: 0 })).toThrow("positive numeric width");
});

test("line contains no game colors or sizes", () => {
  const renderer = makeRenderer();
  const source = renderer.line.toString();
  expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
});

test("text renders a string at the injected position with font and fill", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.text({ x: 24, y: 28, value: "Score 120", font: "600 18px monospace", fill: "#ffffff" });
  expect(canvas.context.font).toBe("600 18px monospace");
  expect(canvas.context.fillStyle).toBe("#ffffff");
  expect(canvas.context.textBaseline).toBe("top");
  expect(canvas.context.calls).toContainEqual(["fillText", "Score 120", 24, 28]);
});

test("text validates its arguments", () => {
  const renderer = makeRenderer();
  expect(() => renderer.text({ y: 0, value: "x", font: "a", fill: "b" })).toThrow("numeric x and y");
  expect(() => renderer.text({ x: 0, y: 0, value: 120, font: "a", fill: "b" })).toThrow("string value");
  expect(() => renderer.text({ x: 0, y: 0, value: "x", fill: "b" })).toThrow("font and fill");
  expect(() => renderer.text({ x: 0, y: 0, value: "x", font: "a" })).toThrow("font and fill");
});

test("text defaults to left alignment and sets the canvas textAlign", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.text({ x: 24, y: 28, value: "Score 0", font: "600 18px monospace", fill: "#ffffff" });
  expect(canvas.context.textAlign).toBe("left");
});

test("text honors a center alignment for the injected x anchor", () => {
  const canvas = makeCanvas();
  const renderer = makeRenderer({ canvas });
  renderer.text({ x: 400, y: 260, value: "You cleared the level!", font: "700 30px monospace", fill: "#ffffff", align: "center" });
  expect(canvas.context.textAlign).toBe("center");
  expect(canvas.context.calls).toContainEqual(["fillText", "You cleared the level!", 400, 260]);
});

test("text rejects an invalid alignment", () => {
  const renderer = makeRenderer();
  expect(() => renderer.text({ x: 0, y: 0, value: "x", font: "a", fill: "b", align: "top" })).toThrow("align");
});

test("constructor throws on missing canvas", () => {
  expect(() => new CanvasRenderer({ config: CONFIG })).toThrow("canvas");
});

test("constructor throws on null 2d context", () => {
  const canvas = { width: 0, height: 0, getContext: () => null };
  expect(() => new CanvasRenderer({ canvas, config: CONFIG })).toThrow("2d context");
});

test("constructor throws on invalid config", () => {
  const canvas = makeCanvas();
  expect(() => new CanvasRenderer({ canvas })).toThrow("config");
  expect(() => new CanvasRenderer({ canvas, config: { ...CONFIG, width: 0 } })).toThrow("width");
  expect(() => new CanvasRenderer({ canvas, config: { ...CONFIG, height: -1 } })).toThrow("height");
  expect(() => new CanvasRenderer({ canvas, config: { ...CONFIG, background: 7 } })).toThrow("background");
});
