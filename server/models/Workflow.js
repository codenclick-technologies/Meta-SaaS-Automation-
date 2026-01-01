const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },

    // Trigger Configuration
    trigger: {
        type: { type: String, enum: ['webhook', 'meta_ads', 'google_forms', 'manual'], required: true },
        sourceId: { type: String }, // Form ID or Webhook Path
        config: { type: mongoose.Schema.Types.Mixed }
    },

    // Sequential & Parallel Steps
    nodes: [{
        id: { type: String, required: true },
        type: { type: String, enum: ['action', 'condition', 'delay'], required: true },
        provider: { type: String }, // e.g., 'whatsapp', 'email', 'sheets'
        actionType: { type: String }, // e.g., 'send_template', 'add_row'
        config: { type: mongoose.Schema.Types.Mixed },
        nextNodes: [String], // IDS of nodes to follow
        failureNodes: [String] // Error handling branch
    }],

    metadata: {
        totalExecutions: { type: Number, default: 0 },
        successRate: { type: Number, default: 100 }
    }
}, { timestamps: true });

module.exports = mongoose.model('Workflow', workflowSchema);
