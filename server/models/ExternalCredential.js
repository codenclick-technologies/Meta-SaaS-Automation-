const mongoose = require('mongoose');

const externalCredentialSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    provider: {
        type: String,
        required: true,
        enum: ['meta', 'whatsapp', 'openai', 'sendgrid', 'stripe', 'custom']
    },
    name: { type: String, required: true }, // Friendly name e.g. "Marketing WhatsApp"
    encryptedValue: { type: String, required: true }, // Stored as iv:hex
    lastUsed: Date,
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: String } // Store non-sensitive info like App ID, Phone ID
}, { timestamps: true });

// Prevent duplicate providers for same org if needed, or allow multiple
// externalCredentialSchema.index({ organizationId: 1, provider: 1 }, { unique: true });

module.exports = mongoose.model('ExternalCredential', externalCredentialSchema);
