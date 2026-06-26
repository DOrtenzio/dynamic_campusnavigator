/** Campus placement helpers — rotation, footprint, collision detection */

function degToRad(deg) {
  return (deg || 0) * Math.PI / 180;
}

function normalizeRotation(deg) {
  return ((Math.round(deg || 0) / 90) % 4 + 4) % 4 * 90;
}

function getEffectiveFootprint(w, d, rotation) {
  const rot = normalizeRotation(rotation);
  if (rot === 90 || rot === 270) return { w: d, d: w };
  return { w, d };
}

function toBuildingLocal(campusX, campusZ, building) {
  const dx = campusX - building.x;
  const dz = campusZ - building.z;
  const rad = -degToRad(building.rotation);
  return {
    x: dx * Math.cos(rad) - dz * Math.sin(rad),
    z: dx * Math.sin(rad) + dz * Math.cos(rad)
  };
}

function getRectBounds(x, z, w, d, rotation) {
  const fp = getEffectiveFootprint(w, d, rotation);
  return {
    minX: x - fp.w / 2,
    maxX: x + fp.w / 2,
    minZ: z - fp.d / 2,
    maxZ: z + fp.d / 2
  };
}

function rectsOverlap(a, b, margin = 0) {
  return !(
    a.maxX + margin <= b.minX ||
    a.minX - margin >= b.maxX ||
    a.maxZ + margin <= b.minZ ||
    a.minZ - margin >= b.maxZ
  );
}

function getBuildingBounds(b, margin = 0) {
  return getRectBounds(b.x, b.z, b.w, b.d, b.rotation);
}

function getElementBounds(el) {
  if (el.type === 'streetlight' || el.type === 'fountain') {
    const r = el.type === 'fountain' ? 1.8 : 0.6;
    return { minX: el.x - r, maxX: el.x + r, minZ: el.z - r, maxZ: el.z + r };
  }
  if (el.type === 'bench' || el.type === 'flowerbed') {
    const r = el.type === 'flowerbed' ? 1.2 : 0.8;
    return { minX: el.x - r, maxX: el.x + r, minZ: el.z - r, maxZ: el.z + r };
  }
  return getRectBounds(el.x, el.z, el.w || 2, el.d || 2, el.rotation);
}

function getBuildingCollisions(building, buildings, elements, excludeId) {
  const issues = [];
  const bBounds = getBuildingBounds(building, 0.3);

  buildings.forEach(other => {
    if (other.id === building.id || other.id === excludeId) return;
    const oBounds = getBuildingBounds(other, 0.3);
    if (rectsOverlap(bBounds, oBounds)) {
      issues.push({ type: 'building', id: other.id, label: other.name || other.id });
    }
  });

  (elements || []).forEach(el => {
    if (el.type === 'tree') return;
    const eBounds = getElementBounds(el);
    if (rectsOverlap(bBounds, eBounds, 0.2)) {
      issues.push({ type: el.type, id: el.id, label: el.label || el.id });
    }
  });

  return issues;
}

function isNearCampusPath(x, z, elements, threshold = 2) {
  return (elements || []).some(el => {
    if (el.type !== 'sidewalk') return false;
    const b = getElementBounds(el);
    return x >= b.minX - threshold && x <= b.maxX + threshold &&
           z >= b.minZ - threshold && z <= b.maxZ + threshold;
  });
}
