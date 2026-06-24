const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

// GET tutti
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.teachers);
});

// GET singolo
router.get('/:id', (req, res) => {
  const db = readDB();
  const teacher = db.teachers.find(t => t.id === req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Non trovato' });
  res.json(teacher);
});

// POST nuovo
router.post('/', (req, res) => {
  const db = readDB();
  const newTeacher = { ...req.body, id: req.body.id || `T${Date.now()}` };
  db.teachers.push(newTeacher);
  writeDB(db);
  res.status(201).json(newTeacher);
});

// PUT aggiorna
router.put('/:id', (req, res) => {
  const db = readDB();
  const index = db.teachers.findIndex(t => t.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Non trovato' });
  db.teachers[index] = { ...db.teachers[index], ...req.body };
  writeDB(db);
  res.json(db.teachers[index]);
});

// DELETE
router.delete('/:id', (req, res) => {
  const db = readDB();
  db.teachers = db.teachers.filter(t => t.id !== req.params.id);
  writeDB(db);
  res.status(204).send();
});

module.exports = router;