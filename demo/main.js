// demo/main.js — wires the "Launch Rebuilder" button in the demo page.
import { run } from "../src/app.js";

const btn = document.getElementById("launch-btn");

btn.addEventListener("click", () => {
  if (window.__pageRebuilder && window.__pageRebuilder.running) {
    window.__pageRebuilder.stop();
    btn.textContent = "▶ Launch Rebuilder";
    btn.classList.remove("active");
  } else {
    run();
    btn.textContent = "■ Stop";
    btn.classList.add("active");
  }
});
