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

const ENTRANCE_BUILDING_MAP = {
    main: 'A',
    back: 'B',
    gym: 'GYM1',
    field: 'FIELD',
    d: 'D'
};

function resolveEntranceBuildingId(entranceId) {
    if (!entranceId) return 'A';
    const key = String(entranceId).toLowerCase();
    if (ENTRANCE_BUILDING_MAP[key]) return ENTRANCE_BUILDING_MAP[key];
    const upper = String(entranceId).toUpperCase();
    if (typeof BUILDINGS !== 'undefined' && BUILDINGS.find(b => b.id === upper)) return upper;
    return 'A';
}

function clampRoomPosition(relX, relZ, roomW, roomD, buildingW, buildingD) {
    const maxX = buildingW / 2 - roomW / 2 - 0.12;
    const maxZ = buildingD / 2 - roomD / 2 - 0.12;
    return {
        x: Math.max(-maxX, Math.min(maxX, relX)),
        z: Math.max(-maxZ, Math.min(maxZ, relZ))
    };
}

function applyShellMaterial(shellMesh, opacity, baseColor) {
    if (!shellMesh || !shellMesh.material) return;
    shellMesh.material.transparent = opacity < 1;
    shellMesh.material.opacity = opacity;
    shellMesh.material.depthWrite = opacity >= 0.45;
    shellMesh.material.color.set(baseColor);
}

function initMap() {
    if (mapInitialized) return;
    
    const canvas = document.getElementById('mapCanvas');
    const container = canvas.parentElement;
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAF6F0);
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
    
    const corridorMat = new THREE.MeshStandardMaterial({
        color: 0xF5F0E8,
        roughness: 0.8,
        emissive: 0xF0E8DC,
        emissiveIntensity: 0.05
    });
    const borderMat = new THREE.MeshStandardMaterial({ 
        color: 0xD4C5B0,
        roughness: 0.9
    });
    
    const corridors = [
        { w: 38, h: 0.1, d: 2.5, x: 0, z: 0 },
        { w: 2.5, h: 0.1, d: 20, x: 0, z: -8 },
        { w: 2.5, h: 0.1, d: 20, x: 0, z: 9 },
        { w: 2.5, h: 0.1, d: 16, x: -18, z: 7 },
        { w: 2.5, h: 0.1, d: 16, x: 18, z: 7 }
    ];
    
    corridors.forEach(c => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), corridorMat);
        mesh.position.set(c.x, c.h/2 + 0.01, c.z);
        mesh.receiveShadow = true;
        campusGroup.add(mesh);
        
        const border1 = new THREE.Mesh(
            new THREE.BoxGeometry(c.w + 0.2, 0.08, 0.1),
            borderMat
        );
        border1.position.set(c.x, 0.05, c.z - c.d/2);
        border1.receiveShadow = true;
        campusGroup.add(border1);
        
        const border2 = border1.clone();
        border2.position.z = c.z + c.d/2;
        campusGroup.add(border2);
    });
    
    BUILDINGS.forEach(b => {
        const bGroup = createBuilding3D(b);
        campusGroup.add(bGroup);
    });
    
    const fountainGroup = new THREE.Group();
    const fountainBase = new THREE.Mesh(
        new THREE.CylinderGeometry(1.5, 1.8, 0.3, 16),
        new THREE.MeshStandardMaterial({ color: 0xD4C5B0, roughness: 0.4 })
    );
    fountainBase.position.y = 0.15;
    fountainBase.receiveShadow = true;
    fountainBase.castShadow = true;
    fountainGroup.add(fountainBase);
    
    const fountainBowl = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.0, 0.4, 16),
        new THREE.MeshStandardMaterial({ color: 0x58A4B0, roughness: 0.2 })
    );
    fountainBowl.position.y = 0.35;
    fountainBowl.castShadow = true;
    fountainGroup.add(fountainBowl);
    
    const waterJet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.15, 1.2, 8),
        new THREE.MeshStandardMaterial({ 
            color: 0x87CEEB, 
            transparent: true, 
            opacity: 0.7,
            emissive: 0x87CEEB,
            emissiveIntensity: 0.2
        })
    );
    waterJet.position.y = 1.0;
    waterJet.castShadow = true;
    fountainGroup.add(waterJet);
    
    fountainGroup.position.set(0, 0, 0);
    campusGroup.add(fountainGroup);
    
    const benchPositions = [
        { x: -5, z: 5 }, { x: 5, z: 5 },
        { x: -8, z: -3 }, { x: 8, z: -3 }
    ];
    
    benchPositions.forEach(pos => {
        const bench = createBench();
        bench.position.set(pos.x, 0, pos.z);
        bench.rotation.y = Math.random() * Math.PI * 2;
        campusGroup.add(bench);
    });
    
    const lampPositions = [
        { x: -10, z: 0 }, { x: 10, z: 0 },
        { x: 0, z: -12 }, { x: 0, z: 12 }
    ];
    
    lampPositions.forEach(pos => {
        const lamp = createLamp();
        lamp.position.set(pos.x, 0, pos.z);
        campusGroup.add(lamp);
    });
    
    const flowerBedColors = [0xFF6B9D, 0xFFD93D, 0x6BCB77, 0x4D96FF];
    const flowerPositions = [
        { x: -6, z: 8 }, { x: 6, z: 8 },
        { x: -12, z: 5 }, { x: 12, z: 5 }
    ];
    
    flowerPositions.forEach((pos, i) => {
        const bed = new THREE.Mesh(
            new THREE.CircleGeometry(1.2, 16),
            new THREE.MeshStandardMaterial({ 
                color: flowerBedColors[i % flowerBedColors.length],
                roughness: 0.9
            })
        );
        bed.rotation.x = -Math.PI/2;
        bed.position.set(pos.x, 0.05, pos.z);
        bed.receiveShadow = true;
        campusGroup.add(bed);
        
        for (let f = 0; f < 8; f++) {
            const angle = (f / 8) * Math.PI * 2;
            const flower = new THREE.Mesh(
                new THREE.SphereGeometry(0.15, 6, 6),
                new THREE.MeshStandardMaterial({ 
                    color: flowerBedColors[(i + f) % flowerBedColors.length],
                    emissive: flowerBedColors[(i + f) % flowerBedColors.length],
                    emissiveIntensity: 0.1
                })
            );
            flower.position.set(
                pos.x + Math.cos(angle) * 0.6,
                0.15,
                pos.z + Math.sin(angle) * 0.6
            );
            flower.castShadow = true;
            campusGroup.add(flower);
        }
    });
    
    const treePositions = [];
    for (let i = 0; i < 35; i++) {
        const x = (Math.random() - 0.5) * 72;
        const z = (Math.random() - 0.5) * 62;
        
        const collision = BUILDINGS.some(b =>
            x > b.x - b.w/2 - 2 && x < b.x + b.w/2 + 2 &&
            z > b.z - b.d/2 - 2 && z < b.z + b.d/2 + 2
        );
        
        const nearPath = Math.abs(x) < 4 || Math.abs(z) < 4;
        
        if (!collision && !nearPath) {
            treePositions.push({ x, z });
        }
    }
    
    const foliageColors = [0x7D9B6E, 0x6B8E5A, 0x8AA77C, 0x5A7D4E];
    treePositions.forEach(p => {
        const tree = createStylizedTree(foliageColors[Math.floor(Math.random() * foliageColors.length)]);
        tree.position.set(p.x, 0.05, p.z);
        tree.scale.setScalar(0.7 + Math.random() * 0.6);
        campusGroup.add(tree);
    });
}

