const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    fb_lead_id: { type: String, unique: true, sparse: true },
    form_id: String,
    name: { type: String, required: true },
    email: String,
    phone: String,
    status: { type: String, default: 'New', enum: ['New', 'Contacted', 'Interested', 'Converted', 'Lost'] },
    score: { type: Number, default: 0 },
    quality: { type: String, default: 'Medium', enum: ['High', 'Medium', 'Low', 'Spam'] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    emailStatus: { type: String, default: 'pending' }, // pending, sent, failed, opened, clicked
    whatsappStatus: { type: String, default: 'pending' }, // pending, sent, failed, delivered, read
    smsStatus: { type: String, default: 'pending' }, // pending, sent, failed
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