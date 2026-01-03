const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const Campaign = require('../models/Campaign');
const Settings = require('../models/Settings');

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

/**
 * Syncs Campaigns from Facebook Ad Account
 * This is an advanced background process.
 */
const syncCampaigns = async (organizationId) => {
    try {
        // Fetch settings for the specific organization
        // Assuming Settings model has organizationId field
        const settings = await Settings.findOne({ organizationId });

        if (!settings) return;

        if (!settings.metaAccessToken || !settings.metaBusinessId) {
            logger.warn('Campaign Sync Skipped: Missing Meta Credentials');
            return;
        }

        // 1. Get Ad Accounts attached to the Business Manager or User
        // In a real multi-tenant app, you'd store the specific Ad Account ID in settings.
        // For now, we'll fetch the first active ad account.
        const adAccountsRes = await axios.get(`https://graph.facebook.com/v19.0/me/adaccounts`, {
            params: {
                access_token: settings.metaAccessToken,
                fields: 'id,name,currency'
            }
        });

        const adAccounts = adAccountsRes.data.data;
        if (!adAccounts || adAccounts.length === 0) return;

        const adAccountId = adAccounts[0].id; // Using first account for MVP

        // 2. Fetch Campaigns for this Ad Account
        const campaignsRes = await axios.get(`https://graph.facebook.com/v19.0/${adAccountId}/campaigns`, {
            params: {
                access_token: settings.metaAccessToken,
                fields: 'id,name,status,objective,daily_budget,insights{spend}', // Fetch spend insights
                limit: 100
            }
        });

        const campaigns = campaignsRes.data.data;

        // 3. Upsert Campaigns into DB
        for (const camp of campaigns) {
            await Campaign.findOneAndUpdate(
                { campaignId: camp.id, organizationId },
                {
                    name: camp.name,
                    status: camp.status,
                    objective: camp.objective,
                    dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : 0, // Meta returns budget in cents
                    totalSpend: camp.insights ? parseFloat(camp.insights.data[0].spend) : 0,
                    lastSynced: new Date(),
                    metadata: camp
                },
                { upsert: true, new: true }
            );
        }

        logger.info(`Synced ${campaigns.length} campaigns for Org ${organizationId}`);
        return campaigns.length;

    } catch (error) {
        logger.error('Campaign Sync Error:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Syncs campaigns for ALL organizations (Background Job)
 */
const syncAllCampaigns = async () => {
    try {
        const allSettings = await Settings.find({ metaAccessToken: { $exists: true, $ne: '' } });
        logger.info(`Starting hourly campaign sync for ${allSettings.length} organizations...`);

        for (const setting of allSettings) {
            try {
                await syncCampaigns(setting.organizationId);
            } catch (orgError) {
                logger.error(`Failed to sync campaigns for Org ${setting.organizationId}: ${orgError.message}`);
                // Continue to the next organization
            }
        }
    } catch (error) {
        logger.error('Global Campaign Sync Error:', error);
    }
};

module.exports = { fetchLead, syncCampaigns, syncAllCampaigns };
