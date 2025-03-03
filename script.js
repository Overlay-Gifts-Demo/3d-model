// Get elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const jewelrySelect = document.getElementById('jewelrySelect');

// Webcam setup
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
  })
  .catch((err) => {
    console.log('Could not access webcam:', err);
  });

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
renderer.setSize(640, 480);
camera.position.z = 5;

const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 1, 1).normalize();
scene.add(light);

// Store loaded jewelry models
let currentJewelry = null;
const jewelryModels = {};

// Load multiple 3D models
const loader = new THREE.GLTFLoader();
const jewelryPaths = {
  necklace: '/assets/necklace.glb',
  earrings: '/assets/earrings.glb',
  ring: '/assets/ring.glb'
};

Object.entries(jewelryPaths).forEach(([type, path]) => {
  loader.load(path, (gltf) => {
    const model = gltf.scene;
    model.scale.set(0.5, 0.5, 0.5); // Adjust size as needed
    model.visible = false; // Hide until selected
    scene.add(model);
    jewelryModels[type] = model;

    // If this is the initially selected item, show it
    if (type === jewelrySelect.value) {
      model.visible = true;
      currentJewelry = model;
    }
  }, undefined, (error) => {
    console.error(`Error loading ${type}:`, error);
  });
});

// MediaPipe Pose setup
const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`
});
pose.setOptions({ modelComplexity: 1, smoothLandmarks: true });
pose.onResults(onResults);

function onResults(results) {
  if (results.poseLandmarks) {
    // Place jewelry based on body position (e.g., neck for necklace)
    const leftShoulder = results.poseLandmarks[11]; // Left shoulder
    const rightShoulder = results.poseLandmarks[12]; // Right shoulder
    const neckX = (leftShoulder.x + rightShoulder.x) / 2;
    const neckY = (leftShoulder.y + rightShoulder.y) / 2;

    if (currentJewelry) {
      currentJewelry.position.set(
        (neckX - 0.5) * 10,  // Left-right
        -(neckY - 0.5) * 10, // Up-down (inverted for Three.js)
        -5                   // Depth
      );
      currentJewelry.visible = true;
    }
  }
  renderer.render(scene, camera);
}

// Process video feed
const cameraFeed = new Camera(video, {
  onFrame: async () => {
    await pose.send({ image: video });
  },
  width: 640,
  height: 480
});
cameraFeed.start();

// Handle jewelry selection
jewelrySelect.addEventListener('change', (e) => {
  // Hide current jewelry
  if (currentJewelry) {
    currentJewelry.visible = false;
  }
  
  // Show selected jewelry
  const selectedJewelry = jewelryModels[e.target.value];
  if (selectedJewelry) {
    selectedJewelry.visible = true;
    currentJewelry = selectedJewelry;

    // Adjust position based on jewelry type (e.g., ears for earrings, hand for ring)
    if (e.target.value === 'earrings') {
      // Example: Position near ears (simplified, use face landmarks for precision)
      if (results.poseLandmarks) {
        const leftEar = results.poseLandmarks[7]; // Approximate ear position
        currentJewelry.position.set(
          (leftEar.x - 0.5) * 10,
          -(leftEar.y - 0.5) * 10,
          -5
        );
      }
    } else if (e.target.value === 'ring') {
      // Example: Position near hand (simplified, use hand landmarks for precision)
      if (results.poseLandmarks) {
        const leftWrist = results.poseLandmarks[15]; // Left wrist
        currentJewelry.position.set(
          (leftWrist.x - 0.5) * 10,
          -(leftWrist.y - 0.5) * 10,
          -5
        );
      }
    } else { // Necklace
      // Keep default neck position
      if (results.poseLandmarks) {
        const leftShoulder = results.poseLandmarks[11];
        const rightShoulder = results.poseLandmarks[12];
        const neckX = (leftShoulder.x + rightShoulder.x) / 2;
        const neckY = (leftShoulder.y + rightShoulder.y) / 2;
        currentJewelry.position.set(
          (neckX - 0.5) * 10,
          -(neckY - 0.5) * 10,
          -5
        );
      }
    }
  }
});

// Resize canvas if window changes
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});