function createBuilding3D(b) {
    const bGroup = new THREE.Group();
    bGroup.userData = { buildingId: b.id };
    const color = new THREE.Color(b.color);
    const floors = Math.max(1, b.floors || 1);
    
    const style = b.icon || 'wing';
    let roofStyle = 'flat';
    let facadeRoughness = 0.6;
    let windowStyle = 'regular';
    let baseColor = color.clone();
    let windowColor = 0xFFE082;
    let windowEmissive = 0xFFB300;
    let windowEmissiveIntensity = 0.3;
    let hasBalcony = false;
    let hasColumns = false;
    let hasStripe = false;
    
    switch (style) {
        case 'main':
            facadeRoughness = 0.7;
            roofStyle = 'gabled';
            windowColor = 0xFFE082;
            windowEmissive = 0xFFB300;
            windowEmissiveIntensity = 0.3;
            hasColumns = true;
            break;
        case 'wing':
            facadeRoughness = 0.4;
            roofStyle = 'flat';
            windowStyle = 'ribbon';
            windowColor = 0xA8D8EA;
            windowEmissive = 0x4FC3F7;
            windowEmissiveIntensity = 0.2;
            hasBalcony = true;
            break;
        case 'brutalist':
            baseColor = new THREE.Color(0x8B8B8B);
            facadeRoughness = 0.95;
            roofStyle = 'flat';
            windowStyle = 'small';
            windowColor = 0x4A4A4A;
            windowEmissive = 0x333333;
            windowEmissiveIntensity = 0.05;
            hasStripe = true;
            break;
        case 'liberty':
            facadeRoughness = 0.5;
            roofStyle = 'pyramid';
            windowColor = 0xFFD699;
            windowEmissive = 0xFFB347;
            windowEmissiveIntensity = 0.4;
            hasBalcony = true;
            hasColumns = true;
            break;
        case 'industrial':
            baseColor = new THREE.Color(0x6B6B6B);
            facadeRoughness = 0.7;
            roofStyle = 'shed';
            windowStyle = 'ribbon';
            windowColor = 0x87CEEB;
            windowEmissive = 0x4FC3F7;
            windowEmissiveIntensity = 0.15;
            break;
        case 'gym':
            facadeRoughness = 0.5;
            roofStyle = 'gabled';
            windowColor = 0xE8F5E9;
            windowEmissive = 0x81C784;
            windowEmissiveIntensity = 0.2;
            break;
        case 'field':
            facadeRoughness = 0.8;
            roofStyle = 'flat';
            break;
        case 'pavilion':
            facadeRoughness = 0.3;
            roofStyle = 'pyramid';
            windowColor = 0xE8F5E9;
            windowEmissive = 0xA5D6A7;
            windowEmissiveIntensity = 0.3;
            hasColumns = true;
            break;
        default:
            break;
    }
    
    const floorGroups = [];
    
    if (b.id === 'FIELD') {
        const fieldGroup = new THREE.Group();
        fieldGroup.position.set(b.x, 0, b.z);
        
        const grassMat = new THREE.MeshStandardMaterial({
            color: 0x4CAF50,
            roughness: 0.9,
            metalness: 0
        });
        const grass = new THREE.Mesh(
            new THREE.BoxGeometry(b.w, 0.1, b.d),
            grassMat
        );
        grass.position.y = 0.05;
        grass.receiveShadow = true;
        fieldGroup.add(grass);
        
        const lineMatField = new THREE.MeshStandardMaterial({ 
            color: 0xFFFFFF, 
            roughness: 0.9,
            emissive: 0xFFFFFF,
            emissiveIntensity: 0.05
        });
        
        const fieldW = b.w - 2;
        const fieldD = b.d - 2;
        
        const border1 = new THREE.Mesh(
            new THREE.BoxGeometry(fieldW, 0.03, 0.08),
            lineMatField
        );
        border1.position.set(0, 0.08, -fieldD/2);
        fieldGroup.add(border1);
        
        const border2 = border1.clone();
        border2.position.z = fieldD/2;
        fieldGroup.add(border2);
        
        const border3 = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.03, fieldD),
            lineMatField
        );
        border3.position.set(-fieldW/2, 0.08, 0);
        fieldGroup.add(border3);
        
        const border4 = border3.clone();
        border4.position.x = fieldW/2;
        fieldGroup.add(border4);
        
        const centerLine = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.03, fieldD),
            lineMatField
        );
        centerLine.position.set(0, 0.08, 0);
        fieldGroup.add(centerLine);
        
        const centerCircle = new THREE.Mesh(
            new THREE.RingGeometry(1.8, 2.0, 32),
            new THREE.MeshStandardMaterial({ 
                color: 0xFFFFFF, 
                side: THREE.DoubleSide,
                emissive: 0xFFFFFF,
                emissiveIntensity: 0.05
            })
        );
        centerCircle.rotation.x = -Math.PI/2;
        centerCircle.position.set(0, 0.085, 0);
        fieldGroup.add(centerCircle);
        
        const penaltyArea1 = new THREE.Mesh(
            new THREE.BoxGeometry(4, 0.03, 0.08),
            lineMatField
        );
        penaltyArea1.position.set(0, 0.08, -fieldD/2 + 3);
        fieldGroup.add(penaltyArea1);
        
        const penaltyArea2 = penaltyArea1.clone();
        penaltyArea2.position.z = fieldD/2 - 3;
        fieldGroup.add(penaltyArea2);
        
        const goalMat = new THREE.MeshStandardMaterial({
            color: 0xFFFFFF,
            roughness: 0.5,
            metalness: 0.3
        });
        
        const goalDepth = 0.8;
        const goalWidth = 2.4;
        const goalHeight = 0.8;
        
        const goalPositions = [
            { x: -fieldW/2 - 0.3, z: 0, rot: Math.PI/2 },
            { x: fieldW/2 + 0.3, z: 0, rot: -Math.PI/2 }
        ];
        
        goalPositions.forEach(gp => {
            const goalGroup = new THREE.Group();
            
            const backBar = new THREE.Mesh(
                new THREE.BoxGeometry(goalWidth, goalHeight, 0.05),
                goalMat
            );
            backBar.position.set(0, goalHeight/2, 0);
            goalGroup.add(backBar);
            
            const topBar = new THREE.Mesh(
                new THREE.BoxGeometry(goalWidth, 0.05, goalDepth),
                goalMat
            );
            topBar.position.set(0, goalHeight, goalDepth/2);
            goalGroup.add(topBar);
            
            const leftBar = new THREE.Mesh(
                new THREE.BoxGeometry(0.05, goalHeight, goalDepth),
                goalMat
            );
            leftBar.position.set(-goalWidth/2, goalHeight/2, goalDepth/2);
            goalGroup.add(leftBar);
            
            const rightBar = leftBar.clone();
            rightBar.position.x = goalWidth/2;
            goalGroup.add(rightBar);
            
            const netMat = new THREE.MeshStandardMaterial({
                color: 0xCCCCCC,
                transparent: true,
                opacity: 0.3,
                wireframe: true
            });
            
            const net = new THREE.Mesh(
                new THREE.BoxGeometry(goalWidth - 0.05, goalHeight - 0.05, goalDepth - 0.05),
                netMat
            );
            net.position.set(0, goalHeight/2, goalDepth/2);
            goalGroup.add(net);
            
            goalGroup.position.set(gp.x, 0.05, gp.z);
            goalGroup.rotation.y = gp.rot;
            fieldGroup.add(goalGroup);
        });
        
        const cornerFlags = [
            { x: -fieldW/2 - 0.3, z: -fieldD/2 - 0.3 },
            { x: fieldW/2 + 0.3, z: -fieldD/2 - 0.3 },
            { x: -fieldW/2 - 0.3, z: fieldD/2 + 0.3 },
            { x: fieldW/2 + 0.3, z: fieldD/2 + 0.3 }
        ];
        
        cornerFlags.forEach(pos => {
            const flagMat = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
            const flag = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02, 0.02, 0.8, 4),
                new THREE.MeshStandardMaterial({ color: 0xFFFFFF })
            );
            flag.position.set(pos.x, 0.4, pos.z);
            flag.castShadow = true;
            fieldGroup.add(flag);
            
            const flagPole = new THREE.Mesh(
                new THREE.BoxGeometry(0.15, 0.1, 0.05),
                flagMat
            );
            flagPole.position.set(pos.x + 0.15, 0.75, pos.z);
            fieldGroup.add(flagPole);
        });

        const standMat = new THREE.MeshStandardMaterial({
            color: 0x8B8B8B,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const standDepth = 3;
        const standHeight = 2;
        
        const standPositions = [
            { x: 0, z: -fieldD/2 - standDepth/2 - 1, rot: 0 },
            { x: 0, z: fieldD/2 + standDepth/2 + 1, rot: Math.PI }
        ];
        
        standPositions.forEach(sp => {
            const standGroup = new THREE.Group();
            
            const base = new THREE.Mesh(
                new THREE.BoxGeometry(fieldW, standHeight, standDepth),
                standMat
            );
            base.position.set(0, standHeight/2, 0);
            base.castShadow = true;
            base.receiveShadow = true;
            standGroup.add(base);
            
            const rows = 5;
            const rowSpacing = standDepth / rows;
            for (let r = 0; r < rows; r++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(fieldW - 0.5, 0.15, rowSpacing - 0.1),
                    new THREE.MeshStandardMaterial({ 
                        color: 0x9E9E9E,
                        roughness: 0.9 
                    })
                );
                step.position.set(0, (r + 1) * (standHeight / rows), -standDepth/2 + (r + 0.5) * rowSpacing);
                step.castShadow = true;
                standGroup.add(step);
            }
            
            const railingMat = new THREE.MeshStandardMaterial({
                color: 0x666666,
                metalness: 0.5,
                roughness: 0.4
            });
            const railing = new THREE.Mesh(
                new THREE.BoxGeometry(fieldW - 0.2, 0.1, 0.05),
                railingMat
            );
            railing.position.set(0, standHeight + 0.05, -standDepth/2 + 0.025);
            standGroup.add(railing);
            
            standGroup.position.set(sp.x, 0, sp.z);
            standGroup.rotation.y = sp.rot;
            fieldGroup.add(standGroup);
        });
        
        campusGroup.add(fieldGroup);
        
        buildingMeshes[b.id] = {
            group: fieldGroup,
            floorGroups: [],
            roofGroup: new THREE.Group(),
            floorsCount: 1,
            baseColor: new THREE.Color(0x4CAF50),
            w: b.w, d: b.d, x: b.x, z: b.z
        };
        
        return fieldGroup;
    }
    
    for (let f = 1; f <= floors; f++) {
        const floorGroup = new THREE.Group();
        floorGroup.position.y = (f - 1) * FLOOR_HEIGHT;
        
        const baseMat = new THREE.MeshStandardMaterial({
            color: baseColor.clone(),
            roughness: facadeRoughness,
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
        
        if (hasStripe && f % 2 === 0) {
            const stripeMat = new THREE.MeshStandardMaterial({
                color: 0x6B6B6B,
                roughness: 0.9
            });
            const stripe = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + 0.02, 0.08, b.d + 0.02),
                stripeMat
            );
            stripe.position.y = FLOOR_HEIGHT / 2;
            floorGroup.add(stripe);
        }
        
        if (hasColumns) {
            const colMat = new THREE.MeshStandardMaterial({
                color: baseColor.clone().multiplyScalar(0.9),
                roughness: facadeRoughness * 0.8,
                metalness: 0.2
            });
            const colPositions = [
                [-b.w/2 + 0.3, -b.d/2 + 0.3],
                [b.w/2 - 0.3, -b.d/2 + 0.3],
                [-b.w/2 + 0.3, b.d/2 - 0.3],
                [b.w/2 - 0.3, b.d/2 - 0.3]
            ];
            colPositions.forEach(([cx, cz]) => {
                const col = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.15, 0.2, FLOOR_HEIGHT, 8),
                    colMat
                );
                col.position.set(cx, FLOOR_HEIGHT/2, cz);
                col.castShadow = true;
                floorGroup.add(col);
            });
        }
        
        if (hasBalcony && f > 1) {
            const balcMat = new THREE.MeshStandardMaterial({
                color: baseColor.clone().multiplyScalar(1.1),
                roughness: facadeRoughness * 0.7
            });
            const balc = new THREE.Mesh(
                new THREE.BoxGeometry(b.w - 1, 0.08, 0.6),
                balcMat
            );
            balc.position.set(0, 0.04, b.d/2 + 0.3);
            balc.castShadow = true;
            floorGroup.add(balc);
            
            const railMat = new THREE.MeshStandardMaterial({
                color: 0x4A4A4A,
                roughness: 0.5,
                metalness: 0.4
            });
            for (let r = 0; r < 4; r++) {
                const rail = new THREE.Mesh(
                    new THREE.BoxGeometry(0.04, 0.02, 0.6),
                    railMat
                );
                rail.position.set(-b.w/2 + 0.5 + r * ((b.w - 1) / 3), 0.25, b.d/2 + 0.3);
                floorGroup.add(rail);
            }
        }
        
        const corniceMat = new THREE.MeshStandardMaterial({
            color: baseColor.clone().multiplyScalar(0.8),
            roughness: facadeRoughness * 0.8
        });
        const cornice = new THREE.Mesh(
            new THREE.BoxGeometry(b.w + 0.3, 0.15, b.d + 0.3),
            corniceMat
        );
        cornice.position.y = FLOOR_HEIGHT - 0.1;
        cornice.castShadow = true;
        floorGroup.add(cornice);
        
        const baseSlabMat = new THREE.MeshStandardMaterial({ 
            color: 0xEDE7DA, 
            roughness: 0.85 
        });
        const baseSlabMesh = new THREE.Mesh(
            new THREE.BoxGeometry(b.w, 0.08, b.d),
            baseSlabMat
        );
        baseSlabMesh.position.y = 0.04;
        baseSlabMesh.receiveShadow = true;
        baseSlabMesh.userData = { explodeGroup: 'floorDetail' };
        floorGroup.add(baseSlabMesh);
        
        let lineMat = new THREE.MeshStandardMaterial({ 
            color: 0xCCCCCC, 
            roughness: 0.9, 
            transparent: true, 
            opacity: 1 
        });
        const outline = new THREE.Mesh(
            new THREE.BoxGeometry(b.w + 0.04, 0.04, b.d + 0.04),
            lineMat
        );
        outline.position.y = FLOOR_HEIGHT;
        outline.userData = { type: 'shellDetail' };
        floorGroup.add(outline);
        
        const windowGroup = new THREE.Group();
        windowGroup.name = 'windows';
        const windowMat = new THREE.MeshStandardMaterial({
            color: windowColor,
            roughness: 0.2,
            emissive: windowEmissive,
            emissiveIntensity: windowEmissiveIntensity,
            transparent: true,
            opacity: 1
        });
        
        let windowCols = Math.max(2, Math.floor(b.w / 1.3));
        let winW = 0.5, winH = 0.8;
        
        if (windowStyle === 'ribbon') {
            windowCols = Math.max(2, Math.floor(b.w / 0.7));
            winW = 0.7;
            winH = 0.4;
        } else if (windowStyle === 'small') {
            windowCols = Math.max(4, Math.floor(b.w / 0.7));
            winW = 0.2;
            winH = 0.2;
        }
        
        for (let c = 0; c < windowCols; c++) {
            const offsetX = b.x - b.w/2 + (c + 0.5) * (b.w / windowCols);
            
            const winFront = new THREE.Mesh(
                new THREE.BoxGeometry(winW, winH, 0.05), 
                windowMat
            );
            winFront.position.set(offsetX - b.x, FLOOR_HEIGHT/2, b.d/2 + 0.02);
            winFront.castShadow = true;
            windowGroup.add(winFront);
            
            const winBack = winFront.clone();
            winBack.position.z = -b.d/2 - 0.02;
            windowGroup.add(winBack);
            
            if (style === 'brutalist') {
                const concreteFrame = new THREE.MeshStandardMaterial({
                    color: 0x7A7A7A,
                    roughness: 0.9
                });
                const frame = new THREE.Mesh(
                    new THREE.BoxGeometry(winW + 0.15, winH + 0.15, 0.06),
                    concreteFrame
                );
                frame.position.copy(winFront.position);
                frame.position.z -= 0.01;
                windowGroup.add(frame);
            } else {
                const frameMat = new THREE.MeshStandardMaterial({ 
                    color: 0xFFFFFF, 
                    roughness: 0.4 
                });
                const frameFront = new THREE.Mesh(
                    new THREE.BoxGeometry(winW + 0.08, winH + 0.08, 0.03),
                    frameMat
                );
                frameFront.position.copy(winFront.position);
                frameFront.position.z -= 0.03;
                windowGroup.add(frameFront);
                
                const frameBack = frameFront.clone();
                frameBack.position.z = -b.d/2 - 0.03;
                windowGroup.add(frameBack);
            }
        }
        floorGroup.add(windowGroup);
        
        if (f === 1) {
            const entranceMat = new THREE.MeshStandardMaterial({
                color: style === 'brutalist' ? 0x3A3A3A : 0x4A4A4A,
                roughness: style === 'brutalist' ? 0.9 : 0.3,
                metalness: style === 'brutalist' ? 0 : 0.5
            });
            const entrance = new THREE.Mesh(
                new THREE.BoxGeometry(1.2, 1.8, 0.1),
                entranceMat
            );
            entrance.position.set(0, 0.9, b.d/2 + 0.05);
            entrance.castShadow = true;
            floorGroup.add(entrance);
            
            if (style === 'brutalist') {
                const doorFrame = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 2.0, 0.15),
                    new THREE.MeshStandardMaterial({ color: 0x5A5A5A, roughness: 0.9 })
                );
                doorFrame.position.set(0, 1.0, b.d/2 + 0.02);
                floorGroup.add(doorFrame);
            }
            
            for (let s = 0; s < 3; s++) {
                const step = new THREE.Mesh(
                    new THREE.BoxGeometry(1.4, 0.1, 0.3),
                    new THREE.MeshStandardMaterial({ color: style === 'brutalist' ? 0x6A6A6A : 0xD4C5B0 })
                );
                step.position.set(0, 0.05 + s * 0.1, b.d/2 + 0.3 + s * 0.3);
                step.receiveShadow = true;
                step.castShadow = true;
                floorGroup.add(step);
            }
        }
        
        const roomsGroup = new THREE.Group();
        roomsGroup.name = 'rooms';
        roomsGroup.visible = false;
        
        const floorRooms = ROOMS.filter(r => r.building === b.id && r.floor === f);
        floorRooms.forEach(r => {
            const rel = clampRoomPosition(r.x - b.x, r.z - b.z, r.w, r.d, b.w, b.d);
            const roomMat = new THREE.MeshStandardMaterial({
                color: new THREE.Color(r.color),
                roughness: 0.5,
                metalness: 0.1
            });
            const roomMesh = new THREE.Mesh(
                new THREE.BoxGeometry(r.w, FLOOR_HEIGHT - 0.25, r.d),
                roomMat
            );
            roomMesh.position.set(rel.x, (FLOOR_HEIGHT - 0.25) / 2 + 0.08, rel.z);
            roomMesh.castShadow = true;
            roomMesh.receiveShadow = true;
            roomMesh.userData = { type: 'room', roomId: r.id };
            roomsGroup.add(roomMesh);
            
            const wallMat = new THREE.LineBasicMaterial({ color: 0xBBBBBB });
            const points = [
                new THREE.Vector3(-r.w/2, -0.1, -r.d/2),
                new THREE.Vector3(r.w/2, -0.1, -r.d/2),
                new THREE.Vector3(r.w/2, -0.1, r.d/2),
                new THREE.Vector3(-r.w/2, -0.1, r.d/2),
                new THREE.Vector3(-r.w/2, -0.1, -r.d/2)
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, wallMat);
            line.position.set(rel.x, 0.08, rel.z);
            line.userData = { type: 'roomOutline', roomId: r.id };
            roomsGroup.add(line);
            
            if (r.type === 'class' || r.type === 'lab') {
                const furnitureGroup = new THREE.Group();
                furnitureGroup.name = 'furniture';
                
                const deskMat = new THREE.MeshStandardMaterial({ 
                    color: 0x8B5A2B, 
                    roughness: 0.8 
                });
                const desk = new THREE.Mesh(
                    new THREE.BoxGeometry(Math.min(0.55, r.w * 0.35), 0.1, Math.min(0.35, r.d * 0.25)), 
                    deskMat
                );
                desk.position.set(0, 0.05, -r.d/2 + Math.min(0.35, r.d * 0.22));
                desk.castShadow = true;
                furnitureGroup.add(desk);
                
                const benchMat = new THREE.MeshStandardMaterial({ 
                    color: 0xC69C6D, 
                    roughness: 0.7 
                });
                const rows = Math.max(1, Math.min(3, Math.floor((r.d - 0.6) / 0.45)));
                const cols = Math.max(1, Math.min(4, Math.floor((r.w - 0.4) / 0.45)));
                const spacingX = (r.w - 0.4) / (cols + 1);
                const spacingZ = (r.d - 0.7) / (rows + 1);
                
                for (let i = 0; i < rows; i++) {
                    for (let j = 0; j < cols; j++) {
                        const bx = -r.w/2 + 0.2 + (j + 1) * spacingX;
                        const bz = -r.d/2 + 0.35 + (i + 1) * spacingZ;
                        const bench = new THREE.Mesh(
                            new THREE.BoxGeometry(0.28, 0.05, 0.28), 
                            benchMat
                        );
                        bench.position.set(bx, 0.05, bz);
                        bench.castShadow = true;
                        furnitureGroup.add(bench);
                    }
                }
                furnitureGroup.position.set(rel.x, 0, rel.z);
                roomsGroup.add(furnitureGroup);
            }
        });
        floorGroup.add(roomsGroup);
        
        const corridorMat = new THREE.MeshStandardMaterial({
            color: 0xD4C5B0,
            roughness: 0.9
        });
        const corridorWidth = 0.6;
        const corridor = new THREE.Mesh(
            new THREE.BoxGeometry(corridorWidth, 0.02, b.d - 0.4),
            corridorMat
        );
        corridor.position.set(0, 0.06, 0);
        corridor.receiveShadow = true;
        corridor.userData = { explodeGroup: 'floorDetail' };
        floorGroup.add(corridor);

        lineMat = new THREE.LineBasicMaterial({ color: 0xC4B5A0 });
        const corridorPoints = [
            new THREE.Vector3(-corridorWidth/2, 0.07, -b.d/2 + 0.2),
            new THREE.Vector3(-corridorWidth/2, 0.07, b.d/2 - 0.2)
        ];
        const corridorLine1 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(corridorPoints),
            lineMat
        );
        corridorLine1.userData = { explodeGroup: 'floorDetail' };
        floorGroup.add(corridorLine1);

        const corridorPoints2 = [
            new THREE.Vector3(corridorWidth/2, 0.07, -b.d/2 + 0.2),
            new THREE.Vector3(corridorWidth/2, 0.07, b.d/2 - 0.2)
        ];
        const corridorLine2 = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(corridorPoints2),
            lineMat
        );
        corridorLine2.userData = { explodeGroup: 'floorDetail' };
        floorGroup.add(corridorLine2);

        const hasStairsRoom = ROOMS.some(r => r.building === b.id && r.floor === f && r.id.endsWith('SC'));
        if (!hasStairsRoom && f > 1) {
            const stairMat = new THREE.MeshStandardMaterial({ color: 0x95A5A6 });
            const stairGroup = new THREE.Group();
            
            for (let step = 0; step < 6; step++) {
                const stepMesh = new THREE.Mesh(
                    new THREE.BoxGeometry(0.45, 0.02, 0.22),
                    stairMat
                );
                stepMesh.position.set(
                    -b.w/2 + 0.55,
                    step * 0.16,
                    -b.d/2 + 0.75 + (step % 2) * 0.25
                );
                stepMesh.castShadow = true;
                stairGroup.add(stepMesh);
            }
            
            floorGroup.add(stairGroup);
        }

        if (f === 1) {
            const floorIndicator = new THREE.Mesh(
                new THREE.CircleGeometry(0.3, 16),
                new THREE.MeshStandardMaterial({ 
                    color: b.color,
                    transparent: true,
                    opacity: 0.6
                })
            );
            floorIndicator.rotation.x = -Math.PI/2;
            floorIndicator.position.set(b.w/2 - 0.8, 0.08, b.d/2 - 0.8);
            floorIndicator.userData = { explodeGroup: 'floorDetail' };
            floorGroup.add(floorIndicator);
        }
        
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x6B5E4F });
        floorRooms.forEach(r => {
            if (r.type === 'special' && (r.id.endsWith('SC') || r.id.endsWith('WC'))) return;
            const rel = clampRoomPosition(r.x - b.x, r.z - b.z, r.w, r.d, b.w, b.d);
            const door = new THREE.Mesh(
                new THREE.BoxGeometry(0.1, 0.16, 0.45),
                doorMat
            );
            const doorX = rel.x;
            const doorZ = rel.z;
            
            if (Math.abs(doorX) < b.w/3) {
                door.position.set(
                    doorX > 0 ? b.w/2 - 0.05 : -b.w/2 + 0.05,
                    0.08,
                    doorZ
                );
                door.rotation.y = doorX > 0 ? Math.PI/2 : -Math.PI/2;
            } else {
                door.position.set(doorX, 0.08, doorZ > 0 ? -b.d/2 + 0.05 : b.d/2 - 0.05);
            }
            
            door.castShadow = true;
            door.userData = { explodeGroup: 'floorDetail' };
            floorGroup.add(door);
        });
        bGroup.add(floorGroup);
        floorGroups.push(floorGroup);
    }
    
    const roofGroup = new THREE.Group();
    roofGroup.position.y = floors * FLOOR_HEIGHT;
    
    const roofMat = new THREE.MeshStandardMaterial({ 
        color: baseColor.clone().multiplyScalar(0.7), 
        roughness: facadeRoughness * 1.2 
    });
    
    let roofMesh;
    
    switch (roofStyle) {
        case 'gabled': {
            const shape = new THREE.Shape();
            const overhang = 0.3;
            const roofHeight = 0.8;
            shape.moveTo(-b.w/2 - overhang, 0);
            shape.lineTo(0, roofHeight);
            shape.lineTo(b.w/2 + overhang, 0);
            shape.lineTo(-b.w/2 - overhang, 0);
            const extrudeSettings = { depth: b.d + overhang * 2, bevelEnabled: false };
            const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            roofMesh = new THREE.Mesh(roofGeo, roofMat);
            roofMesh.position.set(0, 0, -b.d/2 - overhang);
            roofMesh.castShadow = true;
            roofGroup.add(roofMesh);
            
            const roofTrim = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + overhang * 2 + 0.1, 0.1, b.d + overhang * 2 + 0.1),
                new THREE.MeshStandardMaterial({ color: 0x8B7355 })
            );
            roofTrim.position.y = 0.05;
            roofTrim.castShadow = true;
            roofGroup.add(roofTrim);
            break;
        }
        case 'pyramid': {
            const pyramidGeo = new THREE.ConeGeometry(Math.max(b.w, b.d) * 0.7, 0.8, 4);
            roofMesh = new THREE.Mesh(pyramidGeo, roofMat);
            roofMesh.rotation.y = Math.PI/4;
            roofMesh.position.y = 0.4;
            roofMesh.castShadow = true;
            roofGroup.add(roofMesh);
            
            const roofTrim = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + 0.4, 0.1, b.d + 0.4),
                new THREE.MeshStandardMaterial({ color: 0x8B7355 })
            );
            roofTrim.position.y = 0.05;
            roofTrim.castShadow = true;
            roofGroup.add(roofTrim);
            break;
        }
        case 'shed': {
            const numShelves = 3;
            const shelfMat = new THREE.MeshStandardMaterial({
                color: baseColor.clone().multiplyScalar(0.6),
                roughness: facadeRoughness * 1.3,
                metalness: 0.3
            });
            for (let s = 0; s < numShelves; s++) {
                const shelfWidth = b.w / numShelves;
                const shelfX = -b.w/2 + s * shelfWidth + shelfWidth/2;
                const shelfHeight = 0.2 + (s / numShelves) * 0.4;
                const shelf = new THREE.Mesh(
                    new THREE.BoxGeometry(shelfWidth - 0.1, 0.04, b.d + 0.2),
                    shelfMat
                );
                shelf.position.set(shelfX, shelfHeight, 0);
                shelf.castShadow = true;
                roofGroup.add(shelf);
                
                const supportMat = new THREE.MeshStandardMaterial({
                    color: 0x5A5A5A,
                    roughness: 0.7,
                    metalness: 0.5
                });
                for (let side = -1; side <= 1; side += 2) {
                    const support = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.04, 0.06, shelfHeight, 6),
                        supportMat
                    );
                    support.position.set(shelfX + side * (shelfWidth/2 - 0.2), shelfHeight/2, side * (b.d/2 - 0.2));
                    roofGroup.add(support);
                }
            }
            
            const topMat = new THREE.MeshStandardMaterial({
                color: baseColor.clone().multiplyScalar(0.5),
                roughness: facadeRoughness * 1.5,
                metalness: 0.4
            });
            const top = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + 0.2, 0.06, b.d + 0.2),
                topMat
            );
            top.position.y = 0.5;
            top.castShadow = true;
            roofGroup.add(top);
            break;
        }
        default: {
            roofMesh = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + 0.4, 0.4, b.d + 0.4),
                roofMat
            );
            roofMesh.position.y = 0.2;
            roofMesh.castShadow = true;
            roofGroup.add(roofMesh);
            
            const roofTrim = new THREE.Mesh(
                new THREE.BoxGeometry(b.w + 0.6, 0.1, b.d + 0.6),
                new THREE.MeshStandardMaterial({ color: 0x8B7355 })
            );
            roofTrim.position.y = 0.05;
            roofTrim.castShadow = true;
            roofGroup.add(roofTrim);
            break;
        }
    }
    
    bGroup.add(roofGroup);
    
    bGroup.position.set(b.x, 0, b.z);
    
    buildingMeshes[b.id] = {
        group: bGroup,
        floorGroups: floorGroups,
        roofGroup: roofGroup,
        floorsCount: floors,
        baseColor: baseColor,
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

function createBench() {
    const bench = new THREE.Group();
    
    const woodMat = new THREE.MeshStandardMaterial({ 
        color: 0x8B5A2B, 
        roughness: 0.8 
    });
    const metalMat = new THREE.MeshStandardMaterial({ 
        color: 0x4A4A4A, 
        roughness: 0.5,
        metalness: 0.6
    });
    
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.08, 0.4),
        woodMat
    );
    seat.position.y = 0.4;
    seat.castShadow = true;
    bench.add(seat);
    
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.5, 0.08),
        woodMat
    );
    back.position.set(0, 0.7, -0.16);
    back.rotation.x = -0.1;
    back.castShadow = true;
    bench.add(back);
    
    const legGeo = new THREE.BoxGeometry(0.08, 0.4, 0.3);
    const positions = [
        { x: -0.5, z: 0.15 }, { x: 0.5, z: 0.15 },
        { x: -0.5, z: -0.15 }, { x: 0.5, z: -0.15 }
    ];
    
    positions.forEach(pos => {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(pos.x, 0.2, pos.z);
        leg.castShadow = true;
        bench.add(leg);
    });
    
    return bench;
}

