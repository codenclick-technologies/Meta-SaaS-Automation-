const crypto = require('crypto');

// Use a secure key from environment or fallback to a generated one for dev (WARNING: Use fixed key in prod)
// In production, ENCRYPTION_KEY must be 32 chars long (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.createHash('sha256').update('dev-secret-key').digest('base64').substring(0, 32);
const IV_LENGTH = 16; // AES block size

function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

module.exports = { encrypt, decrypt };
