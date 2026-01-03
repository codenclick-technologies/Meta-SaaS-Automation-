const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    campaignId: { type: String, required: true, unique: true }, // Meta Campaign ID
    name: { type: String, required: true },
    status: { type: String, default: 'ACTIVE' }, // ACTIVE, PAUSED, ARCHIVED
    objective: String, // OUTCOME_LEADS, OUTCOME_SALES
    dailyBudget: Number,
    currency: String,
    totalSpend: { type: Number, default: 0 }, // Track ad spend
    totalRevenue: { type: Number, default: 0 }, // Track revenue from converted leads
    platform: { type: String, default: 'facebook' },
    lastSynced: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed } // Store raw Meta data
}, { timestamps: true });

campaignSchema.index({ organizationId: 1, status: 1 });

module.exports = mongoose.model('Campaign', campaignSchema);