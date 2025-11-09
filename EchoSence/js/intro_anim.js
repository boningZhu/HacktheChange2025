// intro_anim.js — animated background for Home screen
(function () {
  const canvas = document.getElementById("introCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  window.addEventListener("resize", () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  });

  // Time
  let t = 0;

  // Soundwave samples
  const SAMPLES = 180;
  let phase = 0;

  function drawGradientBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    // subtle animated stops
    const a = 0.5 + 0.5 * Math.sin(t * 0.0006);
    g.addColorStop(0, `rgba(${20+60*a|0}, ${30+40*a|0}, 80, 0.85)`);
    g.addColorStop(1, `rgba(5, 8, 16, 0.88)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawPulseRings() {
    const cx = w * 0.5;
    const cy = h * 0.58;
    const rings = 6;
    const base = 40;
    for (let i = 0; i < rings; i++) {
      const prog = ((t * 0.0012 + i * 0.18) % 1);
      const r = base + prog * Math.max(w, h) * 0.6;
      const alpha = 0.22 * (1 - prog);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120,170,255, ${alpha.toFixed(3)})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawCitySilhouette() {
    // simple abstract skyline
    const baseY = h * 0.78;
    ctx.save();
    ctx.translate(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    const cols = 16;
    const colW = w / cols;
    for (let i = 0; i < cols; i++) {
      const x = i * colW;
      const rnd = 60 + 120 * (0.5 + 0.5 * Math.sin(i * 0.7 + t * 0.0007));
      const bh = Math.min(h * 0.28, rnd);
      ctx.lineTo(x, baseY - bh);
      ctx.lineTo(x + colW * 0.6, baseY - bh - 6); // antenna
      ctx.lineTo(x + colW * 0.8, baseY - bh);
      ctx.lineTo(x + colW, baseY - bh);
      ctx.lineTo(x + colW, baseY);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, baseY - 200, 0, baseY + 40);
    g.addColorStop(0, "rgba(18,22,34,0.9)");
    g.addColorStop(1, "rgba(10,12,20,1)");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.restore();
  }

  function drawSoundWave() {
    const cx = w * 0.5;
    const baseY = h * 0.58;
    const amp = Math.min(80, 24 + 16 * Math.sin(t * 0.0012));
    phase += 0.045;

    ctx.beginPath();
    for (let i = 0; i <= SAMPLES; i++) {
      const p = i / SAMPLES;
      const x = p * w * 0.9 + w * 0.05;
      const y = baseY + Math.sin(p * 8 + phase) * amp * Math.sin(p * Math.PI);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "rgba(100,200,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // light glow
    ctx.shadowColor = "rgba(120,200,255,0.65)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function loop(now) {
    t = now;
    drawGradientBackground();
    drawPulseRings();
    drawCitySilhouette();
    drawSoundWave();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
