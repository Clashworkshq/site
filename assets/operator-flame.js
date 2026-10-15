// The Operator's thruster: a live flame drawn on a canvas under the robot.
// new OperatorFlame(canvas) then, every frame, flame.draw({ x, y, size, vx, vy, power, t }):
//   x, y   nozzle point in canvas CSS pixels
//   size   robot art width in CSS pixels (everything scales from it)
//   vx, vy robot velocity in px per second (the flame trails opposite it)
//   power  0 to 1.5, extra thrust for launches and bursts
// Layers: a soft emerald bloom, a wobbling emerald body, a mint-white core, embers.
// The flame is a faceted teardrop, a nod to the low-poly art.
(() => {
  const TAU = Math.PI * 2;
  // cheap smooth noise: a few summed sines at odd ratios, -1..1
  const noise = (t, s) => (Math.sin(t * 1.7 + s) * .5 + Math.sin(t * 3.1 + s * 2.3) * .3 + Math.sin(t * 5.3 + s * 4.1) * .2);

  class OperatorFlame {
    constructor(canvas) {
      this.c = canvas;
      this.g = canvas.getContext("2d");
      this.embers = Array.from({ length: 14 }, () => ({ life: 0 }));
      this.ang = Math.PI / 2; // pointing down
      this.len = 1; this.last = 0; this.dpr = 1;
    }
    resize(w, h) {
      // sharp on high-density screens, but the backing store never passes 1600 px on a side
      this.dpr = Math.min(2, window.devicePixelRatio || 1, 1600 / Math.max(w, h));
      this.c.width = Math.round(w * this.dpr); this.c.height = Math.round(h * this.dpr);
      this.c.style.width = w + "px"; this.c.style.height = h + "px";
      this.w = w; this.h = h;
    }
    clear() { this.g.setTransform(1, 0, 0, 1, 0, 0); this.g.clearRect(0, 0, this.c.width, this.c.height); }
    // one frame at rest, no embers: the still robot under Reduce motion
    still({ x, y, size }) {
      const e = this.embers; this.embers = [];
      this.len = .44; this.ang = Math.PI / 2; this.last = 0;
      this.pinned = true; this.draw({ x, y, size, t: 1.3 }); this.pinned = false;
      this.embers = e;
    }
    draw({ x, y, size, vx = 0, vy = 0, power = 0, t, dim = 1 }) {
      const g = this.g, dt = this.last ? Math.min(.05, t - this.last) : .016;
      this.last = t;
      this.clear();
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const speed = Math.hypot(vx, vy);
      // direction: straight down at rest, swinging opposite the motion as speed builds
      const k = Math.min(1, speed / 900);
      const want = speed > 30 ? Math.atan2(-vy, -vx) : Math.PI / 2;
      // blend toward "down" when slow, and never point up into the body
      let target = Math.PI / 2 + angDiff(want, Math.PI / 2) * k;
      target = Math.PI / 2 + clampN(angDiff(target, Math.PI / 2), -1.25, 1.25);
      this.ang += angDiff(target, this.ang) * Math.min(1, dt * 10);
      const thrust = Math.min(2.2, .55 + k * 1.1 + power);
      if (!this.pinned) this.len += (thrust - this.len) * Math.min(1, dt * 8);

      const u = size / 100;                       // 1% of the robot
      const flick = 1 + noise(t * 6, 1) * .08 + noise(t * 17, 7) * .05;
      const L = u * 52 * this.len * flick * dim;        // flame length: about 29% of the robot at rest
      const W = u * 15 * (1 + noise(t * 9, 3) * .06); // width at the nozzle
      g.save();
      g.translate(x, y);
      g.rotate(this.ang - Math.PI / 2);           // local frame: +y points along the flame
      // bloom: an elliptical glow that fades to nothing before its edge
      g.save(); g.translate(0, L * .42); g.scale(W * 1.7 / (L * .9), 1);
      const bl = g.createRadialGradient(0, 0, 0, 0, 0, L * .9);
      bl.addColorStop(0, "rgba(16,185,129,.32)"); bl.addColorStop(.5, "rgba(16,185,129,.1)"); bl.addColorStop(1, "rgba(16,185,129,0)");
      g.fillStyle = bl; g.beginPath(); g.arc(0, 0, L * .9, 0, TAU); g.fill();
      g.restore();

      // body and core: faceted teardrops whose tip wanders
      const tipX = noise(t * 5, 11) * W * .35;
      flameShape(g, W, L, tipX, t, 0);
      const body = g.createLinearGradient(0, 0, 0, L);
      body.addColorStop(0, "rgba(52,245,166,1)"); body.addColorStop(.55, "rgba(16,185,129,.85)"); body.addColorStop(1, "rgba(16,185,129,0)");
      g.fillStyle = body; g.fill();
      flameShape(g, W * .55, L * .62, tipX * .6, t, 5);
      const core = g.createLinearGradient(0, 0, 0, L * .62);
      core.addColorStop(0, "rgba(240,255,250,1)"); core.addColorStop(.35, "rgba(160,255,215,.85)"); core.addColorStop(1, "rgba(52,245,166,0)");
      g.fillStyle = core; g.fill();
      // two light facets inside the core, the low-poly look
      g.fillStyle = "rgba(255,255,255,.18)";
      g.beginPath(); g.moveTo(-W * .38, 0); g.lineTo(0, L * .42); g.lineTo(-W * .05, 0); g.closePath(); g.fill();
      g.fillStyle = "rgba(255,255,255,.1)";
      g.beginPath(); g.moveTo(W * .1, 0); g.lineTo(tipX * .5, L * .5); g.lineTo(W * .42, 0); g.closePath(); g.fill();

      // nozzle glow, so the flame reads as coming out of the robot (elliptical, no hard edge)
      g.save(); g.translate(0, W * .1); g.scale(1, .5);
      const nz = g.createRadialGradient(0, 0, 0, 0, 0, W * 1.05);
      nz.addColorStop(0, "rgba(220,255,240,.7)"); nz.addColorStop(1, "rgba(52,245,166,0)");
      g.fillStyle = nz; g.beginPath(); g.arc(0, 0, W * 1.05, 0, TAU); g.fill();
      g.restore();
      g.restore();

      // embers: spawned at the tip, drift along the flame and fade, in page space
      const rate = .35 + k * 1.6 + power;
      for (const e of this.embers) {
        if (e.life <= 0) {
          if (Math.random() < rate * dt * 6) {
            const a = this.ang + (Math.random() - .5) * .5, d = L * (.55 + Math.random() * .3);
            e.x = x + Math.cos(a) * d; e.y = y + Math.sin(a) * d;
            const sp = u * (14 + Math.random() * 24);
            e.vx = Math.cos(a) * sp - vx * .15; e.vy = Math.sin(a) * sp - vy * .15;
            e.life = e.max = .35 + Math.random() * .45; e.r = u * (.35 + Math.random() * .45);
          }
          continue;
        }
        e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt;
        const f = Math.max(0, e.life / e.max);
        g.fillStyle = `rgba(52,230,160,${(.85 * f).toFixed(3)})`;
        g.beginPath(); g.arc(e.x, e.y, e.r * (.5 + f * .5), 0, TAU); g.fill();
      }
      g.globalCompositeOperation = "source-over";
    }
  }

  // a teardrop from the nozzle (width w) to the tip (length l), with gently moving sides
  function flameShape(g, w, l, tipX, t, seed) {
    const s1 = noise(t * 7, seed + 1) * w * .12, s2 = noise(t * 8, seed + 2) * w * .12;
    g.beginPath();
    g.moveTo(-w * .5, 0);
    g.bezierCurveTo(-w * .62 + s1, l * .28, -w * .3 + s1, l * .62, tipX, l);
    g.bezierCurveTo(w * .3 + s2, l * .62, w * .62 + s2, l * .28, w * .5, 0);
    g.closePath();
  }
  function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
  function clampN(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  window.OperatorFlame = OperatorFlame;
})();
