// cursor.js — a single animated cursor element in the overlay.

import { makeCursorSVG } from "./shapes.js";

const CURSOR_SIZE = 22;

export class Cursor {
  constructor(container, color) {
    this.color = color;
    this.x = -100;
    this.y = -100;
    this._shape = "arrow";
    this._svg = null;

    this.el = document.createElement("div");
    this.el.style.cssText = `
      position:absolute; top:0; left:0; width:${CURSOR_SIZE}px; height:${CURSOR_SIZE}px;
      pointer-events:none; will-change:transform;
    `;
    container.appendChild(this.el);
    this.setShape("arrow");
  }

  setShape(shape) {
    if (shape === this._shape && this._svg) return;
    this._shape = shape;
    const { hx, hy, dataUrl } = makeCursorSVG(shape, this.color);
    this._hx = hx;
    this._hy = hy;
    this.el.style.backgroundImage = `url("${dataUrl}")`;
    this.el.style.backgroundSize   = "contain";
    this.el.style.backgroundRepeat = "no-repeat";
    this._svg = dataUrl;
  }

  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this.el.style.transform = `translate(${x - this._hx}px,${y - this._hy}px)`;
  }

  destroy() {
    this.el.remove();
  }
}
