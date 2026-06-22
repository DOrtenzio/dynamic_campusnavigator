# Technical Reference & Customization Guide — Navi^FROM^gate

Navi^FROM^gate is an interactive client-side 3D Campus Navigator built using vanilla web technologies. This document serves as a technical manual for configuring, extending, and deploying the system.

---

## 1. Directory Structure & Architecture

The application is structured into five modular components loaded sequentially via standard `<script>` tags in `index.html`:

```
Navi^FROM^gate/
├── index.html     # Semantic layout frames, modals, and container overlays
├── styles.css     # Dark claymorphic design tokens and responsive media queries
├── data.js        # Config arrays for buildings, rooms, teachers, and classes
├── map3d.js       # WebGL scene manager, exploder animator, and path drawers
├── app.js         # State controller, event routers, and search autocomplete logic
└── README.md      # This technical documentation
```

### Script Execution Sequence
In `index.html`, the files are loaded in this order:
1. `data.js`: Registers the world database in the global `window` namespace.
2. `map3d.js`: Declares scene hooks and binds event triggers.
3. `app.js`: Binds browser DOM elements, initializes routers, and sets the onboarding state.

---

## 2. 3D WebGL Scene Engine (`map3d.js`)

The engine is built on **Three.js (r128)**. It uses a custom lighting model, an orthographic camera, and real-time screen projection to overlay HTML panels on WebGL meshes.

### A. Orthographic Camera & Steep Tilt Angles
Unlike perspective projection, `THREE.OrthographicCamera` renders meshes with parallel projection lines, preserving isometric proportions regardless of distance. 

```javascript
camera = new THREE.OrthographicCamera(
  -frustum * aspect, frustum * aspect,
  frustum, -frustum,
  0.1, 1000
);
```

To optimize visibility inside rooms during building focus:
* **Overview Mode**: The camera offset vector is set to a standard isometric angle `(38, 38, 38)`.
* **Indoor Mode**: The camera offset vector shifts to `(15, 38, 15)`. This elevates the camera angle (steeper tilt), letting you peer directly down into the interior room partitions.
* **Camera Lerping**: Both the target offset (`targetCamOffset`) and target focus point (`targetLookAt`) interpolate smoothly using linear interpolation inside the frame loop:
  ```javascript
  currentCamOffset.lerp(targetCamOffset, 0.1);
  camera.position.set(currentCamOffset.x + currentLookAt.x, currentCamOffset.y, currentCamOffset.z + currentLookAt.z);
  ```

### B. 3D-to-2D Coordinate Projections
To display room numbers and icons (like stairs or toilets) on top of the 3D map, `map3d.js` projects the 3D world coordinates of room meshes into 2D CSS pixel coordinates.

Inside the `animate()` loop:
1. The world coordinates of each room mesh are calculated:
   ```javascript
   roomMesh.getWorldPosition(worldPos);
   ```
2. The world position is projected using the camera's projection matrix, transforming it into Normalized Device Coordinates (NDC) ranging from `[-1, 1]` on both axes:
   ```javascript
   worldPos.project(camera);
   ```
3. NDCs are mapped to the canvas container's pixel dimensions:
   ```javascript
   const x = (worldPos.x * 0.5 + 0.5) * canvas.clientWidth;
   const y = (worldPos.y * -0.5 + 0.5) * canvas.clientHeight;
   ```
4. Absolute HTML pill badges are dynamically injected into `#roomLabelsContainer` at the calculated `(x, y)` coordinates.

### C. Exploded Floor Stack Animation
Instead of generating a single building mesh, `createBuilding3D` creates separate stacked `THREE.Group` groups for each floor.

When a building is focused, `explodeBuilding(bldId, activeFloor)` calculates vertical offsets:
* Floors **above** the selected floor slide up using a positive offset: `targetY = (f - 1) * FLOOR_HEIGHT + (f - activeFloor) * spacing`. Their outer shells are made semi-transparent (`opacity: 0.15`) and their interior rooms are hidden.
* The **active** floor stays at its normal height. Its outer shell becomes almost transparent (`opacity: 0.05`), and its interior room blocks are made visible.
* Floors **below** the active floor slide down slightly.
* These values are interpolated smoothly on every render frame.

