// Services slide sideways. On a wide, tall enough screen the four columns pin in the middle of
// the viewport and travel left one pixel for every pixel scrolled down, then the page carries on.
// It is still a normal vertical scroll (no wheel hijack, no snapping), so trackpads, keys and the
// scrollbar all behave. Phones, short windows and Reduce motion keep the plain grid.
(() => {
  const box = document.querySelector("[data-hs]");
  if (!box) return;
  const root = document.documentElement;
  const pin = box.querySelector(".hs-pin"), track = box.querySelector(".lines");
  const bar = box.querySelector(".hs-bar"), labels = [...box.querySelectorAll(".hs-rail li")];
  const fits = matchMedia("(min-width: 1100px) and (min-height: 560px)");
  const NAV = 68;
  let on = false, travel = 0, top = 0, raf = 0;

  const update = () => {
    raf = 0;
    if (!on) return;
    const p = travel ? Math.min(1, Math.max(0, (top - box.getBoundingClientRect().top) / travel)) : 0;
    track.style.translate = `${(-p * travel).toFixed(1)}px 0`;
    bar.style.setProperty("--p", p.toFixed(3));
    const i = Math.min(labels.length - 1, Math.round(p * (labels.length - 1)));
    labels.forEach((l, n) => l.classList.toggle("is-on", n === i));
  };
  const measure = () => {
    on = fits.matches && !root.classList.contains("rm");
    box.classList.toggle("on", on);
    if (on && pin.offsetHeight > innerHeight - NAV - 16) { on = false; box.classList.remove("on"); } // would not fit: keep the grid
    if (!on) { box.style.height = track.style.translate = ""; return; }
    const cs = getComputedStyle(pin); // the pin is padded out into both lanes so the cards fade instead of clip
    travel = Math.max(0, track.scrollWidth - (pin.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
    top = Math.max(NAV + 8, Math.round((innerHeight - pin.offsetHeight + NAV) / 2));
    box.style.setProperty("--hs-top", `${top}px`);
    box.style.height = `${pin.offsetHeight + travel}px`;
    update();
  };

  addEventListener("scroll", () => { if (on && !raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener("resize", measure);
  fits.addEventListener?.("change", measure);
  document.addEventListener("cw-motion", measure);
  measure();
  document.fonts?.ready.then(measure);
})();