function createLamp() {
    const lamp = new THREE.Group();
    
    const poleMat = new THREE.MeshStandardMaterial({ 
        color: 0x4A4A4A, 
        roughness: 0.4,
        metalness: 0.7
    });
    
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.08, 2.5, 8),
        poleMat
    );
    pole.position.y = 1.25;
    pole.castShadow = true;
    lamp.add(pole);
    
    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.05, 0.08),
        poleMat
    );
    arm.position.set(0.3, 2.4, 0);
    arm.castShadow = true;
    lamp.add(arm);
    
    const lampHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.15, 0.25),
        new THREE.MeshStandardMaterial({ 
            color: 0xFFE082,
            emissive: 0xFFA500,
            emissiveIntensity: 0.4
        })
    );
    lampHead.position.set(0.55, 2.35, 0);
    lampHead.castShadow = true;
    lamp.add(lampHead);
    
    const light = new THREE.PointLight(0xFFA500, 0.5, 5);
    light.position.set(0.55, 2.2, 0);
    lamp.add(light);
    
    return lamp;
}

function getStartPosition() {
    if (!state || !state.startPlace) return new THREE.Vector3(0, 0.1, 0);
    let pos = new THREE.Vector3(0, 0.1, 0);
    if (state.startPlace.type === 'room') {
        const room = ROOMS.find(r => r.id === state.startPlace.id);
        if (room) pos.set(room.x, room.floor * FLOOR_HEIGHT - 0.2, room.z);
    } else if (state.startPlace.type === 'entrance') {
        const bldId = resolveEntranceBuildingId(state.startPlace.id);
        const bld = BUILDINGS.find(b => b.id === bldId);
        if (bld) pos.set(bld.x, 0.1, bld.z + bld.d/2 + 0.5);
        else pos.set(0, 0.1, 3.5);
    }
    return pos;
}

