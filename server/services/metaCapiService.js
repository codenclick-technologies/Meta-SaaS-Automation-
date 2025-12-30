const axios = require('axios');
const crypto = require('crypto');
const Settings = require('../models/Settings');

const hash = (str) => {
    if (!str) return null;
    return crypto.createHash('sha256').update(str.trim().toLowerCase()).digest('hex');
};

exports.sendConversionEvent = async (lead) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.metaAccessToken || !settings.metaPixelId) {
            console.log('CAPI Skipped: Meta Access Token or Pixel ID missing.');
            return;
        }

        // Prepare User Data for Advanced Matching (Hashing is mandatory)
        const userData = {
            em: lead.email ? [hash(lead.email)] : [],
            ph: lead.phone ? [hash(lead.phone.replace(/\D/g, ''))] : [],
        };

        const eventData = {
            data: [
                {
                    event_name: 'Lead', // Correct event type for Lead Generation
                    event_id: lead.fb_lead_id || lead._id.toString(), // Critical for deduplication
                    event_time: Math.floor(Date.now() / 1000),
                    action_source: 'system', // Indicates this happened in your CRM
                    user_data: userData,
                    custom_data: {
                        currency: 'INR',
                        value: lead.score || 1.0, // Use Lead Score as value if available
                        lead_event_source: 'CRM',
                        status: lead.status
                    }
                }
            ]
        };

        const url = `https://graph.facebook.com/v19.0/${settings.metaPixelId}/events`;

        await axios.post(url, eventData, {
            params: { access_token: settings.metaAccessToken }
        });

        console.log(`Meta CAPI: Conversion Event sent for lead ${lead._id}`);

    } catch (error) {
        console.error('Meta CAPI Error:', error.response?.data || error.message);
    }
};