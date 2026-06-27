const express = require('express');
const { getDb, readCampusElements, upsertRow } = require('../utils/db');
const router = express.Router();

router.get('/', (req, res) => {
  res.json(readCampusElements());
});

router.post('/', (req, res) => {
  const el = { ...req.body, id: req.body.id || `el-${Date.now()}` };
  upsertRow('campus_elements', el);
  res.status(201).json(el);
});

router.put('/:id', (req, res) => {
  const existing = readCampusElements().find(e => e.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  upsertRow('campus_elements', updated);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM campus_elements WHERE id = ?').get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: 'Not found' });
  }
  db.prepare('DELETE FROM campus_elements WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;