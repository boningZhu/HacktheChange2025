// UI: submit → call FastAPI → fullscreen 3D celebration → add map icon
(function () {
  const $ = (sel) => document.querySelector(sel);

  // ===== 0) Backend base URL (NO /docs here) =====
  const API_BASE = "https://miniature-space-waddle-jw59v6r5rgxcjgw5-8000.app.github.dev";

  // ===== 1) DOM =====
  const elPostcode = $("#postcode");
  const elMood     = $("#mood");
  const elSubmit   = $("#submitBtn");
  const elResult   = $("#result");

  // Track current selected shape (default galaxy)
  let currentShape = "galaxy";

  // ===== 2) Small helpers =====
  const show = (msg) => { if (elResult) elResult.innerHTML = msg; };

  function jitter([lat, lng], d = 0.01) {
    const r = () => (Math.random() - 0.5) * 2 * d;
    return [lat + r(), lng + r()];
  }

  function resolveLatLng(areaText) {
    const c = window.UEMAP?.center || [51.0447, -114.0719]; // Calgary center
    if (!areaText) return jitter(c, 0.01);
    const a = areaText.trim().toUpperCase();

    if (a === "NW") return [c[0] + 0.06, c[1] - 0.06];
    if (a === "NE") return [c[0] + 0.06, c[1] + 0.06];
    if (a === "SW") return [c[0] - 0.06, c[1] - 0.06];
    if (a === "SE") return [c[0] - 0.06, c[1] + 0.06];

    // Looks like a Canadian FSA / postal code → jitter around city center
    if (/^[A-Z]\d[A-Z](\s?\d[A-Z]\d)?$/.test(a)) return jitter(c, 0.04);
    return jitter(c, 0.02);
  }

  // ===== 3) Backend calls =====
  async function callAPI(text, area) {
    const res = await fetch(`${API_BASE}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, postcodeOrArea: area })
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(`API error ${res.status}: ${msg}`);
    }
    return await res.json();
  }

  async function loadAlerts() {
    try {
      const res = await fetch(`${API_BASE}/api/alerts?hours=24`);
      if (!res.ok) throw new Error(`alerts http ${res.status}`);
      const arr = await res.json();
      const box = document.getElementById("alertsPanel");
      if (!box) return;

      if (!arr.length) {
        box.innerHTML = "<span>No alerts in the last 24h.</span>";
        return;
      }
      box.innerHTML = arr.map(a => {
        const when = new Date(a.created_at).toLocaleString();
        return `<div style="padding:6px 8px; border:1px solid rgba(255,255,255,.12); border-radius:8px; margin-bottom:6px;">
          <b>Level ${a.level}</b> · ${a.rule_id} · <span style="opacity:.8">${when}</span><br/>
          <span style="opacity:.9">geo: ${a.geohash}</span>
        </div>`;
      }).join("");
    } catch (e) {
      console.warn(e);
      const box = document.getElementById("alertsPanel");
      if (box) box.innerHTML = "<span>Failed to load alerts.</span>";
    }
  }

  // ===== 4) Submit flow =====
  elSubmit?.addEventListener("click", async (e) => {
    e.preventDefault();

    const postcode = (elPostcode?.value || "").trim();
    const mood     = (elMood?.value || "").trim();

    if (!mood) { show("Please write a short mood sentence."); elMood?.focus(); return; }

    try {
      show("Analyzing with AI… (first run may take a bit)");

      // --- call backend ---
      const data = await callAPI(mood, postcode);
      const emotion = data?.ai?.emotion || "neutral";
      const risk    = data?.ai?.risk_level ?? 0;
      const topics  = data?.ai?.topics || [];
      const empathy = data?.reply?.empathy || "Thank you for sharing.";
      const resources = (data?.reply?.resources || [])
        .map(r => `<a href="${r.url}" target="_blank" rel="noopener">${r.title}</a>`)
        .join(" · ");

      // --- update particle palette immediately ---
      window.UELayer?.setPaletteByEmotion?.(emotion);
      show(`AI: <b>${emotion}</b> (risk ${risk}) · topics: ${topics.join(", ")}<br>${empathy}<br>${resources}`);

      // --- fullscreen celebration (3–4s) with the selected shape ---
      await startCelebration3D(emotion, 4200, currentShape);

      // --- drop a small pulsing icon on the map ---
      const ll = resolveLatLng(postcode);
      window.UEMAP?.addEmotionMarker?.(ll, emotion, mood);

    } catch (err) {
      console.error(err);
      show(`❌ ${err.message || err}`);
    }
  });

  // ===== 5) Palette & shape controls =====
  document.querySelectorAll(".demo button[data-emotion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emo = btn.getAttribute("data-emotion");
      window.UELayer?.setPaletteByEmotion?.(emo);
      show(`Palette switched to <b>${emo}</b>.`);
    });
  });

  document.querySelectorAll("button[data-shape]").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentShape = btn.getAttribute("data-shape");    // galaxy | xmas | heart | blossom
      window.UELayer?.setShape?.(currentShape);         // optional visual sync
      show(`Shape switched to <b>${currentShape}</b>. Submit to celebrate!`);
    });
  });

  // ===== 6) Heatmap + Alerts auto refresh =====
  // Heatmap every 20s
  setInterval(() => {
    if (window.UEMAP?.refreshHeatmap) {
      window.UEMAP.refreshHeatmap(API_BASE);
    }
  }, 20000);

  // Alerts every 60s
  setInterval(loadAlerts, 60000);

  // First load
  window.addEventListener("load", () => {
    window.UEMAP?.refreshHeatmap?.(API_BASE);
    loadAlerts();
  });

  // ===== 7) Keyboard shortcut =====
  elMood?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") elSubmit?.click();
  });
})();
