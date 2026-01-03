const mongoose = require('mongoose');

const userSecuritySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    // PIN Authentication & Device Binding
    pinHash: { type: String },
    pinLocked: { type: Boolean, default: false },
    pinAttempts: { type: Number, default: 0 },
    lastFailedAttempt: { type: Date },
    lockoutUntil: { type: Date },
    deviceId: { type: String }, // Binds PIN to a specific browser/device

    // Biometric / WebAuthn Credentials (Fingerprint/FaceID)
    authenticators: [{
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: String, required: true },
        counter: { type: Number, default: 0 },
        transports: [String]
    }],
    currentChallenge: { type: String }, // Temporary storage for WebAuthn challenge

    // Recovery
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    // Whitelisted IPs
    whitelistedIPs: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('UserSecurity', userSecuritySchema);