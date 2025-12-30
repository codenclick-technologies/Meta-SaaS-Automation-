const Settings = require('../models/Settings');
const axios = require('axios');

// @desc    Get system settings
// @route   GET /settings
// @access  Private/Admin
const getSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update system settings
// @route   PUT /settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        const settings = await Settings.getSettings();

        const fields = [
            'sendgridApiKey', 'emailFrom', 'metaAccessToken',
            'metaPhoneId', 'metaBusinessId', 'metaPixelId', 'twilioSid', 'twilioAuthToken', 'twilioPhone', 'emailSubject',
            'emailBody', 'brochureUrl', 'includeBrochure', 'dripCampaignEnabled',
            'whatsappTemplateName', 'verifyToken'
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined) {
                settings[field] = req.body[field];
            }
        });

        const updatedSettings = await settings.save();
        res.json(updatedSettings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Verify SendGrid API Key
// @route   POST /settings/verify-email
// @access  Private/Admin
const verifySendGrid = async (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ message: 'API Key is required' });
    }

    try {
        // Verify API Key by fetching scopes from SendGrid
        await axios.get('https://api.sendgrid.com/v3/scopes', {
            headers: { Authorization: `Bearer ${apiKey}` }
        });

        res.json({ success: true, message: 'SendGrid Connection Successful!' });
    } catch (error) {
        console.error('SendGrid Verification Error:', error.response?.data || error.message);
        res.status(400).json({
            message: 'Connection Failed',
            error: 'Invalid API Key or SendGrid is down.'
        });
    }
};

// @desc    Verify Meta/WhatsApp Credentials
// @route   POST /settings/verify-whatsapp
// @access  Private/Admin
const verifyMeta = async (req, res) => {
    const { accessToken, phoneId } = req.body;

    if (!accessToken || !phoneId) {
        return res.status(400).json({ message: 'Access Token and Phone ID are required' });
    }

    try {
        // Verify by fetching phone number details from Graph API
        await axios.get(`https://graph.facebook.com/v17.0/${phoneId}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        res.json({ success: true, message: 'WhatsApp Connection Successful!' });
    } catch (error) {
        console.error('Meta Verification Error:', error.response?.data || error.message);
        res.status(400).json({
            message: 'Connection Failed',
            error: error.response?.data?.error?.message || 'Invalid Token or Phone ID'
        });
    }
};

module.exports = { getSettings, updateSettings, verifySendGrid, verifyMeta };