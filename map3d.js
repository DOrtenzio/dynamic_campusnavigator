let scene, camera, renderer, campusGroup, pathGroup, markerGroup;
let mapInitialized = false;
let buildingMeshes = {};
let activeIndoorBuilding = null;
let activeIndoorFloor = 1;

let targetRotation = 0;
let currentRotation = 0;
let targetZoom = 1;
let currentZoom = 1;
let targetLookAt = new THREE.Vector3(0, 0, 0);
let currentLookAt = new THREE.Vector3(0, 0, 0);

let targetCamOffset = new THREE.Vector3(38, 38, 38);
let currentCamOffset = new THREE.Vector3(38, 38, 38);
let animFrame;

// Waypoints for navigation
const WAYPOINTS = {
  'A': new THREE.Vector3(0, 0.1, 0),
  'B': new THREE.Vector3(-18, 0.1, 0),
  'C': new THREE.Vector3(18, 0.1, 0),
  'D': new THREE.Vector3(0, 0.1, -16),
  'GYM1': new THREE.Vector3(-18, 0.1, 14),
  'GYM2': new THREE.Vector3(18, 0.1, 14),
  'FIELD': new THREE.Vector3(0, 0.1, 18),
  'CORRIDOR_CENTER': new THREE.Vector3(0, 0.1, 0),
  'CORRIDOR_WEST': new THREE.Vector3(-18, 0.1, 0),
  'CORRIDOR_EAST': new THREE.Vector3(18, 0.1, 0),
  'CORRIDOR_NORTH': new THREE.Vector3(0, 0.1, 14)
};

const FLOOR_HEIGHT = 1.6;

function initMap() {
  if (mapInitialized) return;

  const canvas = document.getElementById('mapCanvas');
  const container = canvas.parentElement;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xFAF6F0); // light sand
  scene.fog = new THREE.FogExp2(0xFAF6F0, 0.008);

  const aspect = container.clientWidth / container.clientHeight;
  const frustum = 28;
  camera = new THREE.OrthographicCamera(
    -frustum * aspect, frustum * aspect,
    frustum, -frustum,
    0.1, 1000
  );
  camera.position.set(38, 38, 38);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.35);
  scene.add(ambientLight);

  const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xFAF6F0, 0.25);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xFFE5C4, 0.6);
  dirLight.position.set(20, 40, 15);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -40;
  dirLight.shadow.camera.right = 40;
  dirLight.shadow.camera.top = 40;
  dirLight.shadow.camera.bottom = -40;
  dirLight.shadow.bias = -0.0008;
  dirLight.shadow.radius = 6.0;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xE6D5B8, 0.2);
  fillLight.position.set(-20, 15, -20);
  scene.add(fillLight);

  campusGroup = new THREE.Group();
  scene.add(campusGroup);

  pathGroup = new THREE.Group();
  scene.add(pathGroup);

  markerGroup = new THREE.Group();
  scene.add(markerGroup);

  buildCampus3D();

  // Create start marker (if startPlace is defined)
  createStartMarker();

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('click', onMapClick);
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  window.addEventListener('resize', onMapResize);

  mapInitialized = true;
  animate();

  setTimeout(() => {
    document.getElementById('mapLoading').classList.add('hidden');
  }, 500);
}

