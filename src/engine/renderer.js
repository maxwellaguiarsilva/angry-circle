export class CanvasRenderer {
  constructor({ canvas, config }) {
    if (canvas === null || typeof canvas !== "object") {
      throw new Error('CanvasRenderer: missing dependency "canvas".');
    }
    this.validateConfig(config);
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    if (this.context === null) {
      throw new Error('CanvasRenderer: canvas.getContext("2d") returned null (2d context unavailable).');
    }
    canvas.width = config.width;
    canvas.height = config.height;
    this.background = config.background;
  }

  validateConfig(config) {
    if (config === null || typeof config !== "object") {
      throw new Error("CanvasRenderer: missing config with canvas tunables.");
    }
    if (typeof config.width !== "number" || !(config.width > 0)) {
      throw new Error('CanvasRenderer: config "width" must be a positive number (px).');
    }
    if (typeof config.height !== "number" || !(config.height > 0)) {
      throw new Error('CanvasRenderer: config "height" must be a positive number (px).');
    }
    if (typeof config.background !== "string") {
      throw new Error('CanvasRenderer: config "background" must be a string (fill color).');
    }
  }

  present() {
    this.context.fillStyle = this.background;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  circle({ x, y, radius, fill }) {
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("CanvasRenderer: circle requires numeric x and y.");
    }
    if (typeof radius !== "number" || !(radius > 0)) {
      throw new Error("CanvasRenderer: circle requires a positive numeric radius.");
    }
    if (typeof fill !== "string") {
      throw new Error("CanvasRenderer: circle requires a fill color string.");
    }
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.fillStyle = fill;
    this.context.fill();
  }

  ellipse({ x, y, rx, ry, fill }) {
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("CanvasRenderer: ellipse requires numeric x and y.");
    }
    if (typeof rx !== "number" || !(rx > 0) || typeof ry !== "number" || !(ry > 0)) {
      throw new Error("CanvasRenderer: ellipse requires positive numeric rx and ry.");
    }
    if (typeof fill !== "string") {
      throw new Error("CanvasRenderer: ellipse requires a fill color string.");
    }
    this.context.beginPath();
    this.context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    this.context.fillStyle = fill;
    this.context.fill();
  }

  rect({ x, y, w, h, fill }) {
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("CanvasRenderer: rect requires numeric x and y.");
    }
    if (typeof w !== "number" || !(w > 0) || typeof h !== "number" || !(h > 0)) {
      throw new Error("CanvasRenderer: rect requires positive numeric w and h.");
    }
    if (typeof fill !== "string") {
      throw new Error("CanvasRenderer: rect requires a fill color string.");
    }
    this.context.fillStyle = fill;
    this.context.fillRect(x - w / 2, y - h / 2, w, h);
  }

  line({ x1, y1, x2, y2, color, width }) {
    if (typeof x1 !== "number" || typeof y1 !== "number" || typeof x2 !== "number" || typeof y2 !== "number") {
      throw new Error("CanvasRenderer: line requires numeric x1, y1, x2 and y2.");
    }
    if (typeof color !== "string") {
      throw new Error("CanvasRenderer: line requires a color string.");
    }
    if (typeof width !== "number" || !(width > 0)) {
      throw new Error("CanvasRenderer: line requires a positive numeric width.");
    }
    this.context.beginPath();
    this.context.moveTo(x1, y1);
    this.context.lineTo(x2, y2);
    this.context.strokeStyle = color;
    this.context.lineWidth = width;
    this.context.stroke();
  }

  text({ x, y, value, font, fill, align }) {
    if (typeof x !== "number" || typeof y !== "number") {
      throw new Error("CanvasRenderer: text requires numeric x and y.");
    }
    if (typeof value !== "string") {
      throw new Error("CanvasRenderer: text requires a string value.");
    }
    if (typeof font !== "string" || typeof fill !== "string") {
      throw new Error("CanvasRenderer: text requires font and fill strings.");
    }
    const textAlign = align === undefined ? "left" : align;
    if (!TEXT_ALIGNS.includes(textAlign)) {
      throw new Error(`CanvasRenderer: text align must be one of ${TEXT_ALIGNS.join(", ")}.`);
    }
    this.context.font = font;
    this.context.fillStyle = fill;
    this.context.textAlign = textAlign;
    this.context.textBaseline = "top";
    this.context.fillText(value, x, y);
  }
}

const TEXT_ALIGNS = ["left", "center", "right"];
