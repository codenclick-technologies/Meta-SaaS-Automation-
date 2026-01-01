const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  facebookFormIds: {
    type: [String],
    index: true,
  },
  settings: {
    timezone: { type: String, default: 'UTC' }, // For timezone-aware automation
    locale: { type: String, default: 'en-US' }, // Default UI language
    currency: { type: String, default: 'USD' }, // For revenue tracking
    region: { type: String, enum: ['US', 'EU', 'AS', 'IN'], default: 'US' }, // Data residency
  },
  compliance: {
    isGDPR: { type: Boolean, default: false },
    isCCPA: { type: Boolean, default: false },
    dataRetentionDays: { type: Number, default: 730 }, // 2 years default
    piiEncryption: { type: Boolean, default: true },
  },
  branding: {
    logo: String,
    primaryColor: { type: String, default: '#2563eb' },
    customDomain: { type: String, unique: true, sparse: true },
    whiteLabelEnabled: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Organization', organizationSchema);