function buildCampus3D() {
  // Ground
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xE8E0D4,
    roughness: 0.95,
    metalness: 0
  });
  const ground = new THREE.Mesh(
    new THREE.BoxGeometry(84, 0.5, 74),
    groundMat
  );
  ground.position.y = -0.25;
  ground.receiveShadow = true;
  campusGroup.add(ground);

  // Pathways
  const corridorMat = new THREE.MeshStandardMaterial({
    color: 0xF5F0E8,
    roughness: 0.8
  });
  const corridors = [
    { w: 38, h: 0.1, d: 1.8, x: 0, z: 0 },
    { w: 1.8, h: 0.1, d: 18, x: 0, z: -8 },
    { w: 1.8, h: 0.1, d: 18, x: 0, z: 9 },
    { w: 1.8, h: 0.1, d: 14, x: -18, z: 7 },
    { w: 1.8, h: 0.1, d: 14, x: 18, z: 7 }
  ];
  corridors.forEach(c => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), corridorMat);
    mesh.position.set(c.x, c.h/2 + 0.01, c.z);
    mesh.receiveShadow = true;
    campusGroup.add(mesh);
  });

  // Buildings
  BUILDINGS.forEach(b => {
    const bGroup = createBuilding3D(b);
    campusGroup.add(bGroup);
  });

  // Trees
  const treePositions = [];
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 72;
    const z = (Math.random() - 0.5) * 62;
    const collision = BUILDINGS.some(b => 
      x > b.x - b.w/2 - 2 && x < b.x + b.w/2 + 2 &&
      z > b.z - b.d/2 - 2 && z < b.z + b.d/2 + 2
    );
    if (!collision) treePositions.push({ x, z });
  }
  const foliageColors = [0x7D9B6E, 0x6B8E5A, 0x8AA77C];
  treePositions.forEach(p => {
    const tree = createStylizedTree(foliageColors[Math.floor(Math.random() * foliageColors.length)]);
    tree.position.set(p.x, 0.05, p.z);
    tree.scale.setScalar(0.7 + Math.random() * 0.5);
    campusGroup.add(tree);
  });
}

