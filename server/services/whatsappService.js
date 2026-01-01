const axios = require('axios');
const Settings = require('../models/Settings');

exports.sendWelcomeMessage = async (lead) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.metaAccessToken || !settings.metaPhoneId) {
            console.log('WhatsApp skipped: No Meta Credentials configured.');
            return { status: 'skipped', error: 'No Credentials' };
        }

        // Format phone number (remove + or spaces if necessary, Meta requires country code)
        // Assuming Facebook sends clean format, otherwise add logic here.
        // Professional Fix: Remove all non-numeric characters (spaces, dashes, +)
        const phone = lead.phone ? lead.phone.replace(/\D/g, '') : '';

        const url = `https://graph.facebook.com/v19.0/${settings.metaPhoneId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
                name: settings.whatsappTemplateName,
                language: { code: 'en_US' } // Adjust based on your template language
            }
        };

        await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${settings.metaAccessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`WhatsApp sent to ${phone}`);
        return { status: 'sent' };
    } catch (error) {
        console.error('WhatsApp Error:', error.response?.data || error.message);
        return { status: 'failed', error: error.response?.data?.error?.message || error.message };
    }
};

exports.sendCustomMessage = async (lead, config, credentials) => {
    try {
        const accessToken = credentials.accessToken || credentials.apiKey;
        const phoneId = credentials.metadata?.phoneId || 'default';

        if (!accessToken) throw new Error('No Meta Access Token');

        const phone = lead.phone ? lead.phone.replace(/\D/g, '') : '';
        const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            to: phone,
            type: config.templateName ? 'template' : 'text',
            template: config.templateName ? {
                name: config.templateName,
                language: { code: config.languageCode || 'en_US' }
            } : undefined,
            text: !config.templateName ? { body: config.body } : undefined
        };

        await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        return { status: 'sent' };
    } catch (error) {
        return { status: 'failed', error: error.message };
    }
};