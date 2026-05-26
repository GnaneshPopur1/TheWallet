const crypto = require('crypto');
const config = require('../config');

const PREFIX = 'enc:v1';

function getKey() {
  if (!config.encryptionKey) return null;
  return crypto.createHash('sha256').update(config.encryptionKey).digest();
}

function encryptSecret(value) {
  const key = getKey();
  if (!key || !value) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    PREFIX,
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join(':');
}

function decryptSecret(value) {
  const key = getKey();
  if (!key || !value || !value.startsWith(`${PREFIX}:`)) return value;

  const [, , ivText, tagText, encryptedText] = value.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivText, 'base64url'));

  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

module.exports = {
  decryptSecret,
  encryptSecret,
};
