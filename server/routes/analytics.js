const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Lead = require('../models/Lead');
const mongoose = require('mongoose'); // Import mongoose

// Helper: Validate Date
const isValidDate = (d) => d instanceof Date && !isNaN(d);

// @route   GET /analytics/daily-leads
// @desc    Get leads acquired per day for the last 30 days
// @access  Private
router.get('/daily-leads', auth, async (req, res) => {
    try {
        const { organizationId } = req.user; // Get from auth middleware
        const { startDate, endDate } = req.query;
        let start, end;

        if (startDate) {
            start = new Date(startDate);
            if (!isValidDate(start)) {
                return res.status(400).json({ message: 'Invalid startDate format' });
            }
        } else {
            start = new Date();
            start.setDate(start.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        }

        if (endDate) {
            end = new Date(endDate);
            if (!isValidDate(end)) {
                return res.status(400).json({ message: 'Invalid endDate format' });
            }
        } else {
            end = new Date();
        }

        const stats = await Lead.aggregate([
            {
                $match: {
                    organizationId: new mongoose.Types.ObjectId(organizationId),
                    createdAt: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // Fill in missing dates with 0 for the selected range
        const filledStats = [];
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        for (let i = 0; i <= diffDays; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            if (d > end) break;

            const found = stats.find(s => s._id === dateStr);
            filledStats.push({
                date: dateStr,
                leads: found ? found.count : 0
            });
        }

        res.json(filledStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /analytics/status-distribution
// @desc    Get lead count by status for Pie Chart
// @access  Private
router.get('/status-distribution', auth, async (req, res) => {
    try {
        const { organizationId } = req.user; // Get from auth middleware
        const { startDate, endDate } = req.query;
        let matchStage = {
            organizationId: new mongoose.Types.ObjectId(organizationId),
        };

        if (startDate || endDate) {
            matchStage.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                if (!isValidDate(start)) return res.status(400).json({ message: 'Invalid startDate' });
                matchStage.createdAt.$gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (!isValidDate(end)) return res.status(400).json({ message: 'Invalid endDate' });
                matchStage.createdAt.$lte = end;
            }
        }

        const stats = await Lead.aggregate([
            {
                $match: matchStage
            },
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedStats = stats.map(s => ({
            name: s._id || 'Unknown',
            value: s.count
        }));

        res.json(formattedStats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /analytics/dashboard-stats
// @desc    Get aggregated stats for dashboard cards
// @access  Private
router.get('/dashboard-stats', auth, async (req, res) => {
    try {
        const { organizationId } = req.user; // Get from auth middleware
        const orgFilter = { organizationId: new mongoose.Types.ObjectId(organizationId) };

        const [total, newLeads, converted, failed, emailSent, whatsappSent, highIntent, aiStats] = await Promise.all([
            Lead.countDocuments(orgFilter),
            Lead.countDocuments({ ...orgFilter, status: 'New' }),
            Lead.countDocuments({ ...orgFilter, status: 'Converted' }),
            Lead.countDocuments({ ...orgFilter, $or: [{ emailStatus: 'failed' }, { whatsappStatus: 'failed' }] }),
            Lead.countDocuments({ ...orgFilter, emailStatus: { $in: ['sent', 'delivered', 'opened', 'clicked'] } }),
            Lead.countDocuments({ ...orgFilter, whatsappStatus: { $in: ['sent', 'delivered', 'read'] } }),
            Lead.countDocuments({ ...orgFilter, 'aiAnalysis.score': { $gte: 80 } }),
            Lead.aggregate([
                { $match: orgFilter },
                { $group: { _id: null, avgScore: { $avg: '$aiAnalysis.score' } } }
            ])
        ]);

        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;
        const avgAIScore = aiStats.length > 0 ? Math.round(aiStats[0].avgScore) : 0;

        res.json({
            total,
            pending: newLeads,
            conversionRate,
            failed,
            emailSent,
            whatsappSent,
            highIntent,
            avgAIScore
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /analytics/regional-revenue
// @desc    Get Lead Density and Financial Value by Country for Global Dashboard
// @access  Private
router.get('/regional-revenue', auth, async (req, res) => {
    try {
        const { organizationId } = req.user;
        const orgFilter = { organizationId: new mongoose.Types.ObjectId(organizationId) };

        const stats = await Lead.aggregate([
            { $match: orgFilter },
            {
                $group: {
                    _id: "$country",
                    leadCount: { $sum: 1 },
                    totalRevenue: { $sum: "$value.amount" },
                    convertedLeads: {
                        $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] }
                    }
                }
            },
            {
                $project: {
                    country: "$_id",
                    leadCount: 1,
                    totalRevenue: 1,
                    conversionRate: {
                        $cond: [
                            { $gt: ["$leadCount", 0] },
                            { $multiply: [{ $divide: ["$convertedLeads", "$leadCount"] }, 100] },
                            0
                        ]
                    }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.json(stats);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;