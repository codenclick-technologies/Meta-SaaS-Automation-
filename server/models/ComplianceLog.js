const mongoose = require('mongoose');

const complianceLogSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who performed the action
    action: {
        type: String,
        required: true,
        enum: ['PII_VIEW', 'DATA_EXPORT', 'DATA_DELETION', 'CONSENT_CHANGE', 'POLICY_UPDATE', 'AUTOMATED_PURGE']
    },
    category: { type: String, enum: ['GDPR', 'CCPA', 'INTERNAL'], default: 'GDPR' },
    targetId: { type: String }, // e.g., Lead ID or Workflow ID
    details: { type: mongoose.Schema.Types.Mixed },
    ipAddress: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

complianceLogSchema.index({ organizationId: 1, action: 1, timestamp: -1 });

module.exports = mongoose.model('ComplianceLog', complianceLogSchema);