function createStartMarker() {
    while (markerGroup.children.length) markerGroup.remove(markerGroup.children[0]);
    const pos = getStartPosition();
    
    const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x4CAF50,
        emissive: 0x4CAF50,
        emissiveIntensity: 0.5
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), sphereMat);
    sphere.position.copy(pos);
    markerGroup.add(sphere);
    
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
            html += `<button class="floor-btn ${f === floor ? 'active' : ''}" onclick="setIndoorFloor(${f})">F${f}</button>`;
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
        btn.classList.toggle('active', btn.textContent === `F${floor}`);
    });
    explodeBuilding(activeIndoorBuilding, floor);
}

function explodeBuilding(bldId, activeFloor) {
    const m = buildingMeshes[bldId];
    if (!m) return;
    const spacing = 4.8;

    for (let f = 1; f <= m.floorsCount; f++) {
        const fg = m.floorGroups[f - 1];
        const shellMesh = fg.children.find(c => c.userData?.type === 'shell');
        const roomsGroup = fg.children.find(c => c.name === 'rooms');

        fg.children.forEach(child => {
            child.visible = false;
        });

        let targetY;
        if (f > activeFloor) {
            targetY = (f - 1) * FLOOR_HEIGHT + (f - activeFloor) * spacing;
            if (shellMesh) {
                shellMesh.visible = true;
                applyShellMaterial(shellMesh, 0.16, m.baseColor);
            }
        } else if (f === activeFloor) {
            targetY = (f - 1) * FLOOR_HEIGHT;
            if (shellMesh) {
                shellMesh.visible = true;
                applyShellMaterial(shellMesh, 0.08, m.baseColor);
            }
            if (roomsGroup) {
                roomsGroup.visible = true;
                roomsGroup.children.forEach(child => {
                    child.visible = true;
                    if (child.isMesh && child.material) {
                        child.material.transparent = false;
                        child.material.opacity = 1;
                        child.material.depthWrite = true;
                    }
                });
            }
            fg.children.forEach(child => {
                if (child.userData?.explodeGroup === 'floorDetail') child.visible = true;
            });
        } else {
            targetY = (f - 1) * FLOOR_HEIGHT - (activeFloor - f) * 1.4;
            if (shellMesh) {
                shellMesh.visible = true;
                applyShellMaterial(shellMesh, 0.26, m.baseColor);
            }
        }
        fg.userData.targetY = targetY;
    }

    const roofTargetY = m.floorsCount * FLOOR_HEIGHT + Math.max(0, m.floorsCount - activeFloor + 1) * spacing * 0.35;
    m.roofGroup.userData.targetY = roofTargetY;
    m.roofGroup.visible = activeFloor < m.floorsCount;
    m.roofGroup.children.forEach(child => {
        if (child.material) {
            child.material.transparent = true;
            child.material.opacity = 0.2;
            child.material.depthWrite = false;
        }
    });
}

