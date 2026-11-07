// capture.js — walks the live DOM and returns a flat list of items to rebuild.
// Each item: { kind, x, y, w, h, text?, textStyle?, boxStyle?, imgSrc?, fontSize }

const MAX_ITEMS = 400;

const SKIP_TAGS = new Set([
  "script","style","noscript","template","head","meta","link","title",
  "base","source","track","param","area","map","datalist","page-rebuilder",
]);

export function pageBackground() {
  for (const el of [document.body, document.documentElement]) {
    if (!el) continue;
    const bg = getComputedStyle(el).backgroundColor;
    if (bg && alphaOf(bg) > 0.02) return bg;
  }
  return "#ffffff";
}

export function captureItems() {
  const items = [];
  const seen  = new WeakSet();

  for (const el of document.querySelectorAll("body *")) {
    if (items.length >= MAX_ITEMS) break;
    if (seen.has(el)) continue;

    const tag = el.localName;
    if (!tag || SKIP_TAGS.has(tag)) continue;

    const r  = el.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.bottom < 0 || r.top > innerHeight * 3) continue;
    if (r.right  < 0 || r.left > innerWidth)     continue;

    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if (parseFloat(cs.opacity) < 0.05) continue;

    let kind = classify(el, tag, cs);
    if (!kind) continue;

    seen.add(el);
    items.push({
      kind,
      x: r.left + scrollX,
      y: r.top  + scrollY,
      w: r.width,
      h: r.height,
      text:      kind === "text"  ? leafText(el)        : null,
      textStyle: kind === "text"  ? textStyle(cs)       : null,
      boxStyle:  kind === "rect"  ? boxStyle(cs)        : null,
      imgSrc:    kind === "image" ? imageSource(el)     : null,
      fontSize:  parseFloat(cs.fontSize) || 14,
    });
  }

  items.sort((a, b) => (a.y - b.y) || (a.x - b.x));
  return items;
}

// ─── helpers ──────────────────────────────────────────────────────────────

function classify(el, tag, cs) {
  if (["img","video","canvas","picture","svg"].includes(tag)) return "image";
  if (["input","textarea","select","button"].includes(tag))   return "widget";

  const hasBg     = alphaOf(cs.backgroundColor) > 0.04;
  const hasBorder = ["Top","Right","Bottom","Left"].some(s =>
    parseFloat(cs[`border${s}Width`]) > 0 && cs[`border${s}Style`] !== "none"
  );
  const hasShadow = cs.boxShadow && cs.boxShadow !== "none";
  if (hasBg || hasBorder || hasShadow) return "rect";

  const t = leafText(el);
  if (t && t.length > 1) return "text";

  return null;
}

function leafText(el) {
  return [...el.childNodes]
    .filter(n => n.nodeType === 3)
    .map(n => n.data)
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
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
    `text-align:${cs.textAlign}`,
  ].join(";");
}

function boxStyle(cs) {
  const props = [
    "background-color","background-image","background-size","background-position",
    "border-radius","box-shadow",
    "border-top","border-right","border-bottom","border-left",
  ];
  return props
    .map(k => { const v = cs.getPropertyValue(k); return v && v !== "none" && v !== "0px" ? `${k}:${v}` : ""; })
    .filter(Boolean).join(";");
}

function imageSource(el) {
  if (el.localName === "img")   return el.currentSrc || el.src || null;
  if (el.localName === "video") return el.poster || null;
  return null;
}
