const AnalyticsEvent = require('../models/AnalyticsEvent');
const Lead = require('../models/Lead');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

class BIService {
    /**
     * Record a BI event for later analysis
     */
    async trackEvent(data) {
        try {
            const event = new AnalyticsEvent(data);
            await event.save();
        } catch (error) {
            logger.error('BI Tracking Error:', error.message);
        }
    }

    /**
     * ADVANCED: Conversion Funnel Analysis
     * Calculates drop-off rates from Ingestion -> AI Analyzed -> CRM Sync -> Converted
     */
    async getConversionFunnel(organizationId) {
        const orgId = new mongoose.Types.ObjectId(organizationId);

        const pipeline = [
            { $match: { organizationId: orgId } },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 }
                }
            }
        ];

        const results = await AnalyticsEvent.aggregate(pipeline);
        const funnel = {
            ingested: results.find(r => r._id === 'LEAD_INGESTED')?.count || 0,
            analyzed: results.find(r => r._id === 'AI_ANALYZED')?.count || 0,
            synced: results.find(r => r._id === 'CRM_SYNC')?.count || 0,
            converted: results.find(r => r._id === 'SALE_COMPLETED')?.count || 0
        };

        return funnel;
    }

    /**
     * REVENUE ATTRIBUTION: Which campaigns are generating the most money?
     */
    async getRevenueAttribution(organizationId) {
        const orgId = new mongoose.Types.ObjectId(organizationId);
        return await AnalyticsEvent.aggregate([
            { $match: { organizationId: orgId, type: 'REVENUE_GENERATED' } },
            {
                $group: {
                    _id: "$campaign",
                    totalRevenue: { $sum: "$value" },
                    leadCount: { $sum: 1 }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
    }

    /**
     * AI ACCURACY: Confidence vs. Result
     * Compares high-intent AI scores with actual conversion reality
     */
    async getAIPrecisionMetrics(organizationId) {
        const leads = await Lead.find({ organizationId, 'aiAnalysis.score': { $exists: true } });
        const highMatchConverted = leads.filter(l => l.aiAnalysis.score >= 80 && l.status === 'Converted').length;
        const totalHighMatch = leads.filter(l => l.aiAnalysis.score >= 80).length;

        return {
            precision: totalHighMatch > 0 ? (highMatchConverted / totalHighMatch) * 100 : 0,
            sampleSize: leads.length
        };
    }

    /**
     * REAL-WORLD OPERATIONS: Performance & Reliability
     */
    async getOperationalMetrics(organizationId) {
        const orgId = new mongoose.Types.ObjectId(organizationId);
        const WorkflowLog = require('../models/WorkflowLog');

        // 1. Precise Automation Success Rate
        const totalWorkflows = await WorkflowLog.countDocuments({ organizationId: orgId });
        const successfulWorkflows = await WorkflowLog.countDocuments({ organizationId: orgId, status: 'success' });
        const successRate = totalWorkflows > 0 ? (successfulWorkflows / totalWorkflows) * 100 : 100;

        // 2. Real Avg Response Time (First Touchpoint)
        const touchpoints = await AnalyticsEvent.aggregate([
            { $match: { organizationId: orgId, type: { $in: ['LEAD_INGESTED', 'MESSAGE_SENT'] } } },
            { $sort: { timestamp: 1 } },
            {
                $group: {
                    _id: "$leadId",
                    ingestedAt: { $min: { $cond: [{ $eq: ["$type", "LEAD_INGESTED"] }, "$timestamp", null] } },
                    firstContactAt: { $min: { $cond: [{ $eq: ["$type", "MESSAGE_SENT"] }, "$timestamp", null] } }
                }
            },
            { $match: { ingestedAt: { $ne: null }, firstContactAt: { $ne: null } } },
            { $project: { duration: { $subtract: ["$firstContactAt", "$ingestedAt"] } } },
            { $group: { _id: null, avgTime: { $avg: "$duration" } } }
        ]);

        // 3. Sales Team Performance (Based on Real Assignments)
        const teamPerformance = await Lead.aggregate([
            { $match: { organizationId: orgId, assignedTo: { $exists: true } } },
            {
                $group: {
                    _id: "$assignedTo",
                    leadsHandled: { $sum: 1 },
                    conversions: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "_id",
                    foreignField: "_id",
                    as: "userInfo"
                }
            },
            { $unwind: "$userInfo" },
            {
                $project: {
                    name: "$userInfo.name",
                    leadsHandled: 1,
                    conversions: 1,
                    conversionRate: {
                        $cond: [{ $gt: ["$leadsHandled", 0] }, { $multiply: [{ $divide: ["$conversions", "$leadsHandled"] }, 100] }, 0]
                    }
                }
            },
            { $sort: { conversions: -1 } }
        ]);

        return {
            automationSuccess: successRate.toFixed(1),
            avgResponseTime: touchpoints[0] ? (touchpoints[0].avgTime / 1000).toFixed(1) : 0,
            teamPerformance
        };
    }

    /**
     * PREDICTIVE ENGINE: Calculate Agent Expertise Matrix
     * Ranks agents by their conversion success for specific Country + Intent combinations.
     */
    async getPredictiveExpertiseMatrix(organizationId) {
        const orgId = new mongoose.Types.ObjectId(organizationId);

        return await Lead.aggregate([
            { $match: { organizationId: orgId, assignedTo: { $exists: true }, status: 'Converted' } },
            {
                $group: {
                    _id: {
                        agentId: "$assignedTo",
                        country: "$country",
                        intent: "$aiAnalysis.intent"
                    },
                    successCount: { $sum: 1 }
                }
            },
            {
                $project: {
                    agentId: "$_id.agentId",
                    country: "$_id.country",
                    intent: "$_id.intent",
                    successCount: 1,
                    _id: 0
                }
            },
            { $sort: { successCount: -1 } }
        ]);
    }

    /**
     * ROI OPTIMIZER: Campaign Health Analysis
     * Calculates real ROI and identifies high-risk/low-conversion campaigns.
     */
    async getCampaignROIHealth(organizationId) {
        const orgId = new mongoose.Types.ObjectId(organizationId);

        return await AnalyticsEvent.aggregate([
            { $match: { organizationId: orgId, campaign: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$campaign",
                    leads: { $sum: { $cond: [{ $eq: ["$type", "LEAD_INGESTED"] }, 1, 0] } },
                    conversions: { $sum: { $cond: [{ $eq: ["$type", "SALE_COMPLETED"] }, 1, 0] } },
                    revenue: { $sum: { $cond: [{ $eq: ["$type", "REVENUE_GENERATED"] }, "$value", 0] } },
                    // Assuming a flat $10 average cost per lead for ad spend context
                    totalCost: { $sum: { $cond: [{ $eq: ["$type", "LEAD_INGESTED"] }, 10, 0] } }
                }
            },
            {
                $project: {
                    campaign: "$_id",
                    leads: 1,
                    conversions: 1,
                    revenue: 1,
                    totalCost: 1,
                    roi: {
                        $cond: [{ $gt: ["$totalCost", 0] }, { $multiply: [{ $divide: ["$revenue", "$totalCost"] }, 100] }, 0]
                    },
                    conversionRate: {
                        $cond: [{ $gt: ["$leads", 0] }, { $multiply: [{ $divide: ["$conversions", "$leads"] }, 100] }, 0]
                    }
                }
            },
            { $sort: { roi: -1 } }
        ]);
    }
}

module.exports = new BIService();
