require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit'); 
const authMiddleware = require('./utils/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;
const frontendDir = path.join(__dirname, '../frontend');

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { 
    status: 429, 
    error: "Troppi tentativi di login. Riprova tra 15 minuti." 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

app.use('/api/login', loginLimiter, require('./routes/auth'));

app.get('/api/buildings', (req, res) => {
  const { readDB } = require('./utils/db');
  res.json(readDB().buildings);
});
app.get('/api/buildings/:id', (req, res) => {
  const { readDB } = require('./utils/db');
  const bld = readDB().buildings.find(b => b.id === req.params.id);
  if (!bld) return res.status(404).json({ error: 'Non trovato' });
  res.json(bld);
});
app.get('/api/rooms', (req, res) => {
  const { readDB } = require('./utils/db');
  res.json(readDB().rooms);
});
app.get('/api/rooms/:id', (req, res) => {
  const { readDB } = require('./utils/db');
  const room = readDB().rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Non trovato' });
  res.json(room);
});
app.get('/api/teachers', (req, res) => {
  const { readDB } = require('./utils/db');
  res.json(readDB().teachers);
});
app.get('/api/teachers/:id', (req, res) => {
  const { readDB } = require('./utils/db');
  const teacher = readDB().teachers.find(t => t.id === req.params.id);
  if (!teacher) return res.status(404).json({ error: 'Non trovato' });
  res.json(teacher);
});
app.get('/api/schedule', (req, res) => {
  const { readDB } = require('./utils/db');
  res.json(readDB().schedule || {});
});
app.get('/api/schedule/:classId', (req, res) => {
  const { readDB } = require('./utils/db');
  const schedule = readDB().schedule || {};
  res.json(schedule[req.params.classId] || {});
});
app.get('/api/campus-elements', (req, res) => {
  const { readDB } = require('./utils/db');
  res.json(readDB().campusElements || []);
});

app.use('/api/teachers', authMiddleware, require('./routes/teachers'));
app.use('/api/rooms', authMiddleware, require('./routes/rooms'));
app.use('/api/buildings', authMiddleware, require('./routes/buildings'));
app.use('/api/campus-elements', authMiddleware, require('./routes/campusElements'));
app.use('/api/schedule', authMiddleware, require('./routes/schedule'));
app.use('/api/csv', authMiddleware, require('./routes/csv'));

app.use(express.static(frontendDir));

app.listen(PORT, () => {
  console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
