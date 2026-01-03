const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');
const twilio = require('twilio');
const Settings = require('../models/Settings');

// POST /webhooks/twilio/sms
router.post('/sms', async (req, res) => {
    try {
        // 1. Security: Validate that the request is coming from Twilio
        const settings = await Settings.getSettings();
        const authToken = settings.twilioAuthToken;

        if (authToken) {
            const signature = req.headers['x-twilio-signature'];

            // Construct the full URL. Ensure your server is reachable via this URL.
            // If behind a proxy (like Nginx/Heroku), ensure X-Forwarded headers are set.
            // FIX: Use process.env.API_URL if available to handle proxy mismatches reliably.
            let url;
            if (process.env.API_URL) {
                url = `${process.env.API_URL}${req.originalUrl}`;
            } else {
                const protocol = req.headers['x-forwarded-proto'] || req.protocol;
                const host = req.headers['x-forwarded-host'] || req.get('host');
                url = `${protocol}://${host}${req.originalUrl}`;
            }

            const isValid = twilio.validateRequest(authToken, signature, url, req.body);

            if (!isValid) {
                console.warn(`[Twilio Security] Invalid Signature. URL calculated: ${url}`);
                return res.status(403).send('Forbidden');
            }
        }

        const { From, Body } = req.body;

        console.log(`[Twilio Webhook] Received SMS from ${From}: ${Body}`);

        // Find lead by phone number
        const lead = await Lead.findOne({ phone: From });

        if (lead) {
            // Add message to chat history
            lead.messages.push({
                direction: 'inbound',
                type: 'sms',
                body: Body
            });

            // Handle Opt-Out Keywords (STOP, UNSUBSCRIBE, etc.)
            const upperBody = Body.trim().toUpperCase();
            if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(upperBody)) {
                console.log(`[Twilio Webhook] Opt-out received from ${From}`);
                lead.status = 'Lost';
                lead.logs.push({
                    channel: 'sms',
                    status: 'opt-out',
                    response: { message: `User sent ${upperBody}` }
                });

                // Send auto-reply via TwiML
                const twiml = new twilio.twiml.MessagingResponse();
                const replyMsg = 'You have been unsubscribed. No further messages will be sent.';
                twiml.message(replyMsg);

                // Save the auto-reply to chat history
                lead.messages.push({ direction: 'outbound', type: 'sms', body: replyMsg });
                await lead.save();

                if (req.io) {
                    req.io.emit('lead_updated', lead);
                    req.io.emit('admin_notification', {
                        type: 'critical',
                        title: 'Lead Opted Out',
                        message: `Lead ${lead.name} (${lead.phone}) replied "${upperBody}". Status set to Lost.`,
                        timestamp: new Date()
                    });
                }
                res.set('Content-Type', 'text/xml');
                return res.send(twiml.toString());
            }

            // Update status to indicate they replied
            if (lead.status === 'New' || lead.status === 'Contacted') {
                lead.status = 'Interested';
            }

            await lead.save();

            // Real-time update to Dashboard
            if (req.io) {
                req.io.emit('lead_updated', lead);
            }
        }

        // Twilio expects an XML response (TwiML) or an empty 200 OK
        res.set('Content-Type', 'text/xml');
        res.send('<Response></Response>');

    } catch (error) {
        console.error('Twilio Webhook Error:', error);
        res.status(500).send('Error');
    }
});

module.exports = router;