function createBuilding3D(b) {
  const bGroup = new THREE.Group();
  bGroup.userData = { buildingId: b.id };

  const color = new THREE.Color(b.color);
  const floors = b.floors || 1;
  const floorGroups = [];

  for (let f = 1; f <= floors; f++) {
    const floorGroup = new THREE.Group();
    floorGroup.position.y = (f - 1) * FLOOR_HEIGHT;

    // Floor slab
    const baseMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 1
    });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, FLOOR_HEIGHT, b.d),
      baseMat
    );
    slab.position.y = FLOOR_HEIGHT / 2;
    slab.castShadow = true;
    slab.receiveShadow = true;
    slab.userData = { type: 'shell', floor: f };
    floorGroup.add(slab);

    // Floor outline (dark line)
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC, roughness: 0.9 });
    const outline = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.04, 0.04, b.d + 0.04),
      lineMat
    );
    outline.position.y = FLOOR_HEIGHT;
    floorGroup.add(outline);

    // Windows (warm glow)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xFFE082,
      roughness: 0.2,
      emissive: 0xFFB300,
      emissiveIntensity: 0.2
    });
    const windowCols = Math.max(2, Math.floor(b.w / 1.3));
    const winW = 0.4, winH = 0.7;
    for (let c = 0; c < windowCols; c++) {
      const offsetX = b.x - b.w/2 + (c + 0.5) * (b.w / windowCols);
      const winFront = new THREE.Mesh(new THREE.BoxGeometry(winW, winH, 0.03), windowMat);
      winFront.position.set(offsetX - b.x, FLOOR_HEIGHT/2, b.d/2 + 0.01);
      floorGroup.add(winFront);
      const winBack = winFront.clone();
      winBack.position.z = -b.d/2 - 0.01;
      floorGroup.add(winBack);
    }

    // Rooms group
    const roomsGroup = new THREE.Group();
    roomsGroup.name = 'rooms';
    roomsGroup.visible = false;
    const floorRooms = ROOMS.filter(r => r.building === b.id && r.floor === f);
    floorRooms.forEach(r => {
      const roomMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(r.color),
        roughness: 0.5,
        metalness: 0.1
      });
      const roomMesh = new THREE.Mesh(
        new THREE.BoxGeometry(r.w, FLOOR_HEIGHT - 0.2, r.d),
        roomMat
      );
      roomMesh.position.set(r.x - b.x, (FLOOR_HEIGHT - 0.2)/2 + 0.05, r.z - b.z);
      roomMesh.castShadow = true;
      roomMesh.receiveShadow = true;
      roomMesh.userData = { type: 'room', roomId: r.id };
      roomsGroup.add(roomMesh);

      // Wall outlines around each room (thin lines)
      const wallMat = new THREE.LineBasicMaterial({ color: 0xBBBBBB });
      const points = [
        new THREE.Vector3(-r.w/2, -0.1, -r.d/2),
        new THREE.Vector3( r.w/2, -0.1, -r.d/2),
        new THREE.Vector3( r.w/2, -0.1,  r.d/2),
        new THREE.Vector3(-r.w/2, -0.1,  r.d/2),
        new THREE.Vector3(-r.w/2, -0.1, -r.d/2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, wallMat);
      line.position.set(r.x - b.x, 0.05, r.z - b.z);
      roomsGroup.add(line);

      // ---- Furniture ----
      if (r.type === 'class' || r.type === 'lab') {
        const furnitureGroup = new THREE.Group();
        furnitureGroup.name = 'furniture';
        // Teacher desk (cattedra)
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x8B5A2B, roughness: 0.8 });
        const desk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), deskMat);
        desk.position.set(0, 0.05, -r.d/2 + 0.3);
        furnitureGroup.add(desk);
        // Benches (banchi)
        const benchMat = new THREE.MeshStandardMaterial({ color: 0xC69C6D, roughness: 0.7 });
        const rows = 3, cols = 4;
        const spacingX = r.w / (cols + 1);
        const spacingZ = (r.d - 0.8) / (rows + 1);
        for (let i = 0; i < rows; i++) {
          for (let j = 0; j < cols; j++) {
            const bx = -r.w/2 + (j+1) * spacingX;
            const bz = -r.d/2 + 0.4 + (i+1) * spacingZ;
            const bench = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.25), benchMat);
            bench.position.set(bx, 0.05, bz);
            furnitureGroup.add(bench);
          }
        }
        roomsGroup.add(furnitureGroup);
      }
    });
    floorGroup.add(roomsGroup);

    bGroup.add(floorGroup);
    floorGroups.push(floorGroup);
  }

  // Roof
  const roofGroup = new THREE.Group();
  roofGroup.position.y = floors * FLOOR_HEIGHT;
  const roofMat = new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.75), roughness: 0.7 });
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(b.w + 0.3, 0.3, b.d + 0.3),
    roofMat
  );
  roof.position.y = 0.15;
  roof.castShadow = true;
  roofGroup.add(roof);
  bGroup.add(roofGroup);

  // Field markings
  if (b.id === 'FIELD') {
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xDDDDDD, roughness: 0.9 });
    const peri = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1, 0.02, 0.1), lineMat);
    peri.position.set(b.x, 0.03, b.z - b.d/2 + 0.5);
    campusGroup.add(peri);
    const peri2 = peri.clone();
    peri2.position.z = b.z + b.d/2 - 0.5;
    campusGroup.add(peri2);
    const peri3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, b.d - 1), lineMat);
    peri3.position.set(b.x - b.w/2 + 0.5, 0.03, b.z);
    campusGroup.add(peri3);
    const peri4 = peri3.clone();
    peri4.position.x = b.x + b.w/2 - 0.5;
    campusGroup.add(peri4);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, b.d - 1), lineMat);
    mid.position.set(b.x, 0.03, b.z);
    campusGroup.add(mid);
    const circle = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 1.7, 24),
      new THREE.MeshStandardMaterial({ color: 0xDDDDDD, side: THREE.DoubleSide })
    );
    circle.rotation.x = -Math.PI/2;
    circle.position.set(b.x, 0.035, b.z);
    campusGroup.add(circle);
  }

  bGroup.position.set(b.x, 0, b.z);
  buildingMeshes[b.id] = {
    group: bGroup,
    floorGroups: floorGroups,
    roofGroup: roofGroup,
    floorsCount: floors,
    baseColor: color,
    w: b.w, d: b.d, x: b.x, z: b.z
  };
  return bGroup;
}

function createStylizedTree(foliageColor) {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8B7A62, roughness: 0.95 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 8), trunkMat);
  trunk.position.y = 0.4;
  trunk.castShadow = true;
  tree.add(trunk);
  const foliageMat = new THREE.MeshStandardMaterial({ color: foliageColor, roughness: 0.95 });
  const foliage = new THREE.Mesh(new THREE.SphereGeometry(0.65, 8, 8), foliageMat);
  foliage.position.y = 1.05;
  foliage.castShadow = true;
  tree.add(foliage);
  return tree;
}

/* =========================================================
   YOU ARE HERE MARKER
   ========================================================= */

function getStartPosition() {
  if (!state || !state.startPlace) return new THREE.Vector3(0, 0.1, 0);
  let pos = new THREE.Vector3(0, 0.1, 0);
  if (state.startPlace.type === 'room') {
    const room = ROOMS.find(r => r.id === state.startPlace.id);
    if (room) pos.set(room.x, room.floor * FLOOR_HEIGHT - 0.2, room.z);
  } else if (state.startPlace.type === 'entrance') {
    const bld = BUILDINGS.find(b => b.id === state.startPlace.id.toUpperCase());
    if (bld) pos.set(bld.x, 0.1, bld.z + bld.d/2 + 0.5);
    else pos.set(0, 0.1, 3.5);
  }
  return pos;
}

