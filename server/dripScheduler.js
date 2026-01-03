const cron = require('node-cron');
const Lead = require('./models/Lead');
const Settings = require('./models/Settings');
const smsService = require('./services/smsService');

module.exports = () => {
    // Run every hour at minute 0 (e.g., 1:00, 2:00, 3:00)
    cron.schedule('0 * * * *', async () => {
        console.log('Running Drip Campaign Scheduler...');
        try {
            // Feature: Show total leads received today for visibility
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const leadsToday = await Lead.countDocuments({ createdAt: { $gte: startOfDay } });
            console.log(`[Daily Stats] Total Leads Received Today: ${leadsToday}`);

            const settings = await Settings.getSettings();

            // Check if Drip is enabled in Settings
            if (!settings.dripCampaignEnabled) return;

            // Logic: Find leads created > 24 hours ago, still 'New', and haven't received SMS yet
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const pendingLeads = await Lead.find({
                createdAt: { $lte: oneDayAgo }, // Older than 24 hours
                status: 'New',
                smsStatus: { $ne: 'sent' }, // SMS not sent yet
                phone: { $exists: true, $ne: '' }
            }); // Limit removed to process ALL pending leads

            if (pendingLeads.length > 0) {
                console.log(`Found ${pendingLeads.length} pending leads for Drip SMS. Processing all...`);

                for (const lead of pendingLeads) {
                    const message = `Hi ${lead.name}, just checking if you saw our email? Let us know if you have questions! - ${settings.companyName}`;

                    const res = await smsService.sendSMS(lead, message);

                    if (res.status === 'sent') {
                        lead.smsStatus = 'sent';
                        lead.logs.push({ channel: 'sms', status: 'sent', response: { type: 'drip_campaign' } });
                        lead.messages.push({
                            direction: 'outbound',
                            type: 'sms',
                            body: message
                        });
                        await lead.save();
                    }
                }
            }
        } catch (error) {
            console.error('Drip Scheduler Error:', error.message);
        }
    });
};