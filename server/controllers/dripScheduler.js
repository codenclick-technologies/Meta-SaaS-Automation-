const cron = require('node-cron');
const Lead = require('../models/Lead');
const Settings = require('../models/Settings');
const whatsappService = require('../services/whatsappService');
const smsService = require('../services/smsService');
const logger = require('../utils/logger');

const initDripScheduler = () => {
    // Run every hour at minute 0
    cron.schedule('0 * * * *', async () => {
        console.log('[CRON] Running Drip Campaign Check...');

        const settings = await Settings.getSettings();

        // Check if the feature is enabled from the UI
        if (!settings.dripCampaignEnabled) {
            console.log('[CRON] Drip campaign is disabled in settings. Skipping.');
            return;
        }

        const now = new Date();
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
        const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);

        // --- STEP 1: Email -> WhatsApp Fallback ---
        // Logic: Created > 24h ago, Email Sent but NOT Opened, WhatsApp Pending
        try {
            const leadsForWhatsapp = await Lead.find({
                createdAt: { $lt: twentyFourHoursAgo },
                emailStatus: 'sent', // 'sent' means it was sent but not yet 'opened'
                whatsappStatus: 'pending',
                quality: { $ne: 'Spam' } // Don't waste money on spam
            });

            if (leadsForWhatsapp.length > 0) {
                console.log(`[CRON] Found ${leadsForWhatsapp.length} leads for WhatsApp fallback.`);
            }

            for (const lead of leadsForWhatsapp) {
                console.log(`[Drip] Sending WhatsApp fallback to ${lead.email}`);
                const res = await whatsappService.sendWelcomeMessage(lead);

                lead.whatsappStatus = res.status;
                if (res.error) {
                    await logger.dbLog(lead._id, 'whatsapp', 'failed', { error: res.error, trigger: 'drip_fallback' });
                } else {
                    await logger.dbLog(lead._id, 'whatsapp', 'sent', { trigger: 'drip_fallback' });
                }
                await lead.save();
            }
        } catch (err) {
            console.error('[CRON] Drip Step 1 (WhatsApp) Error:', err);
        }

        // --- STEP 2: WhatsApp -> SMS Fallback ---
        // Logic: Created > 48h ago, WhatsApp Sent but NOT Read, SMS Pending
        try {
            const leadsForSMS = await Lead.find({
                createdAt: { $lt: fortyEightHoursAgo },
                whatsappStatus: 'sent', // 'sent' means not yet 'read' (requires Meta Webhook for 'read' status)
                smsStatus: 'pending',
                quality: { $ne: 'Spam' }
            });

            if (leadsForSMS.length > 0) {
                console.log(`[CRON] Found ${leadsForSMS.length} leads for SMS fallback.`);
            }

            for (const lead of leadsForSMS) {
                console.log(`[Drip] Sending SMS fallback to ${lead.phone}`);
                const res = await smsService.sendSMS(lead, `Hi ${lead.name}, we tried reaching you on WhatsApp. Please check our brochure or reply to this message.`);
                lead.smsStatus = res.status;
                await lead.save();
            }
        } catch (err) {
            console.error('[CRON] Drip Step 2 (SMS) Error:', err);
        }
    });
    console.log('Drip Campaign Scheduler Initialized.');
};

module.exports = initDripScheduler;