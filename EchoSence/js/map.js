// ===== Leaflet Map for Urban Echo =====
(function () {
  const MAP_CENTER = [51.0447, -114.0719]; // Calgary
  const MAP_ZOOM   = 11;

  // ensure the container exists and has some size
  const el = document.getElementById("map");
  if (!el) {
    console.warn("#map element not found.");
    return;
  }
  // safety: make sure the div can take space
  el.style.minHeight = el.style.minHeight || "100vh";

  // 1) create map
  const map = L.map("map", {
    zoomControl: false,
    attributionControl: false
  }).setView(MAP_CENTER, MAP_ZOOM);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // 2) colors by emotion
  function colorByEmotion(e) {
    if (e === "positive") return "#37d67a";
    if (e === "negative") return "#ff6b6b";
    return "#ffe066"; // neutral
  }

  // 3) pulse marker (simple animation)
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

    // pulse: grow/shrink radius
    let r = 8, dir = 1;
    const timer = setInterval(() => {
      r += dir * 0.5;
      if (r >= 14) dir = -1;
      if (r <= 8)  dir = 1;
      marker.setRadius(r).setStyle({ fillOpacity: 0.25 + (r - 8) / 24 });
    }, 60);

    // clean up after some time so the map isn't too busy
    setTimeout(() => { clearInterval(timer); }, 180000); // 3 mins
    return marker;
  }

  // 4) expose function for UI
  function addEmotionMarker(latlng, emotion, text) {
    map.setView(latlng, 12, { animate: true });
    return makePulseMarker(latlng, emotion, text);
  }

  // 5) Optional: draw heatmap buckets from backend
  let heatLayerGroup = L.layerGroup().addTo(map);
  async function refreshHeatmap(apiBase) {
    try {
      const res = await fetch(`${apiBase}/api/heatmap?hours=2&precision=6`);
      const arr = await res.json();
      heatLayerGroup.clearLayers();

      arr.forEach((item) => {
        // NOTE: for demo we don't decode geohash on the client.
        // We place approximate circles around the city center with slight jitter.
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

  // 6) export to global — IMPORTANT: expose `map` (no underscore)
  window.UEMAP = {
    center: MAP_CENTER,
    map,                       // <- intro.js expects this
    addEmotionMarker,
    refreshHeatmap
  };

  // If the map was initialized while hidden, fix size after a tick
  // (intro.js also calls invalidateSize after reveal; this is an extra guard)
  setTimeout(() => {
    if (window.getComputedStyle(el).visibility === "hidden" ||
        window.getComputedStyle(el).display === "none" ||
        el.classList.contains("hidden")) {
      // will be made visible by intro.js; do nothing now
    } else {
      map.invalidateSize(true);
    }
  }, 100);
})();
