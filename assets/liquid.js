// Liquid controls: the light follows the pointer, full-mode controls drift a
// few pixels toward it, and a press gives then springs back. See liquid.css.
(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const PULL_X = 8, PULL_Y = 6; // max drift in px, full mode only

  document.querySelectorAll("[data-liquid]").forEach(el => {
    const mode = el.dataset.liquid || "";
    const magnet = mode === "" && fine && !reduce;
    el.classList.add("liquid");

    const move = e => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
      if (magnet) {
        el.style.setProperty("--tx", ((x - .5) * PULL_X).toFixed(1) + "px");
        el.style.setProperty("--ty", ((y - .5) * PULL_Y).toFixed(1) + "px");
      }
    };
    const rest = () => {
      el.classList.remove("is-near", "is-pressed");
      el.style.setProperty("--tx", "0px"); el.style.setProperty("--ty", "0px");
    };
    const release = () => el.classList.remove("is-pressed");

    el.addEventListener("pointerenter", e => { el.classList.add("is-near"); move(e); });
    el.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerleave", rest);
    el.addEventListener("pointerdown", () => el.classList.add("is-pressed"));
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    // keyboard users get the same press
    el.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") el.classList.add("is-pressed"); });
    el.addEventListener("keyup", release);
    el.addEventListener("blur", release);
  });
})();
