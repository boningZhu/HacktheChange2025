// intro.js — show intro first, then fade into app (with ue:start event)
(function () {
  const $ = (s) => document.querySelector(s);

  const intro    = $("#intro");
  const startBtn = $("#startBtn");
  const skipNext = $("#skipNext");
  const map      = $("#map");
  const topbar   = $(".topbar");
  const panel    = $(".panel");

  // If user opted to skip, hide intro on load and signal start immediately
  const skip = localStorage.getItem("ue_started") === "1";
  if (skip) {
    intro?.setAttribute("aria-hidden", "true");
    [map, topbar, panel].forEach(el => el?.classList.add("show"));
    // tell map.js it's safe to init now
    window.dispatchEvent(new CustomEvent("ue:start"));
  } else {
    // keep map/panel hidden until Start
    [map, topbar, panel].forEach(el => el?.classList.add("hidden"));
  }

  function revealApp() {
    // hide intro
    intro?.setAttribute("aria-hidden", "true");

    // show main UI
    [map, topbar, panel].forEach(el => {
      el?.classList.remove("hidden");
      el?.classList.add("show");
    });

    // notify listeners (map.js) to initialize the map now
    window.dispatchEvent(new CustomEvent("ue:start"));

    // give the browser a tick, then fix Leaflet size (extra safety)
    setTimeout(() => {
      if (window.UEMAP?.map?.invalidateSize) {
        window.UEMAP.map.invalidateSize(true);
      }
    }, 50);

    // trigger initial data
    if (window.API_BASE && window.UEMAP?.refreshHeatmap) {
      window.UEMAP.refreshHeatmap(window.API_BASE);
    }
    if (typeof window.loadAlerts === "function") {
      window.loadAlerts();
    }
  }

  startBtn?.addEventListener("click", () => {
    if (skipNext?.checked) localStorage.setItem("ue_started", "1");
    revealApp();
  });

  // Enter key to start
  window.addEventListener("keydown", (e) => {
    const hidden = intro?.getAttribute("aria-hidden") === "true";
    if (!hidden && e.key === "Enter") startBtn?.click();
  });
})();
