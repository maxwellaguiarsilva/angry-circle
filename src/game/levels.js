export class Levels {
  constructor({ data, source, materials }) {
    if (data === undefined) {
      throw new Error('Levels: missing dependency "data".');
    }
    if (source === undefined) {
      throw new Error('Levels: missing dependency "source".');
    }
    if (materials === undefined) {
      throw new Error('Levels: missing dependency "materials".');
    }
    if (!Array.isArray(materials) || materials.length === 0) {
      throw new Error('Levels: invalid dependency "materials" (expected a non-empty array).');
    }
    for (const name of materials) {
      if (typeof name !== "string" || name.length === 0) {
        throw new Error('Levels: invalid dependency "materials" (expected non-empty strings).');
      }
    }
    this.data = data;
    this.source = source;
    this.materials = materials;
  }

  readLevels() {
    const levels = this.data.get(this.source, "levels");
    if (!Array.isArray(levels) || levels.length === 0) {
      throw new Error(
        `Levels: invalid "levels" in source "${this.source}" (expected a non-empty array).`,
      );
    }
    return levels;
  }

  count() {
    return this.readLevels().length;
  }

  get(index) {
    if (!Number.isInteger(index)) {
      throw new Error(
        `Levels: invalid level index for source "${this.source}" (expected an integer).`,
      );
    }
    const levels = this.readLevels();
    const level = levels[index];
    if (level === undefined) {
      throw new Error(
        `Levels: level index ${index} out of range in source "${this.source}" (0..${levels.length - 1}).`,
      );
    }
    if (typeof level.launches !== "number" || !Number.isInteger(level.launches) || level.launches <= 0) {
      throw new Error(
        `Levels: level ${index} in source "${this.source}" has invalid "launches" (expected a positive integer).`,
      );
    }
    if (!Array.isArray(level.targets) || level.targets.length === 0) {
      throw new Error(
        `Levels: level ${index} in source "${this.source}" has invalid "targets" (expected a non-empty array).`,
      );
    }
    for (let targetIndex = 0; targetIndex < level.targets.length; targetIndex += 1) {
      const target = level.targets[targetIndex];
      if (typeof target.x !== "number" || !Number.isFinite(target.x)) {
        throw new Error(
          `Levels: target ${targetIndex} of level ${index} in source "${this.source}" has invalid "x" (expected a finite number).`,
        );
      }
      if (typeof target.y !== "number" || !Number.isFinite(target.y)) {
        throw new Error(
          `Levels: target ${targetIndex} of level ${index} in source "${this.source}" has invalid "y" (expected a finite number).`,
        );
      }
      const shape = target.shape === undefined ? "circle" : target.shape;
      if (shape !== "circle" && shape !== "block") {
        throw new Error(
          `Levels: target ${targetIndex} of level ${index} in source "${this.source}" has unknown "shape" "${target.shape}" (expected "circle" or "block").`,
        );
      }
      if (shape === "circle") {
        if (target.material !== undefined) {
          throw new Error(
            `Levels: target ${targetIndex} of level ${index} in source "${this.source}" has "material" on a "circle" target (materials only apply to "block" targets).`,
          );
        }
      } else if (typeof target.material !== "string" || target.material.length === 0) {
        throw new Error(
          `Levels: target ${targetIndex} of level ${index} in source "${this.source}" is a "block" target but lacks a valid "material".`,
        );
      } else if (!this.materials.includes(target.material)) {
        throw new Error(
          `Levels: target ${targetIndex} of level ${index} in source "${this.source}" has unknown "material" "${target.material}" (expected one of ${this.materials.join(", ")}).`,
        );
      }
    }
    return level;
  }
}
