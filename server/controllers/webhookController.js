const Settings = require('../models/Settings');
const leadService = require('../services/leadService');
const logger = require('../utils/logger');

// GET /webhook (Verification)
exports.verifyWebhook = async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        const settings = await Settings.getSettings();
        if (mode === 'subscribe' && token === settings.verifyToken) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400);
    }
};

// POST /webhook (Event Reception)
exports.handleWebhook = async (req, res) => {
    try {
        const body = req.body;

        if (body.object === 'page') {
            // Return 200 OK immediately to avoid timeout
            res.status(200).send('EVENT_RECEIVED');

            body.entry.forEach(entry => {
                entry.changes.forEach(change => {
                    if (change.field === 'leadgen') {
                        // Extract lead_id
                        const leadId = change.value.leadgen_id;

                        // Check if this is a simulation (has field_data directly)
                        if (leadId && leadId.startsWith('LEAD_') && change.value.field_data) {
                            leadService.processNewLead(leadId, req.io, change.value); // Pass raw data
                        } else {
                            // Process normally via Graph API
                            leadService.processNewLead(leadId, req.io);
                        }
                    }
                });
            });
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        logger.error('Webhook Error', error);
        // Even on error, we often want to return 200 to Facebook to prevent retries of bad payloads
        if (!res.headersSent) res.sendStatus(200);
    }
};
