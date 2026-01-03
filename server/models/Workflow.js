const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true },
    trigger: {
        type: { type: String, default: 'meta_ads' },
        config: Object
    },
    nodes: [{
        id: String,
        type: { type: String, enum: ['action', 'condition', 'trigger'] },
        provider: String,
        name: String,
        config: Object, // Stores assignedTo, message, etc.
        nextNodes: [String]
    }],
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Workflow', workflowSchema);