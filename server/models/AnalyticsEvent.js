const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', index: true },
    type: {
        type: String,
        required: true,
        enum: [
            'LEAD_INGESTED', 'AI_ANALYZED', 'WORKFLOW_TRIGGERED',
            'MESSAGE_SENT', 'LINK_CLICKED', 'STATUS_CHANGE',
            'CRM_SYNC', 'REVENUE_GENERATED', 'SALE_COMPLETED'
        ]
    },
    source: String, // facebook, website, manual
    campaign: String, // Meta Campaign Name
    value: Number, // Financial value if applicable
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

// BI Indexing for high-speed funnel queries
analyticsEventSchema.index({ organizationId: 1, type: 1, timestamp: -1 });
analyticsEventSchema.index({ campaign: 1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
