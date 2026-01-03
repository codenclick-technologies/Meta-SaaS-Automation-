const BIService = require('./biService');
const logger = require('../utils/logger');

class TestingService {
    /**
     * Splits traffic between variants for a lead
     */
    async split(lead, config) {
        const { testId, variants } = config; // variants: [{ id: 'A', weight: 50 }, { id: 'B', weight: 50 }]

        // Simple deterministic hashing based on lead email/phone to keep variant consistent for same user
        const seed = lead.email || lead.phone || lead._id.toString();
        let hash = 0;
        for (let i = 0; i < seed.length; i++) {
            hash = seed.charCodeAt(i) + ((hash << 5) - hash);
        }

        const normalizedHash = Math.abs(hash % 100);

        let cumulativeWeight = 0;
        let selectedVariant = variants[0].id;

        for (const variant of variants) {
            cumulativeWeight += variant.weight;
            if (normalizedHash < cumulativeWeight) {
                selectedVariant = variant.id;
                break;
            }
        }

        logger.info(`A/B Test [${testId}]: Lead [${lead.name}] assigned to variant [${selectedVariant}]`);

        // Track variant assignment in BI
        await BIService.trackEvent({
            organizationId: lead.organizationId,
            leadId: lead._id,
            type: 'WORKFLOW_TRIGGERED',
            metadata: {
                action: 'AB_TEST_ASSIGNMENT',
                testId,
                variant: selectedVariant
            }
        });

        return selectedVariant;
    }

    /**
     * Gets performance report for an A/B test
     */
    async getTestResults(organizationId, testId) {
        const AnalyticsEvent = require('../models/AnalyticsEvent');

        return await AnalyticsEvent.aggregate([
            {
                $match: {
                    organizationId: new require('mongoose').Types.ObjectId(organizationId),
                    'metadata.testId': testId
                }
            },
            {
                $group: {
                    _id: "$metadata.variant",
                    leads: { $sum: 1 },
                    conversions: {
                        $sum: {
                            $cond: [{ $eq: ["$type", "SALE_COMPLETED"] }, 1, 0]
                        }
                    }
                }
            },
            {
                $project: {
                    variant: "$_id",
                    leads: 1,
                    conversions: 1,
                    conversionRate: {
                        $cond: [{ $gt: ["$leads", 0] }, { $multiply: [{ $divide: ["$conversions", "$leads"] }, 100] }, 0]
                    }
                }
            }
        ]);
    }
}

module.exports = new TestingService();
