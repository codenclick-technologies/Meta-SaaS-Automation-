const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// Helper: Validate Date
const isValidDate = (d) => d instanceof Date && !isNaN(d);

// @route   GET /analytics/daily-leads
// @desc    Get leads acquired per day for the last 30 days
// @access  Private
router.get('/daily-leads', async (req, res) => {
    try {
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
router.get('/status-distribution', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let matchStage = {};

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
router.get('/dashboard-stats', async (req, res) => {
    try {
        const [total, newLeads, converted, failed, emailSent, whatsappSent] = await Promise.all([
            Lead.countDocuments({}),
            Lead.countDocuments({ status: 'New' }),
            Lead.countDocuments({ status: 'Converted' }),
            Lead.countDocuments({ $or: [{ emailStatus: 'failed' }, { whatsappStatus: 'failed' }] }),
            Lead.countDocuments({ emailStatus: { $in: ['sent', 'delivered', 'opened', 'clicked'] } }),
            Lead.countDocuments({ whatsappStatus: { $in: ['sent', 'delivered', 'read'] } })
        ]);

        const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

        res.json({
            total,
            pending: newLeads,
            conversionRate,
            failed,
            emailSent,
            whatsappSent
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;