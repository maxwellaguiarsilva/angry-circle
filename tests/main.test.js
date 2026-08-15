import { test, expect } from "bun:test";

const SOURCE = await Bun.file("src/main.js").text();

test("composition root injects ground-y but no side walls into the physics config", () => {
  const physicsMatch = SOURCE.match(/new Physics\(\{[\s\S]*?config:\s*\{[\s\S]*?\},?\s*\}/);
  expect(physicsMatch).not.toBeNull();
  const physicsConfig = physicsMatch[0];
  expect(physicsConfig).toContain('"ground-y"');
  expect(physicsConfig).not.toContain('"left-x"');
  expect(physicsConfig).not.toContain('"right-x"');
});

test("composition root injects no left-x or right-x literal anywhere in main", () => {
  expect(SOURCE).not.toContain('"left-x"');
  expect(SOURCE).not.toContain('"right-x"');
});
