// Minimal UI/API glue
(function () {
  const $ = s => document.querySelector(s);

  // ✅ 填你的 8000 URL（不要加 /docs）
  const API_BASE = "https://fluffy-succotash-pqr94vjx4q9cqq5-8000.app.github.dev";

  const elPostcode = $("#postcode");
  const elMood     = $("#mood");
  const elSubmit   = $("#submitBtn");
  const elResult   = $("#result");

  const show = (msg) => { if (elResult) elResult.innerHTML = msg; };

  async function postJSON(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // 提交
  elSubmit?.addEventListener("click", async (e) => {
    e.preventDefault();
    const postcode = (elPostcode?.value || "").trim();
    const mood     = (elMood?.value || "").trim();
    if (!mood) { show("Please write a short mood sentence."); return; }

    try {
      show("Analyzing with AI…");
      const data = await postJSON(`${API_BASE}/api/reports`, {
        text: mood, postcodeOrArea: postcode
      });

      const emotion = data?.ai?.emotion || "neutral";
      window.UELayer?.setPaletteByEmotion?.(emotion);

      // 你的庆祝动画（保留现有）
      await window.startCelebration3D?.(emotion, 4200, window.currentShape || "galaxy");

      // 地图标记 & 热力刷新（保留现有）
      const ll = window.UEMAP?.center || [51.0447, -114.0719];
      window.UEMAP?.addEmotionMarker?.(ll, emotion, mood);
      window.UEMAP?.refreshHeatmap?.(API_BASE);

      const empathy = data?.reply?.empathy || "";
      const resources = (data?.reply?.resources || [])
        .map(r => `<a href="${r.url}" target="_blank">${r.title}</a>`).join(" · ");
      show(`${empathy}<br>${resources}`);
    } catch (err) {
      console.error(err);
      show("❌ Failed to fetch (check API_BASE & CORS)");
    }
  });

  // 首次加载：拉一次热力 & Alerts
  window.addEventListener("load", () => {
    window.UEMAP?.refreshHeatmap?.(API_BASE);
    (async () => {
      try {
        const arr = await getJSON(`${API_BASE}/api/alerts?hours=24`);
        const box = document.getElementById("alertsPanel");
        if (!box) return;
        box.innerHTML = arr.length ? arr.map(a =>
          `<div style="padding:6px;border:1px solid #fff1;border-radius:8px;margin:6px 0">
             <b>Lv.${a.level}</b> · ${a.rule_id} · ${new Date(a.created_at).toLocaleString()}
           </div>`
        ).join("") : "No alerts in the last 24h.";
      } catch {
        const box = document.getElementById("alertsPanel");
        if (box) box.innerHTML = "Failed to load alerts.";
      }
    })();
  });
})();
