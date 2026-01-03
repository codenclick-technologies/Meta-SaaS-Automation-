const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const biService = require('../services/biService');
const logger = require('../utils/logger');

// @route   GET /bi/dashboard
// @desc    Get Advanced BI metrics (Funnel, Attribution, AI Accuracy)
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
    try {
        const { organizationId } = req.user;

        const [funnel, attribution, aiMetrics, operational, campaignROI] = await Promise.all([
            biService.getConversionFunnel(organizationId),
            biService.getRevenueAttribution(organizationId),
            biService.getAIPrecisionMetrics(organizationId),
            biService.getOperationalMetrics(organizationId),
            biService.getCampaignROIHealth(organizationId)
        ]);

        res.json({
            funnel,
            attribution,
            aiMetrics,
            operational,
            campaignROI,
            generatedAt: new Date()
        });
    } catch (err) {
        logger.error('BI Dashboard Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
