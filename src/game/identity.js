export class CircleIdentity {
  constructor({ data, source }) {
    if (data === undefined) {
      throw new Error('CircleIdentity: missing dependency "data".');
    }
    if (source === undefined) {
      throw new Error('CircleIdentity: missing dependency "source".');
    }
    this.data = data;
    this.source = source;
  }

  get(role) {
    if (typeof role !== "string") {
      throw new Error(`CircleIdentity: invalid role for source "${this.source}" (expected a string).`);
    }
    const identity = this.read("role", role);
    if (typeof identity.radius !== "number" || !(identity.radius > 0)) {
      throw new Error(`CircleIdentity: role "${role}" in source "${this.source}" has invalid "radius" (expected a positive number).`);
    }
    if (role === "target" && (typeof identity.hp !== "number" || !(identity.hp > 0))) {
      throw new Error(`CircleIdentity: role "${role}" in source "${this.source}" has invalid "hp" (expected a positive number).`);
    }
    return identity;
  }

  material(name) {
    if (typeof name !== "string") {
      throw new Error(`CircleIdentity: invalid material for source "${this.source}" (expected a string).`);
    }
    const identity = this.read("material", name);
    if (typeof identity.w !== "number" || !(identity.w > 0)) {
      throw new Error(`CircleIdentity: material "${name}" in source "${this.source}" has invalid "w" (expected a positive number).`);
    }
    if (typeof identity.h !== "number" || !(identity.h > 0)) {
      throw new Error(`CircleIdentity: material "${name}" in source "${this.source}" has invalid "h" (expected a positive number).`);
    }
    if (typeof identity.hp !== "number" || !(identity.hp > 0)) {
      throw new Error(`CircleIdentity: material "${name}" in source "${this.source}" has invalid "hp" (expected a positive number).`);
    }
    return identity;
  }

  read(kind, name) {
    const identityBlock = this.data.get(this.source, "identity");
    const identity = identityBlock[name];
    if (identity === undefined) {
      throw new Error(`CircleIdentity: unknown ${kind} "${name}" in source "${this.source}".`);
    }
    if (typeof identity.color !== "string") {
      throw new Error(`CircleIdentity: ${kind} "${name}" in source "${this.source}" has invalid "color" (expected a string).`);
    }
    return identity;
  }
}
