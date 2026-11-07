// engine.js — drives one cursor through a list of items using a state machine.

import { Cursor } from "./cursor.js";

// px/s cursor travel speed
const SPEED = 420;
// pause before/after each action (ms)
const PRE_PAUSE  = 180;
const POST_PAUSE = 120;
// snap animation duration (ms)
const SNAP_MS = 220;

const CURSOR_COLORS = [
  "#e53935","#1e88e5","#43a047","#fb8c00",
  "#8e24aa","#00acc1","#f06292","#fdd835",
];

let _colorIdx = 0;
function nextColor() { return CURSOR_COLORS[_colorIdx++ % CURSOR_COLORS.length]; }

export class Engine {
  constructor(items, world, cursorsEl) {
    this.items    = items;
    this.world    = world;
    this.cursorsEl = cursorsEl;
    this.cursors  = [];
    this.jobs     = [];
    this._raf     = null;
    this._last    = null;
    this._running = false;
  }

  // Spawn n cursors and assign items round-robin.
  start(n = 4) {
    this._running = true;
    n = Math.min(n, 8, this.items.length || 1);
    for (let i = 0; i < n; i++) {
      const cur = new Cursor(this.cursorsEl, nextColor());
      // start cursors scattered around the viewport
      cur.moveTo(innerWidth * (0.2 + 0.6 * (i / n)), innerHeight * 0.5);
      this.cursors.push(cur);
      this.jobs.push({ cursor: cur, itemIdx: i, state: "idle", timer: 0, node: null });
    }
    // assign items: job i handles items[i], items[i+n], items[i+2n], …
    this._last = performance.now();
    this._raf  = requestAnimationFrame(this._tick.bind(this));
  }

  stop() {
    this._running = false;
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    for (const cur of this.cursors) cur.destroy();
  }

  _tick(now) {
    if (!this._running) return;
    const dt = Math.min((now - this._last) / 1000, 0.1);
    this._last = now;

    for (const job of this.jobs) {
      this._advance(job, dt);
    }

    this._raf = requestAnimationFrame(this._tick.bind(this));
  }

  _advance(job, dt) {
    const { cursor } = job;

    if (job.state === "idle") {
      // pick next item for this cursor
      const it = this._nextItem(job);
      if (!it) return; // all done
      job.it    = it;
      job.state = it.kind === "text" ? "move-to-text" : "move-to-rect";
      cursor.setShape("arrow");
    }

    if (job.state === "move-to-rect" || job.state === "move-to-text") {
      const it   = job.it;
      const dest = { x: it.x + scrollX, y: it.y + scrollY };
      const done = this._moveToward(cursor, dest, dt);
      if (done) {
        job.state = job.state === "move-to-text" ? "pre-type" : "pre-drag";
        job.timer = PRE_PAUSE / 1000;
        cursor.setShape(job.state === "pre-type" ? "ibeam" : "cross");
      }
    }

    else if (job.state === "pre-drag" || job.state === "pre-type") {
      job.timer -= dt;
      if (job.timer <= 0) {
        job.state = job.state === "pre-type" ? "typing" : "dragging";
        job.node  = this._spawnNode(job.it);
        if (job.state === "typing") {
          job.charIndex  = 0;
          job.charBudget = 0;
          job.speed      = Math.max(20, Math.min(80, 2000 / Math.max(1, job.it.text.length)));
          job.textSpan   = job.node.querySelector("span");
          job.caret      = job.node.querySelector(".caret");
        }
      }
    }

    else if (job.state === "dragging") {
      const it  = job.it;
      const tx  = it.x + it.w;
      const ty  = it.y + it.h;
      const dest = { x: tx + scrollX, y: ty + scrollY };
      const done = this._moveToward(cursor, dest, dt * 0.6); // drag is slower
      // grow the box as cursor moves
      const docX = cursor.x + scrollX;
      const docY = cursor.y + scrollY;
      job.node.style.width  = Math.max(4, docX - it.x) + "px";
      job.node.style.height = Math.max(4, docY - it.y) + "px";
      if (done) {
        job.state = "snap";
        job.timer = SNAP_MS / 1000;
        this._snapNode(job.node, job.it);
      }
    }

    else if (job.state === "typing") {
      const it   = job.it;
      job.charBudget += dt * job.speed;
      while (job.charBudget >= 1 && job.charIndex < it.text.length) {
        const ch = it.text[job.charIndex];
        const cost = ch === " " ? 1.4 : ch === "\n" ? 3 : 1;
        if (job.charBudget < cost) break;
        job.charBudget -= cost;
        job.charIndex++;
      }
      job.textSpan.textContent = it.text.slice(0, job.charIndex);
      // blink caret
      job.caret.style.opacity = Math.sin(performance.now() / 200) > 0 ? "1" : "0";
      if (job.charIndex >= it.text.length) {
        job.caret.style.opacity = "0";
        job.state = "post-action";
        job.timer = POST_PAUSE / 1000;
      }
    }

    else if (job.state === "snap") {
      job.timer -= dt;
      if (job.timer <= 0) {
        job.state = "post-action";
        job.timer = POST_PAUSE / 1000;
        cursor.setShape("arrow");
      }
    }

    else if (job.state === "post-action") {
      job.timer -= dt;
      if (job.timer <= 0) {
        job.node  = null;
        job.state = "idle";
      }
    }
  }

