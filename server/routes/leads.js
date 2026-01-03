const express = require('express');
const router = express.Router();
const {
    getLeads,
    getLeadById,
    getLeadLogs,
    retryEmail,
    retryWhatsapp,
    updateLeadStatus,
    assignLead,
    deleteLead,
    deleteLeads,
    restoreLead,
    markSpam,
    getCampaigns,
    getCoachingInsights
} = require('../controllers/leadController');

// @route   GET /leads
// @desc    Get all leads with pagination, filtering, and search
// @access  Private
router.get('/', getLeads);

// @route   GET /leads/campaigns
// @desc    Get unique campaigns list
router.get('/campaigns', getCampaigns);

// @route   GET /leads/:id/coaching
// @desc    Get AI Sales Coach insights
router.get('/:id/coaching', getCoachingInsights);

// @route   GET /leads/:id
router.get('/:id', getLeadById);

// @route   GET /leads/:id/logs
router.get('/:id/logs', getLeadLogs);

// @route   POST /leads/:id/retry-email
router.post('/:id/retry-email', retryEmail);

// @route   POST /leads/:id/retry-whatsapp
router.post('/:id/retry-whatsapp', retryWhatsapp);

// @route   PUT /leads/:id/status
router.put('/:id/status', updateLeadStatus);

// @route   PUT /leads/:id/assign
router.put('/:id/assign', assignLead);

// @route   PUT /leads/:id/restore
router.put('/:id/restore', restoreLead);

// @route   PUT /leads/:id/spam
router.put('/:id/spam', markSpam);

// @route   DELETE /leads/:id
router.delete('/:id', deleteLead);

// POST /leads/assign-batch
router.post('/assign-batch', async (req, res) => {
    try {
        const { ids, assignedTo, selectAll, filters } = req.body;

        let query = {};
        if (selectAll && filters) {
            // Reconstruct query from filters
            const { status, dateFrom, dateTo, search } = filters;
            if (status) {
                if (status === 'failed') query.$or = [{ emailStatus: 'failed' }, { whatsappStatus: 'failed' }];
                else query.status = status;
            }
            if (dateFrom || dateTo) {
                query.createdAt = {};
                if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
                if (dateTo) query.createdAt.$lte = new Date(dateTo);
            }
            if (search) {
                const searchRegex = new RegExp(search, 'i');
                query.$or = [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }];
            }
        } else {
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'No IDs provided' });
            }
            query._id = { $in: ids };
        }

        const result = await Lead.updateMany(query, { $set: { assignedTo: assignedTo || null } });

        await Lead.updateMany(
            query,
            { $set: { assignedTo: assignedTo || null } }
        );

        // Notify clients about the bulk update
        if (req.io) {
            req.io.emit('bulk_update');
        }

        res.json({ message: `${result.modifiedCount} leads assigned successfully` });
    } catch (error) {
        console.error('Bulk Assign Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /leads/by-date
// @desc    Delete leads within a date range (Admin only)
// @access  Private (Admin)
router.delete('/by-date', async (req, res) => {
    // Double-check for admin role, even though route is protected
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admins only' });
    }

    try {
        const { dateFrom, dateTo } = req.query;
        if (!dateFrom || !dateTo) {
            return res.status(400).json({ message: 'Both start and end dates are required' });
        }

        const result = await Lead.deleteMany({
            createdAt: { $gte: new Date(dateFrom), $lte: new Date(dateTo) }
        });

        res.json({ message: `Successfully deleted ${result.deletedCount} leads.` });
    } catch (error) {
        console.error('Bulk Delete by Date Error:', error);
        res.status(500).json({ message: 'Server error during bulk deletion' });
    }
});

// @route   POST /leads/delete-batch
router.post('/delete-batch', deleteLeads);

module.exports = router;