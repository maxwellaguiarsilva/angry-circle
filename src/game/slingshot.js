export const CURVE_TYPES = ["linear", "power"];

export class Slingshot {
  constructor({ config }) {
    if (config === undefined || config === null || typeof config !== "object") {
      throw new Error('Slingshot: missing dependency "config".');
    }
    if (typeof config["max-drag"] !== "number" || !(config["max-drag"] > 0)) {
      throw new Error(
        'Slingshot: invalid "max-drag" in source "data/boot.json" (expected a positive number).',
      );
    }
    if (typeof config["max-power"] !== "number" || !(config["max-power"] > 0)) {
      throw new Error(
        'Slingshot: invalid "max-power" in source "data/boot.json" (expected a positive number).',
      );
    }
    const curve = config["power-curve"];
    if (curve === undefined || curve === null || typeof curve !== "object") {
      throw new Error(
        'Slingshot: invalid "power-curve" in source "data/boot.json" (expected an object).',
      );
    }
    if (!CURVE_TYPES.includes(curve.type)) {
      throw new Error(
        `Slingshot: invalid "power-curve.type" in source "data/boot.json" (expected one of ${CURVE_TYPES.join(", ")}).`,
      );
    }
    if (curve.type === "power" && (typeof curve.exponent !== "number" || !(curve.exponent > 0))) {
      throw new Error(
        'Slingshot: invalid "power-curve.exponent" in source "data/boot.json" (expected a positive number).',
      );
    }
    this.maxDrag = config["max-drag"];
    this.maxPower = config["max-power"];
    this.curveType = curve.type;
    this.curveExponent = curve.exponent;
  }

  isGrab(anchor, position) {
    if (anchor === undefined || anchor === null || typeof anchor !== "object") {
      throw new Error('Slingshot: missing dependency "anchor".');
    }
    if (typeof anchor.x !== "number" || typeof anchor.y !== "number") {
      throw new Error('Slingshot: invalid anchor (expected numeric "x" and "y").');
    }
    if (position === undefined || position === null || typeof position !== "object") {
      throw new Error('Slingshot: missing dependency "position".');
    }
    if (typeof position.x !== "number" || typeof position.y !== "number") {
      throw new Error('Slingshot: invalid position (expected numeric "x" and "y").');
    }
    return Math.hypot(position.x - anchor.x, position.y - anchor.y) <= this.maxDrag;
  }

  clampPouch(anchor, position) {
    if (anchor === undefined || anchor === null || typeof anchor !== "object") {
      throw new Error('Slingshot: missing dependency "anchor".');
    }
    if (typeof anchor.x !== "number" || typeof anchor.y !== "number") {
      throw new Error('Slingshot: invalid anchor (expected numeric "x" and "y").');
    }
    if (position === undefined || position === null || typeof position !== "object") {
      throw new Error('Slingshot: missing dependency "position".');
    }
    if (typeof position.x !== "number" || typeof position.y !== "number") {
      throw new Error('Slingshot: invalid position (expected numeric "x" and "y").');
    }
    const dx = position.x - anchor.x;
    const dy = position.y - anchor.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.maxDrag) {
      return { x: position.x, y: position.y };
    }
    const scale = this.maxDrag / distance;
    return { x: anchor.x + dx * scale, y: anchor.y + dy * scale };
  }

  launch(release) {
    if (release === undefined || release === null || typeof release !== "object") {
      throw new Error('Slingshot: missing dependency "release".');
    }
    if (typeof release.dx !== "number") {
      throw new Error('Slingshot: invalid release "dx" (expected a number).');
    }
    if (typeof release.dy !== "number") {
      throw new Error('Slingshot: invalid release "dy" (expected a number).');
    }
    const dragLength = Math.hypot(release.dx, release.dy);
    if (dragLength === 0) {
      throw new Error(
        `Slingshot: cannot launch from a zero-length drag (dx=${release.dx}, dy=${release.dy}).`,
      );
    }
    const ratio = Math.min(dragLength / this.maxDrag, 1);
    const curveStrength = this.curveType === "linear" ? ratio : ratio ** this.curveExponent;
    const speed = curveStrength * this.maxPower;
    return {
      vx: -(release.dx / dragLength) * speed,
      vy: -(release.dy / dragLength) * speed,
      power: speed,
    };
  }
}
