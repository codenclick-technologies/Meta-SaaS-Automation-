const Lead = require('../models/Lead');
const Log = require('../models/Log');
const leadService = require('../services/leadService');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const metaCapiService = require('../services/metaCapiService');
const logger = require('../utils/logger');

// GET /leads
exports.getLeads = async (req, res) => {
    try {
        const { status, dateFrom, dateTo, search } = req.query;
        // Base query for multi-tenancy
        let query = { organizationId: req.user.organizationId };

        // RBAC: If Sales, only see assigned leads within their organization
        if (req.user.role === 'sales') {
            query.assignedTo = req.user.id;
        }

        // Filter by Date
        if (dateFrom || dateTo) {
            query.createdAt = {};
            if (dateFrom && dateFrom !== 'undefined' && dateFrom !== 'null') {
                query.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo && dateTo !== 'undefined' && dateTo !== 'null') {
                query.createdAt.$lte = new Date(dateTo);
            }
        }

        // Filter by Status / Quality
        if (status === 'Spam') {
            query.quality = 'Spam';
        } else {
            query.quality = { $ne: 'Spam' };
            if (status) {
                query.status = status;
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
            .populate('assignedTo', 'name email')
            .sort({ createdAt: -1 });
        res.json(leads);
    } catch (error) {
        logger.error('Get Leads Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /leads/:id
exports.getLeadById = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (lead) {
            res.json(lead);
        } else {
            res.status(404).json({ message: 'Lead not found or you do not have permission to view it.' });
        }
    } catch (error) {
        logger.error(`Error fetching lead ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
};

// GET /leads/:id/logs
exports.getLeadLogs = async (req, res) => {
    try {
        // First, verify the user has access to the lead
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) {
            return res.status(404).json({ message: 'Lead not found or you do not have permission.' });
        }
        const logs = await Log.find({ leadId: req.params.id }).sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        logger.error(`Error fetching logs for lead ${req.params.id}:`, error);
        res.status(500).json({ message: error.message });
    }
}

// POST /leads/:id/retry-email
exports.retryEmail = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).send('Lead not found');

        try {
            await emailService.sendWelcomeEmail(lead);
            lead.emailStatus = 'sent';
            await logger.dbLog(lead._id, 'email', 'sent');
            await lead.save();
            req.io.emit('update_lead', lead);
            res.json({ message: 'Email retried successfully', lead });
        } catch (err) {
            lead.emailStatus = 'failed';
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
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).send('Lead not found');

        try {
            await whatsappService.sendWelcomeMessage(lead);
            lead.whatsappStatus = 'sent';
            await logger.dbLog(lead._id, 'whatsapp', 'sent');
            await lead.save();
            req.io.emit('update_lead', lead);
            res.json({ message: 'WhatsApp retried successfully', lead });
        } catch (err) {
            lead.whatsappStatus = 'failed';
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
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }

        lead.status = status;
        await lead.save();

        if (status === 'Converted') {
            metaCapiService.sendConversionEvent(lead).catch(err => logger.error('CAPI Trigger Error:', err.message));
        }

        res.json(lead);
    } catch (error) {
        logger.error(`Error updating lead status for ${req.params.id}:`, error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/assign
exports.assignLead = async (req, res) => {
    try {
        const { assignedTo } = req.body; // User ID
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });

        if (!lead) {
            return res.status(404).json({ message: 'Lead not found' });
        }
        
        // Optional: Ensure the user being assigned to is in the same organization
        // const userToAssign = await User.findOne({ _id: assignedTo, organizationId: req.user.organizationId });
        // if (!userToAssign) {
        //     return res.status(400).json({ message: 'Assigned user does not exist or is not in your organization.' });
        // }

        lead.assignedTo = assignedTo;
        await lead.save();

        await lead.populate('assignedTo', 'name');

        req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (error) {
        logger.error('Assign Lead Error', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/restore
exports.restoreLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        lead.quality = 'Medium';
        lead.score = Math.max(lead.score, 50);
        await lead.save();

        if (req.io) req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (error) {
        logger.error('Restore Lead Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// PUT /leads/:id/spam
exports.markSpam = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        lead.quality = 'Spam';
        lead.score = 0;
        await lead.save();

        if (req.io) req.io.emit('update_lead', lead);
        res.json(lead);
    } catch (error) {
        logger.error('Mark Spam Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// DELETE /leads/:id
exports.deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        await Log.deleteMany({ leadId: lead._id });
        await Lead.deleteOne({ _id: lead._id });

        if (req.io) {
            req.io.emit('delete_lead', req.params.id);
        }

        res.json({ message: 'Lead deleted' });
    } catch (error) {
        logger.error('Delete Lead Error:', error);
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

        // Ensure all leads belong to the user's organization before deleting
        const query = { _id: { $in: ids }, organizationId: req.user.organizationId };
        
        const leadsToDelete = await Lead.find(query).select('_id');
        const idsToDelete = leadsToDelete.map(lead => lead._id);

        if (idsToDelete.length === 0) {
            return res.status(404).json({ message: 'No matching leads found to delete.' });
        }

        await Log.deleteMany({ leadId: { $in: idsToDelete } });
        await Lead.deleteMany({ _id: { $in: idsToDelete } });

        if (req.io) {
            req.io.emit('bulk_delete', idsToDelete);
        }

        res.json({ message: `${idsToDelete.length} leads deleted successfully` });
    } catch (error) {
        logger.error('Bulk Delete Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
