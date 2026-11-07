(function() {
  "use strict";
  const MAX_ITEMS = 400;
  const SKIP_TAGS = /* @__PURE__ */ new Set([
    "script",
    "style",
    "noscript",
    "template",
    "head",
    "meta",
    "link",
    "title",
    "base",
    "source",
    "track",
    "param",
    "area",
    "map",
    "datalist",
    "page-rebuilder"
  ]);
  function pageBackground() {
    for (const el of [document.body, document.documentElement]) {
      if (!el) continue;
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && alphaOf(bg) > 0.02) return bg;
    }
    return "#ffffff";
  }
  function captureItems() {
    const items = [];
    const seen = /* @__PURE__ */ new WeakSet();
    for (const el of document.querySelectorAll("body *")) {
      if (items.length >= MAX_ITEMS) break;
      if (seen.has(el)) continue;
      const tag = el.localName;
      if (!tag || SKIP_TAGS.has(tag)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 6 || r.height < 6) continue;
      if (r.bottom < 0 || r.top > innerHeight * 3) continue;
      if (r.right < 0 || r.left > innerWidth) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (parseFloat(cs.opacity) < 0.05) continue;
      let kind = classify(el, tag, cs);
      if (!kind) continue;
      seen.add(el);
      items.push({
        kind,
        x: r.left + scrollX,
        y: r.top + scrollY,
        w: r.width,
        h: r.height,
        text: kind === "text" ? leafText(el) : null,
        textStyle: kind === "text" ? textStyle(cs) : null,
        boxStyle: kind === "rect" ? boxStyle(cs) : null,
        imgSrc: kind === "image" ? imageSource(el) : null,
        fontSize: parseFloat(cs.fontSize) || 14
      });
    }
    items.sort((a, b) => a.y - b.y || a.x - b.x);
    return items;
  }
  function classify(el, tag, cs) {
    if (["img", "video", "canvas", "picture", "svg"].includes(tag)) return "image";
    if (["input", "textarea", "select", "button"].includes(tag)) return "widget";
    const hasBg = alphaOf(cs.backgroundColor) > 0.04;
    const hasBorder = ["Top", "Right", "Bottom", "Left"].some(
      (s) => parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none"
    );
    const hasShadow = cs.boxShadow && cs.boxShadow !== "none";
    if (hasBg || hasBorder || hasShadow) return "rect";
    const t = leafText(el);
    if (t && t.length > 1) return "text";
    return null;
  }
  function leafText(el) {
    return [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.data).join("").replace(/\s+/g, " ").trim().slice(0, 300);
  }
  function alphaOf(c) {
    if (!c || c === "transparent") return 0;
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return 1;
    const p = m[1].split(",");
    return p.length >= 4 ? parseFloat(p[3]) : 1;
  }
  function textStyle(cs) {
    return [
      `color:${cs.color}`,
      `font-family:${cs.fontFamily}`,
      `font-size:${cs.fontSize}`,
      `font-weight:${cs.fontWeight}`,
      `line-height:${cs.lineHeight}`,
      `letter-spacing:${cs.letterSpacing}`,
      `text-align:${cs.textAlign}`
    ].join(";");
  }
  function boxStyle(cs) {
    const props = [
      "background-color",
      "background-image",
      "background-size",
      "background-position",
      "border-radius",
      "box-shadow",
      "border-top",
      "border-right",
      "border-bottom",
      "border-left"
    ];
    return props.map((k) => {
      const v = cs.getPropertyValue(k);
      return v && v !== "none" && v !== "0px" ? `${k}:${v}` : "";
    }).filter(Boolean).join(";");
  }
  function imageSource(el) {
    if (el.localName === "img") return el.currentSrc || el.src || null;
    if (el.localName === "video") return el.poster || null;
    return null;
  }
  function createOverlay(bgColor) {
    const host = document.createElement("page-rebuilder");
    host.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;";
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const canvas = document.createElement("div");
    canvas.style.cssText = `
    position:fixed; inset:0;
    background:${bgColor};
    overflow:hidden;
  `;
    shadow.appendChild(canvas);
    const world = document.createElement("div");
    world.style.cssText = `
    position:absolute; top:0; left:0;
    width:100%; height:100%;
    pointer-events:none;
  `;
    canvas.appendChild(world);
    const cursors = document.createElement("div");
    cursors.style.cssText = "position:fixed; inset:0; pointer-events:none;";
    canvas.appendChild(cursors);
    function syncScroll() {
      world.style.transform = `translate(${-scrollX}px,${-scrollY}px)`;
    }
    syncScroll();
    window.addEventListener("scroll", syncScroll, { passive: true });
    function destroy() {
      window.removeEventListener("scroll", syncScroll);
      host.remove();
    }
    return { host, canvas, world, cursors, destroy };
  }
  const ARROW_D = "M4,0 L4,16 L7,13 L10,19 L12,18 L9,12 L13,12 Z";
  const SHAPES = {
    arrow: (c) => ({
      hx: 5,
      hy: 4,
      svg: `<path d="${ARROW_D}" fill="${c}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>`
    }),
    cross: (c) => ({
      hx: 11,
      hy: 11,
      svg: `<g>
      <line x1="11" y1="2"  x2="11" y2="20" stroke="#fff" stroke-width="3"/>
      <line x1="2"  y1="11" x2="20" y2="11" stroke="#fff" stroke-width="3"/>
      <line x1="11" y1="2"  x2="11" y2="20" stroke="${c}" stroke-width="1.5"/>
      <line x1="2"  y1="11" x2="20" y2="11" stroke="${c}" stroke-width="1.5"/>
    </g>`
    }),
    ibeam: (c) => ({
      hx: 11,
      hy: 11,
      svg: `<g>
      <line x1="11" y1="3"  x2="11" y2="19" stroke="#fff" stroke-width="2.5"/>
      <line x1="8"  y1="3"  x2="14" y2="3"  stroke="#fff" stroke-width="2.5"/>
      <line x1="8"  y1="19" x2="14" y2="19" stroke="#fff" stroke-width="2.5"/>
      <line x1="11" y1="3"  x2="11" y2="19" stroke="${c}" stroke-width="1.5"/>
      <line x1="8"  y1="3"  x2="14" y2="3"  stroke="${c}" stroke-width="1.5"/>
      <line x1="8"  y1="19" x2="14" y2="19" stroke="${c}" stroke-width="1.5"/>
    </g>`
    })
  };
  function makeCursorSVG(shape, color) {
    const { hx, hy, svg } = SHAPES[shape](color);
    return {
      hx,
      hy,
      dataUrl: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">${svg}</svg>`
      )}`
    };
  }
  const CURSOR_SIZE = 22;
  class Cursor {
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
      this.el.style.backgroundSize = "contain";
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
  const SPEED = 420;
  const PRE_PAUSE = 180;
  const POST_PAUSE = 120;
  const SNAP_MS = 220;
  const CURSOR_COLORS = [
    "#e53935",
    "#1e88e5",
    "#43a047",
    "#fb8c00",
    "#8e24aa",
    "#00acc1",
    "#f06292",
    "#fdd835"
  ];
  let _colorIdx = 0;
  function nextColor() {
    return CURSOR_COLORS[_colorIdx++ % CURSOR_COLORS.length];
  }
  class Engine {
    constructor(items, world, cursorsEl) {
      this.items = items;
      this.world = world;
      this.cursorsEl = cursorsEl;
      this.cursors = [];
      this.jobs = [];
      this._raf = null;
      this._last = null;
      this._running = false;
    }
    // Spawn n cursors and assign items round-robin.
    start(n = 4) {
      this._running = true;
      n = Math.min(n, 8, this.items.length || 1);
      for (let i = 0; i < n; i++) {
        const cur = new Cursor(this.cursorsEl, nextColor());
        cur.moveTo(innerWidth * (0.2 + 0.6 * (i / n)), innerHeight * 0.5);
        this.cursors.push(cur);
        this.jobs.push({ cursor: cur, itemIdx: i, state: "idle", timer: 0, node: null });
      }
      this._last = performance.now();
      this._raf = requestAnimationFrame(this._tick.bind(this));
    }
    stop() {
      this._running = false;
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      for (const cur of this.cursors) cur.destroy();
    }
    _tick(now) {
      if (!this._running) return;
      const dt = Math.min((now - this._last) / 1e3, 0.1);
      this._last = now;
      for (const job of this.jobs) {
        this._advance(job, dt);
      }
      this._raf = requestAnimationFrame(this._tick.bind(this));
    }
    _advance(job, dt) {
      const { cursor } = job;
      if (job.state === "idle") {
        const it = this._nextItem(job);
        if (!it) return;
        job.it = it;
        job.state = it.kind === "text" ? "move-to-text" : "move-to-rect";
        cursor.setShape("arrow");
      }
      if (job.state === "move-to-rect" || job.state === "move-to-text") {
        const it = job.it;
        const dest = { x: it.x + scrollX, y: it.y + scrollY };
        const done = this._moveToward(cursor, dest, dt);
        if (done) {
          job.state = job.state === "move-to-text" ? "pre-type" : "pre-drag";
          job.timer = PRE_PAUSE / 1e3;
          cursor.setShape(job.state === "pre-type" ? "ibeam" : "cross");
        }
      } else if (job.state === "pre-drag" || job.state === "pre-type") {
        job.timer -= dt;
        if (job.timer <= 0) {
          job.state = job.state === "pre-type" ? "typing" : "dragging";
          job.node = this._spawnNode(job.it);
          if (job.state === "typing") {
            job.charIndex = 0;
            job.charBudget = 0;
            job.speed = Math.max(20, Math.min(80, 2e3 / Math.max(1, job.it.text.length)));
            job.textSpan = job.node.querySelector("span");
            job.caret = job.node.querySelector(".caret");
          }
        }
      } else if (job.state === "dragging") {
        const it = job.it;
        const tx = it.x + it.w;
        const ty = it.y + it.h;
        const dest = { x: tx + scrollX, y: ty + scrollY };
        const done = this._moveToward(cursor, dest, dt * 0.6);
        const docX = cursor.x + scrollX;
        const docY = cursor.y + scrollY;
        job.node.style.width = Math.max(4, docX - it.x) + "px";
        job.node.style.height = Math.max(4, docY - it.y) + "px";
        if (done) {
          job.state = "snap";
          job.timer = SNAP_MS / 1e3;
          this._snapNode(job.node, job.it);
        }
      } else if (job.state === "typing") {
        const it = job.it;
        job.charBudget += dt * job.speed;
        while (job.charBudget >= 1 && job.charIndex < it.text.length) {
          const ch = it.text[job.charIndex];
          const cost = ch === " " ? 1.4 : ch === "\n" ? 3 : 1;
          if (job.charBudget < cost) break;
          job.charBudget -= cost;
          job.charIndex++;
        }
        job.textSpan.textContent = it.text.slice(0, job.charIndex);
        job.caret.style.opacity = Math.sin(performance.now() / 200) > 0 ? "1" : "0";
        if (job.charIndex >= it.text.length) {
          job.caret.style.opacity = "0";
          job.state = "post-action";
          job.timer = POST_PAUSE / 1e3;
        }
      } else if (job.state === "snap") {
        job.timer -= dt;
        if (job.timer <= 0) {
          job.state = "post-action";
          job.timer = POST_PAUSE / 1e3;
          cursor.setShape("arrow");
        }
      } else if (job.state === "post-action") {
        job.timer -= dt;
        if (job.timer <= 0) {
          job.node = null;
          job.state = "idle";
        }
      }
    }
    _nextItem(job) {
      const n = this.cursors.length;
      const cursorIdx = this.cursors.indexOf(job.cursor);
      if (!job._itemQueue) {
        job._itemQueue = this.items.filter((_, i) => i % n === cursorIdx);
        job._queuePos = 0;
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
      cursor.moveTo(cursor.x + dx / dist * step, cursor.y + dy / dist * step);
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
        const span = document.createElement("span");
        span.style.cssText = it.textStyle + ";white-space:pre-wrap;";
        const caret = document.createElement("span");
        caret.className = "caret";
        caret.style.cssText = `
        display:inline-block; width:2px; height:1em;
        background:currentColor; vertical-align:text-bottom; margin-left:1px;
      `;
        el.style.width = it.w + "px";
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
      el.style.width = it.w + "px";
      el.style.height = it.h + "px";
      if (it.boxStyle) {
        el.setAttribute("style", el.getAttribute("style") + ";" + it.boxStyle);
      }
    }
  }
  function run() {
    if (window.__pageRebuilder && window.__pageRebuilder.running) return;
    const items = captureItems();
    const bgColor = pageBackground();
    const { world, cursors: cursorsEl, destroy: destroyOverlay } = createOverlay(bgColor);
    const engine = new Engine(items, world, cursorsEl);
    engine.start(4);
    function stop() {
      engine.stop();
      destroyOverlay();
      window.__pageRebuilder = { running: false };
    }
    window.__pageRebuilder = { running: true, stop };
  }
  run();
})();
