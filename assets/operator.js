// The Operator (public name: ClashBot), Clashworks' robot, plus the hero loop it lives in.
// It flies itself: a spring with momentum chases a target (home in the hero, a dive down and to
// the right on the first scroll, then a perch beside whatever section you are reading), so it
// lags, banks into turns and overshoots like something with weight. A live flame
// (operator-flame.js) trails behind it and stretches with speed. Pose changes are cuts inside a
// squash, never crossfades, so two robots never show at once. It has a job at each stop: hops the
// proof numbers, does the sums by the steps, points at the featured package, stamps the build cards
// (brand/mascot.md A3), scans the checklist, sits by the open question, points at the last button.
// It reacts: on its console perch a tick turns it to scan and three to its calculator; elsewhere it
// points at a green button you hover or focus, zips to a tile you tick, sits by the question you
// open, wanders when left alone (not while the console has focus), rolls and gives a tip when
// pressed, can be grabbed and thrown. Hidden, it hides everywhere, and so does its console bubble.
// Narrow screens: home is beside the headline, the dock is the nav slot (it rides the page up to the nav,
// then hops along it into the slot, never over the headline) and each stop is a short trip to the right
// edge, kept clear of the phone sticky bar. The site-wide "Reduce motion"
// switch (assets/motion.js, html.rm) stops all of it, and turning it off restarts it with no
// reload; under it the robot stays still in the hero and each section shows a still pose (CSS).
// Needs gsap and operator-flame.js (both deferred).
(() => {
  const $ = s => document.querySelector(s);
  const reduce = () => document.documentElement.classList.contains("rm");
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const op = $("#op"), btn = $("#op-btn");
  if (!op || !btn) return;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
  };

  // ---------- tips: every one restates something the site already says ----------
  const TIPS = [
    "The free video review is ten minutes of advice you keep. No pitch.",
    "Does your contact form ask for a phone number? Without one, you can't call the lead back.",
    "Text back every missed call within five minutes, before the customer dials the next company.",
    "Ask every customer for a review the day after the job, inside Google's rules.",
    "Check your hours on Google. Wrong hours are one of the easiest leaks to fix.",
    "Never hand over your passwords. Add people as users, and remove them when they're done.",
    "Every fix comes with a counter and one number we both watch.",
    "Answering the same question ten times a day? Write the answer once and let it send itself.",
    "The Lead Leak Checklist is fifteen yes-or-no questions. Count your no's.",
    "Missed calls get a text back the moment you miss them.",
    "Tick what still happens by hand, and your picks come with you into the application.",
    "Every job has a fixed price and one number. If that number can't be shown 30 days after delivery, you get your money back (conditions are on the Terms page).",
    "Writing quotes at 10 p.m.? That's my job now."
  ];
  const TIP_ORDER = { top: [10, 0], proof: [6, 3], how: [9, 6], packages: [11, 6], builds: [12, 2], checklist: [8, 3, 2], faq: [5, 4], closing: [0, 1] };
  const shown = new Set();
  const nextTip = where => {
    if (shown.size === TIPS.length) shown.clear();
    const order = [...(TIP_ORDER[where] || []), ...TIPS.keys()];
    const i = order.find(n => !shown.has(n));
    shown.add(i);
    return TIPS[i];
  };

  // ---------- speech bubble ----------
  const bubble = $("#op-bubble"), tipEl = $("#op-tip"), live = $("#op-live");
  const tuckBtn = $("#op-tuck"), showBtn = $("#op-show"), hideBtn = $("#op-hide");
  let bubbleOpen = false, bubbleScroll = 0, section = "top";
  const placeBubble = () => {
    if (!bubbleOpen) return;
    const r = btn.getBoundingClientRect(), bw = bubble.offsetWidth, bh = bubble.offsetHeight;
    let x, y;
    if (innerWidth < 700) { x = innerWidth - bw - 12; y = r.bottom + 6; }
    else { // beside the head on the side facing the page, clear of what it points at
      x = r.left + r.width / 2 < innerWidth / 2 ? r.left + r.width * .78 : r.left + r.width * .22 - bw;
      y = r.top + r.height * .3 - bh;
    }
    x = Math.max(12, Math.min(x, innerWidth - bw - 12));
    y = Math.max(76, Math.min(y, innerHeight - bh - 12));
    bubble.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  };
  const openTip = () => {
    const text = nextTip(section);
    tipEl.textContent = text;
    bubble.hidden = false; bubbleOpen = true; bubbleScroll = scrollY;
    btn.setAttribute("aria-expanded", "true");
    placeBubble();
    live.textContent = ""; setTimeout(() => { live.textContent = text; }, 60);
    if (!reduce() && window.gsap) gsap.fromTo(bubble, { autoAlpha: 0, y: 6, scale: .96, transformOrigin: "100% 0" }, { autoAlpha: 1, y: 0, scale: 1, duration: .22, ease: "back.out(2)", clearProps: "opacity,visibility,scale,y" });
  };
  const closeTip = refocus => {
    if (!bubbleOpen) return;
    bubbleOpen = false; bubble.hidden = true;
    btn.setAttribute("aria-expanded", "false");
    if (refocus) btn.focus();
  };
  $("#op-next").addEventListener("click", () => { tipEl.textContent = ""; openTip(); });
  $("#op-close").addEventListener("click", () => closeTip(true));
  addEventListener("keydown", e => { if (e.key === "Escape" && bubbleOpen) closeTip(bubble.contains(document.activeElement)); });
  document.addEventListener("pointerdown", e => { if (bubbleOpen && !bubble.contains(e.target) && !btn.contains(e.target)) closeTip(false); });
  addEventListener("scroll", () => { if (bubbleOpen && Math.abs(scrollY - bubbleScroll) > 220) closeTip(false); placeBubble(); }, { passive: true });
  addEventListener("resize", placeBubble);

  // ---------- until motion starts, and for good under reduced motion: a still robot that gives tips ----------
  const stillClick = () => bubbleOpen ? closeTip(false) : openTip();
  btn.addEventListener("click", stillClick);
  hideBtn.hidden = true;

  // All the motion starts once the page has painted, so none of it competes with the hero
  // poster (the LCP element) for the network or the main thread
  const later = fn => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 900));
  const whenLoaded = fn => document.readyState === "complete" ? later(fn) : addEventListener("load", () => later(fn), { once: true });
  let stop = null;
  const stamped = new WeakSet(); // build cards already stamped: once per card per page view
  const boot = () => { if (!stop && !reduce() && window.gsap && window.OperatorFlame) stop = start(); };
  // under Reduce motion the still hero robot keeps its flame: one frame, drawn once (and again on resize)
  let stillCanvas = null;
  const paintStill = () => {
    if (!reduce() || !window.OperatorFlame) return;
    const w = op.offsetWidth; if (!w) return;
    if (!stillCanvas) {
      stillCanvas = document.createElement("canvas"); stillCanvas.className = "op-flame"; stillCanvas.setAttribute("aria-hidden", "true");
      op.querySelector(".op-bob").prepend(stillCanvas);
    }
    stillCanvas.style.left = (-.6 * w) + "px";
    const f = new OperatorFlame(stillCanvas);
    f.resize(2.2 * w, 2 * w);
    f.still({ x: (.545 + .6) * w, y: .7088 * w, size: w }); // the hello pose's thruster
  };
  const clearStill = () => { if (stillCanvas) { stillCanvas.remove(); stillCanvas = null; } };
  let stillT = 0;
  addEventListener("resize", () => { clearTimeout(stillT); stillT = setTimeout(paintStill, 150); });
  whenLoaded(() => { boot(); paintStill(); });
  // the Reduce motion switch: stop everything and settle back to the still robot, or start again
  document.addEventListener("cw-motion", e => {
    if (!e.detail.reduce) { clearStill(); return boot(); }
    if (stop) { stop(); stop = null; }
    paintStill();
  });

  // Runs the whole live robot. Returns stop(), which removes every listener and tween it made and
  // puts the page back exactly as the still robot expects it.
  function start() {
  const ac = new AbortController();
  const listen = (t, type, fn, o = {}) => t.addEventListener(type, fn, { ...o, signal: ac.signal });
  clearStill();
  btn.removeEventListener("click", stillClick);
  hideBtn.hidden = false;
  const root = document.documentElement;
  const tilt = op.querySelector(".op-tilt"), bob = op.querySelector(".op-bob"), art = op.querySelector(".op-art");
  const hero = $(".hero-stage"), slot = $("#op-slot"), float = $("#op-float"), home = $("#op-home");
  const sticky = $("#sticky"), conBubble = $("#console-bubble");
  const clamp = (lo, hi, v) => Math.max(lo, Math.min(hi, v)), rand = (a, b) => a + Math.random() * (b - a);
  const NAV = 68;

  // ---------- pose art ----------
  // eye box [x0, y0, x1, y1] measured on the 960px art; scan's eye throws a beam, so it keeps its own
  const EYES = {
    idle: [520, 283, 568, 332], hello: [498, 263, 556, 321], "point-down": [541, 262, 601, 323],
    fly: [720, 269, 766, 312], "point-left": [552, 281, 609, 335], idea: [520, 377, 572, 427],
    phone: [484, 286, 535, 336], calculator: [523, 293, 577, 348], scan: null, lost: [466, 334, 516, 383]
  };
  // where the thruster sits on each pose, as a fraction of the art box
  // (measured from the painted flames before they were removed: builds/site-assets/operator/noflame/nozzles.json)
  const NOZZLE = {
    idle: [.4877, .7166], hello: [.545, .7088], "point-down": [.5591, .7088], fly: [.5938, .6541], "point-left": [.5388, .7048],
    idea: [.5409, .7791], phone: [.4804, .697], calculator: [.4428, .7322], scan: [.4455, .7088], lost: [.4758, .7517]
  };
  const BIG = new Set(["idle", "hello", "point-down", "fly", "point-left", "idea", "lost"]); // poses that can show at hero size
  const layers = {};
  let W = 112, cur = "hello";
  const pct = v => (v / 9.6).toFixed(2) + "%";
  const addEye = (el, name) => {
    const e = EYES[name]; if (!e) return null;
    const [x0, y0, x1, y1] = e, m = 7; // the patch hides the painted eye; the live eye sits on top
    const patch = document.createElement("i"); patch.className = "op-patch";
    Object.assign(patch.style, { left: pct(x0 - m), top: pct(y0 - m), width: pct(x1 - x0 + 2 * m), height: pct(y1 - y0 + 2 * m) });
    const eye = document.createElement("i"); eye.className = "op-eye";
    Object.assign(eye.style, { left: pct(x0 + 1), top: pct(y0 + 1), width: pct(x1 - x0 - 2), height: pct(y1 - y0 - 2) });
    el.append(patch, eye);
    return eye;
  };
  const sizes = () => Math.round(W) + "px";
  const layer = name => {
    if (layers[name]) return layers[name];
    const el = document.createElement("span"); el.className = "op-pose"; el.dataset.pose = name;
    const img = new Image(480, 480); img.alt = ""; img.decoding = "async";
    if (BIG.has(name)) { img.sizes = sizes(); img.srcset = `assets/operator-${name}-480.webp 480w, assets/operator-${name}-960.webp 960w, assets/operator-${name}-1280.webp 1280w`; }
    img.src = `assets/operator-${name}-480.webp`;
    el.append(img);
    const L = { el, img, eye: addEye(el, name) };
    art.append(el);
    return (layers[name] = L);
  };
  { // the hello pose (the hero pose) is already in the page
    const el = art.querySelector(".op-pose");
    layers.hello = { el, img: el.querySelector("img"), eye: addEye(el, "hello") };
  }
  const loadAll = () => Object.keys(EYES).forEach(layer);
  // napping: little z's drift up from its head
  const zs = [0, 1, 2].map(() => { const z = document.createElement("i"); z.className = "op-z"; z.setAttribute("aria-hidden", "true"); z.textContent = "z"; tilt.append(z); return z; });

  let tucked = store.get("cw-operator") === "tucked";
  // on its console perch the ticks set the pose: one or two, it scans them; three or more, out comes the calculator
  const consolePose = () => ticks >= 3 ? "calculator" : ticks > 0 ? "scan" : null;
  let heroPose = "hello", stopPose = "idle", override = null, hovering = false, dragging = false, rolling = false, fast = false;
  let aim = 0, lean = 0, offX = 0, offY = 0, lastActive = performance.now(), ticks = 0, napping = false, kbd = false;

  const blink = () => {
    const L = layers[cur]; if (!L || !L.eye || napping) return;
    gsap.fromTo(L.eye, { scaleY: 1 }, { scaleY: .1, duration: .07, yoyo: true, repeat: 1, ease: "power1.in", overwrite: "auto" });
  };
  // A pose change is a quick fade out, then a fade in of the new pose, never an overlap: in every frame at
  // most one pose is visible, so two robots never show. A soft squash and release sells it as the robot
  // shifting its weight.
  let lastSwap = 0, swapTl = null;
  const show = async name => {
    if (name === cur) return;
    const L = layer(name);
    if (!L.img.complete) { try { await L.img.decode(); } catch {} }
    if (ac.signal.aborted || name !== want() || name === cur) return; // stopped, or a newer pose won while this one loaded
    const vis = Object.values(layers).find(o => o.el.classList.contains("is-on"));
    cur = name; lastSwap = performance.now();
    if (swapTl) swapTl.kill();
    swapTl = gsap.timeline();
    if (vis && vis !== L) swapTl.to(vis.el, { opacity: 0, duration: .1, ease: "power1.in" });
    swapTl.add(() => {
      Object.values(layers).forEach(o => { o.el.classList.toggle("is-on", o === L); if (o !== L) gsap.set(o.el, { opacity: 1 }); });
      gsap.set(L.el, { opacity: 0 });
    }).to(L.el, { opacity: 1, duration: .18, ease: "power1.out" });
    gsap.fromTo(bob, { scaleX: 1.03, scaleY: .96 }, { scaleX: 1, scaleY: 1, duration: .45, ease: "back.out(1.8)", overwrite: "auto" });
    if (L.eye) gsap.delayedCall(.25, blink);
    look();
  };
  const want = () => {
    if (napping) return cur;
    if (dragging) return "fly";
    if (override) return override;
    if (state === "home") return consolePose() || heroPose; // on the perch: hello, or the console's tick pose
    if (fast) return "fly";
    if (visit && visit.pose) return visit.pose; // a short visit (pointing, a tick, a hop) shows its own pose
    return hovering ? "hello" : stopPose;
  };

  // ---------- the live flame ----------
  const canvas = document.createElement("canvas");
  canvas.className = "op-flame"; canvas.setAttribute("aria-hidden", "true");
  bob.prepend(canvas);
  const flame = new OperatorFlame(canvas);
  let power = 0, flip = 1;
  // the canvas spans 2.2 robots wide and 2 tall, with the robot's own box at (0.6W, 0)
  const sizeCanvas = () => { canvas.style.left = (-.6 * W) + "px"; flame.resize(2.2 * W, 2 * W); };
  const burst = v => { power = Math.max(power, v); };

  // ---------- ambient life: hover bob and blink, a wave in the hero ----------
  const bobTw = gsap.to(bob, { yPercent: -2.8, rotation: 1.4, duration: 1.8, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true });
  let blinkCall = null;
  const blinkLoop = () => { blink(); if (Math.random() < .2) gsap.delayedCall(.24, blink); blinkCall = gsap.delayedCall(2.6 + Math.random() * 3, blinkLoop); };
  const ambient = () => {
    const on = !tucked;
    on ? bobTw.play() : bobTw.pause();
    if (on && !blinkCall) blinkCall = gsap.delayedCall(1.4, blinkLoop);
    if (!on && blinkCall) { blinkCall.kill(); blinkCall = null; }
  };
  // a barrel roll in the picture plane, so the robot is never seen edge-on
  const roll = () => {
    rolling = true;
    gsap.fromTo(art, { rotation: 0 }, { rotation: 360, duration: .7, ease: "power2.inOut", onComplete: () => { gsap.set(art, { rotation: 0 }); rolling = false; } });
    gsap.fromTo(bob, { y: 0 }, { y: -W * .1, duration: .35, yoyo: true, repeat: 1, ease: "power2.out" });
    burst(1);
  };
  // left alone for a minute it dozes off: eye shut, slow bob, a low flame and z's; any input wakes it with two blinks
  let zCall = null;
  const nap = () => {
    napping = true; closeTip(false);
    const L = layers[cur]; if (L && L.eye) gsap.to(L.eye, { scaleY: .12, duration: .5, overwrite: "auto" });
    bobTw.timeScale(.45);
    let i = 0;
    const puff = () => {
      const z = zs[i++ % zs.length];
      gsap.fromTo(z, { x: 0, y: 0, opacity: 0, scale: .6 }, { x: W * .12, y: -W * .22, opacity: 1, scale: 1.1, duration: 1.6, ease: "sine.out", onComplete: () => gsap.to(z, { opacity: 0, duration: .3 }) });
      zCall = gsap.delayedCall(1.1, puff);
    };
    puff();
  };
  const wake = () => {
    if (!napping) return;
    napping = false; bobTw.timeScale(1);
    if (zCall) { zCall.kill(); zCall = null; }
    gsap.to(zs, { opacity: 0, duration: .2 });
    const L = layers[cur];
    if (L && L.eye) gsap.to(L.eye, { scaleY: 1, duration: .15, overwrite: "auto", onComplete: () => { blink(); gsap.delayedCall(.32, blink); } });
    burst(.7);
  };
  const nod = () => { if (!tucked) { gsap.fromTo(bob, { y: 0 }, { y: -W * .05, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" }); blink(); burst(.6); } };

  // ---------- the hero loop (retired on the homepage: with no #hero-video all of this stays off) ----------
  const video = $("#hero-video");
  let videoReady = false;
  const loadVideo = () => {
    if (!video || videoReady || (navigator.connection && navigator.connection.saveData)) return;
    videoReady = true;
    video.querySelectorAll("source").forEach(s => { s.src = s.dataset.src; });
    listen(video, "playing", () => video.classList.add("is-playing"), { once: true });
    video.load();
    video.play().catch(() => {});
  };
  // the loop only plays while the hero is on screen
  const heroIO = video ? new IntersectionObserver(([e]) => {
    if (!videoReady) return;
    e.isIntersecting ? video.play().catch(() => {}) : video.pause();
  }) : null;
  if (heroIO) heroIO.observe(hero);

  // ---------- layout: home in the hero, a dock in the side lane (wide) or the nav slot (narrow) ----------
  root.classList.add("op-on");
  slot.classList.add("is-on");
  op.classList.add("is-live");
  let homeBox = { x: 0, y: 0, s: 112 }, wide = false, lane = { x: 0, s: 75 };
  const measure = () => {
    wide = innerWidth >= 1100;
    const h = (innerWidth <= 860 ? float : home).getBoundingClientRect();
    homeBox = { x: h.left + scrollX, y: h.top + scrollY, s: h.width };
    W = h.width;
    op.style.setProperty("--op-w", W + "px");
    op.style.setProperty("--u", (W / 100) + "px");
    Object.values(layers).forEach(L => { if (L.img.srcset) L.img.sizes = sizes(); });
    if (wide) {
      // the empty lane left of the content: the robot faces right, so from here it faces the page
      const mL = $("#how > .wrap").getBoundingClientRect().left;
      const s = Math.round(clamp(110, 200, mL * 1.15)); // only the art's transparent margin may reach past the lane
      lane = { x: Math.max(4, mL / 2 - s / 2), s }; // and the whole art box stays inside the window
    } else {
      const r = slot.getBoundingClientRect(), s = r.width * 1.3;
      lane = { x: r.left + r.width / 2 - s / 2, y: r.top + r.height / 2 - s / 2, s };
      root.style.setProperty("--slot-x", r.left + "px");
      root.style.setProperty("--slot-y", r.top + "px");
    }
    sizeCanvas();
  };

  // ---------- the flight: a spring that chases a target, with momentum ----------
  // State: "home" (in the hero), "launch" (the dive down and right), "cruise" (following the reader).
  // Positions are screen coordinates of the robot box's top left; size is its width in px. Working on the
  // screen, not the page, means a mouse-wheel notch never jerks it: it trails a smoothed scroll speed instead.
  let state = "home", launchAt = 0;
  let px = 0, py = 0, vx = 0, vy = 0, size = 112, tilted = 0, homeLock = false;
  let lastSY = scrollY, scrollV = 0, smT = null;
  let visit = null;   // { x, y } page target, pose, until, trip (narrow screens)
  let wander = { x: 0, y: 0, until: 0 };

  // ---------- one stop per section: where the robot perches and what it does there ----------
  const openRow = () => $("#faq details[open] summary") || $("#faq summary");
  // the build card nearest the middle of the screen (on phones the cards are a sideways swipe row)
  // (read at most every 100 ms: the frame loop asks for it every frame while the robot is at #builds)
  let nbAt = -1e9, nb = null;
  const nearestBuild = () => {
    const now = performance.now();
    if (nb && now - nbAt < 100) return nb;
    nbAt = now;
    let best = null, bd = Infinity;
    document.querySelectorAll("#builds .build").forEach(c => {
      const r = c.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - innerWidth / 2, r.top + r.height / 2 - innerHeight / 2);
      if (d < bd) { bd = d; best = c; }
    });
    return (nb = best);
  };
  // act: once, half a second after it arrives; each: once per element the stop settles on (the build cards)
  const STOPS = [
    { sel: "#proof", key: "proof", pose: () => "calculator", at: () => $("#proof .row"), act: () => hopNumbers(), wideOnly: true },
    { sel: "#how", key: "how", pose: () => "calculator", at: () => $("#how .steps") },
    { sel: "#packages", key: "packages", pose: () => "point-left", at: () => $("#packages .pack.feat") },
    { sel: "#builds", key: "builds", pose: () => "scan", at: nearestBuild, each: card => stampCard(card) },
    { sel: "#checklist", key: "checklist", pose: () => "scan", at: () => $("#checklist .checklist-card"), act: () => scanCard() },
    { sel: "#faq", key: "faq", pose: () => "idea", at: openRow },
    { sel: "#closing", key: "closing", pose: () => "point-left", at: () => $("#closing .btn") }
  ].map(s => ({ ...s, el: $(s.sel), done: false }));
  let active = null, arrived = null, eachWait = null;
  const onScreen = el => { const r = el && el.getBoundingClientRect(); return !!r && r.bottom > NAV && r.top < innerHeight; };
  const pickStop = () => {
    let hit = null;
    for (const s of STOPS) {
      if (!s.el) continue;
      const r = s.el.getBoundingClientRect();
      if (r.top < innerHeight * .62 && r.bottom > innerHeight * .38) hit = s; // later stops win
    }
    if (hit !== active) { active = hit; section = hit ? hit.key : "top"; }
    // arriving counts once it is cruising, so a launch straight into a stop (the first scroll lands on
    // #proof) still does that stop's job
    if (state === "cruise" && active !== arrived) {
      const s = arrived = active;
      if (s) {
        burst(.5);
        // a wide-only job (the number hop) leaves phones the short trip below instead
        if (!s.done && s.act && (wide || !s.wideOnly)) { // only if the reader is still there half a second later; otherwise next visit
          gsap.delayedCall(.5, () => {
            if (active !== s || !onScreen(s.at())) return;
            s.done = true; s.act();
          });
        }
        else if (!wide && !s.tripped && !tucked) { s.tripped = true; tripTo(s.at(), s.pose(), 2.6); }
      }
    }
    // a per-element job: the element it settles on for half a second gets it, once
    if (active && active.each && state === "cruise" && !tucked) {
      const el = active.at();
      if (el && el !== eachWait && !stamped.has(el)) {
        eachWait = el;
        const s = active;
        gsap.delayedCall(.5, () => {
          if (eachWait === el) eachWait = null;
          if (active === s && !tucked && s.at() === el && onScreen(el)) s.each(el);
        });
      }
    }
    if (active) stopPose = active.pose();
  };
  // the screen y where a stop wants the robot: level with its anchor, inside the viewport
  const anchorY = el => {
    if (!el) return innerHeight * .5;
    const r = el.getBoundingClientRect();
    return clamp(NAV + 40, innerHeight - 120, r.top + Math.min(r.height, 260) / 2);
  };

  // a short visit somewhere on the page, then back to its post
  const visitAt = (sx, sy, pose, secs, opts = {}) => {
    if (tucked || dragging) return;
    visit = { x: sx + scrollX, y: sy + scrollY, pose, until: performance.now() + secs * 1000, s: opts.s, follow: opts.follow };
    op.classList.add("is-visiting");
  };
  // narrow screens: when a trip's spot scrolls off, it blinks back to the slot (gone at once, then fades in
  // there) instead of flying across whatever scrolled in, the hero text included
  let blinking = false;
  const blinkToSlot = () => {
    if (blinking) return;
    blinking = true;
    gsap.set(tilt, { autoAlpha: 0 });
    px = lane.x; py = lane.y; size = lane.s; vx = vy = 0; smT = null;
    gsap.to(tilt, { autoAlpha: 1, duration: .25, delay: .08, onComplete: () => { blinking = false; } });
  };
  // narrow screens: a quick trip to the right edge beside an element
  const tripTo = (el, pose, secs) => {
    if (!el) return;
    const s = Math.min(96, innerWidth * .24), y = anchorY(el);
    visitAt(root.clientWidth - s - 4, y - s / 2, pose, secs, { s });
  };
  // #proof: hop across the four numbers, tapping each as it lands
  const hopNumbers = () => {
    if (!wide || tucked) return;
    const nums = [...document.querySelectorAll("#proof .stat b")];
    nums.forEach((n, i) => gsap.delayedCall(i * .42, () => {
      const r = n.getBoundingClientRect();
      visitAt(r.left + r.width * .3 - lane.s * .2, r.top - lane.s * .78, "calculator", .5);
      gsap.delayedCall(.3, () => { nod(); gsap.fromTo(n, { y: 0 }, { y: 4, duration: .08, yoyo: true, repeat: 1, ease: "power1.out" }); });
    }));
  };
  // #checklist: one emerald scan line sweeps the checklist card
  const scanCard = () => {
    const card = $("#checklist .checklist-card"); if (!card) return;
    card.classList.remove("is-scan"); void card.offsetWidth; card.classList.add("is-scan");
    listen(card, "animationend", () => card.classList.remove("is-scan"), { once: true });
  };
  // #builds: the stamp (brand/mascot.md A3). The emerald core hops onto the card's top right as a check
  // badge for 1.6 s (ui.css), once per card per page view. Every card there is something Clayton built.
  const stampCard = card => {
    if (!card || stamped.has(card)) return;
    stamped.add(card);
    card.classList.add("is-stamped");
    nod();
    gsap.delayedCall(1.6, () => card.classList.remove("is-stamped"));
  };

  // ---------- the mouse: the eye follows it, the robot leans in when it comes close ----------
  let mx = null, my = null;
  const look = () => {
    if (ac.signal.aborted) return;
    const L = layers[cur];
    if (!L || !L.eye || mx === null) return;
    const r = L.eye.getBoundingClientRect();
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260) * flip;
    gsap.to(L.eye, { xPercent: dx / d * 26 * k, yPercent: dy / d * 22 * Math.abs(k), duration: .35, ease: "power3", overwrite: "auto" });
  };
  const near = () => {
    offX = offY = 0;
    if (mx === null || dragging || tucked || fast) return;
    const sx = px + size / 2, sy = py + size / 2;
    const dx = mx - sx, dy = my - sy, d = Math.hypot(dx, dy) || 1;
    if (state === "home" && mx > innerWidth * .45) { offX = -(mx / innerWidth - .7) * 26; offY = -(my / innerHeight - .5) * 18; } // depth in the hero
    const reach = Math.max(180, size * 1.4);
    if (d < reach) { const f = (1 - d / reach) * Math.min(14, size * .1); offX += dx / d * f; offY += dy / d * f; }
  };
  if (fine) {
    listen(window, "pointermove", e => { mx = e.clientX; my = e.clientY; look(); near(); }, { passive: true });
    listen(root, "mouseleave", () => { mx = null; offX = offY = 0; Object.values(layers).forEach(L => L.eye && gsap.to(L.eye, { xPercent: 0, yPercent: 0, duration: .5 })); });
    listen(btn, "pointerenter", () => { if (!dragging) { hovering = true; op.classList.add("is-hot"); } });
    listen(btn, "pointerleave", () => { hovering = false; op.classList.remove("is-hot"); });
  }
  ["scroll", "pointermove", "keydown", "touchstart", "pointerdown"].forEach(t => listen(window, t, () => { lastActive = performance.now(); wake(); }, { passive: true }));
  // the eye follows keyboard focus as well as the mouse
  listen(window, "keydown", e => { if (e.key === "Tab") kbd = true; });
  listen(window, "pointerdown", () => { kbd = false; });
  listen(document, "focusin", e => {
    if (!kbd || btn.contains(e.target) || !e.target.getBoundingClientRect) return;
    const r = e.target.getBoundingClientRect(); mx = r.left + r.width / 2; my = r.top + r.height / 2; look();
  });

  // ---------- reactions ----------
  // a green button hovered or focused: in the hero it points from home; elsewhere on wide screens
  // it flies level with the button in its lane and points
  let unaimCall = null;
  const pointAt = b => {
    if (tucked || dragging || fast) return;
    const r = b.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (unaimCall) unaimCall.kill();
    if (state === "home" || !wide) return; // the hero keeps its one pose; narrow screens leave the dock alone
    visitAt(lane.x, clamp(NAV + 8, innerHeight - lane.s - 8, r.top + r.height / 2 - lane.s * .45), "point-left", 30);
    aim = 0;
  };
  const unpoint = () => {
    if (unaimCall) unaimCall.kill();
    unaimCall = gsap.delayedCall(.35, () => {
      if (override === "point-left" || override === "point-down") override = null;
      if (visit && visit.pose === "point-left") endVisit();
      aim = 0;
    });
  };
  document.querySelectorAll("main .btn:not(.btn-ghost)").forEach(b => {
    listen(b, "pointerenter", () => pointAt(b)); listen(b, "focus", () => pointAt(b));
    listen(b, "pointerleave", unpoint); listen(b, "blur", unpoint);
  });
  const endVisit = () => { visit = null; op.classList.remove("is-visiting"); };
  // ticking a tile: zip over to it and cheer; three or more and out comes the calculator
  document.querySelectorAll("#picker .tile").forEach(t => listen(t, "click", () => {
    ticks = document.querySelectorAll('#picker .tile[aria-pressed="true"]').length;
    if (tucked) return;
    if (state === "home") { nod(); return; } // on the perch it stays put; want() turns it to scan or calculator
    const r = t.getBoundingClientRect(), s = wide ? lane.s : Math.min(96, innerWidth * .24);
    const vx0 = clamp(8, innerWidth - s - 8, r.right - s * .45), vy0 = clamp(NAV + 8, innerHeight - s - 8, r.top - s * .7);
    // a long trip (the left lane to the console on the right takes about a second) stays longer, so it still cheers
    const far = clamp(0, 1, Math.hypot(vx0 - px, vy0 - py) / 1400);
    visitAt(vx0, vy0, ticks >= 3 ? "calculator" : "hello", 1.3 + far, { s });
    gsap.delayedCall(.45, nod);
  }));
  // opening a question: settle beside that row
  document.querySelectorAll("#faq summary").forEach(sm => listen(sm, "click", () => {
    gsap.delayedCall(.05, () => {
      if (state === "home" || tucked || !sm.parentElement.open) return;
      if (wide) { const r = sm.getBoundingClientRect(); visitAt(lane.x, clamp(NAV + 8, innerHeight - lane.s - 8, r.top + r.height / 2 - lane.s * .5), "idea", 2.6); }
      else tripTo(sm, "idea", 2.6);
      nod();
    });
  }));

  // ---------- grab it with the mouse: it follows, and a throw keeps its speed ----------
  // (dragging is optional fun; every function stays on click, tap and keyboard, WCAG 2.5.7)
  let grab = null, moved = false, waveOff = null;
  if (fine) {
    listen(btn, "pointerdown", e => {
      if (e.button !== 0) return;
      grab = { x: e.clientX, y: e.clientY, ox: px, oy: py, lx: e.clientX, ly: e.clientY, lt: performance.now(), vx: 0, vy: 0 };
      moved = false;
      btn.setPointerCapture(e.pointerId);
    });
    listen(btn, "pointermove", e => {
      if (!grab) return;
      const dx = e.clientX - grab.x, dy = e.clientY - grab.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) { moved = true; dragging = true; hovering = false; op.classList.add("is-dragging"); root.classList.add("op-dragging"); closeTip(false); endVisit(); getSelection().removeAllRanges(); }
      const now = performance.now(), dt = Math.max(.008, (now - grab.lt) / 1000);
      grab.vx = grab.vx * .6 + (e.clientX - grab.lx) / dt * .4; grab.vy = grab.vy * .6 + (e.clientY - grab.ly) / dt * .4;
      grab.lx = e.clientX; grab.ly = e.clientY; grab.lt = now;
      px = grab.ox + dx; py = grab.oy + dy; vx = grab.vx; vy = grab.vy;
      lean = clamp(-22, 22, grab.vx * .02);
    });
    const drop = () => {
      if (!grab) return;
      const g = grab; grab = null;
      if (!dragging) return;
      dragging = false; lean = 0;
      op.classList.remove("is-dragging"); root.classList.remove("op-dragging");
      vx = clamp(-2600, 2600, g.vx); vy = clamp(-2600, 2600, g.vy); // thrown: the spring brings it home from there
      if (state === "home") state = "cruise";
      gsap.fromTo(art, { rotation: -16 }, { rotation: 0, duration: 1.3, ease: "elastic.out(1, .32)" });
      burst(1.2);
      override = "hello";
      if (waveOff) waveOff.kill();
      waveOff = gsap.delayedCall(1.6, () => { if (override === "hello") override = null; });
    };
    listen(btn, "pointerup", drop);
    listen(btn, "pointercancel", drop);
  }

  // ---------- press: a roll and a tip ----------
  let ideaCall = null, presses = [];
  // seven quick presses: a dizzy double spin, then it looks lost for a moment
  const dizzy = () => {
    closeTip(false); rolling = true;
    if (ideaCall) ideaCall.kill();
    override = "lost"; aim = 0;
    gsap.fromTo(art, { rotation: 0 }, { rotation: 720, duration: 1.2, ease: "power2.inOut", onComplete: () => { gsap.set(art, { rotation: 0 }); rolling = false; } });
    gsap.fromTo(bob, { y: 0 }, { y: -W * .12, duration: .6, yoyo: true, repeat: 1, ease: "power2.out" });
    gsap.fromTo(tilt, { x: 0 }, { x: W * .03, duration: .12, yoyo: true, repeat: 9, ease: "sine.inOut", delay: 1.2 });
    burst(1.3);
    gsap.delayedCall(3.4, () => { if (override === "lost") override = null; });
  };
  listen(btn, "click", e => {
    if (moved) { moved = false; e.preventDefault(); return; } // that was a drag, not a press
    const now = performance.now();
    presses = presses.filter(t => now - t < 3000); presses.push(now);
    if (presses.length >= 7) { presses = []; dizzy(); return; }
    if (bubbleOpen) { closeTip(false); return; }
    roll();
    if (ideaCall) ideaCall.kill();
    override = "idea"; aim = 0;
    ideaCall = gsap.delayedCall(3, () => { if (override === "idea") override = null; });
    openTip();
    window.cwTrack?.("Operator tip", { section });
  });

  // ---------- tuck away and bring back ----------
  const setTucked = (v, focusTo) => {
    tucked = v; store.set("cw-operator", v ? "tucked" : null);
    window.cwTrack?.(v ? "Operator hidden" : "Operator shown");
    closeTip(false); endVisit(); ambient(); hideAll();
    if (focusTo) requestAnimationFrame(() => focusTo.focus());
  };
  // hidden means hidden everywhere: on the perch too (wide screens used to leave it there), and the
  // console bubble beside the perch goes with it; both come back on show
  let gone = null;
  const hideAll = (instant = false) => {
    if (conBubble) conBubble.hidden = tucked;
    if (gone === tucked) return;
    gone = tucked;
    instant ? gsap.set(op, { autoAlpha: tucked ? 0 : 1 }) : gsap.to(op, { autoAlpha: tucked ? 0 : 1, duration: .25, overwrite: "auto" });
  };
  listen(tuckBtn, "click", () => setTucked(true, showBtn));
  listen(hideBtn, "click", () => setTucked(true, showBtn));
  listen(showBtn, "click", () => setTucked(false, btn));
  listen(window, "resize", () => { measure(); });

  // ---------- every frame ----------
  let last = performance.now();
  const frame = () => {
    const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); // a hidden tab never comes back to a jump
    last = now;
    const sX = scrollX, sY = scrollY;
    // narrow screens ride the page in the home spot (clear of the text) until the whole robot is up at the
    // nav, then hop sideways into the slot; flying any earlier put it over the headline scrolling up below it
    const launched = sY > Math.max(24, wide ? hero.offsetHeight * .04 : homeBox.y + homeBox.s - NAV);
    pickStop();

    // the scroll speed, smoothed: it trails a little behind fast scrolling, then settles
    const cw = root.clientWidth;
    scrollV += (clamp(-4000, 4000, (sY - lastSY) / Math.max(dt, .008)) - scrollV) * Math.min(1, dt * 4);
    lastSY = sY;
    const lag = clamp(-42, 42, -scrollV * .03);

    // where it wants to be (screen coordinates) and how big
    let tx, ty, ts, k = 24, c = 9; // a soft spring, a touch under critical damping: it glides in and settles
    if (!launched && !dragging) {
      if (state !== "home") { state = "home"; endVisit(); arrived = null; }
      tx = homeBox.x - sX + offX; ty = homeBox.y - sY + offY; ts = homeBox.s;
      k = 60; c = 15.5;
    } else {
      if (state === "home") { // take off: a crouch, a burst of thrust, then the dive down and to the right
        state = "launch"; launchAt = now; closeTip(false);
        gsap.fromTo(bob, { scaleY: .92, scaleX: 1.04 }, { scaleY: 1, scaleX: 1, duration: .4, ease: "back.out(2.2)" });
        vx = wide ? 360 : 0; vy = wide ? 520 : 0; burst(1.4);
        if (!wide && homeLock) { px = homeBox.x - sX + offX; py = homeBox.y - sY + offY; } // a flick moved the page this frame: start from where home is now
      }
      if (state === "launch" && now - launchAt > 650) state = "cruise";
      if (visit && now > visit.until) endVisit();
      // narrow: a trip whose spot has scrolled off screen ends with a blink back to the slot
      if (visit && !wide && (visit.y - sY < NAV - 20 || visit.y - sY > innerHeight - 40)) { endVisit(); blinkToSlot(); }
      if (state === "launch" && !wide) { // narrow: the hop along the nav into the slot (a dive would cross the headline)
        ts = lane.s; tx = lane.x; ty = lane.y; k = 120; c = 22;
      } else if (state === "launch") { // the swoop: aim below and right of where it took off
        tx = homeBox.x - sX + homeBox.s * .08; ty = innerHeight * .55; ts = (homeBox.s + lane.s) / 2; k = 9; c = 4.2; // drop down first, then it crosses to its lane
      } else if (visit) {
        ts = visit.s || (wide && visit.pose === "point-left" ? lane.s * .86 : lane.s); tx = visit.x - sX; ty = visit.y - sY;
      } else if (wide) {
        ts = stopPose === "point-left" ? lane.s * .86 : lane.s; // pointing from the left lane: a touch smaller, so the hand stops short of the text
        tx = tucked ? -size - 40 : lane.x; // tucked: off the left edge
        ty = clamp(NAV + 8, innerHeight - ts - 8, (active ? anchorY(active.at()) : innerHeight * .55) - ts * .5) + lag;
      } else {
        ts = lane.s; tx = lane.x; ty = lane.y;
      }
      const ae = document.activeElement;
      if (ae && ae.closest && ae.closest("#picker")) wander.until = 0; // the console has focus: no idle wander
      else if (!visit && state === "cruise" && now - lastActive > 9000 && now > wander.until) { // left alone: drift and look around
        wander = { x: rand(-28, 10), y: rand(-36, 36), until: now + 4000 };
        const L = layers[cur];
        if (L && L.eye) gsap.timeline().to(L.eye, { xPercent: -30, duration: .35 }).to(L.eye, { xPercent: 30, duration: .6 }, "+=.35").to(L.eye, { xPercent: 0, duration: .35 }, "+=.35");
      }
      if (now < wander.until && state === "cruise" && !visit && wide) { tx += wander.x; ty += wander.y; }
      tx += offX; ty += offY;
    }
    // the target itself eases, so a jump in where it wants to be (a new section, a resize) becomes a glide
    if (!smT || state === "home" || (state === "launch" && !wide)) smT = { x: tx, y: ty }; // the phone hop to the slot goes at once
    else { const e = Math.min(1, dt * 6); smT.x += (tx - smT.x) * e; smT.y += (ty - smT.y) * e; }

    // the spring, integrated semi-implicitly, with an acceleration cap (no sudden kicks) and a speed cap
    if (!dragging && !blinking) {
      let ax = k * (smT.x - px) - c * vx, ay = k * (smT.y - py) - c * vy;
      const cap = state === "launch" && !wide ? 16000 : 5200; // the phone hop is short and quick
      const am = Math.hypot(ax, ay); if (am > cap) { ax *= cap / am; ay *= cap / am; }
      vx += ax * dt; vy += ay * dt;
      const sp = Math.hypot(vx, vy); if (sp > 2200) { vx *= 2200 / sp; vy *= 2200 / sp; }
      px += vx * dt; py += vy * dt;
      if (state === "home" && Math.hypot(tx - px, ty - py) < 2 && Math.hypot(vx, vy) < 40) { px = tx; py = ty; vx = vy = 0; homeLock = true; } // locked to the hero
      else if (state === "home" && homeLock && !wide) { px = tx; py = ty; vx = vy = 0; } // narrow: once home it scrolls with the page, never trailing onto the text
      if (state !== "home") homeLock = false;
    }
    size += (ts - size) * Math.min(1, dt * (state === "launch" ? (wide ? 2.5 : 30) : 4)); // phones: shrinks faster than it drops into the slot
    // always on screen, below the nav, and with its whole art box inside the window
    if (state !== "home" && !dragging) {
      const toSlot = !wide && !visit; // landing in the nav slot is the one time it may rise above the nav
      let top = toSlot ? lane.y - 2 : NAV + 6 - size * .12, bot = innerHeight - size * .85;
      // the phone sticky bar: the whole robot box stays 8 px above it while it shows (read only when not [hidden])
      if (sticky && !sticky.hidden) { const st = sticky.getBoundingClientRect(); if (st.height) bot = Math.min(bot, st.top - 8 - size); }
      // the phone hop into the slot stays inside the nav band (the button is the top .13 to .86 of the box)
      if (!wide && state === "launch") bot = Math.min(bot, NAV - size * .86);
      if (py < top) { py = top; vy = Math.max(vy, 0); }
      if (py > bot) { py = bot; vy = Math.min(vy, 0); }
      if (!tucked) {
        const lft = 2, rgt = cw - size - 2;
        if (px < lft) { px = lft; vx = Math.max(vx, 0); }
        if (px > rgt) { px = rgt; vx = Math.min(vx, 0); }
      }
    }

    if (!napping && now - lastActive > 60000 && !visit && !dragging && !fast && !bubbleOpen && !tucked) nap();
    // it only takes clicks while resting at its post: flying over the page, it never catches a click meant for the page
    const passing = !dragging && (!!visit || state === "launch" || Math.hypot(vx, vy) > 140);
    if (passing !== op.classList.contains("is-visiting")) op.classList.toggle("is-visiting", passing);
    // speed decides "flying" (hysteresis, so it never flickers between poses)
    const sp = Math.hypot(vx, vy);
    if (!fast && sp > 720 && state !== "home") fast = true;
    else if (fast && (sp < 240 || state === "home")) fast = false;
    const w = want();
    if (w !== cur && (now - lastSwap > 320 || w === override)) show(w);
    // it banks into turns and leans with the cursor
    // the fly pose faces the way it travels; in the left lane the pointing pose is mirrored, so it points at the page
    const f = cur === "fly" ? (Math.abs(vx) > 80 ? Math.sign(vx) : flip) : cur === "point-left" && wide && state !== "home" && px + size / 2 < cw / 2 ? -1 : 1;
    if (f !== flip) { flip = f; gsap.to(art, { scaleX: flip, duration: .22, ease: "power2", overwrite: "auto" }); }
    tilted += (clamp(-14, 14, vx * .01) + aim + lean - tilted) * Math.min(1, dt * 5);

    // place it
    const sx = px, sy = py;
    gsap.set(op, { x: sx, y: sy, scale: size / W });
    gsap.set(tilt, { rotation: tilted });
    const z = !wide && sy + size * .5 < NAV + 12 ? "55" : "45"; // above the nav bar only while it is in its slot
    if (op.style.zIndex !== z) op.style.zIndex = z;
    tuckBtn.hidden = !(wide && state !== "home" && !tucked);
    showBtn.hidden = !tucked;

    // the flame, in the robot's own frame (undo its tilt; the canvas is drawn at full size)
    power = Math.max(0, power - dt * 1.6);
    if (rolling || tucked) flame.clear();
    else {
      const nz = NOZZLE[cur] || NOZZLE.idle, a = -tilted * Math.PI / 180;
      const nx = (flip < 0 ? 1 - nz[0] : nz[0]) * W + .6 * W, ny = nz[1] * W;
      flame.draw({ x: nx, y: ny, size: W, vx: (vx * Math.cos(a) - vy * Math.sin(a)) * .8, vy: (vx * Math.sin(a) + vy * Math.cos(a)) * .8, power, t: now / 1000, dim: napping ? .55 : 1 });
    }
    placeBubble();
  };

  // ---------- start ----------
  measure();
  px = homeBox.x - scrollX; py = homeBox.y - scrollY; size = homeBox.s;
  hideAll(true);
  ambient();
  if (video) loadVideo();
  ["hello", "point-down", "fly"].forEach(layer);
  later(() => { if (!ac.signal.aborted) loadAll(); });
  if (document.fonts) document.fonts.ready.then(() => { if (!ac.signal.aborted) measure(); });
  gsap.ticker.add(frame);
  frame();

  // ---------- stop: everything above, undone ----------
  return () => {
    ac.abort();
    if (heroIO) heroIO.disconnect();
    gsap.ticker.remove(frame);
    // every tween and delayed call on the page (bob, blink, wave, wander, hops, eye);
    // the homepage script settles its own counters and buttons on the same "cw-motion" event
    gsap.globalTimeline.clear();
    if (video) { video.pause(); video.classList.remove("is-playing"); }
    canvas.remove();
    Object.entries(layers).forEach(([name, L]) => { if (name !== "hello") L.el.remove(); });
    layers.hello.el.classList.add("is-on");
    op.querySelectorAll(".op-patch, .op-eye, .op-z").forEach(el => el.remove());
    gsap.set([op, tilt, bob, art, ...Object.values(layers).map(L => L.el), bubble], { clearProps: "all" });
    op.classList.remove("is-live", "is-hot", "is-dragging", "is-visiting");
    root.classList.remove("op-on", "op-dragging");
    slot.classList.remove("is-on");
    root.style.removeProperty("--slot-x"); root.style.removeProperty("--slot-y");
    const card = $("#checklist .checklist-card"); if (card) card.classList.remove("is-scan");
    document.querySelectorAll("#builds .build.is-stamped").forEach(c => c.classList.remove("is-stamped"));
    if (conBubble) conBubble.hidden = false; // the still robot shows in the hero, so its bubble does too
    closeTip(false);
    tuckBtn.hidden = showBtn.hidden = hideBtn.hidden = true;
    btn.addEventListener("click", stillClick);
  };
  }
})();
