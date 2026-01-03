const OpenAI = require('openai');
const logger = require('../utils/logger');
const Integration = require('../models/Integration');
const Settings = require('../models/Settings');

class LeadIntelligenceService {
    async analyzeLead(lead, organizationId) {
        try {
            // Priority 1: Check System Settings (Global Config)
            const settings = await Settings.getSettings();
            let apiKey = settings.openaiApiKey;

            // Priority 2: Check Integration Module (Legacy/Pro)
            if (!apiKey) {
                const integration = await Integration.findOne({
                    organizationId,
                    provider: 'openai',
                    isActive: true
                });
                if (integration) {
                    apiKey = integration.credentials.apiKey || integration.credentials.accessToken;
                }
            }

            if (!apiKey) {
                // Not strictly checking org ID for global settings fallback, assuming single tenant or admin config
                logger.warn(`AI Intelligence skipped: No OpenAI API Key found in System Settings or Integrations.`);
                return null;
            }

            const openai = new OpenAI({ apiKey });

            const prompt = `
                Analyze this new sales lead from Meta Ads:
                Name: ${lead.name}
                Email: ${lead.email}
                Phone: ${lead.phone}
                Ad Source: ${lead.adName || 'Facebook/Instagram'}
                Form Data: ${JSON.stringify(lead.rawData || {})}

                Tasks:
                1. Score from 1-100 based on lead quality.
                2. Identify "Sentiments" (Positive/Neutral/Interested/Urgent).
                3. Provide a 1-sentence summary of why they are interested.
                4. Recommend next best action.

                Return ONLY a JSON object:
                {
                    "score": number,
                    "sentiment": status,
                    "summary": string,
                    "recommendedAction": string,
                    "intent": "high_intent" | "medium_intent" | "low_intent"
                }
            `;

            const response = await openai.chat.completions.create({
                model: "gpt-4-turbo-preview",
                messages: [{ role: "system", content: "You are a senior lead generation analyst." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            return JSON.parse(response.choices[0].message.content);
        } catch (error) {
            logger.error(`AI Analysis Error: ${error.message}`);
            return null;
        }
    }
}

module.exports = new LeadIntelligenceService();
