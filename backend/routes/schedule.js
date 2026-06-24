const express = require('express');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

// GET tutto lo schedule
router.get('/', (req, res) => {
  const db = readDB();
  res.json(db.schedule);
});

// GET per una classe
router.get('/:classId', (req, res) => {
  const db = readDB();
  const schedule = db.schedule[req.params.classId] || {};
  res.json(schedule);
});

// PUT (sostituisce tutto l'orario per una classe)
router.put('/:classId', (req, res) => {
  const db = readDB();
  db.schedule[req.params.classId] = req.body;
  writeDB(db);
  res.json(db.schedule[req.params.classId]);
});

// PATCH per una singola lezione
router.patch('/:classId/:day/:hour', (req, res) => {
  const db = readDB();
  const { classId, day, hour } = req.params;
  if (!db.schedule[classId]) db.schedule[classId] = {};
  if (!db.schedule[classId][day]) db.schedule[classId][day] = {};
  db.schedule[classId][day][hour] = req.body;
  writeDB(db);
  res.json(db.schedule[classId][day][hour]);
});

// DELETE per una lezione
router.delete('/:classId/:day/:hour', (req, res) => {
  const db = readDB();
  const { classId, day, hour } = req.params;
  if (db.schedule[classId] && db.schedule[classId][day]) {
    delete db.schedule[classId][day][hour];
    writeDB(db);
  }
  res.status(204).send();
});

module.exports = router;