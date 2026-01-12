// ================= BASIC =================
console.log("THREE", THREE.REVISION);
const video = document.getElementById("video");

// ================= HAND STATE =================
let handOpenness = 0;
let smoothOpenness = 0;
let handDirX = 0;
let handDirY = 0;

// ================= HELPERS =================
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// ================= MEDIAPIPE =================
const hands = new Hands({
  locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 0,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7,
});

hands.onResults((res) => {
  if (!res.multiHandLandmarks || res.multiHandLandmarks.length === 0) return;

  const h = res.multiHandLandmarks[0];
  const palm = h[0];
  const tips = [4, 8, 12, 16, 20];

  let open = 0;
  for (let i of tips) open += distance(palm, h[i]);
  handOpenness = open / tips.length;

  // direction for evil eye
  handDirX = 0.5 - h[9].x;
  handDirY = 0.5 - h[9].y;
});

// ================= CAMERA (MEDIAPIPE) =================
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
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// ================= PARTICLES =================
const COUNT = 2600;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(COUNT * 3);
const targetPositions = new Float32Array(COUNT * 3);

for (let i = 0; i < COUNT * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 4;
  targetPositions[i] = positions[i];
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

const particleMaterial = new THREE.PointsMaterial({
  color: 0x66ffff,
  size: 0.02,
  transparent: true,
  opacity: 0.85,
});

const particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// ================= COLOR PICKER =================
document.getElementById("color-picker")?.addEventListener("input", (e) => {
  particleMaterial.color.set(e.target.value);
});

// ================= SHAPE GENERATORS =================
function generateSphere() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 1.5;

    targetPositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
    targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    targetPositions[i3 + 2] = r * Math.cos(phi);
  }
}

function generateCuboid() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    targetPositions[i3]     = (Math.random() - 0.5) * 3;
    targetPositions[i3 + 1] = (Math.random() - 0.5) * 3;
    targetPositions[i3 + 2] = (Math.random() - 0.5) * 3;
  }
}

function generateCylinder() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = 1.2;
    const height = (Math.random() - 0.5) * 3;

    targetPositions[i3]     = Math.cos(angle) * radius;
    targetPositions[i3 + 1] = height;
    targetPositions[i3 + 2] = Math.sin(angle) * radius;
  }
}

function generateCone() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const h = Math.random() * 3;
    const angle = Math.random() * Math.PI * 2;
    const radius = (3 - h) * 0.5;

    targetPositions[i3]     = Math.cos(angle) * radius;
    targetPositions[i3 + 1] = h - 1.5;
    targetPositions[i3 + 2] = Math.sin(angle) * radius;
  }
}

// 🔥 THIS IS WHAT BUTTONS CALL
window.changeShape = function (shape) {
  if (shape === "sphere") generateSphere();
  if (shape === "cuboid") generateCuboid();
  if (shape === "cylinder") generateCylinder();
  if (shape === "cone") generateCone();
};

// default shape
generateSphere();

// ================= EVIL EYE (S SHAPE) =================
const sGroup = new THREE.Group();
particleSystem.add(sGroup);

const sCount = 180;
const sGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(sCount * 3);

for (let i = 0; i < sCount; i++) {
  const t = (i / sCount) * Math.PI * 2;
  const x = Math.sin(t);
  const y = Math.sin(2 * t) * 0.6;

  sPos[i * 3]     = x * 0.35;
  sPos[i * 3 + 1] = y * 0.35;
  sPos[i * 3 + 2] = 0;
}

sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
sGroup.add(
  new THREE.Points(
    sGeo,
    new THREE.PointsMaterial({
      color: 0x00aaff,
      size: 0.035,
      transparent: true,
      opacity: 0.95,
    })
  )
);

// ================= ANIMATION =================
function animate() {
  requestAnimationFrame(animate);

  smoothOpenness += (handOpenness - smoothOpenness) * 0.08;
  const scale = THREE.MathUtils.clamp(smoothOpenness * 4, 0.6, 3);

  const posAttr = geometry.attributes.position;
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    posAttr.array[i3]     += (targetPositions[i3]     * scale - posAttr.array[i3])     * 0.05;
    posAttr.array[i3 + 1] += (targetPositions[i3 + 1] * scale - posAttr.array[i3 + 1]) * 0.05;
    posAttr.array[i3 + 2] += (targetPositions[i3 + 2] * scale - posAttr.array[i3 + 2]) * 0.05;
  }
  posAttr.needsUpdate = true;

  const dx = THREE.MathUtils.lerp(0, handDirX, 0.15);
const dy = THREE.MathUtils.lerp(0, handDirY, 0.15);

const len = Math.sqrt(dx * dx + dy * dy) || 1;

// push evil eye to surface of sphere
sGroup.position.set(
  (dx / len) * scale,
  (dy / len) * scale,
  Math.sqrt(Math.max(scale * scale - dx * dx - dy * dy, 0))
);


  renderer.render(scene, camera3D);
}

animate();

// ================= RESPONSIVE =================
window.addEventListener("resize", () => {
  camera3D.aspect = window.innerWidth / window.innerHeight;
  camera3D.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
