const express = require('express');
const { getDb, readTeachers, upsertRow } = require('../utils/db');
const router = express.Router();

// GET tutti
router.get('/', (req, res) => {
  res.json(readTeachers());
});

// GET singolo
router.get('/:id', (req, res) => {
  const teacher = readTeachers().find(t => t.id === req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Non trovato' });
  res.json(teacher);
});

// POST nuovo
router.post('/', (req, res) => {
  const newTeacher = { ...req.body, id: req.body.id || `T${Date.now()}` };
  upsertRow('teachers', newTeacher);
  res.status(201).json(newTeacher);
});

// PUT aggiorna
router.put('/:id', (req, res) => {
  const existing = readTeachers().find(t => t.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  const updated = { ...existing, ...req.body, id: req.params.id };
  upsertRow('teachers', updated);
  res.json(updated);
});

// DELETE
router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM teachers WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Non trovato' });
  db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;