function collapseBuilding(bldId) {
    const m = buildingMeshes[bldId];
    if (!m) return;
    
    for (let f = 1; f <= m.floorsCount; f++) {
        const fg = m.floorGroups[f - 1];
        fg.userData.targetY = (f - 1) * FLOOR_HEIGHT;
        
        fg.children.forEach(child => {
            child.visible = true;
        });
        
        const shellMesh = fg.children.find(c => c.userData?.type === 'shell');
        if (shellMesh) {
            applyShellMaterial(shellMesh, 1, m.baseColor);
        }
        
        const roomsGroup = fg.children.find(c => c.name === 'rooms');
        if (roomsGroup) {
            roomsGroup.visible = false;
            roomsGroup.children.forEach(child => {
                if (child.isMesh && child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                    child.material.depthWrite = true;
                }
            });
        }
    }
    
    m.roofGroup.userData.targetY = m.floorsCount * FLOOR_HEIGHT;
    m.roofGroup.visible = true;
    m.roofGroup.children.forEach(child => {
        if (child.material) {
            child.material.transparent = false;
            child.material.opacity = 1;
            child.material.depthWrite = true;
        }
    });
}

function draw3DNavigationPath(startObj, endRoom) {
    while (pathGroup.children.length > 0) pathGroup.remove(pathGroup.children[0]);
    if (!startObj || !endRoom) return null;
    
    const points = [];
    let startPos = new THREE.Vector3(0, 0.1, 0);
    let startBldId = 'A';
    let startLabel = 'Starting point';
    
    if (startObj.type === 'room') {
        const startRoom = ROOMS.find(r => r.id === startObj.id);
        if (startRoom) {
            startPos.set(startRoom.x, startRoom.floor * FLOOR_HEIGHT - 0.2, startRoom.z);
            startBldId = startRoom.building;
            startLabel = startRoom.name;
        }
    } else if (startObj.type === 'entrance') {
        const bldId = resolveEntranceBuildingId(startObj.id);
        const bld = BUILDINGS.find(b => b.id === bldId);
        if (bld) {
            startPos.set(bld.x, 0.1, bld.z + bld.d/2 + 0.5);
            startBldId = bld.id;
            startLabel = 'Entrance ' + bld.name;
        } else {
            startPos.set(0, 0.1, 3.5);
            startBldId = 'A';
            startLabel = 'Main entrance';
        }
    }
    
    points.push(startPos.clone());
    
    const endBldId = endRoom.building;
    const endBldData = BUILDINGS.find(b => b.id === endBldId);
    const startBldData = BUILDINGS.find(b => b.id === startBldId);
    const sameBuilding = (startBldId === endBldId);
    let viaCorridor = null;
    
    if (!sameBuilding) {
        const startGround = new THREE.Vector3(startPos.x, 0.15, startPos.z);
        points.push(startGround);
        
        const startBld = startBldData;
        const startDoor = new THREE.Vector3(startBld.x, 0.1, startBld.z + startBld.d/2 + 0.3);
        points.push(startDoor);
        
        const wpStart = WAYPOINTS[startBldId] || new THREE.Vector3(startBld.x, 0.1, startBld.z);
        points.push(wpStart.clone());
        
        if ((startBldId === 'B' && endBldId === 'C') || (startBldId === 'C' && endBldId === 'B')) {
            points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
            viaCorridor = 'the central corridor';
        } else if (startBldId === 'GYM1' && endBldId === 'C') {
            points.push(WAYPOINTS['CORRIDOR_WEST'].clone());
            points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
            viaCorridor = 'the west corridor and then the central one';
        } else if (startBldId === 'GYM2' && endBldId === 'B') {
            points.push(WAYPOINTS['CORRIDOR_EAST'].clone());
            points.push(WAYPOINTS['CORRIDOR_CENTER'].clone());
            viaCorridor = 'the east corridor and then the central one';
        }
        
        const wpEnd = WAYPOINTS[endBldId] || new THREE.Vector3(endRoom.x, 0.1, endRoom.z);
        points.push(wpEnd.clone());
        
        const endBld = endBldData;
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
    
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
        totalLength += points[i].distanceTo(points[i - 1]);
    }
    
    const curve = new THREE.CatmullRomCurve3(points);
    const tubePoints = curve.getPoints(200);
    
    const pathCurve = new THREE.CatmullRomCurve3(points);
    const tubeGeometry = new THREE.TubeGeometry(pathCurve, 100, 0.15, 8, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF6B35,
        emissive: 0xFF4500,
        emissiveIntensity: 0.4,
        roughness: 0.3,
        metalness: 0.1,
        transparent: true,
        opacity: 0.9
    });
    const pathTube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    pathTube.castShadow = true;
    pathGroup.add(pathTube);
    
    const glowGeometry = new THREE.TubeGeometry(pathCurve, 100, 0.25, 8, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFA500,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
    });
    const glowTube = new THREE.Mesh(glowGeometry, glowMaterial);
    pathGroup.add(glowTube);
    
    const tubeGeo = new THREE.BufferGeometry().setFromPoints(tubePoints);
    const tubeMat = new THREE.LineBasicMaterial({ 
        color: 0xFFD700, 
        linewidth: 3,
        transparent: true,
        opacity: 0.9
    });
    const tubeLine = new THREE.Line(tubeGeo, tubeMat);
    pathGroup.add(tubeLine);
    
    const arrowGroup = new THREE.Group();
    const arrowMat = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF,
        emissive: 0xFFA500,
        emissiveIntensity: 0.5
    });
    
    for (let i = 0; i < tubePoints.length - 1; i += 8) {
        const p1 = tubePoints[i];
        const p2 = tubePoints[Math.min(i+10, tubePoints.length-1)];
        const dir = new THREE.Vector3().copy(p2).sub(p1).normalize();
        const mid = new THREE.Vector3().copy(p1).add(p2).multiplyScalar(0.5);
        
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.25, 0.7, 8), 
            arrowMat
        );
        arrow.position.copy(mid);
        arrow.position.y += 0.35;
        
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        arrow.quaternion.copy(quat);
        arrow.castShadow = true;
        arrowGroup.add(arrow);
    }
    pathGroup.add(arrowGroup);
    
    const markerGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF3300,
        emissive: 0xFF6600,
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(startPos);
    marker.position.y += 0.4;
    marker.castShadow = true;
    marker.userData = { 
        isMarker: true, 
        curve: pathCurve, 
        progress: 0, 
        speed: 0.0003 
    };
    pathGroup.add(marker);
    
    const ringGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xFF6600,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI/2;
    ring.position.copy(startPos);
    ring.position.y += 0.05;
    ring.userData = { isRing: true };
    pathGroup.add(ring);
    
    pathGroup.userData = { time: 0, marker: marker, ring: ring };
    
    targetLookAt.copy(startPos);
    targetZoom = 2.5;
    
    return {
        totalLength,
        sameBuilding,
        startLabel,
        startBldId,
        startBldData,
        endBldId,
        endBldData,
        viaCorridor,
        endRoom
    };
}

