// The hero console: tap what eats your week and ClashBot says which package it would start with.
// Each chip is a .tile in #picker (operator.js reacts to the same clicks). Every link to the form on the
// page (console button, hero, nav, packages, closing, phone bar) carries the picks as ?byhand=, which
// check.html sanitizes, so every value stays inside [A-Za-z0-9 ,'-]. No picks, plain check.html.
// State changes are instant; nothing here moves, so it works the same under Reduce motion.
(() => {
  // the spec table, in order: a tie goes to the package whose first chip comes earliest
  const PACKAGES = [
    { chip: "Missed calls on a job", value: "Missed calls", pkg: "Never Miss a Customer" },
    { chip: "Writing quotes at night", value: "Quoting and estimates", pkg: "One Chore, Gone" },
    { chip: "Chasing late payments", value: "Invoicing and chasing payment", pkg: "One Chore, Gone" },
    { chip: "Appointment reminders", value: "Scheduling and reminders", pkg: "One Chore, Gone" },
    { chip: "Asking for reviews", value: "Asking for reviews", pkg: "One Quick Fix" },
    { chip: "Same questions all day", value: "Answering the same questions over and over", pkg: "One Chore, Gone" },
    { chip: "Owner reports", value: "Owner reports", pkg: "Rental Owner Reports" },
    { chip: "Double bookings", value: "Double bookings", pkg: "Rental Owner Reports" }
  ];

  // the package with the most picks; ties go to the earliest in PACKAGES; no picks, no package
  const pickPackage = values => {
    const counts = new Map();
    (values || []).forEach(v => {
      const row = PACKAGES.find(p => p.value === v);
      if (row) counts.set(row.pkg, (counts.get(row.pkg) || 0) + 1);
    });
    let best = null, most = 0;
    PACKAGES.forEach(({ pkg }) => { const n = counts.get(pkg) || 0; if (n > most) { best = pkg; most = n; } });
    return best;
  };

  window.cwConsole = { PACKAGES, pickPackage };

  const FORM = "check.html";
  const EMPTY = "Waiting for your picks. I'll tell you where I'd start.";
  const LINES = ["Hi, I'm ClashBot. Tick what eats your week.", "Scanning. Keep going.", "That's a lot of busywork. I can take it."];

  const init = () => {
    const picker = document.getElementById("picker");
    const readout = document.getElementById("readout"), cta = document.getElementById("picker-cta");
    const label = document.getElementById("cta-label"), bubble = document.getElementById("console-bubble");
    if (!picker || !readout || !cta || !label) return;
    const chips = [...picker.querySelectorAll(".tile")];
    const links = [...document.querySelectorAll(`a[href^="${FORM}"]`)];
    const update = () => {
      const picked = chips.filter(c => c.getAttribute("aria-pressed") === "true").map(c => c.dataset.value);
      const n = picked.length;
      readout.textContent = n ? `${n} ${n === 1 ? "pick" : "picks"}. I'd start with ${pickPackage(picked)}.` : EMPTY;
      label.textContent = n ? `Get my fix plan for ${n}` : "Get my free video review";
      const href = n ? `${FORM}?byhand=${encodeURIComponent(picked.join(","))}` : FORM;
      links.forEach(a => a.setAttribute("href", href));
      cta.classList.toggle("is-ready", n > 0);
      if (bubble) bubble.textContent = LINES[n === 0 ? 0 : n < 3 ? 1 : 2];
      return n;
    };
    chips.forEach(c => c.addEventListener("click", () => {
      c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true");
      const n = update();
      if (window.cwTrack) window.cwTrack("Console tick", { n });
    }));
    update();
  };
  document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", init) : init();
})();
