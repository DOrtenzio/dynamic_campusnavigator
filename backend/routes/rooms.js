const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.rooms);
});

router.get('/:id', (req, res) => {
  const db = readDB();
  const room = db.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Non trovato' });
  res.json(room);
});

router.post('/', (req, res) => {
  const db = readDB();
  const newRoom = { ...req.body, id: req.body.id || `R${Date.now()}` };
  db.rooms.push(newRoom);
  writeDB(db);
  res.status(201).json(newRoom);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const index = db.rooms.findIndex(r => r.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Non trovato' });
  db.rooms[index] = { ...db.rooms[index], ...req.body };
  writeDB(db);
  res.json(db.rooms[index]);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  db.rooms = db.rooms.filter(r => r.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

module.exports = router;