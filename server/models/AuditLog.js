const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, required: true }, // e.g., 'USER_LOGIN', 'LEAD_DELETE', 'API_KEY_CREATED'
    resource: { type: String, required: true }, // e.g., 'leads', 'settings', 'auth'
    resourceId: { type: String }, // Optional: ID of the modified lead or setting
    status: { type: String, enum: ['success', 'failure'], default: 'success' },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Capture details like IP, User-Agent, or changed fields
    ipAddress: String,
    location: {
        city: String,
        country: String,
        ll: [Number] // Latitude, Longitude
    },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// TTL Index for Compliance: Audit logs usually kept for 1-7 years
// Default: 2 years (63,072,000 seconds)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
