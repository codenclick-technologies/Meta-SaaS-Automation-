const axios = require('axios');
const Lead = require('../models/Lead');
const Organization = require('../models/Organization');
const Settings = require('../models/Settings');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');
const smsService = require('./smsService');
const metaCapiService = require('./metaCapiService'); // Import CAPI
const logger = require('../utils/logger');

// Optional dependency: OpenAI
let OpenAI;
try {
    OpenAI = require("openai");
} catch (error) {
    logger.warn("Optional dependency 'openai' not found. AI scoring will be disabled.");
}

exports.processNewLead = async (leadgenId, io, simulatedData = null) => {
    try {
        const settings = await Settings.getSettings();
        let fbLead;

        if (simulatedData) {
            // Simulation Mode: Bypass Meta API
            fbLead = {
                id: leadgenId,
                form_id: simulatedData.form_id,
                field_data: simulatedData.field_data,
                campaign_name: 'Simulated Campaign'
            };
            logger.info('Processing Simulated Lead...');
        } else {
            // Production Mode: Fetch from Meta
            if (!settings.metaAccessToken) {
                throw new Error('Cannot fetch lead details: Meta Access Token missing in Settings.');
            }

            const response = await axios.get(`https://graph.facebook.com/v19.0/${leadgenId}`, {
                params: { access_token: settings.metaAccessToken }
            });
            fbLead = response.data;
        }

        if (!fbLead || !fbLead.field_data) {
            logger.error('Invalid Lead Data received:', JSON.stringify(fbLead));
            return;
        }

        // --- MULTI-TENANCY LOOKUP ---
        const organization = await Organization.findOne({ facebookFormIds: fbLead.form_id });
        if (!organization) {
            logger.error(`No organization found for form_id: ${fbLead.form_id}. Discarding lead.`);
            return;
        }
        // --- END MULTI-TENANCY LOOKUP ---

        const existingLead = await Lead.findOne({ fb_lead_id: fbLead.id, organizationId: organization._id });
        if (existingLead) {
            logger.info(`[Idempotency] Lead already processed: ${fbLead.id} for organization ${organization.name}`);
            return;
        }

        const getField = (names) => {
            if (!Array.isArray(names)) names = [names];
            const field = fbLead.field_data.find(f => names.includes(f.name));
            return field ? field.values[0] : null;
        };

        const name = getField(['full_name', 'name', 'first_name']) || 'Unknown';
        const email = getField(['email', 'email_address', 'work_email']) || '';
        const phone = getField(['phone_number', 'phone', 'contact_number']) || '';
        let formattedPhone = phone;

        // Scoring functions remain the same...
        const calculateAIScore = async (leadData, apiKey) => {
            if (!OpenAI) {
                logger.error("OpenAI package is missing. Please run 'npm install openai'");
                return 50;
            }
            try {
                const openai = new OpenAI({ apiKey });
                const prompt = `
                    Analyze the following lead data and provide a quality score from 0 to 100.
                    A high score (80-100) means it's a high-quality business lead.
                    A low score (0-30) means it's likely spam or very low quality.
                    Consider the name, email domain (corporate vs generic), and phone number validity.
                    Lead Data:
                    - Name: ${leadData.name}
                    - Email: ${leadData.email}
                    - Phone: ${leadData.phone}

                    Respond with ONLY a single number representing the score. For example: 85
                `;

                const response = await openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 5,
                    temperature: 0.2,
                });

                const scoreText = response.choices[0].message.content.trim();
                const score = parseInt(scoreText, 10);

                if (isNaN(score)) {
                    logger.warn('AI returned non-numeric score:', scoreText);
                    return 50;
                }
                return score;
            } catch (e) {
                logger.error('OpenAI API Error:', e.message);
                return 50;
            }
        };

        const calculateQualityScore = (name, email, phone) => {
            let score = 0;
            let details = [];
            let weights = { name: 10, phone: 20, email: 20, corporateEmail: 35, fullName: 5, validPhoneLength: 10 };
            if (name && name !== 'Unknown') {
                score += weights.name;
                details.push({ reason: 'Name Provided', points: weights.name });
                if (name.trim().indexOf(' ') > 0) { score += weights.fullName; details.push({ reason: 'Full Name', points: weights.fullName }); }
                if (/\d/.test(name.trim())) { score -= 20; details.push({ reason: 'Numbers in Name', points: -20 }); }
                if (name.trim().length < 3) { score -= 10; details.push({ reason: 'Short Name', points: -10 }); }
            }
            if (phone) {
                score += weights.phone;
                details.push({ reason: 'Phone Provided', points: weights.phone });
                const cleanPhone = phone.replace(/\D/g, '');
                if (cleanPhone.length >= 10 && cleanPhone.length <= 15) { score += weights.validPhoneLength; details.push({ reason: 'Valid Phone Length', points: weights.validPhoneLength }); } else { score -= 10; details.push({ reason: 'Invalid Phone Length', points: -10 }); }
                if (/^(\d)\1+$/.test(cleanPhone)) { score -= 30; details.push({ reason: 'Repeated Digits in Phone', points: -30 }); }
            }
            if (email) {
                score += weights.email;
                details.push({ reason: 'Email Provided', points: weights.email });
                const domain = email.split('@')[1]?.toLowerCase();
                const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
                if (domain && !genericDomains.includes(domain)) { score += weights.corporateEmail; details.push({ reason: 'Corporate Email', points: weights.corporateEmail }); }
            }
            return { totalScore: Math.min(Math.max(score, 0), 100), details };
        };

        let score, scoreDetails;
        if (settings.aiScoringEnabled && settings.openaiApiKey) {
            score = await calculateAIScore({ name, email, phone }, settings.openaiApiKey);
            scoreDetails = [{ reason: 'AI Analysis', points: score }];
        } else {
            const result = calculateQualityScore(name, email, phone);
            score = result.totalScore;
            scoreDetails = result.details;
        }

        if (phone) {
            formattedPhone = phone.replace(/[^\d+]/g, '');
        }

        let quality = 'Low';
        if (score >= 80) quality = 'High';
        else if (score >= 50) quality = 'Medium';
        else if (score <= 20) quality = 'Spam';

        // Global SaaS Detection: Extract Country from Phone Prefix
        let country = 'US';
        if (formattedPhone.startsWith('+91')) country = 'IN';
        else if (formattedPhone.startsWith('+44')) country = 'GB';
        else if (formattedPhone.startsWith('+971')) country = 'AE';
        else if (formattedPhone.startsWith('+49')) country = 'DE';
        else if (formattedPhone.startsWith('+33')) country = 'FR';
        else if (formattedPhone.startsWith('+34')) country = 'ES';
        else if (formattedPhone.startsWith('+65')) country = 'SG';

        const currencies = { 'IN': 'INR', 'GB': 'GBP', 'DE': 'EUR', 'FR': 'EUR', 'ES': 'EUR', 'SG': 'SGD', 'AE': 'AED' };
        const localCurrency = currencies[country] || 'USD';

        const newLead = new Lead({
            organizationId: organization._id, // Set the organization ID
            fb_lead_id: fbLead.id,
            form_id: fbLead.form_id,
            name,
            email,
            phone: formattedPhone,
            score,
            scoreDetails,
            quality,
            status: 'New',
            country: country,
            campaign: fbLead.campaign_name || 'Generic Ads',
            rawData: fbLead,
            value: {
                amount: 0,
                currency: localCurrency
            }
        });

        await newLead.save();
        logger.info(`New Lead Saved: ${name} for organization ${organization.name}`);

        // BI Logic: Track Ingestion Event
        const BIService = require('./biService');
        await BIService.trackEvent({
            organizationId: organization._id,
            leadId: newLead._id,
            type: 'LEAD_INGESTED',
            source: 'facebook',
            campaign: fbLead.campaign_name || 'Generic Meta Ads',
            value: newLead.value.amount
        });

        // BI Logic: Track AI Event
        await BIService.trackEvent({
            organizationId: organization._id,
            leadId: newLead._id,
            type: 'AI_ANALYZED',
            metadata: { score: score, sentiment: quality }
        });
        if (quality === 'Spam') {
            logger.info(`[Cost Saver] Skipped automation for SPAM lead: ${name}`);
            if (io) io.emit('new_lead', newLead);
            return;
        }

        // --- PRINCIPAL ARCHITECT: TRIGGER GLOBAL AUTOMATION ENGINE ---
        // --- PHASE 1: SMART MVP WORKFLOW TRIGGER ---
        const workflowEngine = require('./workflowEngine');

        // Execute workflows asynchronously (don't block the webhook response)
        // We pass 'meta_ads' as trigger type and the form_id (or campaign_id) as the source
        workflowEngine.triggerWorkflow('meta_ads', fbLead.form_id, {
            ...newLead.toObject(),
            // Flatten data for easy condition checking
            ...newLead.rawData
        });

        if (io) io.emit('new_lead', newLead);
    } catch (err) {
        logger.error('Error processing lead:', err.message);
    }
};