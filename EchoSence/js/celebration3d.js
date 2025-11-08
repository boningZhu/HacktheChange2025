// ===== 3D Celebration Overlay (Three.js) =====
let overlay, renderer, scene, camera, animId;

function palette(emotion) {
  if (emotion === "positive") return [0xffffff, 0x66ffcc, 0x88ff66, 0x33ddaa];
  if (emotion === "negative") return [0xffffff, 0xff6688, 0xff3366, 0xffaa88];
  return [0xffffff, 0xffe066, 0xffffaa, 0xffcc66]; // neutral
}

function makeOverlay() {
  overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:9999; background:radial-gradient(ellipse at center, rgba(0,0,0,.25), rgba(0,0,0,.85));
  `;
  document.body.appendChild(overlay);
}

function setupThree() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  overlay.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 300);

  window.addEventListener("resize", onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function randomInSphere(R) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const r = R * Math.cbrt(Math.random());
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

function makePoints(emotion, shape = "galaxy", N = 4000) {
  const colors = palette(emotion);
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(N * 3);
  const colorAttr = new Float32Array(N * 3);

  let setPos;
  if (shape === "heart") {
    // 3D heart parametric
    setPos = (i) => {
      const t = Math.random() * Math.PI * 2;
      const s = (Math.random() * 2 - 1);
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const z = s * 6;
      return new THREE.Vector3(x * 4, y * 4, z * 4);
    };
  } else if (shape === "xmas") {
    // layered tree
    setPos = (i) => {
      const layer = Math.floor(Math.random() * 6);
      const r = 5 + layer * 6 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const y = -60 + layer * 18 + Math.random() * 6;
      return new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
    };
  } else if (shape === "blossom") {
    setPos = (i) => {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 30;
      const y = (Math.sin(a * 2) * 0.5 + 0.5) * 30 - 15;
      return new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a));
    };
  } else {
    // galaxy (default)
    setPos = (i) => {
      const v = randomInSphere(120);
      // add band
      v.y *= 0.25;
      return v;
    };
  }

  for (let i = 0; i < N; i++) {
    const v = setPos(i);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;

    const c = new THREE.Color(colors[i % colors.length]);
    colorAttr[i * 3] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }

  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.2,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });

  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return pts;
}

function animate(points) {
  let t = 0;
  function loop() {
    animId = requestAnimationFrame(loop);
    t += 0.005;
    points.rotation.y += 0.0035;
    points.rotation.x = Math.sin(t) * 0.2;
    renderer.render(scene, camera);
  }
  loop();
}

function cleanup() {
  cancelAnimationFrame(animId);
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = renderer = scene = camera = null;
}

async function startCelebration3D(emotion = "neutral", ms = 3800, shape = "galaxy") {
  makeOverlay();
  setupThree();
  const pts = makePoints(emotion, shape, 5000);
  animate(pts);
  await new Promise(r => setTimeout(r, ms));
  cleanup();
}

// export
window.startCelebration3D = startCelebration3D;
