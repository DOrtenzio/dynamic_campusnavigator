function rectsOverlap(a, b, epsilon = 1e-6) {
  const dx = Math.abs(a.x - b.x);
  const dz = Math.abs(a.z - b.z);
  return dx < (a.w + b.w) / 2 - epsilon && dz < (a.d + b.d) / 2 - epsilon;
}

function findOverlaps(rooms) {
  const overlaps = [];
  const byBuildingFloor = new Map();
  for (const room of rooms) {
    const key = `${room.building}::${room.floor}`;
    if (!byBuildingFloor.has(key)) byBuildingFloor.set(key, []);
    byBuildingFloor.get(key).push(room);
  }
  for (const group of byBuildingFloor.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (rectsOverlap(group[i], group[j])) {
          overlaps.push([group[i], group[j]]);
        }
      }
    }
  }
  return overlaps;
}

module.exports = { rectsOverlap, findOverlaps };