### D. 3D Navigation Pathing
Paths are calculated using segment nodes defined in `WAYPOINTS`. When a route is triggered:
1. The algorithm joins the starting point (e.g. entrance coordinates or room column) to the nearest outdoor pathway segment.
2. It traverses the path network to the destination building's door.
3. It climbs vertically inside the building center to the destination floor height, ending at the room's mesh coordinate.
4. Small sphere meshes are distributed at intervals of `0.8` units along the segments.
5. An wave animation modulates their scales and opacities in the render loop to create a glowing flow effect.

### E. Pointer Drag: Pan vs. Rotate
To allow manual camera control, the drag action adjusts camera targets:
* **Rotate** (Left Click / Touch drag): Updates `targetRotation += dx * 0.005`.
* **Pan** (Right Click / Middle Click scroll drag): Translates the target camera focus (`targetLookAt`) along the camera's rotated horizon axes:
  ```javascript
  const cos = Math.cos(currentRotation);
  const sin = Math.sin(currentRotation);
  targetLookAt.x -= (screenX * cos - screenZ * sin);
  targetLookAt.z -= (screenX * sin + screenZ * cos);
  ```

---

## 3. Customizing the World Database (`data.js`)

All details are configured in `data.js`. Use the following tables to structure your modifications:

### Buildings Layout
Customize buildings by editing the `BUILDINGS` array:
* `w` (Width) & `d` (Depth) dictate the 3D slab box sizes.
* `x` & `z` dictate coordinates on the ground plane.
* `floors` sets the vertical stacks count.

### Room & Asset Generation
Rooms are registered in the global `ROOMS` array. To represent vertical paths, restrooms, or science labs, set the `type` parameter:
* `class`: Rendered as a light pastel blue room (`0x93B5C6`).
* `lab`: Rendered as a soft pastel green room (`0x7FA37F`).
* `office`: Rendered as a sand colored room (`0xC9A868`).
* `special`: Used for custom assets. 
  * If ID ends with `SC` (e.g. `A-1SC`), it is labeled as a Staircase/Elevator (`Scale 🛗`) and colored grey (`0x95A5A6`).
  * If ID ends with `WC` (e.g. `A-1WC`), it is labeled as a Toilet (`Bagno 🚻`) and colored pink (`0xE8B4B8`).

---

## 4. UI Design System (`styles.css` & `app.js`)

### Dark Claymorphism Tokens
We implement a tactile, puffed-up look using dark claymorphism variables:
```css
:root {
  --bg-primary: #171720;      /* Dark slate matte background */
  --bg-white: #242430;        /* Card surface */
  --clay-shadow-outer: 8px 12px 28px rgba(0, 0, 0, 0.5), 
                         -4px -4px 16px rgba(255, 255, 255, 0.02);
  --clay-shadow-inner: inset 2px 2px 4px rgba(255, 255, 255, 0.08), 
                         inset -3px -3px 6px rgba(0, 0, 0, 0.35);
  --clay-border: 1px solid rgba(255, 255, 255, 0.05);
}
```
* Bouncy scaling animations (`scale(0.98)` on click, `translateY(-3px)` on hover) simulate a squishy clay texture.

### Overlap Management
Floating UI overlays (such as bottom sheets, map switchers, and map legend cards) are separated by clear margins and custom z-indices:
* `#mapCanvas`: `z-index: 1`
* `#roomLabelsContainer`: `z-index: 18` (above building meshes, below cards)
* `.floor-selector`: `z-index: 20`
* `.bottom-sheet`: `z-index: 25`
* `.toast`: `z-index: 300`

---

## 5. Deployment Guide

### Instant Hosting (GitHub Pages)
1. Initialize git and commit:
   ```bash
   git init
   git add .
   git commit -m "deploy campus navigator"
   ```
2. Create a repository on GitHub.
3. Push files, navigate to **Settings > Pages**, set Deployment Branch to `main`, and save.
4. Your application will be live at `https://<username>.github.io/<repo-name>/`.

### Custom Subdomains (DNS Configuration)
To link your school domain (e.g. `mappa.scuola.it`) on Netlify or Vercel:
1. Register custom domain in Netlify/Vercel settings.
2. In your school DNS provider console, add a **CNAME Record**:
   * Name: `mappa`
   * Target: your app domain (e.g. `Navi^FROM^gate.netlify.app.`)
3. Enable SSL (HTTPS) to ensure smooth touch operations on mobile devices.
