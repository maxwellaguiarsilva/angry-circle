export class Physics {
  constructor({ config }) {
    this.validateConfig(config);
    this.gravity = config.gravity;
    this.restitution = config.restitution;
    this.density = config.density;
    this.solverIterations = config["solver-iterations"];
    if (config["ground-y"] === undefined) {
      this.groundY = null;
    } else {
      this.groundY = config["ground-y"];
    }
    if (config["left-x"] === undefined) {
      this.leftX = null;
    } else {
      this.leftX = config["left-x"];
    }
    if (config["right-x"] === undefined) {
      this.rightX = null;
    } else {
      this.rightX = config["right-x"];
    }
    this.bodies = [];
    this.collisionCallback = null;
    this.contacts = new Map();
    this.impacts = new Map();
  }

  validateConfig(config) {
    if (config === null || typeof config !== "object") {
      throw new Error("Physics: missing config with physics tunables.");
    }
    if (typeof config.gravity !== "number" || config.gravity < 0) {
      throw new Error('Physics: config "gravity" must be a non-negative number (px/s^2).');
    }
    if (typeof config.restitution !== "number" || config.restitution < 0 || config.restitution > 1) {
      throw new Error('Physics: config "restitution" must be a number between 0 and 1.');
    }
    if (typeof config.density !== "number" || !(config.density > 0)) {
      throw new Error('Physics: config "density" must be a positive number (mass per px^2).');
    }
    if (!Number.isInteger(config["solver-iterations"]) || !(config["solver-iterations"] > 0)) {
      throw new Error('Physics: config "solver-iterations" must be a positive integer.');
    }
    if (
      config["ground-y"] !== undefined &&
      (typeof config["ground-y"] !== "number" || !Number.isFinite(config["ground-y"]))
    ) {
      throw new Error('Physics: config "ground-y" must be a finite number (px).');
    }
    if (
      config["left-x"] !== undefined &&
      (typeof config["left-x"] !== "number" || !Number.isFinite(config["left-x"]))
    ) {
      throw new Error('Physics: config "left-x" must be a finite number (px).');
    }
    if (
      config["right-x"] !== undefined &&
      (typeof config["right-x"] !== "number" || !Number.isFinite(config["right-x"]))
    ) {
      throw new Error('Physics: config "right-x" must be a finite number (px).');
    }
  }

  onCollision(callback) {
    if (typeof callback !== "function") {
      throw new Error("Physics: onCollision expects a function callback.");
    }
    this.collisionCallback = callback;
    return this;
  }

  add(body) {
    if (body === null || typeof body !== "object") {
      throw new Error("Physics: add expects a body object.");
    }
    if (typeof body.x !== "number" || typeof body.y !== "number") {
      throw new Error("Physics: body requires numeric x and y.");
    }
    if (typeof body.vx !== "number" || typeof body.vy !== "number") {
      throw new Error("Physics: body requires numeric vx and vy.");
    }
    const hasRadius = typeof body.radius === "number";
    const hasRectSize = typeof body.w === "number" && typeof body.h === "number";
    if (hasRadius && hasRectSize) {
      throw new Error("Physics: body must be a circle (radius) or a rectangle (w and h), never both.");
    }
    if (hasRadius) {
      if (!(body.radius > 0)) {
        throw new Error("Physics: body requires a positive numeric radius.");
      }
    } else if (hasRectSize) {
      if (!(body.w > 0) || !(body.h > 0)) {
        throw new Error("Physics: rectangle body requires positive numeric w and h.");
      }
    } else {
      throw new Error("Physics: body requires either a positive radius or positive w and h.");
    }
    this.bodies.push(body);
    return this;
  }

  clear() {
    this.bodies.length = 0;
    return this;
  }

  remove(body) {
    if (body === null || typeof body !== "object") {
      throw new Error("Physics: remove expects a body object.");
    }
    const index = this.bodies.indexOf(body);
    if (index === -1) {
      throw new Error("Physics: remove expects a body present in the simulation.");
    }
    this.bodies.splice(index, 1);
    return this;
  }

  isRect(body) {
    return typeof body.w === "number" && typeof body.h === "number";
  }

  halfWidth(body) {
    return this.isRect(body) ? body.w / 2 : body.radius;
  }

  halfHeight(body) {
    return this.isRect(body) ? body.h / 2 : body.radius;
  }

  mass(body) {
    if (this.isRect(body)) {
      return this.density * body.w * body.h;
    }
    return this.density * body.radius * body.radius;
  }

  step(dt) {
    if (typeof dt !== "number" || !(dt > 0)) {
      throw new Error("Physics: step expects a positive dt.");
    }
    this.contacts.clear();
    this.impacts.clear();
    for (const body of this.bodies) {
      body.vy += this.gravity * dt;
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    }
    this.constrainToGround(dt);
    this.constrainToHorizontalBounds(dt);
    for (let i = 0; i < this.solverIterations; i++) {
      this.solveCollisions();
    }
    this.constrainToGround(dt);
    this.constrainToHorizontalBounds(dt);
    this.emitContacts();
  }

  constrainToGround(dt) {
    if (this.groundY === null) {
      return;
    }
    const fallPerStep = this.gravity * dt;
    for (const body of this.bodies) {
      if (body.y + this.halfHeight(body) > this.groundY) {
        body.y = this.groundY - this.halfHeight(body);
        if (body.vy > 0) {
          const bounced = -body.vy * this.restitution;
          body.vy = Math.abs(bounced) > fallPerStep ? bounced : 0;
        }
      }
    }
  }

  constrainToHorizontalBounds() {
    if (this.leftX === null && this.rightX === null) {
      return;
    }
    for (const body of this.bodies) {
      if (this.leftX !== null && body.x - this.halfWidth(body) < this.leftX) {
        body.x = this.leftX + this.halfWidth(body);
        if (body.vx < 0) {
          body.vx = -body.vx * this.restitution;
        }
      }
      if (this.rightX !== null && body.x + this.halfWidth(body) > this.rightX) {
        body.x = this.rightX - this.halfWidth(body);
        if (body.vx > 0) {
          body.vx = -body.vx * this.restitution;
        }
      }
    }
  }

  solveCollisions() {
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const a = this.bodies[i];
        const b = this.bodies[j];
        const key = i * this.bodies.length + j;
        if (this.overlapping(a, b)) {
          this.contacts.set(key, [a, b]);
        }
        const impact = this.solvePair(a, b);
        if (!this.impacts.has(key)) {
          this.impacts.set(key, impact);
        }
      }
    }
  }

  emitContacts() {
    if (this.collisionCallback === null) {
      return;
    }
    for (const [key, [a, b]] of this.contacts) {
      this.collisionCallback({ a, b, impact: this.impacts.get(key) });
    }
  }

  closestPointDeltaOnRect(circle, rect) {
    const rx = this.halfWidth(rect);
    const ry = this.halfHeight(rect);
    const closestX = Math.max(rect.x - rx, Math.min(circle.x, rect.x + rx));
    const closestY = Math.max(rect.y - ry, Math.min(circle.y, rect.y + ry));
    return {
      dx: circle.x - closestX,
      dy: circle.y - closestY,
    };
  }

  overlapping(a, b) {
    const aCircle = !this.isRect(a);
    const bCircle = !this.isRect(b);
    if (aCircle && bCircle) {
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      return dist < a.radius + b.radius;
    }
    if (this.isRect(a) && this.isRect(b)) {
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      return dx < this.halfWidth(a) + this.halfWidth(b) && dy < this.halfHeight(a) + this.halfHeight(b);
    }
    const circle = aCircle ? a : b;
    const rect = aCircle ? b : a;
    const { dx, dy } = this.closestPointDeltaOnRect(circle, rect);
    const distSq = dx * dx + dy * dy;
    if (distSq === 0) {
      return true;
    }
    return distSq < circle.radius * circle.radius;
  }

  solvePair(a, b) {
    const aCircle = !this.isRect(a);
    const bCircle = !this.isRect(b);
    if (aCircle && bCircle) {
      return this.solveCircleCircle(a, b);
    }
    if (this.isRect(a) && this.isRect(b)) {
      return this.solveRectRect(a, b);
    }
    const circle = aCircle ? a : b;
    const rect = aCircle ? b : a;
    return this.solveCircleRect(circle, rect);
  }

  solveCircleCircle(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    let nx;
    let ny;
    if (dist === 0) {
      nx = 1;
      ny = 0;
      dist = a.radius + b.radius;
    } else {
      nx = dx / dist;
      ny = dy / dist;
    }
    const overlap = a.radius + b.radius - dist;
    if (overlap <= 0) {
      return 0;
    }
    return this.applyImpulse(a, b, nx, ny, overlap);
  }

  solveRectRect(a, b) {
    const overlapX = this.halfWidth(a) + this.halfWidth(b) - Math.abs(a.x - b.x);
    const overlapY = this.halfHeight(a) + this.halfHeight(b) - Math.abs(a.y - b.y);
    if (overlapX <= 0 || overlapY <= 0) {
      return 0;
    }
    let nx;
    let ny;
    let overlap;
    if (overlapX < overlapY) {
      nx = b.x - a.x < 0 ? -1 : 1;
      ny = 0;
      overlap = overlapX;
    } else {
      nx = 0;
      ny = b.y - a.y < 0 ? -1 : 1;
      overlap = overlapY;
    }
    return this.applyImpulse(a, b, nx, ny, overlap);
  }

  solveCircleRect(circle, rect) {
    const { dx, dy } = this.closestPointDeltaOnRect(circle, rect);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      const penX = this.halfWidth(rect) + circle.radius - Math.abs(circle.x - rect.x);
      const penY = this.halfHeight(rect) + circle.radius - Math.abs(circle.y - rect.y);
      let nx;
      let ny;
      let overlap;
      if (penX < penY) {
        nx = circle.x - rect.x < 0 ? -1 : 1;
        ny = 0;
        overlap = penX;
      } else {
        nx = 0;
        ny = circle.y - rect.y < 0 ? -1 : 1;
        overlap = penY;
      }
      return this.applyImpulse(rect, circle, nx, ny, overlap);
    }
    const overlap = circle.radius - dist;
    if (overlap <= 0) {
      return 0;
    }
    return this.applyImpulse(rect, circle, dx / dist, dy / dist, overlap);
  }

  relativeNormalSpeed(a, b, nx, ny) {
    const rvx = b.vx - a.vx;
    const rvy = b.vy - a.vy;
    return rvx * nx + rvy * ny;
  }

  applyImpulse(a, b, nx, ny, overlap) {
    const invA = 1 / this.mass(a);
    const invB = 1 / this.mass(b);
    const totalInv = invA + invB;
    a.x -= nx * overlap * (invA / totalInv);
    a.y -= ny * overlap * (invA / totalInv);
    b.x += nx * overlap * (invB / totalInv);
    b.y += ny * overlap * (invB / totalInv);
    const vn = this.relativeNormalSpeed(a, b, nx, ny);
    if (vn > 0) {
      return 0;
    }
    const impulse = (-(1 + this.restitution) * vn) / totalInv;
    a.vx -= impulse * nx * invA;
    a.vy -= impulse * ny * invA;
    b.vx += impulse * nx * invB;
    b.vy += impulse * ny * invB;
    return Math.max(0, -vn);
  }
}
