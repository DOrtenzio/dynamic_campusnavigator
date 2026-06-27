const express = require('express');
const { getDb, readBuildings, upsertRow } = require('../utils/db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(readBuildings());
});

router.get('/:id', (req, res) => {
  const bld = readBuildings().find(b => b.id === req.params.id);
  if (!bld) return res.status(404).json({ error: 'Non trovato' });
  res.json(bld);
});

router.post('/', (req, res) => {
  const newBld = { ...req.body, id: req.body.id || `B${Date.now()}` };
  upsertRow('buildings', newBld);
  res.status(201).json(newBld);
});

router.put('/:id', (req, res) => {
  const existing = readBuildings().find(b => b.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  upsertRow('buildings', updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM buildings WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  db.prepare('DELETE FROM buildings WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;