// One "Reduce motion" switch for the whole site (WCAG 2.2.2 and 2.3.3).
// <head> sets html.rm before the first paint, from the stored choice or, if the visitor never
// used the switch, their system setting. Flipping a switch updates every switch on the page and
// fires "cw-motion" on document, so scripts can stop or restart their own motion; CSS keys off html.rm.
// Only a choice that differs from the system setting is stored.
(() => {
  const root = document.documentElement;
  const sys = matchMedia("(prefers-reduced-motion: reduce)");
  const read = () => { try { return localStorage.getItem("cw-motion"); } catch { return null; } };
  const write = v => { try { v == null ? localStorage.removeItem("cw-motion") : localStorage.setItem("cw-motion", v); } catch {} };
  const switches = [...document.querySelectorAll(".rm-switch")];
  const paint = () => switches.forEach(b => b.setAttribute("aria-checked", String(root.classList.contains("rm"))));
  const set = on => {
    if (root.classList.contains("rm") !== on) {
      root.classList.toggle("rm", on);
      document.dispatchEvent(new CustomEvent("cw-motion", { detail: { reduce: on } }));
    }
    paint();
  };
  switches.forEach(b => {
    b.hidden = false;
    b.addEventListener("click", () => {
      const on = !root.classList.contains("rm");
      write(on === sys.matches ? null : on ? "reduce" : "full");
      set(on);
    });
  });
  if (sys.addEventListener) sys.addEventListener("change", () => {
    const m = read();
    if (m !== "reduce" && m !== "full") set(sys.matches);
  });
  paint();
})();
