// UI <-> API glue (drop-in)
// -----------------------------------------------------------
(function () {
  const $ = (s) => document.querySelector(s);

  // 1) Backend base URL (NO /docs)
  const API_BASE = "https://fluffy-succotash-pqr94vjx4q9cqq5-8000.app.github.dev";
  // expose to other scripts (intro.js, map.js)
  window.API_BASE = API_BASE;

  // 2) DOM
  const elPostcode = $("#postcode");
  const elMood     = $("#mood");
  const elSubmit   = $("#submitBtn");
  const elResult   = $("#result");

  // Track chosen celebration shape (default galaxy)
  window.currentShape = window.currentShape || "galaxy";

  const show = (msg) => { if (elResult) elResult.innerHTML = msg; };

  // 3) HTTP helpers
  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // 4) Alerts loader (exported so intro.js can call it after fade-in)
  async function loadAlerts() {
    const box = document.getElementById("alertsPanel");
    if (!box) return;
    try {
      const arr = await getJSON(`${API_BASE}/api/alerts?hours=24`);
      box.innerHTML = arr.length
        ? arr.map(a =>
            `<div style="padding:6px;border:1px solid #fff1;border-radius:8px;margin:6px 0">
               <b>Lv.${a.level}</b> · ${a.rule_id} · ${new Date(a.created_at).toLocaleString()}
             </div>`
          ).join("")
        : "No alerts in the last 24h.";
    } catch (e) {
      console.warn(e);
      box.innerHTML = "Failed to load alerts.";
    }
  }
  window.loadAlerts = loadAlerts;

  // 5) Submit → call FastAPI → celebration → marker + refresh heatmap
  elSubmit?.addEventListener("click", async (e) => {
    e.preventDefault();

    const postcode = (elPostcode?.value || "").trim();
    const mood     = (elMood?.value || "").trim();
    if (!mood) { show("Please write a short mood sentence."); return; }

    try {
      show("Analyzing with AI…");

      const data = await postJSON(`${API_BASE}/api/reports`, {
        text: mood,
        postcodeOrArea: postcode,
      });

      const emotion   = data?.ai?.emotion || "neutral";
      const empathy   = data?.reply?.empathy || "";
      const resources = (data?.reply?.resources || [])
        .map(r => `<a href="${r.url}" target="_blank" rel="noopener">${r.title}</a>`)
        .join(" · ");

      // Update particle palette (background)
      window.UELayer?.setPaletteByEmotion?.(emotion);

      // Celebration (3D) — use the currently selected shape
      await window.startCelebration3D?.(emotion, 4200, window.currentShape || "galaxy");

      // Drop a marker at map center (or your own resolver)
      const ll = window.UEMAP?.center || [51.0447, -114.0719];
      window.UEMAP?.addEmotionMarker?.(ll, emotion, mood);

      // Refresh heatmap
      window.UEMAP?.refreshHeatmap?.(API_BASE);

      // Friendly AI reply
      show(`${empathy}<br>${resources}`);
    } catch (err) {
      console.error(err);
      show("❌ Failed to fetch (check API_BASE & CORS)");
    }
  });

  // 6) Palette & Shape controls (if present on page)
  document.querySelectorAll(".demo button[data-emotion]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const emo = btn.getAttribute("data-emotion");
      window.UELayer?.setPaletteByEmotion?.(emo);
      show(`Palette switched to <b>${emo}</b>.`);
    });
  });

  document.querySelectorAll("button[data-shape]").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.currentShape = btn.getAttribute("data-shape"); // galaxy|xmas|heart|blossom
      window.UELayer?.setShape?.(window.currentShape);      // reflect on background
      show(`Shape switched to <b>${window.currentShape}</b>. Submit to celebrate!`);
    });
  });

  // 7) First load: heatmap + alerts (after map is ready)
  window.addEventListener("load", () => {
    window.UEMAP?.refreshHeatmap?.(API_BASE);
    loadAlerts();
  });

  // 8) Ctrl/Cmd + Enter to submit
  elMood?.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") elSubmit?.click();
  });
})();
