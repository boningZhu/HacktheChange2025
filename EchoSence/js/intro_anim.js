// intro_anim.js — premium calm cinematic intro (SLOW VERSION)
(function () {
  const canvas = document.getElementById("introCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  // --- Animation speed (lower = slower) ---
  const SPEED = {
    gradient: 0.00020,  // 背景渐变（更慢更稳）
    rings:    0.00045,  // 回声波扩散
    skyline:  0.00025,  // 建筑呼吸
    wave:     0.018,    // 声波移动
    zoom:     0.00040,  // 轻呼吸缩放
    stars:    0.010,    // 星空移动
    glints:   0.0015,   // 灯光闪烁
    flow:     0.00020   // 萤火虫流动
  };

  const LOOK = {
    glow: 20,
    ringWidth: 3.0,
    maxWaveAmp: 60,
    baseWaveAmp: 25,
    fireflyCount: 90,
    starCount: 200,
    skylineHeight: 160,
  };

  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  let t = 0;
  let phase = 0;
  const SAMPLES = 200;

  function vnoise(x, y) {
    const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return s - Math.floor(s);
  }
  function smoothNoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const n00 = vnoise(xi, yi);
    const n10 = vnoise(xi + 1, yi);
    const n01 = vnoise(xi, yi + 1);
    const n11 = vnoise(xi + 1, yi + 1);
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const nx0 = n00 * (1 - u) + n10 * u;
    const nx1 = n01 * (1 - u) + n11 * u;
    return nx0 * (1 - v) + nx1 * v;
  }

  const stars = Array.from({ length: LOOK.starCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    z: Math.random() * 1.0 + 0.2,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random() * 0.4 + 0.2
  }));

  const fireflies = Array.from({ length: LOOK.fireflyCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h * 0.7 + h * 0.15,
    vx: 0, vy: 0,
    life: Math.random() * 1
  }));

  function drawGradientBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    const a = 0.5 + 0.5 * Math.sin(t * SPEED.gradient);
    g.addColorStop(0, `rgba(${30 + 80 * a | 0}, ${70 + 100 * a | 0}, 255, 0.9)`);
    g.addColorStop(1, `rgba(5, 10, 20, 0.95)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawStars() {
    for (let s of stars) {
      s.x -= SPEED.stars * s.z;
      if (s.x < -2) s.x = w + Math.random() * 20;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin((s.x + s.y + t * 0.0005) * 0.04));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * tw, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,200,255,${0.25 * s.a + 0.25 * tw})`;
      ctx.fill();
    }
  }

  function drawPulseRings() {
    const cx = w * 0.5;
    const cy = h * 0.58;
    const rings = 5;
    const base = 38;
    for (let i = 0; i < rings; i++) {
      const prog = ((t * SPEED.rings + i * 0.2) % 1);
      const r = base + prog * Math.max(w, h) * 0.65;
      const alpha = 0.20 * (1 - prog);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(110,210,255,${alpha.toFixed(3)})`;
      ctx.lineWidth = LOOK.ringWidth;
      ctx.shadowColor = `rgba(110,210,255,${alpha})`;
      ctx.shadowBlur = LOOK.glow;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  function drawCitySilhouette() {
    const baseY = h * 0.78;
    ctx.beginPath();
    ctx.moveTo(0, baseY);

    const cols = 18;
    const colW = w / cols;
    for (let i = 0; i < cols; i++) {
      const bh = 50 + LOOK.skylineHeight * Math.abs(Math.sin(i * 0.55 + t * SPEED.skyline));
      const x = i * colW;
      ctx.lineTo(x, baseY - bh);
      ctx.lineTo(x + colW * 0.6, baseY - bh - 4);
      ctx.lineTo(x + colW, baseY);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, baseY - 200, 0, baseY + 40);
    g.addColorStop(0, "rgba(26,36,60,0.95)");
    g.addColorStop(1, "rgba(8,12,22,1)");
    ctx.fillStyle = g;
    ctx.fill();

    // window glints
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w;
      const y = baseY - Math.random() * 180;
      const s = 0.8 + Math.random() * 1.8;
      const tw = Math.abs(Math.sin((x * 0.02 + y * 0.02 + t * SPEED.glints)));
      ctx.fillStyle = `rgba(255,255,180,${0.05 + 0.25 * tw})`;
      ctx.fillRect(x, y, s, s);
    }
  }

  function drawSoundWave() {
    const baseY = h * 0.58;
    const amp = LOOK.baseWaveAmp + 10 * Math.sin(t * (SPEED.gradient * 2));
    phase += SPEED.wave;

    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const p = i / SAMPLES;
      const x = p * w * 0.92 + w * 0.04;
      const y = baseY + Math.sin(p * 8 + phase) * amp * Math.sin(p * Math.PI);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(130,235,255,0.9)";
    ctx.lineWidth = 2.8;
    ctx.shadowColor = "rgba(120,230,255,0.7)";
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFireflies() {
    const s = 0.0015;
    const zt = t * SPEED.flow;

    for (let f of fireflies) {
      const nx = smoothNoise(f.x * s, f.y * s + zt);
      const ny = smoothNoise(f.x * s + 1000, f.y * s + zt + 100);
      const ang = (nx - 0.5) * Math.PI * 2 + (ny - 0.5) * Math.PI * 2;
      const spd = 0.25 + 0.45 * Math.abs(nx - 0.5);

      f.vx = Math.cos(ang) * spd;
      f.vy = Math.sin(ang) * spd;

      f.x += f.vx;
      f.y += f.vy;

      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;
      if (f.y < h * 0.12) f.y = h * 0.88;
      if (f.y > h * 0.92) f.y = h * 0.18;

      const alpha = 0.3 + 0.4 * Math.sin((f.x + f.y + t * 0.0005) * 0.02);
      ctx.beginPath();
      ctx.arc(f.x, f.y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(120,220,255,${0.45 + alpha * 0.3})`;
      ctx.shadowColor = "rgba(120,220,255,0.9)";
      ctx.shadowBlur = LOOK.glow;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function zoomEffect() {
    const scale = 1 + 0.015 * Math.sin(t * SPEED.zoom);
    ctx.setTransform(scale, 0, 0, scale, w * (1 - scale) / 2, h * (1 - scale) / 2);
  }

  function loop(now) {
    t = now;
    ctx.save();
    zoomEffect();
    drawGradientBackground();
    drawStars();
    drawPulseRings();
    drawCitySilhouette();
    drawSoundWave();
    drawFireflies();
    ctx.restore();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
