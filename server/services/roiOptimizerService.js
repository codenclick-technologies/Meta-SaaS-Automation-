const biService = require('./biService');
const logger = require('../utils/logger');
const { sendInternalAlert } = require('./notificationService'); // Assuming this exists or using generic logger

class ROIOptimizerService {
    /**
     * Autonomous ROI Audit
     * Scans all campaigns and triggers "Guard Actions" for underperforming assets.
     */
    async auditCampaigns(organizationId) {
        logger.info(`ROI Optimizer: Starting autonomous audit for Org [${organizationId}]`);

        try {
            const healthReport = await biService.getCampaignROIHealth(organizationId);

            const optimizationResults = [];

            for (const campaign of healthReport) {
                let actionTaken = 'NONE';
                let reason = '';

                // Logic: High Risk Detection
                // If leads > 20 and conversion rate < 1%
                if (campaign.leads >= 20 && campaign.conversionRate < 1) {
                    actionTaken = 'AUTO_BLOCK';
                    reason = `Critically low conversion rate (${campaign.conversionRate.toFixed(2)}%) after ${campaign.leads} leads.`;
                }
                // If ROI is negative ( < 100% ) after significant spend
                else if (campaign.totalCost >= 200 && campaign.roi < 100) {
                    actionTaken = 'ROI_ALERT';
                    reason = `Negative ROI detected: ${campaign.roi.toFixed(1)}%. Spending more than generating.`;
                }

                if (actionTaken !== 'NONE') {
                    logger.warn(`ROI Optimizer: ${actionTaken} on campaign [${campaign.campaign}] - ${reason}`);

                    // Here you would integrate with Meta Ad API to actually pause
                    // For now, we record the decision and trigger a system alert
                    optimizationResults.push({
                        campaign: campaign.campaign,
                        action: actionTaken,
                        reason: reason,
                        timestamp: new Date()
                    });
                }
            }

            return optimizationResults;
        } catch (error) {
            logger.error('ROI Audit Failed:', error.message);
            return [];
        }
    }
}

module.exports = new ROIOptimizerService();
