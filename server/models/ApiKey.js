const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    key: { type: String, unique: true, required: true }, // Hashed key
    displayKey: { type: String, required: true }, // First 4 and Last 4 chars only (e.g. "pk_l...abcd")
    secret: { type: String, required: true }, // Encrypted secret part
    role: { type: String, enum: ['read_only', 'full_access'], default: 'read_only' },
    status: { type: Boolean, default: true },
    lastUsed: Date,
    expiresAt: Date,
}, { timestamps: true });

// Static methods for key generation
apiKeySchema.statics.generate = function (organizationId, name, role = 'read_only') {
    const rawKey = `pk_live_${crypto.randomBytes(24).toString('hex')}`;
    const displayKey = `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    return {
        organizationId,
        name,
        key: hashedKey,
        displayKey,
        secret: 'ENCRYPTED_PLACEHOLDER', // In production, use KMS or environment encryption
        role,
        rawKey // Return once to user
    };
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
