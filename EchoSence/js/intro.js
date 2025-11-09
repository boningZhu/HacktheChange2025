// Intro / Home controller: show intro first, then fade to map + UI.
(function () {
  const $ = (s) => document.querySelector(s);

  const intro     = $("#intro");
  const startBtn  = $("#startBtn");
  const skipNext  = $("#skipNext");
  const map       = $("#map");
  const topbar    = $(".topbar");
  const panel     = $(".panel");

  // If user chose to skip, go straight to app
  const skip = localStorage.getItem("ue_started") === "1";

  function showApp() {
    // Hide intro
    intro.classList.add("hidden");
    setTimeout(() => { intro.style.display = "none"; }, 600);

    // Reveal map + UI
    [map, topbar, panel].forEach(el => {
      el.classList.remove("hidden");
      el.classList.add("show");
    });

    // Initial heatmap + alerts after reveal (if helpers exist)
    if (window.API_BASE && window.UEMAP?.refreshHeatmap) {
      window.UEMAP.refreshHeatmap(window.API_BASE);
    }
    if (typeof window.loadAlerts === "function") {
      window.loadAlerts();
    }
  }

  function showIntro() {
    // Keep particles visible beneath intro
    intro.style.display = "grid";
    requestAnimationFrame(() => intro.classList.remove("hidden"));
  }

  // Start button
  startBtn?.addEventListener("click", () => {
    if (skipNext?.checked) localStorage.setItem("ue_started", "1");
    showApp();
  });

  // Allow Enter to start
  window.addEventListener("keydown", (e) => {
    if (intro && !intro.classList.contains("hidden") && e.key === "Enter") {
      startBtn?.click();
    }
  });

  // First paint
  if (skip) {
    // Skip intro immediately
    intro.style.display = "none";
    [map, topbar, panel].forEach(el => el.classList.add("show"));
  } else {
    showIntro();
  }
})();