function createStartMarker() {
  while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);

  const pos = getStartPosition();
  // Glowing sphere
  const sphereMat = new THREE.MeshStandardMaterial({
    color: 0x4CAF50,
    emissive: 0x4CAF50,
    emissiveIntensity: 0.5
  });
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), sphereMat);
  sphere.position.copy(pos);
  markerGroup.add(sphere);

  // Ring
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x4CAF50,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.6, 32), ringMat);
  ring.rotation.x = -Math.PI/2;
  ring.position.set(pos.x, 0.05, pos.z);
  markerGroup.add(ring);
}

/* =========================================================
   MAP ACTIONS
   ========================================================= */

function zoomMap(dir) {
  targetZoom = Math.max(0.4, Math.min(4.0, targetZoom + dir * 0.4));
}

function rotateMap() {
  targetRotation += Math.PI / 4;
}

function resetMapView() {
  activeIndoorBuilding = null;
  document.getElementById('floorSelector').style.display = 'none';
  targetRotation = 0;
  targetZoom = 1.0;
  targetLookAt.set(0, 0, 0);
  targetCamOffset.set(38, 38, 38);
  Object.entries(buildingMeshes).forEach(([id, m]) => collapseBuilding(id));
  document.querySelectorAll('.bld-switch-btn').forEach(btn => btn.classList.remove('active'));
  const overviewBtn = document.querySelector('.bld-switch-btn[data-bld="overview"]');
  if (overviewBtn) overviewBtn.classList.add('active');
}

function setIndoorBuilding(bldId, floor = 1) {
  const b = BUILDINGS.find(x => x.id === bldId);
  if (!b) return;
  activeIndoorBuilding = bldId;
  activeIndoorFloor = floor;
  targetLookAt.set(b.x, 0, b.z);
  targetZoom = 3.4;
  targetCamOffset.set(15, 38, 15);

  const selector = document.getElementById('floorSelector');
  if (b.floors > 1) {
    selector.style.display = 'flex';
    let html = '';
    for (let f = b.floors; f >= 1; f--) {
      html += `<button class="floor-btn ${f === floor ? 'active' : ''}" onclick="setIndoorFloor(${f})">P${f}</button>`;
    }
    selector.innerHTML = html;
  } else selector.style.display = 'none';

  Object.entries(buildingMeshes).forEach(([id, m]) => {
    if (id === bldId) explodeBuilding(id, floor);
    else collapseBuilding(id);
  });
  document.querySelectorAll('.bld-switch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.bld === bldId);
  });
}

function setIndoorFloor(floor) {
  if (!activeIndoorBuilding) return;
  activeIndoorFloor = floor;
  document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === `P${floor}`);
  });
  explodeBuilding(activeIndoorBuilding, floor);
}

function explodeBuilding(bldId, activeFloor) {
  const m = buildingMeshes[bldId];
  if (!m) return;
  const spacing = 5.2;
  for (let f = 1; f <= m.floorsCount; f++) {
    const fg = m.floorGroups[f - 1];
    const shellMesh = fg.children.find(c => c.userData?.type === 'shell');
    const roomsGroup = fg.children.find(c => c.name === 'rooms');
    let targetY = (f - 1) * FLOOR_HEIGHT;
    if (f > activeFloor) {
      targetY = (f - 1) * FLOOR_HEIGHT + (f - activeFloor) * spacing;
      shellMesh.material.opacity = 0.15;
      shellMesh.material.color.setHex(0xCCCCCC);
      if (roomsGroup) roomsGroup.visible = false;
    } else if (f === activeFloor) {
      targetY = (f - 1) * FLOOR_HEIGHT;
      shellMesh.material.opacity = 0.05;
      shellMesh.material.color.set(m.baseColor);
      if (roomsGroup) roomsGroup.visible = true;
    } else {
      targetY = (f - 1) * FLOOR_HEIGHT - (activeFloor - f) * 1.5;
      shellMesh.material.opacity = 0.15;
      shellMesh.material.color.set(m.baseColor);
      if (roomsGroup) roomsGroup.visible = false;
    }
    fg.userData.targetY = targetY;
  }
  const roofTargetY = m.floorsCount * FLOOR_HEIGHT + (m.floorsCount - activeFloor + 1) * spacing + 1;
  m.roofGroup.userData.targetY = roofTargetY;
}

