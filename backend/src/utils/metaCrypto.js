const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// META_TOKEN_ENCRYPTION_KEY must be a 32-byte key, hex-encoded (64 hex chars) - generate one
// with `openssl rand -hex 32` and add it to backend/.env. Read lazily (not at module load)
// so a missing key only breaks Meta integration usage, not the whole server on boot.
function getKey() {
  const hex = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY is missing or not a 64-character hex string - generate one with `openssl rand -hex 32` and add it to backend/.env');
  }
  return Buffer.from(hex, 'hex');
}

// Output format: iv:authTag:ciphertext, all hex - self-contained so decrypt() needs nothing
// but this string and the key.
function encrypt(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(payload) {
  const [ivHex, authTagHex, ciphertextHex] = payload.split(':');
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Invalid encrypted payload format');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

module.exports = { encrypt, decrypt };
