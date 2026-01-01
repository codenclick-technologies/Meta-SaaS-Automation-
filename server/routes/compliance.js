const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ComplianceLog = require('../models/ComplianceLog');
const Organization = require('../models/Organization');
const mongoose = require('mongoose');

// @route   GET /compliance/audit-logs
// @desc    Get detailed compliance audit logs for the organization
// @access  Private (Admin Only)
router.get('/audit-logs', auth, async (req, res) => {
    try {
        const { organizationId } = req.user;
        const { action, startDate, endDate, page = 1, limit = 50 } = req.query;

        let query = { organizationId: new mongoose.Types.ObjectId(organizationId) };

        if (action) query.action = action;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) query.timestamp.$gte = new Date(startDate);
            if (endDate) query.timestamp.$lte = new Date(endDate);
        }

        const logs = await ComplianceLog.find(query)
            .populate('userId', 'name email')
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await ComplianceLog.countDocuments(query);

        res.json({
            logs,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /compliance/status
// @desc    Get overall compliance health status
// @access  Private
router.get('/status', auth, async (req, res) => {
    try {
        const org = await Organization.findById(req.user.organizationId);

        // Simple health check logic
        const health = {
            gdpr: org.compliance?.isGDPR ? 'Compliant' : 'Unconfigured',
            ccpa: org.compliance?.isCCPA ? 'Compliant' : 'Unconfigured',
            dataResidence: org.settings?.region || 'Global',
            purging: 'Active',
            lastAudit: await ComplianceLog.findOne({ organizationId: req.user.organizationId }).sort({ timestamp: -1 })
        };

        res.json(health);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;
