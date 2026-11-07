// app.js — wires capture → overlay → engine and owns the lifecycle.

import { captureItems, pageBackground } from "./capture.js";
import { createOverlay } from "./overlay.js";
import { Engine } from "./engine.js";

export function run() {
  if (window.__pageRebuilder && window.__pageRebuilder.running) return;

  const items  = captureItems();
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
