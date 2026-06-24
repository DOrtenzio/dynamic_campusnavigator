require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./utils/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rotte pubbliche
app.use('/api/login', require('./routes/auth'));

// Rotte protette
app.use('/api/teachers', authMiddleware, require('./routes/teachers'));
app.use('/api/rooms', authMiddleware, require('./routes/rooms'));
app.use('/api/buildings', authMiddleware, require('./routes/buildings'));
app.use('/api/schedule', authMiddleware, require('./routes/schedule'));
app.use('/api/csv', authMiddleware, require('./routes/csv'));

app.listen(PORT, () => {
  console.log(`Backend in esecuzione su http://localhost:${PORT}`);
});