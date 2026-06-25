const speakeasy = require('speakeasy');

function verifyTOTP(secret, token) {
  if (!secret || !token) return false;
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token: String(token).replace(/\s/g, ''),
    window: 1
  });
}

module.exports = { verifyTOTP };
