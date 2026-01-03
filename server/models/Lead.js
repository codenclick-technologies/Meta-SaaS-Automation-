const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    fb_lead_id: { type: String, unique: true, sparse: true },
    form_id: String,
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    email: String,
    phone: String,
    status: { type: String, default: 'New', enum: ['New', 'Contacted', 'Interested', 'Converted', 'Lost'] },
    score: { type: Number, default: 0 },
    quality: { type: String, default: 'Medium', enum: ['High', 'Medium', 'Low', 'Spam'] },
    scoreDetails: [{ reason: String, points: Number }],
    aiAnalysis: {
        score: Number,
        sentiment: String,
        summary: String,
        recommendedAction: String,
        intent: String
    },
    country: { type: String, default: 'US', index: true }, // ISO 3166-1 alpha-2
    value: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'USD' }
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emailStatus: { type: String, default: 'pending' }, // pending, sent, failed, opened, clicked
    whatsappStatus: { type: String, default: 'pending' }, // pending, sent, failed, delivered, read
    smsStatus: { type: String, default: 'pending' }, // pending, sent, failed
    campaign: { type: String, index: true },
    campaignId: { type: String, index: true }, // Meta Campaign ID
    campaignName: { type: String, index: true }, // Meta Campaign Name
    rawData: { type: mongoose.Schema.Types.Mixed }, // Store original payload for full traceability
    messages: [{
        direction: { type: String, enum: ['inbound', 'outbound'] }, // inbound = from customer, outbound = from us
        type: { type: String, default: 'sms' }, // sms, whatsapp
        body: String,
        timestamp: { type: Date, default: Date.now }
    }],
    logs: [{
        channel: String, // 'email' or 'whatsapp'
        status: String,
        timestamp: { type: Date, default: Date.now },
        response: Object
    }]
}, { timestamps: true });

// TTL Index: Automatically delete leads marked as 'Spam' after 30 days
leadSchema.index({ createdAt: 1 }, {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { quality: 'Spam' }
});

// Performance Index: Drip Scheduler query ko fast banane ke liye
leadSchema.index({ status: 1, smsStatus: 1, createdAt: 1 });

module.exports = mongoose.model('Lead', leadSchema);