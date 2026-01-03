const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true }, // e.g., "Senior Manager", "Junior Auditor"
    description: String,
    permissions: [{
        resource: { type: String, required: true }, // e.g., "leads", "security", "users", "workflows"
        actions: [{ type: String, enum: ['create', 'read', 'update', 'delete', 'all'] }]
    }],
    isCustom: { type: Boolean, default: true },
    color: { type: String, default: '#6366f1' } // For UI differentiation
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);
