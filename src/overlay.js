// overlay.js — full-page canvas that sits above the real page.
// Uses Shadow DOM so page CSS never leaks in.

export function createOverlay(bgColor) {
  const host = document.createElement("page-rebuilder");
  host.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483647;pointer-events:none;";
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });

  // Blank canvas that covers the whole viewport.
  const canvas = document.createElement("div");
  canvas.style.cssText = `
    position:fixed; inset:0;
    background:${bgColor};
    overflow:hidden;
  `;
  shadow.appendChild(canvas);

  // "World" layer: same coordinate space as the document (scrolls with page).
  const world = document.createElement("div");
  world.style.cssText = `
    position:absolute; top:0; left:0;
    width:100%; height:100%;
    pointer-events:none;
  `;
  canvas.appendChild(world);

  // Cursor layer: fixed, always on top.
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