  _nextItem(job) {
    // find the next unclaimed item for this cursor
    const n = this.cursors.length;
    const cursorIdx = this.cursors.indexOf(job.cursor);
    // cycle through items assigned to this cursor
    if (!job._itemQueue) {
      job._itemQueue = this.items.filter((_, i) => i % n === cursorIdx);
      job._queuePos  = 0;
    }
    if (job._queuePos >= job._itemQueue.length) return null;
    return job._itemQueue[job._queuePos++];
  }

  _moveToward(cursor, dest, dt) {
    const dx = dest.x - cursor.x;
    const dy = dest.y - cursor.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = SPEED * dt;
    if (dist <= step) {
      cursor.moveTo(dest.x, dest.y);
      return true;
    }
    cursor.moveTo(cursor.x + (dx / dist) * step, cursor.y + (dy / dist) * step);
    return false;
  }

  _spawnNode(it) {
    const el = document.createElement("div");
    el.style.cssText = `
      position:absolute;
      left:${it.x}px; top:${it.y}px;
      width:4px; height:4px;
      overflow:hidden;
      box-sizing:border-box;
    `;

    if (it.kind === "text") {
      const span  = document.createElement("span");
      span.style.cssText = it.textStyle + ";white-space:pre-wrap;";
      const caret = document.createElement("span");
      caret.className = "caret";
      caret.style.cssText = `
        display:inline-block; width:2px; height:1em;
        background:currentColor; vertical-align:text-bottom; margin-left:1px;
      `;
      el.style.width  = it.w + "px";
      el.style.height = it.h + "px";
      el.appendChild(span);
      el.appendChild(caret);
    } else if (it.kind === "image" && it.imgSrc) {
      const img = document.createElement("img");
      img.src = it.imgSrc;
      img.style.cssText = "width:100%;height:100%;object-fit:cover;";
      el.appendChild(img);
    }

    this.world.appendChild(el);
    return el;
  }

  _snapNode(el, it) {
    el.style.transition = `width ${SNAP_MS}ms cubic-bezier(.2,.8,.2,1), height ${SNAP_MS}ms cubic-bezier(.2,.8,.2,1)`;
    el.style.width  = it.w + "px";
    el.style.height = it.h + "px";
    if (it.boxStyle) {
      el.setAttribute("style", el.getAttribute("style") + ";" + it.boxStyle);
    }
  }
}