function buildNavigationSteps(route) {
    if (!route) return [];
    const steps = [];
    const destLabel = route.endRoom.name;
    const destFloor = route.endRoom.floor;
    
    if (route.sameBuilding) {
        steps.push(`You are already in ${route.endBldData.name}: no need to go outside.`);
        if (destFloor && destFloor !== 0) {
            steps.push(`Reach floor ${destFloor} using the nearest stairs.`);
        }
        steps.push(`Follow the dotted line to "${destLabel}".`);
    } else {
        steps.push(`Exit from ${route.startLabel}.`);
        steps.push(`Head towards ${route.endBldData.name}${route.viaCorridor ? ', passing through ' + route.viaCorridor : ''}.`);
        steps.push(`Enter ${route.endBldData.name}.`);
        if (destFloor && destFloor !== 0) {
            steps.push(`Go up to floor ${destFloor} using the stairs.`);
        }
        steps.push(`Follow the dotted line to "${destLabel}".`);
    }
    return steps;
}

function clear3DNavigationPath() {
    while (pathGroup.children.length > 0) pathGroup.remove(pathGroup.children[0]);
}

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

function animate() {
    animFrame = requestAnimationFrame(animate);
    
    currentRotation += (targetRotation - currentRotation) * 0.1;
    currentZoom += (targetZoom - currentZoom) * 0.1;
    currentLookAt.lerp(targetLookAt, 0.1);
    currentCamOffset.lerp(targetCamOffset, 0.1);
    
    if (campusGroup) campusGroup.rotation.y = currentRotation;
    if (pathGroup) pathGroup.rotation.y = currentRotation;
    if (markerGroup) markerGroup.rotation.y = currentRotation;
    
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
    
    if (pathGroup && pathGroup.children.length > 0) {
        const time = Date.now() * 0.002;
        pathGroup.userData.time = time;
        
        pathGroup.children.forEach(child => {
            if (child.isMesh && child.material.transparent && !child.userData.isMarker) {
                child.material.opacity = 0.3 + 0.15 * Math.sin(time * 1.5);
            }
            
            if (child.userData.isMarker) {
                child.userData.progress += child.userData.speed;
                if (child.userData.progress > 1) child.userData.progress = 0;
                
                const position = child.userData.curve.getPoint(child.userData.progress);
                child.position.lerp(new THREE.Vector3(position.x, position.y + 0.4, position.z), 0.1);
                
                const scale = 1 + 0.15 * Math.sin(time * 3);
                child.scale.setScalar(scale);
            }
            
            if (child.userData.isRing) {
                const marker = pathGroup.children.find(c => c.userData.isMarker);
                if (marker) {
                    child.position.x = marker.position.x;
                    child.position.z = marker.position.z;
                    child.scale.setScalar(1 + 0.2 * Math.sin(time * 2));
                    child.material.opacity = 0.4 + 0.2 * Math.sin(time * 2);
                }
            }
        });
    }
    
    const labelsContainer = document.getElementById('roomLabelsContainer');
    if (labelsContainer) {
        if (activeIndoorBuilding) {
            const m = buildingMeshes[activeIndoorBuilding];
            const fg = m.floorGroups[activeIndoorFloor - 1];
            const roomsGroup = fg.children.find(c => c.name === 'rooms');
            const seenIds = new Set();
            
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
                            if (worldPos.z <= 1) {
                                const x = (worldPos.x * 0.5 + 0.5) * canvas.clientWidth;
                                const y = (worldPos.y * -0.5 + 0.5) * canvas.clientHeight;
                                
                                let labelText = room.id;
                                if (room.id.endsWith('SC')) labelText = 'Stairs 🛗';
                                else if (room.id.endsWith('WC')) labelText = 'Restroom 🚻';
                                else if (room.id === 'LIB') labelText = 'Library 📚';
                                else if (room.id === 'AUD') labelText = 'Auditorium 🎭';
                                else if (room.id === 'MENSA') labelText = 'Cafeteria 🍽️';
                                else if (room.id === 'LAB-INFO') labelText = 'Lab Info 💻';
                                else if (room.id === 'LAB-SCI') labelText = 'Lab Science 🔬';
                                
                                seenIds.add(roomId);
                                let el = labelsContainer.querySelector(`[data-room-id="${roomId}"]`);
                                if (!el) {
                                    el = document.createElement('div');
                                    el.className = 'room-label';
                                    el.dataset.roomId = roomId;
                                    el.addEventListener('click', () => openRoom(roomId));
                                    labelsContainer.appendChild(el);
                                }
                                if (el.textContent !== labelText) el.textContent = labelText;
                                el.style.left = x + 'px';
                                el.style.top = y + 'px';
                                el.style.display = 'block';
                            }
                        }
                    }
                });
            }
            
            labelsContainer.querySelectorAll('.room-label').forEach(el => {
                if (!seenIds.has(el.dataset.roomId)) el.remove();
            });
        } else {
            if (labelsContainer.children.length) labelsContainer.innerHTML = '';
        }
    }
    
    renderer.render(scene, camera);
}