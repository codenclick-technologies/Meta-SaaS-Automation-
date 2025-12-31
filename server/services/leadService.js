const axios = require('axios');
const Lead = require('../models/Lead');
const Settings = require('../models/Settings');
const emailService = require('./emailService');
const whatsappService = require('./whatsappService');
const smsService = require('./smsService');
const metaCapiService = require('./metaCapiService'); // Import CAPI

// Optional dependency: OpenAI
let OpenAI;
try {
    OpenAI = require("openai");
} catch (error) {
    console.warn("Optional dependency 'openai' not found. AI scoring will be disabled.");
}

exports.processNewLead = async (leadgenId, io) => {
    try {
        const settings = await Settings.getSettings();

        if (!settings.metaAccessToken) {
            throw new Error('Cannot fetch lead details: Meta Access Token missing in Settings.');
        }

        // 1. Fetch Lead Details from Facebook Graph API
        const response = await axios.get(`https://graph.facebook.com/v19.0/${leadgenId}`, {
            params: { access_token: settings.metaAccessToken }
        });

        const fbLead = response.data;

        // Safety Check: Ensure field_data exists to prevent crashes
        if (!fbLead || !fbLead.field_data) {
            console.error('Invalid Lead Data received from Facebook:', JSON.stringify(fbLead));
            return;
        }

        // Idempotency Check: Prevent duplicate leads if Facebook retries webhook
        const existingLead = await Lead.findOne({ fb_lead_id: fbLead.id });
        if (existingLead) {
            console.log(`[Idempotency] Lead already processed: ${fbLead.id}`);
            return;
        }

        // 2. Map Facebook Fields to our Schema
        // Facebook returns data in a 'field_data' array: [{ name: 'email', values: ['...'] }]
        const getField = (names) => {
            if (!Array.isArray(names)) names = [names];
            const field = fbLead.field_data.find(f => names.includes(f.name));
            return field ? field.values[0] : null;
        };

        // Try common field names used in Lead Forms
        const name = getField(['full_name', 'name', 'first_name']) || 'Unknown';
        const email = getField(['email', 'email_address', 'work_email']) || '';
        const phone = getField(['phone_number', 'phone', 'contact_number']) || '';
        let formattedPhone = phone; // Database me save karne ke liye clean version

        // --- AI / ML SCORING LOGIC ---
        const calculateAIScore = async (leadData, apiKey) => {
            if (!OpenAI) {
                console.error("OpenAI package is missing. Please run 'npm install openai'");
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
                    console.warn('AI returned non-numeric score:', scoreText);
                    return 50; // Fallback score
                }
                return score;
            } catch (e) {
                console.error('OpenAI API Error:', e.message);
                return 50; // Fallback score on API error
            }
        };

        // Current Advanced Heuristic Scoring (Simulating ML weights)
        const calculateQualityScore = (name, email, phone) => {
            let score = 0;
            let details = [];
            let weights = {
                name: 10,
                phone: 20,
                email: 20,
                corporateEmail: 35,
                fullName: 5,
                validPhoneLength: 10
            };

            // 1. Name Analysis
            if (name && name !== 'Unknown') {
                score += weights.name;
                details.push({ reason: 'Name Provided', points: weights.name });
                const cleanName = name.trim();
                if (cleanName.indexOf(' ') > 0) {
                    score += weights.fullName;
                    details.push({ reason: 'Full Name', points: weights.fullName });
                }
                if (/\d/.test(cleanName)) {
                    score -= 20;
                    details.push({ reason: 'Numbers in Name', points: -20 });
                }
                if (cleanName.length < 3) {
                    score -= 10;
                    details.push({ reason: 'Short Name', points: -10 });
                }
            }

            // 2. Phone Analysis
            if (phone) {
                score += weights.phone;
                details.push({ reason: 'Phone Provided', points: weights.phone });
                const cleanPhone = phone.replace(/\D/g, '');
                if (cleanPhone.length >= 10 && cleanPhone.length <= 15) {
                    score += weights.validPhoneLength;
                    details.push({ reason: 'Valid Phone Length', points: weights.validPhoneLength });
                } else {
                    score -= 10;
                    details.push({ reason: 'Invalid Phone Length', points: -10 });
                }
                if (/^(\d)\1+$/.test(cleanPhone)) {
                    score -= 30;
                    details.push({ reason: 'Repeated Digits in Phone', points: -30 });
                }
            }

            // 3. Email Analysis
            if (email) {
                score += weights.email;
                details.push({ reason: 'Email Provided', points: weights.email });
                const emailParts = email.split('@');
                if (emailParts.length === 2) {
                    const domain = emailParts[1].toLowerCase();
                    const genericDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'rediffmail.com'];
                    if (genericDomains.includes(domain)) {
                        score += 5;
                        details.push({ reason: 'Generic Email Domain', points: 5 });
                    } else {
                        score += weights.corporateEmail; // B2B/Corporate email
                        details.push({ reason: 'Corporate Email', points: weights.corporateEmail });
                    }
                }
            }

            return { totalScore: Math.min(Math.max(score, 0), 100), details };
        };

        // --- ADVANCED SCORING ALGORITHM (Professional & Robust) ---
        let score, scoreDetails;
        if (settings.aiScoringEnabled && settings.openaiApiKey) {
            score = await calculateAIScore({ name, email, phone }, settings.openaiApiKey);
            scoreDetails = [{ reason: 'AI Analysis', points: score }];
        } else {
            const result = calculateQualityScore(name, email, phone);
            score = result.totalScore;
            scoreDetails = result.details;
        }

        // Phone formatting for DB
        if (phone) {
            formattedPhone = phone.replace(/[^\d+]/g, '');
        }

        // 5. Determine Quality Label
        let quality = 'Low';
        if (score >= 80) quality = 'High';
        else if (score >= 50) quality = 'Medium';
        else if (score <= 20) quality = 'Spam';

        // 3. Create Lead in Database
        const newLead = new Lead({
            fb_lead_id: fbLead.id,
            form_id: fbLead.form_id,
            name,
            email,
            phone: formattedPhone, // Clean phone number save karein (Twilio ready)
            score,
            scoreDetails,
            quality,
            status: 'New',
            emailStatus: 'pending',
            whatsappStatus: 'pending',
            smsStatus: 'pending'
        });

        await newLead.save();
        console.log(`New Lead Saved: ${name} (${email})`);

        // COST SAVING CHECK:
        // Agar lead 'Spam' hai (Score <= 20), to expensive SMS/WhatsApp mat bhejo.
        if (quality === 'Spam') {
            console.log(`[Cost Saver] Skipped automation for SPAM lead: ${name}`);
            return;
        }

        // 4. Trigger Automation (Parallel)
        const [emailRes, whatsappRes, smsRes, capiRes] = await Promise.all([
            emailService.sendWelcomeEmail(newLead),
            whatsappService.sendWelcomeMessage(newLead),
            smsService.sendSMS(newLead),
            metaCapiService.sendConversionEvent(newLead) // Send Event to FB Pixel
        ]);

        // 5. Update Statuses
        newLead.emailStatus = emailRes.status;
        newLead.whatsappStatus = whatsappRes.status;
        newLead.smsStatus = smsRes.status;

        // Add logs
        if (emailRes.error) newLead.logs.push({ channel: 'email', status: 'failed', response: { error: emailRes.error } });
        else newLead.logs.push({ channel: 'email', status: 'sent' });

        if (whatsappRes.error) newLead.logs.push({ channel: 'whatsapp', status: 'failed', response: { error: whatsappRes.error } });
        else newLead.logs.push({ channel: 'whatsapp', status: 'sent' });

        if (smsRes.error) newLead.logs.push({ channel: 'sms', status: 'failed', response: { error: smsRes.error } });
        else {
            newLead.logs.push({ channel: 'sms', status: 'sent' });
            newLead.messages.push({
                direction: 'outbound',
                type: 'sms',
                body: smsRes.body // Saved from smsService return
            });
        }

        await newLead.save();

        // 6. Real-time Dashboard Update
        if (io) {
            io.emit('new_lead', newLead);
        }

    } catch (error) {
        console.error('Lead Processing Error:', error.message);
        // We don't throw here to prevent crashing the webhook response
    }
};