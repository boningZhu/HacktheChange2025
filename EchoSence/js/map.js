// map.js — 初始化延后到 intro 隐藏之后
(function () {
  const MAP_CENTER = [51.0447, -114.0719]; // Calgary
  const MAP_ZOOM   = 11;

  let map = null;           // 保存实例
  let heatLayerGroup = null;

  function colorByEmotion(e) {
    if (e === "positive") return "#37d67a";
    if (e === "negative") return "#ff6b6b";
    return "#ffe066"; // neutral
  }

  function makePulseMarker(latlng, emotion, text) {
    const color = colorByEmotion(emotion);
    const marker = L.circleMarker(latlng, {
      radius: 8,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.35
    }).addTo(map);

    if (text) {
      marker.bindPopup(`<b>${emotion}</b><br>${text}`, { closeButton: false });
      marker.on("mouseover", () => marker.openPopup());
    }

    let r = 8, dir = 1;
    const timer = setInterval(() => {
      r += dir * 0.5;
      if (r >= 14) dir = -1;
      if (r <= 8)  dir = 1;
      marker.setRadius(r).setStyle({ fillOpacity: 0.25 + (r - 8) / 24 });
    }, 60);
    setTimeout(() => clearInterval(timer), 180000);
    return marker;
  }

  async function refreshHeatmap(apiBase) {
    if (!map || !heatLayerGroup) return;
    try {
      const res = await fetch(`${apiBase}/api/heatmap?hours=2&precision=6`);
      const arr = await res.json();
      heatLayerGroup.clearLayers();

      arr.forEach((item) => {
        // demo：不解 geohash，先在城市中心附近抖动显示
        const base = [
          MAP_CENTER[0] + (Math.random() - 0.5) * 0.02,
          MAP_CENTER[1] + (Math.random() - 0.5) * 0.02
        ];
        const c = item.avg_sentiment >= 0.15 ? "#37d67a"
              : item.avg_sentiment <= -0.15 ? "#ff6b6b"
              : "#ffe066";
        L.circle(base, {
          radius: Math.max(150, 80 + item.n * 8),
          color: c,
          weight: 1,
          fillColor: c,
          fillOpacity: 0.15
        }).bindTooltip(
          `n: ${item.n}<br>avg: ${item.avg_sentiment.toFixed(2)}<br>neg%: ${(item.neg_ratio*100).toFixed(0)}%<br>risk: ${item.high_risk}`
        ).addTo(heatLayerGroup);
      });
    } catch (e) {
      console.warn("heatmap error", e);
    }
  }

  function addEmotionMarker(latlng, emotion, text) {
    if (!map) return;
    map.setView(latlng, 12, { animate: true });
    return makePulseMarker(latlng, emotion, text);
  }

  function initMap() {
    const el = document.getElementById("map");
    if (!el) {
      console.warn("#map not found");
      return;
    }
    el.style.minHeight = el.style.minHeight || "100vh";

    map = L.map("map", { zoomControl: false, attributionControl: false })
            .setView(MAP_CENTER, MAP_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    heatLayerGroup = L.layerGroup().addTo(map);

    // 确保第一次显示后尺寸正确
    setTimeout(() => map.invalidateSize(true), 50);

    // 导出全局 API
    window.UEMAP = {
      center: MAP_CENTER,
      map,
      addEmotionMarker,
      refreshHeatmap
    };

    // 初始化一次热力（若前端有 API_BASE）
    if (window.API_BASE) {
      refreshHeatmap(window.API_BASE);
    }
  }

  // 监听“开始”事件
  window.addEventListener("ue:start", initMap);

  // 若 intro 被跳过（本地存储 ue_started=1），页面加载后立即初始化
  window.addEventListener("load", () => {
    const skip = localStorage.getItem("ue_started") === "1";
    if (skip) initMap();
  });
})();