function collapseBuilding(bldId) {
  const m = buildingMeshes[bldId];
  if (!m) return;
  for (let f = 1; f <= m.floorsCount; f++) {
    const fg = m.floorGroups[f - 1];
    fg.userData.targetY = (f - 1) * FLOOR_HEIGHT;
    const shellMesh = fg.children.find(c => c.userData?.type === 'shell');
    const roomsGroup = fg.children.find(c => c.name === 'rooms');
    shellMesh.material.opacity = 1.0;
    shellMesh.material.color.set(m.baseColor);
    if (roomsGroup) roomsGroup.visible = false;
  }
  m.roofGroup.userData.targetY = m.floorsCount * FLOOR_HEIGHT;
}

/* =========================================================
   3D NAVIGATION PATH (glowing line + arrows)
   ========================================================= */

function draw3DNavigationPath(startObj, endRoom) {
  while (pathGroup.children.length > 0) pathGroup.remove(pathGroup.children[0]);

  if (!startObj || !endRoom) return;

  const points = [];
  let startPos = new THREE.Vector3(0, 0.1, 0);
  let startBldId = 'A';
  if (startObj.type === 'room') {
    const startRoom = ROOMS.find(r => r.id === startObj.id);
    if (startRoom) {
      startPos.set(startRoom.x, startRoom.floor * FLOOR_HEIGHT - 0.2, startRoom.z);
      startBldId = startRoom.building;
    }
  } else if (startObj.type === 'entrance') {
    const bld = BUILDINGS.find(b => b.id === startObj.id.toUpperCase());
    if (bld) {
      startPos.set(bld.x, 0.1, bld.z + bld.d/2 + 0.5);
      startBldId = bld.id;
    } else {
      startPos.set(0, 0.1, 3.5);
      startBldId = 'A';
    }
  }
  points.push(startPos.clone());

  const endBldId = endRoom.building;
  const sameBuilding = (startBldId === endBldId);

  if (!sameBuilding) {
    const startGround = new THREE.Vector3(startPos.x, 0.15, startPos.z);
    points.push(startGround);
    const startBld = BUILDINGS.find(b => b.id === startBldId);
    const startDoor = new THREE.Vector3(startBld.x, 0.1, startBld.z + startBld.d/2 + 0.3);
    points.push(startDoor);
    const wpStart = WAYPOINTS[startBldId] || new THREE.Vector3(startBld.x, 0.1, startBld.z);
    points.push(wpStart.clone());

    if ((startBldId === 'B' && endBldId === 'C') || (startBldId === 'C' && endBldId === 'B')) {
      points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
    } else if (startBldId === 'GYM1' && endBldId === 'C') {
      points.push(WAYPOINTS['CORRIDOR_WEST'].clone());
      points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
    } else if (startBldId === 'GYM2' && endBldId === 'B') {
      points.push(WAYPOINTS['CORRIDOR_EAST'].clone());
      points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
    }
    const wpEnd = WAYPOINTS[endBldId] || new THREE.Vector3(endRoom.x, 0.1, endRoom.z);
    points.push(wpEnd.clone());
    const endBld = BUILDINGS.find(b => b.id === endBldId);
    const endDoor = new THREE.Vector3(endBld.x, 0.1, endBld.z + endBld.d/2 + 0.3);
    points.push(endDoor);
    const endGround = new THREE.Vector3(endRoom.x, 0.15, endRoom.z);
    points.push(endGround);
  } else {
    const verticalPoint = new THREE.Vector3(startPos.x, endRoom.floor * FLOOR_HEIGHT - 0.2, startPos.z);
    points.push(verticalPoint);
  }
  const endPos = new THREE.Vector3(endRoom.x, endRoom.floor * FLOOR_HEIGHT - 0.2, endRoom.z);
  points.push(endPos);

  // Create a smooth curve
  const curve = new THREE.CatmullRomCurve3(points);
  const tubePoints = curve.getPoints(100);
  const tubeGeo = new THREE.BufferGeometry().setFromPoints(tubePoints);
  const tubeMat = new THREE.LineBasicMaterial({ color: 0xD4A373, linewidth: 2 });
  const tubeLine = new THREE.Line(tubeGeo, tubeMat);
  pathGroup.add(tubeLine);

  // Glow overlay (dashed)
  const glowMat = new THREE.LineDashedMaterial({ color: 0xFFD8B0, dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.6 });
  const glowLine = new THREE.Line(tubeGeo.clone(), glowMat);
  glowLine.computeLineDistances();
  pathGroup.add(glowLine);

  // Direction arrows every few points
  const arrowGroup = new THREE.Group();
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xD4A373 });
  for (let i = 0; i < tubePoints.length - 1; i += 10) {
    const p1 = tubePoints[i];
    const p2 = tubePoints[Math.min(i+5, tubePoints.length-1)];
    const dir = new THREE.Vector3().copy(p2).sub(p1).normalize();
    const mid = new THREE.Vector3().copy(p1).add(p2).multiplyScalar(0.5);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 6), arrowMat);
    arrow.position.copy(mid);
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
    arrow.quaternion.copy(quat);
    arrowGroup.add(arrow);
  }
  pathGroup.add(arrowGroup);

  // Animate the glow line
  pathGroup.userData = { time: 0 };

  targetLookAt.copy(startPos);
  targetZoom = 2.0;
}

