const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const fetchLead = async (leadId) => {
    try {
        const url = `https://graph.facebook.com/v19.0/${leadId}?access_token=${config.facebook.pageAccessToken}`;
        const response = await axios.get(url);
        const data = response.data;

        // Normalize Data (assuming standard field questions, might need adjustment based on form)
        let email = '';
        let phone = '';
        let full_name = '';

        if (data.field_data) {
            data.field_data.forEach(field => {
                if (field.name === 'email') email = field.values[0];
                if (field.name === 'phone_number') phone = field.values[0];
                if (field.name === 'full_name') full_name = field.values[0];
            });
        }

        // Fallback if field names are different or not found in field_data
        // Sometimes simple leads just have keys at root or different field names
        // This part is highly dependent on how the Lead Ad Form is set up.

        return {
            fb_lead_id: data.id,
            page_id: config.facebook.pageId, // Note: facebook hook gives page_id, here we might not have it unless passed
            form_id: data.form_id,
            name: full_name || 'Valued Lead',
            email: email,
            phone: phone,
            raw: data
        };
    } catch (error) {
        logger.error('Error fetching lead from Facebook:', error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = { fetchLead };
