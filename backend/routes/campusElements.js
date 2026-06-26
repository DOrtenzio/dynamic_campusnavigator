const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.campusElements || []);
});

router.post('/', (req, res) => {
  const db = readDB();
  if (!db.campusElements) db.campusElements = [];
  const el = { ...req.body, id: req.body.id || `el-${Date.now()}` };
  db.campusElements.push(el);
  writeDB(db);
  res.status(201).json(el);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  if (!db.campusElements) db.campusElements = [];
  const index = db.campusElements.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Not found' });
  db.campusElements[index] = { ...db.campusElements[index], ...req.body };
  writeDB(db);
  res.json(db.campusElements[index]);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  if (!db.campusElements) db.campusElements = [];
  const before = db.campusElements.length;
  db.campusElements = db.campusElements.filter(e => e.id !== req.params.id);
  if (db.campusElements.length === before) {
    return res.status(404).json({ error: 'Not found' });
  }
  writeDB(db);
  res.status(204).send();
});

module.exports = router;
