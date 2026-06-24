const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.buildings);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const bld = db.buildings.find(b => b.id === req.params.id);
  if (!bld) return res.status(404).json({ error: 'Non trovato' });
  res.json(bld);
});

router.post('/', (req, res) => {
  const db = readDB();
  const newBld = { ...req.body, id: req.body.id || `B${Date.now()}` };
  db.buildings.push(newBld);
  writeDB(db);
  res.status(201).json(newBld);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const index = db.buildings.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Non trovato' });
  db.buildings[index] = { ...db.buildings[index], ...req.body };
  writeDB(db);
  res.json(db.buildings[index]);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  db.buildings = db.buildings.filter(b => b.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

module.exports = router;