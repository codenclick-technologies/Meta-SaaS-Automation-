const express = require('express');
const router = express.Router();
const { sendSMS } = require('../services/smsService');
const Lead = require('../models/Lead');

// POST /sms/send - Manual SMS from Dashboard
router.post('/send', async (req, res) => {
    const { leadId, message } = req.body;

    if (!leadId || !message) {
        return res.status(400).json({ success: false, message: 'Lead ID and Message are required' });
    }

    try {
        // 1. Find the Lead
        const lead = await Lead.findById(leadId);
        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // 2. Send Real SMS via Service
        const result = await sendSMS(lead, message);

        // 3. Update Database Status & Logs
        if (result.status === 'sent') {
            lead.smsStatus = 'sent';
            lead.logs.push({ channel: 'sms', status: 'sent', response: { message: 'Manual SMS sent' } });
            lead.messages.push({
                direction: 'outbound',
                type: 'sms',
                body: message
            });
            await lead.save();
            return res.json({ success: true });
        } else {
            lead.smsStatus = 'failed';
            lead.logs.push({ channel: 'sms', status: 'failed', response: { error: result.error } });
            await lead.save();
            return res.status(500).json({ success: false, message: result.error });
        }
    } catch (error) {
        console.error('SMS Route Error:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

module.exports = router;