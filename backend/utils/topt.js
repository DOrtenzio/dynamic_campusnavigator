const speakeasy = require('speakeasy');

function verifyTOTP(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1
  });
}

module.exports = { verifyTOTP };