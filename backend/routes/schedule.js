const express = require('express');
const {
  readSchedule,
  writeScheduleForClass,
  setScheduleSlot,
  deleteScheduleSlot
} = require('../utils/db');
const router = express.Router();

// GET tutto lo schedule
router.get('/', (req, res) => {
  res.json(readSchedule());
});

// GET per una classe
router.get('/:classId', (req, res) => {
  const schedule = readSchedule();
  res.json(schedule[req.params.classId] || {});
});

// PUT (sostituisce tutto l'orario per una classe)
router.put('/:classId', (req, res) => {
  writeScheduleForClass(req.params.classId, req.body || {});
  const schedule = readSchedule();
  res.json(schedule[req.params.classId] || {});
});

// PATCH per una singola lezione
router.patch('/:classId/:day/:hour', (req, res) => {
  const { classId, day, hour } = req.params;
  setScheduleSlot(classId, day, hour, req.body);
  res.json(req.body);
});

// DELETE per una lezione
router.delete('/:classId/:day/:hour', (req, res) => {
  const { classId, day, hour } = req.params;
  deleteScheduleSlot(classId, day, hour);
  res.status(204).send();
});

module.exports = router;