function clear3DNavigationPath() {
  while (pathGroup.children.length > 0) pathGroup.remove(pathGroup.children[0]);
}

/* =========================================================
   MAP DRAG & ROTATE
   ========================================================= */

let dragStartPos = null;
let dragMoved = false;
let lastPointer = { x: 0, y: 0 };

function onPointerDown(e) {
  dragMoved = false;
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
  dragStartPos = { x: e.clientX, y: e.clientY };
}

function onPointerMove(e) {
  if (!dragStartPos) return;
  const dx = e.clientX - lastPointer.x;
  const dy = e.clientY - lastPointer.y;
  if (Math.abs(e.clientX - dragStartPos.x) > 6 || Math.abs(e.clientY - dragStartPos.y) > 6) {
    dragMoved = true;
  }
  if (e.buttons === 2 || e.buttons === 4) {
    const canvas = renderer.domElement;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const frustum = 28 / currentZoom;
    const screenX = (dx / canvas.clientWidth) * frustum * aspect * 2;
    const screenZ = (dy / canvas.clientHeight) * frustum * 2;
    const cos = Math.cos(currentRotation);
    const sin = Math.sin(currentRotation);
    targetLookAt.x -= (screenX * cos - screenZ * sin);
    targetLookAt.z -= (screenX * sin + screenZ * cos);
  } else {
    targetRotation += dx * 0.005;
  }
  lastPointer.x = e.clientX;
  lastPointer.y = e.clientY;
}

function onPointerUp() {
  dragStartPos = null;
}

