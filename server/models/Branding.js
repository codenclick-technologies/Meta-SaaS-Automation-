const mongoose = require('mongoose');

const brandingSchema = new mongoose.Schema({
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    companyName: { type: String, default: 'Meta-SaaS' },
    logoUrl: String,
    faviconUrl: String,
    primaryColor: { type: String, default: '#6366f1' },
    secondaryColor: { type: String, default: '#0f172a' },
    customDomain: String,
    dnsVerified: { type: Boolean, default: false },
    mappingStatus: { type: String, enum: ['pending', 'verified', 'failed'], default: 'pending' },
    sslActive: { type: Boolean, default: false },
    customCss: String,
    supportEmail: String,
    whiteLabelActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Branding', brandingSchema);
