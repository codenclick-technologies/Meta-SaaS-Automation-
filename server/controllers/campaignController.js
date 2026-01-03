const Campaign = require('../models/Campaign');
const facebookService = require('../services/facebookService');
const logger = require('../utils/logger');

// GET /campaigns
exports.getCampaigns = async (req, res) => {
    try {
        // Advanced Aggregation Pipeline to get full campaign performance stats
        const campaignsWithStats = await Campaign.aggregate([
            // 1. Filter for the correct organization
            { $match: { organizationId: req.user.organizationId } },
            // 2. Join with the 'leads' collection to get related leads
            {
                $lookup: {
                    from: 'leads', // The collection name for leads
                    localField: 'campaignId',
                    foreignField: 'campaignId',
                    as: 'leadData'
                }
            },
            // 3. Add calculated fields for analytics
            {
                $addFields: {
                    leadCount: { $size: '$leadData' },
                    convertedCount: {
                        $size: {
                            $filter: {
                                input: '$leadData',
                                as: 'lead',
                                cond: { $eq: ['$$lead.status', 'Converted'] }
                            }
                        }
                    }
                }
            },
            // 4. Project the final shape and calculate ROI, CPL, etc.
            {
                $project: {
                    name: 1, status: 1, objective: 1, totalSpend: 1, totalRevenue: 1, lastSynced: 1, campaignId: 1, leadCount: 1,
                    // Cost Per Lead (CPL) - handle division by zero
                    cpl: { $cond: [{ $eq: ['$leadCount', 0] }, 0, { $divide: ['$totalSpend', '$leadCount'] }] },
                    // Conversion Rate - handle division by zero
                    conversionRate: { $cond: [{ $eq: ['$leadCount', 0] }, 0, { $multiply: [{ $divide: ['$convertedCount', '$leadCount'] }, 100] }] },
                    // Return on Investment (ROI) - handle division by zero
                    roi: { $cond: [{ $eq: ['$totalSpend', 0] }, 0, { $multiply: [{ $divide: [{ $subtract: ['$totalRevenue', '$totalSpend'] }, '$totalSpend'] }, 100] }] }
                }
            },
            { $sort: { status: 1, name: 1 } } // Sort by status, then name
        ]);
        res.json(campaignsWithStats);
    } catch (error) {
        logger.error('Get Campaigns with Stats Error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// POST /campaigns/sync
exports.syncCampaigns = async (req, res) => {
    try {
        const count = await facebookService.syncCampaigns(req.user.organizationId);
        res.json({ success: true, message: `Successfully synced ${count} campaigns from Facebook.` });
    } catch (error) {
        logger.error('Sync Controller Error:', error);
        res.status(500).json({ message: 'Failed to sync campaigns. Check your Meta connection.' });
    }
};