function onMapClick(e) {
  if (dragMoved) return;

  const canvas = document.getElementById('mapCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

  const interactables = [];
  Object.entries(buildingMeshes).forEach(([id, m]) => {
    m.floorGroups.forEach(fg => {
      const shell = fg.children.find(c => c.userData?.type === 'shell');
      if (shell) interactables.push(shell);
      const rooms = fg.children.find(c => c.name === 'rooms');
      if (rooms && rooms.visible) {
        rooms.children.forEach(r => {
          if (r.userData?.type === 'room') interactables.push(r);
        });
      }
    });
  });

  const intersects = raycaster.intersectObjects(interactables, false);
  if (intersects.length > 0) {
    const clickedObj = intersects[0].object;
    if (clickedObj.userData?.type === 'shell') {
      const parentBldGroup = clickedObj.parent.parent;
      const bldId = parentBldGroup.userData.buildingId;
      setIndoorBuilding(bldId, clickedObj.userData.floor);
    } else if (clickedObj.userData?.type === 'room') {
      openRoom(clickedObj.userData.roomId);
    }
  }
}

function onMapResize() {
  if (!mapInitialized) return;
  const canvas = document.getElementById('mapCanvas');
  const container = canvas.parentElement;
  const w = container.clientWidth;
  const h = container.clientHeight;
  const aspect = w / h;
  const frustum = 28 / currentZoom;
  camera.left = -frustum * aspect;
  camera.right = frustum * aspect;
  camera.top = frustum;
  camera.bottom = -frustum;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/* =========================================================
   ANIMATION LOOP
   ========================================================= */

function animate() {
  animFrame = requestAnimationFrame(animate);

  currentRotation += (targetRotation - currentRotation) * 0.1;
  currentZoom += (targetZoom - currentZoom) * 0.1;
  currentLookAt.lerp(targetLookAt, 0.1);
  currentCamOffset.lerp(targetCamOffset, 0.1);

  if (campusGroup) campusGroup.rotation.y = currentRotation;
  if (pathGroup) pathGroup.rotation.y = currentRotation;
  if (markerGroup) markerGroup.rotation.y = currentRotation; // keep marker always facing up? Actually we want it fixed, so don't rotate with campus? We'll keep it as child of scene, not campusGroup, so it stays upright.

  camera.position.set(currentCamOffset.x + currentLookAt.x, currentCamOffset.y, currentCamOffset.z + currentLookAt.z);
  camera.lookAt(currentLookAt);

  const container = document.getElementById('mapCanvas')?.parentElement;
  if (container) {
    const aspect = container.clientWidth / container.clientHeight;
    const frustum = 28 / currentZoom;
    camera.left = -frustum * aspect;
    camera.right = frustum * aspect;
    camera.top = frustum;
    camera.bottom = -frustum;
    camera.updateProjectionMatrix();
  }

  // Animate floors
  Object.values(buildingMeshes).forEach(m => {
    m.floorGroups.forEach(fg => {
      if (fg.userData.targetY !== undefined) {
        fg.position.y += (fg.userData.targetY - fg.position.y) * 0.15;
      }
    });
    if (m.roofGroup.userData.targetY !== undefined) {
      m.roofGroup.position.y += (m.roofGroup.userData.targetY - m.roofGroup.position.y) * 0.15;
    }
  });

  // Animate path glow
  if (pathGroup && pathGroup.children.length > 0) {
    const time = Date.now() * 0.002;
    pathGroup.children.forEach(child => {
      if (child.isLine && child.material.dashSize) {
        child.material.opacity = 0.5 + 0.3 * Math.sin(time);
        child.material.dashSize = 0.3 + 0.1 * Math.sin(time * 1.3);
      }
    });
  }

  // Project room labels
  const labelsContainer = document.getElementById('roomLabelsContainer');
  if (labelsContainer) {
    if (activeIndoorBuilding) {
      const m = buildingMeshes[activeIndoorBuilding];
      const fg = m.floorGroups[activeIndoorFloor - 1];
      const roomsGroup = fg.children.find(c => c.name === 'rooms');
      let html = '';
      if (roomsGroup && roomsGroup.visible) {
        const canvas = renderer.domElement;
        roomsGroup.children.forEach(roomMesh => {
          if (roomMesh.userData?.type === 'room') {
            const roomId = roomMesh.userData.roomId;
            const room = ROOMS.find(r => r.id === roomId);
            if (room) {
              const worldPos = new THREE.Vector3();
              roomMesh.getWorldPosition(worldPos);
              worldPos.project(camera);
              const x = (worldPos.x * 0.5 + 0.5) * canvas.clientWidth;
              const y = (worldPos.y * -0.5 + 0.5) * canvas.clientHeight;
              if (worldPos.z <= 1) {
                let labelText = room.id;
                if (room.id.endsWith('SC')) labelText = 'Scale 🛗';
                else if (room.id.endsWith('WC')) labelText = 'Bagno 🚻';
                else if (room.id === 'LIB') labelText = 'Biblioteca 📚';
                else if (room.id === 'AUD') labelText = 'Auditorium 🎭';
                else if (room.id === 'MENSA') labelText = 'Mensa 🍽️';
                else if (room.id === 'LAB-INFO') labelText = 'Lab Info 💻';
                else if (room.id === 'LAB-SCI') labelText = 'Lab Scienze 🔬';
                html += `<div class="room-label" style="left:${x}px; top:${y}px;" onclick="openRoom('${room.id}')">${labelText}</div>`;
              }
            }
          }
        });
      }
      labelsContainer.innerHTML = html;
    } else {
      labelsContainer.innerHTML = '';
    }
  }

  renderer.render(scene, camera);
}