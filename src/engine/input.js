export class PointerInput {
  constructor({ target, getPosition }) {
    if (
      target === undefined ||
      target === null ||
      typeof target.addEventListener !== "function" ||
      typeof target.removeEventListener !== "function"
    ) {
      throw new Error(
        'PointerInput: missing dependency "target" (an object with addEventListener/removeEventListener).',
      );
    }
    if (getPosition === undefined) {
      throw new Error('PointerInput: missing dependency "getPosition" (event to {x, y} mapper).');
    }
    if (typeof getPosition !== "function") {
      throw new Error('PointerInput: dependency "getPosition" must be a function.');
    }
    this.target = target;
    this.getPosition = getPosition;
    this.downCallback = null;
    this.moveCallback = null;
    this.upCallback = null;
    this.origin = null;
    this.onPointerDown = (event) => this.handlePointerDown(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerUp = (event) => this.handlePointerUp(event);
  }

  onDown(callback) {
    this.validateHandler(callback, "onDown");
    this.downCallback = callback;
    return this;
  }

  onMove(callback) {
    this.validateHandler(callback, "onMove");
    this.moveCallback = callback;
    return this;
  }

  onUp(callback) {
    this.validateHandler(callback, "onUp");
    this.upCallback = callback;
    return this;
  }

  validateHandler(callback, method) {
    if (typeof callback !== "function") {
      throw new Error(`PointerInput: ${method} expects a function.`);
    }
  }

  attach() {
    this.target.addEventListener("pointerdown", this.onPointerDown);
    this.target.addEventListener("pointermove", this.onPointerMove);
    this.target.addEventListener("pointerup", this.onPointerUp);
    this.target.addEventListener("pointercancel", this.onPointerUp);
    return this;
  }

  detach() {
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("pointermove", this.onPointerMove);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
    this.origin = null;
    return this;
  }

  handlePointerDown(event) {
    const position = this.getPosition(event);
    this.origin = position;
    if (this.downCallback !== null) {
      this.downCallback({ x: position.x, y: position.y });
    }
  }

  handlePointerMove(event) {
    if (this.origin === null) {
      return;
    }
    const position = this.getPosition(event);
    const vector = dragVector(this.origin, position);
    if (this.moveCallback !== null) {
      this.moveCallback({ x: position.x, y: position.y, dx: vector.dx, dy: vector.dy });
    }
  }

  handlePointerUp(event) {
    if (this.origin === null) {
      return;
    }
    const position = this.getPosition(event);
    const vector = dragVector(this.origin, position);
    const origin = this.origin;
    this.origin = null;
    if (this.upCallback !== null) {
      this.upCallback({
        x: position.x,
        y: position.y,
        dx: vector.dx,
        dy: vector.dy,
        startX: origin.x,
        startY: origin.y,
      });
    }
  }
}

function dragVector(start, end) {
  return { dx: end.x - start.x, dy: end.y - start.y };
}
