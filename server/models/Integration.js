const mongoose = require('mongoose');
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.JWT_SECRET || 'meta_automation_secret_key_32_bytes';
const IV_LENGTH = 16;

// Encryption Helper
const encrypt = (text) => {
    if (!text) return null;
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

const integrationSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    provider: { type: String, enum: ['meta', 'sendgrid', 'twilio', 'google_sheets', 'webhook', 'hubspot', 'salesforce', 'zoho'], required: true },
    name: { type: String, required: true }, // Friendly name for UI (e.g. "Marketing SendGrid")
    region: { type: String, default: 'Global' }, // Data residency or operational region
    isActive: { type: Boolean, default: true },

    authType: { type: String, enum: ['api_key', 'oauth2', 'token'], required: true },

    // Encrypted credentials
    credentials: {
        apiKey: { type: String },
        accessToken: { type: String },
        refreshToken: { type: String },
        metadata: { type: mongoose.Schema.Types.Mixed } // e.g., bucket name, spreadsheetId
    }
}, { timestamps: true });

integrationSchema.pre('save', function (next) {
    if (this.isModified('credentials.apiKey')) this.credentials.apiKey = encrypt(this.credentials.apiKey);
    if (this.isModified('credentials.accessToken')) this.credentials.accessToken = encrypt(this.credentials.accessToken);
    next();
});

module.exports = mongoose.model('Integration', integrationSchema);
