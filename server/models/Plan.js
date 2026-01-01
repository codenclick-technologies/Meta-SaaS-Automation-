const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['Starter', 'Professional', 'Enterprise'],
        default: 'Starter'
    },
    price: {
        type: Number,
        required: true,
        default: 0
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'annual'],
        default: 'monthly'
    },
    features: {
        type: [String],
        default: []
    },
    maxUsers: {
        type: Number,
        default: 5
    },
    maxLeads: {
        type: Number,
        default: 1000
    },
    maxStorageGB: {
        type: Number,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true,
        unique: true
    }
});

module.exports = mongoose.model('Plan', planSchema);
