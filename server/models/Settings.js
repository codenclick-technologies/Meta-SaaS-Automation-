const mongoose = require('mongoose');
const crypto = require('crypto');

// --- Encryption Configuration ---
// In production, use process.env.ENCRYPTION_KEY. Fallback provided for dev.
const ENCRYPTION_KEY = process.env.JWT_SECRET || 'meta_automation_secret_key_32_bytes';
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text || text.includes(':')) return text; // Prevent double encryption
    try {
        const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    } catch (e) { return text; }
}

function decrypt(text) {
    if (!text || !text.includes(':')) return text; // Return as-is if not encrypted
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) { return text; }
}
// -------------------------------

const settingsSchema = new mongoose.Schema({
    sendgridApiKey: { type: String, default: '' },
    emailFrom: { type: String, default: '' },
    metaAccessToken: { type: String, default: '' },
    metaPhoneId: { type: String, default: '' },
    metaBusinessId: { type: String, default: '' },
    metaPixelId: { type: String, default: '' },
    twilioSid: { type: String, default: '' },
    twilioAuthToken: { type: String, default: '' },
    twilioPhone: { type: String, default: '' },
    companyName: { type: String, default: 'Meta Automation' },
    companyLogo: { type: String, default: '' },
    emailSubject: { type: String, default: 'Welcome!' },
    emailBody: { type: String, default: 'Hi {name},\n\nThank you for your interest.' },
    brochureUrl: { type: String, default: '' },
    includeBrochure: { type: Boolean, default: true },
    dripCampaignEnabled: { type: Boolean, default: false },
    whatsappTemplateName: { type: String, default: 'hello_world' },
    verifyToken: { type: String, default: 'meta_automation_verify_token' }
}, { timestamps: true });

// Middleware: Encrypt sensitive fields before saving
settingsSchema.pre('save', function (next) {
    if (this.isModified('sendgridApiKey')) this.sendgridApiKey = encrypt(this.sendgridApiKey);
    if (this.isModified('metaAccessToken')) this.metaAccessToken = encrypt(this.metaAccessToken);
    if (this.isModified('twilioAuthToken')) this.twilioAuthToken = encrypt(this.twilioAuthToken);
    next();
});

// Middleware: Decrypt fields after fetching from DB
settingsSchema.post('init', function (doc) {
    if (doc.sendgridApiKey) doc.sendgridApiKey = decrypt(doc.sendgridApiKey);
    if (doc.metaAccessToken) doc.metaAccessToken = decrypt(doc.metaAccessToken);
    if (doc.twilioAuthToken) doc.twilioAuthToken = decrypt(doc.twilioAuthToken);
});

// Helper to always get the single settings document
settingsSchema.statics.getSettings = async function () {
    let settings = await this.findOne();
    if (!settings) {
        settings = await this.create({});
    }
    return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);