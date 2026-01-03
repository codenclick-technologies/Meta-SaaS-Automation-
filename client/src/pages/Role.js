const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    resource: {
        type: String,
        required: true,
        enum: ['leads', 'users', 'billing', 'settings', 'workflows', 'analytics', 'security'],
    },
    actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'assign', 'export'],
    }],
    // 'own' allows access only to records created by the user. 'any' allows access to all.
    scope: {
        type: String,
        enum: ['any', 'own'],
        default: 'any'
    }
}, { _id: false });

const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    permissions: [permissionSchema],
    isDefault: { type: Boolean, default: false } // To protect system roles like 'admin'
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);