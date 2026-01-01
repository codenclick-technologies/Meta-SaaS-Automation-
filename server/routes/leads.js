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

        let query = { organizationId: req.user.organizationId };

        if (status) {
            if (status === 'failed') {
                query.$or = [{ emailStatus: 'failed' }, { whatsappStatus: 'failed' }];
            } else {
                query.status = status;
            }
        }

        // Improved date handling to prevent "Invalid Date" 500 errors
        const parseDate = (d) => {
            if (!d || d === 'undefined' || d === 'null') return null;
            const date = new Date(d);
            return isNaN(date.getTime()) ? null : date;
        };

        const startDate = parseDate(dateFrom);
        const endDate = parseDate(dateTo);

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
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
            totalLeads: total,
            currentPage: parseInt(page)
        });
    } catch (err) {
        console.error('Fetch Leads Error:', err);
        res.status(500).send('Server Error');
    }
});

// Other lead routes (POST, PUT, DELETE) would go here...

router.get('/:id', async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).populate('assignedTo', 'name');
        if (!lead) return res.status(404).json({ msg: 'Lead not found' });

        // Global Compliance: Log PII Access
        const AuditService = require('../utils/auditService');
        await AuditService.logPIIAccess(req.user.id, lead.organizationId, lead._id, req.ip);

        res.json(lead);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.get('/:id/logs', async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId }).select('logs');
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
        const { status, value } = req.body;
        const lead = await Lead.findOneAndUpdate(
            { _id: req.params.id, organizationId: req.user.organizationId },
            {
                status: status,
                ...(value && { 'value.amount': value })
            },
            { new: true }
        );
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // BI Logic: Track Status Change & Revenue
        const biService = require('../services/biService');
        await biService.trackEvent({
            organizationId: lead.organizationId,
            leadId: lead._id,
            type: 'STATUS_CHANGE',
            metadata: { oldStatus: lead.status, newStatus: status }
        });

        if (status === 'Converted') {
            await biService.trackEvent({
                organizationId: lead.organizationId,
                leadId: lead._id,
                type: 'SALE_COMPLETED'
            });

            await biService.trackEvent({
                organizationId: lead.organizationId,
                leadId: lead._id,
                type: 'REVENUE_GENERATED',
                value: lead.value.amount,
                campaign: lead.rawData?.campaign_name || 'Generic Ads'
            });
        }

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