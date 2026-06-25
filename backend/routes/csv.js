const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');
const { readDB, writeDB } = require('../utils/db');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// Import teachers
router.post('/import/teachers', upload.single('file'), (req, res) => {
  const results = [];
  const bufferStream = Readable.from(req.file.buffer.toString());
  bufferStream
    .pipe(csv())
    .on('data', data => results.push(data))
    .on('end', () => {
      const db = readDB();
      results.forEach(row => {
        const teacher = {
          id: row.ID || `T${Date.now()}`,
          name: row.Nome || `${row.Titolo} ${row.Nome} ${row.Cognome}`,
          firstName: row.Nome || '',
          lastName: row.Cognome || '',
          department: row.Dipartimento || '',
          subject: row.Materia || '',
          building: row.Edificio || '',
          floor: parseInt(row.Piano) || 1,
          office: row.Ufficio || ''
        };
        const existing = db.teachers.findIndex(t => t.id === teacher.id);
        if (existing >= 0) db.teachers[existing] = teacher;
        else db.teachers.push(teacher);
      });
      writeDB(db);
      res.json({ imported: results.length });
    });
});

// Export teachers
router.get('/export/teachers', (req, res) => {
  const db = readDB();
  const headers = ['ID','Nome','Dipartimento','Materia','Edificio','Piano','Ufficio'];
  const rows = db.teachers.map(t => [t.id, t.name, t.department, t.subject, t.building, t.floor, t.office]);
  const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=professori.csv');
  res.send(csvContent);
});

router.post('/import/rooms', upload.single('file'), (req, res) => {
  const results = [];
  const bufferStream = Readable.from(req.file.buffer.toString());
  bufferStream
    .pipe(csv())
    .on('data', data => results.push(data))
    .on('end', () => {
      const db = readDB();
      results.forEach(row => {
        const room = {
          id: row.ID || `R${Date.now()}`,
          name: row.Nome || row.ID,
          building: row.Edificio || '',
          floor: parseInt(row.Piano, 10) || 1,
          type: row.Tipo || 'class',
          subject: row.Materia || '',
          x: parseFloat(row.X) || 0,
          z: parseFloat(row.Z) || 0,
          w: parseFloat(row.Larghezza) || 2,
          d: parseFloat(row.Profondita) || 2,
          color: parseInt(row.Colore, 16) || 0x93B5C6
        };
        const existing = db.rooms.findIndex(r => r.id === room.id);
        if (existing >= 0) db.rooms[existing] = room;
        else db.rooms.push(room);
      });
      writeDB(db);
      res.json({ imported: results.length });
    });
});

router.get('/export/rooms', (req, res) => {
  const db = readDB();
  const headers = ['ID', 'Nome', 'Edificio', 'Piano', 'Tipo', 'Materia', 'X', 'Z', 'Larghezza', 'Profondita', 'Colore'];
  const rows = db.rooms.map(r => [
    r.id, r.name, r.building, r.floor, r.type, r.subject || '',
    r.x, r.z, r.w, r.d, r.color
  ]);
  const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=aule.csv');
  res.send(csvContent);
});

module.exports = router;