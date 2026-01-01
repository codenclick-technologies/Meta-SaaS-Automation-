const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    token: { type: String, required: true, unique: true }, // Store hashed or part of token for lookup
    deviceInfo: {
        browser: String,
        os: String,
        device: String,
        ip: String
    },
    lastActivity: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    isValid: { type: Boolean, default: true }
}, { timestamps: true });

// Auto-delete expired sessions from DB
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
