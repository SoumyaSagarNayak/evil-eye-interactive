// ================= BASIC =================
console.log("THREE", THREE.REVISION);
const video = document.getElementById("video");

// ================= HAND STATE =================
let handOpenness = 0;
let smoothOpenness = 0;
let handDirX = 0;
let handDirY = 0;
let handDetected = false;

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
  if (!res.multiHandLandmarks || res.multiHandLandmarks.length === 0) {
    handDetected = false;
    return;
  }

  handDetected = true;
  const h = res.multiHandLandmarks[0];
  const palm = h[0];
  const tips = [4, 8, 12, 16, 20];

  let open = 0;
  for (let i of tips) open += distance(palm, h[i]);
  handOpenness = open / tips.length;

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
  color: localStorage.getItem("color") || "#66ffff",
  size: 0.02,
  transparent: true,
  opacity: 0.85,
});

const particleSystem = new THREE.Points(geometry, particleMaterial);
scene.add(particleSystem);

// ================= COLOR PICKER (MEMORY) =================
const colorPicker = document.getElementById("color-picker");
if (colorPicker) {
  colorPicker.value = particleMaterial.color.getStyle();
  colorPicker.addEventListener("input", (e) => {
    particleMaterial.color.set(e.target.value);
    localStorage.setItem("color", e.target.value);
  });
}

// ================= SHAPES =================
function generateSphere() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = 1.5;
    targetPositions[i3] = r * Math.sin(phi) * Math.cos(theta);
    targetPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    targetPositions[i3 + 2] = r * Math.cos(phi);
  }
}

function generateCuboid() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    targetPositions[i3] = (Math.random() - 0.5) * 3;
    targetPositions[i3 + 1] = (Math.random() - 0.5) * 3;
    targetPositions[i3 + 2] = (Math.random() - 0.5) * 3;
  }
}

function generateCylinder() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const a = Math.random() * Math.PI * 2;
    targetPositions[i3] = Math.cos(a) * 1.2;
    targetPositions[i3 + 1] = (Math.random() - 0.5) * 3;
    targetPositions[i3 + 2] = Math.sin(a) * 1.2;
  }
}

function generateCone() {
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    const h = Math.random() * 3;
    const a = Math.random() * Math.PI * 2;
    const r = (3 - h) * 0.5;
    targetPositions[i3] = Math.cos(a) * r;
    targetPositions[i3 + 1] = h - 1.5;
    targetPositions[i3 + 2] = Math.sin(a) * r;
  }
}

window.changeShape = function (shape) {
  localStorage.setItem("shape", shape);
  if (shape === "sphere") generateSphere();
  if (shape === "cuboid") generateCuboid();
  if (shape === "cylinder") generateCylinder();
  if (shape === "cone") generateCone();
};

// restore shape
const savedShape = localStorage.getItem("shape") || "sphere";
changeShape(savedShape);

// ================= EVIL EYE =================
const sGroup = new THREE.Group();
particleSystem.add(sGroup);

const sGeo = new THREE.BufferGeometry();
const sPos = new Float32Array(180 * 3);

for (let i = 0; i < 180; i++) {
  const t = (i / 180) * Math.PI * 2;
  sPos[i * 3] = Math.sin(t) * 0.35;
  sPos[i * 3 + 1] = Math.sin(2 * t) * 0.2;
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

// ================= RECORDING MODE =================
const recordBtn = document.getElementById("recordBtn");
let isRecording = false;

if (recordBtn) {
  recordBtn.onclick = () => {
    if (isRecording) return; // prevent double click

    isRecording = true;

    // 🔴 UI FEEDBACK
    recordBtn.innerText = "⏺ Recording...";
    recordBtn.style.background = "red";
    recordBtn.style.color = "white";

    const stream = renderer.domElement.captureStream(60);
    const recorder = new MediaRecorder(stream);
    const chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "hand-particle-demo.webm";
      a.click();

      URL.revokeObjectURL(url);

      // 🟢 RESET UI
      isRecording = false;
      recordBtn.innerText = "⏺ Record 10s";
      recordBtn.style.background = "";
      recordBtn.style.color = "";
    };

    recorder.start();

    // ⏱ Stop after 10 seconds
    setTimeout(() => recorder.stop(), 10000);
  };
}


// ================= ANIMATION =================
function animate() {
  requestAnimationFrame(animate);

  if (!handDetected) {
    handOpenness += (0.5 - handOpenness) * 0.02;
  }

  smoothOpenness += (handOpenness - smoothOpenness) * 0.08;
  const scale = THREE.MathUtils.clamp(smoothOpenness * 4, 0.6, 3);

  const posAttr = geometry.attributes.position;
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    posAttr.array[i3] += (targetPositions[i3] * scale - posAttr.array[i3]) * 0.05;
    posAttr.array[i3 + 1] += (targetPositions[i3 + 1] * scale - posAttr.array[i3 + 1]) * 0.05;
    posAttr.array[i3 + 2] += (targetPositions[i3 + 2] * scale - posAttr.array[i3 + 2]) * 0.05;
  }
  posAttr.needsUpdate = true;

  const dx = handDirX;
  const dy = handDirY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  sGroup.position.set(
    (dx / len) * scale,
    (dy / len) * scale,
    0
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
