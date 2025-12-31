const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const { sendWelcomeEmail } = require('../services/emailService');
const { sendWelcomeMessage } = require('../services/whatsappService');

// @route   GET /leads
// @desc    Get all leads with pagination, filtering, and search
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { status, dateFrom, dateTo, search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

        let query = {};

        if (status) {
            if (status === 'failed') {
                query.$or = [{ emailStatus: 'failed' }, { whatsappStatus: 'failed' }];
            } else {
                query.status = status;
            }
        }

        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ];
        }

        const leads = await Lead.find(query)
            .populate('assignedTo', 'name')
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Lead.countDocuments(query);

        res.json({
            leads,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Other lead routes (POST, PUT, DELETE) would go here...

router.get('/:id', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id).populate('assignedTo', 'name');
        if (!lead) return res.status(404).json({ msg: 'Lead not found' });
        res.json(lead);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/:id/logs', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id).select('logs');
        if (!lead) return res.status(404).json({ msg: 'Lead not found' });
        res.json(lead.logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/:id/retry-email', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        await sendWelcomeEmail(lead);
        res.json({ msg: 'Email retry initiated' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.post('/:id/retry-whatsapp', async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        await sendWelcomeMessage(lead);
        res.json({ msg: 'WhatsApp retry initiated' });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        const lead = await Lead.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

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

// POST /leads/delete-batch
router.post('/delete-batch', async (req, res) => {
    try {
        const { ids, selectAll, filters } = req.body;

        let query = {};
        if (selectAll && filters) {
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
            if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: 'No IDs provided' });
            query._id = { $in: ids };
        }

        const result = await Lead.deleteMany(query);
        if (req.io) req.io.emit('bulk_delete', ids || []); // If selectAll, ids might be empty, but we trigger refresh anyway
        res.json({ message: `${result.deletedCount} leads deleted successfully` });
    } catch (error) {
        console.error('Bulk Delete Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;