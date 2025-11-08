// Urban Echo Particles (Three.js background)
(function () {
  const UE = { setPaletteByEmotion(){}, setShape(){} };
  window.UELayer = UE;

  const canvas = document.getElementById("scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 2, 0.1, 1000);
  camera.position.set(0, 0, 140);

  const PALETTES = {
    positive: [0x66ff99, 0x66ccff, 0xffff99],
    neutral:  [0xcccccc, 0xa0a0a0, 0xffffff],
    negative: [0xff6b6b, 0xffa07a, 0xffd1dc]
  };
  let palette = PALETTES.neutral;

  const group = new THREE.Group();
  scene.add(group);
  let cloud = null;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }
  const pick = arr => arr[Math.floor(Math.random()*arr.length)];

  function makePoints(positions) {
    const geo = new THREE.BufferGeometry();
    const count = positions.length / 3;
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const colors = new Float32Array(count*3);
    for (let i=0;i<count;i++){
      const c = new THREE.Color(pick(palette));
      colors[i*3+0]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: .95, depthWrite: false });
    return new THREE.Points(geo, mat);
  }

  function buildGalaxy(n=12000){
    const pos=new Float32Array(n*3), arms=5, spin=1.2;
    for(let i=0;i<n;i++){
      const r=Math.random()*80, arm=(i%arms)/arms*Math.PI*2;
      const ang=arm+r*spin*0.02+(Math.random()-0.5)*0.6;
      const x=Math.cos(ang)*r+(Math.random()-0.5)*2;
      const y=(Math.random()-0.5)*6;
      const z=Math.sin(ang)*r+(Math.random()-0.5)*2;
      pos.set([x,y,z], i*3);
    }
    return makePoints(pos);
  }

  function buildChristmasTree(){
    const arr=[];
    for(let i=0;i<10000;i++){
      const h=Math.random()*80, r=(80-h)*0.6, th=Math.random()*Math.PI*2;
      arr.push(Math.cos(th)*r+(Math.random()-0.5)*1.2, h-40, Math.sin(th)*r+(Math.random()-0.5)*1.2);
    }
    for(let t=0;t<1800;t++){
      const h=t*0.045, r=(80-h)*0.62, th=t*0.25;
      arr.push(Math.cos(th)*r, h-40, Math.sin(th)*r);
    }
    for(let i=0;i<700;i++){
      const phi=Math.acos(2*Math.random()-1), th=Math.random()*Math.PI*2, rad=5+Math.random()*2;
      arr.push(Math.sin(phi)*Math.cos(th)*rad, 43+Math.cos(phi)*rad, Math.sin(phi)*Math.sin(th)*rad);
    }
    return makePoints(new Float32Array(arr));
  }

  function buildHeart(n=12000){
    const pos=new Float32Array(n*3); let i=0;
    while(i<n){
      const x=(Math.random()*2-1)*40, y=(Math.random()*2-1)*40, z=(Math.random()*2-1)*40;
      const X=x/35,Y=y/35,Z=z/35;
      const f=Math.pow(X*X+2.25*Y*Y+Z*Z-1,3)-X*X*Z*Z*Z-(9/80)*Y*Y*Z*Z*Z;
      if(f<=0){ pos.set([x,y,z], i*3); i++; }
    }
    return makePoints(pos);
  }

  function buildBlossom(){
    const arr=[];
    for(let i=0;i<9000;i++){
      const x=(Math.random()*2-1)*90, y=Math.pow(Math.random(),1.6)*60-30, z=(Math.random()*2-1)*90;
      arr.push(x,y,z);
    }
    return makePoints(new Float32Array(arr));
  }

  function rebuild(shape){
    if (cloud) { group.remove(cloud); cloud.geometry.dispose(); }
    if (shape === "xmas")      cloud = buildChristmasTree();
    else if (shape === "heart")   cloud = buildHeart();
    else if (shape === "blossom") cloud = buildBlossom();
    else                         cloud = buildGalaxy();
    group.add(cloud);
  }

  // Default by month
  (function initByDate(){
    const d=new Date(), m=d.getMonth()+1, day=d.getDate();
    const s = (m===12) ? "xmas" : (m===2 && day<=14) ? "heart" : (m>=3 && m<=5) ? "blossom" : "galaxy";
    rebuild(s);
  })();

  UE.setPaletteByEmotion = function (emotion) {
    const palettes = { positive: "positive", neutral: "neutral", negative: "negative" };
    palette = PALETTES[palettes[emotion]] || PALETTES.neutral;
    if (cloud?.geometry?.attributes?.color) {
      const colors = cloud.geometry.attributes.color;
      for (let i=0;i<colors.count;i++){
        const c = new THREE.Color(pick(palette));
        colors.setX(i, c.r); colors.setY(i, c.g); colors.setZ(i, c.b);
      }
      colors.needsUpdate = true;
    }
  };
  UE.setShape = function (name) { rebuild(name); };

  const light=new THREE.PointLight(0xffffff,1,0);
  light.position.set(0,50,100); scene.add(light);

  let t=0;
  function animate(){
    resize(); t+=0.003;
    group.rotation.y += 0.0018;
    group.rotation.x  = Math.sin(t)*0.12;
    const s = 1 + Math.sin(t*2)*0.02; group.scale.set(s,s,s);
    renderer.render(scene,camera);
    requestAnimationFrame(animate);
  }
  animate();

  window.addEventListener("mousemove",(e)=>{
    const nx=e.clientX/window.innerWidth-0.5, ny=e.clientY/window.innerHeight-0.5;
    group.rotation.y += nx*0.01; group.rotation.x += -ny*0.01;
  });
  window.addEventListener("resize", resize);
})();
