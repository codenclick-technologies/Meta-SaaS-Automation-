const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    channel: { type: String, enum: ['email', 'whatsapp', 'sms'], required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'delivered'], required: true },
    response: { type: Object }, // Store API response or error
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', LogSchema);
