const express = require('express');
const { getDb, readRooms, upsertRow } = require('../utils/db');
const { rectsOverlap } = require('../utils/roomGeometry');
const router = express.Router();

function overlapsWith(candidate) {
  return readRooms()
    .filter(r => r.id !== candidate.id && r.building === candidate.building && r.floor === candidate.floor)
    .filter(r => rectsOverlap(r, candidate))
    .map(r => r.id);
}

router.get('/', (req, res) => {
  res.json(readRooms());
});

router.get('/:id', (req, res) => {
  const room = readRooms().find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Non trovato' });
  res.json(room);
});

router.post('/', (req, res) => {
  const newRoom = { ...req.body, id: req.body.id || `R${Date.now()}` };
  upsertRow('rooms', newRoom);
  const overlapIds = overlapsWith(newRoom);
  res.status(201).json(overlapIds.length ? { ...newRoom, overlapsWith: overlapIds } : newRoom);
});

router.put('/:id', (req, res) => {
  const existing = readRooms().find(r => r.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  upsertRow('rooms', updated);
  const overlapIds = overlapsWith(updated);
  res.json(overlapIds.length ? { ...updated, overlapsWith: overlapIds } : updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM rooms WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;