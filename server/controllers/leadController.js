const Lead = require('../models/Lead');
const Log = require('../models/Log');
const leadService = require('../services/leadService');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const metaCapiService = require('../services/metaCapiService');
const logger = require('../utils/logger');

// GET /leads
// GET /leads
exports.getLeads = async (req, res) => {
    try {
        const { status, dateFrom, dateTo, search } = req.query;
        let query = {};

        // RBAC: If Sales, only see assigned leads
        if (req.user.role === 'sales') {
            query.assignedTo = req.user.id;
        }

        // Filter by Date
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
            if (dateTo) query.createdAt.$lte = new Date(dateTo);
        }

        // Filter by Status / Quality
        if (status === 'Spam') {
            query.quality = 'Spam';
        } else {
            query.quality = { $ne: 'Spam' }; // Default: Hide Spam
            if (status) {
                query.$or = [
                    { 'status.email': status },
                    { 'status.whatsapp': status },
                    { status: status } // Also filter by main status
                ];
            }
        }

        // Search
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        const leads = await Lead.find(query)
            .populate('assignedTo', 'name email') // Show who it is assigned to
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        console.error('Get Leads Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /leads/:id
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (lead) res.json(lead);
        else res.status(404).json({ message: 'Lead not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /leads/:id/logs
exports.getLeadLogs = async (req, res) => {
    try {
        const logs = await Log.find({ leadId: req.params.id }).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

// POST /leads/:id/retry-email
exports.retryEmail = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).send('Lead not found');

        try {
            await emailService.sendWelcomeEmail(lead);
            lead.status.email = 'sent';
            await logger.dbLog(lead._id, 'email', 'sent');
            await lead.save();
            req.io.emit('update_lead', lead);
            res.json({ message: 'Email retried successfully', lead });
        } catch (err) {
            lead.status.email = 'failed';
            await logger.dbLog(lead._id, 'email', 'failed', { error: err.message });
            await lead.save();
            req.io.emit('update_lead', lead);
            res.status(500).json({ message: 'Retry failed', error: err.message });
        }

    } catch (error) {
        res.status(500).send(error.message);
    }
};

// POST /leads/:id/retry-whatsapp
exports.retryWhatsapp = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).send('Lead not found');

        try {
            await whatsappService.sendWelcomeMessage(lead);
            lead.status.whatsapp = 'sent';
            await logger.dbLog(lead._id, 'whatsapp', 'sent');
            await lead.save();
            req.io.emit('update_lead', lead);
            res.json({ message: 'WhatsApp retried successfully', lead });
        } catch (err) {
            lead.status.whatsapp = 'failed';
            await logger.dbLog(lead._id, 'whatsapp', 'failed', { error: err.message });
            await lead.save();
            req.io.emit('update_lead', lead);
            res.status(500).json({ message: 'Retry failed', error: err.message });
        }

    } catch (error) {
        res.status(500).send(error.message);
    }
};

// PUT /leads/:id/status
exports.updateLeadStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        lead.status = status;
        await lead.save();

        // If status is 'Converted', send event to Meta CAPI
        if (status === 'Converted') {
            metaCapiService.sendConversionEvent(lead).catch(err => console.error('CAPI Trigger Error:', err.message));
        }

        res.json(lead);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/assign
exports.assignLead = async (req, res) => {
    try {
        const { assignedTo } = req.body; // User ID
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        lead.assignedTo = assignedTo;
        await lead.save();

        // populated for frontend return
        await lead.populate('assignedTo', 'name');

        req.io.emit('update_lead', lead); // Realtime update
        res.json(lead);
    } catch (error) {
        console.error('Assign Lead Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/restore
exports.restoreLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        lead.quality = 'Medium';
        lead.score = Math.max(lead.score, 50); // Reset score to a safe medium value
        await lead.save();

        if (req.io) req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (error) {
        console.error('Restore Lead Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/spam
exports.markSpam = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        lead.quality = 'Spam';
        lead.score = 0;
        await lead.save();

        if (req.io) req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (error) {
        console.error('Mark Spam Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /leads/:id
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findById(req.params.id);
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        // Delete associated logs
        await Log.deleteMany({ leadId: lead._id });

        // Delete the lead
        await Lead.findByIdAndDelete(req.params.id);

        // Notify clients
        if (req.io) {
            req.io.emit('delete_lead', req.params.id);
        }

        res.json({ message: 'Lead deleted' });
    } catch (error) {
        console.error('Delete Lead Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// POST /leads/delete-batch
exports.deleteLeads = async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No IDs provided' });
        }

        // Delete logs for these leads
        await Log.deleteMany({ leadId: { $in: ids } });

        // Delete leads
        await Lead.deleteMany({ _id: { $in: ids } });

        // Notify clients (bulk event or just refresh)
        if (req.io) {
            req.io.emit('bulk_delete', ids);
        }

        res.json({ message: `${ids.length} leads deleted successfully` });
    } catch (error) {
        console.error('Bulk Delete Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
