// ================= BASIC =================
console.log("THREE", THREE.REVISION);
const video = document.getElementById("video");

// ================= HAND STATE =================
let handOpenness = 0;
let smoothOpenness = 0;

// Hand direction (for evil eye)
let handDirX = 0;
let handDirY = 0;

// ================= TIME =================
let time = 0;

// ================= HELPERS =================
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ================= MEDIAPIPE =================
const hands = new Hands({
  locateFile: (f) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
});

hands.setOptions({
  maxNumHands: 1, // 🔥 single hand only
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults((res) => {
  const lm = res.multiHandLandmarks;
  if (!lm || lm.length === 0) return;

  const h = lm[0];
  const palm = h[0];
  const tips = [4, 8, 12, 16, 20];

  // ---- OPENNESS ----
  let open = 0;
  for (let i of tips) open += distance(palm, h[i]);
  handOpenness = open / tips.length;

  // ---- DIRECTION (mirror fixed) ----
  handDirX = 0.5 - h[9].x;
  handDirY = 0.5 - h[9].y;
});

// ================= CAMERA =================
const cameraMP = new Camera(video, {
  onFrame: async () => await hands.send({ image: video }),
});
cameraMP.start();

// ================= THREE SCENE =================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);

const camera3D = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera3D.position.z = 6;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ================= MAIN SPHERE =================
const COUNT = 2600;
const geo = new THREE.BufferGeometry();
const pos = new Float32Array(COUNT * 3);

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3;
  const r = 1.5;
  const t = Math.random() * Math.PI * 2;
  const p = Math.acos(2 * Math.random() - 1);

  pos[i3]     = r * Math.sin(p) * Math.cos(t);
  pos[i3 + 1] = r * Math.sin(p) * Math.sin(t);
  pos[i3 + 2] = r * Math.cos(p);
}

geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
const basePos = pos.slice();

const sphere = new THREE.Points(
  geo,
  new THREE.PointsMaterial({
    color: 0x66ffff,
    size: 0.02,
    transparent: true,
    opacity: 0.85,
  })
);
scene.add(sphere);

// ================= EVIL EYE → LETTER S =================
const sGroup = new THREE.Group();
sphere.add(sGroup);

const sCount = 180;
const sGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(sCount * 3);

for (let i = 0; i < sCount; i++) {
  const t = (i / sCount) * Math.PI * 2;

  // Smooth S curve
  const x = Math.sin(t);
  const y = Math.sin(2 * t) * 0.6;

  sPos[i * 3]     = x * 0.35 + (Math.random() - 0.5) * 0.02;
  sPos[i * 3 + 1] = y * 0.35 + (Math.random() - 0.5) * 0.02;
  sPos[i * 3 + 2] = 0;
}

sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));

const sPoints = new THREE.Points(
  sGeo,
  new THREE.PointsMaterial({
    color: 0x00aaff,
    size: 0.035,
    transparent: true,
    opacity: 0.95,
  })
);
sGroup.add(sPoints);

// ================= ANIMATION =================
function animate() {
  requestAnimationFrame(animate);

  // ---- ULTRA SMOOTH BREATHING ----
  smoothOpenness = THREE.MathUtils.lerp(
    smoothOpenness,
    handOpenness,
    0.07
  );

  const scale = THREE.MathUtils.clamp(
    smoothOpenness * 4,
    0.6,
    3.0
  );

  // ---- EVIL EYE DIRECTION ----
  const dx = THREE.MathUtils.lerp(0, handDirX, 0.18);
  const dy = THREE.MathUtils.lerp(0, handDirY, 0.18);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  sGroup.position.set(
    (dx / len) * scale,
    (dy / len) * scale,
    Math.sqrt(Math.max(scale * scale - dx * dx - dy * dy, 0))
  );

  // ---- SPHERE FLOW ----
  time += 0.01;
  const pAttr = geo.attributes.position;

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const ox = basePos[i3];
    const oy = basePos[i3 + 1];
    const oz = basePos[i3 + 2];

    const n = Math.sin(time + ox * 2) * 0.1;
    pAttr.array[i3]     = ox * scale + n;
    pAttr.array[i3 + 1] = oy * scale + n;
    pAttr.array[i3 + 2] = oz * scale + n;
  }

  pAttr.needsUpdate = true;
  renderer.render(scene, camera3D);
}

animate();
