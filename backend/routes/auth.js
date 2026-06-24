const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyTOTP } = require('../utils/totp');
const router = express.Router();

router.post('/login', (req, res) => {
  const { psk, totp } = req.body;
  const validPsk = psk === process.env.ADMIN_PSK;
  const validTotp = verifyTOTP(process.env.TOTP_SECRET, totp);

  if (!validPsk || !validTotp) {
    return res.status(401).json({ error: 'Credenziali non valide' });
  }

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token });
});

module.exports = router;