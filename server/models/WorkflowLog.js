const mongoose = require('mongoose');

const workflowLogSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },

    status: { type: String, enum: ['success', 'failed', 'partial', 'running'], default: 'running' },

    // Detailed step-by-step history
    steps: [{
        nodeId: { type: String },
        nodeName: { type: String },
        nodeType: { type: String },
        status: { type: String, enum: ['completed', 'failed', 'skipped'] },
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        error: { type: String },
        output: { type: mongoose.Schema.Types.Mixed }
    }],

    triggerData: { type: mongoose.Schema.Types.Mixed }, // Original payload that started this
    totalDurationMs: { type: Number }
}, { timestamps: true });

// Indexing for high-speed lookup
workflowLogSchema.index({ organizationId: 1, createdAt: -1 });
workflowLogSchema.index({ workflowId: 1 });
workflowLogSchema.index({ leadId: 1 });

module.exports = mongoose.model('WorkflowLog', workflowLogSchema);
