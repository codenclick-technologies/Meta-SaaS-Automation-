const Lead = require('../models/Lead');
const Log = require('../models/Log');
const Campaign = require('../models/Campaign');
const leadService = require('../services/leadService');
const emailService = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const metaCapiService = require('../services/metaCapiService');
const logger = require('../utils/logger');

// GET /leads
exports.getLeads = async (req, res) => {
    try {
        const { status, dateFrom, dateTo, search, campaignId, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
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

        // Filter by Campaign
        if (campaignId) {
            query.campaignId = campaignId;
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
    } catch (error) {
        logger.error('Get Leads Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// GET /leads/campaigns
exports.getCampaigns = async (req, res) => {
    try {
        // Aggregation pipeline to get unique campaigns with lead counts
        const campaigns = await Lead.aggregate([
            { $match: { organizationId: req.user.organizationId, campaignId: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: "$campaignId",
                    campaignName: { $first: "$campaignName" },
                    count: { $sum: 1 }
                }
            },
            { $project: { _id: 0, campaignId: "$_id", campaignName: 1, count: 1 } },
            { $sort: { campaignName: 1 } }
        ]);
        res.json(campaigns);
    } catch (error) {
        logger.error('Get Campaigns Error:', error);
        res.status(500).json({ message: 'Server Error fetching campaigns' });
    }
};

// GET /leads/:id/coaching
exports.getCoachingInsights = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
        if (!lead) return res.status(404).json({ message: 'Lead not found' });

        const logs = await Log.find({ leadId: lead._id });

        // --- Advanced Heuristic Engine ---

        // 1. Channel Affinity Calculation (Weighted Scoring)
        let emailScore = 0;
        let whatsappScore = 0;

        if (['opened', 'clicked'].includes(lead.emailStatus)) emailScore += 50;
        if (['read', 'replied'].includes(lead.whatsappStatus)) whatsappScore += 50;

        logs.forEach(log => {
            if (log.channel === 'email' && log.status === 'sent') emailScore += 5;
            if (log.channel === 'whatsapp' && log.status === 'sent') whatsappScore += 5;
        });

        const preferredChannel = emailScore > whatsappScore ? 'Email' : (whatsappScore > 0 ? 'WhatsApp' : 'Phone Call');

        // 2. Timezone & Call Window Logic (Global Awareness)
        // Approximate offsets. In a full prod env, use moment-timezone with lat/long.
        const countryOffsets = { 'US': -5, 'IN': 5.5, 'GB': 0, 'AE': 4, 'DE': 1, 'FR': 1, 'SG': 8, 'AU': 10 };
        const offset = countryOffsets[lead.country] || 0;

        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const targetTime = new Date(utc + (3600000 * offset));
        const targetHour = targetTime.getHours();

        let callWindow = 'Good time to call ✅';
        let callColor = 'green';

        if (targetHour < 9 || targetHour > 18) {
            callWindow = 'Outside business hours 🌙';
            callColor = 'red';
        } else if (targetHour >= 12 && targetHour <= 13) {
            callWindow = 'Likely Lunch Hour 🍔';
            callColor = 'orange';
        }

        // 3. Ghosting / Stagnation Detection
        const daysSinceUpdate = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        let riskLevel = 'Low';
        if (lead.status === 'New' && daysSinceUpdate > 1) riskLevel = 'High (Speed-to-lead missed)';
        if (lead.status === 'Contacted' && daysSinceUpdate > 3) riskLevel = 'Medium (Follow-up needed)';

        // 4. Next Best Action Generator (Contextual Scripting)
        let nextAction = 'Review details';
        let script = '';

        if (lead.status === 'New') {
            nextAction = 'Immediate Outreach';
            script = `Hi ${lead.name.split(' ')[0]}, I saw you just inquired about ${lead.campaignName || 'our services'}. Do you have 5 mins to chat?`;
        } else if (lead.status === 'Contacted') {
            if (riskLevel.includes('High') || riskLevel.includes('Medium')) {
                nextAction = 'Pattern Interrupt Message';
                script = `Hey ${lead.name.split(' ')[0]}, are you still looking for help with this, or should I close your file?`;
            } else {
                nextAction = 'Value Drop';
                script = `Sharing a case study relevant to your industry...`;
            }
        } else if (lead.status === 'Converted') {
            nextAction = 'Onboarding / Upsell';
            script = `Welcome aboard! Let's schedule your kickoff call.`;
        }

        res.json({
            preferredChannel,
            localTime: targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            callWindow,
            callColor,
            riskLevel,
            nextAction,
            suggestedScript: script,
            engagementScore: Math.min(emailScore + whatsappScore, 100)
        });

    } catch (error) {
        logger.error('Coaching Error:', error);
        res.status(500).json({ message: 'Server Error' });
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
            // Update Campaign Revenue
            if (lead.campaignId && lead.value?.amount > 0) {
                await Campaign.findOneAndUpdate(
                    { campaignId: lead.campaignId, organizationId: req.user.organizationId },
                    { $inc: { totalRevenue: lead.value.amount } }
                );
            }
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
