// The Operator, Clashworks' robot, plus the hero loop it lives in.
// Hero: the background video loads after the page has painted, and "Pause animation"
// stops the video and the robot's idle bob, blink and wave (WCAG 2.2.2).
// Scroll: the robot flies from the hero into a dock (the side lane on wide screens, the
// nav bar on narrow ones) and changes pose per section. It blinks, watches a mouse
// cursor, points at a primary button you hover or focus, and gives a short tip when
// pressed. Reduced motion: none of the movement; the robot stays put in the hero and
// each section shows a still pose inline (CSS). Needs gsap (deferred); loads ScrollTrigger itself.
(() => {
  const $ = s => document.querySelector(s);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const op = $("#op"), btn = $("#op-btn");
  if (!op || !btn) return;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }
  };

  // ---------- tips: every one restates something the site already says ----------
  const TIPS = [
    "The free Optimization Check is ten minutes of recorded advice you keep. There's no pitch on the call.",
    "Does your contact form ask for a phone number? Without one, you can't call the lead back.",
    "Text back every missed call within five minutes, before the customer dials the next company.",
    "Ask every customer for a review the day after the job, inside Google's rules.",
    "Check your hours on Google. Wrong hours are one of the easiest leaks to fix.",
    "Never hand over your passwords. Add people as users with the lowest access that does the job.",
    "Every Clashworks fix ships with tracking and one number you agree on up front.",
    "Answering the same question ten times a day? Write the answer once and let it send itself.",
    "The Lead Leak Checklist is fifteen yes-or-no questions. Count your no's.",
    "There are two free checks a week, so each one gets real attention.",
    "Tick what still happens by hand, and your picks come with you into the application.",
    "Every job has a fixed price and one number. If that number can't be shown 30 days after delivery, your fees come back (conditions are on the Terms page)."
  ];
  const TIP_ORDER = { top: [0, 9], fix: [10, 1], how: [9, 6], services: [11, 6], free: [8, 3, 2], video: [1, 2], faq: [5, 4], closing: [9, 0] };
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
    else { x = r.left + r.width * .22 - bw; y = r.top + r.height * .3 - bh; } // above and left of the head, clear of what it points at
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
    if (!reduce && window.gsap) gsap.fromTo(bubble, { autoAlpha: 0, y: 6, scale: .96, transformOrigin: "100% 0" }, { autoAlpha: 1, y: 0, scale: 1, duration: .22, ease: "back.out(2)", clearProps: "opacity,visibility,scale,y" });
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
  if (reduce || !window.gsap) return;

  // "Pause animation" works from the first moment; start() hooks the robot and video into it
  const pauseBtn = $("#hero-pause");
  let paused = store.get("cw-motion") === "paused", onPause = () => {};
  const paintPause = () => {
    pauseBtn.querySelector("span").textContent = paused ? "Play animation" : "Pause animation";
    pauseBtn.querySelector("svg").innerHTML = paused ? '<path d="M3 1.5v9l7.5-4.5z"/>' : '<rect x="2" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/>';
  };
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    store.set("cw-motion", paused ? "paused" : null);
    paintPause(); onPause();
  });
  paintPause();

  // ScrollTrigger and all the motion start once the page has painted, so neither competes with
  // the hero poster (the LCP element) for the network or the main thread
  const later = fn => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 900));
  const whenLoaded = fn => document.readyState === "complete" ? later(fn) : addEventListener("load", () => later(fn), { once: true });
  whenLoaded(() => {
    if (window.ScrollTrigger) return start();
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/ScrollTrigger.min.js";
    s.integrity = "sha512-OaIE7ud4P04EhnBuhEcm0wQSceIxbi2pV03oBLS/+F6ampfxsnxcIxOp7H2eF9G7N0kEht0VAzOLG+dTLSo17Q==";
    s.crossOrigin = "anonymous";
    s.onload = start;
    document.head.append(s);
  });

  function start() {
  btn.removeEventListener("click", stillClick);
  hideBtn.hidden = false;
  gsap.registerPlugin(ScrollTrigger);
  const root = document.documentElement;
  const tilt = op.querySelector(".op-tilt"), bob = op.querySelector(".op-bob"), art = op.querySelector(".op-art");
  const hero = $(".hero-stage"), slot = $("#op-slot"), float = $("#op-float"), home = $("#op-home");

  // ---------- pose art ----------
  // eye box [x0, y0, x1, y1] measured on the 960px art; scan's eye throws a beam, so it keeps its own
  const EYES = {
    idle: [520, 283, 568, 332], hello: [498, 263, 556, 321], "point-down": [541, 262, 601, 323],
    fly: [720, 269, 766, 312], "point-left": [552, 281, 609, 335], idea: [520, 377, 572, 427],
    phone: [484, 286, 535, 336], calculator: [523, 293, 577, 348], scan: null
  };
  const BIG = new Set(["idle", "hello", "point-down", "fly", "point-left", "idea"]); // poses that can show at hero size
  const layers = {};
  let W = 96, cur = "idle";
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
    if (BIG.has(name)) { img.sizes = sizes(); img.srcset = `assets/operator-${name}-480.webp 480w, assets/operator-${name}-960.webp 960w`; }
    img.src = `assets/operator-${name}-480.webp`;
    el.append(img);
    gsap.set(el, { autoAlpha: 0 });
    const L = { el, img, eye: addEye(el, name) };
    art.append(el);
    return (layers[name] = L);
  };
  { // the idle pose is already in the page
    const el = art.querySelector(".op-pose");
    layers.idle = { el, img: el.querySelector("img"), eye: addEye(el, "idle") };
  }
  const loadAll = () => Object.keys(EYES).forEach(layer);

  let tucked = store.get("cw-operator") === "tucked";
  let p = 0, atHome = true, flying = false, docked = false;
  let heroPose = "idle", sectionPose = "idle", override = null, aim = 0, lean = 0;

  const blink = () => {
    const L = layers[cur]; if (!L || !L.eye) return;
    gsap.fromTo(L.eye, { scaleY: 1 }, { scaleY: .1, duration: .07, yoyo: true, repeat: 1, ease: "power1.in", overwrite: "auto" });
  };
  const show = async name => {
    if (name === cur) return;
    const L = layer(name);
    if (!L.img.complete) { try { await L.img.decode(); } catch {} }
    if (name !== want()) return; // a newer pose won while this one loaded
    const prev = layers[cur], prevName = cur;
    cur = name;
    gsap.killTweensOf([prev.el, L.el], "opacity,visibility,scale,y");
    gsap.fromTo(L.el, { autoAlpha: 0, scale: .9, y: 6 }, { autoAlpha: 1, scale: 1, y: 0, duration: .3, ease: "back.out(2.2)" });
    gsap.to(prev.el, { autoAlpha: 0, scale: 1.04, duration: .18, ease: "power1.in", onComplete: () => { if (cur !== prevName) gsap.set(prev.el, { scale: 1 }); } });
    gsap.fromTo(bob, { y: 0 }, { y: -W * .025, duration: .12, yoyo: true, repeat: 1, ease: "power2.out" });
    if (L.eye) gsap.delayedCall(.32, blink);
    look();
  };
  const want = () => override || (flying ? "fly" : atHome ? heroPose : sectionPose);
  const refresh = () => show(want());

  // ---------- ambient motion in the hero: bob, blink, a wave, then point at the scroll ----------
  const bobTw = gsap.to(bob, { yPercent: -2.6, rotation: 1.2, duration: 1.9, ease: "sine.inOut", yoyo: true, repeat: -1, paused: true });
  let blinkCall = null, waveCalls = [];
  const blinkLoop = () => { blink(); if (Math.random() < .2) gsap.delayedCall(.24, blink); blinkCall = gsap.delayedCall(2.8 + Math.random() * 3.2, blinkLoop); };
  const ambient = () => {
    const on = atHome && !paused;
    on ? bobTw.play() : bobTw.pause();
    if (on && !blinkCall) blinkCall = gsap.delayedCall(1.6, blinkLoop);
    if (!on && blinkCall) { blinkCall.kill(); blinkCall = null; }
  };
  const wave = () => {
    if (paused) return;
    const at = (t, pose) => waveCalls.push(gsap.delayedCall(t, () => { heroPose = pose; refresh(); }));
    at(1.4, "hello"); at(4, "idle"); at(5.2, "point-down");
  };

  // ---------- the hero loop ----------
  const video = $("#hero-video");
  let videoReady = false;
  const loadVideo = () => {
    if (videoReady || paused || (navigator.connection && navigator.connection.saveData)) return;
    videoReady = true;
    video.querySelectorAll("source").forEach(s => { s.src = s.dataset.src; });
    video.addEventListener("playing", () => video.classList.add("is-playing"), { once: true });
    video.load();
    video.play().catch(() => {});
  };
  onPause = () => {
    if (paused) { video.pause(); waveCalls.forEach(c => c.kill()); waveCalls = []; }
    else { loadVideo(); if (videoReady) video.play().catch(() => {}); }
    ambient();
  };
  // the loop only plays while the hero is on screen
  new IntersectionObserver(([e]) => {
    if (!videoReady || paused) return;
    e.isIntersecting ? video.play().catch(() => {}) : video.pause();
  }).observe(hero);

  // ---------- layout: home in the hero, dock in the lane or the nav ----------
  root.classList.add("op-on");
  slot.classList.add("is-on");
  op.classList.add("is-live");
  let homeBox = { x: 0, y: 0, s: 96 }, dock = { x: 0, y: 0, s: 52 }, wide = false, arc = 60;
  const measure = () => {
    wide = innerWidth >= 1100;
    const h = (innerWidth <= 860 ? float : home).getBoundingClientRect();
    homeBox = { x: h.left + scrollX, y: h.top + scrollY, s: h.width };
    W = h.width;
    op.style.setProperty("--op-w", W + "px");
    op.style.setProperty("--u", (W / 100) + "px");
    Object.values(layers).forEach(L => { if (L.img.srcset) L.img.sizes = sizes(); });
    if (wide) {
      const m = $("#fix > .wrap").getBoundingClientRect().left;
      const s = Math.min(150, m - 10);
      dock = { x: innerWidth - m / 2 - s / 2, y: innerHeight * .56 - s / 2, s };
      arc = 90;
    } else {
      const r = slot.getBoundingClientRect();
      dock = { x: r.left, y: r.top, s: r.width };
      root.style.setProperty("--slot-x", r.left + "px");
      root.style.setProperty("--slot-y", r.top + "px");
      arc = 26;
    }
  };

  const xTo = gsap.quickTo(op, "x", { duration: .45, ease: "power3" });
  const yTo = gsap.quickTo(op, "y", { duration: .45, ease: "power3" });
  const sxTo = gsap.quickTo(op, "scaleX", { duration: .45, ease: "power3" }), syTo = gsap.quickTo(op, "scaleY", { duration: .45, ease: "power3" });
  const sTo = v => { sxTo(v); syTo(v); };
  const rTo = gsap.quickTo(tilt, "rotation", { duration: .5, ease: "power3" });
  const flipTo = gsap.quickTo(art, "scaleX", { duration: .25, ease: "power2" });
  const ease = gsap.parseEase("power2.inOut");
  let lastX = null, vel = 0, settle = null, faded = false;

  const place = () => {
    const e = ease(p);
    const hx = homeBox.x - scrollX, hy = homeBox.y - scrollY;
    let x = hx + (dock.x - hx) * e, y = hy + (dock.y - hy) * e - Math.sin(Math.PI * p) * arc;
    let s = (homeBox.s + (dock.s - homeBox.s) * e) / W;
    if (docked) y += gsap.utils.clamp(-26, 26, vel * .012) * (wide ? 1 : 0); // trails the scroll a little, then settles
    if (tucked && wide) x = innerWidth + 24;
    const fade = tucked && !wide;
    if (fade !== faded) { faded = fade; gsap.to(op, { autoAlpha: fade ? 0 : 1, duration: .25, overwrite: "auto" }); }
    if (flying && lastX !== null && Math.abs(x - lastX) > 2) flipTo(x < lastX ? -1 : 1);
    if (!flying) flipTo(1);
    lastX = x;
    // on narrow screens it flies under the nav bar and only sits above it once it lands in the slot
    const z = !wide && p >= .85 ? "55" : "45";
    if (op.style.zIndex !== z) op.style.zIndex = z;
    xTo(x); yTo(y); sTo(s);
    rTo(aim + lean);
    tuckBtn.hidden = !(wide && docked && !tucked);
    showBtn.hidden = !tucked;
  };

  const flight = ScrollTrigger.create({
    trigger: hero, start: "top top+=68", end: () => "+=" + Math.round(hero.offsetHeight * .62),
    onUpdate: self => setFlight(self.progress)
  });
  function setFlight(v) {
    p = v;
    const was = [atHome, flying];
    atHome = p < .04; flying = !atHome && p < .92; docked = p >= .92;
    if (was[0] !== atHome || was[1] !== flying) {
      if (!atHome) { loadAll(); closeTip(false); }
      ambient(); refresh();
    }
    place();
  }

  // the whole page: lean into fast scrolling, then straighten up
  ScrollTrigger.create({
    onUpdate: self => {
      vel = self.getVelocity();
      lean = gsap.utils.clamp(-7, 7, vel * .004);
      place();
      if (settle) settle.kill();
      settle = gsap.delayedCall(.14, () => { vel = 0; lean = 0; place(); });
    }
  });

  // ---------- one pose per section ----------
  // later entries win; the services button wins while it is on screen, so the robot points at it
  const SECTIONS = [["#fix", "phone", "fix"], ["#how", "calculator", "how"], ["#services", "idle", "services"],
    ["#free", "scan", "free"], ["#video", "hello", "video"], ["#faq", "idea", "faq"], [".closing", "point-left", "closing"],
    [".services .foot", "point-left", "services", "top 88%", "bottom 18%"]];
  const triggers = SECTIONS.map(([sel, pose, key, start = "top 62%", end = "bottom 62%"]) => ({ pose, key, st: ScrollTrigger.create({ trigger: sel, start, end, onToggle: pick }) }));
  function pick() {
    const hit = [...triggers].reverse().find(t => t.st.isActive);
    sectionPose = hit ? hit.pose : "idle";
    section = hit ? hit.key : "top";
    if (!atHome) refresh();
  }

  // ---------- the eye follows a mouse cursor ----------
  let mx = null, my = null, lookRaf = 0;
  const look = () => {
    const L = layers[cur];
    if (!L || !L.eye || mx === null) return;
    const r = L.eye.getBoundingClientRect();
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 260) * (gsap.getProperty(art, "scaleX") < 0 ? -1 : 1);
    gsap.to(L.eye, { xPercent: dx / d * 26 * k, yPercent: dy / d * 22 * Math.abs(k), duration: .35, ease: "power3", overwrite: "auto" });
  };
  if (fine) {
    addEventListener("pointermove", e => {
      mx = e.clientX; my = e.clientY;
      if (!lookRaf) lookRaf = requestAnimationFrame(() => { lookRaf = 0; look(); });
    }, { passive: true });
    root.addEventListener("mouseleave", () => { mx = null; Object.values(layers).forEach(L => L.eye && gsap.to(L.eye, { xPercent: 0, yPercent: 0, duration: .5 })); });
  }

  // ---------- point at a primary button that is hovered or focused nearby ----------
  let unaimCall = null;
  const aimAt = b => {
    if (flying || tucked) return;
    const r = b.getBoundingClientRect(), o = btn.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const dx = (r.left + r.width / 2) - (o.left + o.width / 2), dy = (r.top + r.height / 2) - (o.top + o.height * .45);
    if (Math.hypot(dx, dy) > Math.max(720, innerWidth * .72)) return;
    let pose = null, a = 0;
    if (dx < -Math.abs(dy) * .5) { pose = "point-left"; a = -Math.atan2(dy, -dx) * 180 / Math.PI; }
    else if (dy > 0) { pose = "point-down"; a = Math.atan2(-dx, dy) * 180 / Math.PI; }
    if (!pose) return;
    if (unaimCall) unaimCall.kill();
    override = pose; aim = gsap.utils.clamp(-24, 24, a);
    refresh(); place();
  };
  const unaim = () => {
    if (unaimCall) unaimCall.kill();
    unaimCall = gsap.delayedCall(.35, () => { if (override !== "idea") override = null; aim = 0; refresh(); place(); });
  };
  document.querySelectorAll("main .btn:not(.btn-ghost)").forEach(b => {
    b.addEventListener("pointerenter", () => aimAt(b));
    b.addEventListener("focus", () => aimAt(b));
    b.addEventListener("pointerleave", unaim);
    b.addEventListener("blur", unaim);
  });

  // ---------- press: a spin and a tip ----------
  let ideaCall = null;
  btn.addEventListener("click", () => {
    if (bubbleOpen) { closeTip(false); return; }
    gsap.fromTo(tilt, { rotationY: 0 }, { rotationY: 360, duration: .8, ease: "back.out(1.3)", transformPerspective: 700 });
    if (ideaCall) ideaCall.kill();
    override = "idea"; aim = 0; refresh(); place();
    ideaCall = gsap.delayedCall(3, () => { if (override === "idea") override = null; refresh(); });
    openTip();
  });

  // ---------- small reactions to the page ----------
  const nod = () => { if (!tucked) { gsap.fromTo(bob, { y: 0 }, { y: -W * .03, duration: .1, yoyo: true, repeat: 1, ease: "power2.out" }); blink(); } };
  document.querySelectorAll("#picker .tile, #faq summary").forEach(t => t.addEventListener("click", nod));

  // ---------- tuck away and bring back ----------
  const setTucked = (v, focusTo) => {
    tucked = v; store.set("cw-operator", v ? "tucked" : null);
    closeTip(false); place();
    if (focusTo) requestAnimationFrame(() => focusTo.focus());
  };
  tuckBtn.addEventListener("click", () => setTucked(true, showBtn));
  hideBtn.addEventListener("click", () => setTucked(true, showBtn));
  showBtn.addEventListener("click", () => setTucked(false, btn));

  // ---------- keep the floating controls next to the robot ----------
  gsap.ticker.add(() => {
    if (!tuckBtn.hidden) {
      const x = gsap.getProperty(op, "x"), y = gsap.getProperty(op, "y"), s = gsap.getProperty(op, "scaleX") * W;
      tuckBtn.style.transform = `translate(${Math.round(Math.min(x + s * .8, innerWidth - 34))}px, ${Math.round(y - 4)}px)`;
    }
    placeBubble();
  });

  // ---------- start ----------
  const init = () => { measure(); setFlight(flight.progress); pick(); place(); };
  ScrollTrigger.addEventListener("refresh", init);
  measure();
  const hx = homeBox.x - scrollX, hy = homeBox.y - scrollY;
  gsap.set(op, { x: hx, y: hy, scale: homeBox.s / W });
  setFlight(flight.progress);
  ambient();
  if (atHome) wave();
  loadVideo();
  ["hello", "point-down", "fly"].forEach(layer);
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
