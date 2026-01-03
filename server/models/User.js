const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, enum: ['admin', 'manager', 'sales', 'auditor'], default: 'sales' },
    customRole: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Team Hierarchy
    profilePicture: { type: String, default: '' },
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorSecret: { type: String, select: false },
    authenticators: [{
        credentialID: String,
        credentialPublicKey: Buffer,
        counter: Number,
        credentialDeviceType: String,
        credentialBackedUp: Boolean,
        transports: [String],
    }],
    currentChallenge: { type: String, select: false },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
userSchema.methods.getResetPasswordToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set expire
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 Minutes

    return resetToken;
};

module.exports = mongoose.model('User', userSchema);